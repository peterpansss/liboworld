import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { colors } from '../../theme';
import { STORE_URLS } from '../../utils/storeRedirect';

/**
 * Desktop fallback overlay for the /cash-challenge "Reserve my slot" flow.
 *
 * Mobile visitors get UA-routed straight to the App Store / Play Store.
 * Desktop visitors see this overlay instead — a QR code (so they can scan
 * with their phone) plus App Store + Play Store badges as fallback.
 *
 * The QR points at /get-app on liboworld.com — that page client-side
 * UA-detects and redirects, so a Pixel scanning the QR lands on Play Store
 * and an iPhone lands on App Store. No per-platform QR variants needed.
 */

type Props = {
  open: boolean;
  /** Tier slug attached to the QR query string for analytics */
  tierSlug: string | null;
  copy: {
    title: string;
    subtitle: string;
    qrAlt: string;
    appStoreSmall: string;
    googlePlaySmall: string;
    closeLabel: string;
  };
  onClose: () => void;
};

const SITE_URL = 'https://liboworld.com';

function qrSrc(target: string): string {
  // Public, no-auth QR generator. ~5kb image, no library install needed.
  // If we ever want to self-host: swap for the `qrcode` npm package.
  const encoded = encodeURIComponent(target);
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=8&data=${encoded}`;
}

export default function StoreRedirectOverlay({ open, tierSlug, copy, onClose }: Props) {
  const { t } = useTranslation();

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const qrTarget = `${SITE_URL}/get-app${tierSlug ? `?tier=${encodeURIComponent(tierSlug)}` : ''}`;

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backdropFilter: 'blur(8px)',
    animation: 'libo-overlay-fade 0.22s ease-out',
  };

  const modal: React.CSSProperties = {
    width: '100%',
    maxWidth: 380,
    background: colors.bg2,
    border: '1px solid ' + colors.border,
    borderRadius: 18,
    padding: '32px 28px',
    position: 'relative',
    textAlign: 'center',
    animation: 'libo-overlay-slide 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  };

  const closeBtn: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  };

  const qrFrame: React.CSSProperties = {
    width: 224,
    height: 224,
    margin: '20px auto 24px',
    padding: 12,
    background: '#fff',
    borderRadius: 14,
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
  };

  const badgeRow: React.CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
    marginTop: 4,
  };

  const badgeImgLink: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    textDecoration: 'none',
  };

  const badgeImg: React.CSSProperties = {
    height: 44,
    width: 'auto',
    display: 'block',
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="store-overlay-title" onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        <button type="button" onClick={onClose} aria-label={copy.closeLabel} style={closeBtn}>×</button>

        <h2
          id="store-overlay-title"
          className="font-display"
          style={{ fontSize: 22, margin: '0 0 6px', letterSpacing: '-0.3px', color: colors.text }}
        >
          {copy.title}
        </h2>
        <p style={{ fontSize: 13, color: colors.muted, lineHeight: 1.5, margin: 0 }}>
          {copy.subtitle}
        </p>

        <div style={qrFrame}>
          <img
            src={qrSrc(qrTarget)}
            alt={copy.qrAlt}
            width={200}
            height={200}
            style={{ display: 'block', width: '100%', height: '100%' }}
          />
        </div>

        <div style={badgeRow}>
          <a
            href={STORE_URLS.ios}
            target="_blank"
            rel="noopener noreferrer"
            style={badgeImgLink}
            aria-label={t('store.downloadAppStore')}
          >
            <img src="/store-badges/app-store.svg" alt={t('store.downloadAppStore')} style={badgeImg} />
          </a>
        </div>
      </div>

      <style>{`
        @keyframes libo-overlay-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes libo-overlay-slide {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
