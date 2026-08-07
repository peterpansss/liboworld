/**
 * Acceptance tests for the site relaunch.
 *
 * These encode the checklist at the bottom of
 * `design_handoff_site_relaunch/MASTER-HANDOFF.md` as executable assertions,
 * because most of the rules are the kind that quietly regress: an email field
 * creeping onto a funnel, a CTA label drifting, "win" replacing "earn".
 *
 * Deliberately NOT stubbed: the real copy. The whole point is to assert on the
 * strings a visitor actually sees.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

void React;

// Chrome + checkout are exercised elsewhere; stub them so these tests stay
// focused on page copy and structure.
vi.mock('../../src/components/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('../../src/components/SiteNav', () => ({ default: () => <nav data-testid="site-nav" /> }));
vi.mock('../../src/components/SiteFooter', () => ({ default: () => <footer data-testid="site-footer" /> }));
vi.mock('../../src/lib/funnelSignups', () => ({ logFunnelClick: vi.fn(() => Promise.resolve()) }));
vi.mock('../../src/lib/stripe', () => ({ isStripeConfigured: () => true }));
vi.mock('../../src/components/funnel/FoundingCheckoutProvider', () => ({
  useFoundingCheckout: () => ({ openFoundingCheckout: vi.fn() }),
  EARLY_ACCESS_PRICE: 39.5,
}));

// Initialise the real i18n instance so these assertions read the strings that
// actually ship (from en.json), interpolation included — not react-i18next's
// uninitialised fallback, which returns defaultValue with {{placeholders}} raw.
import '../../src/i18n';

import ChallengeFunnel from '../../src/pages/ChallengeFunnel';
import CashChallenges from '../../src/pages/CashChallenges';
import JoinFunnel from '../../src/pages/JoinFunnel';

function renderTier(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/cash-challenges/${slug}`]}>
      <Routes>
        <Route path="/cash-challenges/:tier" element={<ChallengeFunnel />} />
        <Route path="/cash-challenges" element={<div>catalogue</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Every rendered string on the page, lowercased. */
function pageText(container: HTMLElement) {
  return (container.textContent || '').toLowerCase();
}

describe('relaunch acceptance — banned vocabulary', () => {
  const pages: Array<[string, () => HTMLElement]> = [
    ['flagship funnel', () => renderTier('flagship').container],
    ['starter funnel', () => renderTier('starter').container],
    ['committed funnel', () => renderTier('committed').container],
    [
      'cash challenges overview',
      () => render(<MemoryRouter><CashChallenges /></MemoryRouter>).container,
    ],
    ['founding member funnel', () => render(<MemoryRouter><JoinFunnel /></MemoryRouter>).container],
  ];

  it.each(pages)('%s never says "win"', (_name, mount) => {
    // "earn", never "win" — a prize-draw connotation is exactly what this
    // product is not (MASTER-HANDOFF acceptance checklist).
    expect(pageText(mount())).not.toMatch(/\bwins?\b|\bwinner/);
  });

  it.each(pages)('%s never claims "free forever"', (_name, mount) => {
    expect(pageText(mount())).not.toContain('free forever');
  });

  it.each(pages)('%s never mentions cycles or giveaways', (_name, mount) => {
    const text = pageText(mount());
    expect(text).not.toMatch(/\bcycle\b/);
    expect(text).not.toMatch(/giveaway/);
  });
});

describe('relaunch acceptance — Founding Member funnel', () => {
  it('contains ZERO email inputs — /join sells one thing (Noah 2026-08-07)', () => {
    const { container } = render(<MemoryRouter><JoinFunnel /></MemoryRouter>);
    expect(container.querySelectorAll('input')).toHaveLength(0);
    expect(container.querySelector('form')).toBeNull();
    // ...and the copy no longer promises a capture that isn't there.
    expect(pageText(container)).not.toContain('leave your email');
  });

  it('shows the price before checkout', () => {
    render(<MemoryRouter><JoinFunnel /></MemoryRouter>);
    expect(screen.getAllByText(/€39\.50/).length).toBeGreaterThan(0);
  });
});

describe('relaunch acceptance — challenge funnel CTAs', () => {
  it.each([
    ['flagship', 50, 100],
    ['committed', 15, 60],
  ])('%s: one action phrase, price ONLY on the close button', (slug, payout, reps) => {
    const { container } = renderTier(slug);
    const text = container.textContent || '';

    // Payout + rep target come from challengeTiers.ts, not hardcoded copy.
    expect(text).toContain(`€${payout}`);
    expect(text).toContain(`${reps} reps a day`);

    const labels = Array.from(container.querySelectorAll('a.cf-btn, button.cf-btn'))
      .map((el) => (el.textContent || '').trim());
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label).toMatch(/^Click to Enter( — €39\.50\/yr)? →$/);
    }
    // Exactly the close-section button + the sticky bar carry the price.
    expect(labels.filter((l) => l.includes('€39.50/yr')).length).toBeGreaterThan(0);
    // The offer-card CTA (directly after the card) is unpriced.
    const offer = container.querySelector('#offer .cf-btn--offer');
    expect((offer?.textContent || '').trim()).toBe('Click to Enter →');
    // Paid tiers have no email capture.
    expect(container.querySelectorAll('input')).toHaveLength(0);
  });

  it('starter: free ask everywhere, one paid Get Premium under the offer card (defect 18)', () => {
    const { container } = renderTier('starter');
    const labels = Array.from(container.querySelectorAll('a.cf-btn, button.cf-btn'))
      .map((el) => (el.textContent || '').trim());

    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      expect(label).toMatch(/^(Join free at launch →|Join free →|Get Premium — €39\.50\/yr →)$/);
    }
    // Exactly ONE paid CTA — under the offer card, price visible, opens
    // checkout directly (FIX-TICKET-V3.1 §18).
    expect(labels.filter((l) => l.startsWith('Get Premium')).length).toBe(1);
    expect((container.querySelector('#offer .cf-btn--offer')?.textContent || '').trim())
      .toBe('Get Premium — €39.50/yr →');
    // Starter's own headline sells the unlock.
    expect(container.textContent).toContain('Unlock the €15 and €50 challenges.');
    // DECISIONS-V3 §1: the free tier's conversion event IS joining free.
    expect(container.querySelectorAll('input[type="email"]')).toHaveLength(1);
    expect(container.querySelector('.cf-textlink')?.textContent).toMatch(/Get Premium/);
  });

  it('redirects an unknown tier to the catalogue', () => {
    renderTier('platinum');
    expect(screen.getByText('catalogue')).toBeInTheDocument();
  });
});

describe('relaunch acceptance — challenges overview', () => {
  it('renders three identically-treated cards with the real payouts', () => {
    const { container } = render(<MemoryRouter><CashChallenges /></MemoryRouter>);
    const cards = container.querySelectorAll('.cc-card');
    expect(cards).toHaveLength(3);

    // All three carry the same CTA — no tier is visually privileged.
    for (const card of cards) {
      expect(within(card as HTMLElement).getByText('View challenge →')).toBeInTheDocument();
    }

    const text = container.textContent || '';
    for (const payout of ['€5', '€15', '€50']) expect(text).toContain(payout);
    // The superseded middle tier must never come back.
    expect(text).not.toContain('€10');
  });

  it('shows no live occupancy data', () => {
    // Nothing on this page may depend on app sync.
    const { container } = render(<MemoryRouter><CashChallenges /></MemoryRouter>);
    const text = pageText(container);
    expect(text).not.toMatch(/filling fast|spots left|spots filled|% full/);
    expect(container.querySelector('progress')).toBeNull();
  });
});
