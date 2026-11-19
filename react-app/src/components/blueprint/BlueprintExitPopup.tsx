import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { getConsent, onConsentChange } from '../../lib/consent';
import BlueprintAppModal from './BlueprintAppModal';
import { BP_POPUP_KEY, THIRTY_DAYS, isBlockedPath } from './blueprintPopupRules';

// Noah, 19 Nov evening: on a phone 40 s / 70 % meant most visitors never saw it,
// and testing it looked broken. Now 13 s or half a page, on every device.
const DELAY_MS = 13_000; // Noah: "13 seconds is perfect"
const DESKTOP_MIN_MS = 4_000; // Noah, 19 Nov: 8 s → 6 s → 4 s ("still 2 seconds too long")
const SCROLL_SHARE = 0.5;
const EXIT_BAND_PX = 120; // the nav's height: a quick flick reports its last in-page spot


// Site-wide "Before you go: get the free 12-Month Blueprint" (Noah, 19 Nov
// 2026, after LMCT+'s exit popup, minus their discount, timer and email step).
// - Every device: after 13 s on the site, or once half a page has been scrolled.
// - Desktop (fine pointer) also: the mouse leaves through the top of the
//   window, from 4 s on (exit intent usually comes first).
// - At most once per 30 days per browser and never on pages where it would get
//   in the way. Never over the cookie banner: if a trigger fires while it is
//   still unanswered, the popup opens right after the visitor answers it.

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

  // A trigger that fired while the cookie banner was up, waiting for an answer.
  const [pending, setPending] = useState(false);

  const show = useCallback(() => {
    if (done || isBlockedPath(window.location.pathname)) return;
    if (getConsent() === null) { setPending(true); return; }
    markSeen();
    setDone(true);
    setOpen(true);
  }, [done]);

  useEffect(() => {
    if (!pending || done) return;
    // Small pause so the banner has closed before the popup slides in.
    return onConsentChange((state) => {
      if (state !== null) window.setTimeout(show, 600);
    });
  }, [pending, done, show]);

  // ?popup=blueprint opens it straight away (to review it), without
  // counting as the visitor's once-a-month showing.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('popup') === 'blueprint') setOpen(true);
  }, []);

  useEffect(() => {
    if (done || isBlockedPath(pathname) || typeof window === 'undefined') return;
    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
    const cleanups: Array<() => void> = [];

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
      cleanups.push(() => {
        document.removeEventListener('mouseout', onOut);
        document.removeEventListener('mouseleave', onOut);
        root.removeEventListener('mouseleave', onOut);
      });
    }

    const timer = window.setTimeout(show, DELAY_MS);
    const onScroll = () => {
      const room = document.documentElement.scrollHeight - window.innerHeight;
      if (room > window.innerHeight * 0.5 && window.scrollY / room >= SCROLL_SHARE) show();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    cleanups.push(() => { window.clearTimeout(timer); window.removeEventListener('scroll', onScroll); });
    return () => cleanups.forEach((c) => c());
  }, [pathname, done, show]);

  return <BlueprintAppModal open={open} onClose={() => setOpen(false)} variant="exit" />;
}
