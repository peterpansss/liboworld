import { useTranslation } from 'react-i18next';
import { APP_STORE_URL } from './AppStoreBadge';
import './StoreBadges.css';

// TODO: replace with the real Play Store URL once the app is live.
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.liboworld.app';

// Launch is iOS-only (3 Sep 2026). The Play pill stays in the tree but hidden:
// promising Android before the listing exists is a promise we'd break on day
// one. Flip to true the day the Play listing is live — nothing else to change.
// Typed as boolean so the gated branch keeps type-checking while it's off.
const ANDROID_AVAILABLE: boolean = false;

/**
 * The App Store / Google Play pill pair (mobile drawer + desktop footer).
 *
 * Deliberately the canvas's clean text pills, NOT the official badge art —
 * decision Noah 2026-08-07: ship matched pills now, swap in the real
 * Apple/Google badge assets before launch (their brand art must come from
 * the vendors; a hand-drawn imitation is worse than an honest pill).
 * TODO(launch): replace with official badge art for both stores.
 */
export default function StoreBadges({ className = '' }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={`store-badges ${className}`.trim()}>
      <a
        href={APP_STORE_URL}
        className="store-badges__pill"
        aria-label={t('store.downloadAppStore', { defaultValue: 'Download on the App Store' })}
      >
        {t('store.appStoreShort', { defaultValue: 'App Store' })}
      </a>
      {ANDROID_AVAILABLE && (
        <a
          href={PLAY_STORE_URL}
          className="store-badges__pill"
          aria-label={t('store.downloadGooglePlay', { defaultValue: 'Get it on Google Play' })}
        >
          <span aria-hidden="true">▶ </span>
          {t('store.googlePlayShort', { defaultValue: 'Google Play' })}
        </a>
      )}
    </div>
  );
}
