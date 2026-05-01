/**
 * FunnelCheckoutModal — LMCT+-style 2-step checkout popup.
 *
 * Step 1 (DETAILS):  Full Name + Email + Phone
 * Step 2 (BILLING):  Card field placeholder + order summary + trust badges
 * Step 3 (SUCCESS):  Confirmation + "download Libo" CTA
 *
 * v1 (current):
 *   - The card field is a styled placeholder; on submit we write the
 *     captured (name, email, phone, tier, package amount) into the
 *     `funnel_signups` table — same destination as before but now
 *     we also persist purchase-intent context.
 *   - No money moves yet. The visual flow exactly mirrors LMCT+.
 *
 * v2 (next, requires Stripe keys + Edge Function):
 *   - Replace the placeholder with @stripe/react-stripe-js <CardElement />
 *   - On submit:
 *       1. Frontend → POST /functions/v1/create_payment_intent
 *          body: { tier_slug, amount, email, full_name, phone }
 *          Edge Function creates Stripe Customer (find by email or new),
 *          creates PaymentIntent (mode=subscription with trial),
 *          returns { client_secret, payment_intent_id }
 *       2. Frontend → stripe.confirmCardPayment(client_secret, {...})
 *       3. Stripe webhook fires `payment_intent.succeeded` → handler
 *          credits tickets_ledger, points_ledger, sets up trialing sub
 *
 * Visual reference: LMCT+ checkout modal (lmctgiveaway.com/muscle-orcash
 * → click any package → modal opens).
 */
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
  /** Numeric amount for order summary */
  amount: number;
};

export type FunnelModalSubmitArgs = {
  fullName: string;
  email: string;
  phone: string;
};

type Props = {
  open: boolean;
  selected: ModalSelectedTier | null;
  /** Currency symbol for order summary, defaults to "€" */
  currency?: string;
  /** Copy strings (i18n keyed) */
  copy: {
    step1Label: string;        // "Details"
    step1Subtitle: string;     // "Where to contact you"
    step2Label: string;        // "Your Info"
    step2Subtitle: string;     // "Your billing info"
    mandatoryNote: string;     // "* Denotes mandatory fields"
    fullNameLabel: string;     // "Full Name *"
    fullNamePlaceholder: string;
    emailLabel: string;        // "Email *"
    emailPlaceholder: string;
    phoneLabel: string;        // "Phone Number *"
    phonePlaceholder: string;
    cardLabel: string;         // "Credit Card Number *"
    cardPlaceholder: string;
    continueCta: string;       // "Continue to billing"
    submitCta: string;         // "Click to enter now"
    secureCheckout: string;    // "100% Guaranteed Secure & Safe Checkout"
    orderItem: string;         // "{tier} Package | {entries} entries"
    orderTotal: string;        // "Order Total"
    legalNote: string;
    successTitle: string;
    successBody: string;
    duplicateTitle: string;
    duplicateBody: string;
    errorMsg: string;
    backLabel: string;         // "Back"
  };
  /** Submission */
  onSubmit: (args: FunnelModalSubmitArgs) => Promise<{ ok: boolean; duplicate?: boolean; error?: string }>;
  onClose: () => void;
};

type ModalState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';
type Step = 1 | 2;

