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
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import type { Appearance, StripeElementsOptions } from '@stripe/stripe-js';
import { colors } from '../../theme';
import { getStripe, isStripeConfigured } from '../../lib/stripe';
import { STORE_URLS } from '../../utils/storeRedirect';

// ── Accent theme ────────────────────────────────────────────────────────
// The modal is shared between the giveaway funnel (orange) and the founding
// early-access checkout (Libo lime). Callers pass the accent; giveaway keeps
// the default orange so nothing changes there.
export type AccentTheme = {
  solid: string;    // brand accent for solid fills / borders / stripe primary
  light: string;    // lighter tint for asterisks, links, order-total text
  gradA: string;    // filled-button gradient start (lighter)
  gradB: string;    // filled-button gradient end (darker)
  glowRgb: string;  // "r,g,b" for rgba() glow shadows
  onAccent: string; // text/icon color on a solid/gradient accent fill
};

export const ORANGE_ACCENT: AccentTheme = {
  solid: '#FF6A1A',
  light: '#FF8A4A',
  gradA: '#FF8A4A',
  gradB: '#FF6A1A',
  glowRgb: '255,106,26',
  onAccent: '#fff',
};

// Lime on near-black — matches the Libo brand system (--accent #CAFF00,
// --accent2 #9BC800, --accent-text #080B10). Dark text on lime for contrast.
export const LIME_ACCENT: AccentTheme = {
  solid: '#CAFF00',
  light: '#CAFF00',
  gradA: '#CAFF00',
  gradB: '#9BC800',
  glowRgb: '202,255,0',
  onAccent: '#080B10',
};

// Public QR generator — matches the pattern used by StoreRedirectOverlay on
// /cash-challenge. The QR target is liboworld.com/get-app, which client-side
// UA-routes phones to App Store / Play Store. No per-platform QR variants
// needed; tierSlug is included for downstream analytics.
function qrSrcForGetApp(tierSlug: string): string {
  const target = `https://liboworld.com/get-app?tier=${encodeURIComponent(tierSlug)}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(target)}`;
}

// Inline sr-only style — visually hidden, still announced by screen readers.
const srOnly: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  overflow: 'hidden',
  clip: 'rect(0,0,0,0)',
  whiteSpace: 'nowrap',
};

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((el) => {
    if (el.getAttribute('aria-hidden') === 'true') return false;
    // Skip elements explicitly hidden via `display: none` / inline `hidden`.
    // We deliberately do NOT use `offsetParent === null` because jsdom
    // does not compute layout and would mark every element as hidden.
    if (el.hasAttribute('hidden')) return false;
    if ((el as HTMLElement).style && (el as HTMLElement).style.display === 'none') return false;
    return true;
  });
}

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
  /** When Stripe is wired and the PaymentIntent has been confirmed,
   *  this holds the Stripe payment_intent_id. v1 (no Stripe) leaves
   *  this undefined and we just write to funnel_signups. */
  paymentIntentId?: string;
};

/** Initiates the Stripe PaymentIntent for a given tier+email; returns
 *  the client_secret needed to confirm payment in the modal.
 *  Set by the page (Giveaway/CashChallenge) so the modal stays
 *  framework-agnostic — passes through to lib/funnelCheckout.ts. */
export type CreateIntentFn = (args: {
  email: string;
  fullName: string;
  phone: string;
}) => Promise<{ ok: true; clientSecret: string; paymentIntentId: string } | { ok: false; error: string }>;

