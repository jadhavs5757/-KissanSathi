import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, SUPPORTED_LANGUAGES } from './LanguageContext';
import { Globe, ChevronDown, Check } from 'lucide-react';

export default function LanguageSelector({ variant = 'default', className = '' }) {
  const { language, changeLanguage, currentLanguageMeta } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'compact') {
    return (
      <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900/80 border border-emerald-900/50 hover:border-emerald-500/50 text-xs font-medium text-emerald-300 transition-all hover:bg-slate-800"
          title="Change Language"
          aria-label="Change Language"
        >
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span>{currentLanguageMeta.native}</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-1 w-44 rounded-xl bg-slate-950 border border-emerald-900/80 shadow-2xl py-1 z-50 backdrop-blur-xl max-h-72 overflow-y-auto">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  changeLanguage(lang.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium transition-colors ${
                  language === lang.code
                    ? 'bg-emerald-950/70 text-emerald-300 font-semibold'
                    : 'text-slate-300 hover:bg-white/5 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px] uppercase w-5 font-mono">{lang.code}</span>
                  <span>{lang.native}</span>
                </div>
                {language === lang.code && <Check className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-900/90 border border-emerald-900/60 hover:border-emerald-500/60 text-xs font-semibold text-emerald-200 shadow-sm transition-all hover:bg-slate-800"
      >
        <Globe className="w-4 h-4 text-emerald-400 shrink-0" />
        <span className="truncate">{currentLanguageMeta.native}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 sm:right-0 sm:left-auto mt-2 w-52 rounded-2xl bg-slate-950/95 border border-emerald-800/60 shadow-2xl py-1.5 z-50 backdrop-blur-xl max-h-80 overflow-y-auto ring-1 ring-emerald-500/20">
          <div className="px-3 py-1.5 border-b border-slate-900 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Select Language / भाषा चुनें
          </div>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                changeLanguage(lang.code);
                setIsOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3.5 py-2 text-xs transition-colors ${
                language === lang.code
                  ? 'bg-emerald-950/80 text-emerald-300 font-bold border-l-2 border-emerald-400'
                  : 'text-slate-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span className="text-[11px] font-semibold">{lang.native}</span>
                <span className="text-[10px] text-slate-400">({lang.name})</span>
              </div>
              {language === lang.code && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
