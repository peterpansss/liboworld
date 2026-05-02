import { useTranslation } from 'react-i18next';
import './MethodologyRow.css';

interface Pillar {
  icon: string;
  titleKey: string;
  defaultTitle: string;
  descKey: string;
  defaultDesc: string;
}

const PILLARS: Pillar[] = [
  {
    icon: '🏋️',
    titleKey: 'methodology.pillar1Title',
    defaultTitle: 'Built with certified trainers',
    descKey: 'methodology.pillar1Desc',
    defaultDesc:
      'Programs designed and reviewed by NASM- and ACE-certified personal trainers — not generic AI output.',
  },
  {
    icon: '🧠',
    titleKey: 'methodology.pillar2Title',
    defaultTitle: 'Backed by habit science',
    descKey: 'methodology.pillar2Desc',
    defaultDesc:
      'Daily reps, streak mechanics, and recovery cues drawn from peer-reviewed habit-formation research.',
  },
  {
    icon: '📐',
    titleKey: 'methodology.pillar3Title',
    defaultTitle: 'Follows ACSM guidelines',
    descKey: 'methodology.pillar3Desc',
    defaultDesc:
      'Workout structure aligned with American College of Sports Medicine training and recovery principles.',
  },
];

export function MethodologyRow() {
  const { t } = useTranslation();
  return (
    <section className="methodology-row" aria-label={t('methodology.eyebrow', { defaultValue: 'How Libo Works' })}>
      <div className="methodology-row__inner">
        <div className="methodology-row__header reveal">
          <div className="label label-spaced">
            {t('methodology.eyebrow', { defaultValue: 'How Libo Works' })}
          </div>
          <h2 className="display display-md font-display" style={{ whiteSpace: 'pre-line' }}>
            {t('methodology.headline', { defaultValue: 'Built to help you\nactually stick with it.' })}
          </h2>
        </div>
        <div className="methodology-row__grid">
          {PILLARS.map((p, i) => (
            <div
              key={p.titleKey}
              className="methodology-row__pillar"
              data-reveal="fade-up"
              data-delay={String(i * 0.1)}
            >
              <div className="methodology-row__icon" aria-hidden>{p.icon}</div>
              <h3 className="methodology-row__title">
                {t(p.titleKey, { defaultValue: p.defaultTitle })}
              </h3>
              <p className="methodology-row__desc">
                {t(p.descKey, { defaultValue: p.defaultDesc })}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
