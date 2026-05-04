/**
 * Coverage for src/utils/icons.ts.
 *
 * The module is mostly a static lookup table re-exporting Lucide icons. We
 * hit:
 *  - the resolveIcon happy paths (emoji hit, name hit, unknown -> default,
 *    explicit fallback, undefined input)
 *  - structural assertions on the exported maps so accidental key removal is
 *    caught by tests
 */
import { describe, expect, it } from 'vitest';
import {
  ICON_BY_KEY,
  ICON_OPTIONS,
  ICON_STROKE,
  iconForEmoji,
  resolveIcon,
} from '../../src/utils/icons';
import { Dumbbell, Flame, Heart, Star } from 'lucide-react';

describe('iconForEmoji map', () => {
  it('contains the headline emojis used in copy', () => {
    expect(iconForEmoji['💪']).toBe(Dumbbell);
    expect(iconForEmoji['🔥']).toBe(Flame);
    expect(iconForEmoji['❤️']).toBe(Heart);
    expect(iconForEmoji['🌟']).toBe(Star);
  });

  it('maps both VS16 and bare codepoint variants of the same emoji', () => {
    // The map intentionally includes both forms for emojis that ship with
    // the optional variation selector (e.g. clock).
    expect(iconForEmoji['⏱']).toBe(iconForEmoji['⏱️']);
    expect(iconForEmoji['☀']).toBe(iconForEmoji['☀️']);
    expect(iconForEmoji['❤']).toBe(iconForEmoji['❤️']);
  });

  it('exposes a meaningfully large set of mappings', () => {
    // Sanity: if someone deletes the table we want to know.
    expect(Object.keys(iconForEmoji).length).toBeGreaterThan(50);
  });
});

describe('resolveIcon', () => {
  it('returns the mapped icon when emoji is known', () => {
    expect(resolveIcon('💪')).toBe(Dumbbell);
  });

  it('returns the default fallback (Dumbbell) when emoji is unknown', () => {
    expect(resolveIcon('🦄')).toBe(Dumbbell);
  });

  it('returns an explicit fallback when emoji is unknown', () => {
    expect(resolveIcon('🦄', Star)).toBe(Star);
  });

  it('returns the default fallback when input is undefined', () => {
    expect(resolveIcon(undefined)).toBe(Dumbbell);
    expect(resolveIcon(undefined, Star)).toBe(Star);
  });

  it('returns the default fallback when input is empty string', () => {
    // `if (!emojiOrName)` short-circuits empty strings.
    expect(resolveIcon('')).toBe(Dumbbell);
  });
});

describe('ICON_OPTIONS / ICON_BY_KEY', () => {
  it('exposes every option key in the lookup record', () => {
    for (const { key, icon } of ICON_OPTIONS) {
      expect(ICON_BY_KEY[key]).toBe(icon);
    }
  });

  it('does not expose extra keys beyond ICON_OPTIONS', () => {
    expect(Object.keys(ICON_BY_KEY).sort()).toEqual(
      ICON_OPTIONS.map((o) => o.key).sort(),
    );
  });

  it('keeps the canonical 10 admin-picker icons', () => {
    expect(ICON_OPTIONS.length).toBe(10);
    expect(ICON_OPTIONS.map((o) => o.key)).toContain('dumbbell');
    expect(ICON_OPTIONS.map((o) => o.key)).toContain('trophy');
  });
});

describe('ICON_STROKE constant', () => {
  it('is the documented 1.75 stroke width', () => {
    expect(ICON_STROKE).toBe(1.75);
  });
});
