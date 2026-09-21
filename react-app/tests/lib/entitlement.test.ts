/**
 * Tests for src/lib/entitlement.ts — in particular `resolveGrantPlan`, which
 * decides the expiry the admin panel writes when an operator comps someone a
 * month of Premium.
 *
 * The extend-vs-replace rule lives here rather than in the component so it can
 * be asserted without a DOM, and so the mobile app's `isEntitled` port and the
 * grant maths stay in one file that has to be read together.
 *
 * Dates are built with the LOCAL `Date` constructor on both sides of every
 * assertion. `resolveGrantPlan` preserves local wall-clock time when it adds
 * months, so a literal UTC string would only be correct in one timezone.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  isEntitledSubscription,
  effectiveTier,
  resolveGrantPlan,
  GRANT_DURATION_OPTIONS,
} from '../../src/lib/entitlement';

/** 21 Sep 2026, 12:00 local. */
const NOW = new Date(2026, 8, 21, 12, 0, 0, 0);

function freezeNow() {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
}

afterEach(() => {
  vi.useRealTimers();
});

describe('isEntitledSubscription', () => {
  it('treats an active row with no expiry as entitled', () => {
    expect(isEntitledSubscription('active', null)).toBe(true);
  });

  it('treats an active row with a PAST expiry as NOT entitled', () => {
    expect(isEntitledSubscription('active', '2020-01-01T00:00:00Z')).toBe(false);
  });

  it('treats a cancelled row as entitled only while paid through', () => {
    expect(isEntitledSubscription('cancelled', '2999-01-01T00:00:00Z')).toBe(true);
    expect(isEntitledSubscription('cancelled', null)).toBe(false);
  });
});

describe('effectiveTier', () => {
  it('reports free once a pro grant has lapsed, even with status active', () => {
    expect(
      effectiveTier({
        tier: 'pro',
        subscription_status: 'active',
        subscription_expires_at: '2020-01-01T00:00:00Z',
      }),
    ).toBe('free');
  });
});

describe('resolveGrantPlan — duration presets', () => {
  it('offers Indefinite first so it is the default selection', () => {
    expect(GRANT_DURATION_OPTIONS[0].value).toBe('indefinite');
    expect(GRANT_DURATION_OPTIONS[0].months).toBeNull();
  });

  it('writes a null expiry for Indefinite (the pre-existing behaviour)', () => {
    freezeNow();
    const plan = resolveGrantPlan({ tier: 'pro', duration: 'indefinite', current: null });
    expect(plan.expiresAt).toBeNull();
    expect(plan.error).toBeNull();
  });

  it('counts 1 month from today for a user with no subscription row', () => {
    freezeNow();
    const plan = resolveGrantPlan({ tier: 'pro', duration: '1m', current: null });
    expect(plan.expiresAt).toBe(new Date(2026, 9, 21, 12, 0, 0, 0).toISOString());
    expect(plan.extendsFrom).toBeNull();
  });

  it('counts 12 months from today', () => {
    freezeNow();
    const plan = resolveGrantPlan({ tier: 'elite', duration: '12m', current: null });
    expect(plan.expiresAt).toBe(new Date(2027, 8, 21, 12, 0, 0, 0).toISOString());
  });

  it('clamps the day of month instead of rolling over into the next month', () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(2026, 0, 31, 9, 0, 0, 0)); // 31 Jan 2026
    const plan = resolveGrantPlan({ tier: 'pro', duration: '1m', current: null });
    // 28 Feb, not 3 March.
    expect(plan.expiresAt).toBe(new Date(2026, 1, 28, 9, 0, 0, 0).toISOString());
  });

  it('never writes an expiry alongside the free tier', () => {
    freezeNow();
    const plan = resolveGrantPlan({ tier: 'free', duration: '3m', current: null });
    expect(plan.expiresAt).toBeNull();
  });
});

describe('resolveGrantPlan — extend vs replace', () => {
  it('EXTENDS from the existing expiry when the same tier is still live', () => {
    freezeNow();
    const existing = new Date(2026, 9, 15, 9, 30, 0, 0); // 15 Oct 2026, in the future
    const plan = resolveGrantPlan({
      tier: 'pro',
      duration: '1m',
      current: {
        tier: 'pro',
        subscription_status: 'active',
        subscription_expires_at: existing.toISOString(),
      },
    });
    // 15 Nov — the remaining ~3 weeks are added to, not eaten.
    expect(plan.expiresAt).toBe(new Date(2026, 10, 15, 9, 30, 0, 0).toISOString());
    expect(plan.extendsFrom).toBe(existing.toISOString());
  });

  it('starts from TODAY when the existing grant has already lapsed', () => {
    freezeNow();
    const plan = resolveGrantPlan({
      tier: 'pro',
      duration: '1m',
      current: {
        tier: 'pro',
        subscription_status: 'active',
        subscription_expires_at: new Date(2026, 7, 1, 9, 0, 0, 0).toISOString(), // 1 Aug, past
      },
    });
    expect(plan.expiresAt).toBe(new Date(2026, 9, 21, 12, 0, 0, 0).toISOString());
    expect(plan.extendsFrom).toBeNull();
  });

  it('starts from TODAY when the tier being granted differs from the live one', () => {
    freezeNow();
    const plan = resolveGrantPlan({
      tier: 'elite',
      duration: '1m',
      current: {
        tier: 'pro',
        subscription_status: 'active',
        subscription_expires_at: new Date(2026, 9, 15, 9, 30, 0, 0).toISOString(),
      },
    });
    expect(plan.expiresAt).toBe(new Date(2026, 9, 21, 12, 0, 0, 0).toISOString());
    expect(plan.extendsFrom).toBeNull();
  });

  it('flags a duration applied over an indefinite grant as a replacement', () => {
    freezeNow();
    const plan = resolveGrantPlan({
      tier: 'pro',
      duration: '1m',
      current: { tier: 'pro', subscription_status: 'active', subscription_expires_at: null },
    });
    expect(plan.shortensIndefinite).toBe(true);
    expect(plan.extendsFrom).toBeNull();
    expect(plan.expiresAt).toBe(new Date(2026, 9, 21, 12, 0, 0, 0).toISOString());
  });
});

describe('resolveGrantPlan — custom date', () => {
  it('ends at local end-of-day so the chosen date is included', () => {
    freezeNow();
    const plan = resolveGrantPlan({
      tier: 'pro',
      duration: 'custom',
      customDate: '2026-11-22',
      current: null,
    });
    expect(plan.expiresAt).toBe(new Date(2026, 10, 22, 23, 59, 59, 999).toISOString());
    expect(plan.error).toBeNull();
  });

  it('refuses an empty or past date rather than silently granting forever', () => {
    freezeNow();
    expect(resolveGrantPlan({ tier: 'pro', duration: 'custom', customDate: '', current: null }).error)
      .toMatch(/end date/i);
    const past = resolveGrantPlan({
      tier: 'pro',
      duration: 'custom',
      customDate: '2020-01-01',
      current: null,
    });
    expect(past.error).toMatch(/future/i);
    expect(past.expiresAt).toBeNull();
  });
});
