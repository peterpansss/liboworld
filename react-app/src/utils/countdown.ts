/**
 * Countdown maths shared by the two countdown surfaces — the sticky
 * CountdownBanner (giveaway/deadline bars) and the inline LaunchCountdown
 * block on the founding-offer cards. Extracted so both agree on rounding;
 * CountdownBanner's tests pin the behaviour.
 */

/** Zero-pads to two digits so the digits don't jitter as values change. */
export function pad2(n: number) {
  return n < 10 ? '0' + n : String(n);
}

export type CountdownParts = {
  totalSec: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

/** Remaining time between `now` and `target` (both epoch ms), floored at zero. */
export function diffParts(target: number, now: number): CountdownParts {
  const diff = Math.max(0, target - now);
  const sec = Math.floor(diff / 1000);
  return {
    totalSec: sec,
    days: Math.floor(sec / 86400),
    hours: Math.floor((sec % 86400) / 3600),
    minutes: Math.floor((sec % 3600) / 60),
    seconds: sec % 60,
  };
}
