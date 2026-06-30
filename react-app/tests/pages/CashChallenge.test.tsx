/**
 * Tests for src/pages/CashChallenge.tsx — prize-led app-download funnel.
 *
 * RESERVE button orchestrates three side effects:
 *   1. logFunnelClick (anonymous, fire-and-forget)
 *   2. window.gtag event (when gtag is loaded)
 *   3. Platform routing — desktop opens overlay; mobile redirects
 *
 * The shared layout (SiteNav/Footer, FunnelHeader, PackageCard, FAQ,
 * StoreRedirectOverlay) is stubbed so we focus on the page's own logic.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

const logFunnelClickMock = vi.fn(() => Promise.resolve({ ok: true } as { ok: true }));
const detectPlatformMock = vi.fn<[], 'ios' | 'android' | 'desktop'>(() => 'desktop');
const redirectToStoreMock = vi.fn();

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
      <button onClick={onSelect}>{ctaLabel}</button>
    </article>
  ),
}));
vi.mock('../../src/components/funnel/StoreRedirectOverlay', () => ({
  default: ({ open, tierSlug, onClose }: { open: boolean; tierSlug: string | null; onClose: () => void }) =>
    open ? (
      <div data-testid="store-overlay" data-tier={tierSlug ?? ''}>
        <button onClick={onClose}>close-overlay</button>
      </div>
    ) : null,
}));
vi.mock('../../src/utils/funnelAnimations', () => ({
  useInView: () => ({ ref: { current: null }, inView: false }),
  useCountUp: (target: number) => target,
  useRevealOnScroll: () => undefined,
}));
vi.mock('../../src/lib/funnelSignups', () => ({
  logFunnelClick: (args: unknown) => logFunnelClickMock(args),
}));
vi.mock('../../src/utils/storeRedirect', () => ({
  detectPlatform: () => detectPlatformMock(),
  redirectToStore: (p: unknown) => redirectToStoreMock(p),
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import CashChallengePage from '../../src/pages/CashChallenge';

function renderPage() {
  return render(
    <MemoryRouter>
      <CashChallengePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  logFunnelClickMock.mockClear();
  detectPlatformMock.mockClear();
  redirectToStoreMock.mockClear();
  detectPlatformMock.mockReturnValue('desktop');
});

afterEach(() => {
  delete (window as Window & { gtag?: unknown }).gtag;
});

describe('CashChallenge', () => {
  it('renders the two launch challenge tier cards by name (Elite pool deferred)', () => {
    renderPage();
    // Names come back as i18n keys with the mocked t()
    expect(screen.getByRole('heading', { name: 'cashChallengeFunnel.tiers.starter.name' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'cashChallengeFunnel.tiers.pro_pool.name' })).toBeInTheDocument();
    // Elite is deferred at launch — the €50/100 pool lives in-app as a 2nd Pro
    // challenge, so the Elite-branded funnel card must not render.
    expect(
      screen.queryByRole('heading', { name: 'cashChallengeFunnel.tiers.elite_pool.name' })
    ).not.toBeInTheDocument();
  });

  it('opens the desktop QR overlay when RESERVE is clicked on desktop', async () => {
    const user = userEvent.setup();
    detectPlatformMock.mockReturnValue('desktop');
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'cashChallengeFunnel.ctaReserve' })[0]);
    const overlay = screen.getByTestId('store-overlay');
    expect(overlay).toHaveAttribute('data-tier', 'starter');
  });

  it('redirects straight to the App Store on iOS without opening the overlay', async () => {
    const user = userEvent.setup();
    detectPlatformMock.mockReturnValue('ios');
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'cashChallengeFunnel.ctaReserve' })[1]); // pro_pool
    expect(redirectToStoreMock).toHaveBeenCalledWith('ios');
    expect(screen.queryByTestId('store-overlay')).not.toBeInTheDocument();
  });

  it('redirects to Play Store on Android', async () => {
    const user = userEvent.setup();
    detectPlatformMock.mockReturnValue('android');
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'cashChallengeFunnel.ctaReserve' })[1]); // pro_pool
    expect(redirectToStoreMock).toHaveBeenCalledWith('android');
  });

  it('logs an anonymous click for the selected tier on every reserve press', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'cashChallengeFunnel.ctaReserve' })[0]);
    expect(logFunnelClickMock).toHaveBeenCalledWith({
      funnel: 'cash_challenge',
      tierSlug: 'starter',
    });
  });

  it('fires a Google Analytics event when window.gtag is defined', async () => {
    const user = userEvent.setup();
    const gtag = vi.fn();
    (window as Window & { gtag?: (...args: unknown[]) => void }).gtag = gtag;
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'cashChallengeFunnel.ctaReserve' })[1]);
    expect(gtag).toHaveBeenCalledWith('event', 'cash_challenge_app_redirect', {
      tier: 'pro_pool',
      tier_name: 'cashChallengeFunnel.tiers.pro_pool.name',
    });
  });

  it('closes the overlay when the close handler fires', async () => {
    const user = userEvent.setup();
    detectPlatformMock.mockReturnValue('desktop');
    renderPage();

    await user.click(screen.getAllByRole('button', { name: 'cashChallengeFunnel.ctaReserve' })[0]);
    expect(screen.getByTestId('store-overlay')).toBeInTheDocument();
    await user.click(screen.getByText('close-overlay'));
    expect(screen.queryByTestId('store-overlay')).not.toBeInTheDocument();
  });

  it('renders the FAQ list with all 8 questions', () => {
    renderPage();
    expect(screen.getByTestId('funnel-faq')).toHaveAttribute('data-count', '8');
  });
});
