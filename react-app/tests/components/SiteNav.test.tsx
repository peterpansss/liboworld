/**
 * Tests for src/components/SiteNav.tsx.
 *
 * Covers: scroll-based class toggle, mobile drawer open/close, ESC closes
 * the drawer, mega-menu dropdown open/close (click + click-outside +
 * Escape), active-link highlighting, body-scroll lock, and the skip link.
 *
 * react-i18next mock returns the key (or defaultValue when supplied).
 * react-router-dom is loaded for real but with MemoryRouter.
 * LanguageSwitcher is replaced with a stub so we don't pull i18n init.
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

import SiteNav from '../../src/components/SiteNav';

beforeEach(() => {
  // Reset any drawer side-effects from a prior test
  document.body.style.overflow = '';
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <SiteNav />
    </MemoryRouter>,
  );
}

describe('SiteNav', () => {
  it('renders the skip link, brand mark, primary nav links, and CTAs', () => {
    renderAt('/');
    expect(screen.getByText('nav.skipToMain')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'nav.mainNavigation' })).toBeInTheDocument();
    // primary nav: Exercises + Workouts + Reward Club + Blog. The drawer
    // also renders these links (always present in the DOM, just hidden
    // by CSS), so we expect two occurrences of each.
    expect(screen.getAllByText('Exercises').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Workouts').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Reward Club')).toBeInTheDocument();
    expect(screen.getAllByText('Blog').length).toBeGreaterThanOrEqual(1);
    // CTAs
    expect(screen.getAllByText('nav.getStarted').length).toBeGreaterThanOrEqual(1);
  });

  it('marks the active nav link with aria-current="page"', () => {
    renderAt('/exercises');
    const exercisesLinks = screen.getAllByRole('link', { name: 'Exercises' });
    // At least one (the desktop nav link) should be current
    expect(exercisesLinks.some((l) => l.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('treats the Reward Club dropdown as active when on a child route', () => {
    renderAt('/cash-challenge');
    // The dropdown trigger should have the active class
    const trigger = screen.getByRole('button', { name: /Reward Club/ });
    expect(trigger.className).toContain('site-nav__link--active');
  });

  it('opens and closes the mega-menu on trigger click', () => {
    // Use fireEvent.click directly: userEvent.click simulates a pointer
    // path that triggers the wrapper's mouseenter+mouseleave handlers,
    // which collide with the click toggle in this component.
    renderAt('/');
    const trigger = screen.getByRole('button', { name: /Reward Club/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mega-menu on Escape', () => {
    renderAt('/');
    const trigger = screen.getByRole('button', { name: /Reward Club/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes the mega-menu when clicking outside the dropdown', () => {
    render(
      <MemoryRouter>
        <div data-testid="outside">elsewhere</div>
        <SiteNav />
      </MemoryRouter>,
    );
    const trigger = screen.getByRole('button', { name: /Reward Club/ });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the mega-menu when the wrapper is hovered', () => {
    renderAt('/');
    const trigger = screen.getByRole('button', { name: /Reward Club/ });
    const wrapper = trigger.closest('.site-nav__dropdown') as HTMLElement;
    fireEvent.mouseEnter(wrapper);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    fireEvent.mouseLeave(wrapper);
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('opens the mobile drawer and locks body scroll', async () => {
    const user = userEvent.setup();
    renderAt('/');
    const burger = screen.getByLabelText('nav.openMenu');
    expect(document.body.style.overflow).toBe('');
    await user.click(burger);
    expect(burger).toHaveAttribute('aria-expanded', 'true');
    expect(document.body.style.overflow).toBe('hidden');
    // Drawer dialog visible
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

  it('renders LanguageSwitcher in both nav and drawer slots', () => {
    renderAt('/');
    expect(screen.getByTestId('lang-switcher-nav')).toBeInTheDocument();
    // Drawer's switcher uses variant="drawer"
    expect(screen.getByTestId('lang-switcher-drawer')).toBeInTheDocument();
  });
});