export default function FunnelCheckoutModal({
  open,
  selected,
  currency = '€',
  copy,
  onSubmit,
  onClose,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState('');
  const [state, setState] = useState<ModalState>('idle');

  // Reset on close
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1);
        setFullName('');
        setEmail('');
        setPhone('');
        setCard('');
        setState('idle');
      }, 200);
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open || !selected) return null;

  const isDone = state === 'success' || state === 'duplicate';

  function handleStep1(e: FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || !phone.trim()) return;
    setStep(2);
  }

  async function handleStep2(e: FormEvent) {
    e.preventDefault();
    if (state === 'submitting') return;
    setState('submitting');
    const r = await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
    if (r.ok) setState(r.duplicate ? 'duplicate' : 'success');
    else setState('error');
  }

  // ── Styles (inline for portability + isolation from page CSS) ──

  const overlay: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 100,
    background: 'rgba(0,0,0,0.78)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px',
    overflowY: 'auto',
    backdropFilter: 'blur(8px)',
    animation: 'libo-modal-fade 0.22s ease-out',
  };

  const modal: React.CSSProperties = {
    width: '100%',
    maxWidth: 460,
    background: colors.bg2,
    border: '1px solid ' + colors.border,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    animation: 'libo-modal-slide 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
  };

  const header: React.CSSProperties = {
    background: '#0a0a0a',
    padding: '14px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottom: '1px solid ' + colors.border,
    position: 'relative',
  };

  const closeBtn: React.CSSProperties = {
    position: 'absolute',
    top: '50%',
    right: 12,
    transform: 'translateY(-50%)',
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'rgba(255,255,255,0.08)',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: 14,
    lineHeight: 1,
  };

  const stepRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: '20px 24px 18px',
    borderBottom: '1px solid ' + colors.border,
    gap: 16,
  };

  function stepCellStyle(active: boolean): React.CSSProperties {
    return {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      paddingBottom: 8,
      borderBottom: '2px solid ' + (active ? '#FF6A1A' : 'rgba(255,255,255,0.08)'),
      opacity: active ? 1 : 0.55,
      transition: 'opacity 0.2s, border-color 0.2s',
    };
  }

  function stepNumStyle(active: boolean): React.CSSProperties {
    return {
      flexShrink: 0,
      width: 26,
      height: 26,
      borderRadius: '50%',
      background: active ? '#FF6A1A' : 'rgba(255,255,255,0.1)',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 800,
    };
  }

  const stepLabelTitle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#fff',
    lineHeight: 1.2,
  };

  const stepLabelSub: React.CSSProperties = {
    fontSize: 10,
    color: colors.muted,
    marginTop: 2,
    letterSpacing: 0.3,
  };

  const body: React.CSSProperties = { padding: '24px' };

  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
    marginBottom: 6,
  };

  const input: React.CSSProperties = {
    width: '100%',
    padding: '13px 14px',
    borderRadius: 10,
    border: '1px solid ' + colors.border,
    background: colors.bg3,
    color: colors.text,
    fontFamily: 'inherit',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    marginBottom: 14,
  };

  const submitBtn: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: 12,
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
    marginTop: 8,
  };

  const secureRow: React.CSSProperties = {
    marginTop: 18,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
    fontWeight: 700,
  };

  const trustBadges: React.CSSProperties = {
    marginTop: 12,
    padding: '12px 16px',
    background: '#0a0a0a',
    borderTop: '1px solid ' + colors.border,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    fontSize: 10,
    color: colors.muted,
    letterSpacing: 0.5,
  };

  const trustChip: React.CSSProperties = {
    padding: '4px 8px',
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 4,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 1,
    textTransform: 'uppercase',
    color: '#fff',
  };

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="funnel-modal-title" onClick={onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={modal}>
        {/* HEADER */}
        <div style={header}>
          <img
            src="/brand/logo_options/option_A_wordmark_ascending_dots_transparent.png"
            alt="Libo"
            style={{ height: 22, opacity: 0.95 }}
          />
          <button type="button" onClick={onClose} aria-label="Close" style={closeBtn}>×</button>
        </div>

        {!isDone && (
          <>
            {/* STEP INDICATOR */}
            <div style={stepRow}>
              <div style={stepCellStyle(step === 1)}>
                <span style={stepNumStyle(step === 1)}>1</span>
                <div>
                  <div style={stepLabelTitle}>{copy.step1Label}</div>
                  <div style={stepLabelSub}>{copy.step1Subtitle}</div>
                </div>
              </div>
              <div style={stepCellStyle(step === 2)}>
                <span style={stepNumStyle(step === 2)}>2</span>
                <div>
                  <div style={stepLabelTitle}>{copy.step2Label}</div>
                  <div style={stepLabelSub}>{copy.step2Subtitle}</div>
                </div>
              </div>
            </div>

            {/* BODY */}
            <div style={body}>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 14, letterSpacing: 0.3 }}>
                <span style={{ color: '#FF8A4A' }}>*</span> {copy.mandatoryNote}
              </div>

              {step === 1 && (
                <form onSubmit={handleStep1}>
                  <label htmlFor="fm-name" style={fieldLabel}>
                    <span style={{ color: '#FF8A4A' }}>*</span> {copy.fullNameLabel}
                  </label>
                  <input
                    id="fm-name"
                    type="text"
                    required
                    autoFocus
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={copy.fullNamePlaceholder}
                    style={input}
                  />

                  <label htmlFor="fm-email" style={fieldLabel}>
                    <span style={{ color: '#FF8A4A' }}>*</span> {copy.emailLabel}
                  </label>
                  <input
                    id="fm-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={copy.emailPlaceholder}
                    style={input}
                  />

                  <label htmlFor="fm-phone" style={fieldLabel}>
                    <span style={{ color: '#FF8A4A' }}>*</span> {copy.phoneLabel}
                  </label>
                  <input
                    id="fm-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={copy.phonePlaceholder}
                    style={input}
                  />

                  <button type="submit" style={submitBtn}>
                    {copy.continueCta}
                  </button>

                  <div style={secureRow}>🔒 {copy.secureCheckout}</div>
                </form>
              )}

              {step === 2 && (
                <form onSubmit={handleStep2}>
                  {/* Order summary header row */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      padding: '12px 14px',
                      background: colors.bg3,
                      border: '1px solid ' + colors.border,
                      borderRadius: 10,
                      marginBottom: 14,
                      fontSize: 13,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
                        Item
                      </div>
                      <div style={{ color: colors.text, fontWeight: 600 }}>
                        {copy.orderItem.replace('{tier}', selected.name).replace('{summary}', selected.heroSummary)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>
                        Price
                      </div>
                      <div style={{ color: colors.text, fontWeight: 800 }}>{selected.price}</div>
                    </div>
                  </div>

                  {/* Card field — placeholder for Stripe Elements */}
                  <label htmlFor="fm-card" style={fieldLabel}>
                    <span style={{ color: '#FF8A4A' }}>*</span> {copy.cardLabel}
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="fm-card"
                      type="text"
                      required
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={card}
                      onChange={(e) => setCard(e.target.value)}
                      placeholder={copy.cardPlaceholder}
                      style={{ ...input, paddingLeft: 44 }}
                      maxLength={23}
                    />
                    <span
                      aria-hidden="true"
                      style={{
                        position: 'absolute',
                        left: 14,
                        top: 13,
                        width: 22,
                        height: 16,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #4A8FCF, #2C5A8A)',
                      }}
                    />
                  </div>

                  {/* Order total */}
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto',
                      borderTop: '1px solid ' + colors.border,
                      paddingTop: 14,
                      marginTop: 4,
                      marginBottom: 18,
                      fontSize: 14,
                      gap: 8,
                    }}
                  >
                    <div style={{ color: colors.muted }}>
                      {selected.name} Package
                    </div>
                    <div style={{ textAlign: 'right', color: colors.text, fontWeight: 700 }}>
                      {currency}{selected.amount.toFixed(2)}
                    </div>
                    <div style={{ color: colors.text, fontWeight: 800, fontSize: 16, paddingTop: 6, borderTop: '1px solid ' + colors.border }}>
                      {copy.orderTotal}
                    </div>
                    <div style={{ textAlign: 'right', color: '#FF8A4A', fontWeight: 900, fontSize: 18, paddingTop: 6, borderTop: '1px solid ' + colors.border }}>
                      {currency}{selected.amount.toFixed(2)}
                    </div>
                  </div>

                  <button type="submit" disabled={state === 'submitting'} style={submitBtn}>
                    {state === 'submitting' ? '…' : copy.submitCta}
                  </button>

                  {state === 'error' && (
                    <p style={{ marginTop: 10, fontSize: 12, color: colors.error, textAlign: 'center' }}>
                      {copy.errorMsg}
                    </p>
                  )}

                  <div style={secureRow}>🔒 {copy.secureCheckout}</div>

                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    style={{
                      width: '100%',
                      marginTop: 10,
                      padding: '10px',
                      background: 'transparent',
                      color: colors.muted,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 12,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                    }}
                  >
                    ← {copy.backLabel}
                  </button>

                  <p style={{ marginTop: 10, fontSize: 10, color: colors.dim, lineHeight: 1.5, textAlign: 'center' }}>
                    {copy.legalNote}
                  </p>
                </form>
              )}
            </div>

            {/* TRUST BADGES */}
            <div style={trustBadges}>
              <span style={trustChip}>Stripe</span>
              <span style={trustChip}>Visa</span>
              <span style={trustChip}>MC</span>
              <span style={trustChip}>Amex</span>
              <span style={trustChip}>Apple Pay</span>
            </div>
          </>
        )}

        {isDone && (
          <div style={{ ...body, textAlign: 'center', padding: '36px 28px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF8A4A 0%, #FF6A1A 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 22px',
                fontSize: 32,
                color: '#fff',
                boxShadow: '0 12px 32px rgba(255,106,26,0.4)',
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <h2 className="font-display" style={{ fontSize: 26, margin: '0 0 12px', color: colors.text, letterSpacing: '-0.5px' }}>
              {state === 'duplicate' ? copy.duplicateTitle : copy.successTitle}
            </h2>
            <p style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, margin: '0 0 28px' }}>
              {state === 'duplicate' ? copy.duplicateBody : copy.successBody}
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
