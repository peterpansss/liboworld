import React, { useState, useEffect, useRef } from 'react';
import { ScrollProgress } from './motion/Motion';
import { detectPlatform, storeUrlFor } from '../utils/storeRedirect';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LiboLogo from './LiboLogo';
import LanguageSwitcher from './LanguageSwitcher';
import StoreBadges from './StoreBadges';
import { isStripeConfigured } from '../lib/stripe';
import { isPrelaunch, isFoundingOpen } from '../config/launchMode';
import { prefetchRoute } from '../lib/routePrefetch';
import { featuredRound, roundStatus } from '../data/giveawayRounds';
import './SiteNav.css';

const ANNOUNCE_DISMISS_KEY = 'ea_announce_dismissed';

// Nav, 18 Nov 2026 (LMCT+ structure study, Noah): Earn ▾ · Features ·
// Exercises · Membership. Earn groups the train-and-earn pages. Press and
// Careers moved to the footer only. History: Membership left the header on
// 27 Aug for the founding offer; it is back now that founding has closed, and
// the founding item still removes itself after FOUNDING_CLOSE_DATE.
// 19 Nov 2026 (Noah): cash challenges and the giveaway are their own items in
// the bar, not hidden in the Earn menu. Earn keeps "How it works" + Rewards.
const TOP_EARN_LINKS = [
  { id: 'challenges', to: '/cash-challenges' },
  { id: 'giveaway', to: '/giveaway' },
] as const;
type MenuLink = { id: string; descKey: string; to: string; img: string; photo?: boolean };
const EARN_LINKS: readonly MenuLink[] = [
  { id: 'howItWorks', descKey: 'earnPages.next.earn.text', to: '/earn', img: '/props/libo-coin-360.webp?v=2' },
  { id: 'rewards', descKey: 'earnPages.next.rewards.text', to: '/rewards', img: '/props/reward-cards-fan-360.webp?v=2' },
];
// 24 Nov 2026 (Noah): Features is a menu too, so the Blueprint and the
// Creator Program have a home in the bar, not only in the footer.
const FEATURE_LINKS: readonly MenuLink[] = [
  { id: 'allFeatures', descKey: 'earnPages.navDesc.features', to: '/features', img: '/props/dumbbell-hex-lime-360.webp?v=2' },
  { id: 'blueprint', descKey: 'earnPages.navDesc.blueprint', to: '/blueprint', img: '/downloads/blueprint/after-2024-05-v1.jpg', photo: true },
  { id: 'creatorProgram', descKey: 'earnPages.navDesc.creator', to: '/creator-program', img: '/props/tripod-phone-360.webp?v=2' },
];
type MenuId = 'earn' | 'features';
const MENUS: { id: MenuId; labelKey: string; defaultLabel: string; links: readonly MenuLink[] }[] = [
  { id: 'earn', labelKey: 'earnPages.nav.earn', defaultLabel: 'Earn', links: EARN_LINKS },
  { id: 'features', labelKey: 'earnPages.nav.features', defaultLabel: 'Features', links: FEATURE_LINKS },
];

const NAV_LINKS = [
  // Exercises: footer only since 18 Nov 2026 (Noah). The bar is for the
  // offer (earn, features, membership), the library is an SEO page.
  { labelKey: 'earnPages.nav.membership', defaultLabel: 'Membership', to: '/membership' },
  { labelKey: 'nav.foundingMember', defaultLabel: 'Founding Member', to: '/join' },
] as const;

// Filtered at RENDER time, never at module load — the founding item has to
// remove itself when the clock passes FOUNDING_CLOSE_DATE, without a deploy, exactly
// as the countdown and the /membership founding card already do.
const visibleNavLinks = () =>
  NAV_LINKS.filter((l) => l.to !== '/join' || isFoundingOpen());

// "Join the waitlist" points at the homepage hero's free email field. The rule
// it obeys is unchanged — a free-labelled ask must never land on a paywall
// (ONBOARDING-FLOW-TICKET) — but the hero IS the capture now, so the free label
// lands on a free field instead of merely avoiding the paid funnel. The paid
// 50%-off ask lives only on /membership and /join, which this never links to.

