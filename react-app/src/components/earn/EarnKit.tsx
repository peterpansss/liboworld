/**
 * Earn kit: the shared building blocks of the "train and earn" pages
 * (/earn, /rewards, /giveaway, /features, /faq).
 *
 * Visual language is Home's (design review, 18 Nov 2026): full-bleed bands
 * alternating --bg / --bg2 with hairlines, 96px rhythm, plain lime eyebrows,
 * two-tone uppercase headings that reveal on scroll (ScrollRevealText), cards
 * that pop in (usePopIn, mounted by each page), Home's phone styling and
 * Home's closing band. Structure follows LMCT+/Coverd: prop hero, 3 steps,
 * rules link, app CTA.
 *
 * Props are static transparent WebP renders of the Meshy/Blender models
 * (public/props/<name>-{360,720}.webp), never live 3D. Imagery rule: props are
 * for rewards/prizes/points only; training imagery stays real (no AI).
 */
import { useEffect, useRef, type ReactNode } from 'react';
import { CountUp, Ribbons } from '../motion/Motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StoreBadges from '../StoreBadges';
import ScrollRevealText from '../ScrollRevealText';
import './Earn.css';

/** Bump when the prop renders are re-exported, so Cloudflare serves the new files. */
const PROP_VERSION = '2';

/**
 * Splits a heading into Home's two-tone lines: everything but the last word
 * in white, the last word in lime. Works in every locale without extra keys.
 */
function splitLines(text: string): [string, string] {
  const words = text.trim().split(/\s+/);
  if (words.length < 2) return ['', text];
  return [words.slice(0, -1).join(' '), words[words.length - 1]];
}

type PropImgProps = {
  name: string;
  className?: string;
  /** Above the fold: load eagerly. Everything else is lazy. */
  eager?: boolean;
  /** Rendered width hint for `sizes`, in px. */
  width?: number;
  /** Gentle float. Switched off under prefers-reduced-motion by the global rule. */
  float?: boolean;
};

export function PropImg({ name, className = '', eager = false, width = 280, float = false }: PropImgProps) {
  const base = `/props/${name}`;
  return (
    <img
      className={`earn-prop${float ? ' earn-prop--float' : ''} ${className}`.trim()}
      src={`${base}-720.webp?v=${PROP_VERSION}`}
      srcSet={`${base}-360.webp?v=${PROP_VERSION} 360w, ${base}-720.webp?v=${PROP_VERSION} 720w`}
      sizes={`${width}px`}
      alt=""
      aria-hidden="true"
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      draggable={false}
    />
  );
}

/** Full-bleed section band. `raised` = --bg2 with hairlines, like Home. */
export function Band({ raised = false, className = '', children }: { raised?: boolean; className?: string; children: ReactNode }) {
  return (
    <section className={`earn-band${raised ? ' earn-band--raised' : ''} ${className}`.trim()}>
      <div className="earn-inner">{children}</div>
    </section>
  );
}

/** Home's section heading: plain lime eyebrow + two-tone uppercase h2 that reveals on scroll. */
export function Heading({ eyebrow, title, sub, align = 'center' }: { eyebrow?: string; title: string; sub?: string; align?: 'center' | 'left' }) {
  const [a, b] = splitLines(title);
  return (
    <header className={`earn-head earn-head--${align}`}>
      {eyebrow && <p className="earn-eyebrow">{eyebrow}</p>}
      <h2 className="earn-h2">
        {a && <ScrollRevealText as="span" className="earn-h2__line">{a}</ScrollRevealText>}
        <ScrollRevealText as="span" className="earn-h2__line earn-reveal--accent">{b}</ScrollRevealText>
      </h2>
      {sub && <p className="earn-lead">{sub}</p>}
    </header>
  );
}

