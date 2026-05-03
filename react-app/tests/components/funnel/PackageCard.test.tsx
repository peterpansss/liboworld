/**
 * Tests for src/components/funnel/PackageCard.tsx — pricing card with
 * a CTA button, optional badge, and optional perk chips.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PackageCard from '../../../src/components/funnel/PackageCard';

void React;

describe('PackageCard', () => {
  it('renders the name, hero number/label, price, and CTA', () => {
    render(
      <PackageCard
        name="BRONZE"
        hero="5"
        heroLabel="FREE BONUS ENTRIES"
        price="€10"
        priceSubline="single payment"
        highlight="bronze"
        ctaLabel="SELECT"
        onSelect={() => {}}
      />,
    );
    expect(screen.getByText('BRONZE')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('FREE BONUS ENTRIES')).toBeInTheDocument();
    expect(screen.getByText('€10')).toBeInTheDocument();
    expect(screen.getByText('single payment')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SELECT' })).toBeInTheDocument();
  });

  it('renders the badge when provided', () => {
    render(
      <PackageCard
        name="GOLD" hero="50" heroLabel="ENTRIES" price="€100" highlight="gold"
        badge="MOST POPULAR" ctaLabel="GET" onSelect={() => {}}
      />,
    );
    expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
  });

  it('omits the badge when not provided', () => {
    render(
      <PackageCard
        name="ENTRY" hero="1" heroLabel="ENTRY" price="Free"
        highlight="entry" ctaLabel="START" onSelect={() => {}}
      />,
    );
    expect(screen.queryByText('MOST POPULAR')).not.toBeInTheDocument();
  });

  it('renders perk chips with "+value label" formatting', () => {
    render(
      <PackageCard
        name="PRO" hero="10" heroLabel="ENTRIES" price="€20" highlight="pro"
        perks={[{ value: '1 mo', label: 'Pro access' }, { value: '500', label: 'XP' }]}
        ctaLabel="GET" onSelect={() => {}}
      />,
    );
    expect(screen.getByText('+1 mo Pro access')).toBeInTheDocument();
    expect(screen.getByText('+500 XP')).toBeInTheDocument();
  });

  it('omits perk row when perks is empty', () => {
    const { container } = render(
      <PackageCard
        name="X" hero="1" heroLabel="L" price="€1" highlight="silver"
        perks={[]} ctaLabel="GET" onSelect={() => {}}
      />,
    );
    // No "+x" prefix anywhere
    expect(container.textContent).not.toMatch(/\+/);
  });

  it('invokes onSelect when CTA clicked', () => {
    const fn = vi.fn();
    render(
      <PackageCard
        name="X" hero="1" heroLabel="L" price="€1" highlight="silver"
        ctaLabel="SELECT" onSelect={fn}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SELECT' }));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('renders a non-empty subline placeholder when priceSubline is omitted', () => {
    const { container } = render(
      <PackageCard
        name="X" hero="1" heroLabel="L" price="€1" highlight="silver"
        ctaLabel="GO" onSelect={() => {}}
      />,
    );
    // The placeholder is a single space, ensuring the layout slot exists.
    // We assert there's at least one element with non-empty whitespace text.
    const sublines = Array.from(container.querySelectorAll('div')).filter((d) =>
      /^\s+$/.test(d.textContent ?? ''),
    );
    expect(sublines.length).toBeGreaterThan(0);
  });

  it('handles every highlight color variant without crashing', () => {
    const variants = ['entry', 'bronze', 'silver', 'gold', 'platinum', 'starter', 'pro', 'elite'] as const;
    for (const v of variants) {
      const { unmount } = render(
        <PackageCard
          name={v.toUpperCase()} hero="1" heroLabel="L" price="€1" highlight={v}
          ctaLabel="GET" onSelect={() => {}}
        />,
      );
      unmount();
    }
  });

  it('triggers the mouse-down/up/leave style toggles without throwing', () => {
    render(
      <PackageCard
        name="X" hero="1" heroLabel="L" price="€1" highlight="silver"
        ctaLabel="SELECT" onSelect={() => {}}
      />,
    );
    const btn = screen.getByRole('button', { name: 'SELECT' });
    fireEvent.mouseDown(btn);
    expect(btn.style.transform).toBe('scale(0.97)');
    fireEvent.mouseUp(btn);
    expect(btn.style.transform).toBe('');
    fireEvent.mouseDown(btn);
    fireEvent.mouseLeave(btn);
    expect(btn.style.transform).toBe('');
  });
});
