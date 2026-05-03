import { describe, expect, it } from 'vitest';
import {
  sanitizeFullName,
  sanitizePhone,
  sanitizeLongText,
  sanitizeUtm,
} from '../../src/lib/funnelSignups';

describe('funnelSignups sanitisers', () => {
  describe('sanitizeFullName', () => {
    it('returns null for null/undefined/empty', () => {
      expect(sanitizeFullName(null)).toBeNull();
      expect(sanitizeFullName(undefined)).toBeNull();
      expect(sanitizeFullName('')).toBeNull();
      expect(sanitizeFullName('   ')).toBeNull();
    });

    it('trims surrounding whitespace', () => {
      expect(sanitizeFullName('  Jane Doe  ')).toBe('Jane Doe');
    });

    it('strips ASCII control characters (XSS smuggling vectors)', () => {
      // Embedded NUL + bell + DEL.
      expect(sanitizeFullName('Jane\x00\x07\x7FDoe')).toBe('JaneDoe');
    });

    it('clamps to default 80 chars', () => {
      const long = 'a'.repeat(200);
      expect(sanitizeFullName(long)?.length).toBe(80);
    });

    it('does NOT html-escape — JSX handles that on render', () => {
      // We want literal '<' to stay literal so React auto-escapes it once.
      expect(sanitizeFullName('<script>alert(1)</script>')).toBe('<script>alert(1)</script>');
    });
  });

  describe('sanitizePhone', () => {
    it('keeps allowed characters: +, digits, dashes, spaces, parens', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+1 (555) 123-4567');
    });

    it('strips letters and punctuation, keeps allowed dash', () => {
      // `<`, `>`, letters dropped; the dash is in the allowlist so it stays.
      expect(sanitizePhone('+1<script>555-1234</script>')).toBe('+1555-1234');
    });

    it('drops everything when input is pure letters', () => {
      // No digits, parens, +, -, or whitespace remain.
      expect(sanitizePhone('alertxss')).toBeNull();
    });

    it('returns null when nothing usable remains', () => {
      expect(sanitizePhone('<script>')).toBeNull();
      expect(sanitizePhone(null)).toBeNull();
    });

    it('clamps to default 30 chars before filtering', () => {
      // 30 characters of digits is allowed, anything beyond is dropped.
      expect(sanitizePhone('1'.repeat(50))?.length).toBe(30);
    });
  });

  describe('sanitizeLongText (referrer / user_agent)', () => {
    it('strips control chars but preserves URL-ish content', () => {
      expect(sanitizeLongText('https://evil.com\x00/path')).toBe('https://evil.com/path');
    });

    it('clamps to 2000 chars', () => {
      expect(sanitizeLongText('a'.repeat(5000))?.length).toBe(2000);
    });

    it('returns null for empty after trim', () => {
      expect(sanitizeLongText('   ')).toBeNull();
    });

    it('does NOT validate URL shape — that is for safeUrl at render time', () => {
      // The point of the write-side sanitiser is length + control chars,
      // not URL safety. Any future read-path that wants a clickable link
      // must run safeUrl().
      expect(sanitizeLongText('javascript:alert(1)')).toBe('javascript:alert(1)');
    });
  });

  describe('sanitizeUtm', () => {
    it('keeps alphanumeric, dot, dash, underscore', () => {
      expect(sanitizeUtm('summer_2025.v2-final')).toBe('summer_2025.v2-final');
    });

    it('strips everything else (no spaces, no slashes, no <>)', () => {
      expect(sanitizeUtm('utm/value with <script>')).toBe('utmvaluewithscript');
    });

    it('clamps to 200 chars', () => {
      expect(sanitizeUtm('a'.repeat(500))?.length).toBe(200);
    });

    it('returns null for null and empty-after-strip', () => {
      expect(sanitizeUtm(null)).toBeNull();
      expect(sanitizeUtm('   ')).toBeNull();
      expect(sanitizeUtm('!!!@@@')).toBeNull();
    });
  });
});
