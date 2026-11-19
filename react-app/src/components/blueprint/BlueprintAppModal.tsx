import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import StoreBadges from '../StoreBadges';
import { storeUrlWithSource } from '../../utils/storeRedirect';
import './BlueprintAppModal.css';

// "Get your free Blueprint inside the app" (Noah, 19 Nov 2026). The website
// no longer hands out the PDF: /blueprint's download buttons and the
// site-wide "before you go" popup both open this, and the app's Home card
// hands it out. Store links carry ct=blueprint so the installs show up as
// their own source in App Store Connect and Play Console.

type Props = {
  open: boolean;
  onClose: () => void;
  /** 'exit' = the site-wide before-you-go popup; 'page' = /blueprint buttons. */
  variant?: 'page' | 'exit';
};

const CT = 'blueprint';

export default function BlueprintAppModal({ open, onClose, variant = 'page' }: Props) {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="bpm-scrim" onClick={onClose} role="presentation">
      <div
        className="bpm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bpm-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button ref={closeRef} type="button" className="bpm-close" onClick={onClose} aria-label={t('blueprintApp.close')}>
          <span aria-hidden="true">×</span>
        </button>
        <img
          className="bpm-cover"
          src="/downloads/blueprint/card-v6.jpg"
          alt=""
          width={900}
          height={1273}
        />
        <div className="bpm-body">
          <p className="bpm-eyebrow">
            {variant === 'exit' ? t('blueprintApp.eyebrowExit') : t('blueprintApp.eyebrow')}
          </p>
          <h2 id="bpm-title" className="bpm-title">
            {/* Hyphenated words stay on one line ("12-Month", not "12-" / "Month").
                A U+2011 hyphen would do it, but Barlow has no glyph for it. */}
            {t('blueprintApp.title').split(/(\S+-\S+)/).map((part, i) =>
              i % 2 ? <span key={i} className="bpm-nowrap">{part}</span> : part,
            )}
          </h2>
          <p className="bpm-text">{t('blueprintApp.body')}</p>
          <div className="bpm-get">
            <figure className="bpm-qr">
              <img src="/qr/get-app-blueprint.svg?v=1" alt={t('blueprintApp.qrAlt')} width={132} height={132} />
              <figcaption>{t('blueprintApp.qrCaption')}</figcaption>
            </figure>
            <StoreBadges
              className="bpm-badges"
              iosHref={storeUrlWithSource('ios', CT)}
              androidHref={storeUrlWithSource('android', CT)}
              newTab
            />
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
