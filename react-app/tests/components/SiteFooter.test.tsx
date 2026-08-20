/**
 * Tests for src/components/SiteFooter.tsx.
 *
 * Static footer with link nav, social icons, and a dynamic copyright year.
 * We mock react-i18next so `t(key)` returns the key (deterministic).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: {},
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import SiteFooter from '../../src/components/SiteFooter';

describe('SiteFooter', () => {
  it('renders a contentinfo region (the <footer> element)', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it('renders a labelled inner <nav>', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText('footer.footerNavigation')).toBeInTheDocument();
  });

  it('links the brand mark back to the home route', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    const homeLinks = container.querySelectorAll('a[href="/"]');
    expect(homeLinks.length).toBeGreaterThan(0);
  });

  it('renders the product/company/resources column titles', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByText('footer.productTitle')).toBeInTheDocument();
    expect(screen.getByText('footer.companyTitle')).toBeInTheDocument();
    expect(screen.getByText('footer.resourcesTitle')).toBeInTheDocument();
  });

  // Launch is iOS-only and dated — the tagline must promise neither Android
  // nor a vague "coming soon".
  it('renders a tagline free of "coming soon" and the Android promise', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    const tagline = container.querySelector('.site-footer__tagline');
    expect(tagline?.textContent).toBe('The training club that pays you to finish 30 days.');
  });

  it('offers no Google Play badge while Android is unshipped', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByText('App Store')).toBeInTheDocument();
    expect(screen.queryByText('Google Play')).toBeNull();
  });

  it('exposes external social links with rel=noopener noreferrer', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    const social = container.querySelectorAll('.site-footer__social a');
    expect(social.length).toBeGreaterThanOrEqual(3);
    social.forEach((a) => {
      expect(a.getAttribute('rel')).toContain('noopener');
      expect(a.getAttribute('rel')).toContain('noreferrer');
      expect(a.getAttribute('target')).toBe('_blank');
    });
  });

  it('contains a mailto link for contact', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(container.querySelector('a[href="mailto:hello@liboworld.com"]')).not.toBeNull();
  });

  it('renders the copyright bar', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    // The year is authored into the locale string, not computed — asserting on
    // "Libo World" keeps this from failing every 1 January.
    expect(container.querySelector('.site-footer__copy')?.textContent).toContain('Libo World');
  });

  it('links to legal pages (terms + privacy)', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(container.querySelector('a[href="/terms"]')).not.toBeNull();
    expect(container.querySelector('a[href="/privacy"]')).not.toBeNull();
  });

  it('keeps the /best-workouts SEO hub links in the Popular row', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    ['upper-body', 'lower-body', 'bodyweight', 'dumbbell', '30-minute', 'home'].forEach((slug) => {
      expect(container.querySelector(`a[href="/best-workouts/${slug}"]`)).not.toBeNull();
    });
  });
});
