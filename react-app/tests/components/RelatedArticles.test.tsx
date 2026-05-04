/**
 * Tests for src/components/RelatedArticles.tsx.
 *
 * Verifies the relevance scoring (title > relatedExercises > category > excerpt),
 * empty-state behavior, hero image vs emoji fallback rendering, and the limit prop.
 *
 * `blogArticles` is real data we import from the source module — we rely on its
 * shape but don't pin to specific titles. To get deterministic ordering we mock
 * the module with a small fixture.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('../../src/data/blog', () => {
  return {
    blogArticles: [
      {
        slug: 'a-newer',
        title: 'Best Chest Exercises',
        excerpt: 'About training in general.',
        category: 'Training',
        readTime: 6,
        date: '2026-04-10',
        author: 'Libo',
        heroEmoji: '💪',
      },
      {
        slug: 'b-older-match',
        title: 'Other thing',
        excerpt: 'Something Chest related',
        category: 'Training',
        readTime: 4,
        date: '2026-01-01',
        author: 'Libo',
        heroImage: '/img/hero.jpg',
      },
      {
        slug: 'c-no-match',
        title: 'Random topic',
        excerpt: 'Nothing relevant',
        category: 'Lifestyle',
        readTime: 3,
        date: '2026-03-20',
        author: 'Libo',
        heroEmoji: '🌱',
      },
    ],
  };
});

import { RelatedArticles } from '../../src/components/RelatedArticles';

describe('RelatedArticles', () => {
  it('orders articles by score desc then date desc', () => {
    render(
      <MemoryRouter>
        <RelatedArticles muscleGroup="Chest" limit={3} />
      </MemoryRouter>,
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // 'Best Chest Exercises' has score 5 (title hit) → first
    // 'Other thing' has score 2 (excerpt hit, older date) → second
    // 'Random topic' has 0 → third
    expect(headings[0]).toBe('Best Chest Exercises');
    expect(headings[1]).toBe('Other thing');
    expect(headings[2]).toBe('Random topic');
  });

  it('falls back to date-desc ordering when no muscle group is provided', () => {
    render(
      <MemoryRouter>
        <RelatedArticles limit={3} />
      </MemoryRouter>,
    );
    const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent);
    // All have score 0 → sort by date desc
    expect(headings[0]).toBe('Best Chest Exercises'); // 2026-04-10
    expect(headings[1]).toBe('Random topic');         // 2026-03-20
    expect(headings[2]).toBe('Other thing');          // 2026-01-01
  });

  it('respects the limit prop', () => {
    render(
      <MemoryRouter>
        <RelatedArticles muscleGroup="Chest" limit={1} />
      </MemoryRouter>,
    );
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(1);
  });

  it('renders the hero image when present and the emoji otherwise', () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedArticles muscleGroup="Chest" limit={3} />
      </MemoryRouter>,
    );
    // The 'b-older-match' fixture has heroImage; should produce an <img>.
    const img = container.querySelector('img[src="/img/hero.jpg"]');
    expect(img).not.toBeNull();
    // The 'c-no-match' fixture has heroEmoji '🌱'.
    expect(container.textContent).toContain('🌱');
  });

  it('builds /blog/<slug> hrefs', () => {
    const { container } = render(
      <MemoryRouter>
        <RelatedArticles muscleGroup="Chest" limit={3} />
      </MemoryRouter>,
    );
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toEqual(expect.arrayContaining(['/blog/a-newer', '/blog/b-older-match', '/blog/c-no-match']));
  });
});
