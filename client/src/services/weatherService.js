/**
 * KisanSaarthi AI — Weather Service
 * Real live meteorological service powered by Open-Meteo.
 * Free, open, no client-side API key required.
 *
 * Location Resolution:
 * 1. Direct coordinates if latitude & longitude exist on the farm profile.
 * 2. Real-time Open-Meteo Geocoding API resolution from farm location string.
 * 3. Graceful unavailable state if geocoding fails. No fabricated weather.
 */

// Cache map in memory for the current session
const memoryCache = new Map();
const CACHE_TTL_MS = 12 * 60 * 1000; // 12 minutes (sensible 10-15 min window)

/**
 * Maps WMO weather interpretation codes to farmer-friendly condition text.
 */
export function mapWeatherCodeToText(code) {
  if (code === 0) return 'Clear sky';
  if (code === 1) return 'Mainly clear';
  if (code === 2) return 'Partly cloudy';
  if (code === 3) return 'Overcast';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 51 && code <= 55) return 'Drizzle';
  if (code === 56 || code === 57) return 'Freezing drizzle';
  if (code >= 61 && code <= 65) return 'Rain';
  if (code === 66 || code === 67) return 'Freezing rain';
  if (code >= 71 && code <= 75) return 'Snow';
  if (code === 77) return 'Snow grains';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code === 85 || code === 86) return 'Snow showers';
  if (code === 95) return 'Thunderstorm';
  if (code >= 96 && code <= 99) return 'Thunderstorm with hail';
  return 'Partly cloudy';
}

/**
 * Geocode farm location text using Open-Meteo Geocoding API.
 * Handles strings like "Green Field Plot A, Nashik, Maharashtra" by searching
 * candidates from most specific to broader regional segments.
 */
export async function geocodeFarmLocation(locationStr) {
  if (!locationStr || typeof locationStr !== 'string') return null;

  const clean = locationStr.trim();
  const invalidPlaceholders = ['unknown', 'unspecified', 'none', 'n/a', 'standard', 'default'];
  if (!clean || invalidPlaceholders.includes(clean.toLowerCase())) {
    return null;
  }

  // Build ordered candidates
  const candidates = [clean];
  const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length > 1) {
    // 1. Without the first chunk (which is often plot / field / survey number)
    candidates.push(parts.slice(1).join(', '));
    // 2. Individual parts from end to start (district, state, city)
    for (let i = parts.length - 1; i >= 1; i--) {
      candidates.push(parts[i]);
    }
    // 3. First part if not containing generic plot/field words
    if (!/(plot|field|survey|gat|gut|farm|acre|no\.)/i.test(parts[0])) {
      candidates.push(parts[0]);
    }
  }

  // Deduplicate candidate queries
  const uniqueCandidates = [...new Set(candidates)];

  for (const query of uniqueCandidates) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=3&language=en&format=json`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);

      if (!res.ok) continue;

      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const best = data.results[0];
        const resolvedParts = [best.name, best.admin1, best.country].filter(Boolean);
        return {
          latitude: best.latitude,
          longitude: best.longitude,
          name: best.name,
          admin1: best.admin1 || '',
          country: best.country || '',
          resolvedLocation: resolvedParts.join(', '),
          elevation: best.elevation
        };
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null;
}

/**
 * Resolves coordinates for a farm profile:
 * 1. Checks profile latitude / longitude directly.
 * 2. Geocodes profile location text via Open-Meteo Geocoding.
 */
export async function getFarmCoordinates(farm) {
  if (!farm) return null;

  // 1. Direct coordinates if present on the profile
  const lat = Number(farm.latitude ?? farm.lat);
  const lon = Number(farm.longitude ?? farm.lon);
  if (!Number.isNaN(lat) && !Number.isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return {
      latitude: lat,
      longitude: lon,
      resolvedLocation: farm.location || farm.name || 'Farm Coordinates',
      source: 'DIRECT_COORDINATES'
    };
  }

  // 2. Geocode location string
  const geo = await geocodeFarmLocation(farm.location || farm.name);
  if (geo) {
    return {
      ...geo,
      source: 'OPEN_METEO_GEOCODING'
    };
  }

  return null;
}

/**
 * Fetch real live weather from Open-Meteo Forecast API.
 * Cached for 10-15 minutes per farm to prevent redundant API calls.
 */
export async function getLiveWeather(farm, options = {}) {
  const { forceRefresh = false } = options;

  if (!farm) {
    return {
      isAvailable: false,
      reason: 'No farm profile specified.',
      farmLocation: ''
    };
  }

  const cacheKey = `kisansaarthi_weather_${farm.id || farm.name || 'default'}`;

  // Check cache unless manual refresh requested
  if (!forceRefresh) {
    // Memory cache
    const memEntry = memoryCache.get(cacheKey);
    if (memEntry && Date.now() - memEntry.timestamp < CACHE_TTL_MS) {
      return memEntry.data;
    }

    // LocalStorage fallback cache
    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS && parsed.data) {
          memoryCache.set(cacheKey, parsed);
          return parsed.data;
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  // Resolve farm coordinates
  const coords = await getFarmCoordinates(farm);
  if (!coords) {
    return {
      isAvailable: false,
      reason: 'Weather unavailable for this farm location.',
      farmLocation: farm.location || farm.name || 'Unspecified'
    };
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum&wind_speed_unit=kmh&timezone=auto&forecast_days=7`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      return {
        isAvailable: false,
        reason: 'Live external meteorological feed is currently unreachable.',
        farmLocation: coords.resolvedLocation || farm.location
      };
    }

    const data = await res.json();
    const current = data.current || {};
    const daily = data.daily || {};

    const forecast = [];
    if (Array.isArray(daily.time)) {
      for (let i = 0; i < daily.time.length; i++) {
        forecast.push({
          date: daily.time[i],
          maxTemp: daily.temperature_2m_max?.[i] != null ? Math.round(daily.temperature_2m_max[i]) : null,
          minTemp: daily.temperature_2m_min?.[i] != null ? Math.round(daily.temperature_2m_min[i]) : null,
          precipitationProbability: daily.precipitation_probability_max?.[i] ?? 0,
          precipitationSumMm: daily.precipitation_sum?.[i] ?? 0,
          condition: mapWeatherCodeToText(daily.weather_code?.[i]),
          weatherCode: daily.weather_code?.[i]
        });
      }
    }

    const result = {
      isAvailable: true,
      provider: 'Open-Meteo Global Agro-Meteorological Service',
      location: farm.location,
      resolvedLocation: coords.resolvedLocation,
      coordinates: {
        latitude: coords.latitude,
        longitude: coords.longitude
      },
      current: {
        temperature: current.temperature_2m != null ? Math.round(current.temperature_2m * 10) / 10 : 0,
        apparentTemperature: current.apparent_temperature != null ? Math.round(current.apparent_temperature * 10) / 10 : null,
        humidity: current.relative_humidity_2m ?? 0,
        precipitationMm: current.precipitation ?? 0,
        windSpeedKmh: current.wind_speed_10m != null ? Math.round(current.wind_speed_10m * 10) / 10 : 0,
        condition: mapWeatherCodeToText(current.weather_code),
        weatherCode: current.weather_code,
        observationTime: current.time || new Date().toISOString()
      },
      today: {
        maxTemp: forecast[0]?.maxTemp,
        minTemp: forecast[0]?.minTemp,
        precipitationProbability: forecast[0]?.precipitationProbability ?? 0,
        precipitationSumMm: forecast[0]?.precipitationSumMm ?? 0
      },
      forecast,
      fetchedAt: Date.now()
    };

    // Save to caches
    const cachePayload = { timestamp: Date.now(), data: result };
    memoryCache.set(cacheKey, cachePayload);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(cachePayload));
    } catch {
      // Ignore quota errors
    }

    return result;
  } catch (err) {
    console.warn(`[WeatherService] Fetch error for farm ${farm.name}:`, err.message);
    return {
      isAvailable: false,
      reason: 'Live external meteorological feed is currently unreachable. No fabricated weather will be shown.',
      farmLocation: coords.resolvedLocation || farm.location
    };
  }
}