type Props = {
  open: boolean;
  /** Seed the step-1 email field — e.g. the address the user already gave a
   *  waitlist capture, so the founding-member upsell doesn't ask twice. */
  initialEmail?: string;
  selected: ModalSelectedTier | null;
  /** Currency symbol for order summary, defaults to "€" */
  currency?: string;
  /** When provided, the modal switches to real Stripe checkout: Step 2's
   *  card field becomes a Stripe PaymentElement and submission confirms
   *  the PaymentIntent. When omitted, falls back to placeholder card +
   *  intent-only capture into funnel_signups (current v1 behavior). */
  createIntent?: CreateIntentFn;
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
    /** Order-summary line item. Defaults to "{selected.name} Package"
     *  (giveaway); early access passes a bespoke label since "Founding
     *  Member Package" reads awkwardly. */
    orderSummaryItem?: string;
    legalNote: string;
    successTitle: string;
    successBody: string;
    duplicateTitle: string;
    duplicateBody: string;
    errorMsg: string;
    backLabel: string;         // "Back"
    /** EU Directive 2011/83/EU Art. 16(m) consent strings (Step 1 checkbox) */
    consentLabel: string;
    consentLinkLabel: string;
    consentRequired: string;
  };
  /** Submission */
  onSubmit: (args: FunnelModalSubmitArgs) => Promise<{ ok: boolean; duplicate?: boolean; error?: string }>;
  onClose: () => void;
  /** Where the Step-1 consent link points. Defaults to the points-pack
   *  section; early access passes '/terms#early-access'. */
  consentHref?: string;
  /** Whether the success screen shows the scan-to-download QR + App Store
   *  badge. True for giveaway packs (app is live for buyers); false for
   *  early access (app isn't out yet — nothing to download). */
  showGetAppCta?: boolean;
  /** Accent theme. Defaults to orange (giveaway). Founding passes LIME_ACCENT. */
  accent?: AccentTheme;
};

type ModalState = 'idle' | 'submitting' | 'success' | 'duplicate' | 'error';
type Step = 1 | 2;

