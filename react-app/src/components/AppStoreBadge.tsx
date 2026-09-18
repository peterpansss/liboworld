import { useTranslation } from 'react-i18next';

// TODO: replace placeholder with the real App Store URL once the app is live.
// The real listing. `apps.apple.com/app/libo` was a guess made before the app
// existed and 404s — it was live on every download button the day the app
// shipped (18 Sep 2026).
export const APP_STORE_URL =
  'https://apps.apple.com/app/libo-world-training-club/id6773703113';

export default function AppStoreBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <a href={APP_STORE_URL} className={className} aria-label={t('store.downloadAppStore')}>
      <img src="/store-badges/app-store.svg" alt={t('store.downloadAppStore')} />
    </a>
  );
}
