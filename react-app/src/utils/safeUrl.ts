/**
 * URL safety helper.
 *
 * Untrusted URLs (admin-supplied thumbnails, funnel referrer values, etc.)
 * must never be rendered into `<a href>`/`<img src>` without protocol
 * validation: a payload like `javascript:alert(1)` would otherwise execute
 * when an admin clicks the link or renders the image error handler.
 *
 * Rules:
 *  - Only `http:`, `https:`, and `mailto:` are allowed.
 *  - Anything else (including `javascript:`, `data:`, `vbscript:`, `file:`)
 *    or anything that fails URL parsing returns null.
 *  - Trailing/leading whitespace is tolerated; empty/null/undefined return
 *    null.
 *
 * Callers should render the URL as plain text when this helper returns
 * null, never as a clickable resource.
 */
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

export function safeUrl(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = String(input).trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (!ALLOWED_PROTOCOLS.has(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}
