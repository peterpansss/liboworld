/**
 * Global Vitest setup for the web app suite.
 *
 *  - Stubs the Supabase env vars (Vite's import.meta.env)
 *  - Pulls in @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 *  - Cleans up the rendered DOM after every test
 *  - Provides jsdom-friendly polyfills for things components touch
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
