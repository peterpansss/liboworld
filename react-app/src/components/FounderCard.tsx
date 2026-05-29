import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import './FounderCard.css';

// Brand mark + caption — dots logo over a short headline on the white-accent
// section. The video / founder portrait / modal were removed; reused name
// kept so the Landing import doesn't churn.
export default function FounderCard() {
  const { t } = useTranslation();
  const markRef = useRef<HTMLImageElement>(null);
  const [markIn, setMarkIn] = useState(false);

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

  return (
    <div className="founder-wrapper">
      <section className="founder-section" id="founder">
        <img
          ref={markRef}
          className={`founder-mark${markIn ? ' founder-mark--in' : ''}`}
          src="/brand/logo_options/libo-mark.svg"
          alt=""
          aria-hidden="true"
          loading="lazy"
        />
        <header className="founder-header">
          <h2 className="founder-headline font-display">
            {t('founder.headline', { defaultValue: 'No excuses.' })}
          </h2>
        </header>
        <div className="founder-phones">
          <div className="founder-phone founder-phone--back">
            <div className="founder-phone__frame">
              <div className="founder-phone__screen">
                <img
                  src="/mockups/founder-workout.png?v=20260512"
                  alt="Libo workout detail screen: Back – Machine Friendly, 35 minutes, beginner, with Start Workout button"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div className="founder-phone founder-phone--front">
            <div className="founder-phone__frame">
              <div className="founder-phone__screen">
                <img
                  src="/mockups/founder-rewards.png?v=20260512"
                  alt="Libo rewards screen: 436 points, money challenge for 100 reps over 30 days, €10 reward"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
