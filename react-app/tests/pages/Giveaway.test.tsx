/**
 * Tests for src/pages/Giveaway.tsx — paid-package giveaway funnel.
 *
 * Page-level behaviour we own (the FunnelCheckoutModal itself is the
 * components agent's responsibility):
 *   - On mount, fetches the active giveaway via supabase.rpc and uses the
 *     returned title / image / dates in the page chrome.
 *   - SELECT button on each PackageCard opens the modal pre-loaded with
 *     that tier's name / price / amount / heroSummary.
 *   - "View full inclusions" toggle expands/collapses the tile grid.
 *   - When Stripe is configured, modal createIntent uses createPaymentIntent;
 *     when not, modal falls back to submitFunnelInterest only.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

const supabaseRpcMock = vi.fn();
const submitFunnelInterestMock = vi.fn();
const createPaymentIntentMock = vi.fn();
const isStripeConfiguredMock = vi.fn(() => false);

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/components/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('../../src/components/funnel/FunnelHeader', () => ({
  default: () => <header data-testid="funnel-header" />,
}));
vi.mock('../../src/components/funnel/FunnelFAQ', () => ({
  default: ({ items }: { items: Array<{ q: string; a: string }> }) => (
    <div data-testid="funnel-faq" data-count={items.length} />
  ),
}));
vi.mock('../../src/components/funnel/PackageCard', () => ({
  default: ({ name, ctaLabel, onSelect }: { name: string; ctaLabel: string; onSelect: () => void }) => (
    <article>
      <h3>{name}</h3>
      <button onClick={onSelect}>{ctaLabel} {name}</button>
    </article>
  ),
}));

// Capture the props the page passes into FunnelCheckoutModal so we can
// verify createIntent presence / submit dispatch behaviour.
let lastModalProps: {
  open: boolean;
  selected: { name: string; tierSlug: string; amount: number } | null;
  createIntent?: ((args: { email: string; fullName: string; phone: string }) => Promise<unknown>);
  onSubmit: (args: { fullName: string; email: string; phone: string }) => Promise<unknown>;
  onClose: () => void;
} | null = null;

vi.mock('../../src/components/funnel/FunnelCheckoutModal', () => ({
  default: (props: typeof lastModalProps) => {
    lastModalProps = props;
    if (!props || !props.open) return null;
    return (
      <div data-testid="checkout-modal" data-tier={props.selected?.tierSlug ?? ''}>
        <span>{props.selected?.name}</span>
        <button onClick={() => props.onClose()}>close-modal</button>
      </div>
    );
  },
}));

vi.mock('../../src/utils/funnelAnimations', () => ({
  useInView: () => ({ ref: { current: null }, inView: false }),
  useCountUp: (target: number) => target,
  useRevealOnScroll: () => undefined,
}));
vi.mock('../../src/lib/funnelSignups', () => ({
  submitFunnelInterest: (args: unknown) => submitFunnelInterestMock(args),
}));
vi.mock('../../src/lib/funnelCheckout', () => ({
  createPaymentIntent: (args: unknown) => createPaymentIntentMock(args),
}));
vi.mock('../../src/lib/stripe', () => ({
  isStripeConfigured: () => isStripeConfiguredMock(),
}));
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    rpc: (fn: string, args?: unknown) => supabaseRpcMock(fn, args),
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import GiveawayPage from '../../src/pages/Giveaway';

const ACTIVE = {
  id: 'g-1',
  title: 'Win an iPhone',
  prize_description: 'iPhone 16 Pro',
  description: null,
  image_url: 'https://example/prize.jpg',
  ends_at: '2030-12-31T23:59:59Z',
  winner_count: 1,
  type: 'cash',
  status: 'active',
};

function renderPage() {
  return render(
    <MemoryRouter>
      <GiveawayPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  supabaseRpcMock.mockReset();
  supabaseRpcMock.mockResolvedValue({ data: [ACTIVE], error: null });
  submitFunnelInterestMock.mockReset();
  createPaymentIntentMock.mockReset();
  isStripeConfiguredMock.mockReturnValue(false);
  lastModalProps = null;
});

describe('Giveaway', () => {
  it('renders three package tiers (entry / silver / gold)', async () => {
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.entry.name' }));
    expect(screen.getByRole('heading', { name: 'giveawayFunnel.packages.silver.name' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'giveawayFunnel.packages.gold.name' })).toBeInTheDocument();
  });

  it('uses the prize_description from the RPC as the prize name', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /iPhone 16 Pro/i })).toBeInTheDocument();
    });
  });

  it('falls back to a translation key when the RPC returns no active giveaway', async () => {
    supabaseRpcMock.mockResolvedValue({ data: [], error: null });
    renderPage();
    // Eventually render with fallback prize key
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'giveawayFunnel.fallbackPrize' })).toBeInTheDocument();
    });
  });

  it('survives an RPC error without crashing the page', async () => {
    supabaseRpcMock.mockResolvedValue({ data: null, error: { message: 'rpc broken' } });
    renderPage();
    // The fallback prize text + packages still render
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.fallbackPrize' }));
    expect(screen.getByRole('heading', { name: 'giveawayFunnel.packages.entry.name' })).toBeInTheDocument();
  });

  it('opens the checkout modal pre-populated with the chosen tier', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.silver.name' }));

    await user.click(screen.getByRole('button', { name: /giveawayFunnel.ctaSelect giveawayFunnel.packages.silver.name/ }));

    const modal = await screen.findByTestId('checkout-modal');
    expect(modal).toHaveAttribute('data-tier', 'silver');
  });

  it('closes the modal when onClose fires', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.entry.name' }));

    await user.click(screen.getByRole('button', { name: /giveawayFunnel.ctaSelect giveawayFunnel.packages.entry.name/ }));
    await user.click(await screen.findByText('close-modal'));
    expect(screen.queryByTestId('checkout-modal')).not.toBeInTheDocument();
  });

  it('toggles the "view full inclusions" panel', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.entry.name' }));

    const toggle = screen.getByRole('button', { name: /giveawayFunnel.inclusionsShow/ });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await user.click(toggle);
    // Re-query after re-render
    expect(
      screen.getByRole('button', { name: /giveawayFunnel.inclusionsHide/ }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('omits the createIntent prop when Stripe is not configured', async () => {
    const user = userEvent.setup();
    isStripeConfiguredMock.mockReturnValue(false);
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.gold.name' }));

    await user.click(screen.getByRole('button', { name: /giveawayFunnel.ctaSelect giveawayFunnel.packages.gold.name/ }));
    expect(lastModalProps?.createIntent).toBeUndefined();
  });

  it('passes a createIntent prop when Stripe is configured and the modal is open', async () => {
    const user = userEvent.setup();
    isStripeConfiguredMock.mockReturnValue(true);
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.gold.name' }));

    await user.click(screen.getByRole('button', { name: /giveawayFunnel.ctaSelect giveawayFunnel.packages.gold.name/ }));
    expect(typeof lastModalProps?.createIntent).toBe('function');

    // Invoke it and confirm it routes to createPaymentIntent
    createPaymentIntentMock.mockResolvedValue({
      ok: true, clientSecret: 'cs_x', paymentIntentId: 'pi_x',
    });
    const result = await lastModalProps!.createIntent!({
      email: 'a@b.co', fullName: 'A B', phone: '+1234',
    });
    expect(createPaymentIntentMock).toHaveBeenCalledWith(expect.objectContaining({
      funnel: 'giveaway', tierSlug: 'gold', email: 'a@b.co', fullName: 'A B', phone: '+1234',
      giveawayId: 'g-1',
    }));
    expect(result).toEqual({ ok: true, clientSecret: 'cs_x', paymentIntentId: 'pi_x' });
  });

  it('routes onSubmit through submitFunnelInterest and propagates the duplicate flag', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.entry.name' }));

    await user.click(screen.getByRole('button', { name: /giveawayFunnel.ctaSelect giveawayFunnel.packages.entry.name/ }));

    submitFunnelInterestMock.mockResolvedValue({ ok: true, duplicate: true });
    const r = await lastModalProps!.onSubmit({
      fullName: 'Eve', email: 'e@e.co', phone: '',
    });
    expect(submitFunnelInterestMock).toHaveBeenCalledWith(expect.objectContaining({
      email: 'e@e.co', fullName: 'Eve', phone: '', funnel: 'giveaway',
      tierSlug: 'entry', giveawayId: 'g-1',
    }));
    expect(r).toEqual({ ok: true, duplicate: true });
  });

  it('returns ok=false from onSubmit when submitFunnelInterest fails', async () => {
    const user = userEvent.setup();
    renderPage();
    await waitFor(() => screen.getByRole('heading', { name: 'giveawayFunnel.packages.entry.name' }));
    await user.click(screen.getByRole('button', { name: /giveawayFunnel.ctaSelect giveawayFunnel.packages.entry.name/ }));

    submitFunnelInterestMock.mockResolvedValue({ ok: false, error: 'down' });
    const r = await lastModalProps!.onSubmit({ fullName: 'x', email: 'x@x.co', phone: '' });
    expect(r).toEqual({ ok: false, error: 'down' });
  });

  it('renders the FAQ with all 10 questions', async () => {
    renderPage();
    await waitFor(() => screen.getByTestId('funnel-faq'));
    expect(screen.getByTestId('funnel-faq')).toHaveAttribute('data-count', '10');
  });
});
