/**
 * Coverage for src/theme.ts.
 *
 * The module is pure data — design tokens that mirror :root CSS custom
 * properties in index.css. We assert the exported shapes are stable and
 * that key invariants are enforced (e.g. dark/light parity for shared
 * keys, accent values aren't accidentally blanked).
 */
import { describe, expect, it } from 'vitest';
import { darkColors, lightColors, webExtras, colors } from '../src/theme';

describe('darkColors / lightColors', () => {
  it('share the same set of keys', () => {
    expect(Object.keys(darkColors).sort()).toEqual(Object.keys(lightColors).sort());
  });

  it('exposes the brand-critical accent colors', () => {
    expect(darkColors.accent).toBe('#CAFF00');
    expect(lightColors.accent).toBe('#7A9900');
  });

  it('returns valid CSS color strings (hex / rgba) for every token', () => {
    const isCss = (v: string) =>
      /^#[0-9a-fA-F]{3,8}$/.test(v) || v.startsWith('rgba(') || v.startsWith('rgb(');
    for (const [, v] of Object.entries(darkColors)) expect(isCss(v)).toBe(true);
    for (const [, v] of Object.entries(lightColors)) expect(isCss(v)).toBe(true);
  });

  it('exports the dark theme as the active default `colors`', () => {
    expect(colors).toBe(darkColors);
  });
});

describe('webExtras', () => {
  it('exposes difficulty colors for all three buckets', () => {
    expect(webExtras.diffBeginner).toMatch(/^#[0-9A-F]{6}$/);
    expect(webExtras.diffIntermediate).toMatch(/^#[0-9A-F]{6}$/);
    expect(webExtras.diffAdvanced).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('pairs each difficulty color with a translucent background variant', () => {
    expect(webExtras.diffBeginnerBg).toMatch(/^rgba\(/);
    expect(webExtras.diffIntermediateBg).toMatch(/^rgba\(/);
    expect(webExtras.diffAdvancedBg).toMatch(/^rgba\(/);
  });

  it('keeps accentText as a near-black for legible badge labels', () => {
    expect(webExtras.accentText).toBe('#080B10');
  });
});
