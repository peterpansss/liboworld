/**
 * Tests for src/pages/Landing.tsx — the relaunch home page.
 *
 * The page was rebuilt for the site relaunch (prelaunch waitlist). The old
 * App Store badges, "See plans" anchor, QR closer, community constellation,
 * blog-preview row and FAQ accordion no longer exist, so this suite covers
 * the structure that replaced them:
 *   - Hero promise + the FREE waitlist capture under #hero-capture, with a
 *     second capture in the bottom #waitlist block (the ids the site header
 *     and funnels deep-link to)
 *   - Community rail: one captioned photo per beta member
 *   - Cash-challenge grid: one card per CHALLENGE_TIERS entry
 *   - "Everything you get": the feature list drives the phone + pager dots
 *   - Guides row + "See all posts" link into /blog
 *   - #hash arrivals scroll to the in-page anchor
 *
 * Heavy/side-effectful children (SiteNav, SiteFooter, SeoHead, the waitlist
 * captures, the video testimonial wall) are stubbed — they have their own
 * suites. react-i18next returns the key so assertions don't depend on the
 * locale bundles' copy (relaunchAcceptance.test.tsx asserts on real copy).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

// jsdom doesn't ship IntersectionObserver; usePopIn / useScrollProgress only
// need the constructor to exist.
class IOStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds: number[] = [];
}
(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = IOStub;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/components/SeoHead', () => ({ SeoHead: () => null }));
vi.mock('../../src/components/WaitlistCapture', () => ({
  default: ({ variant }: { variant?: string }) => (
    <form data-testid={`waitlist-capture-${variant ?? 'final'}`} />
  ),
}));
vi.mock('../../src/components/HomeStickyWaitlist', () => ({
  default: () => <div data-testid="home-sticky-waitlist" />,
}));
vi.mock('../../src/components/VideoTestimonials', () => ({
  default: () => <div data-testid="video-testimonials" />,
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import Landing from '../../src/pages/Landing';
import { CHALLENGE_TIERS } from '../../src/data/challengeTiers';

function renderPage(path = '/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Landing />
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  it('renders the hero promise with the free waitlist capture under #hero-capture', () => {
    const { container } = renderPage();
    const h1 = screen.getByRole('heading', { level: 1 });
    for (const key of ['h1a', 'h1b', 'h1c', 'h1d']) {
      expect(within(h1).getByText(`relaunchHome.hero.${key}`)).toBeInTheDocument();
    }
    const heroAnchor = container.querySelector('#hero-capture');
    expect(heroAnchor).not.toBeNull();
    expect(
      within(heroAnchor as HTMLElement).getByTestId('waitlist-capture-hero'),
    ).toBeInTheDocument();
  });

  it('ends with a second waitlist capture in the #waitlist block the funnels link to', () => {
    const { container } = renderPage();
    const finalBlock = container.querySelector('section#waitlist');
    expect(finalBlock).not.toBeNull();
    expect(
      within(finalBlock as HTMLElement).getByTestId('waitlist-capture-final'),
    ).toBeInTheDocument();
    // Exactly two inline captures on the page (hero + final), plus the sticky bar.
    expect(screen.getAllByTestId(/^waitlist-capture-/)).toHaveLength(2);
    expect(screen.getByTestId('home-sticky-waitlist')).toBeInTheDocument();
  });

  it('renders the community rail with one captioned photo per member', () => {
    renderPage();
    const rail = screen.getByRole('group', { name: 'relaunchHome.community.railLabel' });
    const members = rail.querySelectorAll('figure.rh-member');
    expect(members).toHaveLength(5);
    // m5 (Tony) was replaced by m6 (Ken) on 20 Sep 2026, and Ken's photo is a
    // .jpg frame from his own filmed testimonial rather than a beta headshot.
    for (const i of [1, 2, 3, 4, 6]) {
      const name = `relaunchHome.community.m${i}Name`;
      expect(within(rail).getByAltText(name)).toHaveAttribute(
        'src',
        expect.stringMatching(/^\/beta-.+\.(png|jpg)$/),
      );
      expect(within(rail).getByText(`relaunchHome.community.m${i}Meta`)).toBeInTheDocument();
    }
  });

  it('renders one cash-challenge card per tier, linking to its funnel', () => {
    const { container } = renderPage();
    const cards = container.querySelectorAll<HTMLAnchorElement>('a.rh-cc-card');
    expect(cards).toHaveLength(CHALLENGE_TIERS.length);
    CHALLENGE_TIERS.forEach((tier, i) => {
      expect(cards[i]).toHaveAttribute('href', `/cash-challenges/${tier.slug}`);
      expect(within(cards[i]).getByText(`€${tier.payout}`)).toBeInTheDocument();
      expect(within(cards[i]).getByText(tier.name)).toBeInTheDocument();
    });
  });

  it('switches the featured phone screen when a feature card is clicked', async () => {
    const user = userEvent.setup();
    const { container } = renderPage();
    expect(container.querySelectorAll('button.rh-feature')).toHaveLength(6);
    // Default is feature 04 (Progress tracking).
    const progress = screen.getByRole('button', { name: /relaunchHome\.library\.c4Name/ });
    expect(progress).toHaveAttribute('aria-pressed', 'true');
    const dots = screen.getAllByRole('tab');
    expect(dots).toHaveLength(6);
    expect(dots[3]).toHaveAttribute('aria-selected', 'true');

    const library = screen.getByRole('button', { name: /relaunchHome\.library\.c1Name/ });
    await user.click(library);
    expect(library).toHaveAttribute('aria-pressed', 'true');
    expect(progress).toHaveAttribute('aria-pressed', 'false');
    expect(dots[0]).toHaveAttribute('aria-selected', 'true');
    expect(dots[3]).toHaveAttribute('aria-selected', 'false');

    // The pager dots drive the same state.
    await user.click(dots[5]);
    expect(screen.getByRole('button', { name: /relaunchHome\.library\.c6Name/ }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(library).toHaveAttribute('aria-pressed', 'false');
  });

  it('renders the three guide cards and the "See all posts" link into /blog', () => {
    const { container } = renderPage();
    const guides = container.querySelectorAll<HTMLAnchorElement>('a.rh-guide-card');
    expect(guides).toHaveLength(3);
    guides.forEach((card, i) => {
      expect(card).toHaveAttribute('href', '/blog');
      expect(within(card).getByText(`relaunchHome.guides.p${i + 1}Title`)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: 'relaunchHome.guides.seeAll' }))
      .toHaveAttribute('href', '/blog');
  });

  it('scrolls to the in-page anchor when arriving with a #hash', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    renderPage('/#waitlist');
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    // Offset by the 72px sticky nav (getBoundingClientRect is 0 in jsdom).
    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: -72 }));
  });
});
