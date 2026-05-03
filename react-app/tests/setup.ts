/**
 * Global test setup for the admin React app.
 *
 * Stubs the Supabase env vars so any import of `lib/supabase.ts` that
 * eagerly reads `import.meta.env` doesn't crash in node.
 */
import { afterEach, vi } from 'vitest';

// Vite's import.meta.env shim. Using vi.stubEnv keeps it under vitest control.
vi.stubEnv('VITE_SUPABASE_URL', 'http://test.local');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');

afterEach(() => {
  vi.restoreAllMocks();
});
