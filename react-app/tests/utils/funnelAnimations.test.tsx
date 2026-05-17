/**
 * Coverage for src/utils/funnelAnimations.ts.
 *
 * Each of the three hooks integrates with browser-only APIs that jsdom does
 * not implement (IntersectionObserver, requestAnimationFrame for some
 * variants), so we install minimal fakes from inside the test file.
 */
import React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, render } from '@testing-library/react';
import {
  useInView,
  useCountUp,
  useRevealOnScroll,
} from '../../src/utils/funnelAnimations';

// ---------- Fake IntersectionObserver --------------------------------------

interface ObserverInstance {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[];
  disconnected: boolean;
}

const observers: ObserverInstance[] = [];

class FakeIntersectionObserver {
  callback: IntersectionObserverCallback;
  options?: IntersectionObserverInit;
  observed: Element[] = [];
  disconnected = false;

  constructor(cb: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = cb;
    this.options = options;
    observers.push(this as unknown as ObserverInstance);
  }
  observe(target: Element) { this.observed.push(target); }
  unobserve(target: Element) {
    this.observed = this.observed.filter((el) => el !== target);
  }
  disconnect() { this.disconnected = true; this.observed = []; }
  takeRecords(): IntersectionObserverEntry[] { return []; }
  root = null;
  rootMargin = '';
  thresholds: ReadonlyArray<number> = [];
}

beforeEach(() => {
  observers.length = 0;
  // @ts-expect-error - assigning fake to the global
  globalThis.IntersectionObserver = FakeIntersectionObserver;
});

afterEach(() => {
  // @ts-expect-error - cleanup
  delete globalThis.IntersectionObserver;
});

function fireIntersection(observer: ObserverInstance, intersecting: boolean) {
  const entries = observer.observed.map(
    (el) =>
      ({
        target: el,
        isIntersecting: intersecting,
        intersectionRatio: intersecting ? 1 : 0,
        boundingClientRect: el.getBoundingClientRect(),
        intersectionRect: el.getBoundingClientRect(),
        rootBounds: null,
        time: 0,
      } as unknown as IntersectionObserverEntry),
  );
  observer.callback(entries, observer as unknown as IntersectionObserver);
}

// ---------- useInView ------------------------------------------------------

function InViewProbe({ threshold }: { threshold?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>(threshold);
  return (
    <div ref={ref} data-testid="probe" data-inview={inView ? 'yes' : 'no'} />
  );
}

describe('useInView', () => {
  it('starts as not-in-view, then flips true on intersection and unobserves', () => {
    const { getByTestId } = render(<InViewProbe />);
    const probe = getByTestId('probe');
    expect(probe.dataset.inview).toBe('no');
    expect(observers.length).toBe(1);
    const obs = observers[0];
    expect(obs.observed).toContain(probe);

    act(() => {
      fireIntersection(obs, true);
    });

    expect(probe.dataset.inview).toBe('yes');
    // The hook unobserves once it has flipped to in-view.
    expect(obs.observed).not.toContain(probe);
  });

  it('respects the provided threshold', () => {
    render(<InViewProbe threshold={0.7} />);
    expect(observers[0].options?.threshold).toBe(0.7);
  });

  it('defaults the threshold to 0.3', () => {
    render(<InViewProbe />);
    expect(observers[0].options?.threshold).toBe(0.3);
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<InViewProbe />);
    const obs = observers[0];
    unmount();
    expect(obs.disconnected).toBe(true);
  });

  it('no-ops if the ref never attaches to anything', () => {
    // We render a hook with a ref we never bind to a DOM element.
    function Probe() {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const _ = useInView();
      // Intentionally do not consume `_.ref` so it remains null.
      return null;
    }
    render(<Probe />);
    // No observer created when ref.current is null.
    expect(observers.length).toBe(0);
  });
});

// ---------- useCountUp ----------------------------------------------------

