import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTranslation, SUPPORTED_LANGUAGES } from '../i18n/LanguageContext';
import Card, { CardHeader } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { User, Mail, Phone, MapPin, Globe, CheckCircle2 } from 'lucide-react';

const LANGUAGE_PREVIEWS = {
  en: 'Welcome to KisanSaarthi AI - Know What to Grow. Know What to Do Next.',
  te: 'కిసాన్ సారథి AI కి స్వాగతం - ఏమి పండించాలో తెలుసుకోండి. తర్వాత ఏమి చేయాలో తెలుసుకోండి.',
  hi: 'किसानसारथी एआई में आपका स्वागत है - जानें क्या उगाएं। जानें आगे क्या करें।',
  mr: 'किसानसारथी एआय मध्ये आपले स्वागत आहे - काय पिकवायचे ते जाणून घ्या.',
  ta: 'கிசான்சாரதி AI க்கு வரவேற்கிறோம் - எதை பயிரிட வேண்டும் என்பதை அறியுங்கள்.',
  kn: 'ಕಿಸಾನ್‌ಸಾರಥಿ AI ಗೆ ಸುಸ್ವಾಗತ - ಏನು ಬೆಳೆಯಬೇಕು ಎಂದು ತಿಳಿಯಿರಿ.',
  ml: 'കിസാൻസാരഥി AI-ലേക്ക് സ്വാഗതം - എന്ത് കൃഷി ചെയ്യണമെന്ന് അറിയുക.',
  bn: 'কিষাণসারথি এআই-তে স্বাগতম - জানুন কী ফলাবেন।',
  gu: 'કિસાનસારથી AI માં આપનું સ્વાગત છે - જાણો શું ઉગાડવું.',
  pa: 'ਕਿਸਾਨਸਾਰਥੀ AI ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ - ਜਾਣੋ ਕੀ ਉਗਾਉਣਾ ਹੈ।',
  od: 'କିଷାନସାରଥି AI କୁ ସ୍ୱାଗତ - ଜାଣନ୍ତୁ କ\'ଣ ଚାଷ କରିବେ।'
};

export default function Profile() {
  const { user, updateProfile } = useAuth();
  const { language, changeLanguage, currentLanguageMeta, t } = useTranslation();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    location: user?.location || ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);
    try {
      await updateProfile(formData);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Could not update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (code) => {
    changeLanguage(code);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      <div className="pb-2 border-b border-slate-900">
        <h1 className="text-2xl font-bold font-display text-white">{t('nav.profile')}</h1>
        <p className="text-xs text-slate-400 mt-1">Manage your account information and language preferences</p>
      </div>

      {/* Language Settings Card */}
      <Card className="p-6">
        <CardHeader
          title="Language Settings / भाषा सेटिंग"
          subtitle="Choose your preferred language for the interface, AI advice, and crop tasks"
        />

        <div className="mt-4 space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-emerald-900/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-forest-600/30 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Current Language</p>
                <p className="text-xs text-emerald-400 font-bold">{currentLanguageMeta.native} ({currentLanguageMeta.name})</p>
              </div>
            </div>
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-500/30 uppercase">
              {language}
            </span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Language (Saves Automatically)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => {
                const isSelected = language === lang.code;
                return (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => handleLanguageChange(lang.code)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-950/90 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30 font-bold'
                        : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs block">{lang.native}</span>
                    <span className="text-[10px] text-slate-400 block">{lang.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Live Translation Preview */}
          <div className="mt-3 p-3.5 rounded-xl bg-forest-950/30 border border-emerald-500/20">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block mb-1">
              Language Preview
            </span>
            <p className="text-xs text-slate-200 leading-relaxed italic">
              "{LANGUAGE_PREVIEWS[language] || LANGUAGE_PREVIEWS.en}"
            </p>
          </div>
        </div>
      </Card>

      {/* Account Info Form */}
      <Card className="p-8">
        <CardHeader
          title="Account Details"
          subtitle="Your farmer profile and contact info"
        />

        {success && (
          <div className="my-4 p-3 rounded-xl bg-forest-950/80 border border-forest-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Profile information updated successfully.</span>
          </div>
        )}

        {error && (
          <div className="my-4 p-3 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Input
            label="Full Name"
            name="name"
            icon={User}
            value={formData.name}
            onChange={handleChange}
            required
          />

          <Input
            label="Email Address (Login ID)"
            name="email"
            icon={Mail}
            value={user?.email || ''}
            disabled
            helper="Email address cannot be changed."
          />

          <Input
            label="Mobile Number"
            name="phone"
            icon={Phone}
            value={formData.phone}
            onChange={handleChange}
            placeholder="9876543210"
          />

          <Input
            label="Location (District, State)"
            name="location"
            icon={MapPin}
            value={formData.location}
            onChange={handleChange}
            placeholder="e.g. Nashik, Maharashtra"
          />

          <div className="pt-4 flex justify-end">
            <Button type="submit" isLoading={loading} size="md">
              {t('common.save')} Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
