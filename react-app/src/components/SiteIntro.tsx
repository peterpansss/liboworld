import { useEffect, useState, type CSSProperties } from 'react';
import { introActive, markIntroDone } from '../utils/siteIntro';
import './SiteIntro.css';

const TOTAL_MS = 2600;

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
  const [on, setOn] = useState(introActive);

  // Tell the cookie dialog it can open. Leaving Home mid-intro is covered by
  // the 3.5 s safety net in utils/siteIntro (an unmount hook here would fire
  // on StrictMode's dev remount and open the dialog over the intro).
  useEffect(() => {
    if (!on) { markIntroDone(); return; }
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
