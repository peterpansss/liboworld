import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// These five bundles are inlined into the main chunk — everything here ships
// to every visitor on first paint.
//
// Unreleased (Phase-2) copy must NOT live in them. `giveawayFunnel.*` and
// `cashChallengeFunnel.*` were moved out to `./phase2/{lng}.json` and are
// dynamic-imported on demand by `./loadPhase2.ts`, because both routes
// redirect away while `isPrelaunch()` yet their strings were still readable
// in the production bundle. Keep new Phase-2 namespaces there, not here.
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

// Restore the visitor's saved language choice (set by LanguageSwitcher).
// Falls back to 'en' when nothing valid is stored or storage is unavailable.
const readStoredLanguage = (): LanguageCode => {
  try {
    const stored = localStorage.getItem('libo-lang');
    if (stored && stored in SUPPORTED_LANGUAGES) return stored as LanguageCode;
  } catch { /* SSR / private mode */ }
  return 'en';
};

const initialLanguage = readStoredLanguage();

// Surface missing translations during development so future drift is obvious.
// In production we stay silent and rely on fallbackLng: 'en'.
const isDev = (() => {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
})();

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
    lng: initialLanguage,
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'es', 'pt'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    saveMissing: isDev,
    missingKeyHandler: (lngs, _ns, key) => {
      if (!isDev) return;
      console.warn('i18n missing key:', lngs.join(','), key);
    },
  });

const applyHtmlLang = (lng: string) => {
  const base = (lng || 'en').split('-')[0];
  const code = (base in SUPPORTED_LANGUAGES ? base : 'en') as LanguageCode;
  document.documentElement.lang = code;
};

applyHtmlLang(i18n.language);
i18n.on('languageChanged', applyHtmlLang);

export default i18n;
