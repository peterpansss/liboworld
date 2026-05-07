import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './SiteNav.css';

// Top-level desktop nav items. Reward Club + Articles are parents that
// expand into dropdowns (REWARD_CLUB_CHILDREN / ARTICLES_CHILDREN below).
const NAV_LINKS = [
  { labelKey: 'nav.exercises', defaultLabel: 'Exercises', to: '/exercises' },
  { labelKey: 'nav.workouts', defaultLabel: 'Workouts', to: '/workouts' },
  { labelKey: 'nav.press', defaultLabel: 'Press', to: '/press' },
  { labelKey: 'nav.careers', defaultLabel: 'Careers', to: '/careers' },
] as const;

// Children of the Reward Club dropdown. Order = visual order in the menu.
const REWARD_CLUB_CHILDREN = [
  {
    labelKey: 'nav.cashChallenges',
    defaultLabel: 'Cash Challenges',
    descriptionKey: 'nav.cashChallengesDesc',
    defaultDescription: 'Train 30 days, earn up to €250 cash',
    icon: '💰',
    to: '/cash-challenge',
  },
  {
    labelKey: 'nav.giveaways',
    defaultLabel: 'Giveaways',
    descriptionKey: 'nav.giveawaysDesc',
    defaultDescription: 'Win iPhones, Apple Watches & monthly prizes',
    icon: '🎁',
    to: '/giveaway',
  },
] as const;

// Children of the Articles dropdown. Categories match the Blog page chips;
// `to` uses the `?cat=` query param so the destination page pre-filters.
const ARTICLES_CHILDREN = [
  { labelKey: 'nav.articlesAll',       defaultLabel: 'All',       to: '/blog' },
  { labelKey: 'nav.articlesTraining',  defaultLabel: 'Training',  to: '/blog?cat=Training' },
  { labelKey: 'nav.articlesNutrition', defaultLabel: 'Nutrition', to: '/blog?cat=Nutrition' },
  { labelKey: 'nav.articlesLifestyle', defaultLabel: 'Lifestyle', to: '/blog?cat=Lifestyle' },
  { labelKey: 'nav.articlesGuides',    defaultLabel: 'Guides',    to: '/blog?cat=Guides' },
] as const;

