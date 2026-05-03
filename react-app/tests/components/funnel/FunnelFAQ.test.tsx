/**
 * Tests for src/components/funnel/FunnelFAQ.tsx.
 *
 * Accordion list. First item is open by default. Clicking the trigger
 * toggles its disclosure; clicking another opens it and closes the
 * previous.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FunnelFAQ from '../../../src/components/funnel/FunnelFAQ';

void React;

const items = [
  { q: 'How does it work?', a: 'It just does.' },
  { q: 'Is it free?', a: 'Yes, mostly.' },
  { q: 'Can I cancel?', a: 'Anytime.' },
];

describe('FunnelFAQ', () => {
  it('renders one button per item with q as the label', () => {
    render(<FunnelFAQ items={items} />);
    items.forEach((it) => {
      expect(screen.getByRole('button', { name: it.q })).toBeInTheDocument();
    });
  });

  it('opens the first item by default', () => {
    render(<FunnelFAQ items={items} />);
    expect(screen.getByText('It just does.')).toBeInTheDocument();
    const first = screen.getByRole('button', { name: 'How does it work?' });
    expect(first).toHaveAttribute('aria-expanded', 'true');
  });

  it('closes the open item when clicked again', async () => {
    const user = userEvent.setup();
    render(<FunnelFAQ items={items} />);
    const first = screen.getByRole('button', { name: 'How does it work?' });
    await user.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('It just does.')).not.toBeInTheDocument();
  });

  it('opening a different item closes the previously open one', async () => {
    const user = userEvent.setup();
    render(<FunnelFAQ items={items} />);
    const second = screen.getByRole('button', { name: 'Is it free?' });
    await user.click(second);
    expect(second).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Yes, mostly.')).toBeInTheDocument();
    // First should be closed now (only one open at a time)
    const first = screen.getByRole('button', { name: 'How does it work?' });
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });

  it('renders an empty container when items is empty (no crash)', () => {
    const { container } = render(<FunnelFAQ items={[]} />);
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
