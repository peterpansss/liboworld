import { useState, type FormEvent } from 'react';
import { colors, webExtras } from '../../theme';

export type PackageHighlight = 'bronze' | 'silver' | 'gold' | 'starter' | 'pro' | 'elite';

export type PackageInclusion = {
  /** Big number, e.g. "5", "1 Month", "€15" */
  value: string;
  /** Subtext under the number, e.g. "free entries", "Pro access" */
  label: string;
};

type Props = {
  /** Top label, e.g. "BRONZE PACKAGE" or "STARTER POOL" */
  name: string;
  /** Big price label, e.g. "€10" or "Free" */
  price: string;
  /** Small text under the price, e.g. "single payment" or "no purchase necessary" */
  priceSubline?: string;
  /** Highlight ribbon e.g. "MOST POPULAR" or "BEST VALUE" */
  badge?: string;
  /** Color theme of the card */
  highlight: PackageHighlight;
  /** Bullet inclusions */
  inclusions: PackageInclusion[];
  /** CTA button text e.g. "SELECT" or "RESERVE MY SLOT" */
  ctaLabel: string;
  /** Submit handler — receives the email */
  onSubmit: (email: string) => Promise<{ ok: boolean; duplicate?: boolean; error?: string }>;
  /** Disclosure copy under the form, e.g. tier-gating notes */
  footnote?: string;
  /** Email input placeholder */
  emailPlaceholder: string;
  /** Success message */
  successMsg: string;
  /** Already-on-list message */
  duplicateMsg: string;
  /** Error message */
  errorMsg: string;
};

const HIGHLIGHT_COLORS: Record<PackageHighlight, { bg: string; border: string; accent: string; chip: string }> = {
  bronze:  { bg: 'linear-gradient(160deg, #4a3a2e 0%, #2a221c 100%)', border: '#8a6a4a', accent: '#d4a373', chip: '#7a5a3a' },
  silver:  { bg: 'linear-gradient(160deg, #3a3a40 0%, #1f1f24 100%)', border: '#9aa0aa', accent: '#cfd5e0', chip: '#5a606a' },
  gold:    { bg: 'linear-gradient(160deg, #4a3e1e 0%, #2a230f 100%)', border: '#d4af37', accent: '#f3d06f', chip: '#8a6e1e' },
  starter: { bg: 'linear-gradient(160deg, #1a1f2a 0%, #0e1118 100%)', border: 'rgba(255,255,255,0.12)', accent: colors.muted, chip: 'rgba(255,255,255,0.06)' },
  pro:     { bg: 'linear-gradient(160deg, #1a2419 0%, #0d130c 100%)', border: colors.accent, accent: colors.accent, chip: colors.accentDim },
  elite:   { bg: 'linear-gradient(160deg, #2a2014 0%, #14100a 100%)', border: '#eab308', accent: '#facc15', chip: 'rgba(234,179,8,0.18)' },
};

type Submitting = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export default function PackageCard({
  name,
  price,
  priceSubline,
  badge,
  highlight,
  inclusions,
  ctaLabel,
  onSubmit,
  footnote,
  emailPlaceholder,
  successMsg,
  duplicateMsg,
  errorMsg,
}: Props) {
  const palette = HIGHLIGHT_COLORS[highlight];
  const [email, setEmail] = useState('');
  const [state, setState] = useState<Submitting>('idle');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === 'submitting' || state === 'success' || state === 'duplicate') return;
    setState('submitting');
    const r = await onSubmit(email.trim());
    if (r.ok) setState(r.duplicate ? 'duplicate' : 'success');
    else setState('error');
  }

  const isDone = state === 'success' || state === 'duplicate';

  return (
    <article
      style={{
        position: 'relative',
        borderRadius: 16,
        padding: '32px 24px 24px',
        background: palette.bg,
        border: '1px solid ' + palette.border,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 480,
      }}
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: -12,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '5px 12px',
            borderRadius: 6,
            background: palette.accent,
            color: webExtras.accentText,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {badge}
        </span>
      )}

      <div
        className="font-display"
        style={{
          fontSize: 22,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: palette.accent,
          marginBottom: 4,
        }}
      >
        {name}
      </div>

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span
          className="font-display"
          style={{ fontSize: 44, lineHeight: 1, letterSpacing: '-1px', color: '#fff' }}
        >
          {price}
        </span>
      </div>
      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 20 }}>
        {priceSubline ?? ' '}
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {inclusions.map((inc, i) => (
          <li
            key={i}
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 8,
              fontSize: 13,
              color: '#fff',
              padding: '8px 10px',
              background: palette.chip,
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <strong style={{ color: palette.accent, fontWeight: 700, minWidth: 50 }}>{inc.value}</strong>
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{inc.label}</span>
          </li>
        ))}
      </ul>

      <form onSubmit={handleSubmit} style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input
          type="email"
          required
          aria-label={emailPlaceholder}
          placeholder={emailPlaceholder}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isDone}
          style={{
            padding: '10px 12px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(0,0,0,0.3)',
            color: '#fff',
            fontFamily: 'inherit',
            fontSize: 13,
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={state === 'submitting' || isDone}
          style={{
            padding: '12px 16px',
            borderRadius: 8,
            border: 'none',
            background: isDone ? 'rgba(255,255,255,0.1)' : palette.accent,
            color: isDone ? '#fff' : webExtras.accentText,
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            cursor: isDone ? 'default' : 'pointer',
            transition: 'opacity 0.2s, transform 0.15s',
          }}
        >
          {state === 'submitting' ? '…' : state === 'success' ? successMsg : state === 'duplicate' ? duplicateMsg : state === 'error' ? errorMsg : ctaLabel}
        </button>
      </form>

      {footnote && (
        <div style={{ marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5 }}>
          {footnote}
        </div>
      )}
    </article>
  );
}
