/**
 * Coverage for src/lib/supabase.ts.
 *
 * The module's contract is small but security-sensitive: it must throw
 * at load time if either env var is missing rather than silently
 * connecting to a hardcoded fallback. These tests use vi.stubEnv +
 * vi.resetModules so we can re-import the module under different env
 * conditions without polluting other tests (vi.unstubAllEnvs in
 * afterEach restores the globals set in tests/setup.ts).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  // Restore the globally-stubbed env vars from tests/setup.ts so
  // subsequent tests in the same worker still see them.
  vi.unstubAllEnvs();
  vi.stubEnv('VITE_SUPABASE_URL', 'http://test.local');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key');
  vi.resetModules();
});

describe('lib/supabase', () => {
  it('exports a configured client when both env vars are set', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'example-anon-key');
    const mod = await import('../../src/lib/supabase');
    expect(mod.supabase).toBeDefined();
    expect(typeof mod.supabase.from).toBe('function');
  });

  it('throws when VITE_SUPABASE_URL is missing', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'example-anon-key');
    await expect(import('../../src/lib/supabase')).rejects.toThrow(
      /VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set/
    );
  });

  it('throws when VITE_SUPABASE_ANON_KEY is missing', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    await expect(import('../../src/lib/supabase')).rejects.toThrow(
      /VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set/
    );
  });

  it('throws when both env vars are missing', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    await expect(import('../../src/lib/supabase')).rejects.toThrow(
      /VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set/
    );
  });

  it('infra/supabase re-export delegates to the same client', async () => {
    vi.resetModules();
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'example-anon-key');
    const direct = await import('../../src/lib/supabase');
    const reexport = await import('../../src/lib/infra/supabase');
    expect(reexport.supabase).toBe(direct.supabase);
  });
});
