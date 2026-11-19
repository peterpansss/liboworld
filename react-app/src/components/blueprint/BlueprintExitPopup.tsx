import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getConsent } from '../../lib/consent';
import BlueprintAppModal from './BlueprintAppModal';
import { BP_POPUP_KEY, THIRTY_DAYS, isBlockedPath } from './blueprintPopupRules';

const TOUCH_DELAY_MS = 40_000;
const DESKTOP_MIN_MS = 8_000;
const SCROLL_SHARE = 0.7;


// Site-wide "Before you go: get the free 12-Month Blueprint" (Noah, 19 Nov
// 2026, after LMCT+'s exit popup, minus their discount, timer and email step).
// - Desktop (fine pointer): the mouse leaves through the top of the window.
// - Touch: after 40 s on the site, or once most of a page has been scrolled.
// - At most once per 30 days per browser, never while the cookie banner is
//   still unanswered, and never on pages where it would get in the way.

function seenRecently(now = Date.now()): boolean {
  try {
    const at = Number(localStorage.getItem(BP_POPUP_KEY));
    return Number.isFinite(at) && at > 0 && now - at < THIRTY_DAYS;
  } catch {
    return false;
  }
}

function markSeen(): void {
  try { localStorage.setItem(BP_POPUP_KEY, String(Date.now())); } catch { /* private mode: show once per load */ }
}

export default function BlueprintExitPopup() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(() => seenRecently());

  const show = useCallback(() => {
    if (done || isBlockedPath(window.location.pathname)) return;
    if (getConsent() === null) return; // cookie banner still up: try again later
    markSeen();
    setDone(true);
    setOpen(true);
  }, [done]);

  useEffect(() => {
    if (done || isBlockedPath(pathname) || typeof window === 'undefined') return;
    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;

    if (fine) {
      const since = Date.now();
      const onOut = (e: MouseEvent) => {
        if (e.relatedTarget === null && e.clientY <= 0 && Date.now() - since >= DESKTOP_MIN_MS) show();
      };
      document.addEventListener('mouseout', onOut);
      return () => document.removeEventListener('mouseout', onOut);
    }

    const timer = window.setTimeout(show, TOUCH_DELAY_MS);
    const onScroll = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room > window.innerHeight && window.scrollY / room >= SCROLL_SHARE) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); };
  }, [pathname, done, show]);

  return <BlueprintAppModal open={open} onClose={() => setOpen(false)} variant="exit" />;
}
