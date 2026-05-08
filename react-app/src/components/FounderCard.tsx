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
            <button
              type="button"
              className="founder-intro-close"
              onClick={closeIntro}
              aria-label={t('founder.introClose', { defaultValue: 'Close' })}
            >
              <span aria-hidden>✕</span>
            </button>
            <video
              ref={videoRef}
              src="/founder/noah-loop.mp4"
              poster="/founder/noah-loop-poster.jpg"
              controls
              playsInline
              preload="auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
