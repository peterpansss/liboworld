import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getConsent } from '../../lib/consent';
import BlueprintAppModal from './BlueprintAppModal';
import { BP_POPUP_KEY, THIRTY_DAYS, isBlockedPath } from './blueprintPopupRules';

const TOUCH_DELAY_MS = 40_000;
const DESKTOP_MIN_MS = 6_000; // Noah, 19 Nov: 2 s less than 8, it's a free offer
const SCROLL_SHARE = 0.7;
const EXIT_BAND_PX = 120; // the nav's height: a quick flick reports its last in-page spot


// Site-wide "Before you go: get the free 12-Month Blueprint" (Noah, 19 Nov
// 2026, after LMCT+'s exit popup, minus their discount, timer and email step).
// - Desktop (fine pointer): after 6 s, the mouse leaves through the top of the window.
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

  // ?popup=blueprint opens it straight away (to review it), without
  // counting as the visitor's once-a-month showing.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('popup') === 'blueprint') setOpen(true);
  }, []);

  useEffect(() => {
    if (done || isBlockedPath(pathname) || typeof window === 'undefined') return;
    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;

    if (fine) {
      const since = Date.now();
      // A fast flick toward the tabs can leave the last event a few pixels
      // inside the page, and Safari reports the exit on <html> rather than
      // document, so all of them are watched, and any exit through the top
      // 120 px counts (checked by Noah in Chrome, 19 Nov).
      const onOut = (e: MouseEvent) => {
        if (e.relatedTarget === null && e.clientY < EXIT_BAND_PX && Date.now() - since >= DESKTOP_MIN_MS) show();
      };
      const root = document.documentElement;
      document.addEventListener('mouseout', onOut);
      document.addEventListener('mouseleave', onOut);
      root.addEventListener('mouseleave', onOut);
      return () => {
        document.removeEventListener('mouseout', onOut);
        document.removeEventListener('mouseleave', onOut);
        root.removeEventListener('mouseleave', onOut);
      };
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
