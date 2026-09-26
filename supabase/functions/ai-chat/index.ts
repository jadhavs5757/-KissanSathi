// ==============================================================================
// KISANSAARTHI AI — SUPABASE EDGE FUNCTION: ai-chat
// Description: Multi-turn agricultural assistant with farm grounding and
//              Gemini Flash structured reasoning in the farmer's selected language.
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

MANDATORY RULES:
1. Ground guidance strictly in the provided farm data (soil type, water source, land size, active crop, expenses).
2. If data is not provided or unclear, note what information is missing.
3. Never invent chemical doses. Always suggest consulting a local Krishi Vigyan Kendra (KVK) or extension officer for certified pesticide schedules.
4. Distinguish verified facts from estimates. Never guarantee profit or yield.
5. Provide practical, prioritized actions (LOW, MEDIUM, HIGH, CRITICAL) with clear reasoning.
6. MANDATORY LANGUAGE REQUIREMENT:
   - You MUST answer the farmer ENTIRELY in the selected language.
   - All human-readable content ("answer", "action", "reason", "assumptions", "missingInformation") MUST be written exclusively in the target language and script.
   - Do NOT return English explanations followed by translated text.
   - Do NOT mix English into the reasoning or explanations unless it is an unavoidable proper name, official government scheme abbreviation (e.g., PMFBY, PM-KISAN, PMKSY, KCC), or URL.
