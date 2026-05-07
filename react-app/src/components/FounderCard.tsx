import { useTranslation } from 'react-i18next';
import './FounderCard.css';

// Cal AI-style "Built by athletes" section. Centered headline + 3 portrait
// cards. Decorative — no link target. Each card has a small dark caption
// pill in the bottom-left.
//
// Placeholders pulled from public/ReferenceImagesReal/. Marked with
// data-placeholder="founder-bts" so the assets are easy to swap when
// Noah supplies real BTS footage.
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
  {
    src: '/founder/noah-photo.jpg',
  },
];

export default function FounderCard() {
  const { t } = useTranslation();
  return (
    <div className="founder-wrapper">
      <section className="founder-section" id="founder">
        <header className="founder-header">
          <h2 className="founder-headline font-display">
            {t('founder.headline', { defaultValue: 'No excuses.' })}
          </h2>
          <p className="founder-subhead">
            {t('founder.subhead', { defaultValue: 'Used by the founder.' })}
          </p>
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
      </section>
    </div>
  );
}
