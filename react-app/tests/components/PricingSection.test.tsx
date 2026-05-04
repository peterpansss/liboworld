/**
 * Tests for src/components/PricingSection.tsx.
 *
 * Three-card pricing grid with a Monthly/Yearly toggle. Covers:
 *   - heading + tier names
 *   - cycle toggle aria-selected wiring + tab role
 *   - price + subline switch when cycle changes
 *   - badge rendering ("Most popular", "Elite")
 *   - feature list (Free's first vs Premium's "Everything in Free")
 *   - CTA href construction (?cycle=… for paid tiers, plain for Free)
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PricingSection from '../../src/components/PricingSection';

void React;

function renderSection() {
  return render(
    <MemoryRouter>
      <PricingSection />
    </MemoryRouter>,
  );
}

describe('PricingSection', () => {
  it('renders the heading and the three tier cards', () => {
    renderSection();
    expect(screen.getByRole('heading', { name: /Simple pricing\. Real rewards\./i })).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Premium')).toBeInTheDocument();
    // "Elite" appears as both tier name and badge — ensure both render.
    expect(screen.getAllByText('Elite').length).toBeGreaterThanOrEqual(2);
  });

  it('renders both badges ("Most popular" and "Elite")', () => {
    renderSection();
    expect(screen.getByText('Most popular')).toBeInTheDocument();
    // The "Elite" tier name is also rendered, but the badge is inside its own span.
    // Two "Elite" matches in the DOM is fine — getAllByText asserts presence.
    expect(screen.getAllByText('Elite').length).toBeGreaterThanOrEqual(2);
  });

  it('starts on the yearly cycle by default and exposes tab roles', () => {
    renderSection();
    const monthly = screen.getByRole('tab', { name: /Monthly/ });
    const yearly = screen.getByRole('tab', { name: /Yearly/ });
    expect(monthly).toHaveAttribute('aria-selected', 'false');
    expect(yearly).toHaveAttribute('aria-selected', 'true');
    // Yearly default → premium price label is "€79", elite "€149"
    expect(screen.getByText('€79')).toBeInTheDocument();
    expect(screen.getByText('€149')).toBeInTheDocument();
  });

  it('switches to monthly prices when the Monthly tab is clicked', async () => {
    const user = userEvent.setup();
    renderSection();
    await user.click(screen.getByRole('tab', { name: /Monthly/ }));
    expect(screen.getByText('€9.99')).toBeInTheDocument();
    expect(screen.getByText('€19.99')).toBeInTheDocument();
    // Sublines too
    expect(screen.getAllByText('/month').length).toBeGreaterThan(0);
  });

  it('builds CTA hrefs with the cycle query param for paid tiers', () => {
    const { container } = renderSection();
    const ctas = Array.from(container.querySelectorAll<HTMLAnchorElement>('a.pricing-cta'));
    const hrefs = ctas.map((a) => a.getAttribute('href'));
    // Free tier: plain /onboarding
    expect(hrefs).toContain('/onboarding');
    // Default cycle yearly → ?cycle=yearly appended
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

  it('renders feature lists per tier (Free starts the list, paid tiers reuse)', () => {
    renderSection();
    // Free tier markers
    expect(screen.getByText('20 curated workouts')).toBeInTheDocument();
    expect(screen.getByText('Reps & kg tracking')).toBeInTheDocument();
    // Premium "Everything in Free"
    expect(screen.getByText('Everything in Free')).toBeInTheDocument();
    // Elite "Everything in Premium"
    expect(screen.getByText('Everything in Premium')).toBeInTheDocument();
  });

  it('uses CTA copy "Get started" for free, "Start 7-day free trial" for paid tiers', () => {
    renderSection();
    expect(screen.getByText('Get started')).toBeInTheDocument();
    // Both paid tiers share the trial CTA — getAllByText returns 2.
    expect(screen.getAllByText('Start 7-day free trial')).toHaveLength(2);
  });

  it('mentions the trial duration in the legal blurb', () => {
    renderSection();
    // The 7-day trial copy appears both in the section header subtitle
    // and in the bottom-most legal blurb. We just need one match to pass.
    expect(screen.getAllByText(/7-day free trial on Premium and Elite/i).length).toBeGreaterThan(0);
  });
});
