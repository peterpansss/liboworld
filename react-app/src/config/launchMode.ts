/**
 * Flip this constant to 'launched' when the app is live on the App Store.
 * Affects hero CTA, QR closer, FAQ Android answer, and waitlist visibility.
 */
export type LaunchMode = 'prelaunch' | 'launched';

// Cast keeps the type as the union (LaunchMode) rather than narrowing to the
// literal 'prelaunch' — otherwise TS flags `=== 'launched'` as impossible.
export const LAUNCH_MODE = 'prelaunch' as LaunchMode;

// Helpers — use these instead of comparing LAUNCH_MODE directly so the
// flag's intent is readable at call sites.
export const isPrelaunch = () => LAUNCH_MODE === 'prelaunch';
export const isLaunched = () => LAUNCH_MODE === 'launched';
