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
  caption: string;
  isVideo?: boolean;
};

const SHOTS: FounderShot[] = [
  {
    src: '/ReferenceImagesReal/780b162e3c5b30de4cb9bef7f776be2a.jpg',
    caption: 'Squat day. Form first.',
  },
  {
    src: '/ReferenceImagesReal/935abbc2c7027fa606dba7152c73c59e.jpg',
    caption: 'Designed in the gym, not the office.',
  },
  {
    src: '/ReferenceImagesReal/8ee1370056b3d2132deac27ce992a93d.jpg',
    caption: 'Every workout in Libo, I trained myself first.',
  },
];

export default function FounderCard() {
  const { t } = useTranslation();
  return (
    <div className="founder-wrapper">
      <section className="founder-section" id="founder">
        <header className="founder-header">
          <h2 className="founder-headline font-display">
            {t('founder.headline', { defaultValue: 'Built in the gym.' })}
          </h2>
          <p className="founder-subhead">
            {t('founder.subhead', { defaultValue: 'Every workout in Libo was trained first by Noah, the founder.' })}
          </p>
        </header>

        <div className="founder-grid">
          {SHOTS.map((shot, i) => (
            <figure key={i} className={`founder-shot founder-shot--${i + 1}`}>
              {shot.isVideo ? (
                <video
                  src={shot.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  data-placeholder="founder-bts"
                />
              ) : (
                <img
                  src={shot.src}
                  alt=""
                  loading="lazy"
                  data-placeholder="founder-bts"
                />
              )}
              <figcaption className="founder-caption">
                <span className="founder-caption__quote" aria-hidden>"</span>
                <span className="founder-caption__text">{shot.caption}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>
    </div>
  );
}
