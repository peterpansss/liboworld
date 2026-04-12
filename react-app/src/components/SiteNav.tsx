import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './SiteNav.css';

const NAV_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'Exercises', to: '/exercises' },
  { label: 'Workouts', to: '/workouts' },
  { label: 'Blog', to: '/blog' },
] as const;

export default function SiteNav() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const location = useLocation();
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <nav className="site-nav" aria-label="Main navigation">
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
            {NAV_LINKS.map(({ label, to }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={`site-nav__link${isActive(to) ? ' site-nav__link--active' : ''}`}
                  aria-current={isActive(to) ? 'page' : undefined}
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>

          {/* Right section */}
          <div className="site-nav__right">
            <Link to="/onboarding" className="site-nav__cta">
              Get Started
            </Link>
            <button
              className="site-nav__hamburger"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
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
        aria-label="Navigation menu"
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
            aria-label="Close menu"
          >
            &#10005;
          </button>
        </div>
        <div className="site-nav__drawer-links">
          {NAV_LINKS.map(({ label, to }) => (
            <Link key={to} to={to} className={isActive(to) ? 'site-nav__drawer-link--active' : ''} aria-current={isActive(to) ? 'page' : undefined} onClick={() => setDrawerOpen(false)}>
              {label}
            </Link>
          ))}
        </div>
        <div className="site-nav__drawer-bottom">
          <Link
            to="/onboarding"
            className="site-nav__drawer-cta"
            onClick={() => setDrawerOpen(false)}
          >
            Get Started
          </Link>
        </div>
      </div>

      <div className="site-nav-spacer" />
    </>
  );
}
