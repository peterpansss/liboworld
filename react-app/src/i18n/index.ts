import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

export const SUPPORTED_LANGUAGES = {
  en: { label: 'English', flag: '🇬🇧', code: 'EN' },
  de: { label: 'Deutsch', flag: '🇩🇪', code: 'DE' },
  fr: { label: 'Français', flag: '🇫🇷', code: 'FR' },
  es: { label: 'Español', flag: '🇪🇸', code: 'ES' },
  pt: { label: 'Português', flag: '🇧🇷', code: 'PT' },
} as const;

export type LanguageCode = keyof typeof SUPPORTED_LANGUAGES;

try { localStorage.removeItem('libo-lang'); } catch { /* SSR / private mode */ }

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      de: { translation: de },
      fr: { translation: fr },
      es: { translation: es },
      pt: { translation: pt },
    },
    lng: 'en',
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'es', 'pt'],
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
