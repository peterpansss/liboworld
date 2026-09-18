/**
 * Tests for src/components/ConsentBanner.tsx — the consent modal.
 *
 * These run against the REAL src/lib/consent.ts rather than a mock: the thing
 * worth protecting is the wiring between the buttons and whether a tracker
 * ends up in the document, so a mocked gate would test nothing. Assertions
 * therefore look at the actual <script> tags.
 *
 * Every test loads a fresh module graph (`vi.resetModules()` inside `load()`)
 * because the gate guards injection with module-level flags — a fresh graph is
 * a fresh page load, which is what each of these scenarios is.
 *
 * react-i18next is mocked so `t(key, { defaultValue })` returns the English
 * default — the copy under test is the same string the site ships in en.json.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string }) => opts?.defaultValue ?? key,
    i18n: { language: 'en', changeLanguage: () => Promise.resolve() },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const gaScripts = () =>
  Array.from(document.querySelectorAll('script')).filter((s) =>
    (s.src || '').includes('googletagmanager.com'),
  );
const pixelScripts = () =>
  Array.from(document.querySelectorAll('script')).filter((s) =>
    (s.src || '').includes('connect.facebook.net'),
  );

async function load() {
  vi.resetModules();
  const consent = await import('../../src/lib/consent');
  const Banner = (await import('../../src/components/ConsentBanner')).default;
  const Footer = (await import('../../src/components/SiteFooter')).default;
  return { consent, Banner, Footer };
}

/** Fresh page + the banner mounted, as a first-time visitor sees it. */
async function renderBanner() {
  const mod = await load();
  render(
    <MemoryRouter>
      <mod.Banner />
    </MemoryRouter>,
  );
  return mod;
}

beforeEach(() => {
  localStorage.clear();
  document.querySelectorAll('script').forEach((s) => s.remove());
  document.body.style.overflow = '';
  delete (window as { gtag?: unknown }).gtag;
  delete (window as { dataLayer?: unknown }).dataLayer;
  delete (window as { fbq?: unknown }).fbq;
  delete (window as { _fbq?: unknown })._fbq;
});

describe('ConsentBanner — the decision point', () => {
  it('opens as a modal dialog with a scrim and locks the page behind it', async () => {
    await renderBanner();
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByTestId('consent-scrim')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('names the processors and links to the privacy policy', async () => {
    await renderBanner();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Google Analytics 4/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Meta Pixel/)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /How we handle your data/ })).toHaveAttribute(
      'href',
      '/privacy',
    );
  });

  it('gives Accept and Reject the same size class and offers no pre-ticked boxes', async () => {
    await renderBanner();
    const reject = screen.getByRole('button', { name: 'Reject all' });
    const accept = screen.getByRole('button', { name: 'Accept all' });
    // Equal weight is enforced by both carrying the shared sizing/type class
    // and sharing a row; only the fill modifier differs. If one loses it,
    // this fails — which is the point.
    expect(reject.className).toContain('consent-modal__btn');
    expect(accept.className).toContain('consent-modal__btn');
    expect(reject.parentElement).toBe(accept.parentElement);
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0);

    await userEvent.click(screen.getByRole('button', { name: 'Manage preferences' }));
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(2);
    boxes.forEach((box) => expect(box).not.toBeChecked());
  });

  it('loads nothing while it waits for an answer', async () => {
    const { consent } = await renderBanner();
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
    expect(consent.getConsent()).toBeNull();
  });
});

describe('ConsentBanner — answering', () => {
  it('reject: records the refusal, closes, and leaves GA4 absent', async () => {
    const { consent } = await renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(consent.getConsent()).toEqual({ analytics: false, marketing: false });
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('accept: loads GA4 and the pixel, and closes', async () => {
    const { consent } = await renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Accept all' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(consent.getConsent()).toEqual({ analytics: true, marketing: true });
    expect(gaScripts()).toHaveLength(1);
    expect(pixelScripts()).toHaveLength(1);
  });

  it('manage preferences: analytics on, marketing off is a storable answer', async () => {
    const { consent } = await renderBanner();
    await userEvent.click(screen.getByRole('button', { name: 'Manage preferences' }));
    await userEvent.click(screen.getByRole('checkbox', { name: 'Analytics' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save my choices' }));

    expect(consent.getConsent()).toEqual({ analytics: true, marketing: false });
    expect(gaScripts()).toHaveLength(1);
    expect(pixelScripts()).toHaveLength(0);
  });

  it('escape closes the dialog but consents to nothing', async () => {
    const { consent } = await renderBanner();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(consent.getConsent()).toBeNull();
    expect(gaScripts()).toHaveLength(0);
    expect(pixelScripts()).toHaveLength(0);
  });

  it('stays closed for a visitor who already chose', async () => {
    const mod = await load();
    mod.consent.setConsent(mod.consent.ACCEPT_ALL);
    render(
      <MemoryRouter>
        <mod.Banner />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('ConsentBanner — accessibility', () => {
  it('moves focus into the dialog when it opens', async () => {
    await renderBanner();
    expect(document.activeElement).toBe(screen.getByRole('dialog'));
  });

  it('is labelled and described by its own heading and intro', async () => {
    await renderBanner();
    const dialog = screen.getByRole('dialog');
    const labelId = dialog.getAttribute('aria-labelledby')!;
    const descId = dialog.getAttribute('aria-describedby')!;
    expect(document.getElementById(labelId)?.textContent).toBe('Your call on cookies');
    expect(document.getElementById(descId)?.textContent).toMatch(/Nothing that tracks you/);
  });

  it('traps Tab inside the dialog', async () => {
    await renderBanner();
    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(dialog.querySelectorAll<HTMLElement>('a[href], button, input'));
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    last.focus();
    await userEvent.tab();
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).toBe(first);

    first.focus();
    await userEvent.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it('restores page scrolling once answered', async () => {
    await renderBanner();
    expect(document.body.style.overflow).toBe('hidden');
    await userEvent.click(screen.getByRole('button', { name: 'Reject all' }));
    expect(document.body.style.overflow).toBe('');
  });
});

describe('Cookie settings link in the footer', () => {
  it('re-opens the modal for a visitor who already chose', async () => {
    const mod = await load();
    mod.consent.setConsent(mod.consent.ACCEPT_ALL);
    render(
      <MemoryRouter>
        <mod.Footer />
        <mod.Banner />
      </MemoryRouter>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: 'Cookie settings' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Re-opened, not resumed: the stored record is gone and nothing is ticked.
    expect(mod.consent.getConsent()).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Manage preferences' }));
    screen.getAllByRole('checkbox').forEach((box) => expect(box).not.toBeChecked());
  });
});
