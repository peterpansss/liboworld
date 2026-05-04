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
import { render, screen } from '@testing-library/react';
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

  it('renders the navigation chrome and breadcrumb home link', () => {
    renderPage();
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    const breadcrumb = screen.getByRole('link', { name: /^Home$/ });
    expect(breadcrumb).toHaveAttribute('href', '/');
  });

  it('renders the table-of-contents anchor links', () => {
    renderPage();
    // 13 numbered TOC items, hash links into sections
    expect(screen.getByRole('link', { name: /Cookies & Tracking/ })).toHaveAttribute('href', '#p6');
    expect(screen.getByRole('link', { name: /Your Rights Under GDPR/ })).toHaveAttribute('href', '#p10');
    expect(screen.getByRole('link', { name: /Contact & Data Protection Officer/ })).toHaveAttribute('href', '#p13');
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
