import { useEffect, useRef, useState } from 'react';
import { colors } from '../../theme';

type Counter = {
  /** Big number target */
  value: number;
  /** Optional prefix, e.g. "€" */
  prefix?: string;
  /** Optional suffix, e.g. "+" */
  suffix?: string;
  /** Label below the number */
  label: string;
};

type Props = {
  counters: Counter[];
};

function easeOutExpo(t: number) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function useCountUp(target: number, trigger: boolean, duration = 1500) {
  const [v, setV] = useState(0);
  const counted = useRef(false);
  useEffect(() => {
    if (!trigger || counted.current) return;
    counted.current = true;
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      setV(Math.round(easeOutExpo(progress) * target));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [trigger, target, duration]);
  return v;
}

function CounterCell({ c, inView }: { c: Counter; inView: boolean }) {
  const v = useCountUp(c.value, inView);
  return (
    <div style={{ textAlign: 'center', flex: 1 }}>
      <div
        className="font-display"
        style={{
          fontSize: 36,
          lineHeight: 1,
          color: colors.accent,
          letterSpacing: '-0.5px',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {c.prefix}{v.toLocaleString()}{c.suffix}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 11,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: colors.muted,
        }}
      >
        {c.label}
      </div>
    </div>
  );
}

export default function SocialProofCounter({ counters }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true);
        obs.unobserve(el);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 24,
        padding: '40px 24px',
        borderTop: '1px solid ' + colors.border,
        borderBottom: '1px solid ' + colors.border,
        background: colors.bg2,
      }}
    >
      {counters.map((c, i) => (
        <CounterCell key={i} c={c} inView={inView} />
      ))}
    </div>
  );
}
