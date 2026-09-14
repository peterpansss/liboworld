/**
 * Coverage for src/i18n/index.ts.
 *
 * The module performs the following side effects on first import:
 *  1. localStorage.getItem('libo-lang') to restore the visitor's saved
 *     language choice (defensive — wrapped in try/catch, falls back to 'en')
 *  2. i18n.init({ resources: en/de/fr/es/pt, lng: <restored>, fallbackLng: 'en', ... })
 *  3. document.documentElement.lang = derived from i18n.language
 *  4. Subscribes to languageChanged so html lang stays in sync
 *
 * Most tests work against the singleton instance directly; the
 * restored-language branches need a fresh module load with a stubbed
 * localStorage, hence vi.resetModules() + vi.stubGlobal('localStorage', ...).
 * (Stubbing the global rather than spying on Storage.prototype keeps this
 * independent of whether the runtime's `localStorage` is jsdom's Storage or
 * Node ≥22's built-in one, which isn't a jsdom Storage instance.)
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('SUPPORTED_LANGUAGES export', () => {
  it('lists exactly five languages with stable codes', async () => {
    const { SUPPORTED_LANGUAGES } = await import('../../src/i18n/index');
    expect(Object.keys(SUPPORTED_LANGUAGES).sort()).toEqual(['de', 'en', 'es', 'fr', 'pt']);
    expect(SUPPORTED_LANGUAGES.en.code).toBe('EN');
    expect(SUPPORTED_LANGUAGES.de.label).toBe('Deutsch');
    expect(SUPPORTED_LANGUAGES.fr.flag).toBe('🇫🇷');
  });
});

describe('i18n initialization', () => {
  it('boots with English as the active language', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    // Switch to en explicitly in case a sibling test left a different language active.
    await i18n.changeLanguage('en');
    expect(i18n.language).toBe('en');
    // A known key exists in en.json
    expect(i18n.t('nav.home')).toBe('Home');
  });

  it('exposes resources for every supported language', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    for (const lng of ['en', 'de', 'fr', 'es', 'pt']) {
      expect(i18n.hasResourceBundle(lng, 'translation')).toBe(true);
    }
  });

  it('switches language and translates with the new locale', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('de');
    expect(i18n.language).toBe('de');
    // The German nav.home key in de.json
    const de = i18n.t('nav.home');
    expect(typeof de).toBe('string');
    expect(de.length).toBeGreaterThan(0);
    await i18n.changeLanguage('en'); // restore
  });

  it('falls back to English for an unsupported language', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('zz'); // not in supportedLngs
    // i18next normalises zz to the fallback before lookup. Either way the
    // translation must come from the en bundle.
    expect(i18n.t('nav.home')).toBe('Home');
    await i18n.changeLanguage('en');
  });

  it('returns the key string for completely missing translation keys', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('en');
    // Default i18next behaviour: missing key resolves to the key string.
    // This documents the current contract — UI relies on it.
    expect(i18n.t('nope.this.key.does.not.exist')).toBe('nope.this.key.does.not.exist');
  });

  it('falls back to en when the active locale lacks a key', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    // Inject an en-only key, then assert that switching to de still serves
    // the English copy (rather than leaking the raw key into the UI).
    // Using a synthetic key keeps this independent of which translations
    // happen to exist in the de bundle today.
    const syntheticKey = '__test_only_en_key__';
    const expected = 'English-only fallback value';
    i18n.addResource('en', 'translation', syntheticKey, expected);
    // Make sure de does NOT have it.
    i18n.removeResourceBundle('de', '__test_only_ns__');
    await i18n.changeLanguage('de');
    expect(i18n.t(syntheticKey)).toBe(expected);
    await i18n.changeLanguage('en');
  });
});

describe('document.documentElement.lang side effect', () => {
  beforeEach(async () => {
    // Make sure the module ran at least once.
    await import('../../src/i18n/index');
  });

  it('updates html.lang when language changes to a supported locale', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('fr');
    expect(document.documentElement.lang).toBe('fr');
    await i18n.changeLanguage('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('coerces unsupported locales to en on the html element', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('xx');
    expect(document.documentElement.lang).toBe('en');
    await i18n.changeLanguage('en');
  });

  it('strips region tags before checking support (e.g. de-CH -> de)', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('de-CH');
    expect(document.documentElement.lang).toBe('de');
    await i18n.changeLanguage('en');
  });

  it('coerces empty language string to en (covers the `lng || "en"` branch)', async () => {
    // Manually fire the languageChanged listener with empty string. i18next
    // will normalise '' to 'dev' or similar internally, so we exercise the
    // applyHtmlLang fallback by emitting directly.
    const { default: i18n } = await import('../../src/i18n/index');
    i18n.emit('languageChanged', '');
    expect(document.documentElement.lang).toBe('en');
    await i18n.changeLanguage('en');
  });
});

describe('saved-language restore on load (defensive try/catch)', () => {
  function stubStorage(getItem: (key: string) => string | null) {
    const spy = vi.fn(getItem);
    vi.stubGlobal('localStorage', { getItem: spy, setItem: vi.fn(), removeItem: vi.fn() });
    return spy;
  }

  afterEach(async () => {
    vi.unstubAllGlobals();
    const { default: i18n } = await import('../../src/i18n/index');
    await i18n.changeLanguage('en');
  });

  it('boots in the saved language when libo-lang holds a supported code', async () => {
    vi.resetModules();
    const getSpy = stubStorage((key) => (key === 'libo-lang' ? 'de' : null));
    const { default: i18n } = await import('../../src/i18n/index');
    expect(getSpy).toHaveBeenCalledWith('libo-lang');
    expect(i18n.language).toBe('de');
  });

  it('ignores an unsupported stored value and boots in English', async () => {
    vi.resetModules();
    const getSpy = stubStorage((key) => (key === 'libo-lang' ? 'zz' : null));
    const { default: i18n } = await import('../../src/i18n/index');
    expect(getSpy).toHaveBeenCalledWith('libo-lang');
    expect(i18n.language).toBe('en');
  });

  it('does not throw when localStorage.getItem throws, and falls back to English', async () => {
    vi.resetModules();
    const getSpy = stubStorage(() => {
      throw new Error('quota / private mode');
    });
    // Importing must not throw — try/catch wraps the call.
    const mod = await import('../../src/i18n/index');
    expect(getSpy).toHaveBeenCalledWith('libo-lang');
    expect(mod.default.language).toBe('en');
  });
});
