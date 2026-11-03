import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import { STORE_URLS } from '../utils/storeRedirect';
import './Blueprint.css';

// /blueprint — Noah's free 12-Month Blueprint (2 Nov 2026).
// Free, no sign-up, no email gate. It's Noah sharing what worked, not a pitch
// (Noah, 2 Nov: "I'm not trying to sell here anything"), so the page has no
// hooks, no urgency and only one quiet line about Libo at the bottom.
// Every fact here comes from the PDF itself (Brand-Management/Marketing/Blueprint/).
// Assets live under /downloads/ — a public/blueprint/ folder made Apache answer /blueprint with 301 → 403.
// The PDFs are versioned in the filename because Cloudflare caches asset URLs:
// ship a new version as -v2, never overwrite -v1.

const PDF_EN = '/downloads/blueprint/Libo-12-Month-Blueprint-EN-v7.pdf';
const PDF_DE = '/downloads/blueprint/Libo-12-Month-Blueprint-DE-v7.pdf';

export default function Blueprint() {
  const { t } = useTranslation();
  const d = (key: string, defaultValue: string) => t(`blueprint.${key}`, { defaultValue });

  const inside = [
    d('inside.0', 'The year in four phases: full body 3× a week, then upper/lower, then my 5–6 day split'),
    d('inside.1', 'How I did my sets, reps and rest, and the warm-up I did before every session'),
    d('inside.2', 'Your protein and calorie numbers, from 60 to 100 kg'),
    d('inside.3', 'My daily porridge and shake, and a full real day of eating with the numbers'),
    d('inside.4', 'My lunch and dinner plates, quick plates and snacks'),
    d('inside.5', 'Supplements, honestly: creatine, protein powder, BCAAs'),
    d('inside.6', 'Tracking without stressing over the scale'),
    d('inside.7', 'What I believed back then vs what turned out to be true'),
    d('inside.8', 'Where 12 months got me: real photos and my working sets'),
  ];

  return (
    <div className="bp-page">
      <SeoHead
        title={d('seo.title', 'The 12-Month Blueprint — free, by Noah F. · Libo')}
        description={d(
          'seo.desc',
          'Seven years stuck at 69 kg, then about 77 kg in twelve months. How I trained and ate, written down. Free PDF, English and German.',
        )}
        canonical="https://liboworld.com/blueprint"
        ogImage="https://liboworld.com/downloads/blueprint/card-v6.jpg"
      />
      <SiteNav />

      <main className="bp-main">
        <section className="bp-hero">
          <div className="bp-hero-text">
            <span className="bp-badge">{d('badge', 'Free · English + German · 11 pages')}</span>
            <h1>
              {d('h1Line1', 'The 12-month')}
              <br />
              <span className="bp-accent">{d('h1Line2', 'blueprint')}</span>
            </h1>
            <p className="bp-lead">{d('lead', '69 → 77 kg. No shortcuts.')}</p>

            <div className="bp-story">
              <p>
                {d(
                  'story.0',
                  'I was 69 kg at 17. Still 69 kg at 20. Still 69 kg at 24. Around New Year 2024, at 25, I started training properly, five or six days a week, and eating real food every day. Twelve months later I was around 77 kg.',
                )}
              </p>
              <p>
                {d(
                  'story.1',
                  'No supplement shelf, no 8-week program. Mostly a big breakfast I never skipped, a plan I didn’t quit, and a year I didn’t rush. I wrote all of it down, including the things I got wrong.',
                )}
              </p>
              <p>
                {d(
                  'story.2',
                  'It’s free. No sign-up, no email. Take it, share it, or don’t. I just wish someone had given me this when I was 17.',
                )}
              </p>
              <p className="bp-sign">{d('sign', 'Noah F.')}</p>
            </div>

            <div className="bp-actions">
              <a className="bp-btn-primary" href={PDF_EN} target="_blank" rel="noopener">
                {d('ctaEn', 'Download (English)')}
              </a>
              <a className="bp-btn-secondary" href={PDF_DE} target="_blank" rel="noopener" hrefLang="de">
                {d('ctaDe', 'Herunterladen (Deutsch)')}
              </a>
            </div>
            <p className="bp-meta">{d('meta', 'PDF · about 0.7 MB')}</p>
          </div>

          <a className="bp-cover" href={PDF_EN} target="_blank" rel="noopener" aria-label={d('ctaEn', 'Download (English)')}>
            <img
              src="/downloads/blueprint/card-v6.jpg"
              alt={d('coverAlt', 'Noah in May 2024, five months in, on the cover of The 12-Month Blueprint')}
              width={900}
              height={1273}
            />
          </a>
        </section>

        <section className="bp-inside">
          <h2>{d('insideH2', 'What’s inside')}</h2>
          <ul>
            {inside.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="bp-rules">
          <h2>{d('rulesH2', 'The three rules for the whole year')}</h2>
          <ol>
            <li>{d('rules.0', 'Show up on your training days, even for a short session.')}</li>
            <li>{d('rules.1', 'Hit your protein number most days.')}</li>
            <li>{d('rules.2', 'Do a little more than last time: one more rep or a bit more weight.')}</li>
          </ol>
        </section>

        <p className="bp-note">
          {d(
            'note',
            'If you want somewhere to log your sets, Libo shows what you lifted last time right next to every set, and has a video for almost every exercise.',
          )}{' '}
          <a href={STORE_URLS.ios} target="_blank" rel="noopener">
            {d('noteLink', 'Libo on the App Store')}
          </a>
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
