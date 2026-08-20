// Public Programs listing — multi-day plans served from Supabase.
//
// Phase 4 entry point. Visual style mirrors ProgramLibrary.tsx (which lives at
// /workouts) so the marketing site has one consistent library aesthetic.
//
// Design choice: per-day breakdown is shown in an in-page modal rather than a
// dedicated /programs/:slug route. Simpler for now — programs don't have rich
// content like exercises do (no demo videos, no metadata pages), and the modal
// keeps the SEO surface small until we know what programs actually need.
// When that changes, lift the modal body into a Programs/[slug].tsx page and
// add the route. The hook output is already keyed by id+slug for that.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePrograms, type ProgramDisplay, type ProgramDayBlock } from '../hooks/usePrograms';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { EmojiIcon } from '../components/EmojiIcon';
import { Hourglass, Frown } from '../utils/icons';
import './ExerciseLibrary.css';
import './ProgramLibrary.css';

function diffClass(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'advanced';
  if (d.startsWith('int')) return 'intermediate';
  return 'beginner';
}

function diffLabel(diff: string): string {
  const d = (diff || 'beginner').toLowerCase();
  if (d.startsWith('adv')) return 'Advanced';
  if (d.startsWith('int')) return 'Intermediate';
  return 'Beginner';
}

function dayLabel(b: ProgramDayBlock): string {
  if (b.rest) return 'Rest';
  if (b.workoutId) return b.workoutId.replace(/^wk_/, '').replace(/_/g, ' ');
  if (b.warmup || b.main || b.cooldown) {
    const counts = [
      b.warmup?.length ? `${b.warmup.length} warmup` : null,
      b.main?.length ? `${b.main.length} main` : null,
      b.cooldown?.length ? `${b.cooldown.length} cooldown` : null,
    ].filter(Boolean);
    return counts.length ? counts.join(' · ') : 'Workout';
  }
  return 'Workout';
}

export default function Programs() {
  const { t } = useTranslation();
  const { programs, loading, error } = usePrograms();
  const [activeProgram, setActiveProgram] = useState<ProgramDisplay | null>(null);

  // Sort: shortest first, then alphabetical. The Supabase query orders by
  // `days` already, but if multiple programs share a day count this gives
  // a stable visual order.
  const sorted = useMemo(
    () =>
      [...programs].sort((a, b) => {
        if (a.days !== b.days) return a.days - b.days;
        return a.name.localeCompare(b.name);
      }),
    [programs]
  );

  useEffect(() => {
    document.title = `Programs | Libo`;
    return () => {
      document.title = 'Libo';
    };
  }, []);

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (!activeProgram) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [activeProgram]);

  return (
    <>
      <SiteNav />

      <main className="el-page">
        <div className="el-container">
          <nav aria-label="Breadcrumb" className="el-breadcrumb">
            <Link to="/">{t('programLibrary.breadcrumb.home')}</Link>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>{t('programLibrary.breadcrumb.resources')}</span>
            <span className="el-breadcrumb-sep">&gt;</span>
            <span>Programs</span>
          </nav>

          <div className="el-hero">
            <h1 className="font-display">Programs</h1>
            <p>
              {loading
                ? 'Loading programs…'
                : sorted.length === 0
                  ? 'New multi-day programs are in production.'
                  : `${sorted.length} multi-day plan${sorted.length === 1 ? '' : 's'}`}
            </p>
          </div>

          {loading ? (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">
                <EmojiIcon icon={Hourglass} size={40} />
              </div>
              <p className="el-empty-text">Loading…</p>
            </div>
          ) : sorted.length === 0 ? (
            <div className="el-empty">
              <div className="el-empty-icon" aria-hidden="true">
                <EmojiIcon icon={Frown} size={40} />
              </div>
              <p className="el-empty-text">No programs yet</p>
              <p className="el-empty-sub">
                {error
                  ? "We couldn't reach the program library right now. Try again in a moment."
                  : 'Multi-day programs are in production. They land here as they ship.'}
              </p>
            </div>
          ) : (
            <div className="el-grid">
              {sorted.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="el-card"
                  onClick={() => setActiveProgram(p)}
                  // Buttons inherit the el-card grid item styling — this keeps
                  // the click target accessible (vs wrapping a div).
                  style={{ textAlign: 'left', font: 'inherit', cursor: 'pointer' }}
                >
                  <div className="el-card-emoji">
                    <span aria-hidden="true">
                      <EmojiIcon emoji={p.emoji || '🗓️'} size={28} />
                    </span>
                  </div>
                  <div className="el-card-name">{p.name}</div>
                  <div className="el-card-meta">
                    <span className="el-card-badge">{`${p.days} days`}</span>
                    {p.dur > 0 && (
                      <span className="el-card-equip">{`${p.dur} min/day`}</span>
                    )}
                    <span className={`el-card-diff ${diffClass(p.diff)}`}>
                      {diffLabel(p.diff)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {activeProgram && (
        <ProgramModal program={activeProgram} onClose={() => setActiveProgram(null)} />
      )}

      <SiteFooter />
    </>
  );
}

// ── Per-day breakdown modal ──────────────────────────────────────────────

type ProgramModalProps = {
  program: ProgramDisplay;
  onClose: () => void;
};

function ProgramModal({ program, onClose }: ProgramModalProps) {
  // Close on Escape — keeps the modal keyboard-navigable.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    zIndex: 1000,
  };

  const dialogStyle: React.CSSProperties = {
    background: '#111',
    color: '#fff',
    borderRadius: 16,
    maxWidth: 560,
    width: '100%',
    maxHeight: '85vh',
    overflowY: 'auto',
    padding: 24,
    boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
  };

  const closeBtn: React.CSSProperties = {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'transparent',
    border: 'none',
    color: '#fff',
    fontSize: 24,
    cursor: 'pointer',
    width: 36,
    height: 36,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <div
      style={overlayStyle}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${program.name} program details`}
    >
      <div style={{ ...dialogStyle, position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button type="button" style={closeBtn} onClick={onClose} aria-label="Close">
          ×
        </button>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 8 }} aria-hidden>
            {program.emoji || '🗓️'}
          </div>
          <h2 className="font-display" style={{ margin: 0, fontSize: 24 }}>
            {program.name}
          </h2>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="el-card-badge">{`${program.days} days`}</span>
            {program.dur > 0 && (
              <span className="el-card-equip">{`${program.dur} min/day`}</span>
            )}
            <span className={`el-card-diff ${diffClass(program.diff)}`}>
              {diffLabel(program.diff)}
            </span>
          </div>
        </div>

        {program.blocks.length === 0 ? (
          <p style={{ color: '#aaa' }}>Day-by-day breakdown is being finalized.</p>
        ) : (
          <ol style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {program.blocks.map((block, i) => (
              <li
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderTop: i === 0 ? 'none' : '1px solid #222',
                }}
              >
                <span style={{ fontWeight: 600 }}>{`Day ${block.day}`}</span>
                <span style={{ color: '#aaa', textAlign: 'right' }}>
                  {dayLabel(block)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
