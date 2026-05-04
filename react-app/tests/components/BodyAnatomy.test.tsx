/**
 * Tests for src/components/BodyAnatomy.tsx.
 *
 * Static SVG with 13 muscle groups across front + back. We assert the
 * stateFor callback is queried for the expected muscles and that the
 * data-state attribute is set on each <g data-muscle>.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { BodyAnatomy } from '../../src/components/BodyAnatomy';

void React;

describe('BodyAnatomy', () => {
  it('renders an SVG labelled as a muscle activation diagram', () => {
    const { container } = render(<BodyAnatomy stateFor={() => 'off'} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('aria-label')).toBe('Muscle activation diagram');
    expect(svg!.getAttribute('role')).toBe('img');
  });

  it('queries stateFor for every supported muscle name', () => {
    const seen = new Set<string>();
    render(<BodyAnatomy stateFor={(m) => { seen.add(m); return 'off'; }} />);
    // The component hand-codes these — verify the canonical 13 + fallbacks.
    [
      'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms',
      'Abs', 'Obliques', 'Core', 'Quads', 'Hamstrings', 'Glutes', 'Calves',
      'Front Delts', 'Side Delts', 'Rear Delts', 'Traps', 'Hip Flexors',
      'Lower Back', 'Lats', 'Rhomboids',
    ].forEach((m) => {
      expect(seen.has(m)).toBe(true);
    });
  });

  it('writes data-state attributes for primary/secondary/off muscles', () => {
    const stateFor = (muscle: string): 'primary' | 'secondary' | 'off' => {
      if (muscle === 'Chest') return 'primary';
      if (muscle === 'Triceps') return 'secondary';
      return 'off';
    };
    const { container } = render(<BodyAnatomy stateFor={stateFor} />);
    const chest = container.querySelector('[data-muscle="Chest"]');
    expect(chest).not.toBeNull();
    expect(chest!.getAttribute('data-state')).toBe('primary');
    const triceps = container.querySelector('[data-muscle="Triceps"]');
    expect(triceps!.getAttribute('data-state')).toBe('secondary');
    const biceps = container.querySelector('[data-muscle="Biceps"]');
    expect(biceps!.getAttribute('data-state')).toBe('off');
  });

  it('renders the FRONT and BACK view labels', () => {
    const { container } = render(<BodyAnatomy stateFor={() => 'off'} />);
    const labels = Array.from(container.querySelectorAll('text')).map((t) => t.textContent);
    expect(labels).toContain('FRONT');
    expect(labels).toContain('BACK');
  });

  it('does not throw when stateFor returns the same state for every call', () => {
    expect(() => render(<BodyAnatomy stateFor={() => 'primary'} />)).not.toThrow();
  });
});
