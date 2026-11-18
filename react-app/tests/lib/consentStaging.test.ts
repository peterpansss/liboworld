import { afterEach, beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => {
  localStorage.clear();
  document.querySelectorAll('script').forEach((script) => script.remove());
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { fbq?: unknown }).fbq;
  vi.stubEnv('VITE_BUILD_TARGET', 'staging-test');
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

it('does not send staging traffic to production trackers even after Accept All', async () => {
  const consent = await import('../../src/lib/consent');
  expect(consent.getConsent()).toEqual(consent.DENY_ALL);

  consent.initConsent();
  consent.setConsent(consent.ACCEPT_ALL);
  consent.trackPageView('/test');
  consent.trackLead();

  expect(consent.hasConsent('analytics')).toBe(false);
  expect(consent.hasConsent('marketing')).toBe(false);
  expect(localStorage.getItem('libo-consent-v2')).toBeNull();
  expect(window.gtag).toBeUndefined();
  expect(window.fbq).toBeUndefined();
  expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
  expect(document.querySelector('script[src*="facebook.net"]')).toBeNull();
});
