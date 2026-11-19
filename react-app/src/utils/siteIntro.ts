/**
 * Whether the Home brand opener (SiteIntro) plays on this page load, decided
 * once and shared, so the cookie dialog (ConsentBanner, mounted in App before
 * the route renders) can wait for it instead of covering it (Noah, 19 Nov
 * 2026: first-time visitors never saw the opener). The dialog still opens
 * before anything is tracked: the opener only delays the question by ~2.5 s,
 * it never sets or skips consent.
 */

const SEEN_KEY = 'libo-intro-seen';
/** Safety net: the dialog never waits longer than this, whatever happens to the opener. */
const MAX_WAIT_MS = 3500;

let decided: boolean | null = null;
let done = false;
const listeners = new Set<() => void>();

function finish() {
  if (done) return;
  done = true;
  listeners.forEach((fn) => fn());
  listeners.clear();
}

/** True only on the first load of a browser session, landing on Home, with motion allowed. */
export function introShouldPlay(): boolean {
  if (decided !== null) return decided;
  decided = false;
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return decided;
  if (window.location.pathname !== '/') return decided;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return decided;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return decided;
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch { /* storage blocked: play once per page load */ }
  decided = true;
  window.setTimeout(finish, MAX_WAIT_MS);
  return decided;
}

/** The opener is (or is about to be) on screen. */
export function introActive(): boolean {
  return introShouldPlay() && !done;
}

export function markIntroDone() {
  finish();
}

/** Runs `fn` once when the opener ends; returns an unsubscribe. */
export function onIntroDone(fn: () => void): () => void {
  if (done) { fn(); return () => {}; }
  listeners.add(fn);
  return () => listeners.delete(fn);
}