export default function SiteNav() {
  const { t, i18n } = useTranslation();
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
  // closes on FOUNDING_CLOSE_DATE, /membership would otherwise be the one page with no
  // bar at all. The waitlist bar takes over there too.
  // NOT gated on isPrelaunch(): this bar is the most prominent App Store CTA
  // on the site, and tying it to the launch flag meant flipping that flag
  // would have deleted it from every page at the exact moment it mattered.
  // It shows whenever the founding offer is not taking the slot.
  const showDownloadBar = !showOffer;
  // Giveaway news takes the bar (Noah, 18 Nov 2026): the round that is open,
  // else the next one, straight from data/giveawayRounds.ts, so a new round
  // (an iPhone one, say) shows up here the day it is added. Once the last
  // round has closed and none is scheduled, the download line comes back.
  const round = featuredRound();
  const roundState = round ? roundStatus(round) : 'closed';
  const giveaway = showDownloadBar && round && roundState !== 'closed' ? round : null;
  const showAnnounce = (showOffer || showDownloadBar) && !announceDismissed && announceAllowedHere;
  const dismissAnnounce = () => {
    setAnnounceDismissed(true);
    try { sessionStorage.setItem(ANNOUNCE_DISMISS_KEY, '1'); } catch { /* ignore */ }
  };

  const closeRef = useRef<HTMLButtonElement>(null);
  const [openMenu, setOpenMenu] = useState<MenuId | null>(null);
  const menuRefs = useRef<Partial<Record<MenuId, HTMLLIElement | null>>>({});
  // Hover opens a menu on desktop; the click that usually follows the hover
  // must not then toggle it shut. Touch and keyboard toggle normally.
  const hoverOpened = useRef(false);

  // Close the open menu on route change, outside click and Escape.
  useEffect(() => { setOpenMenu(null); }, [location.pathname]);
  useEffect(() => {
    if (!openMenu) return;
    const el = () => menuRefs.current[openMenu];
    const onDown = (e: MouseEvent) => {
      const node = el();
      if (node && !node.contains(e.target as Node)) setOpenMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenu(null);
        (el()?.querySelector('button') as HTMLButtonElement | null)?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [openMenu]);

  function renderMenu(menu: (typeof MENUS)[number]) {
    const open = openMenu === menu.id;
    const active = menu.links.some((l) => location.pathname.startsWith(l.to));
    return (
      <li
        key={menu.id}
        ref={(node) => { menuRefs.current[menu.id] = node; }}
        className={`site-nav__dropdown${open ? ' site-nav__dropdown--open' : ''}`}
        onMouseEnter={() => {
          if (!open) hoverOpened.current = true;
          setOpenMenu(menu.id);
          menu.links.forEach((l) => prefetchRoute(l.to));
        }}
        onMouseLeave={() => { hoverOpened.current = false; setOpenMenu(null); }}
      >
        <button
          type="button"
          className={`site-nav__link site-nav__dropdown-trigger${active ? ' site-nav__link--active' : ''}`}
          aria-expanded={open}
          aria-controls={`nav-${menu.id}-menu`}
          onClick={() => {
            if (hoverOpened.current) { hoverOpened.current = false; setOpenMenu(menu.id); return; }
            setOpenMenu(open ? null : menu.id);
          }}
        >
          {t(menu.labelKey, { defaultValue: menu.defaultLabel })}
          <span className="site-nav__dropdown-caret" aria-hidden="true">▾</span>
        </button>
        <ul id={`nav-${menu.id}-menu`} className="site-nav__dropdown-menu site-nav__dropdown-menu--mega">
          {menu.links.map((l) => (
            <li key={l.to}>
              <Link
                to={l.to}
                className={`site-nav__dropdown-item site-nav__dropdown-item--mega${isActive(l.to) ? ' site-nav__dropdown-item--active' : ''}`}
                aria-current={isActive(l.to) ? 'page' : undefined}
                tabIndex={open ? undefined : -1}
                viewTransition
                onFocus={() => prefetchRoute(l.to)}
              >
                <img className={`site-nav__dropdown-prop${l.photo ? ' site-nav__dropdown-prop--photo' : ''}`} src={l.img} alt="" aria-hidden="true" width={44} height={44} loading="lazy" decoding="async" />
                <span className="site-nav__dropdown-item-text">
                  <span className="site-nav__dropdown-item-title">{t(`earnPages.nav.${l.id}`)}</span>
                  <span className="site-nav__dropdown-item-desc">{t(l.descKey)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </li>
    );
  }

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
  const isSubpage = location.pathname !== '/';

  const navLinks = visibleNavLinks();
  // The bar and the badges point at the stores: iOS since 18 Sep 2026,
  // Google Play since 9 Nov 2026.

  // The ⚡ and → are markup (site-announce__spark / __arrow), so the copy must
  // not repeat them — except the short variant, which carries its own trailing
  // → because CSS hides the standalone arrow at ≤430px.
  const roundDate = (iso: string) => {
    const lang = i18n?.language || 'en';
    const [y, m, d] = iso.split('-').map(Number);
    return new Intl.DateTimeFormat(lang.startsWith('en') ? 'en-GB' : lang, { day: 'numeric', month: 'short', timeZone: 'UTC' })
      .format(new Date(Date.UTC(y, m - 1, d)));
  };
  const giveawayVars = giveaway
    ? { prize: giveaway.prizeName, date: roundDate(roundState === 'open' ? giveaway.closes : giveaway.opens) }
    : undefined;
  const announceFull = giveaway
    ? t(`giveawayBar.${roundState}.full`, giveawayVars)
    : showDownloadBar
    ? t('relaunchHome.liveBar.full', { defaultValue: 'Libo is live on the App Store and Google Play — download it free' })
    : t('earlyAccess.announceText', { defaultValue: 'Founding Members: 50% off — until 13 October' });
  const announceShort = giveaway
    ? t(`giveawayBar.${roundState}.short`, giveawayVars)
    : showDownloadBar
    ? t('relaunchHome.liveBar.short', { defaultValue: 'Get it on iOS & Android →' })
    : t('earlyAccess.announceTextShort', { defaultValue: 'Founding Members: 50% off until 13 Oct →' });

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
        <div className={`site-announce${showDownloadBar ? ' site-announce--waitlist' : ''}`}>
          <button
            type="button"
            className="site-announce__msg"
            onClick={() => {
              if (!showDownloadBar) { navigate('/membership'); return; }
              if (giveaway) { navigate('/giveaway'); return; }
              // Each phone to its own store; desktop to the hero badges.
              const platform = detectPlatform();
              if (platform !== 'desktop') { window.location.assign(storeUrlFor(platform)); return; }
              const hero = document.getElementById('hero-capture');
              if (hero) hero.scrollIntoView({ behavior: 'smooth', block: 'center' });
              else navigate('/#hero-capture');
            }}
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
        <ScrollProgress />
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
            {TOP_EARN_LINKS.map(({ id, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`site-nav__link${isActive(to) ? ' site-nav__link--active' : ''}`}
                  aria-current={isActive(to) ? 'page' : undefined}
                  viewTransition
                  onMouseEnter={() => prefetchRoute(to)}
                  onFocus={() => prefetchRoute(to)}
                >
                  {t(`earnPages.nav.${id}`)}
                </Link>
              </li>
            ))}
            {MENUS.map(renderMenu)}
            {navLinks.map(({ labelKey, defaultLabel, to }) => (
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
            {/* "Find your plan" (Noah, 18 Nov 2026, after Ladder) is the bar's
                one button and opens straight on question 1. The store badges
                left the bar the same day: they sit in the Home hero, the
                drawer and the mobile bottom bar. */}
            <Link
              to="/find-your-plan"
              state={{ start: true }}
              className="btn-primary site-nav__plan"
              viewTransition
              onMouseEnter={() => prefetchRoute('/find-your-plan')}
              onFocus={() => prefetchRoute('/find-your-plan')}
            >
              {t('findPlan.intro.start')}
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

      {/* Mobile: both store badges pinned to the bottom of the screen, always
          in reach (Noah, 17 Nov 2026: "like on Cal AI"). Hidden above 768px,
          where the badges sit in the nav bar instead. */}
      <div className="site-storebar">
        <StoreBadges className="site-storebar__badges" />
      </div>

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
          <Link to="/find-your-plan" state={{ start: true }} className="btn-primary btn-primary--block site-nav__drawer-plan" viewTransition onClick={() => setDrawerOpen(false)}>
            {t('findPlan.intro.start')}
          </Link>
          {TOP_EARN_LINKS.map(({ id, to }) => (
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} viewTransition onFocus={() => prefetchRoute(to)} onClick={() => setDrawerOpen(false)}>
              {t(`earnPages.nav.${id}`)}
            </Link>
          ))}
          {MENUS.map((menu) => (
            <React.Fragment key={menu.id}>
              <p className="site-nav__drawer-group">{t(menu.labelKey, { defaultValue: menu.defaultLabel })}</p>
              {menu.links.map((l) => (
                <Link key={l.to} to={l.to} className={`site-nav__drawer-sublink${isActive(l.to) ? ' site-nav__drawer-link--active' : ''}`} aria-current={isActive(l.to) ? 'page' : undefined} viewTransition onFocus={() => prefetchRoute(l.to)} onClick={() => setDrawerOpen(false)}>
                  {t(`earnPages.nav.${l.id}`)}
                </Link>
              ))}
            </React.Fragment>
          ))}
          <span className="site-nav__drawer-sep" aria-hidden="true" />
          {navLinks.map(({ labelKey, defaultLabel, to }) => (
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} viewTransition onMouseEnter={() => prefetchRoute(to)} onFocus={() => prefetchRoute(to)} onClick={() => setDrawerOpen(false)}>
              {t(labelKey, { defaultValue: defaultLabel })}
            </Link>
          ))}
        </div>
        {/* Pinned to the drawer's bottom: the store badges, then the language
            switcher (HEADER-FOOTER-TICKET §2). The lime "Download" CTA that sat
            here went with the official badges (17 Nov 2026). */}
        <div className="site-nav__drawer-bottom">
          <StoreBadges className="site-nav__drawer-badges" />
          <div className="site-nav__drawer-lang">
            <LanguageSwitcher variant="drawer" />
          </div>
        </div>
      </div>

      <div className={`site-nav-spacer${showAnnounce ? ' site-nav-spacer--with-announce' : ''}`} />
    </>
  );
}
