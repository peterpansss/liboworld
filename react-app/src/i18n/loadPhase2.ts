/**
 * Lazy loader for the Phase-2 translation namespaces.
 *
 * WHY THIS EXISTS
 * ---------------
 * `giveawayFunnel.*` and `cashChallengeFunnel.*` describe unreleased Phase-2
 * mechanics (paid giveaway packages, the Elite pool, ticket conversion). Both
 * routes hard-redirect to `/` while `isPrelaunch()` is true, yet when the copy
 * lived in `locales/*.json` every one of those strings was statically imported
 * by `src/i18n/index.ts` and therefore inlined — in five languages — into the
 * main JS chunk served to every visitor. Anyone reading source could read the
 * unreleased roadmap ("Live Giveaway", "giveaway tickets", "Elite Pool", the
 * AMOE disclaimer, …). See canon REWARDS-ECONOMY-RULES.md §8 / §3.
 *
 * The copy now lives in `src/i18n/phase2/{lng}.json` and is pulled in with a
 * dynamic import — one chunk per language, fetched only when a Phase-2 page
 * actually mounts. The key structure is unchanged, so once merged the strings
 * still resolve as `giveawayFunnel.*` / `cashChallengeFunnel.*`.
 *
 * CONTRACT
 * --------
 *  - Idempotent: a language is fetched at most once; concurrent callers share
 *    one in-flight promise.
 *  - Re-runnable on language change: switching to DE on /giveaway loads the DE
 *    bundle instead of silently serving the English fallback.
 *  - Never throws: a failed chunk fetch degrades to the English bundle (or, in
 *    the worst case, to i18next's normal missing-key behaviour) rather than
 *    blanking the page.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

// Import the i18next SINGLETON, not './index'. Both are the same object at
// runtime — './index' just configures it — but importing the bootstrap module
// pulls `initReactI18next` into the module graph of every page that uses this
// hook, which breaks any test that mocks `react-i18next` without re-exporting
// it (Giveaway, Giveaway.cssGuard and CashChallenge all do). Nothing here
// needs the React bindings; addResourceBundle lives on the core instance.
import i18n from 'i18next';

type Phase2Bundle = Record<string, unknown>;

/**
 * One entry per supported language. Each value is a distinct `import()` call
 * so Vite can statically analyse it and emit a separate chunk — a computed
 * specifier (`import('./phase2/' + lng + '.json')`) would defeat that and pull
 * every locale into one blob.
 */
const LOADERS: Record<string, () => Promise<{ default: Phase2Bundle }>> = {
  en: () => import('./phase2/en.json'),
  de: () => import('./phase2/de.json'),
  fr: () => import('./phase2/fr.json'),
  es: () => import('./phase2/es.json'),
  pt: () => import('./phase2/pt.json'),
};

/** Languages whose Phase-2 bundle is already merged into i18next. */
const loaded = new Set<string>();
/** In-flight fetches, keyed by language, so parallel callers dedupe. */
const inflight = new Map<string, Promise<void>>();

/** `de-CH` -> `de`; anything unsupported -> `en`. */
function normalize(lng: string | undefined): string {
  const base = (lng || 'en').split('-')[0];
  return base in LOADERS ? base : 'en';
}

/** True when the Phase-2 bundle for `lng` (and its en fallback) is merged. */
export function isPhase2Loaded(lng: string | undefined): boolean {
  const code = normalize(lng);
  return loaded.has(code) && loaded.has('en');
}

function fetchOne(code: string): Promise<void> {
  if (loaded.has(code)) return Promise.resolve();
  const existing = inflight.get(code);
  if (existing) return existing;

  const promise = LOADERS[code]()
    .then((mod) => {
      // Vite/Rollup hand JSON back as a module namespace with `default`;
      // some test transforms hand back the object itself.
      const data = ((mod as { default?: Phase2Bundle }).default ?? mod) as Phase2Bundle;
      // deep = true so we merge alongside the main bundle instead of replacing
      // it; overwrite = true so a re-merge is a no-op rather than a conflict.
      i18n.addResourceBundle(code, 'translation', data, true, true);
      loaded.add(code);
    })
    .catch(() => {
      // Chunk fetch failed (offline, stale deploy, CDN hiccup). Stay silent:
      // the caller renders with whatever i18next already has, which is the
      // English bundle whenever that one did load.
    })
    .finally(() => {
      inflight.delete(code);
    });

  inflight.set(code, promise);
  return promise;
}

/**
 * Merge the Phase-2 namespaces for `lng` into the live i18next instance.
 * Always also loads `en`, which is what `fallbackLng` resolves against when a
 * non-English bundle is missing a key (or failed to load).
 */
export async function loadPhase2(lng: string | undefined): Promise<void> {
  const code = normalize(lng);
  if (code === 'en') {
    await fetchOne('en');
    return;
  }
  await Promise.all([fetchOne('en'), fetchOne(code)]);
}

/**
 * React binding: kicks off the load for the active language and reports when
 * the strings are available. Re-runs on `languageChanged` (via the
 * `i18n.language` dependency) so a language switch while a Phase-2 page is
 * mounted pulls the new bundle instead of leaving English on screen.
 *
 * Returns `true` once the copy is usable — including the degraded case where
 * the fetch failed, so a page gated on this flag can never hang forever.
 */
export function usePhase2Translations(): boolean {
  const { i18n: instance } = useTranslation();
  const language = instance.language;
  const [ready, setReady] = useState(() => isPhase2Loaded(language));

  useEffect(() => {
    let cancelled = false;
    if (isPhase2Loaded(language)) {
      setReady(true);
      return;
    }
    setReady(false);
    void loadPhase2(language).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [language]);

  return ready;
}
