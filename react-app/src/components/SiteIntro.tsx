import { useEffect, useState } from 'react';
import './SiteIntro.css';

const SEEN_KEY = 'libo-intro-seen';
const TOTAL_MS = 1350;

function shouldPlay(): boolean {
  if (typeof window === 'undefined' || import.meta.env.MODE === 'test') return false;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  try {
    if (sessionStorage.getItem(SEEN_KEY)) return false;
    sessionStorage.setItem(SEEN_KEY, '1');
  } catch { /* storage blocked: play once per page load */ }
  return true;
}

/**
 * Brand opener on Home, modelled on coverd.us (Noah, 19 Nov 2026): lime screen,
 * the LiboDots pop in small to big, LIBO slides in, then the lime opens out
 * from the centre into a rounded frame and the page is already there.
 * ~1.3 s, once per browser session, skipped under reduced motion; any tap,
 * click or key ends it at once. The page renders underneath the whole time,
 * so nothing waits on it.
 */
export default function SiteIntro() {
  const [on, setOn] = useState(shouldPlay);

  useEffect(() => {
    if (!on) return;
    const end = () => setOn(false);
    const timer = window.setTimeout(end, TOTAL_MS);
    window.addEventListener('pointerdown', end, { once: true });
    window.addEventListener('keydown', end, { once: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', end);
      window.removeEventListener('keydown', end);
    };
  }, [on]);

  if (!on) return null;
  return (
    <div className="site-intro" aria-hidden="true">
      <div className="site-intro__hole" />
      <svg className="site-intro__logo" viewBox="0 0 560 200" fill="none">
        <circle className="site-intro__dot site-intro__dot--1" cx="40" cy="150" r="13" />
        <circle className="site-intro__dot site-intro__dot--2" cx="92" cy="112" r="21" />
        <circle className="site-intro__dot site-intro__dot--3" cx="160" cy="66" r="33" />
        <text
          className="site-intro__word"
          x="222"
          y="178"
          fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
          fontWeight={900}
          fontSize={196}
          letterSpacing="2"
        >
          LIBO
        </text>
      </svg>
    </div>
  );
}
