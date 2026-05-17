/**
 * Unit tests for client-side upload validation.
 *
 * Validates the helper that admin upload functions in `lib/adminApi.ts`
 * delegate to before sending bytes to Supabase Storage.
 */
import { describe, it, expect } from 'vitest';
import {
  validateUpload,
  assertValidUpload,
  safeExtensionForMime,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_FILENAME_LEN,
} from '../src/lib/uploadValidation';

/** Build a File with a chosen size without allocating that many bytes. */
function makeFile(opts: {
  name?: string;
  type?: string;
  size?: number;
}): File {
  const f = new File([new Uint8Array(8)], opts.name ?? 'file.png', {
    type: opts.type ?? 'image/png',
  });
  if (opts.size !== undefined) {
    Object.defineProperty(f, 'size', { value: opts.size });
  }
  return f;
}

describe('validateUpload — images', () => {
  it('accepts a valid jpeg under the size limit', () => {
    const file = makeFile({ name: 'cat.jpg', type: 'image/jpeg', size: 1024 });
    expect(validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES })).toEqual({
      ok: true,
    });
  });

  it('accepts png and webp', () => {
    for (const type of IMAGE_MIME_TYPES) {
      const file = makeFile({ type, size: 1024 });
      expect(validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES }).ok).toBe(
        true,
      );
    }
  });

  it('rejects videos when the kind is image', () => {
    const file = makeFile({ name: 'a.mp4', type: 'video/mp4', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/not allowed/);
  });

  it('rejects gif (not in the allowlist)', () => {
    const file = makeFile({ name: 'a.gif', type: 'image/gif', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
  });

  it('rejects empty (0-byte) files', () => {
    const file = makeFile({ size: 0 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty/i);
  });

  it('rejects files larger than maxBytes', () => {
    const file = makeFile({ size: MAX_IMAGE_BYTES + 1 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/exceeds/i);
  });

  it('rejects empty filename', () => {
    const file = makeFile({ name: '', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
  });

  it('rejects filename longer than MAX_FILENAME_LEN', () => {
    const file = makeFile({ name: 'a'.repeat(MAX_FILENAME_LEN + 1) + '.png', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/i);
  });

  it('rejects filenames with forward slashes', () => {
    const file = makeFile({ name: '../etc/passwd.png', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
  });

  it('rejects filenames with backslashes', () => {
    const file = makeFile({ name: '..\\..\\evil.png', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
  });

  it('rejects filenames with control bytes', () => {
    const file = makeFile({ name: 'evil\x00name.png', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
  });

  it('rejects empty MIME type', () => {
    const file = makeFile({ type: '', size: 1024 });
    const r = validateUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/file type/i);
  });
});

describe('validateUpload — videos', () => {
  it('accepts mp4, quicktime, webm', () => {
    for (const type of VIDEO_MIME_TYPES) {
      const file = makeFile({ name: 'clip.mp4', type, size: 1024 });
      expect(validateUpload(file, { kind: 'video', maxBytes: MAX_VIDEO_BYTES }).ok).toBe(
        true,
      );
    }
  });

  it('rejects an oversized video', () => {
    const file = makeFile({ type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 });
    const r = validateUpload(file, { kind: 'video', maxBytes: MAX_VIDEO_BYTES });
    expect(r.ok).toBe(false);
  });

  it('rejects images when the kind is video', () => {
    const file = makeFile({ type: 'image/png', size: 1024 });
    const r = validateUpload(file, { kind: 'video', maxBytes: MAX_VIDEO_BYTES });
    expect(r.ok).toBe(false);
  });
});

describe('assertValidUpload', () => {
  it('returns void on success', () => {
    const file = makeFile({ name: 'ok.png', type: 'image/png', size: 1024 });
    expect(() =>
      assertValidUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES }),
    ).not.toThrow();
  });

  it('throws an Error on failure', () => {
    const file = makeFile({ size: 0 });
    expect(() =>
      assertValidUpload(file, { kind: 'image', maxBytes: MAX_IMAGE_BYTES }),
    ).toThrow(/empty/i);
  });
});

describe('safeExtensionForMime', () => {
  it('maps known MIME types to canonical extensions', () => {
    expect(safeExtensionForMime('image/jpeg', 'x')).toBe('jpg');
    expect(safeExtensionForMime('image/png', 'x')).toBe('png');
    expect(safeExtensionForMime('image/webp', 'x')).toBe('webp');
    expect(safeExtensionForMime('video/mp4', 'x')).toBe('mp4');
    expect(safeExtensionForMime('video/quicktime', 'x')).toBe('mov');
    expect(safeExtensionForMime('video/webm', 'x')).toBe('webm');
  });

  it('is case-insensitive on the MIME', () => {
    expect(safeExtensionForMime('Image/JPEG', 'x')).toBe('jpg');
  });

  it('returns the fallback for unknown types', () => {
    expect(safeExtensionForMime('application/octet-stream', 'bin')).toBe('bin');
    expect(safeExtensionForMime('', 'fb')).toBe('fb');
  });
});
