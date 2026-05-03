/**
 * Render-side guarantees: rendering an `<a href={safeUrl(payload)}>` or
 * `<img src={safeUrl(payload)}>` with an XSS payload must produce a tag
 * with no `href`/`src` attribute (because safeUrl returns null), so the
 * payload string never reaches the live DOM as a URL.
 *
 * This is the unit test that pins down the rendering contract.
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { safeUrl } from '../../src/utils/safeUrl';

function HrefAnchor({ href }: { href: string }) {
  const safe = safeUrl(href);
  return safe ? <a href={safe}>link</a> : <span>link</span>;
}

function ImageThumb({ src }: { src: string }) {
  const safe = safeUrl(src);
  return safe ? <img src={safe} alt="" /> : <div>fallback</div>;
}

describe('safeUrl render contract', () => {
  it('blocks javascript: URL on an anchor', () => {
    const { container } = render(<HrefAnchor href="javascript:alert('xss')" />);
    // No <a> should be emitted because safeUrl returned null.
    expect(container.querySelector('a')).toBeNull();
    expect(container.querySelector('span')).not.toBeNull();
    // The literal payload, if it appears at all (as text), is escaped by JSX.
    expect(container.innerHTML).not.toContain("javascript:alert");
  });

  it('blocks data: URL on an image', () => {
    const { container } = render(
      <ImageThumb src="data:text/html,<script>alert(1)</script>" />,
    );
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('div')).not.toBeNull();
    // The script tag must NOT have made it into the live DOM.
    expect(container.querySelector('script')).toBeNull();
  });

  it('passes through legitimate https URLs', () => {
    const url = 'https://supabase.co/storage/v1/object/public/x.jpg';
    const { container } = render(<ImageThumb src={url} />);
    const img = container.querySelector('img');
    expect(img).not.toBeNull();
    expect(img?.getAttribute('src')).toBe(url);
  });

  it('JSX auto-escapes XSS payloads in text children', () => {
    // This test documents the baseline: if an admin field with an XSS
    // payload is rendered as text (which is what we recommend when
    // safeUrl returns null), React escapes it. Our rendered output
    // must NOT contain a live <script> element.
    const payload = "<script>alert('xss')</script>";
    const { container } = render(<span>{payload}</span>);
    expect(container.querySelector('script')).toBeNull();
    // The text content equals the literal payload string — meaning React
    // escaped it on the way into innerHTML.
    expect(container.textContent).toBe(payload);
    expect(container.innerHTML).toContain('&lt;script&gt;');
    expect(container.innerHTML).not.toContain('<script>');
  });
});
