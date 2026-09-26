// ==============================================================================
// KISANSAARTHI AI — SUPABASE EDGE FUNCTION: crop-recommendations
// Description: Generates agronomic crop suitability recommendations using
//              Google Gemini 2.5 Flash with deterministic agro-climatic fallback.
//              Persists results to public.crop_plans and public.ai_histories.
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM_PROMPT = `You are KisanSaarthi AI, an agricultural decision-support assistant.
Your purpose is to help farmers understand their farm information and make informed agricultural planning and management decisions.
You are not the farmer's final decision-maker.
You must provide transparent, evidence-aware, uncertainty-aware guidance.

RULES:
1. Never invent facts.
2. Never guarantee profit or yield.
3. Clearly identify assumptions and missing information.
4. Present multiple suitable crop options (3 to 5 options).
5. For each crop explain:
   - cropName
   - suitability (HIGH, MEDIUM, LOW, UNKNOWN)
   - waterRequirement (e.g. "Low (250-300 mm)", "Moderate (450-500 mm)", "High")
   - investment: { min, expected, max } (in INR)
   - durationDays (integer)
   - yield: { min, expected, max, unit } (e.g. unit: "tonnes/acre" or "quintals/acre")
   - revenue: { min, expected, max, currency: "INR" }
   - risk (LOW, MEDIUM, HIGH, UNKNOWN)
   - reasoning (detailed agronomic reasoning for this specific soil and water profile)
   - tradeoffs (array of string bullet points)
   - assumptions (array of string bullet points)
   - confidence (number 0 to 100)
6. Output pure JSON only. Do not wrap in markdown or backticks.`;

