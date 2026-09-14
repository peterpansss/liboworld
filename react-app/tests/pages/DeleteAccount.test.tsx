/**
 * Tests for src/pages/DeleteAccount.tsx — the public account-deletion page
 * Google Play's Data safety form links to.
 * Mirrors Rules.test.tsx — static text + document.title side effect.
 *
 * The content guards pin the things the Play policy requires the page to say
 * (app name, in-app steps, an app-independent request route, what is deleted
 * and kept) and the one statement that must never be softened: deleting the
 * account does not cancel a store subscription.
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

import DeleteAccount from '../../src/pages/DeleteAccount';

function renderPage() {
  return render(
    <MemoryRouter>
      <DeleteAccount />
    </MemoryRouter>,
  );
}

const SECTION_IDS = ['in-app', 'by-email', 'deleted', 'kept', 'subscriptions', 'partial', 'contact'];

describe('DeleteAccount', () => {
  it('renders the H1 and the section headings', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /Delete your Libo account/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Delete Your Account in the App/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Delete Your Account Without the App/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /What Is Deleted/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /What We Keep/ })).toBeInTheDocument();
  });

  it('renders SiteNav and SiteFooter wrappers and the Privacy link', () => {
    renderPage();
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(document.querySelector('a[href="/privacy"]')).not.toBeNull();
  });

  it('every TOC anchor resolves to a section that exists, numbered in order', () => {
    const { container } = renderPage();
    for (const id of SECTION_IDS) {
      expect(container.querySelector(`.legal-toc a[href="#${id}"]`), `TOC link to #${id}`).not.toBeNull();
      expect(container.querySelector(`section#${id}`), `section #${id}`).not.toBeNull();
    }
    const numbers = Array.from(container.querySelectorAll('.legal-section-num')).map((el) => el.textContent);
    expect(numbers).toEqual(SECTION_IDS.map((_, i) => String(i + 1).padStart(2, '0')));
  });

  it('names the store listing and the operator', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    expect(text).toContain('Libo World - Training Club');
    expect(text).toContain('Libo World, Germany');
  });

  it('gives the in-app path using the app’s own labels', () => {
    const { container } = renderPage();
    const steps = container.querySelector('section#in-app ol')?.textContent ?? '';
    expect(steps).toContain('Account');
    expect(steps).toContain('Delete Account');
    expect(steps).toContain('DELETE');
    expect(steps).toContain('Delete my account');
  });

  it('offers an email route that works without the app', () => {
    const { container } = renderPage();
    const section = container.querySelector('section#by-email');
    expect(section?.querySelector('a[href^="mailto:privacy@liboworld.com"]')).not.toBeNull();
    expect(section?.textContent).toMatch(/30 days/);
  });

  it('states that deleting the account does not cancel a subscription', () => {
    const { container } = renderPage();
    const text = container.querySelector('section#subscriptions')?.textContent ?? '';
    expect(text).toMatch(/does not cancel your subscription/i);
  });

  it('sets and restores document.title', () => {
    const { unmount } = renderPage();
    expect(document.title).toBe('Delete Your Account | Libo');
    unmount();
    expect(document.title).toBe('Libo');
  });
});
