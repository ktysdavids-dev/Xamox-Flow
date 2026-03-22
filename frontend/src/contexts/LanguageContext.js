import React, { createContext, useContext, useState, useCallback } from 'react';
import translations from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('xamox_lang') || null);
  const [isLanguageLocked, setIsLanguageLocked] = useState(() => {
    const savedLock = localStorage.getItem('xamox_lang_locked');
    // Strict behavior: only explicit lock means "already chosen".
    return savedLock === 'true';
  });

  const changeLang = useCallback((newLang) => {
    // Language is immutable after initial selection.
    if (isLanguageLocked) return;
    if (!newLang || !translations[newLang]) return;
    setLang(newLang);
    localStorage.setItem('xamox_lang', newLang);
  }, [isLanguageLocked]);

  const setInitialLanguage = useCallback((newLang) => {
    if (!newLang || !translations[newLang]) return;
    setLang(newLang);
    setIsLanguageLocked(true);
    localStorage.setItem('xamox_lang', newLang);
    localStorage.setItem('xamox_lang_locked', 'true');
  }, []);

  const t = useCallback((key) => {
    const effectiveLang = lang || 'es';
    const keys = key.split('.');
    let val = translations[effectiveLang];
    for (const k of keys) {
      if (val && typeof val === 'object') val = val[k];
      else return key;
    }
    return val || translations['en']?.[key] || key;
  }, [lang]);

  const tContent = useCallback((obj) => {
    if (!obj) return '';
    if (typeof obj === 'string') return obj;
    const effectiveLang = lang || 'es';
    return obj[effectiveLang] || obj['en'] || obj['es'] || Object.values(obj)[0] || '';
  }, [lang]);

  const needsLanguageSelection = !isLanguageLocked || !lang;

  return (
    <LanguageContext.Provider
      value={{
        lang: lang || 'es',
        changeLang,
        setInitialLanguage,
        isLanguageLocked,
        needsLanguageSelection,
        t,
        tContent,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
