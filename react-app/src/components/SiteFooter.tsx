import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import './SiteFooter.css';

export default function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer" aria-label={t('footer.siteFooterLabel')}>
      <div className="site-footer__inner">
        {/* Top section: logo + social */}
        <div className="site-footer__top">
          <Link to="/" className="site-footer__logo">
            <img
              src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
              alt="Libo"
            />
          </Link>
          <div className="site-footer__social">
            <a href="https://www.instagram.com/liboworld/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@libo.world" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.17V12a4.84 4.84 0 01-5.58-2.17V2h3.45a4.83 4.83 0 002.13 4.69z"/></svg>
            </a>
            <a href="https://x.com/liboworld" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
        </div>

        {/* Columns */}
        <nav aria-label={t('footer.footerNavigation')} className="site-footer__columns">
          {/* Product */}
          <div className="site-footer__col">
            <h2 className="site-footer__col-title">{t('footer.productTitle')}</h2>
            <div className="site-footer__col-links">
              <Link to="/pricing">{t('footer.pricing')}</Link>
              <Link to="/#features">{t('footer.features')}</Link>
              <Link to="/#rewards">{t('footer.rewardsLink')}</Link>
              <Link to="/giveaway">{t('footer.giveaways')}</Link>
              <Link to="/cash-challenge">{t('footer.cashChallenges')}</Link>
            </div>
          </div>

          {/* Company */}
          <div className="site-footer__col">
            <h2 className="site-footer__col-title">{t('footer.companyTitle')}</h2>
            <div className="site-footer__col-links">
              <Link to="/careers">{t('footer.careers', { defaultValue: 'Careers' })}</Link>
              <a href="mailto:hello@liboworld.com">{t('footer.contactUs')}</a>
            </div>
          </div>

          {/* Resources */}
          <div className="site-footer__col">
            <h2 className="site-footer__col-title">{t('footer.resourcesTitle')}</h2>
            <div className="site-footer__col-links">
              <Link to="/blog">{t('footer.blogLink')}</Link>
              <Link to="/exercises">{t('footer.exerciseLibrary')}</Link>
              <Link to="/workouts">{t('footer.workoutsLink')}</Link>
            </div>
          </div>

          {/* Workouts */}
          <div className="site-footer__col">
            <h2 className="site-footer__col-title">{t('footer.workoutsTitle')}</h2>
            <div className="site-footer__col-links">
              <Link to="/workouts?cat=Gym">{t('footer.gymWorkouts')}</Link>
              <Link to="/workouts?cat=Home">{t('footer.homeWorkouts')}</Link>
              <Link to="/workouts?cat=Stretching">{t('footer.stretching')}</Link>
              <Link to="/workouts?cat=Cardio">{t('footer.cardio')}</Link>
            </div>
          </div>
        </nav>

        {/* Bottom bar */}
        <div className="site-footer__bottom">
          <span className="site-footer__copy">
            &copy; {new Date().getFullYear()} Libo World. {t('footer.allRightsReserved')}
          </span>
          <div className="site-footer__bottom-right">
            <div className="site-footer__legal">
              <Link to="/terms">{t('footer.termsAndConditions')}</Link>
              <Link to="/privacy">{t('footer.privacy')}</Link>
            </div>
            <LanguageSwitcher variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
