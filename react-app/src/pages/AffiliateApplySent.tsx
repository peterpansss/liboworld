import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './AffiliateApply.css';

// /affiliate/apply/sent — confirmation page shown after the application
// is submitted (and the user's email client has been opened with the
// pre-filled application body).
export default function AffiliateApplySent() {
  const { t } = useTranslation();
  return (
    <div className="aa-page">
      <SiteNav />
      <section className="aa-hero" style={{ padding: '80px 32px 48px' }}>
        <div className="aa-sent-icon" aria-hidden>✓</div>
        <h1 className="aa-headline font-display">
          {t('affiliateApplySent.headline', { defaultValue: 'Application sent.' })}
        </h1>
        <p className="aa-sub">
          {t('affiliateApplySent.sub', {
            defaultValue:
              "Your email client should have opened with your application pre-filled. If it didn't, just send us your details to affiliates@liboworld.com and we'll be in touch within 5 working days.",
          })}
        </p>
        <div style={{ marginTop: 24 }}>
          <Link to="/" className="aa-submit" style={{ textDecoration: 'none' }}>
            {t('affiliateApplySent.cta', { defaultValue: 'Back home' })}
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
