import { describe, it, expect } from 'vitest';
import { isBlockedPath } from '../../src/components/blueprint/blueprintPopupRules';

describe('Blueprint exit popup page rules', () => {
  it('stays off the pages where it would get in the way', () => {
    for (const p of ['/blueprint', '/find-your-plan', '/rules', '/giveaway-rules', '/rewards-rules', '/terms', '/privacy', '/get-app', '/admin/payouts', '/auth/callback', '/w/abc']) {
      expect(isBlockedPath(p)).toBe(true);
    }
  });
  it('runs on the content pages', () => {
    for (const p of ['/', '/membership', '/cash-challenges', '/exercises/squat', '/blog/some-post', '/rulesxyz']) {
      expect(isBlockedPath(p)).toBe(false);
    }
  });
});
