import { getFarmById } from './farm.service.js';
import { query } from '../config/database.js';
import { callGeminiStructured } from '../ai/gemini.client.js';
import { generateAgronomicWeatherAction } from '../ai/agronomyEngine.js';
import { WeatherActionSchema } from '../validation/ai.schema.js';

// Coordinates lookup cache for common Indian farming regions
const REGION_COORDS = {
  maharashtra: { lat: 19.7515, lon: 75.7139, label: 'Maharashtra' },
  pune: { lat: 18.5204, lon: 73.8567, label: 'Pune' },
  nashik: { lat: 19.9975, lon: 73.7898, label: 'Nashik' },
  nagpur: { lat: 21.1458, lon: 79.0882, label: 'Nagpur' },
  solapur: { lat: 17.6599, lon: 75.9064, label: 'Solapur' },
  karnataka: { lat: 15.3173, lon: 75.7139, label: 'Karnataka' },
  belagavi: { lat: 15.8497, lon: 74.4977, label: 'Belagavi' },
  punjab: { lat: 31.1471, lon: 75.3412, label: 'Punjab' },
  ludhiana: { lat: 30.9010, lon: 75.8573, label: 'Ludhiana' },
  haryana: { lat: 29.0588, lon: 76.0856, label: 'Haryana' },
  gujarat: { lat: 22.2587, lon: 71.1924, label: 'Gujarat' },
  rajasthan: { lat: 27.0238, lon: 74.2179, label: 'Rajasthan' },
  madhya_pradesh: { lat: 22.9734, lon: 78.6569, label: 'Madhya Pradesh' },
  indore: { lat: 22.7196, lon: 75.8577, label: 'Indore' },
  andhra_pradesh: { lat: 15.9129, lon: 79.7400, label: 'Andhra Pradesh' },
  telangana: { lat: 18.1124, lon: 79.0193, label: 'Telangana' },
  hyderabad: { lat: 17.3850, lon: 78.4867, label: 'Hyderabad' },
  uttar_pradesh: { lat: 26.8467, lon: 80.9462, label: 'Uttar Pradesh' }
};

function resolveCoordinates(locationStr = '') {
  const clean = locationStr.toLowerCase();
  for (const [key, coords] of Object.entries(REGION_COORDS)) {
    if (clean.includes(key)) {
      return coords;
    }
  }
  // Default to central India agricultural zone
  return { lat: 19.7515, lon: 75.7139, label: locationStr || 'Central Ag-Zone' };
}

export async function getFarmWeather(farmId, userId) {
  const farm = await getFarmById(farmId, userId);
  const coords = resolveCoordinates(farm.location);

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&timezone=auto&forecast_days=7`;
    
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