export default function SiteNav() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [articlesOpen, setArticlesOpen] = useState(false);
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rewardWrapRef = useRef<HTMLLIElement>(null);
  const articlesWrapRef = useRef<HTMLLIElement>(null);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);
  // For the Articles parent: only "active" when on /blog (any sub-path).
  const isArticlesActive = location.pathname.startsWith('/blog');

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
    if (!rewardOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (rewardWrapRef.current && !rewardWrapRef.current.contains(e.target as Node)) {
        setRewardOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRewardOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [rewardOpen]);

  useEffect(() => {
    if (!articlesOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (articlesWrapRef.current && !articlesWrapRef.current.contains(e.target as Node)) {
        setArticlesOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setArticlesOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [articlesOpen]);

  useEffect(() => {
    setRewardOpen(false);
    setArticlesOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll(); // sync on mount in case page is already scrolled
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">{t('nav.skipToMain')}</a>
      <nav className={`site-nav${scrolled ? ' site-nav--scrolled' : ''}`} aria-label={t('nav.mainNavigation')}>
        <div className="site-nav__inner">
          {/* Logo */}
          <Link to="/" className="site-nav__logo">
            <img
              src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
              alt="Libo"
            />
          </Link>

          {/* Center links */}
          <ul className="site-nav__links">
            {NAV_LINKS.slice(0, 2).map(({ labelKey, defaultLabel, to }) => (
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

            {/* Reward Club dropdown */}
            <li
              ref={rewardWrapRef}
              className={`site-nav__dropdown${rewardOpen ? ' site-nav__dropdown--open' : ''}`}
              onMouseEnter={() => setRewardOpen(true)}
              onMouseLeave={() => setRewardOpen(false)}
            >
              <button
                type="button"
                className={`site-nav__link site-nav__dropdown-trigger${
                  REWARD_CLUB_CHILDREN.some((c) => isActive(c.to)) ? ' site-nav__link--active' : ''
                }`}
                aria-haspopup="menu"
                aria-expanded={rewardOpen}
                onClick={() => setRewardOpen((o) => !o)}
              >
                {t('nav.rewardClub', { defaultValue: 'Reward Club' })}
                <span className="site-nav__dropdown-caret" aria-hidden>▾</span>
              </button>
              <ul className="site-nav__dropdown-menu site-nav__dropdown-menu--mega" role="menu">
                {REWARD_CLUB_CHILDREN.map(({ labelKey, defaultLabel, descriptionKey, defaultDescription, icon, to }) => (
                  <li key={to} role="none">
                    <Link
                      to={to}
                      role="menuitem"
                      className={`site-nav__dropdown-item site-nav__dropdown-item--mega${isActive(to) ? ' site-nav__dropdown-item--active' : ''}`}
                      aria-current={isActive(to) ? 'page' : undefined}
                      onClick={() => setRewardOpen(false)}
                    >
                      <span className="site-nav__dropdown-item-icon" aria-hidden>{icon}</span>
                      <span className="site-nav__dropdown-item-text">
                        <span className="site-nav__dropdown-item-title">{t(labelKey, { defaultValue: defaultLabel })}</span>
                        <span className="site-nav__dropdown-item-desc">{t(descriptionKey, { defaultValue: defaultDescription })}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            {/* Articles dropdown */}
            <li
              ref={articlesWrapRef}
              className={`site-nav__dropdown${articlesOpen ? ' site-nav__dropdown--open' : ''}`}
              onMouseEnter={() => setArticlesOpen(true)}
              onMouseLeave={() => setArticlesOpen(false)}
            >
              <button
                type="button"
                className={`site-nav__link site-nav__dropdown-trigger${
                  isArticlesActive ? ' site-nav__link--active' : ''
                }`}
                aria-haspopup="menu"
                aria-expanded={articlesOpen}
                onClick={() => setArticlesOpen((o) => !o)}
              >
                {t('nav.articles', { defaultValue: 'Articles' })}
                <span className="site-nav__dropdown-caret" aria-hidden>▾</span>
              </button>
              <ul className="site-nav__dropdown-menu" role="menu">
                {ARTICLES_CHILDREN.map(({ labelKey, defaultLabel, to }) => (
                  <li key={to} role="none">
                    <Link
                      to={to}
                      role="menuitem"
                      className="site-nav__dropdown-item"
                      onClick={() => setArticlesOpen(false)}
                    >
                      {t(labelKey, { defaultValue: defaultLabel })}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>

            {NAV_LINKS.slice(2).map(({ labelKey, defaultLabel, to }) => (
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
            <Link to="/onboarding" className="site-nav__cta">
              {t('nav.getStarted')}
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
          <Link to="/" className="site-nav__logo" onClick={() => setDrawerOpen(false)}>
            <img
              src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
              alt="Libo"
            />
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
          {[
            ...NAV_LINKS.slice(0, 2),
            ...REWARD_CLUB_CHILDREN,
            // Articles collapsed to a single entry on mobile; users use the
            // category chips on the /blog page itself.
            { labelKey: 'nav.articles', defaultLabel: 'Articles', to: '/blog' },
            ...NAV_LINKS.slice(2),
          ].map(({ labelKey, defaultLabel, to }) => (
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>
              {t(labelKey, { defaultValue: defaultLabel })}
            </Link>
          ))}
        </div>
        <div className="site-nav__drawer-bottom">
          <Link
            to="/onboarding"
            className="site-nav__drawer-cta"
            onClick={() => setDrawerOpen(false)}
          >
            {t('nav.getStarted')}
          </Link>
        </div>
      </div>

      <div className="site-nav-spacer" />
    </>
  );
}