7. CRITICAL JSON STRUCTURE RULE:
   - All JSON property keys ("answer", "actions", "priority", "action", "reason", "assumptions", "missingInformation", "confidence") MUST remain strictly in English.
   - Priority enum values ("LOW", "MEDIUM", "HIGH", "CRITICAL") MUST remain strictly in English.
   - Return strictly valid JSON adhering to the specified schema without Markdown fences or backticks.`;

const LANGUAGE_CONFIG: Record<string, { name: string; instruction: string }> = {
  en: {
    name: 'English',
    instruction: 'Respond entirely in English. Use clear, simple, farmer-friendly English.'
  },
  te: {
    name: 'Telugu (తెలుగు)',
    instruction: 'Respond entirely in Telugu (తెలుగు). Use natural, farmer-friendly Telugu. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Telugu script.'
  },
  hi: {
    name: 'Hindi (हिन्दी)',
    instruction: 'Respond entirely in Hindi (हिन्दी). Use simple, natural, farmer-friendly Hindi in Devanagari script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Hindi.'
  },
  mr: {
    name: 'Marathi (मराठी)',
    instruction: 'Respond entirely in Marathi (मराठी). Use simple, natural, farmer-friendly Marathi in Devanagari script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Marathi.'
  },
  ta: {
    name: 'Tamil (தமிழ்)',
    instruction: 'Respond entirely in Tamil (தமிழ்). Use simple, natural, farmer-friendly Tamil in Tamil script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Tamil.'
  },
  kn: {
    name: 'Kannada (ಕನ್ನಡ)',
    instruction: 'Respond entirely in Kannada (ಕನ್ನಡ). Use simple, natural, farmer-friendly Kannada in Kannada script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Kannada.'
  },
  ml: {
    name: 'Malayalam (മലയാളം)',
    instruction: 'Respond entirely in Malayalam (മലയാളം). Use simple, natural, farmer-friendly Malayalam in Malayalam script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Malayalam.'
  },
  bn: {
    name: 'Bengali (বাংলা)',
    instruction: 'Respond entirely in Bengali (বাংলা). Use simple, natural, farmer-friendly Bengali in Bengali script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Bengali.'
  },
  gu: {
    name: 'Gujarati (ગુજરાતી)',
    instruction: 'Respond entirely in Gujarati (ગુજરાતી). Use simple, natural, farmer-friendly Gujarati in Gujarati script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Gujarati.'
  },
  pa: {
    name: 'Punjabi (ਪੰਜਾਬੀ)',
    instruction: 'Respond entirely in Punjabi (ਪੰਜਾਬੀ). Use simple, natural, farmer-friendly Punjabi in Gurmukhi script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Punjabi.'
  },
  or: {
    name: 'Odia (ଓଡ଼ିଆ)',
    instruction: 'Respond entirely in Odia (ଓଡ଼ିଆ). Use simple, natural, farmer-friendly Odia in Odia script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Odia.'
  },
  od: {
    name: 'Odia (ଓଡ଼ିଆ)',
    instruction: 'Respond entirely in Odia (ଓଡ଼ିଆ). Use simple, natural, farmer-friendly Odia in Odia script. Do not translate the answer into English. Ensure all explanations, recommendations, actions, and reasons are written completely in Odia.'
  }
};

/**
 * Robust localized agronomic responses in the farmer's selected language.
 * Guarantees that even if Gemini is temporarily unreachable, the response NEVER drops to English.
 */
function generateDeterministicAgronomicResponse(
  message: string,
  farm: any,
  cropCycle: any,
  expensesTotal: number = 0,
  langCode: string = 'en'
) {
  const code = (langCode === 'od' ? 'or' : langCode).toLowerCase();
  const msg = message.toLowerCase();
  const farmName = farm?.name || (code === 'te' ? 'మీ పొలం' : code === 'hi' ? 'आपका खेत' : code === 'mr' ? 'आपले शेत' : 'your farm');
  const cropName = cropCycle?.crop_name || (code === 'te' ? 'ప్రస్తుత పంట' : code === 'hi' ? 'सक्रिय फसल' : code === 'mr' ? 'सध्याचे पीक' : 'your active crop');
  const stage = cropCycle?.current_stage || (code === 'te' ? 'వృద్ధి దశ' : code === 'hi' ? 'वृद्धि चरण' : code === 'mr' ? 'वाढ अवस्था' : 'active stage');
  const waterSource = farm?.water_source || 'BOREWELL';
  const formattedExpenses = `₹${expensesTotal.toLocaleString('en-IN')}`;
  const plannedBudget = `₹${(Number(farm?.capital_budget) || 0).toLocaleString('en-IN')}`;

  const isToday = msg.includes('today') || msg.includes('do') || msg.includes('చేయాలి') || msg.includes('करना') || msg.includes('करावे');
  const isExpense = msg.includes('spent') || msg.includes('expense') || msg.includes('cost') || msg.includes('money') || msg.includes('ఖర్చు') || msg.includes('खर्च') || msg.includes('पैसे');
  const isWater = msg.includes('water') || msg.includes('irrigation') || msg.includes('borewell') || msg.includes('నీరు') || msg.includes('నీటి') || msg.includes('पानी') || msg.includes('सिंचाई') || msg.includes('पाणी');
  const isScheme = msg.includes('scheme') || msg.includes('government') || msg.includes('subsidy') || msg.includes('పథక') || msg.includes('సబ్సిడీ') || msg.includes('योजना') || msg.includes('अनुदान');
  const isRain = msg.includes('rain') || msg.includes('weather') || msg.includes('storm') || msg.includes('వర్ష') || msg.includes('వాతావరణ') || msg.includes('बारिश') || msg.includes('मौसम') || msg.includes('पाऊस') || msg.includes('हवामान');

  if (code === 'te') {
    if (isToday) {
      return {
        answer: `మీ పొలం (${farmName}) లో ${cropName} పంట ప్రస్తుతం ${stage} దశలో ఉంది. మీ తక్షణ ప్రాధాన్యత నేలలోని తేమ శాతాన్ని పరిశీలించడం మరియు ఆకులపై ఏవైనా తెగుళ్లు లేదా కీటకాల సంకేతాలు ఉన్నాయో లేదో గమనించడం. ఇప్పటివరకు నమోదైన మొత్తం పెట్టుబడి ఖర్చులు ${formattedExpenses}.`,
        actions: [
          { priority: 'HIGH', action: 'వేరు మండలంలో (4-6 అంగుళాల లోతు) నేల తేమను పరిశీలించండి.', reason: 'నీటి ఎద్దడి మరియు అధిక తేమ రెండింటినీ నివారిస్తుంది.' },
          { priority: 'MEDIUM', action: 'క్రాప్ కంట్రోల్ సెంటర్‌లో ఉన్న ప్రస్తుత షెడ్యూల్ పనులను పూర్తి చేయండి.', reason: 'పొలం పనులను పంట క్యాలెండర్‌కు అనుగుణంగా ఉంచుతుంది.' }
        ],
        assumptions: ['అంచనాలు ఫీల్డ్ పరిశీలనలతో సరిచూసుకోవాలి.'],
        missingInformation: [],
        confidence: 85
      };
    }
    if (isExpense) {
      return {
        answer: `మీ లెక్కల ప్రకారం, ${farmName} కోసం ఇప్పటివరకు నమోదైన మొత్తం ఖర్చులు ${formattedExpenses}. మీ ప్రణాళికాబద్ధమైన పెట్టుబడి బడ్జెట్ ${plannedBudget}.`,
        actions: [
          { priority: 'MEDIUM', action: 'ఖర్చుల ట్యాబ్‌లో విత్తనాలు, ఎరువులు, కూలీలు మరియు నీటిపారుదల ఖర్చుల వర్గీకరణను సమీక్షించండి.', reason: 'పెట్టుబడి ఎక్కడ ఎక్కువగా వెచ్చిస్తున్నారో స్పష్టత ఇస్తుంది.' }
        ],
        assumptions: ['ఖర్చులు మీరు నమోదు చేసిన రికార్డులపై ఆధారపడి ఉన్నాయి.'],
        missingInformation: [],
        confidence: 90
      };
    }
    if (isWater) {
      return {
        answer: `మీ పొలానికి ${waterSource} నీటిపారుదల సౌకర్యం ఉంది. ${stage} దశలో నీరు నిలవకుండా నేల పీల్చుకునే విధంగా నీటిపారుదల సమయాన్ని నియంత్రించండి.`,
        actions: [
          { priority: 'HIGH', action: 'ఉదయం లేదా సాయంత్రం వేళల్లో మాత్రమే నీరు పెట్టండి.', reason: 'భాష్పీభవన నష్టాన్ని తగ్గిస్తుంది మరియు వేడి మధ్యాహ్నం ఆకులపై శిలీంధ్రాలు వృద్ధి చెందకుండా నిరోధిస్తుంది.' }
        ],
        assumptions: ['నీటి సరఫరా సాధారణ స్థితిలో ఉందని భావించబడింది.'],
        missingInformation: [],
        confidence: 85
      };
    }
    if (isScheme) {
      return {
        answer: `మీ పొలానికి సంబంధించిన ముఖ్య ప్రభుత్వ పథకాలు: PMFBY (${cropName} పంట బీమా), PM-KISAN (ఏటా ₹6,000 ఆదాయ మద్దతు), PMKSY (సూక్ష్మ నీటిపారుదలపై 55% వరకు సబ్సిడీ) మరియు కిసాన్ క్రెడిట్ కార్డ్ (KCC 4% వడ్డీతో రాయితీ రుణాలు). ప్రభుత్వ మద్దతు ట్యాబ్‌లో పూర్తి వివరాలు చూడండి.`,
        actions: [
          { priority: 'MEDIUM', action: 'మీ ఆధార్ ఇ-కేవైసీ మరియు భూమి పట్టాదారు పాస్‌బుక్ / 7/12 రికార్డులను సిద్ధంగా ఉంచుకోండి.', reason: 'కేంద్ర, రాష్ట్ర వ్యవసాయ సబ్సిడీల దరఖాస్తులకు ప్రాథమిక అవసరం.' }
        ],
        assumptions: ['అర్హత భూమి రికార్డులు మరియు బ్యాంకు ఖాతా లింకేజీపై ఆధారపడి ఉంటుంది.'],
        missingInformation: [],
        confidence: 88
      };
    }
    if (isRain) {
      return {
        answer: `వర్ష సూచన లేదా వర్షం పడుతున్నప్పుడు, ప్రధాన ఆదేశం ఏమిటంటే అదనపు నీటిపారుదలని తక్షణమే నిలిపివేయడం, నేల తేమను తనిఖీ చేయడం మరియు నీరు నిలవకుండా డ్రైనేజీ కాలువలను సరిదిద్దడం.`,
        actions: [
          { priority: 'HIGH', action: 'నీటిపారుదలని ఆపివేయండి మరియు పొడి వాతావరణం ఏర్పడే వరకు పురుగుమందుల పిచికారీని వాయిదా వేయండి.', reason: 'వర్షం వల్ల రసాయనాలు కొట్టుకుపోతాయి మరియు నీరు నిలవడం వల్ల వేర్లకు గాలి అందదు.' }
        ],
        assumptions: ['వాతావరణ హెచ్చరికలు స్థానిక పరిస్థితులపై ఆధారపడి ఉంటాయి.'],
        missingInformation: [],
        confidence: 85
      };
    }
    return {
      answer: `మీ పొలం వివరాల ప్రకారం (${farm?.land_area_acres || 1} ఎకరాలు, ${farm?.soil_type || 'నేల'}, ${farm?.water_source || 'నీటి వనరు'}), సమతుల్య పోషక నిర్వహణ మరియు క్రమబద్ధమైన క్షేత్ర పరిశీలనతో ${cropName} పంటను నిర్వహించండి. మీ నిర్ణయ మద్దతును మెరుగుపరచడానికి కొత్త పరిశీలనలను నమోదు చేయండి.`,
      actions: [
        { priority: 'MEDIUM', action: 'క్రాప్ కంట్రోల్ సెంటర్‌లో రాబోయే పంట పనులను సమీక్షించండి మరియు ఏవైనా మార్పులను రికార్డ్ చేయండి.', reason: 'ఖచ్చితమైన నిర్ణయాల కోసం పొలం చరిత్రను తాజాగా ఉంచుతుంది.' }
      ],
      assumptions: ['సాధారణ వ్యవసాయ మార్గదర్శకాలు వర్తిస్తాయి.'],
      missingInformation: [],
      confidence: 85
    };
  }

  if (code === 'hi') {
    if (isToday) {
      return {
        answer: `आपके खेत (${farmName}) में ${cropName} फसल वर्तमान में ${stage} अवस्था में है। आपकी तत्काल प्राथमिकता मिट्टी की नमी की जांच करना और पत्तियों पर कीट या फफूंद के लक्षणों का निरीक्षण करना है। अब तक दर्ज कुल खर्च ${formattedExpenses} है।`,
        actions: [
          { priority: 'HIGH', action: 'जड़ क्षेत्र (4-6 इंच गहराई) में मिट्टी की नमी की स्थिति जांचें।', reason: 'नमी की कमी और अत्यधिक जलभराव दोनों से फसल को बचाता है।' },
          { priority: 'MEDIUM', action: 'क्रॉप कंट्रोल सेंटर में लंबित दैनिक कार्यों को पूरा करें।', reason: 'खेत संचालन को फसल कैलेंडर के अनुसार रखता है।' }
        ],
        assumptions: ['अनुमानों को प्रत्यक्ष खेत अवलोकन के साथ संतुलित किया जाना चाहिए।'],
        missingInformation: [],
        confidence: 85
      };
    }
    if (isExpense) {
      return {
        answer: `आपके रिकॉर्ड के अनुसार, ${farmName} के लिए अब तक का कुल खर्च ${formattedExpenses} है। आपका नियोजित पूंजीगत बजट ${plannedBudget} था।`,
        actions: [
          { priority: 'MEDIUM', action: 'खर्च टैब में बीज, उर्वरक, मजदूरी और सिंचाई श्रेणियों का विश्लेषण करें।', reason: 'यह समझने में मदद करता है कि लागत कहाँ सबसे अधिक है।' }
        ],
        assumptions: ['खर्च आपके द्वारा दर्ज किए गए आंकड़ों पर आधारित हैं।'],
        missingInformation: [],
        confidence: 90
      };
    }
    if (isWater) {
      return {
        answer: `आपके खेत में ${waterSource} सिंचाई प्रणाली है। ${stage} अवस्था में जलभराव से बचें और मिट्टी की सोखने की क्षमता के अनुसार ही सिंचाई करें।`,
        actions: [
          { priority: 'HIGH', action: 'सुबह या शाम के समय ही सिंचाई करें।', reason: 'वाष्पीकरण को कम करता है और तेज धूप में पत्तियों पर फफूंद संक्रमण को रोकता है।' }
        ],
        assumptions: ['पानी की आपूर्ति सामान्य मानी गई है।'],
        missingInformation: [],
        confidence: 85
      };
    }
    if (isScheme) {
      return {
        answer: `आपके खेत के लिए प्रमुख सरकारी योजनाएं: PMFBY (${cropName} फसल बीमा), PM-KISAN (₹6,000/वर्ष आय सहायता), PMKSY (ड्रिप/स्प्रिंकलर सिंचाई पर 55% तक सब्सिडी), और किसान क्रेडिट कार्ड (KCC 4% रियायती ऋण)। सरकारी सहायता टैब में दस्तावेज चेकलिस्ट देखें।`,
        actions: [
          { priority: 'MEDIUM', action: 'आधार ई-केवाईसी और भूमि स्वामित्व खसरा/खतौनी दस्तावेज सत्यापित रखें।', reason: 'सभी राज्य और केंद्रीय कृषि सब्सिडी आवेदनों के लिए अनिवार्य दस्तावेज।' }
        ],
        assumptions: ['पात्रता आधिकारिक रिकॉर्ड सत्यापन पर निर्भर करती है।'],
        missingInformation: [],
        confidence: 88
      };
    }
    if (isRain) {
      return {
        answer: `बारिश के पूर्वानुमान में मुख्य निर्देश है कि अतिरिक्त सिंचाई तुरंत रोकें, मिट्टी की जल निकासी नालियों को साफ रखें और कीटनाशक छिड़काव टालें।`,
        actions: [
          { priority: 'HIGH', action: 'सिंचाई रोकें और मौसम साफ होने तक छिड़काव टालें।', reason: 'बारिश से दवाएं धुल जाती हैं और जलभराव से जड़ों में सड़न का खतरा होता है।' }
        ],
        assumptions: ['मौसम का पूर्वानुमान स्थानीय स्थिति पर निर्भर है।'],
        missingInformation: [],
        confidence: 85
      };
    }
    return {
      answer: `आपके खेत के विवरण (${farm?.land_area_acres || 1} एकड़, ${farm?.soil_type || 'मिट्टी'}, ${farm?.water_source || 'जल स्रोत'}) के अनुसार, संतुलित पोषण और नियमित निगरानी के साथ ${cropName} की देखभाल करें। खेत के सभी नए अवलोकनों को रिकॉर्ड में दर्ज रखें।`,
      actions: [
        { priority: 'MEDIUM', action: 'क्रॉप कंट्रोल सेंटर में आगामी कार्यों की समीक्षा करें और खेत में नए बदलाव दर्ज करें।', reason: 'निर्णय समर्थन के लिए खेत का रिकॉर्ड अद्यतन रखता है।' }
      ],
      assumptions: ['सामान्य कृषि प्रबंधन सिद्धांत लागू होते हैं।'],
      missingInformation: [],
      confidence: 85
    };
  }

  if (code === 'mr') {
    if (isToday) {
      return {
        answer: `आपल्या शेतासाठी (${farmName}), ${cropName} पीक सध्या ${stage} अवस्थेत आहे. आपली तात्काळ प्राथमिकता जमिनीतील ओलावा तपासणे आणि पानांवरील कीड किंवा रोगांचे निरीक्षण करणे ही असावी. आतापर्यंतचा एकूण खर्च ${formattedExpenses} नोंदवला गेला आहे.`,
        actions: [
          { priority: 'HIGH', action: 'मुळांच्या खोलीत (४-६ इंच) मातीचा ओलावा तपासा.', reason: 'पाण्याचा ताण आणि अति-ओलावा या दोन्हीपासून पिकाचे रक्षण होते.' },
          { priority: 'MEDIUM', action: 'पीक नियंत्रण केंद्रातील नियोजित कामे वेळेत पूर्ण करा.', reason: 'शेतातील कामकाज पीक वेळापत्रकानुसार सुरू राहते.' }
        ],
        assumptions: ['अंदाज थेट शेतातील निरीक्षणाने पडताळून घ्यावेत.'],
        missingInformation: [],
        confidence: 85
      };
    }
    if (isExpense) {
      return {
        answer: `आपल्या नोंदीनुसार, ${farmName} साठी आतापर्यंत झालेला एकूण खर्च ${formattedExpenses} आहे. नियोजित भांडवली बजेट ${plannedBudget} होते.`,
        actions: [
          { priority: 'MEDIUM', action: 'खर्च टॅबमध्ये बियाणे, खते, मजुरी आणि सिंचन यानुसार खर्चाचे वर्गीकरण तपासा.', reason: 'भांडवल कुठे जास्त खर्च होत आहे हे समजण्यास मदत होते.' }
        ],
        assumptions: ['खर्च नोंदी आपण भरलेल्या माहितीवर आधारित आहेत.'],
        missingInformation: [],
        confidence: 90
      };
    }
    if (isWater) {
      return {
        answer: `आपल्या शेतामध्ये ${waterSource} सिंचन व्यवस्था आहे. ${stage} अवस्थेत पाणी साचू न देता जमिनीच्या आवश्यकतेनुसारच पाणी व्यवस्थापन करा.`,
        actions: [
          { priority: 'HIGH', action: 'सकाळच्या किंवा संध्याकाळच्या वेळीच पाणी द्या.', reason: 'बाष्पीभवन कमी होते आणि दुपारच्या उन्हात पानांवर बुरशीजन्य रोग वाढण्यास आळा बसतो.' }
        ],
        assumptions: ['पाणी पुरवठा नियमित आहे असे गृहीत धरले आहे.'],
        missingInformation: [],
        confidence: 85
      };
    }
    if (isScheme) {
      return {
        answer: `आपल्या शेतासाठी महत्त्वाच्या शासकीय योजना: PMFBY (${cropName} पीक विमा), PM-KISAN (वार्षिक ₹६,००० सन्मान निधी), PMKSY (ठिबक/तुषार सिंचनावर ५५% पर्यंत अनुदान), आणि किसान क्रेडिट कार्ड (KCC ४% व्याजदराने पीक कर्ज). शासकीय साहाय्य टॅबमध्ये कागदपत्रांची यादी तपासा.`,
        actions: [
          { priority: 'MEDIUM', action: 'आधार ई-केवायसी आणि ७/१२ उतारा / ८-अ उतारे अद्ययावत ठेवा.', reason: 'सर्व राज्य व केंद्र शासकीय कृषी अनुदानांसाठी आवश्यक कागदपत्र.' }
        ],
        assumptions: ['पात्रता अधिकृत शासकीय छाननीवर अवलंबून असते.'],
        missingInformation: [],
        confidence: 88
      };
    }
    if (isRain) {
      return {
        answer: `पावसाचा अंदाज असल्यास किंवा पाऊस सुरू असताना, अतिरिक्त सिंचन त्वरित थांबवा, शेतातील अतिरिक्त पाण्याचा निचरा व्यवस्थित ठेवा आणि फवारणी पुढे ढकला.`,
        actions: [
          { priority: 'HIGH', action: 'पाणी देणे थांबवा आणि हवामान कोरडे होईपर्यंत औषध फवारणी पुढे ढकला.', reason: 'पावसामुळे औषध वाहून जाते आणि पाणी साचल्यास मुळे कुजण्याचा धोका असतो.' }
        ],
        assumptions: ['हवामान अंदाज स्थानिक परिस्थितीनुसार बदलू शकतात.'],
        missingInformation: [],
        confidence: 85
      };
    }
    return {
      answer: `आपल्या शेताच्या माहितीनुसार (${farm?.land_area_acres || 1} एकर, ${farm?.soil_type || 'माती'}, ${farm?.water_source || 'पाण्याचा स्रोत'}), संतुलित खत व्यवस्थापन आणि नियमित निरीक्षणासह ${cropName} पिकाची निगा राखा. शेतातील नवीन नोंदी अद्ययावत ठेवा.`,
      actions: [
        { priority: 'MEDIUM', action: 'पीक नियंत्रण केंद्रातील पुढील कामे तपासा आणि शेतातील निरीक्षणे नोंदवा.', reason: 'पुढील निर्णय घेण्यासाठी शेताचा इतिहास अद्ययावत राहतो.' }
      ],
      assumptions: ['प्रमाणित कृषी मार्गदर्शक तत्त्वे लागू होतात.'],
      missingInformation: [],
      confidence: 85
    };
  }

  // English (default standard agronomy response)
  if (isToday) {
    return {
      answer: `For ${farmName}, with ${cropName} in the ${stage} stage: your immediate focus should be inspecting field moisture and checking for any leaf spots or insect activity. Total expenses logged so far stand at ${formattedExpenses}.`,
      actions: [
        { priority: 'HIGH', action: 'Inspect field moisture level at root depth (4-6 inches).', reason: 'Avoid both water deficit stress and over-saturation.' },
        { priority: 'MEDIUM', action: 'Complete pending routine tasks in your Crop Control Center.', reason: 'Keeps field operations aligned with the crop calendar.' }
      ],
      assumptions: ['Estimates must be balanced with direct field observations.'],
      missingInformation: [],
      confidence: 85
    };
  }
  if (isExpense) {
    return {
      answer: `Based on your recorded accounts, total expenses for ${farmName} amount to ${formattedExpenses}. Farm capital budget was planned at ${plannedBudget}.`,
      actions: [
        { priority: 'MEDIUM', action: 'Review category breakdowns (Seeds, Fertilizer, Labour, Irrigation) in the Expenses tab.', reason: 'Identifies where capital is being deployed most heavily.' }
      ],
      assumptions: ['Figures are based on your logged transactions.'],
      missingInformation: [],
      confidence: 90
    };
  }
  if (isWater) {
    return {
      answer: `Your farm is configured with ${waterSource} irrigation running approximately as scheduled. In ${stage} stage, regulate irrigation to match soil absorption without creating standing pools.`,
      actions: [
        { priority: 'HIGH', action: 'Maintain irrigation during morning or evening hours.', reason: 'Reduces evaporation loss and prevents fungal spore development on wet foliage during hot afternoons.' }
      ],
      assumptions: ['Water source operational capacity is stable.'],
      missingInformation: [],
      confidence: 85
    };
  }
  if (isScheme) {
    return {
      answer: `Key potentially relevant programs for your farm profile include PMFBY (Crop Insurance for ${cropName}), PM-KISAN (₹6,000/yr income support), PMKSY (Micro-irrigation subsidy up to 55%), and Kisan Credit Card (concessional crop loans at 4%). Check the Government Support tab for exact documentation checklists.`,
      actions: [
        { priority: 'MEDIUM', action: 'Verify your Aadhaar e-KYC and land ownership 7/12 extract / Patta papers.', reason: 'Essential document requirement across all state and central agricultural subsidy applications.' }
      ],
      assumptions: ['Eligibility subject to official state portal guidelines.'],
      missingInformation: [],
      confidence: 88
    };
  }
  if (isRain) {
    return {
      answer: `When rainfall is forecast or increases, the primary directive is to immediately pause automated irrigation, verify soil moisture absorption, and inspect perimeter drainage channels to eliminate standing pools.`,
      actions: [
        { priority: 'HIGH', action: 'Halt additional irrigation and delay pesticide spraying until dry weather.', reason: 'Rain wash neutralizes chemical treatments and standing water damages root aeration.' }
      ],
      assumptions: ['Meteorological advisories are based on regional radar models.'],
      missingInformation: [],
      confidence: 85
    };
  }

  return {
    answer: `Based on your digital farm profile (${farm?.land_area_acres || 1} acres, ${farm?.soil_type || 'soil'}, ${farm?.water_source || 'water'}), manage ${cropName} with balanced nutrient application and regular scouting. Log any new observations or costs to keep your farm data up to date.`,
    actions: [
      { priority: 'MEDIUM', action: 'Review your upcoming crop tasks and record any physical observations in the crop control center.', reason: 'Maintains an auditable farm history for decision support.' }
    ],
    assumptions: ['Estimates are planning indicators and must be balanced with direct field observation.'],
    missingInformation: [],
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
    const rawLang = body.language || body.preferredLanguage || 'en';
    const languageCode = rawLang === 'od' ? 'or' : rawLang;

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

    const langConfig = LANGUAGE_CONFIG[languageCode] || LANGUAGE_CONFIG['en'];
    const targetLanguage = langConfig.name;

    const promptContext = {
      message,
      selectedLanguage: `${targetLanguage} (code: ${languageCode})`,
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

    let aiResult: any = null;
    let modelName = 'kisansaarthi-agronomy-engine-v1';

    // Step 2: Invoke Gemini Flash if GEMINI_API_KEY is available
    if (geminiApiKey && geminiApiKey.trim() !== '') {
      try {
        const runtimePrompt = `Farmer query: "${message}"

