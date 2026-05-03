/**
 * Tests for src/components/EmojiIcon.tsx.
 *
 * Pure presentational wrapper that resolves an emoji or icon prop to a
 * Lucide component. Verifies prop precedence and the size/stroke/color
 * pass-through.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { EmojiIcon } from '../../src/components/EmojiIcon';
import { Bell, Dumbbell } from '../../src/utils/icons';

void React;

describe('EmojiIcon', () => {
  it('renders the explicit icon prop when provided (wins over emoji)', () => {
    const { container } = render(<EmojiIcon icon={Bell} emoji="🔔" />);
    // Lucide renders as an SVG with class lucide-* — class names are stable
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('class') ?? '').toMatch(/bell/i);
  });

  it('resolves an emoji to a Lucide icon when no icon prop given', () => {
    const { container } = render(<EmojiIcon emoji="🏋️" />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
  });

  it('falls back to Dumbbell when emoji is unknown and no fallback given', () => {
    const { container } = render(<EmojiIcon emoji="nope-not-an-emoji" />);
    const svg = container.querySelector('svg');
    // resolveIcon defaults to Dumbbell
    expect(svg!.getAttribute('class') ?? '').toMatch(/dumbbell/i);
  });

  it('uses the fallback icon when emoji is unknown', () => {
    const { container } = render(<EmojiIcon emoji="nope" fallback={Bell} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('class') ?? '').toMatch(/bell/i);
  });

  it('falls back to Dumbbell when emoji is empty/undefined', () => {
    const { container } = render(<EmojiIcon />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('class') ?? '').toMatch(/dumbbell/i);
  });

  it('passes size, color and className through', () => {
    const { container } = render(
      <EmojiIcon icon={Dumbbell} size={42} color="#ff0000" className="hello" />,
    );
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('42');
    expect(svg.getAttribute('height')).toBe('42');
    // Lucide forwards `color` to the stroke attr
    expect(svg.getAttribute('stroke')).toBe('#ff0000');
    expect(svg.getAttribute('class') ?? '').toContain('hello');
  });
});
