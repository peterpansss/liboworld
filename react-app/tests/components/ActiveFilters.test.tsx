/**
 * Tests for src/components/ActiveFilters.tsx.
 *
 * Verifies the empty-state short-circuit, per-filter remove buttons,
 * accessible label format and the conditional "Clear all" affordance.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActiveFilters } from '../../src/components/ActiveFilters';

void React;

describe('ActiveFilters', () => {
  it('renders nothing when there are no filters', () => {
    const { container } = render(
      <ActiveFilters filters={[]} onRemove={() => {}} onClearAll={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders one pill per filter with an accessible remove label', () => {
    render(
      <ActiveFilters
        filters={[
          { key: 'muscle', label: 'Chest', value: 'chest' },
          { key: 'equipment', label: 'Barbell', value: 'barbell' },
        ]}
        onRemove={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByText('Chest')).toBeInTheDocument();
    expect(screen.getByText('Barbell')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Chest filter')).toBeInTheDocument();
    expect(screen.getByLabelText('Remove Barbell filter')).toBeInTheDocument();
  });

  it('does not render Clear all when only one filter is active', () => {
    render(
      <ActiveFilters
        filters={[{ key: 'muscle', label: 'Chest', value: 'chest' }]}
        onRemove={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.queryByText('Clear all')).not.toBeInTheDocument();
  });

  it('renders Clear all when 2+ filters are active', () => {
    render(
      <ActiveFilters
        filters={[
          { key: 'muscle', label: 'Chest', value: 'chest' },
          { key: 'equipment', label: 'Barbell', value: 'barbell' },
        ]}
        onRemove={() => {}}
        onClearAll={() => {}}
      />,
    );
    expect(screen.getByText('Clear all')).toBeInTheDocument();
  });

  it('invokes onRemove with the filter key when its X is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(
      <ActiveFilters
        filters={[{ key: 'muscle', label: 'Chest', value: 'chest' }]}
        onRemove={onRemove}
        onClearAll={() => {}}
      />,
    );
    await user.click(screen.getByLabelText('Remove Chest filter'));
    expect(onRemove).toHaveBeenCalledWith('muscle');
  });

  it('invokes onClearAll when "Clear all" is clicked', async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    render(
      <ActiveFilters
        filters={[
          { key: 'muscle', label: 'Chest', value: 'chest' },
          { key: 'equipment', label: 'Barbell', value: 'barbell' },
        ]}
        onRemove={() => {}}
        onClearAll={onClearAll}
      />,
    );
    await user.click(screen.getByText('Clear all'));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
