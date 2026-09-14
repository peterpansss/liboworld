/**
 * Tests for src/components/PricingSection.tsx.
 *
 * Two-card pricing grid (Free / Premium) with a Monthly/Yearly toggle. Elite is
 * deferred at launch (VISIBLE_TIER_IDS in data/tiers.ts), so it must NOT render.
 * Covers:
 *   - heading + tier names (Free + Premium only, no Elite)
 *   - cycle toggle aria-selected wiring + tab role
 *   - price + subline switch when cycle changes
 *   - badge rendering ("Most popular"; no "Elite" badge)
 *   - feature list (Free's first vs Premium's "Everything in Free")
 *   - CTA href construction (?cycle=… for Premium, plain for Free)
 *   - no trial promise anywhere (there is no ASC introductory offer)
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PricingSection from '../../src/components/PricingSection';
import { MONTHLY_PRICE, YEARLY_PRICE, YEARLY_DISCOUNT } from '../../src/data/tiers';

// Prices are asserted against the tier constants (the single source of truth
// in src/data/tiers.ts, mirrored from the mobile paywall) so a deliberate price
// change doesn't strand this suite; what's under test is that the right label
// renders for the selected cycle and that Elite's never does.
const eur = (n: number) => `€${n.toFixed(2)}`;
const PREMIUM_MONTHLY = eur(MONTHLY_PRICE.premium); // €12.99
const PREMIUM_YEARLY_PER_MONTH = eur(YEARLY_PRICE.premium / 12); // €6.67
const ELITE_MONTHLY = eur(MONTHLY_PRICE.elite);
const ELITE_YEARLY_PER_MONTH = eur(YEARLY_PRICE.elite / 12);

void React;

function renderSection() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  );
}

describe('PricingSection', () => {
  it('renders the heading and the two tier cards (Free + Premium, no Elite)', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /Simple pricing\. Real rewards\./i })).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    // Elite is deferred — it must not appear as a tier name or badge.
    expect(screen.queryByText('Elite')).not.toBeInTheDocument();
  });

  it('renders the "Most popular" badge and no "Elite" badge', () => {
    renderSection();
    expect(screen.getByText('Most popular')).toBeInTheDocument();
    expect(screen.queryByText('Elite')).not.toBeInTheDocument();
  });

  it('starts on the yearly cycle by default and exposes tab roles', () => {
    renderSection();
    const monthly = screen.getByRole('tab', { name: /Monthly/ });
    const yearly = screen.getByRole('tab', { name: /Yearly/ });
    expect(monthly).toHaveAttribute('aria-selected', 'false');
    expect(yearly).toHaveAttribute('aria-selected', 'true');
    // Yearly default → premium shows the per-month equivalent billed annually,
    // plus the annual total + discount line. Elite's yearly price is gone.
    expect(screen.getByText(PREMIUM_YEARLY_PER_MONTH)).toBeInTheDocument();
    expect(screen.getByText('/mo billed annually')).toBeInTheDocument();
    expect(
      screen.getByText(`€${YEARLY_PRICE.premium.toFixed(2)}/year · save ${YEARLY_DISCOUNT.premium}%`),
    ).toBeInTheDocument();
    expect(screen.queryByText(ELITE_YEARLY_PER_MONTH)).not.toBeInTheDocument();
    expect(screen.queryByText(PREMIUM_MONTHLY)).not.toBeInTheDocument();
  });

  it('switches to monthly prices when the Monthly tab is clicked', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('tab', { name: /Monthly/ }));
    expect(screen.getByText(PREMIUM_MONTHLY)).toBeInTheDocument();
    expect(screen.queryByText(PREMIUM_YEARLY_PER_MONTH)).not.toBeInTheDocument();
    // Elite's monthly price is no longer rendered.
    expect(screen.queryByText(ELITE_MONTHLY)).not.toBeInTheDocument();
    expect(screen.getAllByText('/month').length).toBeGreaterThan(0);
  });

  it('builds CTA hrefs with the cycle query param for the paid tier', () => {
    const { container } = renderSection();
    const ctas = Array.from(container.querySelectorAll<HTMLAnchorElement>('a.pricing-cta'));
    const hrefs = ctas.map((a) => a.getAttribute('href'));
    // Free tier: plain /onboarding
    expect(hrefs).toContain('/onboarding');
    // Default cycle yearly → ?cycle=yearly appended for Premium; no Elite CTA.
    expect(hrefs).toContain('/onboarding?tier=premium&cycle=yearly');
    expect(hrefs).not.toContain('/onboarding?tier=elite&cycle=yearly');
  });

  it('updates CTA hrefs when the cycle toggles to monthly', async () => {
    const user = userEvent.setup();
    const { container } = renderSection();
    await user.click(screen.getByRole('tab', { name: /Monthly/ }));
    const hrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>('a.pricing-cta'))
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/onboarding?tier=premium&cycle=monthly');
    expect(hrefs).not.toContain('/onboarding?tier=elite&cycle=monthly');
  });

  it('renders feature lists per tier (Free starts the list, Premium reuses)', () => {
    renderSection();
    // Free tier markers
    expect(screen.getByText('20 curated workouts')).toBeInTheDocument();
    expect(screen.getByText('Reps & kg tracking')).toBeInTheDocument();
    // Premium "Everything in Free"
    expect(screen.getByText('Everything in Free')).toBeInTheDocument();
    // Elite's "Everything in Premium" bullet must be gone.
    expect(screen.queryByText('Everything in Premium')).not.toBeInTheDocument();
  });

  it('uses CTA copy "Get started" for free, "Get Premium" for the paid tier', () => {
    renderSection();
    expect(screen.getByText('Get started')).toBeInTheDocument();
    // Only Premium remains, so the paid CTA appears exactly once.
    expect(screen.getAllByText('Get Premium')).toHaveLength(1);
  });

  it('promises no trial anywhere', () => {
    // There is no introductory offer on either App Store subscription product
    // and the app ships TIER_TRIAL_DAYS = 0 — a subscriber is charged
    // immediately. Nothing here may imply a free trial period.
    const { container } = renderSection();
    expect(container.textContent).not.toMatch(/trial/i);
    expect(container.textContent).not.toMatch(/7[- ]day/i);
    // The honest version of the same promise: the free tier, and cancellation.
    expect(screen.getByText(/The free tier has no time limit/i)).toBeInTheDocument();
    expect(screen.getAllByText(/cancel ?anytime/i).length).toBeGreaterThan(0);
  });
});
