/**
 * Tests for src/pages/Terms.tsx — public legal page.
 * Mirrors Privacy.test.tsx — static text + document.title side effect.
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

import Terms from '../../src/pages/Terms';

function renderPage() {
  return render(
    <MemoryRouter>
      <Terms />
    </MemoryRouter>,
  );
}

describe('Terms', () => {
  it('renders the H1 and a sample of section headings', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /Terms & Conditions/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Acceptance of Terms/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Subscription Plans & Free Trial/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Health & Fitness Disclaimer/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Governing Law/ })).toBeInTheDocument();
  });

  it('renders SiteNav and SiteFooter wrappers and Privacy link', () => {
    renderPage();
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    const privacy = screen.getByRole('link', { name: /Privacy Policy/ });
    expect(privacy).toHaveAttribute('href', '/privacy');
  });

  it('renders all 17 numbered TOC anchor links', () => {
    renderPage();
    for (let i = 1; i <= 17; i++) {
      const anchor = document.querySelector(`a[href="#s${i}"]`);
      expect(anchor, `expected TOC link to #s${i}`).not.toBeNull();
    }
  });

  it('exposes the support email', () => {
    renderPage();
    const links = screen.getAllByRole('link', { name: /hello@liboworld\.com/ });
    expect(links.length).toBeGreaterThan(0);
    expect(links[0]).toHaveAttribute('href', 'mailto:hello@liboworld.com');
  });

  it('sets the document title on mount and restores it on unmount', () => {
    const { unmount } = renderPage();
    expect(document.title).toBe('Terms & Conditions | Libo');
    unmount();
    expect(document.title).toBe('Libo');
  });
});
