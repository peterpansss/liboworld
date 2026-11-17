/**
 * Earn kit: the shared building blocks of the "train and earn" pages
 * (/earn, /rewards, /giveaway) and /features.
 *
 * Structure follows LMCT+ and Coverd (reference study, 17 Nov 2026): one prop
 * hero, a 3-step strip, a rules link, the app CTA. Props are static
 * transparent WebP renders of the Meshy/Blender models in
 * Marketing/.../Ads/train-and-earn-3d/ (public/props/<name>-{360,720}.webp),
 * never live 3D, so the pages stay light.
 *
 * Imagery rule: props are for rewards/prizes/points only. Training imagery
 * stays real footage or real app screens (no AI).
 */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import StoreBadges from '../StoreBadges';
import './Earn.css';

/** Bump when the prop renders are re-exported, so Cloudflare serves the new files. */
const PROP_VERSION = '1';

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

type HeroProps = {
  eyebrow: string;
  title: ReactNode;
  sub?: ReactNode;
  props: string[];
  children?: ReactNode;
};

/** Page hero: eyebrow, headline, one line, CTAs, and one or two floating props. */
export function EarnHero({ eyebrow, title, sub, props, children }: HeroProps) {
  return (
    <section className="earn-hero">
      <div className="earn-hero__copy">
        <span className="earn-eyebrow">{eyebrow}</span>
        <h1 className="earn-hero__title font-display">{title}</h1>
        {sub && <p className="earn-hero__sub">{sub}</p>}
        {children && <div className="earn-hero__ctas">{children}</div>}
      </div>
      <div className={`earn-hero__art earn-hero__art--${props.length}`} aria-hidden="true">
        {props.map((p, i) => (
          <PropImg key={p} name={p} eager float width={i === 0 ? 360 : 220} className={`earn-hero__prop earn-hero__prop--${i}`} />
        ))}
      </div>
    </section>
  );
}

export type Step = { prop: string; title: string; text: string };

/** Three numbered steps with a prop each. Swipes sideways on phones. */
export function StepStrip({ heading, steps }: { heading: string; steps: Step[] }) {
  return (
    <section className="earn-section">
      <h2 className="earn-h2 font-display">{heading}</h2>
      <ol className="earn-steps">
        {steps.map((s, i) => (
          <li key={s.title} className="earn-step">
            <span className="earn-step__num font-display" aria-hidden="true">{i + 1}</span>
            <PropImg name={s.prop} className="earn-step__prop" width={160} />
            <h3 className="earn-step__title font-display">{s.title}</h3>
            <p className="earn-step__text">{s.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Premium upsell, worded inside canon §6.2: "earns 2×", never "double on everything". */
export function PremiumStrip({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <Link to="/membership" className="earn-premium" viewTransition>
      <PropImg name="gym-card" className="earn-premium__prop" width={120} />
      <span className="earn-premium__text">
        <strong className="font-display">{t('earnPages.premiumStrip.title')}</strong>
        <span>{text ?? t('earnPages.premiumStrip.text')}</span>
      </span>
      <span className="earn-premium__arrow" aria-hidden="true">→</span>
    </Link>
  );
}

/** Links to the other earn pages, so every page leads to the rest. */
export function EarnNext({ current }: { current: 'earn' | 'challenges' | 'giveaway' | 'rewards' }) {
  const { t } = useTranslation();
  const items = [
    { id: 'earn', to: '/earn', prop: 'libo-coin' },
    { id: 'challenges', to: '/cash-challenges', prop: 'cash-euro-stack' },
    { id: 'giveaway', to: '/giveaway', prop: 'ps5-slim' },
    { id: 'rewards', to: '/rewards', prop: 'reward-cards-fan' },
  ].filter((i) => i.id !== current);
  return (
    <section className="earn-section">
      <h2 className="earn-h2 font-display">{t('earnPages.next.heading')}</h2>
      <div className="earn-next">
        {items.map((i) => (
          <Link key={i.id} to={i.to} className="earn-next__card" viewTransition>
            <PropImg name={i.prop} className="earn-next__prop" width={160} />
            <span className="earn-next__title font-display">{t(`earnPages.next.${i.id}.title`)}</span>
            <span className="earn-next__text">{t(`earnPages.next.${i.id}.text`)}</span>
            <span className="earn-next__cta">{t('earnPages.next.cta')} <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** A real app screen in a phone frame. Screens come from the 17 Nov 2026 English app recording. */
export function PhoneShot({ src, alt, className = '' }: { src: string; alt: string; className?: string }) {
  return (
    <figure className={`earn-phone ${className}`.trim()}>
      <img src={`/app-screens/${src}.webp?v=1`} alt={alt} loading="lazy" decoding="async" width={300} height={652} />
    </figure>
  );
}

/** Closing block: headline, one line, both store badges. */
export function AppCta({ title, sub }: { title: string; sub?: string }) {
  return (
    <section className="earn-cta">
      <h2 className="earn-h2 font-display">{title}</h2>
      {sub && <p className="earn-cta__sub">{sub}</p>}
      <StoreBadges className="earn-cta__badges" />
    </section>
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
