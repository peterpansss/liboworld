/**
 * Flip this constant to 'launched' when the app is live on the App Store.
 * Affects hero CTA, QR closer, FAQ Android answer, and waitlist visibility.
 *
 * LAUNCH_DATE is the second, date-driven switch: the founding pre-sale closes
 * itself when the clock passes it, so nobody has to ship a deploy on launch
 * morning (Noah, 2026-08-21). LAUNCH_MODE stays a manual flip because the App
 * Store review date is never guaranteed.
 */
export type LaunchMode = 'prelaunch' | 'launched';

// Cast keeps the type as the union (LaunchMode) rather than narrowing to the
// literal 'prelaunch' — otherwise TS flags `=== 'launched'` as impossible.
export const LAUNCH_MODE = 'prelaunch' as LaunchMode;

// Helpers — use these instead of comparing LAUNCH_MODE directly so the
// flag's intent is readable at call sites.
export const isPrelaunch = () => LAUNCH_MODE === 'prelaunch';
export const isLaunched = () => LAUNCH_MODE === 'launched';

// 3 Sep 2026, local midnight in Central Europe (CEST in September, i.e. UTC+2).
export const LAUNCH_DATE = '2026-09-03T00:00:00+02:00';

// Call this at RENDER time, never at module load — the offer has to close
// itself while a long-lived tab is open, without a rebuild.
export const isFoundingOpen = () => Date.now() < new Date(LAUNCH_DATE).getTime();
