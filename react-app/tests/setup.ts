/**
 * Global test setup for liboworld/react-app Vitest.
 *
 * - Pulls in `@testing-library/jest-dom` matchers (toBeInTheDocument, etc).
 * - Stubs the env vars `lib/supabase.ts` reads at import time so tests that
 *   indirectly import it don't blow up.
 */
import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

process.env.VITE_SUPABASE_URL ||= 'http://test.local';
process.env.VITE_SUPABASE_ANON_KEY ||= 'test-anon-key';

afterEach(() => {
  vi.restoreAllMocks();
});
