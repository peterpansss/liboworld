import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { colors } from '../theme';
import { detectPlatform, redirectToStore, STORE_URLS } from '../utils/storeRedirect';
import { logFunnelClick, type FunnelTierSlug } from '../lib/funnelSignups';

declare global {
  interface Window { gtag?: (...args: unknown[]) => void }
}

/**
 * /get-app — smart redirect endpoint targeted by the desktop QR code
 * on /cash-challenge. When a phone scans the QR, this page:
 *   1. Reads ?tier= query param (for analytics)
 *   2. Logs an anonymous click to funnel_signups
 *   3. Fires a Google Analytics event
 *   4. UA-detects iOS vs Android vs desktop
 *   5. Redirects to the right store URL
 *
 * Direct hits (someone typing the URL) get the same treatment plus a
 * fallback UI with both store badges in case the redirect doesn't fire
 * (no-JS, ad-blockers, etc).
 */
export default function GetAppPage() {
  const [params] = useSearchParams();
  const [redirected, setRedirected] = useState(false);

  useEffect(() => {
    const rawTier = params.get('tier');
    const tierSlug = (rawTier ?? null) as FunnelTierSlug | null;

    // 1. Anonymous click log (fire-and-forget — fine if it loses the race)
    if (tierSlug) {
      void logFunnelClick({
        funnel: 'cash_challenge',
        tierSlug,
      });
    }

    // 2. Google Analytics event (the gtag tag is loaded site-wide in index.html)
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'cash_challenge_app_redirect_qr', {
        tier: tierSlug ?? 'unknown',
      });
    }

    // 3. Redirect — short timeout so the analytics call has a chance to send
    const t = setTimeout(() => {
      setRedirected(true);
      const platform = detectPlatform();
      redirectToStore(platform);
    }, 200);

    return () => clearTimeout(t);
  }, [params]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: colors.bg,
        color: colors.text,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 380 }}>
        <img
          src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
          alt="Libo"
          style={{ height: 32, marginBottom: 28, opacity: 0.95 }}
        />
        <h1
          className="font-display"
          style={{
            fontSize: 28,
            letterSpacing: '-0.5px',
            margin: '0 0 12px',
            textTransform: 'uppercase',
            fontWeight: 900,
          }}
        >
          {redirected ? 'Redirecting…' : 'Opening the app store'}
        </h1>
        <p style={{ color: colors.muted, fontSize: 14, lineHeight: 1.6, margin: '0 0 28px' }}>
          If nothing happens in a moment, tap one of the buttons below.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
          <a
            href={STORE_URLS.ios}
            style={badgeStyle}
            aria-label="Download on the App Store"
          >
            <svg width="18" height="22" viewBox="0 0 20 24" fill="none" aria-hidden="true">
              <path d="M16.47 12.2c-.03-3.1 2.53-4.59 2.64-4.66-1.44-2.1-3.68-2.39-4.47-2.42-1.9-.19-3.72 1.12-4.69 1.12-.97 0-2.46-1.1-4.05-1.07-2.08.03-4 1.21-5.08 3.08-2.17 3.76-.55 9.33 1.56 12.38 1.03 1.5 2.27 3.17 3.89 3.11 1.56-.06 2.15-1.01 4.03-1.01 1.88 0 2.42 1.01 4.07.98 1.68-.03 2.74-1.52 3.76-3.03 1.19-1.74 1.68-3.42 1.71-3.51-.04-.02-3.28-1.26-3.31-4.97h-.06z" fill="currentColor" />
              <path d="M13.4 3.27C14.24 2.24 14.82.87 14.67-.5c-1.17.05-2.6.78-3.44 1.77-.75.87-1.42 2.27-1.24 3.61 1.31.1 2.65-.67 3.41-1.61z" fill="currentColor" />
            </svg>
            <span>
              <small style={smallStyle}>Download on the</small>
              <strong style={strongStyle}>App Store</strong>
            </span>
          </a>
          <a
            href={STORE_URLS.android}
            style={badgeStyle}
            aria-label="Get it on Google Play"
          >
            <svg width="18" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.997.997 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.18l2.602 2.601-12.16 7.022 9.558-9.623zm5.398-3.105l-3.085 1.78-2.762-2.769 2.762-2.769 3.085 1.78c1.36.785 1.36 2.193 0 2.978zM5.05 1.622l11.443 6.605-2.762 2.768L5.05 1.622z" />
            </svg>
            <span>
              <small style={smallStyle}>Get it on</small>
              <strong style={strongStyle}>Google Play</strong>
            </span>
          </a>
        </div>
      </div>
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  padding: '12px 18px',
  background: '#000',
  color: '#fff',
  borderRadius: 10,
  textDecoration: 'none',
  fontSize: 12,
};
const smallStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 9,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  opacity: 0.7,
};
const strongStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 14,
  fontWeight: 700,
};