describe('useCountUp', () => {
  it('returns 0 until trigger flips true', () => {
    const { result } = renderHook(({ trigger }) => useCountUp(100, trigger, 1000), {
      initialProps: { trigger: false },
    });
    expect(result.current).toBe(0);
  });

  it('drives the value toward target via requestAnimationFrame', () => {
    // Stub performance.now and rAF so the effect runs deterministically.
    let now = 1000;
    const nowSpy = vi.spyOn(performance, 'now').mockImplementation(() => now);
    let queued: FrameRequestCallback | null = null;
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      queued = cb;
      return 1 as unknown as number;
    });

    const { result } = renderHook(({ trigger }) => useCountUp(100, trigger, 1000), {
      initialProps: { trigger: false },
    });
    expect(result.current).toBe(0);

    // Trigger the count.
    act(() => {
      // re-render with trigger=true
    });
    // Use rerender via renderHook trick:
    // (renderHook above doesn't expose rerender by default with overload)

    // Use a fresh render that already has trigger=true to drive the loop.
    const { result: r2 } = renderHook(() => useCountUp(100, true, 1000));
    // After mount, the first rAF has been queued; pump it through.
    expect(queued).not.toBeNull();
    // Halfway through: now += 500
    now += 500;
    act(() => { queued!(now); });
    expect(r2.current).toBeGreaterThan(0);
    expect(r2.current).toBeLessThan(100);

    // Finish the animation: now jumps past duration
    now += 600;
    act(() => { queued!(now); });
    expect(r2.current).toBe(100);

    nowSpy.mockRestore();
    rafSpy.mockRestore();
  });

  it('does not double-fire when re-rendered with trigger still true', () => {
    let now = 0;
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => {
      // count invocations via spy.mock.calls.length
      now++;
      return 1 as unknown as number;
    });

    const { rerender } = renderHook(({ trigger }) => useCountUp(50, trigger, 100), {
      initialProps: { trigger: true },
    });
    const firstCount = rafSpy.mock.calls.length;
    expect(firstCount).toBeGreaterThanOrEqual(1);

    rerender({ trigger: true });
    rerender({ trigger: true });
    // counted.current latch means no NEW rAF should be queued by re-render alone
    expect(rafSpy.mock.calls.length).toBe(firstCount);

    rafSpy.mockRestore();
    void now;
  });

  it('uses the default duration when omitted', () => {
    // Just confirms the call doesn't throw and starts at 0.
    const { result } = renderHook(() => useCountUp(10, false));
    expect(result.current).toBe(0);
  });
});

// ---------- useRevealOnScroll --------------------------------------------

function RevealHost({ withChildren = true }: { withChildren?: boolean }) {
  useRevealOnScroll();
  return withChildren ? (
    <div>
      <div data-reveal data-testid="r1" />
      <div data-reveal data-reveal-delay="0.4" data-testid="r2" />
      <div data-testid="not-revealed-marker" />
    </div>
  ) : (
    <div />
  );
}

describe('useRevealOnScroll', () => {
  it('observes every [data-reveal] element and adds .revealed on intersection', () => {
    const { getByTestId } = render(<RevealHost />);
    expect(observers.length).toBe(1);
    const obs = observers[0];
    expect(obs.observed.length).toBe(2);

    const r1 = getByTestId('r1');
    const r2 = getByTestId('r2');
    expect(r1.classList.contains('revealed')).toBe(false);

    act(() => { fireIntersection(obs, true); });

    expect(r1.classList.contains('revealed')).toBe(true);
    expect(r2.classList.contains('revealed')).toBe(true);
  });

  it('applies revealDelay as transitionDelay', () => {
    const { getByTestId } = render(<RevealHost />);
    const r2 = getByTestId('r2') as HTMLElement;
    act(() => { fireIntersection(observers[0], true); });
    expect(r2.style.transitionDelay).toBe('0.4s');
  });

  it('does not set transitionDelay when delay is 0 / missing', () => {
    const { getByTestId } = render(<RevealHost />);
    const r1 = getByTestId('r1') as HTMLElement;
    act(() => { fireIntersection(observers[0], true); });
    expect(r1.style.transitionDelay).toBe('');
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<RevealHost />);
    unmount();
    expect(observers[0].disconnected).toBe(true);
  });

  it('handles a non-intersecting tick without modifying classList', () => {
    const { getByTestId } = render(<RevealHost />);
    const r1 = getByTestId('r1');
    act(() => { fireIntersection(observers[0], false); });
    expect(r1.classList.contains('revealed')).toBe(false);
  });

  it('skips elements already marked .revealed', () => {
    // Pre-populate the DOM with a revealed element BEFORE mount.
    const stale = document.createElement('div');
    stale.setAttribute('data-reveal', '');
    stale.classList.add('revealed');
    document.body.appendChild(stale);

    function HostOnly() { useRevealOnScroll(); return null; }
    render(<HostOnly />);
    // The selector excludes already-revealed nodes.
    expect(observers[0].observed).not.toContain(stale);
    document.body.removeChild(stale);
  });
});
