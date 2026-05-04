/**
 * Coverage for src/i18n/index.ts.
 *
 * The module performs the following side effects on first import:
 *  1. localStorage.removeItem('libo-lang') (defensive — wrapped in try/catch)
 *  2. i18n.init({ resources: en/de/fr/es/pt, lng: 'en', fallbackLng: 'en', ... })
 *  3. document.documentElement.lang = derived from i18n.language
 *  4. Subscribes to languageChanged so html lang stays in sync
 *
 * Most tests work against the singleton instance directly; the
 * "localStorage throws" branch needs a fresh module load with a thrown
 * setter, hence vi.resetModules() + vi.spyOn(Storage.prototype, ...).
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

  it('falls back to en when the active locale lacks a key (giveawayFunnel.headline1)', async () => {
    const { default: i18n } = await import('../../src/i18n/index');
    // de.json is missing giveawayFunnel.headline1 but en.json has it.
    // With fallbackLng: 'en' the t() call should serve the English copy
    // rather than leaking the raw key into the UI.
    await i18n.changeLanguage('de');
    const enValue = i18n.getResource('en', 'translation', 'giveawayFunnel.headline1');
    if (typeof enValue === 'string') {
      expect(i18n.t('giveawayFunnel.headline1')).toBe(enValue);
    }
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

describe('localStorage clear-on-load (defensive try/catch)', () => {
  it('does not throw when localStorage.removeItem is missing / throws', async () => {
    // Re-load the module with localStorage.removeItem throwing.
    vi.resetModules();
    const removeSpy = vi
      .spyOn(Storage.prototype, 'removeItem')
      .mockImplementation(() => {
        throw new Error('quota / private mode');
      });
    // Importing must not throw — try/catch wraps the call.
    await expect(import('../../src/i18n/index')).resolves.toBeTruthy();
    expect(removeSpy).toHaveBeenCalledWith('libo-lang');
    removeSpy.mockRestore();
  });
});
