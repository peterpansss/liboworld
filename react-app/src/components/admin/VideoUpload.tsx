/**
 * Drag-drop video upload widget for the admin Create-Exercise form.
 *
 * The widget itself is presentational — it owns the file-picker state and
 * subscribes to a media_jobs row when its `jobId` prop is set. The parent
 * decides when to upload (after the exercise row is created) and what to
 * do with the final URL.
 */
import { useEffect, useRef, useState } from 'react';
import { colors } from '../../theme';
import {
  subscribeToMediaJob,
  getMediaJob,
  type MediaJobRow,
  type MediaJobStatus as MediaJobStatusType,
} from '../../lib/adminApi';

interface VideoUploadProps {
  /** File the user has chosen but hasn't uploaded yet. Parent stores this. */
  selectedFile: File | null;
  onFileSelected: (file: File | null) => void;
  /** Set by the parent once a media_jobs row is created — triggers status subscription. */
  jobId: number | null;
  /** Existing video URL on the row (edit mode or paste-URL mode). */
  initialUrl?: string | null;
  /** Optional thumbnail URL for the "done" state preview. */
  thumbnailUrl?: string | null;
  label?: string;
  /** Disable the file picker (e.g. during form submit). */
  disabled?: boolean;
}

const containerStyle: React.CSSProperties = {
  border: `1px dashed ${colors.border}`,
  borderRadius: 12,
  padding: 16,
  background: colors.bg2,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.6,
  color: colors.muted,
  textTransform: 'uppercase',
};

const dropZoneStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '20px 12px',
  border: `1px dashed ${colors.border}`,
  borderRadius: 10,
  background: colors.bg,
  cursor: 'pointer',
  textAlign: 'center',
  color: colors.muted,
  fontSize: 13,
  transition: 'background 120ms ease, border-color 120ms ease',
};

const dropZoneActiveStyle: React.CSSProperties = {
  ...dropZoneStyle,
  borderColor: colors.accent,
  background: colors.bg3,
};

const fileInfoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '8px 10px',
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  background: colors.bg,
  fontSize: 13,
};

const statusBoxStyle: React.CSSProperties = {
  fontSize: 12,
  color: colors.muted,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

const errorBoxStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#fca5a5',
  background: 'rgba(220, 38, 38, 0.08)',
  border: '1px solid rgba(220, 38, 38, 0.4)',
  borderRadius: 8,
  padding: '8px 10px',
};

