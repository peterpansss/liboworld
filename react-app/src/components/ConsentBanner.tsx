import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getConsent, setConsent, onConsentChange } from '../lib/consent';
import './ConsentBanner.css';

/**
 * Cookie consent banner (Meta-Pixel-Setup doc, Step 0).
 *
 * Accept and Reject are EQUALLY weighted buttons — a de-emphasised reject is
 * the specific pattern regulators fine. Nothing analytics/marketing loads
 * before Accept (see lib/consent.ts); Reject persists and keeps the page
 * script-free. The footer's "Cookie settings" link re-opens this banner.
 */
export default function ConsentBanner() {
  const { t } = useTranslation();
  const [choice, setChoice] = useState(getConsent());

  useEffect(() => onConsentChange(setChoice), []);

  if (choice !== null) return null;

  return (
    <div
      className="consent"
      role="dialog"
      aria-live="polite"
      aria-label={t('consent.aria', { defaultValue: 'Cookie consent' })}
    >
      <div className="consent__inner">
        <p className="consent__text">
          {t('consent.text', {
            defaultValue:
              'We use cookies for analytics and marketing — only if you agree. You can change your choice any time via "Cookie settings" in the footer.',
          })}{' '}
          <Link to="/privacy" className="consent__link">
            {t('consent.privacyLink', { defaultValue: 'Privacy Policy' })}
          </Link>
        </p>
        <div className="consent__actions">
          <button type="button" className="consent__btn" onClick={() => setConsent('denied')}>
            {t('consent.reject', { defaultValue: 'Reject' })}
          </button>
          <button
            type="button"
            className="consent__btn consent__btn--accept"
            onClick={() => setConsent('granted')}
          >
            {t('consent.accept', { defaultValue: 'Accept' })}
          </button>
        </div>
      </div>
    </div>
  );
}
