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
  useTranslation: () => ({ t: (key: string) => key, i18n: {} }),
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

  it('renders the four product/company/resources/workouts column titles', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    expect(screen.getByText('footer.productTitle')).toBeInTheDocument();
    expect(screen.getByText('footer.companyTitle')).toBeInTheDocument();
    expect(screen.getByText('footer.resourcesTitle')).toBeInTheDocument();
    expect(screen.getByText('footer.workoutsTitle')).toBeInTheDocument();
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

  it('renders the current year in the copyright bar', () => {
    render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    const year = String(new Date().getFullYear());
    const copy = screen.getByText(new RegExp(`© ${year} Libo World`));
    expect(copy).toBeInTheDocument();
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

  it('links to filtered workout categories via query string', () => {
    const { container } = render(
      <MemoryRouter>
        <SiteFooter />
      </MemoryRouter>,
    );
    ['Gym', 'Home', 'Stretching', 'Cardio'].forEach((cat) => {
      const link = container.querySelector(`a[href="/workouts?cat=${cat}"]`);
      expect(link).not.toBeNull();
    });
  });
});
