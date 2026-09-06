/**
 * Flip this constant to 'launched' when the app is live on the App Store.
 * Affects hero CTA, QR closer, FAQ Android answer, and waitlist visibility.
 *
 * Two date-driven switches, deliberately separate (Noah, 2026-09-02):
 *   LAUNCH_DATE         - the countdown target. Ends when the doors open.
 *   FOUNDING_CLOSE_DATE - when the founding offer stops being sold.
 * They used to be the same constant, which closed founding at the START of
 * launch day instead of the end of it. LAUNCH_MODE stays a manual flip because
 * the App Store review date is never guaranteed.
 */
export type LaunchMode = 'prelaunch' | 'launched';

// Cast keeps the type as the union (LaunchMode) rather than narrowing to the
// literal 'prelaunch' — otherwise TS flags `=== 'launched'` as impossible.
export const LAUNCH_MODE = 'prelaunch' as LaunchMode;

// Helpers — use these instead of comparing LAUNCH_MODE directly so the
// flag's intent is readable at call sites.
export const isPrelaunch = () => LAUNCH_MODE === 'prelaunch';
export const isLaunched = () => LAUNCH_MODE === 'launched';

/**
 * /giveaway and /cash-challenge carry placeholder statistics (entrant, winner
 * and completer counts) that were never real. They must NOT become public as a
 * side effect of flipping LAUNCH_MODE on launch morning. Gate them separately;
 * turn this on only once the counters are removed or backed by real figures.
 */
export const FUNNEL_PAGES_ENABLED = false;

// 3 Sep 2026, local midnight in Central Europe (CEST in September, i.e. UTC+2).
export const LAUNCH_DATE = '2026-09-03T00:00:00+02:00';

// Founding is sold THROUGH launch day and closes at the end of it, so this is
// midnight at the close of the final day — i.e. the NEXT day's 00:00.
//
// Extended 3 Sep 2026 (Noah): iOS was still 'In Review' on launch day with no
// date from Apple, so founding was held open rather than closing on an opening
// day the app never opened on. Extended again 6 Sep to Sun 13 Sep, still with
// no ruling from Apple. This date is deliberately fixed
// and NOT tied to App Review — the offer has to have a deadline a customer can
// act on, and Apple's timing is not knowable. If review drags past Sunday,
// move this again on purpose; do not make it open-ended.
export const FOUNDING_CLOSE_DATE = '2026-09-14T00:00:00+02:00';

// Call this at RENDER time, never at module load — the offer has to close
// itself while a long-lived tab is open, without a rebuild.
export const isFoundingOpen = () => Date.now() < new Date(FOUNDING_CLOSE_DATE).getTime();
