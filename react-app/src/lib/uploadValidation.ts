/**
 * Client-side upload validation for admin uploads.
 *
 * Mirrors the bucket-level constraints applied in
 * `libo-app-v2/supabase-migration-storage-policies.sql` so the user gets a
 * meaningful error before bytes go on the wire. The bucket itself is the
 * authoritative gate: never rely on these checks alone.
 *
 * Allowed sets are intentionally narrow - adding a new MIME type means
 * updating both this module and the SQL migration.
 */

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const VIDEO_MIME_TYPES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;          // 5 MB
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;        // 100 MB
export const MAX_FILENAME_LEN = 200;

export type ValidateUploadKind = 'image' | 'video';

export type ValidateUploadOptions = {
  kind: ValidateUploadKind;
  maxBytes: number;
};

export type ValidateUploadResult =
  | { ok: true }
  | { ok: false; error: string };

const CONTROL_CHAR_REGEX = /[\x00-\x1f\x7f]/;

/**
 * Validates a File object before it is handed to supabase storage.
 *
 * Rejects: empty files, oversize, unknown MIME types, very long filenames,
 * filenames with path-traversal characters or control bytes.
 */
export function validateUpload(
  file: File,
  options: ValidateUploadOptions,
): ValidateUploadResult {
  if (!file || typeof file.size !== 'number') {
    return { ok: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { ok: false, error: 'File is empty (0 bytes).' };
  }

  if (file.size > options.maxBytes) {
    const maxMb = Math.round(options.maxBytes / (1024 * 1024));
    const actualMb = Math.round((file.size / (1024 * 1024)) * 10) / 10;
    return {
      ok: false,
      error: `File is ${actualMb} MB which exceeds the ${maxMb} MB limit.`,
    };
  }

  const name = file.name ?? '';
  if (name.length === 0) {
    return { ok: false, error: 'File has no name.' };
  }
  if (name.length > MAX_FILENAME_LEN) {
    return {
      ok: false,
      error: `File name is too long (max ${MAX_FILENAME_LEN} characters).`,
    };
  }
  if (
    CONTROL_CHAR_REGEX.test(name) ||
    name.includes('/') ||
    name.includes('\\')
  ) {
    return { ok: false, error: 'File name contains invalid characters.' };
  }

  const allowed =
    options.kind === 'image' ? IMAGE_MIME_TYPES : VIDEO_MIME_TYPES;
  const type = (file.type ?? '').toLowerCase();
  if (!type) {
    return { ok: false, error: 'Could not determine file type.' };
  }
  if (!allowed.includes(type as (typeof allowed)[number])) {
    return {
      ok: false,
      error: `Type ${type} is not allowed. Use one of: ${allowed.join(', ')}.`,
    };
  }

  return { ok: true };
}

/**
 * Convenience helper that throws on failure so callers can keep their
 * existing try/catch style.
 */
export function assertValidUpload(
  file: File,
  options: ValidateUploadOptions,
): void {
  const result = validateUpload(file, options);
  if (!result.ok) {
    throw new Error(result.error);
  }
}

/**
 * Picks a safe filename extension based on the validated MIME type rather
 * than trusting the client-supplied filename. Returns a default if the
 * MIME isn't in a known map (callers should validate first).
 */
export function safeExtensionForMime(mime: string, fallback: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
  };
  return map[mime.toLowerCase()] ?? fallback;
}
