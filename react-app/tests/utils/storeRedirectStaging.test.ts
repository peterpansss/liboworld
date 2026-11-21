import { afterEach, expect, it, vi } from 'vitest';

afterEach(() => vi.unstubAllEnvs());

it('keeps staged store buttons on the test site', async () => {
  vi.stubEnv('VITE_BUILD_TARGET', 'staging-test');
  vi.resetModules();
  const { STORE_URLS, storeUrlFor, storeUrlWithSource } = await import('../../src/utils/storeRedirect');
  expect(STORE_URLS.ios).toBe('/#hero-capture');
  expect(STORE_URLS.android).toBe('/#hero-capture');
  expect(storeUrlFor('ios')).toBe('/#hero-capture');
  expect(storeUrlWithSource('android', 'campaign')).toBe('/#hero-capture');
});
