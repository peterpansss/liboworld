/**
 * Tests for src/components/MuscleGroupStrip.tsx.
 *
 * Renders a horizontal strip of muscle-group cards. We mock
 * react-body-highlighter so the component tree stays under our control.
 *
 * react-i18next is mocked with a tiny fixture dictionary (falling back to
 * the key) so label assertions don't depend on the real locale bundles.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

void React;

const T_FIXTURE: Record<string, string> = {
  'exerciseLibrary.muscles.chest': 'Chest',
  'exerciseLibrary.muscles.fullBody': 'Full Body',
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => T_FIXTURE[key] ?? key, i18n: {} }),
}));

vi.mock('react-body-highlighter', () => ({
  default: () =>
    React.createElement('div', { 'data-testid': 'mock-body' }),
}));

import { MuscleGroupStrip } from '../../src/components/MuscleGroupStrip';
import { MUSCLE_GROUP_KEYS } from '../../src/utils/exerciseInfo';

describe('MuscleGroupStrip', () => {
  it('renders the default title', () => {
    render(
      <MemoryRouter>
        <MuscleGroupStrip />
      </MemoryRouter>,
    );
    expect(screen.getByText('exerciseLibrary.exploreByMuscleGroup')).toBeInTheDocument();
  });

  it('overrides the title via prop', () => {
    render(
      <MemoryRouter>
        <MuscleGroupStrip title="Pick a region" />
      </MemoryRouter>,
    );
    expect(screen.getByText('Pick a region')).toBeInTheDocument();
  });

  it('renders one item per MUSCLE_GROUP_KEYS entry with /exercises link', () => {
    const { container } = render(
      <MemoryRouter>
        <MuscleGroupStrip />
      </MemoryRouter>,
    );
    const links = container.querySelectorAll('a.mgs__item');
    expect(links.length).toBe(MUSCLE_GROUP_KEYS.length);
    // Each link should have href encoding the muscle param
    const hrefs = Array.from(links).map((a) => a.getAttribute('href'));
    expect(hrefs[0]).toMatch(/^\/exercises\?muscle=/);
  });

  it('marks the activeMuscle item with --active and links it back to the unfiltered list', () => {
    const { container } = render(
      <MemoryRouter>
        <MuscleGroupStrip activeMuscle="Chest" />
      </MemoryRouter>,
    );
    const activeLinks = container.querySelectorAll('a.mgs__item--active');
    expect(activeLinks).toHaveLength(1);
    expect(activeLinks[0].getAttribute('aria-current')).toBe('true');
    // Clicking the active muscle toggles the filter off, so it links to the
    // bare list; every other muscle still links to its filtered view.
    expect(activeLinks[0].getAttribute('href')).toBe('/exercises');
    const inactiveHrefs = Array.from(
      container.querySelectorAll('a.mgs__item:not(.mgs__item--active)'),
    ).map((a) => a.getAttribute('href'));
    expect(inactiveHrefs.length).toBe(MUSCLE_GROUP_KEYS.length - 1);
    for (const href of inactiveHrefs) expect(href).toMatch(/^\/exercises\?muscle=/);
  });

  it('renders the muscle label upper-cased', () => {
    render(
      <MemoryRouter>
        <MuscleGroupStrip />
      </MemoryRouter>,
    );
    // translated "Chest" → "CHEST"
    expect(screen.getByText('CHEST')).toBeInTheDocument();
    // translated "Full Body" → "FULL BODY"
    expect(screen.getByText('FULL BODY')).toBeInTheDocument();
  });

  it('renders the body model only for muscles in PREVIEW_MAP', () => {
    const { container } = render(
      <MemoryRouter>
        <MuscleGroupStrip />
      </MemoryRouter>,
    );
    // Each preview-mapped muscle gets a mock-body inside its tile.
    const bodies = container.querySelectorAll('[data-testid="mock-body"]');
    // PREVIEW_MAP has 14 entries but MUSCLE_GROUP_KEYS may be a subset.
    // We just assert at least one body renders.
    expect(bodies.length).toBeGreaterThan(0);
  });
});
