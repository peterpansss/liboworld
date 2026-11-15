/**
 * Tests for src/pages/ChallengeFunnel.tsx — the offer price and the Starter
 * lede once the founding pre-sale has closed.
 *
 * Regression guard (15 Nov 2026). With founding closed the offer block printed
 * a literal '€79.99' as the price — the pre-Phase-2 yearly price, €40 below
 * what Apple and Google charge — and the free Starter's lede still said
 * "right now the first year is half price". Same class of bug as JoinFunnel's
 * WAS_PRICE. i18next is not initialised under vitest, so these pin the inline
 * defaults; the locale files are edited alongside.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { YEARLY_PRICE } from '../../src/data/tiers';
import { CHALLENGE_TIERS } from '../../src/data/challengeTiers';

void React;

const isFoundingOpenMock = vi.fn(() => false);
vi.mock('../../src/config/launchMode', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('../../src/config/launchMode');
  return { ...actual, isFoundingOpen: () => isFoundingOpenMock() };
});
vi.mock('../../src/components/funnel/FoundingCheckoutProvider', () => ({
  useFoundingCheckout: () => ({ openFoundingCheckout: vi.fn() }),
  EARLY_ACCESS_PRICE: 39.5,
}));
vi.mock('../../src/lib/funnelSignups', () => ({ logFunnelClick: vi.fn() }));
vi.mock('../../src/hooks/useWaitlistSubmit', () => ({
  useWaitlistSubmit: () => ({ submit: vi.fn(), status: 'idle', error: null }),
}));
vi.mock('../../src/lib/stripe', () => ({ isStripeConfigured: () => false }));

import ChallengeFunnel from '../../src/pages/ChallengeFunnel';

const LIST_PRICE = `€${YEARLY_PRICE.premium.toFixed(2)}`;

function renderTier(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/cash-challenges/${slug}`]}>
      <Routes>
        <Route path="/cash-challenges/:tier" element={<ChallengeFunnel />} />
      </Routes>
    </MemoryRouter>,
  );
}

const free = CHALLENGE_TIERS.find((t) => !t.requiresPremium)!;
const paid = CHALLENGE_TIERS.find((t) => t.requiresPremium)!;

describe('ChallengeFunnel offer once founding has closed', () => {
  beforeEach(() => isFoundingOpenMock.mockReturnValue(false));
  afterEach(() => vi.clearAllMocks());

  for (const tier of [free, paid]) {
    it(`${tier.slug}: shows the standing list price, never €79.99`, () => {
      const { container } = renderTier(tier.slug);
      const now = container.querySelector('.cf-offer__now');
      expect(now).toHaveTextContent(LIST_PRICE);
      expect(container.querySelector('.cf-offer')).not.toHaveTextContent('€79.99');
      expect(container.querySelector('.cf-offer')).not.toHaveTextContent('€39.50');
    });
  }

  it('the free Starter no longer promises a half-price first year', () => {
    const { container } = renderTier(free.slug);
    expect(container).not.toHaveTextContent(/half price/i);
  });
});
