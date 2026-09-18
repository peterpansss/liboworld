import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import LiboLogo from './LiboLogo';
import StoreBadges from './StoreBadges';
import { resetConsent } from '../lib/consent';
import { isPrelaunch, FUNNEL_PAGES_ENABLED } from '../config/launchMode';
import './SiteFooter.css';

export default function SiteFooter() {
  const { t } = useTranslation();
  return (
    <footer className="site-footer" aria-label={t('footer.siteFooterLabel')}>
      <div className="site-footer__inner">
        {/* Top section: logo + social */}
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <Link to="/" className="site-footer__logo" aria-label="Libo home">
              <LiboLogo compact />
            </Link>
            <p className="site-footer__tagline">
              {t('footer.tagline', {
                defaultValue: 'The training club that pays you to finish 30 days.',
              })}
            </p>
            <StoreBadges className="site-footer__badges" />
          </div>
        <div className="site-footer__right">
          <div className="site-footer__social">
            <a href="https://www.instagram.com/liboworld/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
            </a>
            <a href="https://www.tiktok.com/@libo.world" target="_blank" rel="noopener noreferrer" aria-label="TikTok">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 00-.79-.05A6.34 6.34 0 003.15 15.2a6.34 6.34 0 0010.86 4.48V13.2a8.16 8.16 0 005.58 2.17V12a4.84 4.84 0 01-5.58-2.17V2h3.45a4.83 4.83 0 002.13 4.69z"/></svg>
            </a>
            <a href="https://x.com/libo_world" target="_blank" rel="noopener noreferrer" aria-label="X / Twitter">
              <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
          </div>
          {/* The one place people can actually talk to the team. It gets a band
              of its own rather than a 20px icon in the social row — that row is
              "we post here", this is "come in". */}
          <a
            className="site-footer__discord"
            href="https://discord.gg/RwNfa5n7Y2"
            target="_blank"
            rel="noopener noreferrer"
          >
            <svg className="site-footer__discord-mark" aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.369a19.79 19.79 0 00-4.885-1.515.074.074 0 00-.79.037c-.211.375-.445.865-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.32.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.009c.12.099.246.198.373.292a.077.077 0 01-.006.127c-.598.349-1.22.645-1.873.891a.077.077 0 00-.41.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            <span className="site-footer__discord-text">
              <strong>{t('footer.discordTitle', { defaultValue: 'Talk to the team on Discord' })}</strong>
              <span>
                {t('footer.discordSub', {
                  defaultValue: 'Ask anything, follow the build, train alongside everyone else doing the 30 days.',
                })}
              </span>
            </span>
            <span className="site-footer__discord-cta" aria-hidden="true">
              {t('footer.discordCta', { defaultValue: 'Join' })}
            </span>
          </a>
        </div>
        </div>

        {/* Columns */}
        <nav aria-label={t('footer.footerNavigation')} className="site-footer__columns">
          {/* Product */}
          <div className="site-footer__col">
            <h2 className="site-footer__col-title">{t('footer.productTitle')}</h2>
            <div className="site-footer__col-links">
              <Link to="/cash-challenges">{t('footer.cashChallengesLink', { defaultValue: 'Cash Challenges' })}</Link>
              <Link to="/membership">{t('footer.pricing', { defaultValue: 'Pricing' })}</Link>
              {!isPrelaunch() && (<Link to="/#rewards">{t('footer.rewardsLink')}</Link>)}
              {FUNNEL_PAGES_ENABLED && (<Link to="/giveaway">{t('footer.giveaways')}</Link>)}
              <Link to="/creator-program">{t('footer.creatorProgram', { defaultValue: 'Creator Program' })}</Link>
            </div>
          </div>

          {/* Company */}
          <div className="site-footer__col">
            <h2 className="site-footer__col-title">{t('footer.companyTitle')}</h2>
            <div className="site-footer__col-links">
              {/* "About" (not "Founder") — the founder story is footer-only now;
                  it is deliberately not in the header and not on the homepage. */}
              <Link to="/about">{t('footer.about', { defaultValue: 'About' })}</Link>
              <Link to="/press">{t('footer.press', { defaultValue: 'Press' })}</Link>
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

        </nav>

        {/* Popular — the SEO hub links folded to one inline row (desktop only;
            HEADER-FOOTER-TICKET §3). Same /best-workouts/* hrefs, SEO intact. */}
        <div className="site-footer__popular">
          <span className="site-footer__popular-label">
            {t('footer.popularLabel', { defaultValue: 'Popular:' })}
          </span>
          <Link to="/best-workouts/upper-body">{t('footer.bestUpperBody', { defaultValue: 'Upper Body' })}</Link>
          <Link to="/best-workouts/lower-body">{t('footer.bestLowerBody', { defaultValue: 'Lower Body' })}</Link>
          <Link to="/best-workouts/bodyweight">{t('footer.bestBodyweight', { defaultValue: 'Bodyweight' })}</Link>
          <Link to="/best-workouts/dumbbell">{t('footer.bestDumbbell', { defaultValue: 'Dumbbell' })}</Link>
          <Link to="/best-workouts/30-minute">{t('footer.best30Minute', { defaultValue: '30-Minute' })}</Link>
          <Link to="/best-workouts/home">{t('footer.bestHome', { defaultValue: 'Home Workouts' })}</Link>
        </div>

        {/* Bottom bar */}
        <div className="site-footer__bottom">
          <span className="site-footer__copy">
            {t('footer.copyrightTrainingClub', { defaultValue: '© 2026 Libo World · Training Club' })}
          </span>
          <div className="site-footer__bottom-right">
            <div className="site-footer__legal">
              <Link to="/terms">{t('footer.termsAndConditions')}</Link>
              {/* The cash-challenge rules are incorporated into the Terms by
                  reference, so they belong beside them. Before this they were
                  reachable only from the funnel CTA and from deep inside
                  /terms — nowhere a person looking for "the rules" would go. */}
              <Link to="/rules">{t('footer.rules', { defaultValue: 'Cash Challenge Rules' })}</Link>
              <Link to="/privacy">{t('footer.privacy')}</Link>
              {/* Google Play requires a public, app-independent deletion link;
                  the footer puts it one click from every page. */}
              <Link to="/delete-account">{t('footer.deleteAccount', { defaultValue: 'Delete account' })}</Link>
              {/* Re-opens the consent banner — the choice must stay revocable. */}
              <button type="button" className="site-footer__consent" onClick={resetConsent}>
                {t('footer.cookieSettings', { defaultValue: 'Cookie settings' })}
              </button>
            </div>
            <LanguageSwitcher variant="footer" />
          </div>
        </div>
      </div>
    </footer>
  );
}
