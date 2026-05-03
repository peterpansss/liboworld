/**
 * Coverage for src/lib/uploadValidation.ts.
 *
 * Each branch in validateUpload is exercised. assertValidUpload throws.
 */
import { describe, expect, it } from 'vitest';
import {
  validateUpload,
  assertValidUpload,
  safeExtensionForMime,
  IMAGE_MIME_TYPES,
  VIDEO_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_FILENAME_LEN,
} from '../../src/lib/uploadValidation';

const IMAGE_OPTS = { kind: 'image' as const, maxBytes: MAX_IMAGE_BYTES };
const VIDEO_OPTS = { kind: 'video' as const, maxBytes: MAX_VIDEO_BYTES };

function makeFile(name: string, bytes: number, type: string): File {
  // jsdom File honours size from the underlying blob's byteLength.
  const data = bytes > 0 ? new Uint8Array(bytes) : new Uint8Array(0);
  return new File([data], name, { type });
}

describe('validateUpload — basic file checks', () => {
  it('rejects null/undefined files', () => {
    expect(validateUpload(undefined as any, IMAGE_OPTS)).toEqual({ ok: false, error: 'No file selected.' });
  });

  it('rejects empty files', () => {
    const f = makeFile('a.jpg', 0, 'image/jpeg');
    expect(validateUpload(f, IMAGE_OPTS)).toEqual({ ok: false, error: 'File is empty (0 bytes).' });
  });

  it('rejects oversize files with size details', () => {
    const f = makeFile('a.jpg', MAX_IMAGE_BYTES + 1, 'image/jpeg');
    const r = validateUpload(f, IMAGE_OPTS);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/MB/);
      expect(r.error).toMatch(/limit/);
    }
  });

  it('accepts files at exactly the limit', () => {
    const f = makeFile('a.jpg', MAX_IMAGE_BYTES, 'image/jpeg');
    expect(validateUpload(f, IMAGE_OPTS)).toEqual({ ok: true });
  });
});

describe('validateUpload — filename rules', () => {
  it('rejects empty filename', () => {
    const f = makeFile('', 100, 'image/jpeg');
    expect(validateUpload(f, IMAGE_OPTS)).toEqual({ ok: false, error: 'File has no name.' });
  });

  it('rejects names longer than MAX_FILENAME_LEN', () => {
    const f = makeFile('a'.repeat(MAX_FILENAME_LEN + 1) + '.jpg', 100, 'image/jpeg');
    const r = validateUpload(f, IMAGE_OPTS);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/too long/);
  });

  it('rejects path traversal characters', () => {
    expect(validateUpload(makeFile('../evil.jpg', 100, 'image/jpeg'), IMAGE_OPTS).ok).toBe(false);
    expect(validateUpload(makeFile('subdir/x.jpg', 100, 'image/jpeg'), IMAGE_OPTS).ok).toBe(false);
    expect(validateUpload(makeFile('..\\evil.jpg', 100, 'image/jpeg'), IMAGE_OPTS).ok).toBe(false);
  });

  it('rejects control characters', () => {
    const f = makeFile('bad\x00name.jpg', 100, 'image/jpeg');
    expect(validateUpload(f, IMAGE_OPTS).ok).toBe(false);
  });
});

describe('validateUpload — MIME type rules', () => {
  it('rejects empty MIME type', () => {
    const f = makeFile('a.jpg', 100, '');
    expect(validateUpload(f, IMAGE_OPTS)).toEqual({ ok: false, error: 'Could not determine file type.' });
  });

  it('rejects MIME types not in the allow-list', () => {
    const f = makeFile('a.gif', 100, 'image/gif');
    expect(validateUpload(f, IMAGE_OPTS).ok).toBe(false);
  });

  it('accepts every IMAGE_MIME_TYPES entry for kind=image', () => {
    for (const mime of IMAGE_MIME_TYPES) {
      const f = makeFile('a.x', 100, mime);
      expect(validateUpload(f, IMAGE_OPTS)).toEqual({ ok: true });
    }
  });

  it('accepts every VIDEO_MIME_TYPES entry for kind=video', () => {
    for (const mime of VIDEO_MIME_TYPES) {
      const f = makeFile('a.x', 100, mime);
      expect(validateUpload(f, VIDEO_OPTS)).toEqual({ ok: true });
    }
  });

  it('case-insensitive MIME matching', () => {
    const f = makeFile('a.jpg', 100, 'IMAGE/JPEG');
    expect(validateUpload(f, IMAGE_OPTS).ok).toBe(true);
  });
});

describe('assertValidUpload', () => {
  it('throws on invalid', () => {
    const f = makeFile('a', 0, 'image/jpeg');
    expect(() => assertValidUpload(f, IMAGE_OPTS)).toThrow(/empty/);
  });

  it('does not throw on valid', () => {
    const f = makeFile('a.jpg', 100, 'image/jpeg');
    expect(() => assertValidUpload(f, IMAGE_OPTS)).not.toThrow();
  });
});

describe('safeExtensionForMime', () => {
  it('returns canonical extensions for known MIME types', () => {
    expect(safeExtensionForMime('image/jpeg', 'fallback')).toBe('jpg');
    expect(safeExtensionForMime('image/png', 'fallback')).toBe('png');
    expect(safeExtensionForMime('image/webp', 'fallback')).toBe('webp');
    expect(safeExtensionForMime('video/mp4', 'fallback')).toBe('mp4');
    expect(safeExtensionForMime('video/quicktime', 'fallback')).toBe('mov');
    expect(safeExtensionForMime('video/webm', 'fallback')).toBe('webm');
  });

  it('case-insensitive lookup', () => {
    expect(safeExtensionForMime('IMAGE/JPEG', 'fallback')).toBe('jpg');
  });

  it('returns fallback for unknown MIME types', () => {
    expect(safeExtensionForMime('application/zip', 'bin')).toBe('bin');
  });
});
