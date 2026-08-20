import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LiboLogo from './LiboLogo';
import LanguageSwitcher from './LanguageSwitcher';
import StoreBadges from './StoreBadges';
import { isStripeConfigured } from '../lib/stripe';
import { isPrelaunch, isFoundingOpen } from '../config/launchMode';
import { prefetchRoute } from '../lib/routePrefetch';
import './SiteNav.css';

const ANNOUNCE_DISMISS_KEY = 'ea_announce_dismissed';

// Relaunch nav — five plain links, no dropdowns. MASTER-HANDOFF §21 specifies
// Cash Challenges · Membership · Press · Careers; the designs render Library in
// Membership's slot. We carry both rather than drop either (decision, 2026-08-05).
const NAV_LINKS = [
  { labelKey: 'nav.cashChallenges', defaultLabel: 'Cash Challenges', to: '/cash-challenges' },
  { labelKey: 'nav.library', defaultLabel: 'Library', to: '/exercises' },
  { labelKey: 'nav.membership', defaultLabel: 'Membership', to: '/membership' },
  { labelKey: 'nav.press', defaultLabel: 'Press', to: '/press' },
  { labelKey: 'nav.careers', defaultLabel: 'Careers', to: '/careers' },
] as const;

// "Join the waitlist" points at the homepage hero's free email field. The rule
// it obeys is unchanged — a free-labelled ask must never land on a paywall
// (ONBOARDING-FLOW-TICKET) — but the hero IS the capture now, so the free label
// lands on a free field instead of merely avoiding the paid funnel. The paid
// 50%-off ask lives only on /membership and /join, which this never links to.
const WAITLIST_TARGET = '/#hero-capture';

export default function SiteNav() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  // Top bar — one strip, two variants. Dismissible for the session.
  const [announceDismissed, setAnnounceDismissed] = useState(
    () => typeof window !== 'undefined' && sessionStorage.getItem(ANNOUNCE_DISMISS_KEY) === '1',
  );
  // Careers and Press aren't sales surfaces — the bar competes with their
  // content, so it's suppressed there (HANDOFF-V2-COMPLEMENT §C).
  const NO_ANNOUNCE_ROUTES = ['/careers', '/press'];
  const announceAllowedHere = !NO_ANNOUNCE_ROUTES.some((p) => location.pathname.startsWith(p));
  // The paid 50%-off ask is confined to the page that sells it: shouting a
  // discount from the Library or the blog reads as a sale, not as news. Every
  // other page gets the free waitlist bar, which is gated on prelaunch ALONE —
  // an email capture has nothing to do with whether Stripe is wired up.
  const onMembership = location.pathname.startsWith('/membership');
  const showOffer = isPrelaunch() && isStripeConfigured() && isFoundingOpen() && onMembership;
  // Fallback, not "everywhere except /membership": once the founding offer
  // closes on LAUNCH_DATE, /membership would otherwise be the one page with no
  // bar at all. The waitlist bar takes over there too.
  const showWaitlist = isPrelaunch() && !showOffer;
  const showAnnounce = (showOffer || showWaitlist) && !announceDismissed && announceAllowedHere;
  const dismissAnnounce = () => {
    setAnnounceDismissed(true);
    try { sessionStorage.setItem(ANNOUNCE_DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const closeRef = useRef<HTMLButtonElement>(null);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
  const isSubpage = location.pathname !== '/';

  const waitlistLabel = t('nav.joinWaitlist', { defaultValue: 'Join the waitlist' });
  const handleWaitlistClick = () => setDrawerOpen(false);

  // The ⚡ and → are markup (site-announce__spark / __arrow), so the copy must
  // not repeat them — except the short variant, which carries its own trailing
  // → because CSS hides the standalone arrow at ≤430px.
  const announceFull = showWaitlist
    ? t('relaunchHome.waitlistBar.full', { defaultValue: 'Cash challenges open 3 September — join the waitlist' })
    : t('earlyAccess.announceText', { defaultValue: 'Founding Members: 50% off — until we launch on 3 September' });
  const announceShort = showWaitlist
    ? t('relaunchHome.waitlistBar.short', { defaultValue: 'Cash challenges open 3 Sept →' })
    : t('earlyAccess.announceTextShort', { defaultValue: 'Founding Members: 50% off until 3 Sept →' });

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
        <div className={`site-announce${showWaitlist ? ' site-announce--waitlist' : ''}`}>
          <button
            type="button"
            className="site-announce__msg"
            onClick={() => navigate(showWaitlist ? WAITLIST_TARGET : '/membership')}
          >
            <span className="site-announce__spark" aria-hidden="true">⚡</span>
            <span className="site-announce__text">
              {/* Copy variant, not CSS truncation: full sentence on wider
                  viewports, a terse version at ≤430px so nothing clips. */}
              <span className="site-announce__text--full">{announceFull}</span>
              <span className="site-announce__text--short">{announceShort}</span>
            </span>
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
          <Link to="/" className="site-nav__logo" aria-label="Libo home" viewTransition>
            {/* Desktop shows the full lockup; the mobile nav bar uses the
                compact mark (dots + "LIBO") — toggled via CSS at ≤768px. */}
            <LiboLogo className="site-nav__logo-full" />
            <LiboLogo compact className="site-nav__logo-compact" />
          </Link>

          {/* Center links */}
          <ul className="site-nav__links">
            {NAV_LINKS.map(({ labelKey, defaultLabel, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`site-nav__link${isActive(to) ? ' site-nav__link--active' : ''}`}
                  aria-current={isActive(to) ? 'page' : undefined}
                  viewTransition
                  onMouseEnter={() => prefetchRoute(to)}
                  onFocus={() => prefetchRoute(to)}
                >
                  {t(labelKey, { defaultValue: defaultLabel })}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right section */}
          <div className="site-nav__right">
            <Link
              to={WAITLIST_TARGET}
              className="site-nav__cta"
              onClick={handleWaitlistClick}
            >
              {waitlistLabel}
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
          <Link to="/" className="site-nav__logo" aria-label="Libo home" viewTransition onClick={() => setDrawerOpen(false)}>
            <LiboLogo compact />
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
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} viewTransition onMouseEnter={() => prefetchRoute(to)} onFocus={() => prefetchRoute(to)} onClick={() => setDrawerOpen(false)}>
              {t(labelKey, { defaultValue: defaultLabel })}
            </Link>
          ))}
        </div>
        {/* Pinned to the drawer's bottom: store badges, the one lime CTA,
            then the language switcher (HEADER-FOOTER-TICKET §2). */}
        <div className="site-nav__drawer-bottom">
          <StoreBadges className="site-nav__drawer-badges" />
          <Link
            to={WAITLIST_TARGET}
            className="site-nav__drawer-cta"
            onClick={handleWaitlistClick}
          >
            {waitlistLabel}
          </Link>
          <div className="site-nav__drawer-lang">
            <LanguageSwitcher variant="drawer" />
          </div>
        </div>
      </div>

      <div className={`site-nav-spacer${showAnnounce ? ' site-nav-spacer--with-announce' : ''}`} />
    </>
  );
}
