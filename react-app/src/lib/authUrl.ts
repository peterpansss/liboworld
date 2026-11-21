/**
 * Capture one-time auth credentials before the app boots analytics or loads the
 * lazy auth pages. Keep them in memory and remove them from the address bar so
 * page-view trackers, copied URLs, and same-origin referrers cannot expose them.
 */
const HISTORY_MARKER = '__liboAuthUrlCapture';

type Captured<T> = { marker: number; value: T };

let nextMarker = 0;
let callbackHash: Captured<string> | null = null;
let confirmQuery: Captured<{ tokenHash: string; type: string | null }> | null = null;

function replaceSensitiveUrl(url: URL): number {
  const marker = ++nextMarker;
  const prior = window.history.state;
  const state = prior && typeof prior === 'object' && !Array.isArray(prior) ? prior : {};
  window.history.replaceState(
    { ...state, [HISTORY_MARKER]: marker },
    '',
    `${url.pathname}${url.search}${url.hash}`,
  );
  return marker;
}

export function captureAuthUrl(): void {
  if (typeof window === 'undefined') return;

  const url = new URL(window.location.href);
  if (url.pathname === '/auth/callback' && url.hash) {
    const hash = url.hash;
    url.hash = '';
    callbackHash = { marker: replaceSensitiveUrl(url), value: hash };
  }

  if (url.pathname === '/auth/confirm' && url.searchParams.has('token_hash')) {
    const tokenHash = url.searchParams.get('token_hash') ?? '';
    const type = url.searchParams.get('type');
    url.searchParams.delete('token_hash');
    url.searchParams.delete('type');
    confirmQuery = { marker: replaceSensitiveUrl(url), value: { tokenHash, type } };
  }
}

export function readAuthCallbackHash(): string {
  if (typeof window === 'undefined') return '';
  captureAuthUrl();
  if (window.location.pathname !== '/auth/callback' || !callbackHash) return '';
  return window.history.state?.[HISTORY_MARKER] === callbackHash.marker
    ? callbackHash.value : '';
}

export function readAuthConfirmQuery(): { tokenHash: string | null; type: string | null } {
  if (typeof window === 'undefined') return { tokenHash: null, type: null };
  captureAuthUrl();
  if (window.location.pathname !== '/auth/confirm' || !confirmQuery) {
    return { tokenHash: null, type: null };
  }
  return window.history.state?.[HISTORY_MARKER] === confirmQuery.marker
    ? confirmQuery.value : { tokenHash: null, type: null };
}

// main.tsx imports this before App, whose module-level initialization can load
// third-party analytics for a returning visitor with stored consent.
captureAuthUrl();
