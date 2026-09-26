import { getFarmById } from './farm.service.js';
import { query } from '../config/database.js';
import { callGeminiStructured } from '../ai/gemini.client.js';
import { generateAgronomicWeatherAction } from '../ai/agronomyEngine.js';
import { WeatherActionSchema } from '../validation/ai.schema.js';

export async function geocodeLocation(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return null;
  const clean = locationStr.trim();
  const invalid = ['unknown', 'unspecified', 'none', 'n/a', 'standard', 'default'];
  if (!clean || invalid.includes(clean.toLowerCase())) return null;

  const candidates = [clean];
  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length > 1) {
    candidates.push(parts.slice(1).join(', '));
    for (let i = parts.length - 1; i >= 1; i--) {
      candidates.push(parts[i]);
    }
    if (!/(plot|field|survey|gat|gut|farm|acre|no\.)/i.test(parts[0])) {
      candidates.push(parts[0]);
    }
  }

  for (const query of [...new Set(candidates)]) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=3&language=en&format=json`;
      const res = await fetch(url);
      if (!res.ok) continue;
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const best = data.results[0];
        return {
          lat: best.latitude,
          lon: best.longitude,
          label: [best.name, best.admin1, best.country].filter(Boolean).join(', ')
        };
      }
    } catch {
      // Continue
    }
  }
  return null;
}

export async function getFarmWeather(farmId, userId) {
  const farm = await getFarmById(farmId, userId);
  const coords = await geocodeLocation(farm.location);

  if (!coords) {
    return {
      isAvailable: false,
      reason: 'Weather unavailable for this farm location.',
      farmLocation: farm.location
    };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;

    
    // Timeout of 5s to avoid freezing if network drops
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        isAvailable: false,
        reason: 'Real-time meteorological service returned non-200 status.',
        farmLocation: farm.location
      };
    }

    const data = await res.json();
    const current = data.current || {};
    const daily = data.daily || {};

    const codeToText = (code) => {
      if (code === 0) return 'Clear sky';
      if (code === 1 || code === 2) return 'Partly cloudy';
      if (code === 3) return 'Overcast';
      if ([51, 53, 55].includes(code)) return 'Light Drizzle';
      if ([61, 63, 65].includes(code)) return 'Rain showers';
      if ([80, 81, 82].includes(code)) return 'Heavy rain';
      if ([95, 96, 99].includes(code)) return 'Thunderstorm';
      return 'Scattered clouds';
    };

    const forecast = [];
    if (daily.time) {
      for (let i = 0; i < daily.time.length; i++) {
        forecast.push({
          date: daily.time[i],
          maxTemp: daily.temperature_2m_max?.[i],
          minTemp: daily.temperature_2m_min?.[i],
          precipitationProbability: daily.precipitation_probability_max?.[i] || 0,
          precipitationSumMm: daily.precipitation_sum?.[i] || 0,
          condition: codeToText(daily.weather_code?.[i])
        });
      }
    }

    return {
      isAvailable: true,
      provider: 'Open-Meteo Global Agro-Meteorological Service',
      location: farm.location,
      resolvedCoordinates: coords,
      current: {
        temperature: current.temperature_2m,
        humidity: current.relative_humidity_2m,
        precipitationMm: current.precipitation,
        windSpeedKmh: current.wind_speed_10m,
        condition: codeToText(current.weather_code)
      },
      forecast
    };
  } catch (err) {
    console.warn(`[Weather Service] Weather unavailable for ${farm.location}:`, err.message);
    return {
      isAvailable: false,
      reason: 'Live external meteorological feed is currently unreachable. No fabricated weather will be shown.',
      farmLocation: farm.location
    };
  }
}

export async function generateWeatherAction(farmId, userId) {
  const farm = await getFarmById(farmId, userId);

  // Get active crop cycle if exists
  const cycleRes = await query(
    `SELECT * FROM crop_cycles WHERE farm_id = $1 AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1`,
    [farmId]
  );
  const activeCycle = cycleRes.rows[0] || null;

  // Retrieve current weather
  const weather = await getFarmWeather(farmId, userId);

  const fallback = () => generateAgronomicWeatherAction(
    weather.isAvailable ? {
      temperature: weather.current?.temperature,
      precipitationProbability: weather.forecast?.[0]?.precipitationProbability || 0,
      condition: weather.current?.condition
    } : null,
    activeCycle
  );

  const context = {
    farmName: farm.name,
    location: farm.location,
    soilType: farm.soil_type,
    waterSource: farm.water_source,
    activeCrop: activeCycle ? {
      cropName: activeCycle.crop_name,
      stage: activeCycle.current_stage,
      plantingDate: activeCycle.planting_date
    } : null,
    weather: weather.isAvailable ? weather : { status: 'UNAVAILABLE' }
  };

  const prompt = `Translate the supplied farm weather and crop state into actionable, safety-aware crop-management recommendations.
Context:
${JSON.stringify(context, null, 2)}

Rules:
- Do not fabricate weather data. If weather is unavailable, base actions on standard seasonal precautions for the active crop stage.
- For heavy rain or rain probability > 40%: recommend holding irrigation and checking field drainage.
- For high heat: recommend morning/evening watering and heat stress scouting.
- Output JSON strictly following schema:
{
  "summary": string,
  "riskLevel": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | "UNKNOWN",
  "actions": [
    { "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "action": string, "reason": string }
  ],
  "uncertainties": [string],
  "confidence": number
}`;

  const { output, modelName } = await callGeminiStructured({
    prompt,
    schema: WeatherActionSchema,
    featureName: 'WEATHER_ACTION',
    fallbackGenerator: fallback
  });

  // Persist into ai_histories
  await query(
    `INSERT INTO ai_histories (user_id, farm_id, crop_cycle_id, feature_type, model_name, input_context, output_json, validation_status)
     VALUES ($1, $2, $3, 'WEATHER_ACTION', $4, $5::jsonb, $6::jsonb, 'VALIDATED')`,
    [userId, farmId, activeCycle?.id || null, modelName, JSON.stringify(context), JSON.stringify(output)]
  );

  return output;
}
