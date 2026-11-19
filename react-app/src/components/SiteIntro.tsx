import { useEffect, useState, type CSSProperties } from 'react';
import './SiteIntro.css';

const SEEN_KEY = 'libo-intro-seen';
const TOTAL_MS = 2600;

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
 * The three LiboDots in polar form around the mark's centre (design px at the
 * 220px desktop size): final angle, final distance, diameter, start delay.
 * Same layout as the logo: small bottom-left rising to big top-right.
 */
const DOTS = [
  { a: 152.2, r: 86, d: 26, delay: 0 },
  { a: 180, r: 10, d: 42, delay: 160 },
  { a: -27.8, r: 86, d: 66, delay: 320 },
];

/**
 * Brand opener on Home (Noah, 19 Nov 2026, after coverd.us, which builds its C
 * mark up before the page opens). The LiboDots only, no wordmark: each one
 * spirals in from a wide orbit like a planet and settles into the logo, a
 * faint orbit ring breathes behind them, then the lime opens from the centre
 * into a rounded frame over the already-rendered page and fades.
 * ~2.5 s, once per browser session, skipped under reduced motion; any tap,
 * click or key ends it at once.
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
      <div className="site-intro__mark">
        <span className="site-intro__ring" />
        {DOTS.map((dot, i) => (
          <span
            key={i}
            className="site-intro__orbit"
            style={{ '--a': `${dot.a}deg`, '--r': `${dot.r}px`, '--d': `${dot.d}px`, '--delay': `${dot.delay}ms` } as CSSProperties}
          >
            <span className="site-intro__dot" />
          </span>
        ))}
      </div>
    </div>
  );
}
