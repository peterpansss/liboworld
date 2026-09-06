/**
 * Tests for src/components/SiteNav.tsx.
 *
 * Covers: scroll-based class toggle, mobile drawer open/close, ESC closes
 * the drawer, active-link highlighting, body-scroll lock, the skip link,
 * the waitlist CTA target, and the two announce-bar variants (free waitlist
 * everywhere / paid founding offer on /membership only).
 *
 * react-i18next mock returns the key (or defaultValue when supplied).
 * react-router-dom is loaded for real but with MemoryRouter.
 * LanguageSwitcher is replaced with a stub so we don't pull i18n init.
 * stripe + launchMode are mocked so the bar's gating is deterministic
 * (isStripeConfigured reads an env var; isFoundingOpen reads the clock).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) =>
      opts?.defaultValue ?? key,
    i18n: {},
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('../../src/components/LanguageSwitcher', () => ({
  default: ({ variant }: { variant?: string }) => (
    <div data-testid={`lang-switcher-${variant ?? 'nav'}`} />
  ),
}));

const stripeConfigured = vi.fn(() => true);
vi.mock('../../src/lib/stripe', () => ({
  isStripeConfigured: () => stripeConfigured(),
}));

const prelaunch = vi.fn(() => true);
const foundingOpen = vi.fn(() => true);
vi.mock('../../src/config/launchMode', () => ({
  isPrelaunch: () => prelaunch(),
  isFoundingOpen: () => foundingOpen(),
}));

import SiteNav from '../../src/components/SiteNav';

beforeEach(() => {
  // Reset any drawer side-effects from a prior test
  document.body.style.overflow = '';
  sessionStorage.clear();
  stripeConfigured.mockReturnValue(true);
  prelaunch.mockReturnValue(true);
  foundingOpen.mockReturnValue(true);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteNav />
    </MemoryRouter>,
  );
}

describe('SiteNav', () => {
  it('renders the skip link, primary nav links, and the waitlist CTA', () => {
    renderAt('/');
    expect(screen.getByText('nav.skipToMain')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'nav.mainNavigation' })).toBeInTheDocument();
    // The drawer renders the same links (always in the DOM, hidden by CSS),
    // so each label appears twice.
    ['Cash Challenges', 'Exercise Library', 'Founding Member', 'Press', 'Careers'].forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText('Join the waitlist').length).toBe(2);
    // Membership left the header on 2026-08-27; it lives in the footer as
    // "Pricing" now, and the freed slot carries the founding offer.
    expect(screen.queryByText('Membership')).toBeNull();
  });

  it('drops the Founding Member link once the founding offer closes', () => {
    // Same date-driven switch as the countdown and the /membership founding
    // card: the header has to stop advertising /join on launch day without a
    // deploy.
    foundingOpen.mockReturnValue(false);
    renderAt('/');
    expect(screen.queryByText('Founding Member')).toBeNull();
    expect(screen.getAllByText('Cash Challenges').length).toBeGreaterThanOrEqual(1);
  });

  it('points both waitlist CTAs at the homepage hero capture, not the paid funnel', () => {
    renderAt('/');
    // getAllByText, not getAllByRole: the closed drawer is aria-hidden, so
    // its copy of the CTA is out of the accessibility tree.
    const ctas = screen.getAllByText('Join the waitlist');
    expect(ctas.length).toBe(2);
    ctas.forEach((cta) => expect(cta).toHaveAttribute('href', '/#hero-capture'));
  });

  it('marks the active nav link with aria-current="page"', () => {
    renderAt('/exercises');
    const libraryLinks = screen.getAllByRole('link', { name: 'Exercise Library' });
    expect(libraryLinks.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('opens the mobile drawer and locks body scroll', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const burger = screen.getByLabelText('nav.openMenu');
    expect(document.body.style.overflow).toBe('');
    await user.click(burger);
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    expect(screen.getByRole('dialog', { name: 'nav.navigationMenu' })).toBeInTheDocument();
  });

  it('closes the drawer when the close button is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByLabelText('nav.openMenu'));
    await user.click(screen.getByLabelText('nav.closeMenu'));
    expect(screen.getByLabelText('nav.openMenu')).toHaveAttribute('aria-expanded', 'false');
    expect(document.body.style.overflow).toBe('');
  });

  it('closes the drawer on Escape', async () => {
    const user = userEvent.setup();
    renderAt('/');
    await user.click(screen.getByLabelText('nav.openMenu'));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByLabelText('nav.openMenu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the drawer when the overlay is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/');
    await user.click(screen.getByLabelText('nav.openMenu'));
    const overlay = container.querySelector('.site-nav__overlay');
    expect(overlay).not.toBeNull();
    await user.click(overlay!);
    expect(screen.getByLabelText('nav.openMenu')).toHaveAttribute('aria-expanded', 'false');
  });

  it('toggles the scrolled class when the page scrolls past 12px', () => {
    renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'nav.mainNavigation' });
    expect(nav.className).not.toContain('site-nav--scrolled');
    act(() => {
      Object.defineProperty(window, 'scrollY', { value: 50, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
    expect(nav.className).toContain('site-nav--scrolled');
  });

  it('renders LanguageSwitcher in the drawer', () => {
    renderAt('/');
    expect(screen.getByTestId('lang-switcher-drawer')).toBeInTheDocument();
  });
});

describe('SiteNav announce bar', () => {
  it('shows the free waitlist variant off /membership', () => {
    const { container } = renderAt('/exercises');
    const bar = container.querySelector('.site-announce');
    expect(bar).not.toBeNull();
    expect(bar!.className).toContain('site-announce--waitlist');
    expect(screen.getByText('Cash challenges open with the iOS app — join the waitlist')).toBeInTheDocument();
  });

  it('does not gate the waitlist variant on Stripe — it is a free ask', () => {
    stripeConfigured.mockReturnValue(false);
    const { container } = renderAt('/');
    expect(container.querySelector('.site-announce--waitlist')).not.toBeNull();
  });

  it('shows the paid founding offer only on /membership', () => {
    const { container } = renderAt('/membership');
    const bar = container.querySelector('.site-announce');
    expect(bar).not.toBeNull();
    expect(bar!.className).not.toContain('site-announce--waitlist');
    expect(
      screen.getByText('Founding Members: 50% off — until 13 September'),
    ).toBeInTheDocument();
  });

  // The waitlist bar is the fallback, not "every page except /membership" —
  // otherwise /membership would be the one page with no bar at all once the
  // founding offer closes on LAUNCH_DATE.
  it('falls back to the waitlist bar once the founding window has closed', () => {
    foundingOpen.mockReturnValue(false);
    const { container } = renderAt('/membership');
    const bar = container.querySelector('.site-announce');
    expect(bar).not.toBeNull();
    expect(bar!.className).toContain('site-announce--waitlist');
    expect(
      screen.queryByText('Founding Members: 50% off — until 13 September'),
    ).toBeNull();
  });

  it('falls back to the waitlist bar on /membership when Stripe is not configured', () => {
    stripeConfigured.mockReturnValue(false);
    const { container } = renderAt('/membership');
    expect(container.querySelector('.site-announce--waitlist')).not.toBeNull();
  });

  it('suppresses the bar entirely on Careers and Press', () => {
    const careers = renderAt('/careers');
    expect(careers.container.querySelector('.site-announce')).toBeNull();
    careers.unmount();
    const press = renderAt('/press');
    expect(press.container.querySelector('.site-announce')).toBeNull();
  });

  it('hides the bar after launch', () => {
    prelaunch.mockReturnValue(false);
    const { container } = renderAt('/');
    expect(container.querySelector('.site-announce')).toBeNull();
  });

  it('dismisses for the session and offsets the nav while shown', async () => {
    const user = userEvent.setup();
    const { container } = renderAt('/');
    const nav = screen.getByRole('navigation', { name: 'nav.mainNavigation' });
    expect(nav.className).toContain('site-nav--with-announce');
    await user.click(screen.getByLabelText('earlyAccess.announceDismiss'));
    expect(container.querySelector('.site-announce')).toBeNull();
    expect(sessionStorage.getItem('ea_announce_dismissed')).toBe('1');
    expect(
      screen.getByRole('navigation', { name: 'nav.mainNavigation' }).className,
    ).not.toContain('site-nav--with-announce');
  });
});
