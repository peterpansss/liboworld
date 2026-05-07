import { useEffect } from 'react';
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

  const badge: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 16px',
    background: '#000',
    color: '#fff',
    borderRadius: 10,
    textDecoration: 'none',
    fontSize: 12,
    letterSpacing: 0.3,
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

  const badgeSmall: React.CSSProperties = {
    display: 'block',
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.7,
  };

  const badgeStrong: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
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
            aria-label="Download on the App Store"
          >
            <img src="/store-badges/app-store.svg" alt="Download on the App Store" style={badgeImg} />
          </a>
          <a
            href={STORE_URLS.android}
            target="_blank"
            rel="noopener noreferrer"
            style={badge}
            aria-label="Get it on Google Play"
          >
            <svg width="18" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.997.997 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.18l2.602 2.601-12.16 7.022 9.558-9.623zm5.398-3.105l-3.085 1.78-2.762-2.769 2.762-2.769 3.085 1.78c1.36.785 1.36 2.193 0 2.978zM5.05 1.622l11.443 6.605-2.762 2.768L5.05 1.622z" />
            </svg>
            <span>
              <small style={badgeSmall}>{copy.googlePlaySmall}</small>
              <strong style={badgeStrong}>Google Play</strong>
            </span>
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
