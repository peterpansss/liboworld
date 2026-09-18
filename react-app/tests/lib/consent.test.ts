/**
 * Tests for src/lib/consent.ts — the gate that decides whether any tracker
 * exists in the page at all.
 *
 * The point of this file is the negative case: for a visitor who has not
 * chosen, or who rejected, there must be no GA4 script tag (and therefore no
 * request to googletagmanager.com and no _ga cookie) and no Meta Pixel. That
 * was the live breach until 2026-09-18 — GA loaded from index.html for
 * everyone while the banner said "only if you agree".
 *
 * Each test re-imports the module (`vi.resetModules()`) because injection is
 * guarded by module-level flags: a fresh module means a fresh page.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

type ConsentModule = typeof import('../../src/lib/consent');

async function freshModule(): Promise<ConsentModule> {
  vi.resetModules();
  return import('../../src/lib/consent');
}

const gaScripts = () =>
  Array.from(document.querySelectorAll('script')).filter((s) =>
    (s.src || '').includes('googletagmanager.com'),
  );
const pixelScripts = () =>
  Array.from(document.querySelectorAll('script')).filter((s) =>
    (s.src || '').includes('connect.facebook.net'),
  );

beforeEach(() => {
  localStorage.clear();
  document.querySelectorAll('script').forEach((s) => s.remove());
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { dataLayer?: unknown }).dataLayer;
  delete (window as { fbq?: unknown }).fbq;
  delete (window as { _fbq?: unknown })._fbq;
  delete (window as { __liboGaPath?: unknown }).__liboGaPath;
  delete (window as { __liboPixelPath?: unknown }).__liboPixelPath;
});

describe('consent — before a choice is made', () => {
  it('reports no stored consent', async () => {
    const { getConsent } = await freshModule();
    expect(getConsent()).toBeNull();
  });

  it('loads no GA4 and no Meta Pixel on boot', async () => {
    const { initConsent, hasConsent } = await freshModule();
    initConsent();
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
    expect(window.fbq).toBeUndefined();
    expect(hasConsent('analytics')).toBe(false);
    expect(hasConsent('marketing')).toBe(false);
  });

  it('no-ops every tracking helper', async () => {
    const { initConsent, trackPageView, trackLead, trackVideoPlay } = await freshModule();
    initConsent();
    trackPageView('/join');
    trackLead();
    trackVideoPlay('cash_challenge');
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
  });
});

describe('consent — reject', () => {
  it('keeps GA4 and the pixel absent, and records the refusal', async () => {
    const { setConsent, DENY_ALL, getConsent, hasConsent } = await freshModule();
    setConsent(DENY_ALL);
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
    expect(getConsent()).toEqual({ analytics: false, marketing: false });
    expect(hasConsent('analytics')).toBe(false);
  });

  it('sets GA’s own kill switch so a stray gtag call cannot send anything', async () => {
    const { setConsent, DENY_ALL, GA_MEASUREMENT_ID } = await freshModule();
    setConsent(DENY_ALL);
    expect((window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(
      true,
    );
  });

  it('survives a reload: a rejected visitor boots with nothing loaded', async () => {
    const first = await freshModule();
    first.setConsent(first.DENY_ALL);
    const second = await freshModule(); // new page load, same storage
    second.initConsent();
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
  });
});

describe('consent — accept', () => {
  it('loads GA4 with the right measurement id and primes gtag', async () => {
    const { setConsent, ACCEPT_ALL, GA_MEASUREMENT_ID } = await freshModule();
    setConsent(ACCEPT_ALL);
    const ga = gaScripts();
    expect(ga).toHaveLength(1);
    expect(ga[0].src).toContain(`id=${GA_MEASUREMENT_ID}`);
    expect(ga[0].async).toBe(true);
    expect(typeof window.gtag).toBe('function');
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect((window as unknown as Record<string, boolean>)[`ga-disable-${GA_MEASUREMENT_ID}`]).toBe(
      false,
    );
  });

  it('loads the Meta Pixel and fires the first PageView', async () => {
    const { setConsent, ACCEPT_ALL } = await freshModule();
    setConsent(ACCEPT_ALL);
    expect(pixelScripts()).toHaveLength(1);
    expect(typeof window.fbq).toBe('function');
    expect(window.__liboPixelPath).toBe(window.location.pathname);
  });

  it('loads GA4 after a previous reject without a page reload', async () => {
    const mod = await freshModule();
    mod.setConsent(mod.DENY_ALL);
    expect(gaScripts()).toHaveLength(0);
    mod.setConsent({ analytics: true, marketing: false }); // footer → accept
    expect(gaScripts()).toHaveLength(1);
    expect((window as unknown as Record<string, boolean>)[`ga-disable-${mod.GA_MEASUREMENT_ID}`])
      .toBe(false);
  });

  it('injects each tracker at most once', async () => {
    const mod = await freshModule();
    mod.setConsent(mod.ACCEPT_ALL);
    mod.setConsent(mod.ACCEPT_ALL);
    expect(gaScripts()).toHaveLength(1);
    expect(pixelScripts()).toHaveLength(1);
  });

  it('re-applies a stored accept on the next visit', async () => {
    const first = await freshModule();
    first.setConsent(first.ACCEPT_ALL);
    document.querySelectorAll('script').forEach((s) => s.remove());
    delete (window as { gtag?: unknown }).gtag;
    delete (window as { fbq?: unknown }).fbq;
    const second = await freshModule();
    second.initConsent();
    expect(gaScripts()).toHaveLength(1);
    expect(pixelScripts()).toHaveLength(1);
  });
});

describe('consent — categories are independent', () => {
  it('analytics only: GA4 loads, the pixel does not', async () => {
    const { setConsent } = await freshModule();
    setConsent({ analytics: true, marketing: false });
    expect(gaScripts()).toHaveLength(1);
    expect(pixelScripts()).toHaveLength(0);
    expect(window.fbq).toBeUndefined();
  });

  it('marketing only: the pixel loads, GA4 does not', async () => {
    const { setConsent } = await freshModule();
    setConsent({ analytics: false, marketing: true });
    expect(pixelScripts()).toHaveLength(1);
    expect(gaScripts()).toHaveLength(0);
    expect(window.gtag).toBeUndefined();
  });

  it('only sends Meta events when marketing is granted', async () => {
    const mod = await freshModule();
    mod.setConsent({ analytics: true, marketing: false });
    const fbq = vi.fn();
    (window as unknown as { fbq: unknown }).fbq = fbq;
    mod.trackLead();
    mod.trackVideoPlay('funnel');
    expect(fbq).not.toHaveBeenCalled();

    mod.setConsent({ analytics: true, marketing: true });
    mod.trackLead();
    expect(fbq).toHaveBeenCalledWith('track', 'Lead', {}, expect.objectContaining({ eventID: expect.any(String) }));
  });

  it('sends SPA page views to each granted tracker once per path', async () => {
    const mod = await freshModule();
    mod.setConsent(mod.ACCEPT_ALL);
    const gtag = vi.fn();
    const fbq = vi.fn();
    (window as unknown as { gtag: unknown }).gtag = gtag;
    (window as unknown as { fbq: unknown }).fbq = fbq;

    mod.trackPageView('/cash-challenges');
    mod.trackPageView('/cash-challenges'); // same path — no double count
    expect(fbq).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledTimes(1);
    expect(gtag).toHaveBeenCalledWith(
      'event',
      'page_view',
      expect.objectContaining({ page_path: '/cash-challenges' }),
    );
  });
});

describe('consent — withdrawal', () => {
  it('resetConsent clears the record and stops tracking until the visitor answers again', async () => {
    const mod = await freshModule();
    mod.setConsent(mod.ACCEPT_ALL);
    const seen: Array<unknown> = [];
    mod.onConsentChange((s) => seen.push(s));

    mod.resetConsent();
    expect(mod.getConsent()).toBeNull();
    expect(seen).toEqual([null]);
    expect(mod.hasConsent('analytics')).toBe(false);
    expect(mod.hasConsent('marketing')).toBe(false);
    expect(
      (window as unknown as Record<string, boolean>)[`ga-disable-${mod.GA_MEASUREMENT_ID}`],
    ).toBe(true);

    const fbq = vi.fn();
    (window as unknown as { fbq: unknown }).fbq = fbq;
    mod.trackLead();
    expect(fbq).not.toHaveBeenCalled();
  });

  it('deletes the analytics cookies the provider set', async () => {
    const mod = await freshModule();
    document.cookie = '_ga=GA1.1.123.456; path=/';
    mod.setConsent(mod.DENY_ALL);
    expect(document.cookie).not.toContain('_ga=');
  });
});

/**
 * Migration of the pre-gate records. A 'granted' written while GA ran no
 * matter what is not evidence of an informed choice about analytics, so it is
 * dropped and the visitor is asked again. A 'denied' is honoured as-is.
 */
describe('consent — legacy libo-consent records', () => {
  it('honours a legacy reject without re-asking', async () => {
    localStorage.setItem('libo-consent', 'denied');
    const { getConsent, initConsent } = await freshModule();
    expect(getConsent()).toEqual({ analytics: false, marketing: false });
    expect(localStorage.getItem('libo-consent')).toBeNull();
    initConsent();
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
  });

  it('discards a legacy accept and re-asks, loading nothing meanwhile', async () => {
    localStorage.setItem('libo-consent', 'granted');
    const { getConsent, initConsent } = await freshModule();
    expect(getConsent()).toBeNull();
    expect(localStorage.getItem('libo-consent')).toBeNull();
    initConsent();
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
  });

  it('ignores a corrupt record rather than assuming consent', async () => {
    localStorage.setItem('libo-consent-v2', '{not json');
    const { getConsent } = await freshModule();
    expect(getConsent()).toBeNull();
  });

  it('treats a record missing a category as a no for that category', async () => {
    localStorage.setItem('libo-consent-v2', JSON.stringify({ v: 2, marketing: true }));
    const { getConsent } = await freshModule();
    expect(getConsent()).toEqual({ analytics: false, marketing: true });
  });
});
