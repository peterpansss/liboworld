/**
 * /giveaway: the "Opening next" card and the round countdown maths.
 *
 * The card must render nothing while GIVEAWAY_ROUNDS has no round after the
 * featured one (true today: only the PlayStation 5 round exists), and must
 * show the next round with a countdown to its opening once one is added.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  GIVEAWAY_ROUNDS, featuredRound, berlinMidnight, roundOpensAt, roundClosesAt, countdownTarget, announceDate,
  type GiveawayRound,
} from '../../src/data/giveawayRounds';

void React;

vi.mock('react-i18next', async () => {
  const en = (await import('../../src/i18n/locales/en.json')).default as Record<string, unknown>;
  const lookup = (key: string) =>
    key.split('.').reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], en);
  return {
    useTranslation: () => ({
      t: (key: string, opts?: Record<string, unknown>) => {
        const hit = lookup(key);
        if (typeof hit !== 'string') return key;
        return hit.replace(/\{\{(\w+)\}\}/g, (_, k) => String(opts?.[k] ?? ''));
      },
      i18n: { language: 'en' },
    }),
    initReactI18next: { type: '3rdParty', init: () => {} },
  };
});

const GiveawayNextCard = (await import('../../src/components/earn/GiveawayNextCard')).default;

const FUTURE: GiveawayRound = {
  n: 99, title: 'Test Giveaway', opens: '2027-01-04', closes: '2027-01-31',
  prize: 'A test prize', winners: 1, prizeName: 'Test Prize', cashEur: 100, prop: 'ps5-slim',
};

const NOW = new Date('2026-11-20T12:00:00Z');

afterEach(() => {
  const i = GIVEAWAY_ROUNDS.indexOf(FUTURE);
  if (i >= 0) GIVEAWAY_ROUNDS.splice(i, 1);
});

const renderCard = (now: Date) =>
  render(<MemoryRouter><GiveawayNextCard featured={featuredRound(now)} now={now} /></MemoryRouter>);

describe('GiveawayNextCard', () => {
  it('renders nothing when no later round is scheduled', () => {
    const { container } = renderCard(NOW);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the next round with a countdown to its opening', () => {
    GIVEAWAY_ROUNDS.push(FUTURE);
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    try {
      renderCard(NOW);
      expect(screen.getByText('Opening next')).toBeInTheDocument();
      expect(screen.getByText('Test Prize')).toBeInTheDocument();
      expect(screen.getByText(/^Opens (4 Jan|Jan 4)$/)).toBeInTheDocument();
      expect(screen.getByRole('timer')).toHaveTextContent(/Opens in/);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('round times (Europe/Berlin)', () => {
  const ps5 = GIVEAWAY_ROUNDS[0];

  it('opens at 00:00 Berlin (CET, UTC+1) on the opening day', () => {
    expect(new Date(roundOpensAt(ps5)).toISOString()).toBe('2026-11-22T23:00:00.000Z');
  });

  it('closes at the end of 23:59 Berlin on the closing day', () => {
    expect(new Date(roundClosesAt(ps5)).toISOString()).toBe('2026-12-20T23:00:00.000Z');
  });

  it('handles summer time (CEST, UTC+2)', () => {
    expect(new Date(berlinMidnight('2027-07-01')).toISOString()).toBe('2027-06-30T22:00:00.000Z');
  });

  it('announces the winner the day after the close, as the rules say', () => {
    expect(announceDate(ps5)).toBe('2026-12-21');
  });

  it('counts to the opening, then the close, then stops', () => {
    expect(countdownTarget(ps5, roundOpensAt(ps5) - 1)).toEqual({ phase: 'opens', target: roundOpensAt(ps5) });
    expect(countdownTarget(ps5, roundOpensAt(ps5))).toEqual({ phase: 'closes', target: roundClosesAt(ps5) });
    expect(countdownTarget(ps5, roundClosesAt(ps5))).toBeNull();
    expect(countdownTarget(ps5, roundOpensAt(ps5), 'open')).toBeNull();
  });
});