export default function FunnelCheckoutModal({
  open,
  initialEmail = '',
  selected,
  currency = '€',
  createIntent,
  copy,
  onSubmit,
  onClose,
  // #points-packs is gated off by GIVEAWAYS_ENABLED and does not render, so
  // the old default silently dumped the reader at the top of /terms.
  consentHref = '/terms#early-access',
  showGetAppCta = true,
  accent = ORANGE_ACCENT,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [card, setCard] = useState('');
  const [state, setState] = useState<ModalState>('idle');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [intentError, setIntentError] = useState<string | null>(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  // Per-field validation errors for Step 1. Populated when the user clicks
  // Continue with empty/whitespace-only inputs (the native `required`
  // attribute would catch empty strings but treats whitespace as valid).
  const [fieldErrors, setFieldErrors] = useState<{
    fullName?: string;
    email?: string;
    phone?: string;
  }>({});
  // EU Directive 2011/83/EU Art. 16(m) — buyer must expressly acknowledge
  // the non-refundability of converted points + waive the 14-day right of
  // withdrawal. Without this consent, the non-refundability clause is
  // legally unenforceable in the EU. See PARTNERSHIP-FINANCE-MODEL.md §4.4.
  const [termsAccepted, setTermsAccepted] = useState(false);

  const dialogRef = useRef<HTMLDivElement | null>(null);
  // Element to restore focus to when the modal closes — captured on open.
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const stripeMode = !!createIntent && isStripeConfigured();
  const stripePromise = useMemo(() => (stripeMode ? getStripe() : null), [stripeMode]);

  const isDirty = !!(fullName || email || phone || card);
  const isDone = state === 'success' || state === 'duplicate';

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
        setClientSecret(null);
        setPaymentIntentId(null);
        setIntentError(null);
        setFieldErrors({});
        setTermsAccepted(false);
      }, 200);
    }
  }, [open]);

  // Prefill the email the user already gave upstream (waitlist capture), so
  // the founding-member step doesn't ask for it a second time. Runs on open;
  // the close handler above clears it again.
  useEffect(() => {
    if (open && initialEmail) setEmail(initialEmail);
  }, [open, initialEmail]);

  // Esc to close (always allowed — same convention as native <dialog>).
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

  // Focus management:
  //  - on open: capture the currently-focused element (the trigger), then
  //    move focus into the dialog (first focusable element).
  //  - on close: restore focus to the trigger.
  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;
    // Defer until after the dialog content has rendered.
    const t = setTimeout(() => {
      const root = dialogRef.current;
      if (!root) return;
      const focusables = getFocusable(root);
      // Prefer the first input/select/textarea over the close button.
      const firstField = focusables.find((el) =>
        el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA',
      );
      (firstField ?? focusables[0] ?? root).focus();
    }, 0);
    return () => {
      clearTimeout(t);
      const prev = previousFocusRef.current;
      if (prev && typeof prev.focus === 'function') {
        // Defer so this runs after the dialog is fully torn down.
        setTimeout(() => prev.focus(), 0);
      }
    };
  }, [open]);

  // Focus trap: cycle Tab / Shift+Tab so focus never escapes the dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = getFocusable(root);
      if (focusables.length === 0) {
        e.preventDefault();
        root.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last || !root.contains(active)) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !selected) return null;

  // Accessible name for the dialog. The header only renders the brand
  // wordmark image (`alt="Libo"`), so without an explicit title element
  // screen readers had nothing to anchor `aria-labelledby` to. We always
  // include the literal word "Checkout" (so consumers can rely on it for
  // assistive-tech queries) and append the current step label.
  const stepTitle = isDone
    ? state === 'duplicate'
      ? copy.duplicateTitle
      : copy.successTitle
    : step === 1
    ? copy.step1Label
    : copy.step2Label;
  const dialogTitle = `Checkout — ${stepTitle}`;

  // Overlay click handler. Closing should NOT silently discard mid-form data,
  // but the success state and a clean form may close without confirmation.
  function handleOverlayClick() {
    if (isDone || !isDirty) {
      onClose();
      return;
    }
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      const ok = window.confirm('Discard your information and close this checkout?');
      if (ok) onClose();
      return;
    }
    onClose();
  }

  async function handleStep1(e: FormEvent) {
    e.preventDefault();

    // Validate against trimmed values so whitespace-only entries don't slip
    // through the native `required` check (which treats " " as non-empty).
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();
    const trimmedPhone = phone.trim();
    const nextErrors: typeof fieldErrors = {};
    if (!trimmedName) nextErrors.fullName = 'This field is required';
    if (!trimmedEmail) nextErrors.email = 'This field is required';
    if (!trimmedPhone) nextErrors.phone = 'This field is required';
    if (nextErrors.fullName || nextErrors.email || nextErrors.phone) {
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});
    // Defense-in-depth: the submit button is already disabled when this is
    // false, but a malicious client could re-enable it via devtools. Block
    // here too so the only way to reach Step 2 is with explicit consent.
    // EU Directive 2011/83/EU Art. 16(m) — see PARTNERSHIP-FINANCE-MODEL.md §4.4.
    if (!termsAccepted) {
      setIntentError(copy.consentRequired);
      return;
    }

    // Stripe mode: kick off the PaymentIntent before transitioning to Step 2,
    // so the PaymentElement has a clientSecret to render against.
    if (stripeMode && createIntent) {
      setCreatingIntent(true);
      setIntentError(null);
      const r = await createIntent({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
      });
      setCreatingIntent(false);
      if (!r.ok) {
        setIntentError(r.error);
        return;
      }
      setClientSecret(r.clientSecret);
      setPaymentIntentId(r.paymentIntentId);
    }
    setStep(2);
  }

  async function handleStep2Offline(e: FormEvent) {
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

  async function handleStripePaymentSuccess(piId: string) {
    setState('submitting');
    const r = await onSubmit({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      paymentIntentId: piId,
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
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
  };

  const stepRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    padding: '20px 24px 18px',
    margin: 0,
    listStyle: 'none',
    borderBottom: '1px solid ' + colors.border,
    gap: 16,
  };

  function stepCellStyle(active: boolean): React.CSSProperties {
    return {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      paddingBottom: 8,
      borderBottom: '2px solid ' + (active ? accent.solid : 'rgba(255,255,255,0.08)'),
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
      background: active ? accent.solid : 'rgba(255,255,255,0.1)',
      color: active ? accent.onAccent : '#fff',
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

  const fieldErrorStyle: React.CSSProperties = {
    fontSize: 12,
    color: colors.error,
    marginTop: 0,
    marginBottom: 10,
    fontWeight: 600,
  };

  const submitBtn: React.CSSProperties = {
    width: '100%',
    padding: '16px',
    borderRadius: 12,
    border: 'none',
    background: `linear-gradient(90deg, ${accent.gradA} 0%, ${accent.gradB} 100%)`,
    color: accent.onAccent,
    fontFamily: 'inherit',
    fontSize: 14,
    fontWeight: 900,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    cursor: 'pointer',
    boxShadow: `0 8px 24px rgba(${accent.glowRgb},0.3)`,
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
    <div role="dialog" aria-modal="true" aria-labelledby="funnel-modal-title" onClick={handleOverlayClick} style={overlay}>
      <div ref={dialogRef} tabIndex={-1} onClick={(e) => e.stopPropagation()} style={modal}>
        {/* Visually-hidden accessible name for the dialog. Anchors the
            aria-labelledby above so screen readers announce a real title. */}
        <h2 id="funnel-modal-title" style={srOnly}>
          {dialogTitle}
        </h2>
        {/* HEADER */}
        <div style={header}>
          <img
            src="/brand/logo_options/libo-dark.svg"
            alt="Libo"
            style={{ height: 22, opacity: 0.95 }}
          />
          <button type="button" onClick={onClose} aria-label="Close" style={closeBtn}>
            {/* SVG x-glyph keeps the visual mark but is hidden from AT —
                the button's aria-label="Close" is what gets announced. */}
            <svg
              aria-hidden="true"
              focusable="false"
              width="12"
              height="12"
              viewBox="0 0 12 12"
              style={{ display: 'block' }}
            >
              <path
                d="M2 2 L10 10 M10 2 L2 10"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {!isDone && (
          <>
            {/* STEP INDICATOR */}
            <ol style={stepRow} aria-label="Checkout steps">
              <li
                style={stepCellStyle(step === 1)}
                aria-current={step === 1 ? 'step' : undefined}
              >
                <span style={stepNumStyle(step === 1)} aria-hidden="true">1</span>
                <div>
                  <div style={stepLabelTitle}>
                    <span style={srOnly}>Step 1 of 2: </span>
                    {copy.step1Label}
                  </div>
                  <div style={stepLabelSub}>{copy.step1Subtitle}</div>
                </div>
              </li>
              <li
                style={stepCellStyle(step === 2)}
                aria-current={step === 2 ? 'step' : undefined}
              >
                <span style={stepNumStyle(step === 2)} aria-hidden="true">2</span>
                <div>
                  <div style={stepLabelTitle}>
                    <span style={srOnly}>Step 2 of 2: </span>
                    {copy.step2Label}
                  </div>
                  <div style={stepLabelSub}>{copy.step2Subtitle}</div>
                </div>
              </li>
            </ol>

            {/* BODY */}
            <div style={body}>
              <div style={{ fontSize: 11, color: colors.muted, marginBottom: 14, letterSpacing: 0.3 }}>
                <span style={{ color: accent.light }}>*</span> {copy.mandatoryNote}
              </div>

              {step === 1 && (
                <form onSubmit={handleStep1} noValidate>
                  <label htmlFor="fm-name" style={fieldLabel}>
                    <span style={{ color: accent.light }}>*</span> {copy.fullNameLabel}
                  </label>
                  <input
                    id="fm-name"
                    type="text"
                    required
                    autoComplete="name"
                    aria-invalid={fieldErrors.fullName ? 'true' : undefined}
                    aria-describedby={fieldErrors.fullName ? 'fm-name-err' : undefined}
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
                    }}
                    placeholder={copy.fullNamePlaceholder}
                    style={fieldErrors.fullName ? { ...input, border: '1px solid ' + colors.error, marginBottom: 4 } : input}
                  />
                  {fieldErrors.fullName && (
                    <div id="fm-name-err" role="alert" style={fieldErrorStyle}>
                      {fieldErrors.fullName}
                    </div>
                  )}

                  <label htmlFor="fm-email" style={fieldLabel}>
                    <span style={{ color: accent.light }}>*</span> {copy.emailLabel}
                  </label>
                  <input
                    id="fm-email"
                    type="email"
                    required
                    autoComplete="email"
                    aria-invalid={fieldErrors.email ? 'true' : undefined}
                    aria-describedby={fieldErrors.email ? 'fm-email-err' : undefined}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                    }}
                    placeholder={copy.emailPlaceholder}
                    style={fieldErrors.email ? { ...input, border: '1px solid ' + colors.error, marginBottom: 4 } : input}
                  />
                  {fieldErrors.email && (
                    <div id="fm-email-err" role="alert" style={fieldErrorStyle}>
                      {fieldErrors.email}
                    </div>
                  )}

                  <label htmlFor="fm-phone" style={fieldLabel}>
                    <span style={{ color: accent.light }}>*</span> {copy.phoneLabel}
                  </label>
                  <input
                    id="fm-phone"
                    type="tel"
                    required
                    autoComplete="tel"
                    aria-invalid={fieldErrors.phone ? 'true' : undefined}
                    aria-describedby={fieldErrors.phone ? 'fm-phone-err' : undefined}
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (fieldErrors.phone) setFieldErrors((p) => ({ ...p, phone: undefined }));
                    }}
                    placeholder={copy.phonePlaceholder}
                    style={fieldErrors.phone ? { ...input, border: '1px solid ' + colors.error, marginBottom: 4 } : input}
                  />
                  {fieldErrors.phone && (
                    <div id="fm-phone-err" role="alert" style={fieldErrorStyle}>
                      {fieldErrors.phone}
                    </div>
                  )}

                  {/* EU Directive 2011/83/EU Art. 16(m) consent — buyer must
                      expressly acknowledge non-refundability of converted
                      points and waive the 14-day right of withdrawal. The
                      Continue button is disabled until this is checked, and
                      handleStep1 also rejects submission as defense-in-depth.
                      See PARTNERSHIP-FINANCE-MODEL.md §4.4. */}
                  <label
                    htmlFor="fm-terms"
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 8,
                      marginTop: 4,
                      marginBottom: 14,
                      fontSize: 12,
                      lineHeight: 1.5,
                      color: colors.muted,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      id="fm-terms"
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked);
                        if (e.target.checked && intentError === copy.consentRequired) {
                          setIntentError(null);
                        }
                      }}
                      style={{
                        flexShrink: 0,
                        marginTop: 2,
                        width: 14,
                        height: 14,
                        accentColor: accent.solid,
                        cursor: 'pointer',
                      }}
                    />
                    <span>
                      {copy.consentLabel}{' '}
                      <a
                        href={consentHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{ color: accent.light, textDecoration: 'underline' }}
                      >
                        {copy.consentLinkLabel}
                      </a>
                    </span>
                  </label>

                  <button
                    type="submit"
                    style={{
                      ...submitBtn,
                      opacity: !termsAccepted || creatingIntent ? 0.5 : 1,
                      cursor: !termsAccepted || creatingIntent ? 'not-allowed' : 'pointer',
                    }}
                    disabled={creatingIntent || !termsAccepted}
                  >
                    {creatingIntent ? '…' : copy.continueCta}
                  </button>

                  {intentError && (
                    <p style={{ marginTop: 10, fontSize: 12, color: colors.error, textAlign: 'center' }}>
                      {intentError}
                    </p>
                  )}

                  <div style={secureRow}>🔒 {copy.secureCheckout}</div>
                </form>
              )}

              {step === 2 && stripeMode && clientSecret && stripePromise && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: makeStripeAppearance(accent),
                  } as StripeElementsOptions}
                >
                  <Step2Stripe
                    selected={selected}
                    currency={currency}
                    copy={copy}
                    accent={accent}
                    paymentIntentId={paymentIntentId}
                    onPaid={handleStripePaymentSuccess}
                    onBack={() => setStep(1)}
                    submitting={state === 'submitting'}
                  />
                </Elements>
              )}

              {step === 2 && (!stripeMode || !clientSecret) && (
                <form onSubmit={handleStep2Offline}>
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
                    <span style={{ color: accent.light }}>*</span> {copy.cardLabel}
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
                      {copy.orderSummaryItem ?? `${selected.name} Package`}
                    </div>
                    <div style={{ textAlign: 'right', color: colors.text, fontWeight: 700 }}>
                      {currency}{selected.amount.toFixed(2)}
                    </div>
                    <div style={{ color: colors.text, fontWeight: 800, fontSize: 16, paddingTop: 6, borderTop: '1px solid ' + colors.border }}>
                      {copy.orderTotal}
                    </div>
                    <div style={{ textAlign: 'right', color: accent.light, fontWeight: 900, fontSize: 18, paddingTop: 6, borderTop: '1px solid ' + colors.border }}>
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
                background: `linear-gradient(135deg, ${accent.gradA} 0%, ${accent.gradB} 100%)`,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 22px',
                fontSize: 32,
                color: accent.onAccent,
                boxShadow: `0 12px 32px rgba(${accent.glowRgb},0.4)`,
              }}
              aria-hidden="true"
            >
              ✓
            </div>
            <h2 className="font-display" style={{ fontSize: 26, margin: '0 0 12px', color: colors.text, letterSpacing: '-0.5px' }}>
              {state === 'duplicate' ? copy.duplicateTitle : copy.successTitle}
            </h2>
            <p style={{ fontSize: 14, color: colors.muted, lineHeight: 1.6, margin: '0 0 22px' }}>
              {state === 'duplicate' ? copy.duplicateBody : copy.successBody}
            </p>

            {/* Scan-to-download — same /get-app routing pattern as
                /cash-challenge. Phones tapping the App Store badge get
                routed; desktops scan the QR with their phone. Hidden for
                early access (showGetAppCta=false) — the app isn't out yet. */}
            {showGetAppCta && selected && (
              <>
                <div
                  style={{
                    width: 168,
                    height: 168,
                    margin: '0 auto 14px',
                    padding: 10,
                    background: '#fff',
                    borderRadius: 12,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  }}
                >
                  <img
                    src={qrSrcForGetApp(selected.tierSlug)}
                    alt="Scan to download the Libo app"
                    width={148}
                    height={148}
                    style={{ display: 'block', width: '100%', height: '100%' }}
                  />
                </div>
                <a
                  href={STORE_URLS.ios}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Download on the App Store"
                  style={{ display: 'inline-block', marginBottom: 22, textDecoration: 'none' }}
                >
                  <img
                    src="/store-badges/app-store.svg"
                    alt="Download on the App Store"
                    style={{ height: 40, width: 'auto', display: 'block' }}
                  />
                </a>
              </>
            )}

            <div>
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

