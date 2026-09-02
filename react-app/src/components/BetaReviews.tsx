import { useTranslation } from 'react-i18next';
import CommunityAvatar, { type AvatarGradient } from './CommunityAvatar';
import './BetaReviews.css';

const REVIEWS: { handle: string; initials: string; gradient: AvatarGradient; quote: string; }[] = [
  {
    handle: '@lifting.mike',
    initials: 'LM',
    gradient: 'a',
    quote: '"tested libo for the last 8 weeks. legit the only fitness app i\'ve stuck with past month 2. cash challenge thing got me actually doing reps for once 💪"',
  },
  {
    handle: '@sarah.runs',
    initials: 'SR',
    gradient: 'b',
    quote: '"BETA TESTING LIBO FOR 6 WEEKS AND IM HOOKED 🔥🔥 my form on squats is so much better. won £15 on the cash challenge but the streak is what got me"',
  },
  {
    handle: '@___danny___',
    initials: 'DD',
    gradient: 'c',
    quote: '"im usually so bad with apps but libo\'s plans actually make sense. told it i have 30 min and dumbbells and it built me something real. no fluff. been on the beta for ~5 weeks now"',
  },
  {
    handle: '@gemma.lifts',
    initials: 'GL',
    gradient: 'd',
    quote: '"joined the libo beta with low expectations. the workout generator is goated lol. better than my old PT 🫡"',
  },
  {
    handle: '@paul_n_4',
    initials: 'PN',
    gradient: 'e',
    quote: '"47 and skeptical about gym-bro apps. picked up libo in the beta and... the mobility plans are unreal. rewards thing is dumb fun. 2 months in 💯"',
  },
];

export default function BetaReviews() {
  const { t } = useTranslation();

  return (
    <section className="beta-section" id="beta-reviews" aria-labelledby="beta-heading">
      <div className="beta-inner">
        <div className="beta-header">
          <div className="beta-eyebrow">{t('betaReviews.eyebrow')}</div>
          <h2 id="beta-heading" className="beta-headline font-display">{t('betaReviews.headline')}</h2>
          <p className="beta-subhead">{t('betaReviews.subhead')}</p>
        </div>
        <div className="beta-grid">
          {REVIEWS.map(r => (
            <article className="beta-card" key={r.handle}>
              <div className="beta-card-header">
                <CommunityAvatar initials={r.initials} gradient={r.gradient} size={56} />
                <span className="beta-handle">{r.handle}</span>
              </div>
              <p className="beta-quote">{r.quote}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
