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
        {/* Apple's own mark, drawn as a path — the word "App Store" alone read
            as an unlabelled outline button rather than a download. */}
        <svg className="store-badges__glyph" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.564 12.75c-.03-2.81 2.29-4.16 2.394-4.226-1.303-1.906-3.331-2.168-4.053-2.196-1.727-.175-3.37 1.016-4.246 1.016-.876 0-2.226-.99-3.66-.963-1.883.028-3.62 1.095-4.588 2.78-1.956 3.39-.5 8.41 1.404 11.16.932 1.346 2.043 2.858 3.5 2.804 1.404-.056 1.935-.907 3.632-.907 1.698 0 2.177.907 3.66.878 1.511-.027 2.468-1.372 3.393-2.723 1.07-1.562 1.51-3.075 1.536-3.153-.033-.014-2.947-1.131-2.977-4.47zM14.79 4.38c.774-.94 1.297-2.247 1.154-3.55-1.116.045-2.468.743-3.268 1.681-.717.832-1.345 2.162-1.176 3.44 1.245.096 2.516-.632 3.29-1.571z"/></svg>
        <span className="store-badges__label">
          <span className="store-badges__eyebrow">{t('store.downloadOn', { defaultValue: 'Download on the' })}</span>
          <span className="store-badges__name">{t('store.appStoreShort', { defaultValue: 'App Store' })}</span>
        </span>
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