/**
 * Generate actionable agricultural guidance based on live weather data.
 */
export function getAgronomicWeatherAction(weather, cropCycle, farm) {
  if (!weather || !weather.isAvailable || !weather.current) {
    return null;
  }

  const crop = cropCycle?.crop_name || 'your crop';
  const stage = cropCycle?.current_stage || 'active growth';
  const rainProb = weather.forecast?.[0]?.precipitationProbability ?? 0;
  const precipMm = weather.forecast?.[0]?.precipitationSumMm ?? weather.current.precipitationMm ?? 0;
  const temp = weather.current.temperature;
  const wind = weather.current.windSpeedKmh;
  const condition = weather.current.condition.toLowerCase();

  const isRainRisk = rainProb >= 40 || precipMm > 1.5 || condition.includes('rain') || condition.includes('drizzle') || condition.includes('thunderstorm');
  const isHeatRisk = temp >= 35;
  const isWindRisk = wind >= 22;

  if (isRainRisk) {
    return {
      riskLevel: rainProb > 65 || precipMm > 10 ? 'HIGH' : 'MEDIUM',
      actions: [
        {
          action: `Halt scheduled irrigation and verify perimeter drainage for ${crop}.`,
          reason: `Rainfall forecast (${rainProb}% probability, ~${precipMm} mm). Drainage prevents waterlogging and root aeration loss in ${stage} stage.`
        }
      ]
    };
  }

  if (isHeatRisk) {
    return {
      riskLevel: 'MEDIUM',
      actions: [
        {
          action: `Irrigate during early morning or dusk hours to mitigate thermal stress.`,
          reason: `Elevated field temperature (${temp}°C) accelerates moisture loss. Avoid afternoon irrigation to prevent root scald.`
        }
      ]
    };
  }

  if (isWindRisk) {
    return {
      riskLevel: 'MEDIUM',
      actions: [
        {
          action: `Postpone foliar nutrient or protective spraying operations.`,
          reason: `Wind speed (${wind} km/h) causes excessive droplet drift and poor foliar deposition.`
        }
      ]
    };
  }

  return {
    riskLevel: 'LOW',
    actions: [
      {
        action: `Conditions are optimal for routine crop scouting and planned field tasks.`,
        reason: `Moderate temperature (${temp}°C) and steady wind (${wind} km/h) support active growth for ${crop}.`
      }
    ]
  };
}

export const weatherService = {
  getLiveWeather,
  getFarmCoordinates,
  geocodeFarmLocation,
  mapWeatherCodeToText,
  getAgronomicWeatherAction
};