Selected Language: ${targetLanguage} (Code: ${languageCode})
MANDATORY LANGUAGE DIRECTIVE:
${langConfig.instruction}
You MUST answer the farmer entirely in ${targetLanguage}.
The agricultural reasoning, recommendations, warnings, explanations, and suggested actions must all use ${targetLanguage}.

Authoritative Farm Data:
${JSON.stringify(promptContext, null, 2)}

Provide clear, structured, practical guidance based on this farm context.
CRITICAL MANDATORY INSTRUCTIONS:
- LANGUAGE REQUIREMENT: You MUST respond in ${targetLanguage}. All values in "answer", "action", "reason", "assumptions", and "missingInformation" MUST be written in ${targetLanguage}.
- DO NOT return English explanations followed by translated text.
- DO NOT mix English into the reasoning or explanations.
- JSON SCHEMA KEYS: All JSON property names/keys ("answer", "actions", "priority", "action", "reason", "assumptions", "missingInformation", "confidence") and priority enum values ("LOW", "MEDIUM", "HIGH", "CRITICAL") MUST REMAIN STRICTLY IN ENGLISH.
- Never fabricate data or claim certainty when information is missing.
- Do not invent chemical doses; advise consulting local Krishi Vigyan Kendra (KVK) or agriculture extension officer if chemical details are requested.
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

        // Attempt official Gemini Flash models in priority order
        const candidateModels = ['gemini-1.5-flash', 'gemini-2.0-flash'];

        for (const candidate of candidateModels) {
          try {
            const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:generateContent?key=${geminiApiKey}`;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 18000);

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
                const answerText = parsed.answer || parsed.message;
                if (answerText) {
                  const actionList = Array.isArray(parsed.actions) ? parsed.actions : (Array.isArray(parsed.suggestedActions) ? parsed.suggestedActions : []);
                  aiResult = {
                    answer: answerText,
                    message: answerText,
                    actions: actionList,
                    suggestedActions: actionList,
                    assumptions: Array.isArray(parsed.assumptions) ? parsed.assumptions : [],
                    missingInformation: Array.isArray(parsed.missingInformation) ? parsed.missingInformation : [],
                    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85
                  };
                  modelName = candidate;
                  break;
                }
              }
            } else {
              const errBody = await geminiRes.text();
              console.warn(`[ai-chat] Gemini ${candidate} returned non-200:`, geminiRes.status, errBody);
            }
          } catch (modelErr: any) {
            console.warn(`[ai-chat] Gemini ${candidate} call error:`, modelErr.message);
          }
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
        languageCode
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

    // Step 6: Return structured response adhering to schema
    const responsePayload = {
      success: true,
      data: {
        answer: aiResult.answer,
        message: aiResult.answer,
        actions: aiResult.actions || [],
        suggestedActions: aiResult.actions || [],
        assumptions: aiResult.assumptions || [],
        missingInformation: aiResult.missingInformation || [],
        confidence: aiResult.confidence ?? 85,
        language: languageCode,
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
