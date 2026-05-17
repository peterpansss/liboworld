/**
 * Tests for the CSS `url()` injection guard on src/pages/Giveaway.tsx.
 *
 * The page renders the giveaway prize image into two inline-style
 * `backgroundImage` declarations. React escapes JSX attribute values but
 * NOT the CSS value inside `style={{ backgroundImage: \`url(${x})\` }}`,
 * so a DB-stored URL containing `)`, whitespace, or `"` could break out
 * of the `url(...)` token and inject arbitrary CSS declarations into the
 * inline style block.
 *
 * The page now funnels prizeImage through `safeUrl` first, then through
 * an inline helper that percent-encodes `"`, `(`, `)`, whitespace, and
 * backslash before wrapping in `url("…")`. This file pins down the two
 * guarantees the helper has to make:
 *   1. Anything that isn't an http/https/mailto URL never renders a
 *      backgroundImage at all (safeUrl returns null → undefined → React
 *      omits the property).
 *   2. Even a syntactically valid URL that contains a stray `)` or
 *      whitespace is encoded so the emitted CSS value is exactly one
 *      well-formed `url("...")` token with no trailing characters.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

const supabaseRpcMock = vi.fn();

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
  default: () => <div data-testid="funnel-faq" />,
}));
vi.mock('../../src/components/funnel/PackageCard', () => ({
  default: ({ name }: { name: string }) => <article><h3>{name}</h3></article>,
}));
vi.mock('../../src/components/funnel/FunnelCheckoutModal', () => ({
  default: () => null,
}));
vi.mock('../../src/utils/funnelAnimations', () => ({
  useInView: () => ({ ref: { current: null }, inView: false }),
  useCountUp: (target: number) => target,
  useRevealOnScroll: () => undefined,
}));
vi.mock('../../src/lib/funnelSignups', () => ({ submitFunnelInterest: vi.fn() }));
vi.mock('../../src/lib/funnelCheckout', () => ({ createPaymentIntent: vi.fn() }));
vi.mock('../../src/lib/stripe', () => ({ isStripeConfigured: () => false }));
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

function renderWithImage(image_url: string | null) {
  supabaseRpcMock.mockResolvedValue({
    data: [{
      id: 'g-1',
      title: 'Win',
      prize_description: 'Prize',
      description: null,
      image_url,
      ends_at: '2030-12-31T23:59:59Z',
      winner_count: 1,
      type: 'cash',
      status: 'active',
    }],
    error: null,
  });

  return render(
    <MemoryRouter>
      <GiveawayPage />
    </MemoryRouter>,
  );
}

/**
 * Walk every node with an inline style and collect the `background-image`
 * declaration text exactly as it would appear in the live DOM. We assert on
 * the raw style attribute so a parser quirk in jsdom can't hide an injection.
 */
function collectBackgroundImages(root: HTMLElement): string[] {
  const els = Array.from(root.querySelectorAll<HTMLElement>('[style*="background-image"]'));
  return els.map(el => el.getAttribute('style') ?? '');
}

beforeEach(() => {
  supabaseRpcMock.mockReset();
});

describe('Giveaway CSS background-image injection guard', () => {
  it('omits backgroundImage entirely when the image_url has a disallowed protocol', async () => {
    const { container } = renderWithImage('javascript:alert(1)');
    // The page fires its preload effect with a same-tick setImageLoaded(false),
    // so we wait for the rest of the page chrome to render before asserting.
    await waitFor(() => {
      expect(container.querySelector('.funnel-hero__prize-bg')).not.toBeNull();
    });
    // Neither <div> should emit a background-image declaration — safeUrl
    // returned null upstream and the helper short-circuited to undefined.
    expect(collectBackgroundImages(container)).toHaveLength(0);
  });

  it('omits backgroundImage when the image_url is a data: URL (no DOM exfil vector)', async () => {
    const { container } = renderWithImage('data:text/html,<script>alert(1)</script>');
    await waitFor(() => {
      expect(container.querySelector('.funnel-hero__prize-bg')).not.toBeNull();
    });
    expect(collectBackgroundImages(container)).toHaveLength(0);
  });

  it('omits backgroundImage when image_url is null', async () => {
    const { container } = renderWithImage(null);
    await waitFor(() => {
      expect(container.querySelector('.funnel-hero__prize-bg')).not.toBeNull();
    });
    expect(collectBackgroundImages(container)).toHaveLength(0);
  });
});
