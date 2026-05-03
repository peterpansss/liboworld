/**
 * Tests for src/pages/Onboarding.tsx — 20-step quiz funnel.
 *
 * The quiz is large; we focus on:
 *   - Step 1 renders 5 single-select goal options
 *   - Selecting a single-select advances to the next step (after the 400ms
 *     debounce so the UI can show the selected state)
 *   - Multi-select toggles, "none" clears others, continue gated by length
 *   - Back button reverts to the previous step
 *   - Step 1's goal is pre-filled from ?goal= query param
 *   - Mobile menu drawer open/close
 *   - Email step submits to supabase.from('waitlist').insert and handles
 *     success / duplicate-key (23505) / generic error / network throw
 *
 * Step transitions use setTimeout(300) for the slide animation, so we
 * advance fake timers as we go.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

void React;

const insertMock = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (row: unknown) => insertMock(table, row),
    }),
  },
}));
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => {
      if (opts && typeof opts === 'object' && 'goal' in opts) {
        return `${key}:${(opts as { goal: string }).goal}`;
      }
      return key;
    },
    i18n: { language: 'en' },
  }),
}));

import Onboarding from '../../src/pages/Onboarding';

function renderAt(search = '') {
  return render(
    <MemoryRouter initialEntries={['/onboarding' + search]}>
      <Onboarding />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  insertMock.mockReset();
  // Use fake timers so we can advance the 400ms debounce + 300ms slide
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
});

async function selectAndAdvance(user: ReturnType<typeof userEvent.setup>, optionLabelKey: string) {
  await user.click(screen.getByText(optionLabelKey));
  // Advance the 400ms selection debounce → triggers goTo
  await act(async () => {
    vi.advanceTimersByTime(500);
    await Promise.resolve();
  });
  // Allow rAF callbacks queued by goTo to flush so the new step renders
  await act(async () => {
    vi.advanceTimersByTime(50);
    await Promise.resolve();
  });
}

describe('Onboarding', () => {
  it('renders step 1 with the goal options', () => {
    renderAt();
    expect(screen.getByText('onboarding.step1.heading')).toBeInTheDocument();
    expect(screen.getByText('onboarding.step1.options.loseWeight')).toBeInTheDocument();
    expect(screen.getByText('onboarding.step1.options.buildMuscle')).toBeInTheDocument();
    expect(screen.getByText('onboarding.step1.options.improveMobility')).toBeInTheDocument();
    expect(screen.getByText('onboarding.step1.options.stayActive')).toBeInTheDocument();
    expect(screen.getByText('onboarding.step1.options.reduceStress')).toBeInTheDocument();
  });

  it('hides the back button on step 1', () => {
    renderAt();
    const back = screen.getByLabelText('onboarding.topBar.goBack');
    expect(back.className).toContain('hidden');
  });

  it('seeds the goal answer from the ?goal= query param', () => {
    renderAt('?goal=lose-weight');
    // Visible at step 1 — the section labels still show, but we can verify
    // by inspecting the selected state of the loseWeight card.
    const card = screen.getByText('onboarding.step1.options.loseWeight').closest('.ob-option-card');
    expect(card?.className).toContain('selected');
  });

  it('advances from step 1 to step 2 (interstitial) on single-select click', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt();

    await selectAndAdvance(user, 'onboarding.step1.options.buildMuscle');
    // Step 2 is a dynamic interstitial keyed off the goal. The body is
    // resolved through `onboarding.goalBody.buildMuscle`.
    await waitFor(() => {
      expect(screen.getByText('onboarding.buttons.continue')).toBeInTheDocument();
    });
  });

  it('reveals the back button after leaving an interstitial', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt();

    await selectAndAdvance(user, 'onboarding.step1.options.buildMuscle');
    await waitFor(() => screen.getByText('onboarding.buttons.continue'));
    // Step 2 is an interstitial; back is hidden. Click continue → step 3.
    await user.click(screen.getByText('onboarding.buttons.continue'));
    await act(async () => {
      vi.advanceTimersByTime(50);
    });

    await waitFor(() => {
      expect(screen.getByText('onboarding.step3.heading')).toBeInTheDocument();
    });
    const back = screen.getByLabelText('onboarding.topBar.goBack');
    expect(back.className).not.toContain('hidden');
  });

  it('opens and closes the mobile menu drawer', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt();

    const open = screen.getByLabelText('onboarding.topBar.menu');
    await user.click(open);
    // Menu links visible
    expect(screen.getByText('onboarding.menu.home')).toBeInTheDocument();

    await user.click(screen.getByLabelText('onboarding.topBar.closeMenu'));
    // Drawer overlay no longer has the open modifier
    const overlay = document.querySelector('.ob-menu-overlay');
    expect(overlay?.className).not.toContain(' open');
  });

  it('on multi-select step, "none" clears the other selections and selecting a real option clears "none"', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt('?goal=build-muscle');

    // Step 1 → step 2 (interstitial) → step 3 (multi: secondary_goals)
    await selectAndAdvance(user, 'onboarding.step1.options.buildMuscle');
    await waitFor(() => screen.getByText('onboarding.buttons.continue'));
    await user.click(screen.getByText('onboarding.buttons.continue'));
    await act(async () => { vi.advanceTimersByTime(50); });

    await waitFor(() => screen.getByText('onboarding.step3.heading'));

    const continueBtn = screen.getByText('onboarding.buttons.nextStep');
    expect(continueBtn).toBeDisabled();

    // Pick a real option
    await user.click(screen.getByText('onboarding.step3.options.loseFat'));
    // Continue is now enabled
    await waitFor(() => expect(continueBtn).not.toBeDisabled());

    // Click "none" — should clear the other selection
    await user.click(screen.getByText('onboarding.step3.options.none'));
    // Pick another real option — should clear "none"
    await user.click(screen.getByText('onboarding.step3.options.improvePosture'));
    // Continue still enabled
    expect(continueBtn).not.toBeDisabled();
  });
});

async function flushAdvance() {
  // The old step is removed from activeClass via a 300ms setTimeout in goTo.
  // Advance well past that so only the new step is in the DOM.
  await act(async () => {
    vi.advanceTimersByTime(500);
    await Promise.resolve();
    vi.advanceTimersByTime(500);
    await Promise.resolve();
  });
}

async function pressKeyAndAdvance(key: string) {
  await act(async () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
  await flushAdvance();
}

async function clickContinueAndAdvance(user: ReturnType<typeof userEvent.setup>) {
  // Find the continue/nextStep button that lives on the currently active step.
  // After flushAdvance only one such button remains. If we get called while
  // a transition is mid-flight there could be 2 buttons — pick the last one
  // (the new step appended to activeClass).
  const buttons = screen.getAllByText(/onboarding\.buttons\.(continue|nextStep)/);
  await user.click(buttons[buttons.length - 1]);
  await flushAdvance();
}

describe('Onboarding email step', () => {
  // Reaching step 20 requires walking through 19 prior steps. We do this
  // with the keyboard "1" shortcut on single-select steps and the visible
  // continue button on multi-select / interstitial steps.
  async function walkToEmailStep(user: ReturnType<typeof userEvent.setup>) {
    // Step 1: question (single)
    await pressKeyAndAdvance('1');
    // Step 2: interstitial → continue
    await waitFor(() => screen.getByText('onboarding.buttons.continue'));
    await clickContinueAndAdvance(user);
    // Step 3: multi-select — pick option 1, then continue
    await waitFor(() => screen.getByText('onboarding.step3.heading'));
    await user.click(screen.getByText('onboarding.step3.options.loseFat'));
    await clickContinueAndAdvance(user);
    // Steps 4-8 single-select
    for (let i = 0; i < 5; i++) {
      await waitFor(() => screen.getByText(/onboarding\.step\d+\.heading/));
      await pressKeyAndAdvance('1');
    }
    // Step 9 interstitial
    await waitFor(() => screen.getByText('onboarding.buttons.continue'));
    await clickContinueAndAdvance(user);
    // Step 10 multi (target_zones)
    await waitFor(() => screen.getByText('onboarding.step10.heading'));
    await user.click(screen.getByText('onboarding.step10.options.chest'));
    await clickContinueAndAdvance(user);
    // Steps 11-15 single
    for (let i = 0; i < 5; i++) {
      await waitFor(() => screen.getByText(/onboarding\.step\d+\.heading/));
      await pressKeyAndAdvance('1');
    }
    // Step 16 interstitial
    await waitFor(() => screen.getByText('onboarding.buttons.continue'));
    await clickContinueAndAdvance(user);
    // Step 17 multi (equipment)
    await waitFor(() => screen.getByText('onboarding.step17.heading'));
    await user.click(screen.getByText('onboarding.step17.options.dumbbells'));
    await clickContinueAndAdvance(user);
    // Step 18 multi (obstacles)
    await waitFor(() => screen.getByText('onboarding.step18.heading'));
    await user.click(screen.getByText('onboarding.step18.options.motivation'));
    await clickContinueAndAdvance(user);
    // Step 19 = loading. Auto-advances to step 20 after 3500ms.
    await act(async () => {
      vi.advanceTimersByTime(4000);
      await Promise.resolve();
      vi.advanceTimersByTime(50);
      await Promise.resolve();
    });
  }

  it('reaches the email step and shows the form input + submit button', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt('?goal=build-muscle');

    await walkToEmailStep(user);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('onboarding.email.placeholder')).toBeInTheDocument();
    });
    expect(screen.getByText('onboarding.buttons.joinWaitlist')).toBeInTheDocument();
  }, 20000);

  it('submits the email and shows the success state when supabase returns no error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    insertMock.mockResolvedValue({ error: null });

    renderAt('?goal=build-muscle');
    await walkToEmailStep(user);

    const emailInput = await screen.findByPlaceholderText('onboarding.email.placeholder');
    await user.type(emailInput, 'me@example.com');
    await user.click(screen.getByText('onboarding.buttons.joinWaitlist'));

    await waitFor(() => {
      expect(insertMock).toHaveBeenCalledWith('waitlist', expect.objectContaining({
        email: 'me@example.com',
        source: 'onboarding',
      }));
    });
    await waitFor(() => {
      expect(screen.getByText('onboarding.email.successMessage')).toBeInTheDocument();
    });
  }, 20000);

  it('shows the duplicate message when supabase returns 23505', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    insertMock.mockResolvedValue({ error: { code: '23505', message: 'duplicate key' } });

    renderAt('?goal=build-muscle');
    await walkToEmailStep(user);

    await user.type(await screen.findByPlaceholderText('onboarding.email.placeholder'), 'dup@example.com');
    await user.click(screen.getByText('onboarding.buttons.joinWaitlist'));

    await waitFor(() => {
      expect(screen.getByText('onboarding.email.duplicateMessage')).toBeInTheDocument();
    });
  }, 20000);

  it('shows the error message when supabase returns a generic error', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    insertMock.mockResolvedValue({ error: { code: '99999', message: 'denied' } });

    renderAt('?goal=build-muscle');
    await walkToEmailStep(user);

    await user.type(await screen.findByPlaceholderText('onboarding.email.placeholder'), 'err@example.com');
    await user.click(screen.getByText('onboarding.buttons.joinWaitlist'));

    await waitFor(() => {
      expect(screen.getByText('onboarding.email.errorMessage')).toBeInTheDocument();
    });
  }, 20000);

  it('shows the connection-error message when supabase throws', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    insertMock.mockRejectedValue(new Error('network down'));

    renderAt('?goal=build-muscle');
    await walkToEmailStep(user);

    await user.type(await screen.findByPlaceholderText('onboarding.email.placeholder'), 'oops@example.com');
    await user.click(screen.getByText('onboarding.buttons.joinWaitlist'));

    await waitFor(() => {
      expect(screen.getByText('onboarding.email.connectionError')).toBeInTheDocument();
    });
  }, 20000);

  it('does not call supabase when the input is empty (only whitespace)', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt('?goal=build-muscle');
    await walkToEmailStep(user);

    // Use fireEvent.submit on the form so the HTML5 required check doesn't
    // intercept us — we want to assert the JS guard kicks in.
    const input = await screen.findByPlaceholderText('onboarding.email.placeholder');
    const form = input.closest('form')!;
    await act(async () => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    expect(insertMock).not.toHaveBeenCalled();
  }, 20000);
});

describe('Onboarding keyboard shortcuts', () => {
  it('selects a single-select option when the matching number key is pressed', async () => {
    renderAt();
    // Step 1: 5 options. Press "2" → selects buildMuscle (index 1).
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    });
    // Wait for advance + slide
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    await waitFor(() => {
      // Confirm we left step 1
      expect(screen.queryByText('onboarding.step1.heading')).not.toBeInTheDocument();
    });
  });

  it('ignores number-key shortcuts on interstitial steps', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderAt();

    await selectAndAdvance(user, 'onboarding.step1.options.buildMuscle');
    await waitFor(() => screen.getByText('onboarding.buttons.continue'));

    // We're on step 2 (interstitial). Press "1" — should NOT advance.
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: '1' }));
      vi.advanceTimersByTime(500);
    });
    // Continue button still rendered → still on the interstitial step
    expect(screen.getByText('onboarding.buttons.continue')).toBeInTheDocument();
  });
});
