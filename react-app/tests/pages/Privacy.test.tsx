/**
 * Tests for src/pages/Privacy.tsx — public legal page.
 *
 * Privacy.tsx is essentially static text inside <SiteNav> + <SiteFooter>.
 * The only behavior is a useEffect that mutates document.title on mount /
 * unmount, plus a breadcrumb Link that needs Router context.
 *
 * SiteNav and SiteFooter are stubbed so we don't load i18n / nav state.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));

import Privacy from '../../src/pages/Privacy';

function renderPage() {
  return render(
    <MemoryRouter>
      <Privacy />
    </MemoryRouter>,
  );
}

describe('Privacy', () => {
  it('renders the H1 and major section headings', () => {
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: /Privacy Policy/i })).toBeInTheDocument();
    // Spot-check several section headings
    expect(screen.getByRole('heading', { level: 2, name: /Who We Are/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Data We Collect/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Your Rights Under GDPR/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Contact & Data Protection/ })).toBeInTheDocument();
  });

  // App Review requires HealthKit use to be described specifically, so the
  // section and its two load-bearing promises are asserted rather than
  // spot-checked: that the energy figure is called an estimate, and that
  // Health data is not used for advertising and not sold or shared.
  it('describes the Apple Health (HealthKit) integration', () => {
    renderPage();

    expect(
      screen.getByRole('heading', { level: 2, name: /Apple Health \(HealthKit\)/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /What we read from Health/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /What we write to Health/ })).toBeInTheDocument();
    expect(screen.getByText(/This is a calculation, not a measurement/)).toBeInTheDocument();
    expect(
      screen.getByText(/do not use data from Apple Health for advertising or profiling/),
    ).toBeInTheDocument();
  });

  it('renders the navigation chrome and breadcrumb home link', () => {
    renderPage();
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    const breadcrumb = screen.getByRole('link', { name: /^Home$/ });
    expect(breadcrumb).toHaveAttribute('href', '/');
  });

  it('renders the table-of-contents anchor links', () => {
    renderPage();
    // 15 numbered TOC items, hash links into sections. The #pN ids are frozen
    // at their original numbers, so later-inserted sections (Deleting Your
    // Account, Apple Health) carry named ids instead.
    // Scoped to the TOC on purpose: body sections now cross-reference each
    // other by the same link text (Apple Health is linked from the How We Use
    // Your Data table and from the Third-Party Services note), so an unscoped
    // getByRole finds several and throws. This assertion is about the TABLE
    // OF CONTENTS, so it should only ever have looked inside it.
    const toc = within(document.querySelector('.legal-toc') as HTMLElement);
    expect(toc.getByRole('link', { name: /Apple Health \(HealthKit\)/ })).toHaveAttribute('href', '#apple-health');
    expect(toc.getByRole('link', { name: /Cookies & Tracking/ })).toHaveAttribute('href', '#p6');
    expect(toc.getByRole('link', { name: /Your Rights Under GDPR/ })).toHaveAttribute('href', '#p10');
    expect(toc.getByRole('link', { name: /Contact & Data Protection Officer/ })).toHaveAttribute('href', '#p13');
  });

  it('links to the account-deletion page and section', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 2, name: /Deleting Your Account/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Delete your account$/ })).toHaveAttribute('href', '/delete-account');
  });

  it('exposes the privacy contact email as a mailto link', () => {
    renderPage();
    const links = screen.getAllByRole('link', { name: /privacy@liboworld\.com/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'mailto:privacy@liboworld.com');
  });

  it('sets the document title on mount and restores it on unmount', () => {
    const { unmount } = renderPage();
    expect(document.title).toBe('Privacy Policy | Libo');
    unmount();
    expect(document.title).toBe('Libo');
  });
});
