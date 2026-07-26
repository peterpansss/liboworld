// Route prefetch: warm the lazy page chunk for a nav path before the user clicks
// (e.g. on hover/focus of a nav <Link>). The dynamic import()s here share Vite's
// module cache with App.tsx's lazy(), so a prefetch makes the subsequent
// navigation render instantly with no extra network cost.
//
// Contract (imported by the nav): export function prefetchRoute(path: string): void

// Map a nav path to a loader that pulls in its page module. Keep the import
// specifiers identical to App.tsx's lazy() calls so the chunks dedupe.
const loaders: Record<string, () => Promise<unknown>> = {
  '/money-challenges': () => import('../pages/MoneyChallenges'),
  '/pricing': () => import('../pages/Pricing'),
  '/founder': () => import('../pages/Founder'),
  '/press': () => import('../pages/Press'),
  '/exercises': () => import('../pages/ExerciseLibrary'),
};

// Track which paths we've already kicked off so we only import() once per path.
const prefetched = new Set<string>();

export function prefetchRoute(path: string): void {
  if (prefetched.has(path)) return;
  const load = loaders[path];
  if (!load) return;
  prefetched.add(path);
  // Fire-and-forget; swallow errors so a failed prefetch never surfaces to the
  // user (the real navigation will retry and show the Suspense fallback).
  load().catch(() => {
    prefetched.delete(path);
  });
}
