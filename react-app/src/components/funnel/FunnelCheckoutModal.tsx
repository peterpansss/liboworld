import { useEffect, useState, type FormEvent } from 'react';
import { colors } from '../../theme';

export type ModalSelectedTier = {
  /** Display name e.g. "BRONZE" */
  name: string;
  /** Price label e.g. "€10" */
  price: string;
  /** Hero number e.g. "5 entries" */
  heroSummary: string;
  /** Tier slug used for storage */
  tierSlug: string;
};

type Props = {
  open: boolean;
  selected: ModalSelectedTier | null;
  /** Step 1 copy */
  title: string;
  subtitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  ctaLabel: string;
  successTitle: string;
  successBody: string;
  duplicateTitle: string;
  duplicateBody: string;
  errorMsg: string;
  legalNote: string;
  /** Submission */
  onSubmit: (email: string) => Promise<{ ok: boolean; duplicate?: boolean; error?: string }>;
  onClose: () => void;
};

type State = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';

export default function FunnelCheckoutModal({
  open,
  selected,
  title,
  subtitle,
  emailLabel,
  emailPlaceholder,
  ctaLabel,
  successTitle,
  successBody,
  duplicateTitle,
  duplicateBody,
  errorMsg,
  legalNote,
  onSubmit,
  onClose,
}: Props) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<State>('idle');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => { setEmail(''); setState('idle'); }, 200);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !selected) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (state === 'submitting') return;
    setState('submitting');
    const r = await onSubmit(email.trim());
    if (r.ok) setState(r.duplicate ? 'duplicate' : 'success');
    else setState('error');
  }

  const isDone = state === 'success' || state === 'duplicate';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="funnel-modal-title"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backdropFilter: 'blur(6px)',
        animation: 'libo-modal-fade 0.2s ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 480,
          width: '100%',
          background: colors.bg2,
          border: '1px solid ' + colors.border,
          borderRadius: 16,
          padding: 32,
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto',
          animation: 'libo-modal-slide 0.25s ease-out',
        }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#fff',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {!isDone && (
          <>
            <div style={{ fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: '#FF6A1A', fontWeight: 800, marginBottom: 12 }}>
              {selected.name} · {selected.price}
            </div>
            <h2
              id="funnel-modal-title"
              className="font-display"
              style={{ fontSize: 26, lineHeight: 1.1, margin: '0 0 8px', letterSpacing: '-0.5px', color: colors.text }}
            >
              {title}
            </h2>
            <p style={{ fontSize: 14, color: colors.muted, lineHeight: 1.5, margin: '0 0 20px' }}>
              {subtitle}
            </p>

            <div
              style={{
                padding: '12px 16px',
                background: 'rgba(255,106,26,0.08)',
                border: '1px solid rgba(255,106,26,0.25)',
                borderRadius: 10,
                fontSize: 13,
                color: colors.text,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              <strong style={{ color: '#FF8A4A' }}>{selected.heroSummary}</strong>
            </div>

            <form onSubmit={handleSubmit}>
              <label
                htmlFor="funnel-modal-email"
                style={{
                  display: 'block',
                  fontSize: 11,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  color: colors.muted,
                  fontWeight: 700,
                  marginBottom: 8,
                }}
              >
                {emailLabel}
              </label>
              <input
                id="funnel-modal-email"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={emailPlaceholder}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: '1px solid ' + colors.border,
                  background: colors.bg3,
                  color: colors.text,
                  fontFamily: 'inherit',
                  fontSize: 15,
                  outline: 'none',
                  marginBottom: 14,
                  boxSizing: 'border-box',
                }}
              />

              <button
                type="submit"
                disabled={state === 'submitting'}
                style={{
                  width: '100%',
                  padding: '16px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(90deg, #FF8A4A 0%, #FF6A1A 100%)',
                  color: '#fff',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: 1.5,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  boxShadow: '0 8px 24px rgba(255,106,26,0.3)',
                  transition: 'transform 0.12s, opacity 0.15s',
                  opacity: state === 'submitting' ? 0.7 : 1,
                }}
              >
                {state === 'submitting' ? '…' : ctaLabel}
              </button>

              {state === 'error' && (
                <p style={{ marginTop: 12, fontSize: 13, color: colors.error, textAlign: 'center' }}>
                  {errorMsg}
                </p>
              )}

              <p style={{ marginTop: 14, fontSize: 11, color: colors.dim, lineHeight: 1.5, textAlign: 'center' }}>
                {legalNote}
              </p>
            </form>
          </>
        )}

        {isDone && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF8A4A 0%, #FF6A1A 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
                fontSize: 28,
                color: '#fff',
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <h2
              className="font-display"
              style={{ fontSize: 24, margin: '0 0 12px', color: colors.text, letterSpacing: '-0.5px' }}
            >
              {state === 'duplicate' ? duplicateTitle : successTitle}
            </h2>
            <p style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, margin: '0 0 24px' }}>
              {state === 'duplicate' ? duplicateBody : successBody}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: '1px solid ' + colors.border,
                background: 'transparent',
                color: colors.text,
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes libo-modal-fade { from { opacity: 0; } to { opacity: 1; } }
        @keyframes libo-modal-slide {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
