/**
 * Tests for src/components/admin/Modal.tsx.
 *
 * Verifies open/close gating, ESC handling, body-scroll lock + restore on
 * unmount, click-on-overlay vs click-on-content, and the "Close" button.
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../../src/components/admin/Modal';

void React;

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    const { container } = render(
      <Modal open={false} onClose={() => {}} title="X">
        <p>Hi</p>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders title + children when open', () => {
    render(
      <Modal open={true} onClose={() => {}} title="My Modal">
        <p>Hello body</p>
      </Modal>,
    );
    expect(screen.getByRole('heading', { name: 'My Modal' })).toBeInTheDocument();
    expect(screen.getByText('Hello body')).toBeInTheDocument();
  });

  it('locks body scroll while open and restores on close', () => {
    document.body.style.overflow = 'auto';
    const { rerender } = render(
      <Modal open={true} onClose={() => {}} title="X">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Modal open={false} onClose={() => {}} title="X">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('auto');
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <Modal open={true} onClose={onClose} title="X">
        <p>x</p>
      </Modal>,
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when the inner content is clicked (stopPropagation)', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="X">
        <p data-testid="content">x</p>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when the × button is clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="X">
        <p>x</p>
      </Modal>,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(
      <Modal open={true} onClose={onClose} title="X">
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not bind ESC handler while closed (no spurious calls)', () => {
    const onClose = vi.fn();
    render(
      <Modal open={false} onClose={onClose} title="X">
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('respects the width prop on the inner panel', () => {
    render(
      <Modal open={true} onClose={() => {}} title="X" width={800}>
        <p>x</p>
      </Modal>,
    );
    // The inner panel applies maxWidth via inline style
    const panel = screen.getByText('x').closest('div')!.parentElement!;
    expect(panel.style.maxWidth).toBe('800px');
  });
});
