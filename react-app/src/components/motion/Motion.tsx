import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './Motion.css';

/**
 * Motion kit (18 Nov 2026, LMCT+ as the reference for *movement*, not look):
 * marquee ribbons, count-up numbers and a scroll-scrubbed 3D coin. All of it
 * is decoration: content renders in its final state without JS, in tests and
 * under prefers-reduced-motion.
 */

const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Libo's own mark (three rising dots) as the ribbon separator. Never the sparkle. */
function Dots() {
  return (
    <svg className="mo-dots" viewBox="0 0 30 20" aria-hidden="true">
      <circle cx="4" cy="16" r="3.2" />
      <circle cx="14" cy="11" r="3.6" />
      <circle cx="25" cy="5" r="4.2" />
    </svg>
  );
}

function RibbonTrack({ words, reverse }: { words: string[]; reverse?: boolean }) {
  // Two identical halves: the track slides by -50%, so the loop has no seam.
  const half = (key: string) => (
    <span className="mo-ribbon__half" key={key} aria-hidden={key === 'b' ? true : undefined}>
      {words.map((w, i) => (
        <span className="mo-ribbon__item" key={i}>
          {w}
          <Dots />
        </span>
      ))}
    </span>
  );
  return <span className={`mo-ribbon__track${reverse ? ' mo-ribbon__track--rev' : ''}`}>{half('a')}{half('b')}</span>;
}

/** Two crossing marquee bands, black and lime, scrolling in opposite directions. */
export function Ribbons() {
  const { t } = useTranslation();
  const a = ['Train and earn', t('earnPages.nav.challenges'), t('homeEarn.points.title'), t('earnPages.nav.giveaway')];
  const b = [t('earnPages.nav.rewards'), 'Train and earn', t('homeEarn.stats.exercises', { n: '820+' }), t('earnPages.nav.challenges')];
  return (
    <div className="mo-ribbons" aria-hidden="true">
      <div className="mo-ribbon mo-ribbon--dark"><RibbonTrack words={[...a, ...a]} /></div>
      <div className="mo-ribbon mo-ribbon--lime"><RibbonTrack words={[...b, ...b]} reverse /></div>
    </div>
  );
}

/**
 * Counts the number inside `value` up from 0 the first time it scrolls into
 * view, keeping its prefix/suffix and thousands separator ("€50", "+50",
 * "4,000", "820+"). Renders the final text for SSR, tests and reduced motion.
 */
export function CountUp({ value, duration = 1400 }: { value: string; duration?: number }) {
  const m = value.match(/^(\D*)([\d.,\s\u202f]+)(.*)$/);
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);

  useEffect(() => {
    if (!m || typeof IntersectionObserver === 'undefined' || reducedMotion()) return;
    const [, pre, num, post] = m;
    const sep = (num.match(/[.,\s\u202f]/) || [''])[0];
    const target = parseInt(num.replace(/\D/g, ''), 10);
    if (!Number.isFinite(target) || target === 0) return;
    const fmt = (n: number) => pre + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, sep) + post;
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - t0) / duration);
        setShown(fmt(Math.round(target * (1 - Math.pow(1 - p, 3)))));
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      setShown(fmt(0));
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span ref={ref} className="mo-count">
      {/* Screen readers get the real figure once, not every animation step. */}
      <span aria-hidden="true">{shown}</span>
      <span className="mo-sr">{value}</span>
    </span>
  );
}

const COIN_FRAMES = 48;
const COIN_COLS = 8;
const COIN_VERSION = '1';

/**
 * The Libo coin, turning as the page scrolls past it (one full turn while it
 * crosses the viewport). A single sprite sheet (8 x 6 frames) from the Blender
 * render in the 3D ad folder, so it is one request.
 */
export function ScrollCoin({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || reducedMotion()) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = 1 - (r.top + r.height / 2) / (window.innerHeight + r.height);
      const f = ((Math.floor(p * COIN_FRAMES * 1.5) % COIN_FRAMES) + COIN_FRAMES) % COIN_FRAMES;
      el.style.setProperty('--fx', String(f % COIN_COLS));
      el.style.setProperty('--fy', String(Math.floor(f / COIN_COLS)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return (
    <div
      ref={ref}
      className={`mo-coin ${className}`.trim()}
      style={{ backgroundImage: `url(/loops/coin-sprite.webp?v=${COIN_VERSION})` }}
      aria-hidden="true"
    />
  );
}

/** Thin lime line under the nav showing how far down the page you are. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`;
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className="mo-progress" aria-hidden="true" />;
}
