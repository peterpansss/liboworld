/**
 * Tests for src/components/funnel/SocialProofCounter.tsx.
 *
 * The component triggers a count-up animation only when the section
 * intersects the viewport. We mock IntersectionObserver to invoke its
 * callback synchronously, then drive requestAnimationFrame to "complete"
 * the animation in one frame.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import SocialProofCounter from '../../../src/components/funnel/SocialProofCounter';

void React;

class MockIO {
  callback: IntersectionObserverCallback;
  constructor(cb: IntersectionObserverCallback) {
    this.callback = cb;
  }
  observe = (target: Element) => {
    // Fire intersecting=true synchronously
    this.callback(
      [{ isIntersecting: true, target } as unknown as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  };
  unobserve = vi.fn();
  disconnect = vi.fn();
}

beforeEach(() => {
  (globalThis as any).IntersectionObserver = MockIO;
  // Make rAF flush each frame instantly so the count-up completes.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(performance.now() + 5000);
    return 0;
  });
});

afterEach(() => {
  delete (globalThis as any).IntersectionObserver;
});

describe('SocialProofCounter', () => {
  it('renders one cell per counter, with label uppercased styling and target value', () => {
    render(
      <SocialProofCounter
        counters={[
          { value: 1234, label: 'Members' },
          { value: 5000, prefix: '€', suffix: '+', label: 'Paid out' },
        ]}
      />,
    );
    expect(screen.getByText('Members')).toBeInTheDocument();
    expect(screen.getByText('Paid out')).toBeInTheDocument();
    // Animation completes immediately because rAF fires the final tick.
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('€5,000+')).toBeInTheDocument();
  });

  it('starts at 0 before the section intersects', () => {
    // Override IO to NOT trigger; observe is a no-op.
    (globalThis as any).IntersectionObserver = class {
      observe = () => {};
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
    render(<SocialProofCounter counters={[{ value: 100, label: 'X' }]} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('handles an empty counters array (renders nothing inside)', () => {
    const { container } = render(<SocialProofCounter counters={[]} />);
    // Outer flex container exists but no counter cells inside
    const cells = container.querySelectorAll(
      'div[style*="text-align"][style*="center"]',
    );
    expect(cells.length).toBe(0);
  });

  it('disconnects the observer on unmount', () => {
    let observerInstance: any = null;
    (globalThis as any).IntersectionObserver = class {
      callback: any;
      constructor(cb: any) { this.callback = cb; observerInstance = this; }
      observe = () => {};
      unobserve = vi.fn();
      disconnect = vi.fn();
    };
    const { unmount } = render(<SocialProofCounter counters={[{ value: 1, label: 'X' }]} />);
    unmount();
    expect(observerInstance.disconnect).toHaveBeenCalled();
  });
});
