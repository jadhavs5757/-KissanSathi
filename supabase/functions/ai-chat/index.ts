// ==============================================================================
// KISANSAARTHI AI — SUPABASE EDGE FUNCTION: ai-chat
// Description: Multi-turn agricultural assistant with farm grounding and
//              Gemini 2.5 Flash structured reasoning.
//              Persists history to public.ai_histories and public.ai_messages.
// ==============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.48.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const SYSTEM_PROMPT = `You are KisanSaarthi AI, an expert agricultural decision-support assistant for Indian farmers.
Your mission is to provide evidence-aware, actionable agronomic advice grounded in the farmer's real farm conditions, crop cycle stages, weather patterns, and logged input expenses.

RULES:
1. Always ground your guidance in the provided farm data (soil type, water source, land size, active crop, expenses).
2. If data is not provided or unclear, note what information is missing.
3. Never invent chemical doses. Always suggest consulting a local Krishi Vigyan Kendra (KVK) or extension officer for certified pesticide schedules.
4. Distinguish verified facts from estimates.
5. Provide practical, prioritized actions (LOW, MEDIUM, HIGH, CRITICAL) with clear reasoning.
6. LANGUAGE INSTRUCTION:
   - Translate all user-facing content (answer, action, reason, assumptions, missingInformation) into the requested target language.
   - All JSON property keys ("answer", "actions", "priority", "action", "reason", "assumptions", "missingInformation", "confidence") MUST remain strictly in English.
7. Return strictly valid JSON adhering to the specified schema without Markdown fences or backticks.`;

function generateDeterministicAgronomicResponse(
  message: string,
  farm: any,
  cropCycle: any,
  expensesTotal: number = 0,
  _targetLanguage: string = 'English'
) {
  const msg = message.toLowerCase();
  let answer = '';
  const actions: Array<{ priority: string; action: string; reason: string }> = [];
  const assumptions: string[] = [];
  const missingInfo: string[] = [];

  const farmName = farm?.name || 'your farm';
  const cropName = cropCycle?.crop_name || 'your current crop';
  const stage = cropCycle?.current_stage || 'current stage';

  if (msg.includes('today') || msg.includes('what should i do')) {
    answer = `For ${farmName}, with ${cropName} in the ${stage} stage: your immediate focus should be inspecting field moisture and checking for any leaf spots or insect activity. Total expenses logged so far stand at ₹${expensesTotal.toLocaleString('en-IN')}.`;
    actions.push({
      priority: 'HIGH',
      action: 'Inspect field moisture level at root depth (4-6 inches).',
      reason: 'Avoid both water deficit stress and over-saturation.'
    });
    actions.push({
      priority: 'MEDIUM',
      action: 'Complete pending routine tasks in your Crop Control Center.',
      reason: 'Keeps field operations aligned with the crop calendar.'
    });
  } else if (msg.includes('spent') || msg.includes('expense') || msg.includes('cost') || msg.includes('money')) {
    answer = `Based on your recorded accounts, total expenses for ${farmName} amount to ₹${expensesTotal.toLocaleString('en-IN')}. Farm capital budget was planned at ₹${(Number(farm?.capital_budget) || 0).toLocaleString('en-IN')}.`;
    actions.push({
      priority: 'MEDIUM',
      action: 'Review category breakdowns (Seeds, Fertilizer, Labour, Irrigation) in the Expenses tab.',
      reason: 'Identifies where capital is being deployed most heavily.'
    });
  } else if (msg.includes('water') || msg.includes('irrigation') || msg.includes('borewell')) {
    const waterSource = farm?.water_source || 'your water source';
    const hours = farm?.water_hours_per_day ? `${farm.water_hours_per_day} hours/day` : 'flexible schedule';
    answer = `Your farm is configured with ${waterSource} irrigation running approximately ${hours}. In ${stage} stage, regulate irrigation to match soil absorption without creating standing pools.`;
    actions.push({
      priority: 'HIGH',
      action: 'Maintain irrigation during morning or evening hours.',
      reason: 'Reduces evaporation loss and prevents fungal spore development on wet foliage during hot afternoons.'
    });
  } else if (msg.includes('scheme') || msg.includes('government') || msg.includes('subsidy')) {
    answer = `Key potentially relevant programs for your farm profile include PMFBY (Crop Insurance for ${cropName}), PM-KISAN (₹6,000/yr income support), PMKSY (Micro-irrigation subsidy up to 55%), and Kisan Credit Card (concessional crop loans at 4%). Check the Government Support tab for exact documentation checklists.`;
    actions.push({
      priority: 'MEDIUM',
      action: 'Verify your Aadhaar e-KYC and land ownership 7/12 extract / Patta papers.',
      reason: 'Essential document requirement across all state and central agricultural subsidy applications.'
    });
  } else if (msg.includes('rain') || msg.includes('weather') || msg.includes('storm')) {
    answer = `When rainfall is forecast or increases, the primary directive is to immediately pause automated irrigation, verify soil moisture absorption, and inspect perimeter drainage channels to eliminate standing pools.`;
    actions.push({
      priority: 'HIGH',
      action: 'Halt additional irrigation and delay pesticide spraying until dry weather.',
      reason: 'Rain wash neutralizes chemical treatments and standing water damages root aeration.'
    });
  } else {
    answer = `Based on your digital farm profile (${farm?.land_area_acres || 1} acres, ${farm?.soil_type || 'soil'}, ${farm?.water_source || 'water'}), manage ${cropName} with balanced nutrient application and regular scouting. Log any new observations or costs to keep your farm data up to date.`;
    actions.push({
      priority: 'MEDIUM',
      action: 'Review your upcoming crop tasks and record any physical observations in the crop control center.',
      reason: 'Maintains an auditable farm history for decision support.'
    });
  }

  assumptions.push('Estimates are planning indicators and must be balanced with direct field observation.');

  return {
    answer,
    actions,
    assumptions,
    missingInformation: missingInfo,
    confidence: 85
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
    const message = (body.message || '').trim();
    const farmId = body.farmId || null;
    const cropCycleId = body.cropCycleId || null;
    let conversationId = body.conversationId || null;
    const languageCode = body.language || body.preferredLanguage || 'en';

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, error: { message: 'Message is required' } }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Fetch authoritative farm profile if provided
    let farmContext: any = null;
    let cycleContext: any = null;
    let totalExpenses = 0;

    if (farmId) {
      const { data: farm } = await supabaseClient
        .from('farms')
        .select('*')
        .eq('id', farmId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (farm) {
        farmContext = farm;

        // Fetch sum of expenses for this farm
        const { data: expenses } = await supabaseClient
          .from('expenses')
          .select('amount')
          .eq('farm_id', farmId);

        if (expenses && expenses.length > 0) {
          totalExpenses = expenses.reduce((sum: number, e: any) => sum + (Number(e.amount) || 0), 0);
        }

        // Fetch crop cycle context
        if (cropCycleId) {
          const { data: cycle } = await supabaseClient
            .from('crop_cycles')
            .select('*')
            .eq('id', cropCycleId)
            .eq('farm_id', farmId)
            .maybeSingle();
          if (cycle) cycleContext = cycle;
        } else {
          const { data: cycles } = await supabaseClient
            .from('crop_cycles')
            .select('*')
            .eq('farm_id', farmId)
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(1);
          if (cycles && cycles.length > 0) {
            cycleContext = cycles[0];
          }
        }
      }
    }

    const promptContext = {
      message,
      preferredLanguage: languageCode,
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

    const languageNames: Record<string, string> = {
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
    const targetLanguage = languageNames[languageCode] || 'English';

    let aiResult: any = null;
    let modelName = 'kisansaarthi-agronomy-engine-v1';

    // Step 2: Invoke Gemini 2.5 Flash if GEMINI_API_KEY is available
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        const runtimePrompt = `Farmer query: "${message}"

