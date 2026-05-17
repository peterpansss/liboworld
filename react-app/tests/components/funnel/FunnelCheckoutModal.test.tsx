/**
 * Tests for src/components/funnel/FunnelCheckoutModal.tsx.
 *
 * The biggest component in the project — multi-step checkout popup with
 * two parallel branches:
 *   - "offline" branch (no Stripe key configured)
 *   - "Stripe" branch (createIntent prop + isStripeConfigured())
 *
 * We mock @stripe/react-stripe-js and lib/stripe so we don't touch the
 * real Stripe SDK.
 *
 * In addition to the original behavioral coverage, this file pins down
 * the a11y polish:
 *   - overlay click on a dirty form prompts confirm() instead of dropping
 *     the user's data silently
 *   - focus trap cycles inside the dialog
 *   - step indicator carries aria-current="step" and a sr-only "Step N of 2"
 *   - close button is an SVG (not a raw "×" text node)
 *   - focus moves to the first input on open and restores to the trigger on close
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

void React;

// ---- mocks ----
type AnyObj = Record<string, unknown>;
let isStripeConfiguredFlag = false;
const mockGetStripe = vi.fn(() => Promise.resolve({} as AnyObj));
vi.mock('../../../src/lib/stripe', () => ({
  getStripe: () => mockGetStripe(),
  isStripeConfigured: () => isStripeConfiguredFlag,
}));

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
  it('calls onClose when the close button is clicked', () => {
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

  it('calls onClose immediately when overlay is clicked AND form is empty', () => {
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
    expect(onClose).toHaveBeenCalledTimes(1);
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

  it('overlay click on a dirty form prompts before discarding (confirm=false → no close)', () => {
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    // User typed something. Now click the overlay — must NOT silently lose data.
    fillStep1({ name: 'Alice' });
    fireEvent.click(container.firstChild as HTMLElement);
    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });

  it('overlay click on a dirty form WITH confirm=true closes', () => {
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { container } = render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={onClose}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    fillStep1({ name: 'Alice' });
    fireEvent.click(container.firstChild as HTMLElement);
    expect(confirmSpy).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
    confirmSpy.mockRestore();
  });
});

describe('FunnelCheckoutModal — a11y polish', () => {
  it('the active step indicator carries aria-current="step"', () => {
    const { container } = render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    const items = container.querySelectorAll('[aria-current]');
    expect(items.length).toBe(1);
    const active = items[0] as HTMLElement;
    expect(active.getAttribute('aria-current')).toBe('step');
    expect(active.textContent).toMatch(/Details/);
  });

  it('renders sr-only "Step 1 of 2" / "Step 2 of 2" prefixes', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    expect(screen.getByText(/Step 1 of 2:/)).toBeInTheDocument();
    expect(screen.getByText(/Step 2 of 2:/)).toBeInTheDocument();
  });

  it('the close button uses an SVG icon (no raw × text node)', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    const close = screen.getByRole('button', { name: 'Close' });
    // The button text content is purely the SVG (which contributes no text).
    expect(close.textContent).toBe('');
    const svg = close.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('focuses the first input when the dialog opens', async () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    await waitFor(() => {
      expect(document.activeElement?.id).toBe('fm-name');
    });
  });

  it('restores focus to the trigger on close', async () => {
    function Harness() {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button data-testid="trigger" onClick={() => setOpen(true)}>
            Open
          </button>
          <FunnelCheckoutModal
            open={open}
            selected={baseSelected}
            copy={copy}
            onClose={() => setOpen(false)}
            onSubmit={async () => ({ ok: true })}
          />
        </>
      );
    }
    render(<Harness />);
    const trigger = screen.getByTestId('trigger');
    trigger.focus();
    expect(document.activeElement).toBe(trigger);
    fireEvent.click(trigger);
    await waitFor(() => expect(document.activeElement?.id).toBe('fm-name'));
    // Close via × button
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    await waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it('Tab from the last focusable cycles to the first (focus trap)', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled') && !(el.tagName === 'DIV'));
    const last = focusables[focusables.length - 1];
    last.focus();
    expect(document.activeElement).toBe(last);
    // fire the keydown directly: the document-level handler is what wraps focus.
    fireEvent.keyDown(document, { key: 'Tab' });
    const first = focusables[0];
    expect(document.activeElement).toBe(first);
  });

  it('Shift+Tab from the first focusable cycles to the last', () => {
    render(
      <FunnelCheckoutModal
        open={true}
        selected={baseSelected}
        copy={copy}
        onClose={() => {}}
        onSubmit={async () => ({ ok: true })}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'),
    ).filter((el) => !el.hasAttribute('disabled') && !(el.tagName === 'DIV'));
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});

describe('FunnelCheckoutModal — offline flow (no Stripe)', () => {
  it('blocks Step 1 → Step 2 transition when fields are empty', () => {
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
    fireEvent.submit(document.getElementById('fm-name')!.closest('form')!);
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
    expect(screen.getByText('Card')).toBeInTheDocument();
    expect(screen.getByText(/← Back/)).toBeInTheDocument();
    expect(screen.getByText('BRONZE | 5 entries')).toBeInTheDocument();
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

    fireEvent.change(document.getElementById('fm-card')!, { target: { value: '4242 4242 4242 4242' } });
    fireEvent.submit(document.getElementById('fm-card')!.closest('form')!);

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      fullName: 'Alice',
      email: 'alice@example.com',
      phone: '+15551234567',
    });
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
    mockUseStripe.mockReturnValue(null as unknown as { confirmPayment: typeof mockConfirmPayment });
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
    expect(mockConfirmPayment).not.toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('falls back to result.paymentIntent.id when state-stashed PI id is null', async () => {
    mockConfirmPayment.mockResolvedValue({ error: null, paymentIntent: { id: 'pi_from_result_only' } });
    const createIntent = vi.fn(async () => ({
      ok: true as const,
      clientSecret: 'cs_xxx',
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
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('overlay click on the success state closes without confirm()', async () => {
    const onClose = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { container } = render(
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
    // act() suppresses the focus-restore async warning since we close from inside
    act(() => {
      fireEvent.click(container.firstChild as HTMLElement);
    });
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
