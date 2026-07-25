import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LiboLogo from './LiboLogo';
import { isStripeConfigured } from '../lib/stripe';
import { isPrelaunch } from '../config/launchMode';
import './SiteNav.css';

const ANNOUNCE_DISMISS_KEY = 'ea_announce_dismissed';

// Relaunch nav — five plain links, no dropdowns. Order + targets are fixed by
// the site-relaunch designs. "Library" points at the exercise library.
const NAV_LINKS = [
  { labelKey: 'nav.moneyChallenges', defaultLabel: 'Money Challenges', to: '/money-challenges' },
  { labelKey: 'nav.library', defaultLabel: 'Library', to: '/exercises' },
  { labelKey: 'nav.pricing', defaultLabel: 'Pricing', to: '/pricing' },
  { labelKey: 'nav.founder', defaultLabel: 'Founder', to: '/founder' },
  { labelKey: 'nav.press', defaultLabel: 'Press', to: '/press' },
] as const;

// The primary CTA converts at the HERO email capture (#hero-capture on the
// home route), never the footer form. Cross-route it navigates home first;
// ScrollToTop in App.tsx honors the hash and smooth-scrolls to the anchor.
const HERO_CAPTURE_TARGET = '/#hero-capture';

export default function SiteNav() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  // Top savings bar — advertises the founding deal loudly + early without a
  // cold paid wall at the top of the page. Dismissible for the session.
  const [announceDismissed, setAnnounceDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(ANNOUNCE_DISMISS_KEY) === '1',
  );
  const showAnnounce = isPrelaunch() && isStripeConfigured() && !announceDismissed;
  const dismissAnnounce = () => {
    setAnnounceDismissed(true);
    try { sessionStorage.setItem(ANNOUNCE_DISMISS_KEY, '1'); } catch { /* ignore */ }
  };
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
  const isSubpage = location.pathname !== '/';

  // "Join the club" → hero capture. If we're already on the home route, the
  // Link's hash won't always re-fire the router effect, so scroll manually.
  const joinClubLabel = t('nav.joinClub', { defaultValue: 'Join the club →' });
  const handleJoinClub = (e: React.MouseEvent) => {
    if (location.pathname === '/') {
      const el = document.getElementById('hero-capture');
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
    setDrawerOpen(false);
  };

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [drawerOpen]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  useEffect(() => {
    if (drawerOpen) closeRef.current?.focus();
  }, [drawerOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll(); // sync on mount in case page is already scrolled
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">{t('nav.skipToMain')}</a>
      {showAnnounce && (
        <div className="site-announce">
          <button
            type="button"
            className="site-announce__msg"
            onClick={() => navigate('/#early-access')}
          >
            <span className="site-announce__spark" aria-hidden="true">⚡</span>
            <span className="site-announce__text">{t('earlyAccess.announceText')}</span>
            <span className="site-announce__arrow" aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="site-announce__dismiss"
            aria-label={t('earlyAccess.announceDismiss')}
            onClick={dismissAnnounce}
          >
            ×
          </button>
        </div>
      )}
      <nav
        className={`site-nav${scrolled ? ' site-nav--scrolled' : ''}${isSubpage ? ' site-nav--subpage' : ''}${showAnnounce ? ' site-nav--with-announce' : ''}`}
        aria-label={t('nav.mainNavigation')}
      >
        <div className="site-nav__inner">
          {/* Logo */}
          <Link to="/" className="site-nav__logo" aria-label="Libo home">
            <LiboLogo />
          </Link>

          {/* Center links */}
          <ul className="site-nav__links">
            {NAV_LINKS.map(({ labelKey, defaultLabel, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`site-nav__link${isActive(to) ? ' site-nav__link--active' : ''}`}
                  aria-current={isActive(to) ? 'page' : undefined}
                >
                  {t(labelKey, { defaultValue: defaultLabel })}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right section */}
          <div className="site-nav__right">
            <Link
              to={HERO_CAPTURE_TARGET}
              className="site-nav__cta"
              onClick={handleJoinClub}
            >
              {joinClubLabel}
            </Link>
            <button
              className="site-nav__hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label={t('nav.openMenu')}
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
            >
              <span /><span /><span />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="site-nav__overlay" role="presentation" onClick={() => setDrawerOpen(false)} />
      )}
      <div
        id="mobile-drawer"
        role="dialog"
        aria-modal={drawerOpen}
        aria-hidden={!drawerOpen}
        aria-label={t('nav.navigationMenu')}
        className={`site-nav__drawer${drawerOpen ? ' site-nav__drawer--open' : ''}`}
      >
        <div className="site-nav__drawer-header">
          <Link to="/" className="site-nav__logo" aria-label="Libo home" onClick={() => setDrawerOpen(false)}>
            <LiboLogo />
          </Link>
          <button
            ref={closeRef}
            className="site-nav__drawer-close"
            onClick={() => setDrawerOpen(false)}
            aria-label={t('nav.closeMenu')}
          >
            &#10005;
          </button>
        </div>
        <div className="site-nav__drawer-links">
          {NAV_LINKS.map(({ labelKey, defaultLabel, to }) => (
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>
              {t(labelKey, { defaultValue: defaultLabel })}
            </Link>
          ))}
        </div>
        <div className="site-nav__drawer-bottom">
          <Link
            to={HERO_CAPTURE_TARGET}
            className="site-nav__drawer-cta"
            onClick={handleJoinClub}
          >
            {joinClubLabel}
          </Link>
        </div>
      </div>

      <div className={`site-nav-spacer${showAnnounce ? ' site-nav-spacer--with-announce' : ''}`} />
    </>
  );
}
