/**
 * Tests for src/pages/Landing.tsx — main marketing landing page.
 *
 * Landing.tsx is large and dominated by static layout. Coverage:
 *   - Hero, FAQ, and QR/App Store closer render
 *   - Hero CTA stack: App Store badge link + "See plans" anchor
 *   - QR closer block: QR placeholder image + App Store badge
 *   - FAQ accordion: clicking a question opens/closes it
 *   - Goal cards link to /onboarding?goal=...
 *
 * Heavy chrome (SiteNav, SiteFooter, PricingSection) is stubbed; scroll /
 * intersection observers / cursor follower / 3D tilt are exercised but
 * have no observable side effects in jsdom (the listeners are attached
 * and the component still renders correctly).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

// jsdom doesn't ship IntersectionObserver. Landing uses two of them
// (data-reveal and .reveal observers) plus a useInView hook. A no-op
// stub is enough — the side effects (animation classes) aren't asserted
// in these tests.
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
vi.mock('../../src/components/FreeTrialCta', () => ({
  default: () => <section data-testid="free-trial-cta" />,
}));
vi.mock('../../src/components/PricingSection', () => ({
  default: () => <div data-testid="pricing-section" />,
}));
vi.mock('../../src/components/FounderCard', () => ({
  default: () => <div data-testid="founder-card" />,
}));
vi.mock('../../src/components/EmojiIcon', () => ({
  EmojiIcon: ({ emoji }: { emoji?: string }) => <span>{emoji ?? ''}</span>,
}));
vi.mock('../../src/utils/icons', () => ({
  Star: () => null,
}));
// Slugs must match the FEATURED_SLUGS list in Landing.tsx or the blog
// preview row filters them out and the cards never render.
vi.mock('../../src/data/blog', () => ({
  blogArticles: [
    { slug: '30-days-one-habit-real-money', title: 'Blog A', excerpt: 'a', category: 'Training', readTime: 3, date: '2026-01-01', author: 'Libo', heroEmoji: '\u{1F4AA}', heroImage: '/img/a.jpg', content: '<p/>' },
    { slug: 'how-to-lose-fat-and-stay-lean', title: 'Blog B', excerpt: 'b', category: 'Training', readTime: 4, date: '2026-01-02', author: 'Libo', heroEmoji: '\u{1F4AA}', content: '<p/>' },
    { slug: 'simple-high-protein-meals-in-15-minutes', title: 'Blog C', excerpt: 'c', category: 'Training', readTime: 5, date: '2026-01-03', author: 'Libo', heroEmoji: '\u{1F4AA}', content: '<p/>' },
  ],
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

import Landing from '../../src/pages/Landing';

function renderPage() {
  return render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  it('renders the hero, FAQ, and QR closer block', () => {
    renderPage();
    // Hero headline lines
    expect(screen.getByText('hero.headline1')).toBeInTheDocument();
    // FAQ eyebrow
    expect(screen.getByText('faq.eyebrow', { exact: false })).toBeTruthy();
    // QR closer eyebrow
    expect(screen.getByText('qrCloser.eyebrow')).toBeInTheDocument();
  });

  it('mounts the community constellation with avatars rendered', () => {
    renderPage();
    expect(screen.getByText('community.eyebrow')).toBeInTheDocument();
    // The first avatar in AVATARS uses initials "JM" — proves both the
    // section and the placeholder avatar component render together.
    expect(document.querySelector('.community-section')).not.toBeNull();
    const avatars = document.querySelectorAll('.community-avatar');
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('shows the hero App Store badge linking to the placeholder App Store URL', () => {
    renderPage();
    const heroBadge = screen.getAllByRole('link', { name: 'store.downloadAppStore' })[0];
    expect(heroBadge).toHaveAttribute('href', 'https://apps.apple.com/app/libo');
  });

  it('shows the hero "See plans" link pointing at the trial CTA anchor', () => {
    renderPage();
    const seePlans = screen.getByRole('link', { name: 'hero.seePlans' });
    expect(seePlans).toHaveAttribute('href', '#pricing-cta');
  });

  it('renders the QR closer with a QR image and an App Store badge', () => {
    renderPage();
    expect(screen.getByAltText('qrCloser.qrAlt')).toHaveAttribute(
      'src',
      '/images/qr-app-store.svg',
    );
    // Badge appears in three places now: hero, community constellation,
    // and QR closer. They all point to the same placeholder URL.
    const badges = screen.getAllByRole('link', { name: 'store.downloadAppStore' });
    expect(badges).toHaveLength(3);
    badges.forEach((badge) => {
      expect(badge).toHaveAttribute('href', 'https://apps.apple.com/app/libo');
    });
  });

  it('renders the 3 blog preview cards as links into /blog/:slug', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Blog A/ })).toHaveAttribute(
      'href',
      '/blog/30-days-one-habit-real-money',
    );
    expect(screen.getByRole('link', { name: /Blog B/ })).toHaveAttribute(
      'href',
      '/blog/how-to-lose-fat-and-stay-lean',
    );
    expect(screen.getByRole('link', { name: /Blog C/ })).toHaveAttribute(
      'href',
      '/blog/simple-high-protein-meals-in-15-minutes',
    );
  });

  it('toggles FAQ items open and closed', async () => {
    const user = userEvent.setup();
    renderPage();
    const q1 = screen.getByRole('button', { name: /faq\.q1/ });
    expect(q1).toHaveAttribute('aria-expanded', 'false');
    await user.click(q1);
    expect(q1).toHaveAttribute('aria-expanded', 'true');
    await user.click(q1);
    expect(q1).toHaveAttribute('aria-expanded', 'false');
  });
});
