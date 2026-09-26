import React, { useState, useEffect } from 'react';
import { aiService } from '../services/aiService';
import { farmService } from '../services/farmService';
import { cropService } from '../services/cropService';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import LoadingScreen from '../components/ui/LoadingScreen';
import {
  Bot,
  Send,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  History,
  RotateCw,
  Tractor
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../i18n/LanguageContext';

export default function AiAssistantPage() {
  const { language, t } = useTranslation();
  const [farms, setFarms] = useState([]);
  const [selectedFarmId, setSelectedFarmId] = useState('');
  const [activeCycle, setActiveCycle] = useState(null);
  const [loading, setLoading] = useState(true);

  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const LOCALIZED_GREETINGS = {
    en: {
      greeting: 'Namaste! I am KisanSaarthi AI, your evidence-aware agricultural decision assistant. Ask me anything regarding your crop operations, input expenses, irrigation schedules, or government support.',
      action: 'Select your active farm profile above for tailored guidance.',
      reason: 'Ensures reasoning is grounded in your real soil chemistry and water capacity.'
    },
    te: {
      greeting: 'నమస్కారం! నేను కిసాన్ సారథి AI, మీ వ్యవసాయ నిర్ణయ సహాయకుడిని. మీ పంట పనులు, పెట్టుబడి ఖర్చులు, నీటిపారుదల లేదా ప్రభుత్వ పథకాల గురించి నన్ను ఏదైనా అడగండి.',
      action: 'ఖచ్చితమైన మార్గదర్శకత్వం కోసం పైన మీ ప్రస్తుత పొలాన్ని ఎంచుకోండి.',
      reason: 'సలహాలు మీ నేల రకం మరియు నీటి లభ్యతకు తగినట్లుగా ఉండేలా చేస్తుంది.'
    },
    hi: {
      greeting: 'नमस्ते! मैं किसान सारथी AI हूँ, आपका साक्ष्य-आधारित कृषि निर्णय सहायक। अपनी फसल, खर्च, सिंचाई या सरकारी योजनाओं के बारे में कुछ भी पूछें।',
      action: 'सटीक मार्गदर्शन के लिए ऊपर अपने सक्रिय खेत का चयन करें।',
      reason: 'यह सुनिश्चित करता है कि सलाह आपकी वास्तविक मिट्टी और जल क्षमता पर आधारित हो।'
    },
    mr: {
      greeting: 'नमस्कार! मी किसान सारथी AI आहे, आपला पुरावा-आधारित कृषी निर्णय सहाय्यक. आपल्या पिकांची कामे, खर्च, सिंचन किंवा शासकीय योजनांबद्दल मला काहीही विचारा.',
      action: 'अचूक मार्गदर्शनासाठी वर आपले सक्रिय शेत निवडा.',
      reason: 'सल्ला आपल्या मातीचा प्रकार आणि पाण्याच्या उपलब्धतेवर आधारित असल्याची खात्री होते.'
    },
    ta: {
      greeting: 'வணக்கம்! நான் கிசான்சாரதி AI, உங்கள் விவசாய முடிவு ஆதரவு உதவியாளர். உங்கள் பயிர் மேலாண்மை, செலவுகள், பாசனம் அல்லது அரசு திட்டங்கள் பற்றி என்னிடம் கேளுங்கள்.',
      action: 'துல்லியமான வழிகாட்டுதலுக்கு மேலே உள்ள உங்கள் பண்ணையைத் தேர்ந்தெடுக்கவும்.',
      reason: 'ஆலோசனைகள் உங்கள் உண்மையான மண் மற்றும் நீர் வளத்திற்கு ஏற்ப இருப்பதை உறுதி செய்கிறது.'
    },
    kn: {
      greeting: 'ನಮಸ್ಕಾರ! ನಾನು ಕಿಸಾನ್ ಸಾರಥಿ AI, ನಿಮ್ಮ ಕೃಷಿ ನಿರ್ಧಾರ ಬೆಂಬಲ ಸಹಾಯಕ. ನಿಮ್ಮ ಬೆಳೆ ನಿರ್ವಹಣೆ, ಖರ್ಚುಗಳು, ನೀರಾವರಿ ಅಥವಾ ಸರ್ಕಾರಿ ಯೋಜನೆಗಳ ಕುರಿತು ಏನಾದರೂ ಕೇಳಿ.',
      action: 'ನಿಖರ ಮಾರ್ಗದರ್ಶನಕ್ಕಾಗಿ ಮೇಲೆ ನಿಮ್ಮ ಸಕ್ರಿಯ ಜಮೀನನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
      reason: 'ಸಲಹೆಗಳು ನಿಮ್ಮ ಮಣ್ಣಿನ ಪ್ರಕಾರ ಮತ್ತು ನೀರಿನ ಸಾಮರ್ಥ್ಯಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುತ್ತವೆ.'
    },
    ml: {
      greeting: 'നമസ്കാരം! ഞാൻ കിസാൻസാരഥി AI, നിങ്ങളുടെ കാർഷിക തീരുമാന സഹായി. നിങ്ങളുടെ വിള പ്രവർത്തനങ്ങൾ, ചെലവുകൾ, ജലസേചനം അല്ലെങ്കിൽ സർക്കാർ പദ്ധതികൾ എന്നിവയെക്കുറിച്ച് ചോദിക്കാം.',
      action: 'കൃത്യമായ മാർഗ്ഗനിർദ്ദേശത്തിനായി മുകളിൽ നിങ്ങളുടെ കൃഷിയിടം തിരഞ്ഞെടുക്കുക.',
      reason: 'നിങ്ങളുടെ മണ്ണിന്റെ തരത്തിനും ജലലഭ്യതയ്ക്കും അനുസൃതമായ ഉപദേശം ഉറപ്പാക്കുന്നു.'
    },
    bn: {
      greeting: 'নমস্কার! আমি কিষাণসারথি AI, আপনার কৃষি সিদ্ধান্ত সহায়ক। আপনার ফসলের কাজ, খরচ, সেচ বা সরকারি প্রকল্প সম্পর্কে যেকোনো প্রশ্ন করুন।',
      action: 'সঠিক নির্দেশনার জন্য উপরে আপনার সক্রিয় খামার নির্বাচন করুন।',
      reason: 'পরামর্শ আপনার মাটি ও জলের পরিস্থিতির সাথে সামঞ্জস্যপূর্ণ হওয়া নিশ্চিত করে।'
    },
    gu: {
      greeting: 'નમસ્તે! હું કિસાનસારથી AI છું, તમારો કૃષિ નિર્ણય સહાયક. તમારા પાકની કામગીરી, ખર્ચ, સિંચાઈ અથવા સરકારી યોજનાઓ વિશે મને કંઈપણ પૂછો.',
      action: 'સચોટ માર્ગદર્શન માટે ઉપર તમારા સક્રિય ખેતરની પસંદગી કરો.',
      reason: 'સલાહ તમારી જમીન અને પાણીની સ્થિતિને અનુરૂપ હોવાની ખાતરી કરે છે.'
    },
    pa: {
      greeting: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਕਿਸਾਨਸਾਰਥੀ AI ਹਾਂ, ਤੁਹਾਡਾ ਖੇਤੀਬਾੜੀ ਫੈਸਲਾ ਸਹਾਇਕ। ਆਪਣੀਆਂ ਫਸਲਾਂ ਦੇ ਕੰਮਾਂ, ਖਰਚਿਆਂ, ਸਿੰਚਾਈ ਜਾਂ ਸਰਕਾਰੀ ਸਕੀਮਾਂ ਬਾਰੇ ਕੁਝ ਵੀ ਪੁੱਛੋ।',
      action: 'ਸਹੀ ਮਾਰਗਦਰਸ਼ਨ ਲਈ ਉੱਪਰ ਆਪਣੇ ਖੇਤ ਦੀ ਚੋਣ ਕਰੋ।',
      reason: 'ਇਹ ਸੁਨਿਸ਼ਚਿਤ ਕਰਦਾ ਹੈ ਕਿ ਸਲਾਹ ਤੁਹਾਡੀ ਮਿੱਟੀ ਅਤੇ ਪਾਣੀ ਦੇ ਸਾਧਨਾਂ ਅਨੁਸਾਰ ਹੋਵੇ।'
    },
    or: {
      greeting: 'ନମସ୍କାର! ମୁଁ କିଷାନସାରଥି AI, ଆପଣଙ୍କ କୃଷି ନିଷ୍ପତ୍ତି ସହାୟକ। ଆପଣଙ୍କ ଫସଲ, ଖର୍ଚ୍ଚ, ଜଳସେଚନ ବା ସରକାରୀ ଯୋଜନା ବିଷୟରେ କିଛି ବି ପଚାରନ୍ତୁ।',
      action: 'ସଠିକ ମାର୍ଗଦର୍ଶନ ପାଇଁ ଉପରେ ଆପଣଙ୍କ ଜମି ଚୟନ କରନ୍ତୁ।',
      reason: 'ପରାମର୍ଶ ଆପଣଙ୍କ ମାଟି ଓ ଜଳ ସୁବିଧା ଅନୁଯାୟୀ ହେବା ନିଶ୍ଚିତ କରେ।'
    }
  };

  const initialGreeting = LOCALIZED_GREETINGS[language] || LOCALIZED_GREETINGS.en;

  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      answer: initialGreeting.greeting,
      actions: [
        {
          priority: 'MEDIUM',
          action: initialGreeting.action,
          reason: initialGreeting.reason
        }
      ],
      confidence: 95
    }
  ]);

  // Update initial message when language changes if no interaction yet
  useEffect(() => {
    const localized = LOCALIZED_GREETINGS[language] || LOCALIZED_GREETINGS.en;
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].sender === 'ai') {
        return [
          {
            sender: 'ai',
            answer: localized.greeting,
            actions: [
              {
                priority: 'MEDIUM',
                action: localized.action,
                reason: localized.reason
              }
            ],
            confidence: 95
          }
        ];
      }
      return prev;
    });
  }, [language]);

  const QUICK_PROMPTS_BY_LANG = {
    en: [
      'What should I do today?',
      'How much have I spent so far on this farm?',
      'When should I review irrigation for my current crop?',
      'What happens if heavy rainfall increases this week?',
      'What government subsidies should I check for my land?'
    ],
    te: [
      'నేను ఈరోజు ఏమి చేయాలి?',
      'ఈ పొలంపై ఇప్పటివరకు ఎంత ఖర్చు చేశాను?',
      'నా ప్రస్తుత పంటకు నీటిపారుదల ఎప్పుడు సమీక్షించాలి?',
      'ఈ వారం భారీ వర్షాలు కురిస్తే ఏమి చేయాలి?',
      'నా భూమికి ఏ ప్రభుత్వ సబ్సిడీలు అందుబాటులో ఉన్నాయి?'
    ],
    hi: [
      'मुझे आज क्या करना चाहिए?',
      'इस खेत पर अब तक कितना खर्च हुआ है?',
      'वर्तमान फसल के लिए सिंचाई की समीक्षा कब करें?',
      'इस सप्ताह भारी बारिश होने पर क्या सावधानी बरतें?',
      'मेरी जमीन के लिए कौन सी सरकारी सब्सिडी उपलब्ध हैं?'
    ],
    mr: [
      'मी आज काय करायला हवे?',
      'या शेतावर आतापर्यंत किती खर्च झाला आहे?',
      'सध्याच्या पिकासाठी सिंचनाचा फेरविचार कधी करावा?',
      'या आठवड्यात मुसळधार पाऊस झाल्यास काय करावे?',
      'माझ्या जमिनीसाठी कोणती शासकीय अनुदाने तपासावीत?'
    ],
    ta: [
      'நான் இன்று என்ன செய்ய வேண்டும்?',
      'இந்த பண்ணையில் இதுவரை எவ்வளவு செலவழித்துள்ளேன்?',
      'தற்போதைய பயிருக்கு பாசனத்தை எப்போது ஆய்வு செய்ய வேண்டும்?',
      'இந்த வாரம் கனமழை பெய்தால் என்ன செய்ய வேண்டும்?',
      'எனது நிலத்திற்கு என்ன அரசு மானியங்களை சரிபார்க்க வேண்டும்?'
    ],
    kn: [
      'ನಾನು ಇಂದು ಏನು ಮಾಡಬೇಕು?',
      'ಈ ಜಮೀನಿನಲ್ಲಿ ಇಲ್ಲಿಯವರೆಗೆ ಎಷ್ಟು ಖರ್ಚು ಮಾಡಿದ್ದೇನೆ?',
      'ನನ್ನ ಪ್ರಸ್ತುತ ಬೆಳೆಗೆ ನೀರಾವರಿಯನ್ನು ಯಾವಾಗ ಪರಿಶೀಲಿಸಬೇಕು?',
      'ಈ ವಾರ ಭಾರಿ ಮಳೆಯಾದರೆ ಏನು ಮಾಡಬೇಕು?',
      'ನನ್ನ ಭೂಮಿಗೆ ಯಾವ ಸರ್ಕಾರಿ ಸಬ್ಸಿಡಿಗಳನ್ನು ಪರಿಶೀಲಿಸಬೇಕು?'
    ],
    ml: [
      'ഞാൻ ഇന്ന് എന്താണ് ചെയ്യേണ്ടത്?',
      'ഈ കൃഷിയിടത്തിൽ ഇതുവരെ എത്ര രൂപ ചെലവഴിച്ചു?',
      'നിലവിലെ വിളയ്ക്കുള്ള ജലസേചനം എപ്പോൾ പരിശോധിക്കണം?',
      'ഈ ആഴ്ച കനത്ത മഴ പെയ്താൽ എന്തുചെയ്യണം?',
      'എന്റെ കൃഷിഭൂമിക്ക് ലഭ്യമായ സർക്കാർ സബ്‌സിഡികൾ ഏതെല്ലാമാണ്?'
    ],
    bn: [
      'আজ আমার কী করা উচিত?',
      'এই খামারে এখনও পর্যন্ত কত খরচ হয়েছে?',
      'আমার বর্তমান ফসলের সেচ কখন পর্যালোচনা করা উচিত?',
      'এই সপ্তাহে ভারী বৃষ্টি হলে কী সতর্কতা অবলম্বন করব?',
      'আমার জমির জন্য কোন সরকারি ভর্তুকি পরীক্ষা করা উচিত?'
    ],
    gu: [
      'મારે આજે શું કરવું જોઈએ?',
      'આ ખેતર પર અત્યાર સુધી કેટલો ખર્ચ થયો છે?',
      'મારા વર્તમાન પાક માટે સિંચાઈની સમીક્ષા ક્યારે કરવી?',
      'આ અઠવાડિયે ભારે વરસાદ પડે તો શું કરવું?',
      'મારી જમીન માટે કઈ સરકારી સબસિડી તપાસવી જોઈએ?'
    ],
    pa: [
      'ਮੈਨੂੰ ਅੱਜ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?',
      'ਇਸ ਖੇਤ ਤੇ ਹੁਣ ਤੱਕ ਕਿੰਨਾ ਖਰਚਾ ਹੋਇਆ ਹੈ?',
      'ਮੌਜੂਦਾ ਫਸਲ ਲਈ ਸਿੰਚਾਈ ਦੀ ਸਮੀਖਿਆ ਕਦੋਂ ਕਰਨੀ ਚਾਹੀਦੀ ਹੈ?',
      'ਜੇਕਰ ਇਸ ਹਫ਼ਤੇ ਭਾਰੀ ਮੀਂਹ ਪਵੇ ਤਾਂ ਕੀ ਕਰਨਾ ਚਾਹੀਦਾ ਹੈ?',
      'ਮੇਰੀ ਜ਼ਮੀਨ ਲਈ ਕਿਹੜੀਆਂ ਸਰਕਾਰੀ ਸਬਸਿਡੀਆਂ ਉਪਲਬਧ ਹਨ?'
    ],
    or: [
      'ମୁଁ ଆଜି କ’ଣ କରିବା ଉଚିତ?',
      'ଏହି ଜମିରେ ଏପର୍ଯ୍ୟନ୍ତ କେତେ ଖର୍ଚ୍ଚ ହୋଇଛି?',
      'ମୋର ବର୍ତ୍ତମାନର ଫସଲ ପାଇଁ ଜଳସେଚନ କେବେ ଯାଞ୍ଚ କରିବି?',
      'ଏହି ସପ୍ତାହରେ ପ୍ରବଳ ବର୍ଷା ହେଲେ କ’ଣ ସାବଧାନତା ଅବଲମ୍ବନ କରିବି?',
      'ମୋ ଜମି ପାଇଁ କେଉଁ ସରକାରୀ ସବସିଡି ଉପଲବ୍ଧ ଅଛି?'
    ]
  };

  const quickPrompts = QUICK_PROMPTS_BY_LANG[language] || QUICK_PROMPTS_BY_LANG.en;

  useEffect(() => {
    async function loadFarms() {
      try {
        const farmList = await farmService.getFarms();
        setFarms(farmList);
        if (farmList.length > 0) {
          const savedFarmId = localStorage.getItem('kisansaarthi_active_farm_id');
          const initial = farmList.find((f) => f.id === savedFarmId) || farmList[0];
          setSelectedFarmId(initial.id);
          const cycles = await cropService.getCropCycles(initial.id).catch(() => []);
          setActiveCycle(cycles.find((c) => c.status === 'ACTIVE') || cycles[0]);
        }
      } catch (err) {
        console.error('Failed to load farms for AI assistant:', err);
      } finally {
        setLoading(false);
      }
    }
    loadFarms();
  }, []);

  const handleFarmChange = async (farmId) => {
    setSelectedFarmId(farmId);
    localStorage.setItem('kisansaarthi_active_farm_id', farmId);
    try {
      const cycles = await cropService.getCropCycles(farmId).catch(() => []);
      setActiveCycle(cycles.find((c) => c.status === 'ACTIVE') || cycles[0]);
    } catch {
      setActiveCycle(null);
    }
  };

  const handleSend = async (queryText) => {
    const textToSend = queryText || message;
    if (!textToSend.trim()) return;

    // Append user message
    const userMsg = { sender: 'user', text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setMessage('');
    setSending(true);

    try {
      const res = await aiService.askAssistant({
        farmId: selectedFarmId || null,
        cropCycleId: activeCycle?.id || null,
        message: textToSend,
        language: language,
        preferredLanguage: language
      });

      const responseAnswer = res.answer || res.message || '';
      const responseActions = res.actions || res.suggestedActions || [];

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          answer: responseAnswer,
          actions: responseActions,
          assumptions: res.assumptions || [],
          missingInformation: res.missingInformation || [],
          confidence: res.confidence || 85
        }
      ]);
    } catch (err) {
      console.warn('AI Assistant error:', err);
      const fallbackErr =
        language === 'te'
          ? 'AI సేవ ప్రస్తుతం అందుబాటులో లేదు. దయచేసి కాసేపటి తర్వాత మళ్లీ ప్రయత్నించండి.'
          : language === 'hi'
          ? 'AI सेवा वर्तमान में अनुपलब्ध है। कृपया कुछ समय बाद पुनः प्रयास करें।'
          : language === 'mr'
          ? 'AI सेवा सध्या उपलब्ध नाही. कृपया थोड्या वेळाने पुन्हा प्रयत्न करा.'
          : 'The AI service is temporarily unavailable. Please try again.';

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          answer: fallbackErr,
          actions: [],
          confidence: 0
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <LoadingScreen message="Connecting to KisanSaarthi AI assistant..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-900 shrink-0">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-forest-600 flex items-center justify-center text-white">
              <Bot className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold font-display text-white">AI Farm Assistant</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Grounded in your real farm profile, active crop stage, and recorded expenses
          </p>
        </div>

        <div className="flex items-center gap-3">
          {farms.length > 0 && (
            <select
              value={selectedFarmId}
              onChange={(e) => handleFarmChange(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  🌾 {f.name}
                </option>
              ))}
            </select>
          )}

          <Link to="/ai/history">
            <Button size="sm" variant="outline" icon={History}>
              AI History
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto space-y-4 p-4 rounded-2xl glass-panel border border-slate-800">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.sender === 'user' ? (
              <div className="max-w-lg bg-forest-700 text-white p-3.5 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow-md">
                {m.text}
              </div>
            ) : (
              <div className="max-w-2xl bg-slate-900/90 border border-emerald-500/20 p-4 rounded-2xl rounded-tl-none space-y-3 text-xs shadow-lg">
                <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold font-display">
                    <Bot className="w-4 h-4" />
                    <span>KisanSaarthi AI Advisory</span>
                  </div>
                  {m.confidence > 0 && (
                    <Badge variant="success">Confidence: {m.confidence}%</Badge>
                  )}
                </div>

                <p className="text-slate-200 leading-relaxed">{m.answer}</p>

                {m.actions && m.actions.length > 0 && (
                  <div className="mt-2 space-y-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block">
                      Recommended Practical Actions
                    </span>
                    {m.actions.map((act, aIdx) => (
                      <div
                        key={aIdx}
                        className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2"
                      >
                        <Badge variant={act.priority === 'HIGH' ? 'danger' : act.priority === 'MEDIUM' ? 'warning' : 'neutral'}>
                          {act.priority}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-slate-200 font-semibold">{act.action}</p>
                          <p className="text-slate-400 text-[11px] mt-0.5">{act.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="bg-slate-900 border border-slate-800 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>Analyzing authoritative farm records with Gemini...</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 no-scrollbar">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSend(qp)}
            disabled={sending}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-300 hover:text-emerald-300 hover:border-emerald-500/40 whitespace-nowrap transition-colors shrink-0"
          >
            {qp}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex items-center gap-2 shrink-0"
      >
        <Input
          placeholder="Ask a question about your farm, weather actions, or crop stage..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="flex-1"
          disabled={sending}
        />
        <Button type="submit" size="md" isLoading={sending} icon={Send}>
          Send
        </Button>
      </form>
    </div>
  );
}
