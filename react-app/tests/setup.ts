/**
 * Global Vitest setup for the web app suite.
 *
 *  - Stubs the Supabase env vars (Vite's import.meta.env) BEFORE any
 *    test file imports `src/lib/supabase`. That module throws at load
 *    time if the env vars are missing, so the stubs must be in place
 *    when the import is resolved. Vitest runs setupFiles before test
 *    files, which guarantees this ordering.
 *  - Pulls in @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 *  - Cleans up the rendered DOM after every test
 *  - Provides jsdom-friendly polyfills for things components touch
 *
 * Note: `vi.restoreAllMocks()` (called in afterEach) does NOT undo
 * `vi.stubEnv`, so the supabase env stubs persist for every test.
 * Tests that need to assert behaviour when env vars are missing should
 * use `vi.stubEnv(name, undefined)` + `vi.resetModules()` locally and
 * call `vi.unstubAllEnvs()` to restore the global defaults afterwards.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

vi.stubEnv('VITE_SUPABASE_URL', 'http://test.local');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

if (!('randomUUID' in (globalThis.crypto ?? {}))) {
  Object.defineProperty(globalThis.crypto ?? {}, 'randomUUID', {
    value: () => 'test-uuid-' + Math.random().toString(36).slice(2),
  });
}