const buttonStyle: React.CSSProperties = {
  background: 'transparent',
  border: `1px solid ${colors.border}`,
  borderRadius: 8,
  padding: '6px 10px',
  fontSize: 12,
  color: colors.text,
  cursor: 'pointer',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function elapsed(startedAt: string | null): string {
  if (!startedAt) return '';
  const ms = Date.now() - new Date(startedAt).getTime();
  return `${Math.max(0, Math.floor(ms / 1000))}s`;
}

export function VideoUpload({
  selectedFile,
  onFileSelected,
  jobId,
  initialUrl,
  thumbnailUrl,
  label = 'Exercise video',
  disabled = false,
}: VideoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [job, setJob] = useState<MediaJobRow | null>(null);
  const [, setTick] = useState(0);

  // Subscribe to job updates whenever jobId is set.
  useEffect(() => {
    if (jobId == null) {
      setJob(null);
      return;
    }
    let cancelled = false;
    void getMediaJob(jobId).then((j) => {
      if (!cancelled && j) setJob(j);
    });
    const unsub = subscribeToMediaJob(jobId, (j) => {
      if (!cancelled) setJob(j);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [jobId]);

  // Tick once a second while processing so the elapsed counter updates.
  useEffect(() => {
    if (job?.status !== 'processing') return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [job?.status]);

  const isUploading = job?.status === 'pending';
  const isProcessing = job?.status === 'processing';
  const isDone = job?.status === 'done';
  const isError = job?.status === 'error';

  function pickFile() {
    if (disabled) return;
    inputRef.current?.click();
  }

  function handleFileChange(ev: React.ChangeEvent<HTMLInputElement>) {
    const f = ev.target.files?.[0] ?? null;
    if (f && f.type !== 'video/mp4' && !f.name.toLowerCase().endsWith('.mp4')) {
      onFileSelected(null);
      // eslint-disable-next-line no-alert
      alert('Please pick an MP4 file.');
      return;
    }
    onFileSelected(f);
    ev.target.value = '';
  }

  function handleDrop(ev: React.DragEvent<HTMLDivElement>) {
    ev.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const f = ev.dataTransfer.files?.[0] ?? null;
    if (f && (f.type === 'video/mp4' || f.name.toLowerCase().endsWith('.mp4'))) {
      onFileSelected(f);
    }
  }

  // ── States ─────────────────────────────────────────────────────────────────
  // 1. Submitted — show job progress.
  if (jobId != null && (isUploading || isProcessing)) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <div style={statusBoxStyle}>
          {isUploading ? 'Queued — waiting for worker' : 'Processing'}
          {' · '}
          {job?.progress_message ?? '…'}
          {' · '}
          {elapsed(job?.started_at ?? job?.created_at ?? null)}
        </div>
      </div>
    );
  }

  if (jobId != null && isDone) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <div style={fileInfoStyle}>
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              style={{ width: 60, height: 45, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <span style={{ fontSize: 18 }}>✅</span>
          )}
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: colors.text, fontWeight: 600 }}>Processed</div>
            <div style={{ color: colors.muted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {job?.output_url ?? ''}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (jobId != null && isError) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <div style={errorBoxStyle}>
          <strong>Processing failed:</strong> {job?.error_message ?? 'unknown error'}
        </div>
        <button type="button" style={buttonStyle} onClick={() => onFileSelected(null)}>
          Choose another file
        </button>
      </div>
    );
  }

  // 2. File picked, awaiting submit.
  if (selectedFile) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <div style={fileInfoStyle}>
          <span style={{ fontSize: 18 }}>🎬</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: colors.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {selectedFile.name}
            </div>
            <div style={{ color: colors.muted, fontSize: 11 }}>
              {formatBytes(selectedFile.size)} · uploads on save
            </div>
          </div>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => onFileSelected(null)}
            disabled={disabled}
          >
            Replace
          </button>
        </div>
      </div>
    );
  }

  // 3. Existing URL on the row (edit mode / paste-URL fallback).
  if (initialUrl) {
    return (
      <div style={containerStyle}>
        <span style={labelStyle}>{label}</span>
        <div style={fileInfoStyle}>
          <span style={{ fontSize: 18 }}>🎬</span>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <div style={{ color: colors.text, fontWeight: 600 }}>Existing video</div>
            <div style={{ color: colors.muted, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {initialUrl}
            </div>
          </div>
          <button type="button" style={buttonStyle} onClick={pickFile} disabled={disabled}>
            Replace
          </button>
        </div>
      </div>
    );
  }

  // 4. Empty / drag-drop.
  return (
    <div style={containerStyle}>
      <span style={labelStyle}>{label}</span>
      <div
        style={dragActive ? dropZoneActiveStyle : dropZoneStyle}
        onClick={pickFile}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
      >
        <div style={{ fontSize: 22, marginBottom: 4 }}>🎬</div>
        <div style={{ color: colors.text, fontWeight: 600 }}>Drag MP4 here, or click to choose</div>
        <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
          Will be processed (4:3 crop, thumbnail, R2 upload) on save.
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,.mp4"
        style={{ display: 'none' }}
        onChange={handleFileChange}
        disabled={disabled}
      />
    </div>
  );
}

// ── Shared status display for any media_jobs row ─────────────────────────────
//
// Compact one-line status for a media_jobs row (queued / processing / done /
// error). Shared by VideoUpload (above) and by other admin UIs that just want
// to surface job progress without owning a file picker.

interface MediaJobStatusProps {
  jobId: number | null;
  /** Called once the job's status flips to 'done' (after polling settles). */
  onDone?: (job: MediaJobRow) => void;
  /** Called when status flips to 'error'. */
  onError?: (job: MediaJobRow) => void;
}

export function MediaJobStatus({ jobId, onDone, onError }: MediaJobStatusProps) {
  const [job, setJob] = useState<MediaJobRow | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (jobId == null) {
      setJob(null);
      return;
    }
    let cancelled = false;
    void getMediaJob(jobId).then((j) => {
      if (!cancelled && j) setJob(j);
    });
    const unsub = subscribeToMediaJob(jobId, (j) => {
      if (cancelled) return;
      setJob(j);
    });
    return () => {
      cancelled = true;
      unsub();
    };
  }, [jobId]);

  // Tick once a second while processing so the elapsed counter updates.
  useEffect(() => {
    if (job?.status !== 'processing') return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [job?.status]);

  // Fire one-shot callbacks on terminal transitions.
  const status: MediaJobStatusType | null = job?.status ?? null;
  useEffect(() => {
    if (!job) return;
    if (status === 'done') onDone?.(job);
    else if (status === 'error') onError?.(job);
    // We intentionally only fire when status changes; job ref churns on
    // every realtime update so we depend only on the terminal flag.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, jobId]);

  if (jobId == null || !job) return null;

  if (status === 'pending') {
    return (
      <div style={statusBoxStyle}>
        Queued — waiting for worker · {elapsed(job.created_at)}
      </div>
    );
  }
  if (status === 'processing') {
    return (
      <div style={statusBoxStyle}>
        Processing · {job.progress_message ?? '…'} · {elapsed(job.started_at ?? job.created_at)}
      </div>
    );
  }
  if (status === 'done') {
    return (
      <div style={{ ...statusBoxStyle, color: colors.text }}>
        Done — {job.progress_message ?? 'ready'}
      </div>
    );
  }
  return (
    <div style={errorBoxStyle}>
      <strong>Failed:</strong> {job.error_message ?? 'unknown error'}
    </div>
  );
}
