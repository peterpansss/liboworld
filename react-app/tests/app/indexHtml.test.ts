/**
 * index.html must ship no tracker.
 *
 * Between 2026-08-10 and 2026-09-18 a gtag snippet sat in <head>, so GA4 ran
 * for every visitor before the banner had been answered — while that banner
 * said "only if you agree". Anything loaded from this file is loaded before
 * any consent exists, which is the one thing the gate cannot cover. If a
 * snippet is pasted back in here, this test is the thing that notices.
 *
 * Trackers belong in src/lib/consent.ts, behind an explicit opt-in.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Vitest runs with the react-app directory as cwd (vitest.config.ts lives there).
const html = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');

describe('index.html', () => {
  it('contains no Google Analytics / Tag Manager snippet', () => {
    expect(html).not.toMatch(/googletagmanager\.com/i);
    expect(html).not.toMatch(/google-analytics\.com/i);
    expect(html).not.toMatch(/gtag\(/);
    expect(html).not.toMatch(/dataLayer/);
  });

  it('contains no Meta Pixel snippet', () => {
    expect(html).not.toMatch(/connect\.facebook\.net/i);
    expect(html).not.toMatch(/fbevents\.js/i);
    expect(html).not.toMatch(/fbq\(/);
  });

  it('loads no third-party script at all', () => {
    const srcs = Array.from(html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi)).map((m) => m[1]);
    const external = srcs.filter((s) => /^https?:|^\/\//i.test(s));
    expect(external, 'index.html must only load first-party scripts').toEqual([]);
  });
});