Authoritative Farm Data:
${JSON.stringify(promptContext, null, 2)}

Provide clear, structured, practical guidance based on this farm context.
Rules:
- LANGUAGE INSTRUCTION: Respond in the user's selected language: ${targetLanguage}. The text content in "answer", "action", "reason", "assumptions", and "missingInformation" MUST be in ${targetLanguage}.
- CRITICAL JSON SCHEMA RULE: All JSON property names/keys ("answer", "actions", "priority", "action", "reason", "assumptions", "missingInformation", "confidence") MUST REMAIN STRICTLY IN ENGLISH.
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

        const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);

        const geminiRes = await fetch(geminiEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [{ role: 'user', parts: [{ text: runtimePrompt }] }],
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
            if (parsed.answer) {
              aiResult = {
                answer: parsed.answer,
                actions: Array.isArray(parsed.actions) ? parsed.actions : [],
                assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
                missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
                confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85
              };
              modelName = 'gemini-2.5-flash';
            }
          }
        } else {
          const errBody = await geminiRes.text();
          console.warn('Gemini API call non-200 status in ai-chat:', geminiRes.status, errBody);
        }
      } catch (geminiErr: any) {
        console.warn('Gemini call error in ai-chat, activating agronomy fallback:', geminiErr.message);
      }
    }

    // Step 3: Fallback if Gemini did not produce a validated result
    if (!aiResult) {
      aiResult = generateDeterministicAgronomicResponse(
        message,
        farmContext,
        cycleContext,
        totalExpenses,
        targetLanguage
      );
    }

    // Step 4: Persist in public.ai_histories
    let aiHistoryId: string | null = null;
    try {
      const { data: historyRow } = await supabaseClient
        .from('ai_histories')
        .insert({
          user_id: user.id,
          farm_id: farmId,
          crop_cycle_id: cycleContext?.id || null,
          feature_type: 'GENERAL_FARM_ASSISTANT',
          model_name: modelName,
          input_context: promptContext,
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

    // Step 5: Persist conversation and messages if public.ai_conversations / public.ai_messages exist
    try {
      if (!conversationId) {
        const { data: conv } = await supabaseClient
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            title: message.slice(0, 40)
          })
          .select('id')
          .single();

        if (conv) {
          conversationId = conv.id;
        }
      }

      if (conversationId) {
        await supabaseClient.from('ai_messages').insert([
          {
            conversation_id: conversationId,
            sender: 'user',
            message: message,
            actions: [],
            sources: []
          },
          {
            conversation_id: conversationId,
            sender: 'model',
            message: aiResult.answer,
            actions: aiResult.actions || [],
            sources: []
          }
        ]);
      }
    } catch (convErr: any) {
      console.warn('Could not record in ai_conversations/messages:', convErr.message);
    }

    // Step 6: Return structured response
    const responsePayload = {
      success: true,
      data: {
        answer: aiResult.answer,
        actions: aiResult.actions || [],
        assumptions: aiResult.assumptions || [],
        missingInformation: aiResult.missingInformation || [],
        confidence: aiResult.confidence ?? 85,
        historyId: aiHistoryId,
        conversationId,
        modelName
      }
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('ai-chat Edge Function unhandled error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: { message: error.message || 'An unexpected error occurred during AI chat processing.' }
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
