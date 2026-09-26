import { query } from '../config/database.js';
import { getFarmById } from './farm.service.js';
import { callGeminiStructured } from '../ai/gemini.client.js';
import { generateAgronomicAssistantResponse } from '../ai/agronomyEngine.js';
import { GeneralAssistantSchema } from '../validation/ai.schema.js';

export async function askAssistant({ userId, farmId = null, cropCycleId = null, message, preferredLanguage = 'en' }) {
  let farmContext = null;
  let cycleContext = null;
  let totalExpenses = 0;

  // Retrieve authoritative farm context if farmId provided
  if (farmId) {
    const farm = await getFarmById(farmId, userId);
    farmContext = farm;

    // Get total expenses logged
    const expRes = await query('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE farm_id = $1', [farmId]);
    totalExpenses = Number(expRes.rows[0]?.total || 0);

    // If cropCycleId provided, retrieve it (verifying it belongs to farm)
    if (cropCycleId) {
      const cycRes = await query('SELECT * FROM crop_cycles WHERE id = $1 AND farm_id = $2', [cropCycleId, farmId]);
      if (cycRes.rows.length > 0) {
        cycleContext = cycRes.rows[0];
      }
    } else {
      // Find latest active crop cycle
      const activeRes = await query(
        'SELECT * FROM crop_cycles WHERE farm_id = $1 AND status = \'ACTIVE\' ORDER BY created_at DESC LIMIT 1',
        [farmId]
      );
      if (activeRes.rows.length > 0) {
        cycleContext = activeRes.rows[0];
      }
    }
  }

  const promptContext = {
    message,
    preferredLanguage,
    farm: farmContext ? {
      name: farmContext.name,
      location: farmContext.location,
      landAreaAcres: farmContext.land_area_acres,
      soilType: farmContext.soil_type,
      waterSource: farmContext.water_source,
      capitalBudget: farmContext.capital_budget
    } : 'No farm selected',
    activeCrop: cycleContext ? {
      cropName: cycleContext.crop_name,
      variety: cycleContext.variety,
      currentStage: cycleContext.current_stage,
      plantingDate: cycleContext.planting_date,
      expectedDurationDays: cycleContext.expected_duration_days
    } : 'No active crop cycle in progress',
    recordedExpenses: `₹${totalExpenses.toLocaleString('en-IN')}`
  };

  const languageNames = {
    en: 'English',
    te: 'Telugu (తెలుగు)',
    hi: 'Hindi (हिन्दी)',
    mr: 'Marathi (मराठी)',
    ta: 'Tamil (தமிழ்)',
    kn: 'Kannada (ಕನ್ನಡ)',
    ml: 'Malayalam (മലയാളം)',
    bn: 'Bengali (বাংলা)',
    gu: 'Gujarati (ગુજરાતી)',
    pa: 'Punjabi (ਪੰਜਾਬੀ)',
    od: 'Odia (ଓଡ଼ିଆ)'
  };
  const targetLanguage = languageNames[preferredLanguage] || 'English';

  const runtimePrompt = `Farmer query: "${message}"

Authoritative Farm Data:
${JSON.stringify(promptContext, null, 2)}

Provide clear, structured, practical guidance based on this farm context.
Rules:
- LANGUAGE INSTRUCTION: Respond in the user's selected language: ${targetLanguage}. The text content in "answer", "action", "reason", "assumptions", and "missingInformation" MUST be in ${targetLanguage}.
- CRITICAL JSON SCHEMA RULE: All JSON property names/keys ("answer", "actions", "priority", "action", "reason", "assumptions", "missingInformation", "confidence") MUST REMAIN STRICTLY IN ENGLISH. Do NOT translate keys.
- Never fabricate data or claim certainty when information is missing.
- Do not invent chemical doses; advise consulting local agriculture extension officer if chemical details are requested.
- Distinguish estimates from verified data.
- Return JSON strictly following:
{
  "answer": string,
  "actions": [
    { "priority": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL", "action": string, "reason": string }
  ],
  "assumptions": [string],
  "missingInformation": [string],
  "confidence": number
}`;

  const fallback = () => generateAgronomicAssistantResponse(message, farmContext, cycleContext, totalExpenses, preferredLanguage);

  const { output, modelName } = await callGeminiStructured({
    prompt: runtimePrompt,
    schema: GeneralAssistantSchema,
    featureName: 'GENERAL_FARM_ASSISTANT',
    fallbackGenerator: fallback
  });

  // Persist into ai_histories table
  const insertRes = await query(
    `INSERT INTO ai_histories (user_id, farm_id, crop_cycle_id, feature_type, model_name, input_context, output_json, validation_status)
     VALUES ($1, $2, $3, 'GENERAL_FARM_ASSISTANT', $4, $5::jsonb, $6::jsonb, 'VALIDATED')
     RETURNING id, created_at`,
    [
      userId,
      farmId || null,
      cycleContext?.id || null,
      modelName,
      JSON.stringify(promptContext),
      JSON.stringify(output)
    ]
  );

  return {
    ...output,
    historyId: insertRes.rows[0].id,
    timestamp: insertRes.rows[0].created_at
  };
}

export async function getUserAiHistory(userId, filters = {}) {
  const { featureType, farmId, page = 1, limit = 20 } = filters;
  const conditions = ['ah.user_id = $1'];
  const values = [userId];
  let idx = 2;

  if (featureType) {
    conditions.push(`ah.feature_type = $${idx++}`);
    values.push(featureType);
  }
  if (farmId) {
    conditions.push(`ah.farm_id = $${idx++}`);
    values.push(farmId);
  }

  const offset = (Number(page) - 1) * Number(limit);
  values.push(Number(limit));
  const limitIdx = idx++;
  values.push(offset);
  const offsetIdx = idx++;

  const sql = `
    SELECT ah.*, f.name AS farm_name, cc.crop_name
    FROM ai_histories ah
    LEFT JOIN farms f ON f.id = ah.farm_id
    LEFT JOIN crop_cycles cc ON cc.id = ah.crop_cycle_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY ah.created_at DESC
    LIMIT $${limitIdx} OFFSET $${offsetIdx}
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM ai_histories ah
    WHERE ${conditions.join(' AND ')}
  `;

  const [listRes, countRes] = await Promise.all([
    query(sql, values),
    query(countSql, values.slice(0, values.length - 2))
  ]);

  return {
    items: listRes.rows,
    total: Number(countRes.rows[0]?.total || 0),
    page: Number(page),
    limit: Number(limit)
  };
}

export async function getAiHistoryById(historyId, userId) {
  const res = await query(
    `SELECT ah.*, f.name AS farm_name, cc.crop_name
     FROM ai_histories ah
     LEFT JOIN farms f ON f.id = ah.farm_id
     LEFT JOIN crop_cycles cc ON cc.id = ah.crop_cycle_id
     WHERE ah.id = $1 AND ah.user_id = $2`,
    [historyId, userId]
  );

  if (res.rows.length === 0) {
    const error = new Error('AI history record not found.');
    error.statusCode = 404;
    error.code = 'HISTORY_NOT_FOUND';
    throw error;
  }

  return res.rows[0];
}
