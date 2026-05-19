import { useTranslation } from 'react-i18next';

// TODO: replace placeholder with the real App Store URL once the app is live.
export const APP_STORE_URL = 'https://apps.apple.com/app/libo';

export default function AppStoreBadge({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <a href={APP_STORE_URL} className={className} aria-label={t('store.downloadAppStore')}>
      <img src="/store-badges/app-store.svg" alt={t('store.downloadAppStore')} />
    </a>
  );
}
