import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import en from './locales/en.json';
import de from './locales/de.json';

export const SUPPORTED_LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧', code: 'EN' },
  de: { label: 'Deutsch', flag: '🇩🇪', code: 'DE' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

const STORAGE_KEY = 'libo-lang';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: STORAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

const applyHtmlLang = (lng: string) => {
  const base = (lng || 'en').split('-')[0];
  const code = (base in SUPPORTED_LANGUAGES ? base : 'en') as LanguageCode;
  document.documentElement.lang = code;
};

applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
