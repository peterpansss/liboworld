import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import de from './locales/de.json';

export const SUPPORTED_LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧', code: 'EN' },
  de: { label: 'Deutsch', flag: '🇩🇪', code: 'DE' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

const STORAGE_KEY = 'libo-lang';

try {
  localStorage.removeItem(STORAGE_KEY);
} catch {}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
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
