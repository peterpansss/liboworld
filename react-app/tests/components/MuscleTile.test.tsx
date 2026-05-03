/**
 * Tests for src/components/MuscleTile.tsx.
 *
 * Tiny presentational tile. We verify size variant, label rendering and
 * the showLabel/className escape hatches.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MuscleTile } from '../../src/components/MuscleTile';

void React;

describe('MuscleTile', () => {
  it('renders the upper-cased muscle label by default', () => {
    render(<MuscleTile muscle="chest" />);
    expect(screen.getByText('CHEST')).toBeInTheDocument();
  });

  it('falls back to "EXERCISE" when muscle is empty', () => {
    render(<MuscleTile muscle="" />);
    expect(screen.getByText('EXERCISE')).toBeInTheDocument();
  });

  it('omits the label when showLabel is false', () => {
    const { container } = render(<MuscleTile muscle="back" showLabel={false} />);
    expect(container.querySelector('.muscle-tile__label')).toBeNull();
  });

  it('applies size modifier class', () => {
    const { container } = render(<MuscleTile muscle="legs" size="lg" />);
    expect(container.firstChild).toHaveClass('muscle-tile--lg');
  });

  it('defaults to size md and merges className', () => {
    const { container } = render(<MuscleTile muscle="abs" className="extra" />);
    const root = container.firstChild as HTMLElement;
    expect(root).toHaveClass('muscle-tile--md');
    expect(root).toHaveClass('extra');
  });

  it('marks the tile as aria-hidden (decorative)', () => {
    const { container } = render(<MuscleTile muscle="chest" />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
