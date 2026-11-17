import { useTranslation } from 'react-i18next';
import { ANDROID_AVAILABLE, STORE_URLS } from '../utils/storeRedirect';
import './StoreBadges.css';

type Props = {
  className?: string;
  /** Badge height in px; both badges share it (Apple and Google ask for equal height).
   *  Omit it to size from CSS (--badge-h on the container class; default 48px). */
  height?: number;
  /** Override the store links, e.g. /get-app passes campaign-tagged URLs. */
  iosHref?: string;
  androidHref?: string;
  /** Open the store in a new tab (desktop overlays). */
  newTab?: boolean;
};

/**
 * The official "Download on the App Store" and "Get it on Google Play" badges
 * (Noah, 17 Nov 2026: "like Cal AI"). The art is the vendors' own files, used
 * unchanged, as both brand guidelines require: Apple's black badge from
 * developer.apple.com and Google's badge from play.google.com/intl/en_us/badges
 * (its transparent margin trimmed so the two sit at the same visual height).
 */
export default function StoreBadges({ className = '', height, iosHref, androidHref, newTab = false }: Props) {
  const { t } = useTranslation();
  const tab = newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {};
  const appStore = t('store.downloadAppStore', { defaultValue: 'Download on the App Store' });
  const googlePlay = t('store.downloadGooglePlay', { defaultValue: 'Get it on Google Play' });
  return (
    <div className={`store-badges ${className}`.trim()} style={height ? { ['--badge-h' as string]: `${height}px` } : undefined}>
      <a href={iosHref ?? STORE_URLS.ios} className="store-badges__badge" aria-label={appStore} {...tab}>
        <img src="/store-badges/app-store-black.svg" alt="" width={120} height={40} />
      </a>
      {ANDROID_AVAILABLE && (
        <a href={androidHref ?? STORE_URLS.android} className="store-badges__badge" aria-label={googlePlay} {...tab}>
          <img src="/store-badges/google-play.png" alt="" width={564} height={168} />
        </a>
      )}
    </div>
  );
}