type HeroProps = {
  eyebrow: string;
  /** Two lines; the second renders in lime. */
  title: [string, string];
  sub?: ReactNode;
  props: string[];
  children?: ReactNode;
  /** Short hero for utility pages (/faq): no full-height stage. */
  compact?: boolean;
  /**
   * Transparent Blender loop under public/loops/<name>.{mov,webm} + <name>-poster.webp
   * (renders/web/ in the 3D ad folder). Replaces the props; the still poster is
   * shown under prefers-reduced-motion.
   */
  loop?: string;
};

const LOOP_VERSION = '1';

/**
 * Seamless transparent loop. Safari only does alpha video as HEVC (.mov,
 * hvc1); Chrome/Firefox do it as VP9 WebM. The .mov is listed first with a
 * QuickTime type Chrome reports it can't play, so each browser takes its own.
 */
function HeroLoop({ name }: { name: string }) {
  const reduced = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const poster = `/loops/${name}-poster.webp?v=${LOOP_VERSION}`;
  const ref = useRef<HTMLVideoElement>(null);
  // iOS Low Power Mode blocks autoplay and paints a play button over the
  // poster (hidden in CSS). Any first tap on the page counts as a gesture, so
  // retry then; until that, the poster still is what people see.
  useEffect(() => {
    const v = ref.current;
    if (!v || reduced) return;
    const retry = () => { if (v.paused) v.play().catch(() => {}); };
    window.addEventListener('touchstart', retry, { once: true, passive: true });
    window.addEventListener('pointerdown', retry, { once: true });
    return () => { window.removeEventListener('touchstart', retry); window.removeEventListener('pointerdown', retry); };
  }, [reduced]);
  if (reduced) return <img className="earn-hero__loop" src={poster} alt="" aria-hidden="true" />;
  return (
    <video ref={ref} className="earn-hero__loop" poster={poster} autoPlay muted loop playsInline preload="auto" aria-hidden="true" disablePictureInPicture>
      <source src={`/loops/${name}.mov?v=${LOOP_VERSION}`} type='video/quicktime; codecs="hvc1"' />
      <source src={`/loops/${name}.webm?v=${LOOP_VERSION}`} type="video/webm" />
    </video>
  );
}

/**
 * Cinematic hero: near full-height, lime spotlight from above, big floating
 * props on a floor shadow, slow parallax on scroll (off under reduced motion).
 */
export function EarnHero({ eyebrow, title, sub, props, children, compact = false, loop }: HeroProps) {
  const artRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = artRef.current;
    if (!el || typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--py', `${Math.min(window.scrollY, 900) * 0.18}px`);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); };
  }, []);

  return (
    <section className={`earn-hero${compact ? ' earn-hero--compact' : ''}`}>
      <div className="earn-hero__inner">
        <div className="earn-hero__copy">
          <p className="earn-eyebrow">{eyebrow}</p>
          <h1 className="earn-hero__title">
            {title[0] && <span className="earn-hero__line">{title[0]}</span>}
            <span className="earn-hero__line earn-hero__line--accent">{title[1]}</span>
          </h1>
          {sub && <p className="earn-hero__sub">{sub}</p>}
          {children && <div className="earn-hero__ctas">{children}</div>}
        </div>
        <div ref={artRef} className={`earn-hero__art earn-hero__art--${loop ? 'loop' : props.length}`} aria-hidden="true">
          {loop ? <HeroLoop name={loop} /> : props.map((p, i) => (
            <PropImg key={p} name={p} eager float width={i === 0 ? 460 : 280} className={`earn-hero__prop earn-hero__prop--${i}`} />
          ))}
        </div>
      </div>
    </section>
  );
}

/** One giant number, the hook of the page, in Home's display type. */
export function BigNumber({ value, caption, prop }: { value: string; caption: string; prop?: string }) {
  return (
    <section className="earn-big">
      <div className="earn-big__inner" data-popin>
        {prop && <PropImg name={prop} className="earn-big__prop" width={240} />}
        <span className="earn-big__value"><CountUp value={value} /></span>
        <span className="earn-big__caption">{caption}</span>
      </div>
    </section>
  );
}

export type Step = { prop: string; title: string; text: string };