// Deterministic agro-climatic knowledge engine for Indian conditions (fallback and grounding)
function generateAgronomicFallback(farm: any, preferences: any = {}) {
  const acres = Number(farm.land_area_acres) || 1;
  const budget = Number(farm.capital_budget) || 50000;
  const soil = String(farm.soil_type || 'LOAMY').toUpperCase();
  const water = String(farm.water_source || 'BOREWELL');
  const rainDep = Number(farm.rain_dependence_percent) || 50;

  const candidateCrops = [
    {
      cropName: 'Soybean (JS-335 / JS-9560)',
      suitability: rainDep > 60 || water === 'RAINFED' || water === 'BOREWELL' ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'Moderate (450-500 mm)',
      costPerAcre: 18000,
      durationDays: 95,
      yieldRangePerAcre: [0.9, 1.2, 1.5],
      yieldUnit: 'tonnes/acre',
      pricePerTonne: 42000,
      risk: 'LOW',
      reasoning: `Well suited for ${soil} soil with ${water.toLowerCase()} irrigation. Good nitrogen fixation capacity and reliable local mandi demand.`,
      tradeoffs: ['Moderate margins compared to commercial horticultural crops', 'Sensitive to prolonged waterlogging during flowering'],
      assumptions: ['Standard monsoon or timely supplemental irrigation during pod filling', 'Certified seed quality with rhizobium inoculation'],
      confidence: 88
    },
    {
      cropName: 'Chilli (Byadgi / Teja Variety)',
      suitability: budget >= 40000 * acres && (water === 'BOREWELL' || water === 'OPEN_WELL' || water === 'COMBINATION') ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'Moderate to High (Drip recommended)',
      costPerAcre: 42000,
      durationDays: 130,
      yieldRangePerAcre: [1.8, 2.8, 3.8],
      yieldUnit: 'tonnes/acre',
      pricePerTonne: 120000,
      risk: 'MEDIUM',
      reasoning: `High-value commercial cash crop. Compatible with farm budget of ₹${budget.toLocaleString('en-IN')} and provides high returns on irrigated land.`,
      tradeoffs: ['Requires vigilant pest scouting for thrips and mites', 'Higher capital expenditure for initial transplanting and plant protection'],
      assumptions: ['Adequate water availability during flowering and fruiting', 'Access to prompt harvesting labor'],
      confidence: 82
    },
    {
      cropName: 'Gram / Chickpea (Desi / Kabuli)',
      suitability: soil.includes('BLACK') || soil.includes('CLAY') || water === 'RAINFED' ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'Low (250-300 mm)',
      costPerAcre: 14000,
      durationDays: 105,
      yieldRangePerAcre: [0.7, 1.0, 1.3],
      yieldUnit: 'tonnes/acre',
      pricePerTonne: 55000,
      risk: 'LOW',
      reasoning: `Extremely water-efficient pulse crop that thrives on residual soil moisture. Ideal if water supply is limited or water hours are low.`,
      tradeoffs: ['Lower gross revenue ceiling compared to spices or vegetables', 'Susceptible to pod borer if monitoring is skipped'],
      assumptions: ['Minimum one protective irrigation at flowering stage', 'Good field drainage'],
      confidence: 85
    },
    {
      cropName: 'Cotton (Bt Hybrid)',
      suitability: (soil.includes('BLACK') || soil.includes('LOAM')) && acres >= 1.5 ? 'HIGH' : 'MEDIUM',
      waterRequirement: 'Medium to High (650-750 mm)',
      costPerAcre: 28000,
      durationDays: 160,
      yieldRangePerAcre: [0.8, 1.4, 2.0],
      yieldUnit: 'tonnes/acre',
      pricePerTonne: 70000,
      risk: 'MEDIUM',
      reasoning: `Established commercial cash crop suitable for the land size of ${acres} acres. Deep taproot system withstands short dry spells.`,
      tradeoffs: ['Longer gestation duration (160+ days)', 'Price volatility dependent on global and domestic textile demand'],
      assumptions: ['Timely pink bollworm management and balanced NPK fertilizer application'],
      confidence: 80
    }
  ];

  let selected = candidateCrops.filter(c => c.costPerAcre * acres <= budget * 1.4);
  if (selected.length < 2) selected = candidateCrops.slice(0, 3);

  const recommendations = selected.map(c => {
    const minInv = Math.round(c.costPerAcre * acres * 0.9);
    const expInv = Math.round(c.costPerAcre * acres);
    const maxInv = Math.round(c.costPerAcre * acres * 1.15);

    const minYld = Number((c.yieldRangePerAcre[0] * acres).toFixed(2));
    const expYld = Number((c.yieldRangePerAcre[1] * acres).toFixed(2));
    const maxYld = Number((c.yieldRangePerAcre[2] * acres).toFixed(2));

    const minRev = Math.round(minYld * c.pricePerTonne * 0.85);
    const expRev = Math.round(expYld * c.pricePerTonne);
    const maxRev = Math.round(maxYld * c.pricePerTonne * 1.2);

    return {
      cropName: c.cropName,
      suitability: c.suitability,
      waterRequirement: c.waterRequirement,
      investment: { min: minInv, expected: expInv, max: maxInv },
      durationDays: c.durationDays,
      yield: { min: minYld, expected: expYld, max: maxYld, unit: c.yieldUnit },
      revenue: { min: minRev, expected: expRev, max: maxRev, currency: 'INR' as const },
      risk: c.risk,
      reasoning: c.reasoning,
      tradeoffs: c.tradeoffs,
      assumptions: c.assumptions,
      confidence: c.confidence
    };
  });

  return {
    recommendations,
    missingInformation: [
      !farm.soil_ph ? 'Exact soil pH was not provided; estimated based on soil classification.' : null,
      !farm.nitrogen ? 'Available N-P-K nutrient values not measured; general regional fertilizer schedule recommended.' : null
    ].filter(Boolean) as string[],
    generalAssumptions: [
      'Projections are planning estimates based on regional modal APMC mandi prices and normal seasonal weather.',
      'Net profit and yields are never guaranteed and depend on timely field operations.'
    ]
  };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Missing Authorization header' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');

    // Create Supabase client bound to the calling user's JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Unauthorized session' } }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const farmId = body.farmId;
    const preferences = body.preferences || {};

    if (!farmId) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'farmId is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch authoritative farm profile
    const { data: farm, error: farmError } = await supabaseClient
      .from('farms')
      .select('*')
      .eq('id', farmId)
      .eq('user_id', user.id)
      .single();

    if (farmError || !farm) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Farm not found or access denied' } }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Build agronomic context
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
      preferences
    };

    let aiResult: any = null;
    let modelName = 'kisansaarthi-agronomy-engine-v1';

    // Step 3: Call Gemini API if GEMINI_API_KEY is configured
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        const prompt = `Analyze this farm context and generate 3 to 5 realistic agricultural crop options:
${JSON.stringify(farmContext, null, 2)}

Provide JSON matching:
{
  "recommendations": [
    {
      "cropName": "string",
      "suitability": "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN",
      "waterRequirement": "string",
      "investment": { "min": number, "expected": number, "max": number },
      "durationDays": number,
      "yield": { "min": number, "expected": number, "max": number, "unit": "string" },
      "revenue": { "min": number, "expected": number, "max": number, "currency": "INR" },
      "risk": "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN",
      "reasoning": "string",
      "tradeoffs": ["string"],
      "assumptions": ["string"],
      "confidence": number
    }
  ],
  "missingInformation": ["string"],
  "generalAssumptions": ["string"]
}`;

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const geminiRes = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeout);

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const cleanedText = rawText.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
            const parsed = JSON.parse(cleanedText);
            if (Array.isArray(parsed.recommendations) && parsed.recommendations.length > 0) {
              aiResult = parsed;
              modelName = 'gemini-2.5-flash';
            }
          }
        } else {
          const errBody = await geminiRes.text();
          console.warn('Gemini API call returned non-200 status:', geminiRes.status, errBody);
        }
      } catch (geminiErr: any) {
        console.warn('Gemini call error, activating agronomy fallback:', geminiErr.message);
      }
    }

    // Activate deterministic agronomy fallback if Gemini did not produce a validated result
    if (!aiResult) {
      aiResult = generateAgronomicFallback(farm, preferences);
    }

    // Step 4: Persist in public.ai_histories (if table exists)
    let aiHistoryId: string | null = null;
    try {
      const { data: historyRow } = await supabaseClient
        .from('ai_histories')
        .insert({
          user_id: user.id,
          farm_id: farmId,
          feature_type: 'CROP_RECOMMENDATION',
          model_name: modelName,
          input_context: farmContext,
          output_json: aiResult,
          validation_status: 'VALIDATED'
        })
        .select('id')
        .single();

      if (historyRow) {
        aiHistoryId = historyRow.id;
      }
    } catch (histErr: any) {
      console.warn('Could not record in ai_histories:', histErr.message);
    }

    // Step 5: Save each recommendation into public.crop_plans
    const savedPlans: any[] = [];
    for (const rec of aiResult.recommendations) {
      try {
        const planRecord = {
          farm_id: farmId,
          crop_name: rec.cropName,
          suitability: rec.suitability || 'MEDIUM',
          water_requirement: rec.waterRequirement || 'Moderate',
          investment_min: rec.investment?.min ?? 0,
          investment_expected: rec.investment?.expected ?? 0,
          investment_max: rec.investment?.max ?? 0,
          duration_days: rec.durationDays || 90,
          yield_min: rec.yield?.min ?? 0,
          yield_expected: rec.yield?.expected ?? 0,
          yield_max: rec.yield?.max ?? 0,
          revenue_min: rec.revenue?.min ?? 0,
          revenue_expected: rec.revenue?.expected ?? 0,
          revenue_max: rec.revenue?.max ?? 0,
          risk: ['LOW', 'MEDIUM', 'HIGH'].includes(rec.risk) ? rec.risk : 'MEDIUM',
          reasoning: rec.reasoning || 'Agronomic match for farm profile.',
          tradeoffs: Array.isArray(rec.tradeoffs) ? rec.tradeoffs.join('; ') : (rec.tradeoffs || ''),
          assumptions: Array.isArray(rec.assumptions) ? rec.assumptions : [],
          confidence: rec.confidence ?? 85,
          ai_history_id: aiHistoryId
        };

        const { data: insertedPlan, error: insertError } = await supabaseClient
          .from('crop_plans')
          .insert(planRecord)
          .select()
          .single();

        if (!insertError && insertedPlan) {
          savedPlans.push({
            ...insertedPlan,
            yieldUnit: rec.yield?.unit || 'tonnes',
            tradeoffsArray: rec.tradeoffs || []
          });
        } else if (insertError) {
          console.warn('Failed to insert single crop plan:', insertError.message);
        }
      } catch (insertCatch: any) {
        console.warn('Error inserting crop plan:', insertCatch.message);
      }
    }

    // Step 6: Return exact response shape expected by React UI
    const responsePayload = {
      success: true,
      data: {
        aiHistoryId,
        modelName,
        recommendations: aiResult.recommendations,
        missingInformation: aiResult.missingInformation || [],
        generalAssumptions: aiResult.generalAssumptions || [],
        savedPlans
      }
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Edge Function unhandled error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: error.message || 'An unexpected error occurred during crop recommendation analysis.' }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
