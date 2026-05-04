/**
 * Tests for src/components/funnel/FunnelCheckoutModal.tsx.
 *
 * The biggest component in the project (~700 stmts) — multi-step checkout
 * popup with two parallel branches:
 *   - "offline" branch (no Stripe key configured): step 1 → step 2 with
 *     placeholder card field → onSubmit({fullName, email, phone}).
 *   - "Stripe" branch (createIntent prop + isStripeConfigured()): step 1
 *     calls createIntent, sets clientSecret + paymentIntentId, then step 2
 *     renders <PaymentElement />, on submit confirms payment and calls
 *     onSubmit with paymentIntentId.
 *
 * We mock @stripe/react-stripe-js and lib/stripe so we don't touch the
 * real Stripe SDK. The tests focus on:
 *   - open/closed gating
 *   - step transitions
 *   - validation (empty fields blocks submit)
 *   - onClose path (× button + ESC + overlay)
 *   - body scroll lock
 *   - state machine: success / duplicate / error
 *   - intent error path
 *   - the "offline" Step 2 shape (order summary, total, back button)
 *   - Stripe mode kicks in createIntent and the success calls onSubmit
 *     with paymentIntentId
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

void React;

// ---- mocks ----
let isStripeConfiguredFlag = false;
const mockGetStripe = vi.fn(() => Promise.resolve({} as any));
vi.mock('../../../src/lib/stripe', () => ({
  getStripe: () => mockGetStripe(),
  isStripeConfigured: () => isStripeConfiguredFlag,
}));

// Stripe Elements + PaymentElement render minimal stand-ins. The Step 2
// stripe form we care about pulls `useStripe` + `useElements` — return
// objects that confirmPayment can be exercised against.
const mockConfirmPayment = vi.fn(async () => ({ error: null, paymentIntent: { id: 'pi_from_result' } }));
const mockUseStripe = vi.fn(() => ({ confirmPayment: mockConfirmPayment }));
const mockUseElements = vi.fn(() => ({}));
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'stripe-elements' }, children),
  PaymentElement: () => React.createElement('div', { 'data-testid': 'payment-element' }),
  useStripe: () => mockUseStripe(),
  useElements: () => mockUseElements(),
}));

import FunnelCheckoutModal, {
  type ModalSelectedTier,
} from '../../../src/components/funnel/FunnelCheckoutModal';

const baseSelected: ModalSelectedTier = {
  name: 'BRONZE',
  price: '€10',
  heroSummary: '5 entries',
  tierSlug: 'bronze',
  amount: 10,
};

const copy = {
  step1Label: 'Details',
  step1Subtitle: 'How to reach you',
  step2Label: 'Billing',
  step2Subtitle: 'Payment info',
  mandatoryNote: 'Required fields',
  fullNameLabel: 'Full Name',
  fullNamePlaceholder: 'Your name',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  phoneLabel: 'Phone Number',
  phonePlaceholder: '+1 555…',
  cardLabel: 'Card',
  cardPlaceholder: '4242 …',
  continueCta: 'Continue',
  submitCta: 'Submit Payment',
  secureCheckout: 'Secure',
  orderItem: '{tier} | {summary}',
  orderTotal: 'Total',
  legalNote: 'Legal text',
  successTitle: 'Thanks!',
  successBody: 'You are in.',
  duplicateTitle: 'Already entered',
  duplicateBody: 'You already entered.',
  errorMsg: 'Something failed',
  backLabel: 'Back',
};

beforeEach(() => {
  isStripeConfiguredFlag = false;
  mockConfirmPayment.mockReset();
  mockConfirmPayment.mockResolvedValue({ error: null, paymentIntent: { id: 'pi_from_result' } });
  mockGetStripe.mockClear();
  mockUseStripe.mockClear();
  mockUseElements.mockClear();
  document.body.style.overflow = '';
});

function fillStep1(overrides: Partial<{ name: string; email: string; phone: string }> = {}) {
  const name = overrides.name ?? 'Alice';
  const email = overrides.email ?? 'alice@example.com';
  const phone = overrides.phone ?? '+15551234567';
  fireEvent.change(document.getElementById('fm-name')!, { target: { value: name } });
  fireEvent.change(document.getElementById('fm-email')!, { target: { value: email } });
  fireEvent.change(document.getElementById('fm-phone')!, { target: { value: phone } });
}

describe('FunnelCheckoutModal — open/closed', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <FunnelCheckoutModal
        open={false}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when selected=null even if open', () => {
    const { container } = render(
      <FunnelCheckoutModal
        open={true}
        selected={null}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal dialog with step indicators when open', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    // The dialog is keyed by aria-labelledby pointing at #funnel-modal-title;
    // there's no element with that id (it's used as a key but never set), so
    // we just look up by role.
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Details')).toBeInTheDocument();
    expect(screen.getByText('Billing')).toBeInTheDocument();
  });

  it('locks body scroll while open and restores on close', () => {
    const { rerender } = render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <FunnelCheckoutModal
        open={false}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    expect(document.body.style.overflow).toBe('');
  });
});

describe('FunnelCheckoutModal — close paths', () => {
  it('calls onClose when the × button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    const close = screen.getByRole('button', { name: 'Close' });
    fireEvent.click(close);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not propagate inner clicks to the overlay', () => {
    const onClose = vi.fn();
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fireEvent.click(screen.getByText('Details'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('FunnelCheckoutModal — offline flow (no Stripe)', () => {
  it('blocks Step 1 → Step 2 transition when fields are empty (form required)', () => {
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    // Submit Step 1 with empty values — handleStep1 short-circuits.
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    // Still on Step 1: card label is NOT visible
    expect(screen.queryByText('Card')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('advances to Step 2 when all fields are filled', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    // Step 2 visible: card label + back button + price summary
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText(/← Back/)).toBeInTheDocument();
    // Order summary uses {tier} → "BRONZE" and {summary} → "5 entries"
    expect(screen.getByText('BRONZE | 5 entries')).toBeInTheDocument();
    // Total appears with €10.00
    expect(screen.getAllByText('€10.00').length).toBeGreaterThan(0);
  });

  it('Back button returns to Step 1', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    fireEvent.click(screen.getByText(/← Back/));
    // Back to Step 1 — Full Name label visible again, Card label gone
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.queryByText('Card')).not.toBeInTheDocument();
  });

  it('Step 2 submit calls onSubmit with trimmed values and shows success', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1({ name: '  Alice  ', email: '  alice@example.com  ', phone: '  +15551234567  ' });
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);

    // Fill the placeholder card field so the required attribute passes
    fireEvent.change(document.getElementById('fm-card')!, { target: { value: '4242 4242 4242 4242' } });
    fireEvent.submit(document.getElementById('fm-card')!.closest('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Alice',
      email: 'alice@example.com',
      phone: '+15551234567',
    });
    // Success state visible
    await waitFor(() => screen.getByText('Thanks!'));
    expect(screen.getByText('You are in.')).toBeInTheDocument();
  });

  it('shows the duplicate copy when onSubmit returns ok+duplicate', async () => {
    const onSubmit = vi.fn(async () => ({ ok: true, duplicate: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    fireEvent.change(document.getElementById('fm-card')!, { target: { value: '42' } });
    fireEvent.submit(document.getElementById('fm-card')!.closest('form')!);
    await waitFor(() => screen.getByText('Already entered'));
  });

  it('shows the error copy when onSubmit returns ok=false', async () => {
    const onSubmit = vi.fn(async () => ({ ok: false }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    fireEvent.change(document.getElementById('fm-card')!, { target: { value: '42' } });
    fireEvent.submit(document.getElementById('fm-card')!.closest('form')!);
    await waitFor(() => screen.getByText('Something failed'));
    // Submit button is back (state: error) so the user can retry
    expect(screen.getByText('Submit Payment')).toBeInTheDocument();
  });

  it('disables the submit button while submitting', async () => {
    let resolveOnSubmit: (v: { ok: boolean }) => void = () => {};
    const onSubmit = vi.fn(
      () =>
        new Promise<{ ok: boolean }>((res) => {
          resolveOnSubmit = res;
        }),
    );
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    fireEvent.change(document.getElementById('fm-card')!, { target: { value: '42' } });
    fireEvent.submit(document.getElementById('fm-card')!.closest('form')!);
    // Now the submit button shows the spinner placeholder "…" and is disabled
    const submitBtn = screen.getByRole('button', { name: '…' });
    expect(submitBtn).toBeDisabled();
    resolveOnSubmit({ ok: true });
    await waitFor(() => screen.getByText('Thanks!'));
  });
});

describe('FunnelCheckoutModal — Stripe flow', () => {
  beforeEach(() => {
    isStripeConfiguredFlag = true;
  });

  it('calls createIntent before transitioning to Step 2', async () => {
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
      paymentIntentId: 'pi_xxx',
    }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => expect(createIntent).toHaveBeenCalled());
    expect(createIntent).toHaveBeenCalledWith({
      fullName: 'Alice',
      email: 'alice@example.com',
      phone: '+15551234567',
    });
    // Step 2 in stripe mode → renders the Elements wrapper + PaymentElement
    await waitFor(() => screen.getByTestId('stripe-elements'));
    expect(screen.getByTestId('payment-element')).toBeInTheDocument();
  });

  it('surfaces createIntent errors as inline error messages on Step 1', async () => {
    const createIntent = vi.fn(async () => ({
      ok: false as const,
      error: 'card declined',
    }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => screen.getByText('card declined'));
    // We did NOT advance to step 2
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
  });

  it('on successful payment, calls onSubmit with the paymentIntentId from state', async () => {
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
      paymentIntentId: 'pi_canonical',
    }));
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => screen.getByTestId('payment-element'));

    // Submit the Step2Stripe form
    const stripeForm = screen.getByTestId('payment-element').closest('form')!;
    fireEvent.submit(stripeForm);

    await waitFor(() => expect(mockConfirmPayment).toHaveBeenCalled());
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Alice',
      email: 'alice@example.com',
      phone: '+15551234567',
      paymentIntentId: 'pi_canonical',
    });
  });

  it('shows the stripe error message when confirmPayment returns an error', async () => {
    mockConfirmPayment.mockResolvedValue({ error: { message: 'Your card was declined.' } });
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
      paymentIntentId: 'pi_xxx',
    }));
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => screen.getByTestId('payment-element'));
    const stripeForm = screen.getByTestId('payment-element').closest('form')!;
    fireEvent.submit(stripeForm);
    await waitFor(() => screen.getByText('Your card was declined.'));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Stripe Step 2 Back button returns to Step 1', async () => {
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
      paymentIntentId: 'pi_xxx',
    }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => screen.getByTestId('payment-element'));

    fireEvent.click(screen.getByText(/← Back/));
    expect(screen.getByText('Full Name')).toBeInTheDocument();
    expect(screen.queryByTestId('payment-element')).not.toBeInTheDocument();
  });

  it('Stripe Step 2 submit is no-op when stripe.confirmPayment is unavailable', async () => {
    mockUseStripe.mockReturnValue(null as any);
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
      paymentIntentId: 'pi_xxx',
    }));
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => screen.getByTestId('payment-element'));
    const stripeForm = screen.getByTestId('payment-element').closest('form')!;
    fireEvent.submit(stripeForm);
    // No payment was attempted, no submit fired.
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('falls back to result.paymentIntent.id when state-stashed PI id is null', async () => {
    // Simulate: createIntent succeeds and returns a PI id, but we then force
    // the modal's stashed paymentIntentId state to null by returning ""/null.
    // (Component spreads the state via setPaymentIntentId so this mostly
    // exercises the "result.paymentIntent" branch.)
    mockConfirmPayment.mockResolvedValue({ error: null, paymentIntent: { id: 'pi_from_result_only' } });
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
      // Empty string as PI id — react treats it as falsy in JSX checks but
      // the component still uses it. To exercise the fallback branch we use
      // an empty string and rely on the OR fallback.
      paymentIntentId: '',
    }));
    const onSubmit = vi.fn(async () => ({ ok: true }));
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        createIntent={createIntent}
        onClose={() => {}}
        onSubmit={onSubmit}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    await waitFor(() => screen.getByTestId('payment-element'));
    const stripeForm = screen.getByTestId('payment-element').closest('form')!;
    fireEvent.submit(stripeForm);
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toEqual(
      expect.objectContaining({ paymentIntentId: 'pi_from_result_only' }),
    );
  });
});

describe('FunnelCheckoutModal — success state renders close', () => {
  it('clicking Close from success calls onClose', async () => {
    const onClose = vi.fn();
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1();
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
    fireEvent.change(document.getElementById('fm-card')!, { target: { value: '42' } });
    fireEvent.submit(document.getElementById('fm-card')!.closest('form')!);
    await waitFor(() => screen.getByText('Thanks!'));
    // Two "Close" buttons exist: the header × (aria-label="Close") and the
    // success-state action button. We click the success "Close" by text.
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });
});
