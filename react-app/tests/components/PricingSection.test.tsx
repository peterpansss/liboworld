/**
 * Tests for src/components/PricingSection.tsx.
 *
 * Three-card pricing grid (Free / Premium / Elite) with a Monthly/Yearly toggle.
 * Elite went on sale 19 Nov 2026 (VISIBLE_TIER_IDS in data/tiers.ts).
 * Covers:
 *   - heading + tier names (Free, Premium, Elite)
 *   - cycle toggle aria-selected wiring + tab role
 *   - price + subline switch when cycle changes
 *   - badge rendering ("Most popular" on Premium)
 *   - feature list (Free's first vs Premium's "Everything in Free")
 *   - CTA href construction (?cycle=… for the paid tiers, plain for Free)
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
// renders for the selected cycle, for every visible tier.
const eur = (n: number) => `€${n.toFixed(2)}`;
const PREMIUM_MONTHLY = eur(MONTHLY_PRICE.premium); // €19.99
const PREMIUM_YEARLY_PER_MONTH = eur(YEARLY_PRICE.premium / 12); // €10.00
const ELITE_MONTHLY = eur(MONTHLY_PRICE.elite); // €29.99
const ELITE_YEARLY_PER_MONTH = eur(YEARLY_PRICE.elite / 12); // €15.00

void React;

function renderSection() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  );
}

describe('PricingSection', () => {
  it('renders the heading and the three tier cards (Free, Premium, Elite)', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /Simple pricing\. Real rewards\./i })).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    expect(screen.getByText('Elite')).toBeInTheDocument();
  });

  it('renders the "Most popular" badge once', () => {
    renderSection();
    expect(screen.getAllByText('Most popular')).toHaveLength(1);
  });

  it('starts on the yearly cycle by default and exposes tab roles', () => {
    renderSection();
    const monthly = screen.getByRole('tab', { name: /Monthly/ });
    const yearly = screen.getByRole('tab', { name: /Yearly/ });
    expect(monthly).toHaveAttribute('aria-selected', 'false');
    expect(yearly).toHaveAttribute('aria-selected', 'true');
    // Yearly default → premium shows the per-month equivalent billed annually,
    // plus the annual total + discount line; Elite the same.
    expect(screen.getByText(PREMIUM_YEARLY_PER_MONTH)).toBeInTheDocument();
    expect(screen.getByText(ELITE_YEARLY_PER_MONTH)).toBeInTheDocument();
    expect(screen.getAllByText('/mo billed annually')).toHaveLength(2);
    expect(
      screen.getByText(`€${YEARLY_PRICE.premium.toFixed(2)}/year · save ${YEARLY_DISCOUNT.premium}%`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`€${YEARLY_PRICE.elite.toFixed(2)}/year · save ${YEARLY_DISCOUNT.elite}%`),
    ).toBeInTheDocument();
    expect(screen.queryByText(PREMIUM_MONTHLY)).not.toBeInTheDocument();
    expect(screen.queryByText(ELITE_MONTHLY)).not.toBeInTheDocument();
  });

  it('switches to monthly prices when the Monthly tab is clicked', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('tab', { name: /Monthly/ }));
    expect(screen.getByText(PREMIUM_MONTHLY)).toBeInTheDocument();
    expect(screen.getByText(ELITE_MONTHLY)).toBeInTheDocument();
    expect(screen.queryByText(PREMIUM_YEARLY_PER_MONTH)).not.toBeInTheDocument();
    expect(screen.queryByText(ELITE_YEARLY_PER_MONTH)).not.toBeInTheDocument();
    expect(screen.getAllByText('/month')).toHaveLength(2);
  });

  it('builds CTA hrefs with the cycle query param for the paid tier', () => {
    const { container } = renderSection();
    const ctas = Array.from(container.querySelectorAll<HTMLAnchorElement>('a.pricing-cta'));
    const hrefs = ctas.map((a) => a.getAttribute('href'));
    // Free tier: plain /onboarding
    expect(hrefs).toContain('/onboarding');
    // Default cycle yearly → ?cycle=yearly appended for both paid tiers.
    expect(hrefs).toContain('/onboarding?tier=premium&cycle=yearly');
    expect(hrefs).toContain('/onboarding?tier=elite&cycle=yearly');
  });

  it('updates CTA hrefs when the cycle toggles to monthly', async () => {
    const user = userEvent.setup();
    const { container } = renderSection();
    await user.click(screen.getByRole('tab', { name: /Monthly/ }));
    const hrefs = Array.from(container.querySelectorAll<HTMLAnchorElement>('a.pricing-cta'))
      .map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('/onboarding?tier=premium&cycle=monthly');
    expect(hrefs).toContain('/onboarding?tier=elite&cycle=monthly');
  });

  it('renders feature lists per tier (Free starts the list, Premium reuses)', () => {
    renderSection();
    // Free tier markers
    expect(screen.getByText('20 curated workouts')).toBeInTheDocument();
    expect(screen.getByText('Reps & kg tracking')).toBeInTheDocument();
    // Premium "Everything in Free"
    expect(screen.getByText('Everything in Free')).toBeInTheDocument();
    // Elite "Everything in Premium"
    expect(screen.getByText('Everything in Premium')).toBeInTheDocument();
  });

  it('uses CTA copy "Get started" for free, "Get Premium" / "Get Elite" for the paid tiers', () => {
    renderSection();
    expect(screen.getByText('Get started')).toBeInTheDocument();
    expect(screen.getAllByText('Get Premium')).toHaveLength(1);
    expect(screen.getAllByText('Get Elite')).toHaveLength(1);
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
