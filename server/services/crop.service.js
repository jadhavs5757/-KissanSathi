import { query } from '../config/database.js';
import { getFarmById } from './farm.service.js';
import { callGeminiStructured } from '../ai/gemini.client.js';
import { generateAgronomicCropRecommendations } from '../ai/agronomyEngine.js';
import { CropRecommendationsResponseSchema } from '../validation/crop.schema.js';

export async function generateCropRecommendations(farmId, userId, preferences = {}) {
  // Step 1: Verify farm ownership and retrieve authoritative farm context from PostgreSQL
  const farm = await getFarmById(farmId, userId);

  // Step 2: Build deterministic context prompt
  const farmContext = {
    name: farm.name,
    location: farm.location,
    landAreaAcres: Number(farm.land_area_acres),
    ownership: farm.ownership,
    previousCrop: farm.previous_crop || 'None reported',
    soil: {
      source: farm.soil_source,
      type: farm.soil_type || 'Unspecified',
      pH: farm.soil_ph,
      nitrogen: farm.nitrogen,
      phosphorus: farm.phosphorus,
      potassium: farm.potassium,
      organicCarbon: farm.organic_carbon
    },
    water: {
      source: farm.water_source,
      pumpCapacityHp: farm.pump_capacity_hp,
      waterHoursPerDay: farm.water_hours_per_day,
      irrigationMethod: farm.irrigation_method || 'Flood/Furrow',
      rainDependencePercent: farm.rain_dependence_percent
    },
    finances: {
      capitalBudget: Number(farm.capital_budget)
    },
    infrastructure: {
      storageAvailable: farm.storage_available,
      electricityAvailable: farm.electricity_available,
      labourDescription: farm.labour_description || 'Local day labour',
      equipmentDescription: farm.equipment_description || 'Standard tools / hired tractor'
    },
    preferences: preferences || {}
  };

  const runtimePrompt = `Analyze the supplied farm context and produce several agricultural crop options.

Farm Profile Context:
${JSON.stringify(farmContext, null, 2)}

Use only the information supplied by the application.
Do not invent missing facts.
For each crop explain:
- suitability
- water requirement
- estimated investment (min, expected, max in INR)
- expected duration (days)
- potential yield range (min, expected, max with unit)
- potential revenue range (min, expected, max with currency "INR")
- risk (LOW, MEDIUM, HIGH, UNKNOWN)
- reasoning
- tradeoffs (array of string bullet points)
- assumptions (array of string bullet points)
- confidence (0-100)

Do not guarantee profit or yield.
Do not select a universal winner.
Return JSON matching the required schema exactly.`;

  // Fallback generator adhering to exact schema
  const fallback = () => generateAgronomicCropRecommendations(farm, preferences);

  // Step 3: Call AI / Agronomy Engine with validation
  const { output, modelName } = await callGeminiStructured({
    prompt: runtimePrompt,
    schema: CropRecommendationsResponseSchema,
    featureName: 'CROP_RECOMMENDATION',
    fallbackGenerator: fallback
  });

  // Step 4: Persist in ai_histories
  const aiHistoryRes = await query(
    `INSERT INTO ai_histories (user_id, farm_id, feature_type, model_name, input_context, output_json, validation_status)
     VALUES ($1, $2, 'CROP_RECOMMENDATION', $3, $4::jsonb, $5::jsonb, 'VALIDATED')
     RETURNING id, created_at`,
    [userId, farmId, modelName, JSON.stringify(farmContext), JSON.stringify(output)]
  );
  const aiHistoryId = aiHistoryRes.rows[0].id;

  // Step 5: Save each recommendation into crop_plans
  const savedPlans = [];
  for (const rec of output.recommendations) {
    const planRes = await query(
      `INSERT INTO crop_plans (
        farm_id, crop_name, suitability, water_requirement,
        investment_min, investment_expected, investment_max,
        duration_days,
        yield_min, yield_expected, yield_max,
        revenue_min, revenue_expected, revenue_max,
        risk, reasoning, tradeoffs, assumptions, confidence, ai_history_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::jsonb, $19, $20)
      RETURNING *`,
      [
        farmId,
        rec.cropName,
        rec.suitability,
        rec.waterRequirement,
        rec.investment.min,
        rec.investment.expected,
        rec.investment.max,
        rec.durationDays,
        rec.yield.min,
        rec.yield.expected,
        rec.yield.max,
        rec.revenue.min,
        rec.revenue.expected,
        rec.revenue.max,
        rec.risk,
        rec.reasoning,
        rec.tradeoffs ? rec.tradeoffs.join('; ') : '',
        JSON.stringify(rec.assumptions || []),
        rec.confidence,
        aiHistoryId
      ]
    );
    savedPlans.push({
      ...planRes.rows[0],
      yieldUnit: rec.yield.unit || 'tonnes',
      tradeoffsArray: rec.tradeoffs || []
    });
  }

  return {
    aiHistoryId,
    recommendations: output.recommendations,
    missingInformation: output.missingInformation || [],
    generalAssumptions: output.generalAssumptions || [],
    savedPlans
  };
}

export async function getFarmCropPlans(farmId, userId) {
  // Verify farm ownership
  await getFarmById(farmId, userId);

  const res = await query(
    `SELECT cp.*, ah.created_at AS analysis_date 
     FROM crop_plans cp
     LEFT JOIN ai_histories ah ON ah.id = cp.ai_history_id
     WHERE cp.farm_id = $1
     ORDER BY cp.created_at DESC`,
    [farmId]
  );
  return res.rows;
}

export async function getCropPlanById(farmId, planId, userId) {
  // Verify farm ownership
  await getFarmById(farmId, userId);

  const res = await query(
    `SELECT cp.*, ah.created_at AS analysis_date
     FROM crop_plans cp
     LEFT JOIN ai_histories ah ON ah.id = cp.ai_history_id
     WHERE cp.id = $1 AND cp.farm_id = $2`,
    [planId, farmId]
  );

  if (res.rows.length === 0) {
    const error = new Error('Crop plan not found.');
    error.statusCode = 404;
    error.code = 'CROP_PLAN_NOT_FOUND';
    throw error;
  }
  return res.rows[0];
}