// ── Stripe Elements appearance — matches the Libo dark theme ─────────────

function makeStripeAppearance(accent: AccentTheme): Appearance {
  return {
    theme: 'night',
    variables: {
      colorPrimary: accent.solid,
      colorBackground: colors.bg3,
      colorText: colors.text,
      colorDanger: colors.error,
      fontFamily: 'inherit',
      borderRadius: '10px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        backgroundColor: colors.bg3,
        borderColor: colors.border,
        color: colors.text,
      },
      '.Input:focus': {
        borderColor: accent.solid,
        boxShadow: '0 0 0 1px ' + accent.solid,
      },
      '.Tab': {
        backgroundColor: colors.bg3,
        borderColor: colors.border,
      },
      '.Tab--selected': {
        borderColor: accent.solid,
      },
    },
  };
}

// ── Step 2 (Stripe-powered): real <PaymentElement /> ─────────────────────

type Step2StripeProps = {
  selected: ModalSelectedTier;
  currency: string;
  copy: Props['copy'];
  accent: AccentTheme;
  paymentIntentId: string | null;
  onPaid: (paymentIntentId: string) => void;
  onBack: () => void;
  submitting: boolean;
};

function Step2Stripe({ selected, currency, copy, accent, paymentIntentId, onPaid, onBack, submitting }: Step2StripeProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isBusy = paying || submitting;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (isBusy) return;

    setPaying(true);
    setErrorMsg(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // No return_url — we're handling success in-modal. The webhook
        // is what credits the entries server-side regardless.
        return_url: window.location.href,
      },
      redirect: 'if_required',
    });

    if (result.error) {
      setErrorMsg(result.error.message ?? 'Payment failed. Try again.');
      setPaying(false);
      return;
    }

    // Payment succeeded (or 3DS-redirect-completed). The PI id we
    // stashed in modal state is canonical — pass it to the parent
    // so it can credit funnel_signups via onSubmit.
    if (paymentIntentId) {
      onPaid(paymentIntentId);
    } else if (result.paymentIntent) {
      onPaid(result.paymentIntent.id);
    }
    setPaying(false);
  }

  return (
    <form onSubmit={handleSubmit}>
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
          <div style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Item</div>
          <div style={{ color: colors.text, fontWeight: 600 }}>
            {copy.orderItem.replace('{tier}', selected.name).replace('{summary}', selected.heroSummary)}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 10, color: colors.muted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>Price</div>
          <div style={{ color: colors.text, fontWeight: 800 }}>{selected.price}</div>
        </div>
      </div>

      {/* Stripe PaymentElement — handles card + Apple Pay + Google Pay etc */}
      <div style={{ marginBottom: 16 }}>
        <PaymentElement options={{ layout: 'tabs' }} />
      </div>

      {/* Order total */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          borderTop: '1px solid ' + colors.border,
          paddingTop: 14,
          marginBottom: 18,
          fontSize: 14,
          gap: 8,
        }}
      >
        <div style={{ color: colors.muted }}>{copy.orderSummaryItem ?? `${selected.name} Package`}</div>
        <div style={{ textAlign: 'right', color: colors.text, fontWeight: 700 }}>
          {currency}{selected.amount.toFixed(2)}
        </div>
        <div style={{ color: colors.text, fontWeight: 800, fontSize: 16, paddingTop: 6, borderTop: '1px solid ' + colors.border }}>
          {copy.orderTotal}
        </div>
        <div style={{ textAlign: 'right', color: accent.light, fontWeight: 900, fontSize: 18, paddingTop: 6, borderTop: '1px solid ' + colors.border }}>
          {currency}{selected.amount.toFixed(2)}
        </div>
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || isBusy}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 12,
          border: 'none',
          background: `linear-gradient(90deg, ${accent.gradA} 0%, ${accent.gradB} 100%)`,
          color: accent.onAccent,
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 900,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          cursor: isBusy ? 'not-allowed' : 'pointer',
          boxShadow: `0 8px 24px rgba(${accent.glowRgb},0.3)`,
          opacity: isBusy ? 0.7 : 1,
        }}
      >
        {isBusy ? '…' : copy.submitCta}
      </button>

      {errorMsg && (
        <p style={{ marginTop: 10, fontSize: 12, color: colors.error, textAlign: 'center' }}>
          {errorMsg}
        </p>
      )}

      <div
        style={{
          marginTop: 18,
          fontSize: 11,
          color: colors.muted,
          textAlign: 'center',
          letterSpacing: 1,
          textTransform: 'uppercase',
          fontWeight: 700,
        }}
      >
        🔒 {copy.secureCheckout}
      </div>

      <button
        type="button"
        onClick={onBack}
        disabled={isBusy}
        style={{
          width: '100%',
          marginTop: 10,
          padding: '10px',
          background: 'transparent',
          color: colors.muted,
          border: 'none',
          cursor: isBusy ? 'not-allowed' : 'pointer',
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
  );
}