/** Three numbered steps, Home's numbered-card look with a prop each. Swipes sideways on phones. */
export function StepStrip({ eyebrow, heading, steps, raised = true }: { eyebrow?: string; heading: string; steps: Step[]; raised?: boolean }) {
  return (
    <Band raised={raised}>
      <Heading eyebrow={eyebrow} title={heading} />
      <ol className="earn-steps">
        {steps.map((s, i) => (
          <li key={s.title} className="earn-step" data-popin>
            <PropImg name={s.prop} className="earn-step__prop" width={200} />
            <span className="earn-step__num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="earn-step__title">{s.title}</h3>
            <p className="earn-step__text">{s.text}</p>
          </li>
        ))}
      </ol>
    </Band>
  );
}

/** Premium upsell, worded inside canon §6.2: "earns 2×", never "double on everything". */
export function PremiumStrip({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <Link to="/membership" className="earn-premium" viewTransition data-popin>
      <PropImg name="gym-card" className="earn-premium__prop" width={160} />
      <span className="earn-premium__text">
        <strong>{t('earnPages.premiumStrip.title')}</strong>
        <span>{text ?? t('earnPages.premiumStrip.text')}</span>
      </span>
      <span className="earn-premium__arrow" aria-hidden="true">→</span>
    </Link>
  );
}

/** Links to the other earn pages, so every page leads to the rest. */
export function EarnNext({ current, raised = false, children }: { current: 'earn' | 'challenges' | 'giveaway' | 'rewards'; raised?: boolean; children?: ReactNode }) {
  const { t } = useTranslation();
  const items = [
    { id: 'earn', to: '/earn', prop: 'libo-coin' },
    { id: 'challenges', to: '/cash-challenges', prop: 'cash-euro-stack' },
    { id: 'giveaway', to: '/giveaway', prop: 'ps5-slim' },
    { id: 'rewards', to: '/rewards', prop: 'reward-cards-fan' },
  ].filter((i) => i.id !== current);
  return (
    <Band raised={raised}>
      <Heading title={t('earnPages.next.heading')} />
      <div className="earn-next">
        {items.map((i) => (
          <Link key={i.id} to={i.to} className="earn-next__card" viewTransition data-popin>
            <span className="earn-next__stage"><PropImg name={i.prop} className="earn-next__prop" width={200} /></span>
            <span className="earn-next__title">{t(`earnPages.next.${i.id}.title`)}</span>
            <span className="earn-next__text">{t(`earnPages.next.${i.id}.text`)}</span>
            <span className="earn-next__cta">{t('earnPages.next.cta')} <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
      {children}
    </Band>
  );
}

/** A real app screen, styled like Home's hero phones. Screens: 17 Nov 2026 English recording. */
export function PhoneShot({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={`earn-phone ${className}`.trim()}>
      <img src={`/app-screens/${src}.webp?v=1`} alt={alt} loading="lazy" decoding="async" width={300} height={652} />
    </figure>
  );
}

/** Closing band, Home's "rh-final": big two-tone headline, one line, both store badges. */
export function AppCta({ title, sub }: { title: string; sub?: string }) {
  const [a, b] = splitLines(title);
  return (
    <>
    <Ribbons />
    <section className="earn-final band-lime">
      <div className="earn-final__inner">
        <h2 className="earn-final__h2">
          {a && <ScrollRevealText as="span" className="earn-h2__line">{a}</ScrollRevealText>}
          <ScrollRevealText as="span" className="earn-h2__line earn-reveal--accent">{b}</ScrollRevealText>
        </h2>
        {sub && <p className="earn-final__sub">{sub}</p>}
        <StoreBadges className="earn-final__badges" />
      </div>
    </section>
    </>
  );
}

/** Small rules link line under a section. */
export function RulesLink({ to, label }: { to: string; label: string }) {
  return (
    <p className="earn-rules">
      <Link to={to}>{label} <span aria-hidden="true">→</span></Link>
    </p>
  );
}
