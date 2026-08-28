/**
 * Tests for src/pages/Rules.tsx — the public Cash Challenge Rules.
 * Mirrors Terms.test.tsx — static text + document.title side effect.
 *
 * Two of these are content guards, not render checks. The page is a document
 * the funnel films point at by name, and canon (REWARDS-ECONOMY-RULES §7.1c,
 * §7.1b) bars two specific things from ever appearing on it: the participant
 * cap, and any suggestion that sharing is required. Both are the kind of line
 * that gets reintroduced by a well-meaning copy edit, so they are pinned here.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CHALLENGE_TIERS } from '../../src/data/challengeTiers';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));

import Rules from '../../src/pages/Rules';

function renderPage() {
  return render(
    <MemoryRouter>
      <Rules />
    </MemoryRouter>,
  );
}

const SECTION_IDS = [
  'who', 'entry', 'tiers', 'day', 'proof', 'freezes',
  'missing', 'payout', 'fair-play', 'where', 'changes',
];

describe('Rules', () => {
  it('renders the H1 and a sample of section headings', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: /Cash Challenge Rules/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Who Can Enter/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /What a Challenge Day Is/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /How You Get Paid/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: /Fair Play/ })).toBeInTheDocument();
  });

  it('renders SiteNav and SiteFooter wrappers and the Terms link', () => {
    renderPage();
    expect(screen.getByTestId('site-nav')).toBeInTheDocument();
    expect(screen.getByTestId('site-footer')).toBeInTheDocument();
    expect(document.querySelector('a[href="/terms"]')).not.toBeNull();
  });

  it('every TOC anchor resolves to a section that exists', () => {
    const { container } = renderPage();
    for (const id of SECTION_IDS) {
      expect(container.querySelector(`a[href="#${id}"]`), `TOC link to #${id}`).not.toBeNull();
      expect(container.querySelector(`section#${id}`), `section #${id}`).not.toBeNull();
    }
  });

  it('states every challenge payout, sourced from CHALLENGE_TIERS', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    for (const tier of CHALLENGE_TIERS) {
      expect(text, `payout for ${tier.slug}`).toContain(`€${tier.payout}`);
      expect(text, `name for ${tier.slug}`).toContain(tier.name);
    }
  });

  it('never publishes the participant cap or live occupancy (canon §7.1c)', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    // The cap lives in Supabase `money_challenges.max_participants` and in
    // admin — deliberately not in front-end data. It is an operational
    // parameter, never public copy: a number we do not state cannot drift out
    // of sync across five locales and two launch videos. The guard is
    // source-independent on purpose, so it catches a hardcoded number too.
    expect(text).toMatch(/limited/i);
    expect(text).not.toMatch(/\d+\s*spots/i);
    expect(text).not.toMatch(/\d+\s*(of|\/)\s*\d+\s*spots/i);
    expect(text).not.toMatch(/almost gone|nearly full|spots? left/i);
  });

  it('never presents sharing as a requirement (canon §7.1b)', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    expect(text).toMatch(/never required/i);
    expect(text).not.toMatch(/must (post|share)/i);
    expect(text).not.toMatch(/shared? to (your )?stories/i);
  });

  it('uses "run", never prize-draw vocabulary', () => {
    const { container } = renderPage();
    const text = container.textContent ?? '';
    expect(text).not.toMatch(/\bwins?\b|\bwinner/);
    expect(text).not.toMatch(/\bcycle\b/);
  });

  it('sets and restores document.title', () => {
    const { unmount } = renderPage();
    expect(document.title).toBe('Cash Challenge Rules | Libo');
    unmount();
    expect(document.title).toBe('Libo');
  });
});
