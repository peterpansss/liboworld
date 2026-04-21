/**
 * Libo Landing Site — i18n System
 * Loads translations from /i18n/{lang}.json and applies them to
 * elements with data-i18n attributes.
 */
(function () {
  const LANGS = {
    en: { flag: '\u{1F1EC}\u{1F1E7}', label: 'English' },
    es: { flag: '\u{1F1EA}\u{1F1F8}', label: 'Espa\u00f1ol' },
    pt: { flag: '\u{1F1E7}\u{1F1F7}', label: 'Portugu\u00eas' },
    de: { flag: '\u{1F1E9}\u{1F1EA}', label: 'Deutsch' },
    fr: { flag: '\u{1F1EB}\u{1F1F7}', label: 'Fran\u00e7ais' },
  };

  const cache = {};
  let currentLang = localStorage.getItem('libo-lang') || detectLanguage();

  function detectLanguage() {
    const nav = (navigator.language || '').slice(0, 2).toLowerCase();
    return nav in LANGS ? nav : 'en';
  }

  /** Resolve a dot-path key like "hero.headline1" from a nested object */
  function resolve(obj, path) {
    return path.split('.').reduce((o, k) => (o && o[k] != null ? o[k] : null), obj);
  }

  /** Fetch and cache a language file */
  async function loadLang(lang) {
    if (cache[lang]) return cache[lang];
    try {
      const base = document.querySelector('script[src*="i18n.js"]')?.src.replace('i18n.js', '') || 'i18n/';
      const res = await fetch(base + lang + '.json');
      if (!res.ok) throw new Error(res.status);
      cache[lang] = await res.json();
      return cache[lang];
    } catch (e) {
      console.warn('[i18n] Failed to load', lang, e);
      return null;
    }
  }

  /** Apply translations to all data-i18n elements */
  function applyTranslations(translations) {
    if (!translations) return;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = resolve(translations, key);
      if (val != null) el.textContent = val;
    });

    // Handle placeholder attributes
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = resolve(translations, key);
      if (val != null) el.setAttribute('placeholder', val);
    });

    // Handle aria-label
    document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
      const key = el.getAttribute('data-i18n-aria');
      const val = resolve(translations, key);
      if (val != null) el.setAttribute('aria-label', val);
    });
  }

  /** Update the language button display */
  function updateLangButton(lang) {
    const info = LANGS[lang] || LANGS.en;
    const flag = document.getElementById('langFlag');
    const code = document.getElementById('langCode');
    if (flag) flag.textContent = info.flag;
    if (code) code.textContent = lang.toUpperCase();

    // Update active state in dropdown
    document.querySelectorAll('.lang-option').forEach((opt) => {
      opt.classList.toggle('active', opt.getAttribute('data-lang') === lang);
    });
  }

  /** Switch language */
  async function switchLanguage(lang) {
    if (!(lang in LANGS)) return;
    currentLang = lang;
    localStorage.setItem('libo-lang', lang);
    const translations = await loadLang(lang);
    applyTranslations(translations);
    updateLangButton(lang);
    document.documentElement.lang = lang;

    // Close dropdown
    const dd = document.getElementById('langDropdown');
    if (dd) dd.classList.remove('open');
  }

  /** Initialize */
  async function init() {
    // Set up dropdown toggle
    const btn = document.getElementById('langBtn');
    const dd = document.getElementById('langDropdown');

    if (btn && dd) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        dd.classList.toggle('open');
      });

      document.addEventListener('click', () => dd.classList.remove('open'));

      dd.querySelectorAll('.lang-option').forEach((opt) => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          const lang = opt.getAttribute('data-lang');
          switchLanguage(lang);
        });
      });
    }

    // Load initial language
    if (currentLang !== 'en') {
      const translations = await loadLang(currentLang);
      applyTranslations(translations);
    }
    updateLangButton(currentLang);
    document.documentElement.lang = currentLang;
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for programmatic use
  window.liboI18n = { switchLanguage, currentLang: () => currentLang };
})();
