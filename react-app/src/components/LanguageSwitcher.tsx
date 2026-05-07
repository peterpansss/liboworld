import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../i18n';
import './LanguageSwitcher.css';

type Props = { variant?: 'nav' | 'drawer' | 'footer' };

export default function LanguageSwitcher({ variant = 'nav' }: Props) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = ((i18n.resolvedLanguage || i18n.language || 'en').split('-')[0]) as LanguageCode;
  const currentMeta = SUPPORTED_LANGUAGES[current] ?? SUPPORTED_LANGUAGES.en;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (code: LanguageCode) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div className={`lang-switch lang-switch--${variant}`} ref={rootRef}>
      <button
        type="button"
        className="lang-switch__btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('nav.changeLanguage')}
      >
        <span className="lang-switch__flag" aria-hidden="true">{currentMeta.flag}</span>
        <span className="lang-switch__code">{currentMeta.code}</span>
        <span className="lang-switch__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <ul className="lang-switch__menu" role="listbox">
          {(Object.keys(SUPPORTED_LANGUAGES) as LanguageCode[]).map((code) => {
            const meta = SUPPORTED_LANGUAGES[code];
            const active = code === current;
            return (
              <li key={code}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  className={`lang-switch__option${active ? ' lang-switch__option--active' : ''}`}
                  onClick={() => pick(code)}
                >
                  <span className="lang-switch__flag" aria-hidden="true">{meta.flag}</span>
                  <span>{meta.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
