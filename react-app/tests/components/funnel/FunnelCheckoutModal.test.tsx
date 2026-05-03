/**
 * Tests for src/components/funnel/FunnelCheckoutModal.tsx.
 *
 * Focuses on the two bugs we just fixed:
 *   1. `aria-labelledby="funnel-modal-title"` had no matching id —
 *      `getByRole('dialog', { name: ... })` couldn't find the modal.
 *   2. Step 1 → Step 2 transition validated for non-empty input but
 *      accepted whitespace-only entries; submission would later send
 *      empty strings after `.trim()`.
 *
 * Stripe is stubbed — we exercise the offline branch (no createIntent).
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

void React;

// ---- mocks -----------------------------------------------------------
let isStripeConfiguredFlag = false;
const mockGetStripe = vi.fn(() => Promise.resolve({} as unknown));
vi.mock('../../../src/lib/stripe', () => ({
  getStripe: () => mockGetStripe(),
  isStripeConfigured: () => isStripeConfiguredFlag,
}));

// Stripe Elements stand-ins — minimal so the offline branch never reaches
// the real SDK. The Stripe-specific tests in the coverage suite cover the
// online branch; here we only need the Step 1 / dialog-name behaviour.
vi.mock('@stripe/react-stripe-js', () => ({
  Elements: ({ children }: { children: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'stripe-elements' }, children),
  PaymentElement: () => React.createElement('div', { 'data-testid': 'payment-element' }),
  useStripe: () => ({ confirmPayment: vi.fn() }),
  useElements: () => ({}),
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
  document.body.style.overflow = '';
});

function setVal(id: string, value: string) {
  fireEvent.change(document.getElementById(id)!, { target: { value } });
}

describe('FunnelCheckoutModal — aria-labelledby (a11y bug fix)', () => {
  it('exposes the dialog with an accessible name including "Checkout"', () => {
    render(
      <FunnelCheckoutModal
        open
        selected={baseSelected}
        copy={copy}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // The dialog must be discoverable by name — proving the
    // aria-labelledby reference resolves to a real element.
    const dialog = screen.getByRole('dialog', { name: /checkout/i });
    expect(dialog).toBeInTheDocument();
  });

  it('the title element id matches the aria-labelledby attribute', () => {
    render(
      <FunnelCheckoutModal
        open
        selected={baseSelected}
        copy={copy}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    const dialog = screen.getByRole('dialog');
    const labelledBy = dialog.getAttribute('aria-labelledby');
    expect(labelledBy).toBe('funnel-modal-title');
    // The referenced element must exist inside the dialog.
    expect(document.getElementById(labelledBy!)).not.toBeNull();
  });

  it('updates the dialog name to reflect step 2 after a successful Continue', () => {
    render(
      <FunnelCheckoutModal
        open
        selected={baseSelected}
        copy={copy}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    setVal('fm-name', 'Alice');
    setVal('fm-email', 'alice@example.com');
    setVal('fm-phone', '+15551234567');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    // Step 2 → label should reflect Billing.
    expect(screen.getByRole('dialog', { name: /billing/i })).toBeInTheDocument();
  });
});

describe('FunnelCheckoutModal — whitespace validation (UX bug fix)', () => {
  it('blocks Step 1 → Step 2 when fields are whitespace-only and shows per-field errors', () => {
    const onSubmit = vi.fn();
    render(
      <FunnelCheckoutModal
        open
        selected={baseSelected}
        copy={copy}
        onSubmit={onSubmit}
        onClose={vi.fn()}
      />,
    );

    // Type only spaces into each field, then click Continue.
    setVal('fm-name', '   ');
    setVal('fm-email', '   ');
    setVal('fm-phone', '   ');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Three error alerts (one per field) — proves validation ran and
    // surfaced per-field feedback.
    const errors = screen.getAllByRole('alert');
    expect(errors).toHaveLength(3);
    errors.forEach((el) => {
      expect(el.textContent).toMatch(/required/i);
    });

    // Inputs must be marked invalid for assistive tech.
    expect(document.getElementById('fm-name')!.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('fm-email')!.getAttribute('aria-invalid')).toBe('true');
    expect(document.getElementById('fm-phone')!.getAttribute('aria-invalid')).toBe('true');

    // Step did NOT advance — Step 1 fields are still in the DOM, no
    // order-summary "Total" row appeared.
    expect(document.getElementById('fm-name')).not.toBeNull();
    expect(screen.queryByText(copy.orderTotal)).not.toBeInTheDocument();

    // onSubmit must not have been called.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('clears the per-field error once the user starts typing again', () => {
    render(
      <FunnelCheckoutModal
        open
        selected={baseSelected}
        copy={copy}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    setVal('fm-name', '   ');
    setVal('fm-email', 'ok@example.com');
    setVal('fm-phone', '+15551234567');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // One alert (only the name field is bad).
    expect(screen.getAllByRole('alert')).toHaveLength(1);

    // Typing into the offending field clears its error.
    setVal('fm-name', 'A');
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('advances to Step 2 when trimmed values are non-empty', () => {
    render(
      <FunnelCheckoutModal
        open
        selected={baseSelected}
        copy={copy}
        onSubmit={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Leading + trailing whitespace around real content — must pass.
    setVal('fm-name', '  Alice  ');
    setVal('fm-email', '  alice@example.com  ');
    setVal('fm-phone', '  +15551234567  ');
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));

    // Order total row only renders on Step 2.
    expect(screen.getByText(copy.orderTotal)).toBeInTheDocument();
  });
});
