import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher';
import './SiteNav.css';

// Top-level desktop nav items. The Reward Club entry is a parent that
// expands into a dropdown of REWARD_CLUB_CHILDREN (see below).
const NAV_LINKS = [
  { labelKey: 'nav.exercises', defaultLabel: 'Exercises', to: '/exercises' },
  { labelKey: 'nav.workouts', defaultLabel: 'Workouts', to: '/workouts' },
  { labelKey: 'nav.blog', defaultLabel: 'Blog', to: '/blog' },
] as const;

// Children of the Reward Club dropdown. Order = visual order in the menu.
const REWARD_CLUB_CHILDREN = [
  { labelKey: 'nav.cashChallenges', defaultLabel: 'Cash Challenges', to: '/cash-challenge' },
  { labelKey: 'nav.giveaways', defaultLabel: 'Giveaways', to: '/giveaway' },
] as const;

export default function SiteNav() {
  const { t } = useTranslation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);
  const rewardWrapRef = useRef<HTMLLIElement>(null);

  const isActive = (to: string) =>
    to === '/' ? location.pathname === '/' : location.pathname.startsWith(to);

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
    setRewardOpen(false);
  }, [location.pathname]);

  return (
    <>
      <a href="#main-content" className="skip-link">{t('nav.skipToMain')}</a>
      <nav className="site-nav" aria-label={t('nav.mainNavigation')}>
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
              <ul className="site-nav__dropdown-menu" role="menu">
                {REWARD_CLUB_CHILDREN.map(({ labelKey, defaultLabel, to }) => (
                  <li key={to} role="none">
                    <Link
                      to={to}
                      role="menuitem"
                      className={`site-nav__dropdown-item${isActive(to) ? ' site-nav__dropdown-item--active' : ''}`}
                      aria-current={isActive(to) ? 'page' : undefined}
                      onClick={() => setRewardOpen(false)}
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
            <LanguageSwitcher />
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
            ...NAV_LINKS.slice(2),
          ].map(({ labelKey, defaultLabel, to }) => (
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>
              {t(labelKey, { defaultValue: defaultLabel })}
            </Link>
          ))}
        </div>
        <div className="site-nav__drawer-bottom">
          <LanguageSwitcher variant="drawer" />
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
