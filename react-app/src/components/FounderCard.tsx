import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FounderCard.css';

// Founder section: 2 portrait cards (video + photo) with editorial caption
// pills, plus a CTA to the dedicated /founder page for the full story.
type FounderShot = {
  src: string;
  isVideo?: boolean;
  // First-frame fallback so the card has something to render before the
  // video buffers (or if autoplay is blocked).
  poster?: string;
  // True when src still points at a stock placeholder; the rendered <img>
  // gets data-placeholder="founder-bts" so the remaining slots are easy to
  // grep when more real Noah BTS shots are ready.
  placeholder?: boolean;
};

const SHOTS: FounderShot[] = [
  {
    src: '/founder/noah-loop.mp4',
    poster: '/founder/noah-loop-poster.jpg',
    isVideo: true,
  },
];

export default function FounderCard() {
  const { t } = useTranslation();
  const markRef = useRef<HTMLImageElement>(null);
  const [markIn, setMarkIn] = useState(false);
  const [introOpen, setIntroOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const node = markRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setMarkIn(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!introOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeIntro();
    };
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // User click on the trigger counts as a gesture, so unmuted autoplay
    // is permitted. If the browser still blocks it (rare on Safari/iOS),
    // fall back to muted so something plays.
    const v = videoRef.current;
    if (v) {
      v.muted = false;
      v.currentTime = 0;
      v.play().catch(() => {
        v.muted = true;
        v.play().catch(() => {});
      });
    }
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [introOpen]);

  function closeIntro() {
    videoRef.current?.pause();
    setIntroOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
    } else {
      v.pause();
    }
  }

  return (
    <div className="founder-wrapper">
      <section className="founder-section" id="founder">
        <img
          ref={markRef}
          className={`founder-mark${markIn ? ' founder-mark--in' : ''}`}
          src="/brand/logo_options/dots_only_transparent.png"
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <header className="founder-header">
          <h2 className="founder-headline font-display">
            {t('founder.headline', { defaultValue: 'No excuses.' })}
          </h2>
        </header>

        <div className="founder-grid">
          {SHOTS.map((shot, i) => (
            <figure key={i} className={`founder-shot founder-shot--${i + 1}`}>
              {shot.isVideo ? (
                <video
                  src={shot.src}
                  poster={shot.poster}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  {...(shot.placeholder ? { 'data-placeholder': 'founder-bts' } : {})}
                />
              ) : (
                <img
                  src={shot.src}
                  alt=""
                  loading="lazy"
                  {...(shot.placeholder ? { 'data-placeholder': 'founder-bts' } : {})}
                />
              )}
            </figure>
          ))}
        </div>

        <div className="founder-cta-row">
          <button
            ref={triggerRef}
            type="button"
            className="founder-cta"
            onClick={() => setIntroOpen(true)}
          >
            {t('founder.ctaText', { defaultValue: 'About Us' })}
            <span aria-hidden>→</span>
          </button>
        </div>
      </section>

      {introOpen && (
        <div
          className="founder-intro-backdrop"
          onClick={closeIntro}
          role="dialog"
          aria-modal="true"
          aria-label={t('founder.introAria', { defaultValue: 'Libo World introduction' })}
        >
          <div
            className="founder-intro-card"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              className="founder-intro-video"
              poster="/founder/noah-loop-poster.jpg"
              playsInline
              preload="auto"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
            >
              {/* Portrait cut served on phones (≤768px). Placeholder is
                  noah-loop.mp4 (9:16) — swap to /founder/intro-portrait.mp4
                  (1080×1920) once the real cut is recorded. */}
              <source
                src="/founder/noah-loop.mp4"
                media="(max-width: 768px)"
                type="video/mp4"
              />
              {/* Landscape cut for desktop / tablet. Placeholder is the same
                  9:16 file for now — swap to /founder/intro-landscape.mp4
                  (1920×1080) once recorded. */}
              <source
                src="/founder/noah-loop.mp4"
                type="video/mp4"
              />
            </video>

            <button
              type="button"
              className="founder-intro-toggle"
              onClick={togglePlay}
              aria-label={
                isPlaying
                  ? t('founder.introPause', { defaultValue: 'Pause' })
                  : t('founder.introPlay', { defaultValue: 'Play' })
              }
            >
              {isPlaying ? (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                  <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden>
                  <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" />
                </svg>
              )}
            </button>

            <button
              type="button"
              className="founder-intro-close"
              onClick={closeIntro}
              aria-label={t('founder.introClose', { defaultValue: 'Close' })}
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
