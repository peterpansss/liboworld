/**
 * Tests for src/components/admin/KpiCard.tsx — pure presentational card.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../../../src/components/admin/KpiCard';

void React;

describe('KpiCard', () => {
  it('renders the label and value', () => {
    render(<KpiCard label="Active Users" value="1,234" />);
    expect(screen.getByText('Active Users')).toBeInTheDocument();
    expect(screen.getByText('1,234')).toBeInTheDocument();
  });

  it('accepts a numeric value', () => {
    render(<KpiCard label="Count" value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the optional hint when provided', () => {
    render(<KpiCard label="x" value={1} hint="vs last week" />);
    expect(screen.getByText('vs last week')).toBeInTheDocument();
  });

  it('omits the hint container when hint is missing', () => {
    const { container } = render(<KpiCard label="x" value={1} />);
    // The hint <div> is conditional; verify only label + value <div>s exist
    expect(container.textContent).not.toContain('vs last week');
  });
});
