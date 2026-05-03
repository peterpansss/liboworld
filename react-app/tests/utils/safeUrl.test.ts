import { describe, expect, it } from 'vitest';
import { safeUrl } from '../../src/utils/safeUrl';

describe('safeUrl', () => {
  describe('rejects unsafe inputs', () => {
    it('rejects javascript: URLs', () => {
      expect(safeUrl('javascript:alert(1)')).toBeNull();
      expect(safeUrl('JAVASCRIPT:alert(1)')).toBeNull();
      expect(safeUrl('  javascript:alert(1)  ')).toBeNull();
    });

    it('rejects data: URLs (would let an attacker exfil DOM via images)', () => {
      expect(safeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
      expect(safeUrl('data:image/svg+xml;base64,PHN2Zz4=')).toBeNull();
    });

    it('rejects vbscript: URLs', () => {
      expect(safeUrl('vbscript:msgbox(1)')).toBeNull();
    });

    it('rejects file: URLs', () => {
      expect(safeUrl('file:///etc/passwd')).toBeNull();
    });

    it('rejects null / undefined / empty / whitespace', () => {
      expect(safeUrl(null)).toBeNull();
      expect(safeUrl(undefined)).toBeNull();
      expect(safeUrl('')).toBeNull();
      expect(safeUrl('   ')).toBeNull();
    });

    it('rejects non-URL garbage', () => {
      expect(safeUrl('not a url')).toBeNull();
      expect(safeUrl('//no-protocol.example.com')).toBeNull();
      expect(safeUrl('<script>alert(1)</script>')).toBeNull();
    });
  });

  describe('accepts safe inputs', () => {
    it('accepts http URLs', () => {
      expect(safeUrl('http://example.com')).toBe('http://example.com/');
    });

    it('accepts https URLs', () => {
      expect(safeUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
    });

    it('accepts mailto URLs', () => {
      expect(safeUrl('mailto:foo@example.com')).toBe('mailto:foo@example.com');
    });

    it('trims whitespace before parsing', () => {
      expect(safeUrl('  https://example.com  ')).toBe('https://example.com/');
    });

    it('preserves the full URL through normalisation', () => {
      const url = 'https://supabase.co/storage/v1/object/public/exercise-thumbs/abc.jpg';
      expect(safeUrl(url)).toBe(url);
    });
  });
});
