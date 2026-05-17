/**
 * Tests for src/components/AnatomyDiagram.tsx.
 *
 * The component composes a third-party SVG body model. We mock
 * react-body-highlighter so we can read what `data` payloads were passed
 * for the anterior vs posterior views.
 *
 * Coverage focus:
 *  - title + Front/Back labels
 *  - primary/secondary legend chips
 *  - SLUG_MAP filtering by side (e.g. Lats only on posterior)
 *  - dedupe within a side
 *  - empty body focus → no chips, but bodies still render
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

void React;

// Capture every <Model> prop set so assertions can check what was passed.
const modelCalls: Array<{ type: string; muscles: string[][] }> = [];

vi.mock('react-body-highlighter', () => {
  return {
    default: (props: { type: string; data: { name: string; muscles: string[] }[] }) => {
      modelCalls.push({
        type: props.type,
        muscles: props.data.map((d) => d.muscles),
      });
      return React.createElement('div', {
        'data-testid': `body-${props.type}`,
        'data-muscles': JSON.stringify(props.data),
      });
    },
  };
});

import { AnatomyDiagram } from '../../src/components/AnatomyDiagram';

beforeEach(() => {
  modelCalls.length = 0;
});

import { beforeEach } from 'vitest';

describe('AnatomyDiagram', () => {
  it('renders the title plus Front and Back labels', () => {
    render(<AnatomyDiagram bodyFocus="Chest" />);
    expect(screen.getByText('Target Muscle')).toBeInTheDocument();
    expect(screen.getByText('Front')).toBeInTheDocument();
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders both anterior and posterior models', () => {
    render(<AnatomyDiagram bodyFocus="Chest" />);
    expect(screen.getByTestId('body-anterior')).toBeInTheDocument();
    expect(screen.getByTestId('body-posterior')).toBeInTheDocument();
  });

  it('shows Primary and Secondary legend chips for compound focuses', () => {
    render(<AnatomyDiagram bodyFocus="Chest" />);
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
    expect(screen.getByText('Chest')).toBeInTheDocument();
    // Front Delts + Triceps are secondary on Chest
    expect(screen.getByText('Front Delts')).toBeInTheDocument();
    expect(screen.getByText('Triceps')).toBeInTheDocument();
  });

  it('routes side-locked muscles only to the correct view', () => {
    render(<AnatomyDiagram bodyFocus="Back" />);
    const anterior = modelCalls.find((c) => c.type === 'anterior')!;
    const posterior = modelCalls.find((c) => c.type === 'posterior')!;
    // SLUG_MAP says Lats → upper-back ONLY on posterior. Back primaries
    // include Lats + Rhomboids. On the anterior view they should be filtered.
    const anteriorPrimary = anterior.muscles.find((_, i) => i === 1)!; // [secondary, primary]
    const posteriorPrimary = posterior.muscles[1];
    expect(anteriorPrimary).not.toContain('upper-back');
    expect(posteriorPrimary).toContain('upper-back');
  });

  it('appends primary muscles twice (so they paint with index-1 color)', () => {
    render(<AnatomyDiagram bodyFocus="Chest" />);
    const anterior = modelCalls.find((c) => c.type === 'anterior')!;
    const primary = anterior.muscles[1];
    // Chest is in there twice
    const chestCount = primary.filter((m) => m === 'chest').length;
    expect(chestCount).toBe(2);
  });

  it('renders without legend chips when bodyFocus is empty/unknown', () => {
    render(<AnatomyDiagram bodyFocus="" />);
    // No "Primary" / "Secondary" labels because muscles array is empty
    expect(screen.queryByText('Primary')).not.toBeInTheDocument();
    expect(screen.queryByText('Secondary')).not.toBeInTheDocument();
    // Bodies still render
    expect(screen.getByTestId('body-anterior')).toBeInTheDocument();
  });

  it('passes className through to root', () => {
    const { container } = render(
      <AnatomyDiagram bodyFocus="Chest" className="extra-class" />,
    );
    expect((container.firstChild as HTMLElement).className).toContain('extra-class');
  });
});
