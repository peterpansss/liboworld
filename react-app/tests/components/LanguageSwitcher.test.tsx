/**
 * Tests for src/components/LanguageSwitcher.tsx.
 *
 * The component is a controlled <button> + popover that calls
 * i18n.changeLanguage on selection. We mock react-i18next so we can
 * track the call and seed `resolvedLanguage`.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

void React;

const changeLanguage = vi.fn();
let mockResolved = 'en';
let mockLanguage = 'en';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: (c: string) => {
        mockResolved = c;
        mockLanguage = c;
        changeLanguage(c);
      },
      get resolvedLanguage() { return mockResolved; },
      get language() { return mockLanguage; },
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

import LanguageSwitcher from '../../src/components/LanguageSwitcher';

beforeEach(() => {
  changeLanguage.mockReset();
  mockResolved = 'en';
  mockLanguage = 'en';
});

describe('LanguageSwitcher', () => {
  it('renders the trigger with the current language code', () => {
    render(<LanguageSwitcher />);
    expect(screen.getByRole('button', { name: /nav.changeLanguage/ })).toBeInTheDocument();
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('falls back to English when the resolved language is unknown', () => {
    mockResolved = 'jp'; // not in SUPPORTED_LANGUAGES
    mockLanguage = 'jp';
    render(<LanguageSwitcher />);
    // Falls back to English meta → "EN"
    expect(screen.getByText('EN')).toBeInTheDocument();
  });

  it('opens the listbox when the trigger is clicked', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    const trigger = screen.getByRole('button', { name: /nav.changeLanguage/ });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('calls i18n.changeLanguage and closes when an option is chosen', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByRole('button', { name: /nav.changeLanguage/ }));
    // Click the German option (label "Deutsch")
    await user.click(screen.getByRole('option', { name: /Deutsch/ }));
    expect(changeLanguage).toHaveBeenCalledWith('de');
    // Listbox closed
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('marks the current option as aria-selected', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByRole('button', { name: /nav.changeLanguage/ }));
    const enOption = screen.getByRole('option', { name: /English/ });
    expect(enOption).toHaveAttribute('aria-selected', 'true');
    const deOption = screen.getByRole('option', { name: /Deutsch/ });
    expect(deOption).toHaveAttribute('aria-selected', 'false');
  });

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher />);
    await user.click(screen.getByRole('button', { name: /nav.changeLanguage/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('closes the popover when clicking outside', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <div>
        <div data-testid="outside">click me</div>
        <LanguageSwitcher />
      </div>,
    );
    await user.click(screen.getByRole('button', { name: /nav.changeLanguage/ }));
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    // mousedown outside the switch should close it
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(container.querySelector('[role="listbox"]')).toBeNull();
  });

  it('applies the variant class to the root', () => {
    const { container } = render(<LanguageSwitcher variant="drawer" />);
    expect(container.firstChild).toHaveClass('lang-switch--drawer');
  });
});
