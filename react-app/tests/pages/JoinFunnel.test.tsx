/**
 * Tests for src/pages/JoinFunnel.tsx — the price the card actually shows.
 *
 * Regression guard. /join renders ONE price, chosen by whether the founding
 * pre-sale is open:
 *   - open   -> €39.50, with the founding-era comparison struck through
 *   - closed -> the standing list price from the tier constants
 *
 * The closed branch used to render a hard-coded '€79.99' constant that was
 * only ever the founding comparison. Founding closed on 14 Oct 2026 and the
 * Phase 2 prices landed on 12 Nov, so from then on the page advertised a
 * yearly price €40 below what Apple and Google were charging. Nothing caught
 * it, because the page had no tests and the number was not a translation key.
 *
 * SCOPE: i18next is not initialised under vitest, so t() falls through to the
 * inline defaultValue. These tests therefore pin the DEFAULTS, which is what
 * went stale. They do not prove the five locale files agree — that is checked
 * by PricingSection's suite, which reads the same tier constants.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { YEARLY_PRICE } from '../../src/data/tiers';

void React;

const isFoundingOpenMock = vi.fn(() => false);

vi.mock('../../src/config/launchMode', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../src/config/launchMode');
  return { ...actual, isFoundingOpen: () => isFoundingOpenMock() };
});

import JoinFunnel from '../../src/pages/JoinFunnel';

const LIST_PRICE = `€${YEARLY_PRICE.premium.toFixed(2)}`; // €119.99
const FOUNDING_WAS = '€79.99';

function renderPage() {
  return render(
    <MemoryRouter>
      <JoinFunnel />
    </MemoryRouter>,
  );
}

describe('JoinFunnel pricing', () => {
  beforeEach(() => isFoundingOpenMock.mockReturnValue(false));
  afterEach(() => vi.clearAllMocks());

  it('shows the standing list price once founding has closed', () => {
    const { container } = renderPage();
    const now = container.querySelector('.jf-offer__now');
    expect(now).toHaveTextContent(LIST_PRICE);
  });

  it('never shows the founding comparison price as the live price', () => {
    const { container } = renderPage();
    // The whole page, not just the card: €79.99 is not today's price anywhere.
    expect(container.textContent).not.toContain(FOUNDING_WAS);
    // And no struck-through "was" survives the close.
    expect(container.querySelector('.jf-offer__was')).toBeNull();
  });

  it('shows the founding price with the comparison struck through while open', () => {
    isFoundingOpenMock.mockReturnValue(true);
    const { container } = renderPage();
    expect(container.querySelector('.jf-offer__now')).toHaveTextContent('€39.50');
    expect(container.querySelector('.jf-offer__was')).toHaveTextContent(FOUNDING_WAS);
  });

  it('quotes the same yearly price the pricing page does', () => {
    renderPage();
    // One number, one source: both pages read membershipV2.plans.premium.price.
    expect(screen.getAllByText(LIST_PRICE).length).toBeGreaterThan(0);
  });
});
