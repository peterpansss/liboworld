/**
 * Tests for src/pages/Blog.tsx — public blog index.
 *
 * Behaviour to cover:
 *   - hero + breadcrumb render
 *   - category chip filter (defaults to All; clicking a chip filters the grid)
 *   - empty state when a category yields no articles
 *   - article cards link to /blog/:slug
 *
 * The blog data module is mocked with a small handcrafted set so we
 * don't depend on the real catalog (which would shift over time).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('../../src/components/SiteNav', () => ({
  default: () => <nav data-testid="site-nav" />,
}));
vi.mock('../../src/components/SiteFooter', () => ({
  default: () => <footer data-testid="site-footer" />,
}));
vi.mock('../../src/components/EmojiIcon', () => ({
  EmojiIcon: ({ emoji }: { emoji?: string }) => <span data-testid="emoji">{emoji ?? ''}</span>,
}));

// react-i18next: identity-translate so we can assert against actual key text.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && 'count' in opts) {
        return `${key}:${(opts as { count: number }).count}`;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../src/data/blog', () => ({
  blogArticles: [
    {
      slug: 'training-post',
      title: 'Training Post One',
      excerpt: 'Train hard.',
      category: 'Training',
      readTime: 5,
      date: '2026-01-15',
      author: 'Libo',
      heroEmoji: '\u{1F4AA}',
      heroImage: '/images/blog/train.jpg',
      content: '<p>x</p>',
    },
    {
      slug: 'nutrition-post',
      title: 'Nutrition Post One',
      excerpt: 'Eat well.',
      category: 'Nutrition',
      readTime: 4,
      date: '2026-02-15',
      author: 'Libo',
      heroEmoji: '\u{1F957}',
      content: '<p>y</p>',
    },
  ],
}));

import Blog from '../../src/pages/Blog';

function renderPage() {
  return render(
    <MemoryRouter>
      <Blog />
    </MemoryRouter>,
  );
}

describe('Blog', () => {
  it('renders the hero, breadcrumb, and both articles by default', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'blog.title' })).toBeInTheDocument();
    expect(screen.getByText('blog.subtitle')).toBeInTheDocument();
    expect(screen.getByText('Training Post One')).toBeInTheDocument();
    expect(screen.getByText('Nutrition Post One')).toBeInTheDocument();
  });

  it('renders article cards as links to /blog/:slug', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /Training Post One/ }))
      .toHaveAttribute('href', '/blog/training-post');
    expect(screen.getByRole('link', { name: /Nutrition Post One/ }))
      .toHaveAttribute('href', '/blog/nutrition-post');
  });

  it('marks the All chip as active on first render', () => {
    renderPage();
    const allChip = screen.getByRole('button', { name: 'blog.categories.all' });
    expect(allChip).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters the grid when a non-All category chip is clicked', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'blog.categories.training' }));

    expect(screen.getByText('Training Post One')).toBeInTheDocument();
    expect(screen.queryByText('Nutrition Post One')).not.toBeInTheDocument();
  });

  it('shows the empty state when a category has no articles', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'blog.categories.lifestyle' }));

    expect(screen.getByText('blog.empty')).toBeInTheDocument();
  });

  it('renders a hero image for articles that have one and an emoji for those that do not', () => {
    renderPage();
    // Training post has heroImage → <img>
    const img = screen.getByAltText('Training Post One');
    expect(img).toHaveAttribute('src', '/images/blog/train.jpg');

    // Nutrition post falls back to EmojiIcon
    const emojis = screen.getAllByTestId('emoji');
    expect(emojis.length).toBeGreaterThan(0);
  });

  it('formats the readTime + date metadata via i18n keys', () => {
    renderPage();
    // The mocked t() emits "blog.minRead:5" for the count interpolation
    expect(screen.getByText(/blog\.minRead:5/)).toBeInTheDocument();
    expect(screen.getByText(/blog\.minRead:4/)).toBeInTheDocument();
  });
});
