import StoreBadges from '../components/StoreBadges';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { colors } from '../theme';
import { cleanCampaignSource, detectPlatform, redirectToStore, storeUrlWithSource } from '../utils/storeRedirect';
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
 *   4. UA-detects iOS vs Android vs desktop (desktop lands on the homepage
 *      download block)
 *   5. Redirects to the right store URL. With ?ct=<source> (social bio links,
 *      e.g. /get-app?ct=ig_liboworld) the store URL carries that source, so App
 *      Store Connect and Play Console still show where the install came from.
 *
 * Direct hits (someone typing the URL) get the same treatment plus a
 * fallback UI with both store badges in case the redirect doesn't fire
 * (no-JS, ad-blockers, etc).
 */
export default function GetAppPage() {
  const [params] = useSearchParams();
  const [redirected, setRedirected] = useState(false);
  const ct = cleanCampaignSource(params.get('ct'));

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

    // 2. Google Analytics event. NOTE: gtag is no longer loaded site-wide from
    //    index.html — since 2026-09-18 it is injected by lib/consent.ts only
    //    after an analytics opt-in, so this fires for roughly a quarter of
    //    visitors. The typeof guard below is load-bearing, not defensive.
    if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
      window.gtag('event', 'cash_challenge_app_redirect_qr', {
        tier: tierSlug ?? 'unknown',
      });
    }

    // 3. Redirect — short timeout so the analytics call has a chance to send
    const t = setTimeout(() => {
      setRedirected(true);
      const platform = detectPlatform();
      redirectToStore(platform, ct);
    }, 200);

    return () => clearTimeout(t);
  }, [params, ct]);

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
          src="/brand/logo_options/libo-dark.svg"
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
        <StoreBadges
          height={44}
          className="get-app__badges"
          iosHref={storeUrlWithSource('ios', ct)}
          androidHref={storeUrlWithSource('android', ct)}
        />
      </div>
    </div>
  );
}

