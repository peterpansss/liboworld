/**
 * Tests for src/components/funnel/StoreRedirectOverlay.tsx.
 *
 * Covers: open=false short-circuit, dialog labelling, QR src construction
 * (with + without tier slug), close button, ESC handling, body scroll
 * lock + restore, click-on-overlay-vs-modal, and external store badges
 * with rel="noopener noreferrer".
 */
/// <reference types="@testing-library/jest-dom" />
import * as React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import StoreRedirectOverlay from '../../../src/components/funnel/StoreRedirectOverlay';

void React;

const baseCopy = {
  title: 'Get the Libo app',
  subtitle: 'Scan to install on your phone.',
  qrAlt: 'QR to install',
  appStoreSmall: 'Download on the',
  googlePlaySmall: 'Get it on',
  closeLabel: 'Close',
};

beforeEach(() => {
  document.body.style.overflow = '';
});

describe('StoreRedirectOverlay', () => {
  it('renders nothing when closed', () => {
    const { container } = render(
      <StoreRedirectOverlay open={false} tierSlug={null} copy={baseCopy} onClose={() => {}} />,
    );
    expect(container.firstChild).toBeNull();
    // Body scroll left untouched (or restored)
    expect(document.body.style.overflow).toBe('');
  });

  it('renders a labelled modal dialog when open', () => {
    render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={() => {}} />,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'store-overlay-title');
    expect(screen.getByText('Get the Libo app')).toBeInTheDocument();
    expect(screen.getByText('Scan to install on your phone.')).toBeInTheDocument();
  });

  it('locks body scroll while open and restores on close', () => {
    const { rerender } = render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={() => {}} />,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <StoreRedirectOverlay open={false} tierSlug={null} copy={baseCopy} onClose={() => {}} />,
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('builds a QR src that points to /get-app', () => {
    render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={() => {}} />,
    );
    const qr = screen.getByAltText('QR to install') as HTMLImageElement;
    expect(qr.src).toContain('api.qrserver.com');
    expect(decodeURIComponent(qr.src)).toContain('https://liboworld.com/get-app');
  });

  it('appends the tier slug to the QR query string when provided', () => {
    render(
      <StoreRedirectOverlay open={true} tierSlug="bronze" copy={baseCopy} onClose={() => {}} />,
    );
    const qr = screen.getByAltText('QR to install') as HTMLImageElement;
    expect(decodeURIComponent(qr.src)).toContain('https://liboworld.com/get-app?tier=bronze');
  });

  it('calls onClose when × is clicked', () => {
    const onClose = vi.fn();
    render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={onClose} />,
    );
    fireEvent.click(screen.getByLabelText('Close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={onClose} />,
    );
    fireEvent.click(container.firstChild as HTMLElement);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not call onClose when modal panel is clicked', () => {
    const onClose = vi.fn();
    render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={onClose} />,
    );
    // Click on the title (inside the panel)
    fireEvent.click(screen.getByText('Get the Libo app'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape', () => {
    const onClose = vi.fn();
    render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not bind ESC handler when closed', () => {
    const onClose = vi.fn();
    render(
      <StoreRedirectOverlay open={false} tierSlug={null} copy={baseCopy} onClose={onClose} />,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders both store badges as external links with safe rel attrs', () => {
    render(
      <StoreRedirectOverlay open={true} tierSlug={null} copy={baseCopy} onClose={() => {}} />,
    );
    const ios = screen.getByLabelText('Download on the App Store');
    const android = screen.getByLabelText('Get it on Google Play');
    [ios, android].forEach((el) => {
      expect(el.getAttribute('target')).toBe('_blank');
      expect(el.getAttribute('rel')).toContain('noopener');
      expect(el.getAttribute('rel')).toContain('noreferrer');
    });
  });
});
