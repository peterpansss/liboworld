import { Link } from 'react-router-dom';
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
  return (
    <div className="founder-wrapper">
      <section className="founder-section" id="founder">
        <img
          className="founder-mark"
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
          <Link to="/founder" className="founder-cta">
            {t('founder.ctaText', { defaultValue: 'Who are we ?' })}
            <span aria-hidden>→</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
