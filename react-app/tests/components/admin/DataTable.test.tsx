/**
 * Tests for src/components/admin/DataTable.tsx.
 *
 * Covers: render columns + rows, custom render fn, empty-state, sortable
 * vs non-sortable headers (cursor + click toggle), sort direction cycling
 * (desc → asc on second click), no-op on non-sortable columns, row-click
 * callback wiring.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DataTable, type Column } from '../../../src/components/admin/DataTable';

void React;

type Row = { id: string; name: string; n: number };

const rows: Row[] = [
  { id: '1', name: 'Alpha', n: 5 },
  { id: '2', name: 'Bravo', n: 3 },
  { id: '3', name: 'Charlie', n: 8 },
];

const columns: Column<Row>[] = [
  { key: 'name', header: 'Name', render: (r) => r.name, sort: (a, b) => a.name.localeCompare(b.name) },
  { key: 'n', header: 'Count', render: (r) => r.n, align: 'right' },
];

function getNameCells() {
  return screen
    .getAllByRole('cell')
    .filter((c) => c.parentElement?.parentElement?.tagName === 'TBODY')
    .map((c) => c.textContent)
    .filter((t) => /Alpha|Bravo|Charlie/.test(t ?? ''));
}

describe('DataTable', () => {
  it('renders one row per data entry', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('renders the empty-label row when there are no rows', () => {
    render(
      <DataTable rows={[]} columns={columns} rowKey={(r) => r.id} emptyLabel="Nothing yet" />,
    );
    expect(screen.getByText('Nothing yet')).toBeInTheDocument();
  });

  it('falls back to "No data" when emptyLabel is omitted', () => {
    render(<DataTable rows={[]} columns={columns} rowKey={(r) => r.id} />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('marks sortable headers with a pointer cursor and non-sortable as default', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    const nameHeader = screen.getByText('Name').closest('th') as HTMLElement;
    const countHeader = screen.getByText('Count').closest('th') as HTMLElement;
    expect(nameHeader.style.cursor).toBe('pointer');
    expect(countHeader.style.cursor).toBe('default');
  });

  it('clicking a sortable header sorts desc, then second click flips to asc', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    const nameHeader = screen.getByText('Name').closest('th') as HTMLElement;

    // Initial unsorted order matches input
    expect(getNameCells()).toEqual(['Alpha', 'Bravo', 'Charlie']);

    fireEvent.click(nameHeader);
    // First click: desc → reverse alpha sort
    expect(getNameCells()).toEqual(['Charlie', 'Bravo', 'Alpha']);

    fireEvent.click(nameHeader);
    // Second click: asc
    expect(getNameCells()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('clicking a non-sortable header is a no-op', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    const countHeader = screen.getByText('Count').closest('th') as HTMLElement;
    fireEvent.click(countHeader);
    // Order unchanged
    expect(getNameCells()).toEqual(['Alpha', 'Bravo', 'Charlie']);
  });

  it('shows the sort indicator on the active column', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    const nameHeader = screen.getByText('Name').closest('th') as HTMLElement;
    fireEvent.click(nameHeader);
    expect(nameHeader.textContent).toContain('↓'); // desc
    fireEvent.click(nameHeader);
    expect(nameHeader.textContent).toContain('↑'); // asc
  });

  it('invokes onRowClick when a row is clicked', () => {
    const onRowClick = vi.fn();
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('Bravo'));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('does not crash when onRowClick is omitted (rows still clickable)', () => {
    render(<DataTable rows={rows} columns={columns} rowKey={(r) => r.id} />);
    expect(() => fireEvent.click(screen.getByText('Alpha'))).not.toThrow();
  });

  it('uses the custom render fn for cells', () => {
    const cols: Column<Row>[] = [
      { key: 'badge', header: 'Badge', render: (r) => <span data-testid={`b-${r.id}`}>★</span> },
    ];
    render(<DataTable rows={rows} columns={cols} rowKey={(r) => r.id} />);
    expect(screen.getByTestId('b-1')).toHaveTextContent('★');
  });
});
