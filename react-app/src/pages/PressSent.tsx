import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import './Press.css';

// /press/sent — confirmation page shown after the press inquiry is
// submitted (either successfully via the edge function, or after the
// mailto fallback opens the user's email client).
export default function PressSent() {
  const { t } = useTranslation();
  return (
    <div className="press-page">
      <SiteNav />
      <section className="press-hero" style={{ padding: '80px 32px 48px' }}>
        <div className="press-sent-icon" aria-hidden>✓</div>
        <h1 className="press-headline font-display">
          {t('pressSent.headline', { defaultValue: 'Inquiry sent.' })}
        </h1>
        <p className="press-sub">
          {t('pressSent.sub', {
            defaultValue:
              "Thanks — we'll get back to you within 5 working days. For urgent inquiries, email press@liboworld.com directly.",
          })}
        </p>
        <div style={{ marginTop: 24, maxWidth: 280, margin: '24px auto 0' }}>
          <Link to="/" className="press-submit" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 180 }}>
            {t('pressSent.cta', { defaultValue: 'Back home' })}
          </Link>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}
