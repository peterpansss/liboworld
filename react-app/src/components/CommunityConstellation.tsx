import { useTranslation } from 'react-i18next';
import AppStoreBadge from './AppStoreBadge';
import CommunityAvatar, { type AvatarGradient } from './CommunityAvatar';
import './CommunityConstellation.css';

// Hand-tuned scatter. Adding a real `image` field to each entry later
// (and branching in CommunityAvatar) lets us swap to real member photos
// without touching the layout.
type AvatarSpec = {
  top: string;
  left: string;
  size: number;
  initials: string;
  gradient: AvatarGradient;
};

const AVATARS: AvatarSpec[] = [
  { top: '5%',  left: '60%', size: 96,  initials: 'JM', gradient: 'a' },
  { top: '12%', left: '22%', size: 80,  initials: 'AL', gradient: 'c' },
  { top: '22%', left: '78%', size: 88,  initials: 'RK', gradient: 'b' },
  { top: '30%', left: '8%',  size: 96,  initials: 'SP', gradient: 'd' },
  { top: '35%', left: '44%', size: 112, initials: 'MC', gradient: 'e' },
  { top: '48%', left: '70%', size: 80,  initials: 'DT', gradient: 'a' },
  { top: '55%', left: '18%', size: 88,  initials: 'EH', gradient: 'b' },
  { top: '60%', left: '90%', size: 80,  initials: 'NV', gradient: 'c' },
  { top: '68%', left: '50%', size: 96,  initials: 'TB', gradient: 'd' },
  { top: '75%', left: '28%', size: 80,  initials: 'LR', gradient: 'e' },
  { top: '78%', left: '72%', size: 88,  initials: 'KW', gradient: 'a' },
  { top: '85%', left: '12%', size: 80,  initials: 'BG', gradient: 'c' },
  { top: '88%', left: '56%', size: 96,  initials: 'FA', gradient: 'b' },
  { top: '90%', left: '86%', size: 80,  initials: 'PO', gradient: 'd' },
  { top: '18%', left: '90%', size: 76,  initials: 'HD', gradient: 'e' },
];

const MOBILE_AVATARS = AVATARS.slice(0, 9);

export default function CommunityConstellation() {
  const { t } = useTranslation();
  return (
    <section className="community-section" id="community" aria-labelledby="community-heading">
      <div className="community-inner">
        <div className="community-text">
          <div className="community-eyebrow">{t('community.eyebrow')}</div>
          <h2 id="community-heading" className="community-headline font-display">
            {t('community.headline')}
          </h2>
          <p className="community-body">{t('community.body')}</p>
          <div className="community-cta">
            <AppStoreBadge className="community-badge-link" />
            <p className="community-platform-note">{t('community.androidNote')}</p>
          </div>
        </div>

        <div className="community-constellation" aria-hidden="true">
          <div className="community-constellation-desktop">
            {AVATARS.map((a, i) => (
              <div
                key={`d-${i}`}
                className="community-avatar-slot"
                style={{ top: a.top, left: a.left }}
              >
                <CommunityAvatar initials={a.initials} gradient={a.gradient} size={a.size} />
              </div>
            ))}
          </div>
          <div className="community-constellation-mobile">
            {MOBILE_AVATARS.map((a, i) => (
              <div
                key={`m-${i}`}
                className="community-avatar-slot"
                style={{ top: a.top, left: a.left }}
              >
                <CommunityAvatar initials={a.initials} gradient={a.gradient} size={a.size} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
