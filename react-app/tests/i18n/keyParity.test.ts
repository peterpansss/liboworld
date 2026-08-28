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
import p2en from '../../src/i18n/phase2/en.json';
import p2de from '../../src/i18n/phase2/de.json';
import p2fr from '../../src/i18n/phase2/fr.json';
import p2es from '../../src/i18n/phase2/es.json';
import p2pt from '../../src/i18n/phase2/pt.json';

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

/**
 * Namespaces that are deliberately English-only. Their keys are expected to be
 * absent from every non-en locale and are served in English via
 * `fallbackLng: 'en'`.
 *
 * `relaunchFounder` — the /founder page is founder-voice copy written in
 * Noah's own register (2026-07-28). Translating it flattens the voice and
 * creates revision debt every time the story changes, so it ships in English
 * for all languages by design. Do NOT "fix" this by adding translations.
 */
const EN_ONLY_NAMESPACES = ['relaunchFounder'];

const isEnOnly = (key: string) =>
  EN_ONLY_NAMESPACES.some((ns) => key === ns || key.startsWith(`${ns}.`));

/**
 * Runs the full parity suite for one family of locale files: key-set equality
 * against the English reference, plus interpolation-token and HTML-tag checks.
 *
 * Shared so the lazily-loaded Phase-2 bundles (`src/i18n/phase2/*.json`) are
 * held to exactly the same standard as the main bundles. They are merged into
 * the same 'translation' namespace at runtime, so drift there breaks the
 * /giveaway and /cash-challenge pages in precisely the same way.
 */
function describeParity(
  label: string,
  enData: Json,
  locales: Array<readonly [string, Json]>,
  reference: string,
) {
  const enFlat = flatten(enData);
  const enKeys = Object.keys(enFlat).sort().filter((k) => !isEnOnly(k));

  describe(label, () => {
    it('has a non-empty English reference set', () => {
      expect(enKeys.length).toBeGreaterThan(0);
    });

    for (const [code, data] of locales) {
      describe(code, () => {
        const flat = flatten(data);
        const lngKeys = Object.keys(flat).sort();

        it(`has the same set of keys as ${reference}`, () => {
          const missing = enKeys.filter((k) => !(k in flat));
          const extra = lngKeys.filter((k) => !(k in enFlat));
          expect(
            { missing, extra },
            `${code} drift vs ${reference}`,
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
}

describeParity(
  'i18n key parity',
  en as Json,
  [
    ['de', de as Json],
    ['fr', fr as Json],
    ['es', es as Json],
    ['pt', pt as Json],
  ],
  'en.json',
);

describeParity(
  'i18n key parity (phase2 lazy bundles)',
  p2en as Json,
  [
    ['de', p2de as Json],
    ['fr', p2fr as Json],
    ['es', p2es as Json],
    ['pt', p2pt as Json],
  ],
  'phase2/en.json',
);

/**
 * The whole point of the phase2 split: this unreleased copy must not be
 * reachable from the bundles that `src/i18n/index.ts` imports statically,
 * because those are inlined into the main chunk every visitor downloads.
 * If someone moves a namespace back, this fails before it ships.
 */
describe('phase2 namespace separation', () => {
  const PHASE2_NAMESPACES = ['giveawayFunnel', 'cashChallengeFunnel'];
  const MAIN: Array<readonly [string, Json]> = [
    ['en', en as Json],
    ['de', de as Json],
    ['fr', fr as Json],
    ['es', es as Json],
    ['pt', pt as Json],
  ];

  for (const [code, data] of MAIN) {
    it(`${code}.json contains no Phase-2 namespace`, () => {
      const present = PHASE2_NAMESPACES.filter(
        (ns) => ns in (data as Record<string, Json>),
      );
      expect(present, `${code}.json must not ship Phase-2 copy`).toEqual([]);
    });
  }

  it('phase2/en.json holds exactly the Phase-2 namespaces', () => {
    expect(Object.keys(p2en as Record<string, Json>).sort())
      .toEqual([...PHASE2_NAMESPACES].sort());
  });

  /**
   * `relaunchPricing.plans` was dead copy (Pricing.tsx builds its plan array
   * from `membershipV2.*`) that still advertised giveaway perks. Deleted
   * 2026-08-27 — this guards against it being reintroduced.
   */
  it('relaunchPricing.plans stays deleted in every locale', () => {
    for (const [code, data] of MAIN) {
      const rp = (data as Record<string, Json>).relaunchPricing as
        | Record<string, Json>
        | undefined;
      expect(rp, `${code}.json relaunchPricing`).toBeTruthy();
      expect(rp && 'plans' in rp, `${code}.json relaunchPricing.plans`).toBe(false);
    }
  });
});
