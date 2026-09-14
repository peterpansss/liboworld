/**
 * Tests for src/pages/BlogPost.tsx — single-article view.
 *
 * Covered branches:
 *   - missing slug → 404 fallback
 *   - first article → no prev link, has next
 *   - last article → has prev, no next
 *   - middle article → both prev/next + related-link rendering
 *   - article with heroImage vs without
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

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
// Key passthrough that still exercises the component's i18n contract:
//  - `defaultValue` wins when supplied (category labels fall back to the raw
//    category name when no `blog.categories.*` key exists)
//  - `count` renders as `key:<count>`
//  - any other interpolation values are appended as `key:<value>` so the
//    data the page passes in (e.g. the author) is still observable.
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (!opts) return key;
      if (typeof opts.defaultValue === 'string') return opts.defaultValue;
      if ('count' in opts) return `${key}:${String(opts.count)}`;
      const values = Object.values(opts).map(String);
      return values.length ? `${key}:${values.join(',')}` : key;
    },
    i18n: { language: 'en' },
  }),
}));

vi.mock('../../src/data/blog', () => ({
  blogArticles: [
    {
      slug: 'first-post',
      title: 'First Post',
      excerpt: 'first',
      category: 'Training',
      readTime: 3,
      date: '2026-01-01',
      author: 'Author A',
      heroEmoji: '\u{1F4AA}',
      heroImage: '/img/first.jpg',
      content: '<p>FIRST CONTENT</p>',
      relatedExercises: ['barbell-bench-press'],
      relatedPrograms: ['push-pull-legs'],
    },
    {
      slug: 'middle-post',
      title: 'Middle Post',
      excerpt: 'mid',
      category: 'Nutrition',
      readTime: 4,
      date: '2026-02-01',
      author: 'Author B',
      heroEmoji: '\u{1F957}',
      content: '<p>MID CONTENT</p>',
    },
    {
      slug: 'last-post',
      title: 'Last Post',
      excerpt: 'last',
      category: 'Lifestyle',
      readTime: 5,
      date: '2026-03-01',
      author: 'Author C',
      heroEmoji: '\u{1F30A}',
      content: '<p>LAST CONTENT</p>',
    },
  ],
}));

import BlogPost from '../../src/pages/BlogPost';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/blog/:slug" element={<BlogPost />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('BlogPost', () => {
  it('renders the 404 fallback for an unknown slug', () => {
    renderAt('/blog/does-not-exist');
    expect(screen.getByRole('heading', { name: 'blogPost.notFoundTitle' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'blogPost.backToBlog' })).toHaveAttribute('href', '/blog');
  });

  it('renders the first article with a hero image, no previous link, but a next link', () => {
    renderAt('/blog/first-post');
    expect(screen.getByRole('heading', { level: 1, name: 'First Post' })).toBeInTheDocument();
    // Hero image is the article title alt text
    expect(screen.getByAltText('First Post')).toHaveAttribute('src', '/img/first.jpg');

    // Body content rendered via dangerouslySetInnerHTML
    expect(screen.getByText('FIRST CONTENT')).toBeInTheDocument();

    // Author / metadata (author is interpolated into blogPost.writtenBy)
    expect(screen.getByText('blogPost.writtenBy:Author A')).toBeInTheDocument();
    expect(screen.getByText('blogPost.minRead:3')).toBeInTheDocument();

    // Related links: relatedExercises and relatedPrograms both rendered
    expect(screen.getByRole('link', { name: /Barbell Bench Press/ }))
      .toHaveAttribute('href', '/exercises/barbell-bench-press');
    // Programs are served under /workouts/:id (the old /programs routes are gone)
    expect(screen.getByRole('link', { name: /Push Pull Legs/ }))
      .toHaveAttribute('href', '/workouts/push-pull-legs');

    // Next link present, prev link absent
    expect(screen.getByText('Middle Post')).toBeInTheDocument();
    expect(screen.queryByText(/blogPost\.previous/)).not.toBeInTheDocument();
  });

  it('renders the middle article with both prev and next nav links', () => {
    renderAt('/blog/middle-post');
    expect(screen.getByRole('heading', { level: 1, name: 'Middle Post' })).toBeInTheDocument();
    // No heroImage → emoji fallback
    expect(screen.getAllByTestId('emoji').length).toBeGreaterThan(0);

    expect(screen.getByText('First Post')).toBeInTheDocument();
    expect(screen.getByText('Last Post')).toBeInTheDocument();
    expect(screen.getByText('blogPost.previous', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('blogPost.next', { exact: false })).toBeInTheDocument();
  });

  it('renders the last article with a previous link and no next link', () => {
    renderAt('/blog/last-post');
    expect(screen.getByRole('heading', { level: 1, name: 'Last Post' })).toBeInTheDocument();
    expect(screen.getByText('Middle Post')).toBeInTheDocument();
    expect(screen.queryByText(/blogPost\.next/)).not.toBeInTheDocument();
  });

  it('links the category breadcrumb to the filtered blog index', () => {
    renderAt('/blog/middle-post');
    expect(screen.getByRole('link', { name: 'Nutrition' }))
      .toHaveAttribute('href', '/blog?cat=Nutrition');
  });

  it('renders the CTA banner with the onboarding link', () => {
    renderAt('/blog/first-post');
    expect(screen.getByRole('link', { name: 'blogPost.ctaButton' }))
      .toHaveAttribute('href', '/onboarding');
  });
});
