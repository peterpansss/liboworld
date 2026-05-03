/**
 * Locale key parity test.
 *
 * Asserts that every non-en locale exposes the same set of translation keys
 * as en.json. The `fallbackLng: 'en'` config in `src/i18n/index.ts` will hide
 * missing keys behind English text at runtime, so this test exists to make
 * future drift fail CI instead of silently degrading the UX for non-English
 * visitors mid-page.
 *
 * Also verifies that interpolation tokens ({{count}}, {tier}, etc.) and
 * inline HTML tags (<strong>, <em>, ...) are preserved across translations.
 */
import { describe, it, expect } from 'vitest';
import en from '../../src/i18n/locales/en.json';
import de from '../../src/i18n/locales/de.json';
import fr from '../../src/i18n/locales/fr.json';
import es from '../../src/i18n/locales/es.json';
import pt from '../../src/i18n/locales/pt.json';

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };

/**
 * Walks a nested locale object and returns a flat map of dotted-path keys
 * to their leaf string values. Arrays are indexed (e.g. `inclusions.entry[0]`)
 * so missing array entries are caught too.
 */
function flatten(obj: Json, prefix = '', out: Record<string, string> = {}): Record<string, string> {
  if (obj === null || typeof obj !== 'object') {
    if (typeof obj === 'string') out[prefix] = obj;
    return out;
  }
  if (Array.isArray(obj)) {
    obj.forEach((v, i) => flatten(v, `${prefix}[${i}]`, out));
    return out;
  }
  for (const k of Object.keys(obj)) {
    const next = prefix ? `${prefix}.${k}` : k;
    flatten((obj as Record<string, Json>)[k], next, out);
  }
  return out;
}

const enFlat = flatten(en as Json);
const enKeys = Object.keys(enFlat).sort();

const LOCALES: Array<readonly [string, Json]> = [
  ['de', de as Json],
  ['fr', fr as Json],
  ['es', es as Json],
  ['pt', pt as Json],
];

describe('i18n key parity', () => {
  for (const [code, data] of LOCALES) {
    describe(code, () => {
      const flat = flatten(data);
      const lngKeys = Object.keys(flat).sort();

      it('has the same set of keys as en.json', () => {
        const missing = enKeys.filter((k) => !(k in flat));
        const extra = lngKeys.filter((k) => !(k in enFlat));
        expect(
          { missing, extra },
          `${code}.json drift vs en.json`,
        ).toEqual({ missing: [], extra: [] });
      });

      it('preserves every {{interpolation}} and {single-brace} token', () => {
        // Match either {{double}} or {single} braces - both are valid i18next styles.
        const tokenRe = /(\{\{[^}]+\}\}|\{[^{}]+\})/g;
        const offenders: string[] = [];
        for (const k of enKeys) {
          const expected = (enFlat[k].match(tokenRe) ?? []).slice().sort();
          const actual = (flat[k]?.match(tokenRe) ?? []).slice().sort();
          if (JSON.stringify(expected) !== JSON.stringify(actual)) {
            offenders.push(`${k}: expected ${JSON.stringify(expected)} got ${JSON.stringify(actual)}`);
          }
        }
        expect(offenders, `${code} interpolation tokens`).toEqual([]);
      });

      it('preserves the count of inline HTML tags', () => {
        const tagRe = /<[^>]+>/g;
        const offenders: string[] = [];
        for (const k of enKeys) {
          const expected = (enFlat[k].match(tagRe) ?? []).length;
          const actual = (flat[k]?.match(tagRe) ?? []).length;
          if (expected !== actual) {
            offenders.push(`${k}: expected ${expected} tag(s) got ${actual}`);
          }
        }
        expect(offenders, `${code} HTML tag counts`).toEqual([]);
      });
    });
  }
});
