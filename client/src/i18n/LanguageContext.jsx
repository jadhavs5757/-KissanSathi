import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

import en from './translations/en.json';
import te from './translations/te.json';
import hi from './translations/hi.json';
import mr from './translations/mr.json';
import ta from './translations/ta.json';
import kn from './translations/kn.json';
import ml from './translations/ml.json';
import bn from './translations/bn.json';
import gu from './translations/gu.json';
import pa from './translations/pa.json';
import od from './translations/od.json';

const translations = { en, te, hi, mr, ta, kn, ml, bn, gu, pa, od, or: od };

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { code: 'or', name: 'Odia', native: 'ଓଡ଼ିଆ' }
];

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const { user, updateProfile } = useAuth();
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('kisansaarthi_lang');
    if (saved === 'od') return 'or';
    return saved || 'en';
  });
  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false);

  // Sync language from authenticated user profile if present
  useEffect(() => {
    if (user?.preferred_language) {
      const normalized = user.preferred_language === 'od' ? 'or' : user.preferred_language;
      if (normalized !== language && (translations[normalized] || translations[user.preferred_language])) {
        setLanguageState(normalized);
        localStorage.setItem('kisansaarthi_lang', normalized);
      }
    }
    // Check if user has never explicitly chosen a language
    const hasChosen = localStorage.getItem('kisansaarthi_lang_chosen');
    if (!hasChosen && user && (!user.preferred_language || user.preferred_language === 'en')) {
      setShowFirstTimeModal(true);
    }
  }, [user]);

  const changeLanguage = useCallback(async (langCode) => {
    const normalized = langCode === 'od' ? 'or' : langCode;
    if (!translations[normalized]) return;
    setLanguageState(normalized);
    localStorage.setItem('kisansaarthi_lang', normalized);
    localStorage.setItem('kisansaarthi_lang_chosen', 'true');
    setShowFirstTimeModal(false);

    if (user && updateProfile) {
      try {
        await updateProfile({ preferred_language: normalized });
      } catch (err) {
        console.warn('Could not persist language to user profile:', err.message);
      }
    }
  }, [user, updateProfile]);

  // Nested key resolver with English fallback
  const t = useCallback((keyPath, params = {}) => {
    if (!keyPath) return '';
    const keys = keyPath.split('.');
    
    // 1. Try active language
    let current = translations[language];
    let found = true;
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        found = false;
        break;
      }
    }

    // 2. Fallback to English if missing
    if (!found || typeof current !== 'string') {
      let fallback = translations.en;
      found = true;
      for (const k of keys) {
        if (fallback && typeof fallback === 'object' && k in fallback) {
          fallback = fallback[k];
        } else {
          found = false;
          break;
        }
      }
      if (found && typeof fallback === 'string') {
        current = fallback;
      } else {
        return keyPath; // Safe fallback to key string, never null/undefined
      }
    }

    // Interpolate {param}
    let result = current;
    for (const [pKey, pVal] of Object.entries(params)) {
      result = result.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
    }
    return result;
  }, [language]);

  const formatCurrency = useCallback((amount) => {
    const num = Number(amount) || 0;
    return `₹${num.toLocaleString('en-IN')}`;
  }, []);

  const formatNumber = useCallback((num) => {
    const n = Number(num) || 0;
    return n.toLocaleString('en-IN');
  }, []);

  const currentLanguageMeta =
    SUPPORTED_LANGUAGES.find((l) => l.code === language || (l.code === 'or' && language === 'od')) ||
    SUPPORTED_LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        currentLanguageMeta,
        changeLanguage,
        t,
        formatCurrency,
        formatNumber,
        showFirstTimeModal,
        setShowFirstTimeModal,
        supportedLanguages: SUPPORTED_LANGUAGES
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}
