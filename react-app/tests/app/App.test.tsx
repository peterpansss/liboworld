/**
 * Coverage for src/App.tsx.
 *
 * App uses <BrowserRouter>, which reads location from window.history. We
 * therefore push a URL with history.replaceState before each render and let
 * BrowserRouter pick it up. Every page component is mocked with a tiny stub
 * so we can verify which Route resolved without dragging the full page
 * (Supabase, Stripe, lazy bundles) into the test.
 *
 * We exercise:
 *   - every static and dynamic route declared in App.tsx
 *   - the catch-all "*" route which redirects unknown paths to "/"
 *   - the ScrollToTop side effect (window.scrollTo on route change)
 *   - that lazy-loaded routes resolve through Suspense
 */
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';

// ---- Page mocks. Each one renders a unique marker we can assert on. -----

vi.mock('../../src/pages/Landing', () => ({ default: () => <div data-testid="page-landing" /> }));
vi.mock('../../src/pages/Onboarding', () => ({
  default: () => <div data-testid="page-onboarding" />,
}));
vi.mock('../../src/pages/ExerciseLibrary', () => ({
  default: () => <div data-testid="page-exercises" />,
}));
vi.mock('../../src/pages/ExerciseDetail', () => ({
  default: () => <div data-testid="page-exercise-detail" />,
}));
vi.mock('../../src/pages/ProgramLibrary', () => ({
  default: () => <div data-testid="page-programs" />,
}));
vi.mock('../../src/pages/ProgramDetail', () => ({
  default: () => <div data-testid="page-program-detail" />,
}));
vi.mock('../../src/pages/Blog', () => ({ default: () => <div data-testid="page-blog" /> }));
vi.mock('../../src/pages/BlogPost', () => ({
  default: () => <div data-testid="page-blog-post" />,
}));
vi.mock('../../src/pages/Privacy', () => ({ default: () => <div data-testid="page-privacy" /> }));
vi.mock('../../src/pages/Terms', () => ({ default: () => <div data-testid="page-terms" /> }));
vi.mock('../../src/pages/Rules', () => ({ default: () => <div data-testid="page-rules" /> }));
vi.mock('../../src/pages/AuthCallback', () => ({
  default: () => <div data-testid="page-auth-cb" />,
}));
vi.mock('../../src/pages/Giveaway', () => ({
  default: () => <div data-testid="page-giveaway" />,
}));
vi.mock('../../src/pages/CashChallenge', () => ({
  default: () => <div data-testid="page-cash-challenge" />,
}));
vi.mock('../../src/pages/GetApp', () => ({ default: () => <div data-testid="page-getapp" /> }));
vi.mock('../../src/pages/admin/AdminLayout', () => ({
  default: () => <div data-testid="page-admin" />,
}));

import App from '../../src/App';

// Reset URL between tests so BrowserRouter picks up the right path.
function gotoUrl(url: string) {
  window.history.replaceState({}, '', url);
}

beforeEach(() => {
  // Default to "/" before each test to give us a clean slate.
  gotoUrl('/');
  // jsdom does not implement window.scrollTo. Silence the harmless
  // "Not implemented" noise in stderr without hiding errors elsewhere.
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Top-level static routes', () => {
  it.each([
    ['/', 'page-landing'],
    ['/onboarding', 'page-onboarding'],
  ])('renders %s -> %s (eager-loaded, no suspense delay)', (path, marker) => {
    gotoUrl(path);
    render(<App />);
    expect(screen.getByTestId(marker)).toBeInTheDocument();
  });
});

describe('Lazy-loaded routes', () => {
  it.each([
    ['/exercises', 'page-exercises'],
    ['/exercises/abc-123', 'page-exercise-detail'],
    ['/workouts', 'page-programs'],
    ['/workouts/program-foo', 'page-program-detail'],
    ['/blog', 'page-blog'],
    ['/blog/welcome', 'page-blog-post'],
    ['/privacy', 'page-privacy'],
    ['/terms', 'page-terms'],
    ['/rules', 'page-rules'],
    ['/auth/callback', 'page-auth-cb'],
    ['/giveaway', 'page-giveaway'],
    ['/cash-challenge', 'page-cash-challenge'],
    ['/get-app', 'page-getapp'],
    ['/admin', 'page-admin'],
    ['/admin/users', 'page-admin'],
  ])('renders %s -> %s', async (path, marker) => {
    gotoUrl(path);
    render(<App />);
    await waitFor(() => expect(screen.getByTestId(marker)).toBeInTheDocument());
  });
});

describe('Catch-all redirect', () => {
  it('redirects an unknown path to "/" (Landing renders)', async () => {
    gotoUrl('/this-path-does-not-exist');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('page-landing')).toBeInTheDocument());
    // After redirect the URL should be /
    expect(window.location.pathname).toBe('/');
  });

  it('redirects /admin/this/is/deep deep paths within /admin/* into AdminLayout (does NOT hit catch-all)', async () => {
    gotoUrl('/admin/users/edit/42');
    render(<App />);
    await waitFor(() => expect(screen.getByTestId('page-admin')).toBeInTheDocument());
    // path should not be rewritten to /
    expect(window.location.pathname).toBe('/admin/users/edit/42');
  });
});

describe('ScrollToTop side effect', () => {
  it('invokes window.scrollTo(0, 0) when the path changes', async () => {
    const scrollSpy = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    gotoUrl('/');
    const { rerender } = render(<App />);
    expect(scrollSpy).toHaveBeenCalled();
    scrollSpy.mockClear();

    // Change route by mutating the URL and rerendering inside an act so
    // BrowserRouter / our ScrollToTop pick the change up.
    await act(async () => {
      gotoUrl('/onboarding');
      // Trigger a popstate so BrowserRouter notices the location change.
      window.dispatchEvent(new PopStateEvent('popstate'));
      rerender(<App />);
    });
    expect(scrollSpy).toHaveBeenCalled();
  });
});
