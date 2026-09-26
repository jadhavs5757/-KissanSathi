import React from 'react';
import { useTranslation, SUPPORTED_LANGUAGES } from './LanguageContext';
import { Globe, Check, ArrowRight } from 'lucide-react';
import Button from '../components/ui/Button';

export default function FirstTimeLanguageModal() {
  const { language, changeLanguage, showFirstTimeModal, setShowFirstTimeModal, t } = useTranslation();

  if (!showFirstTimeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="max-w-md w-full rounded-3xl bg-slate-950 border border-emerald-500/30 p-6 sm:p-8 shadow-2xl space-y-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 mx-auto flex items-center justify-center shadow-lg shadow-forest-900/40 border border-forest-400/40">
          <Globe className="w-7 h-7 text-white" />
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            {t('common.chooseLanguage') || 'Choose Your Language'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 leading-relaxed">
            {t('common.chooseLanguageSub') ||
              'Select your preferred native language for tailored agricultural advisory, crop lifecycle alerts, and intelligence.'}
          </p>
        </div>

        {/* 11 Native language grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
          {SUPPORTED_LANGUAGES.map((lang) => {
            const isSelected = language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => changeLanguage(lang.code)}
                className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                  isSelected
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300 ring-2 ring-emerald-500/30 shadow-md'
                    : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/80'
                }`}
              >
                <span className="text-sm font-bold block">{lang.native}</span>
                <span className="text-[10px] text-slate-400 block">{lang.name}</span>
              </button>
            );
          })}
        </div>

        <Button
          onClick={() => {
            localStorage.setItem('kisansaarthi_lang_chosen', 'true');
            setShowFirstTimeModal(false);
          }}
          className="w-full justify-center"
          icon={ArrowRight}
        >
          {t('common.continue') || 'Continue to Dashboard'}
        </Button>
      </div>
    </div>
  );
}
