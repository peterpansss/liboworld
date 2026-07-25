import { useTranslation } from 'react-i18next';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import { useWaitlistSubmit } from '../hooks/useWaitlistSubmit';
import './MoneyChallenges.css';

// /money-challenges — 30-day cash-challenge landing page.
// Built to match designs/Money Challenges.dc.html pixel-for-pixel.
// Sections in order: Hero · How it works · Pick your tier · Real rules · Reserve.
// All copy comes from the `relaunchChallenges.*` i18n namespace.

type Step = { num: string; name: string; desc: string };
type Tier = { plan: string; payout: string; name: string; desc: string; daily: string; spots: string };
type Rule = { title: string; body: string };

export default function MoneyChallenges() {
  const { t } = useTranslation();

  const steps = t('relaunchChallenges.howItWorks.steps', { returnObjects: true }) as Step[];
  const tiers = t('relaunchChallenges.tiers.items', { returnObjects: true }) as Tier[];
  const rules = t('relaunchChallenges.rules.items', { returnObjects: true }) as Rule[];

  // Per-tier daily-effort fill for the progress bar (0.3 / 0.6 / 1) — matches the design.
  const effort = [0.3, 0.6, 1];

  return (
    <div className="mc-page">
      <SiteNav />
      <SeoHead
        title="Money Challenges — Train 30 Days, Earn Real Cash | Libo"
        description="30 days. Daily reps. Post the proof. Cash out. No points, no gift cards — just real money. Limited spots per cycle keep it honest."
        canonical="/money-challenges"
        ogImage="/brand/og-image.png"
      />

      <main id="main-content">
        {/* ── HERO ─────────────────────────────────────────── */}
        <header className="mc-hero">
          <div className="mc-hero__text">
            <div className="mc-hero__badges">
              <span className="mc-badge mc-badge--accent">
                {t('relaunchChallenges.hero.badge1')}
              </span>
              <span className="mc-badge mc-badge--default">
                {t('relaunchChallenges.hero.badge2')}
              </span>
            </div>
            <h1 className="mc-hero__title font-display">
              {t('relaunchChallenges.hero.h1Line1')}
              <br />
              <span className="mc-accent">{t('relaunchChallenges.hero.h1Accent')}</span>
            </h1>
            <p className="mc-hero__sub">{t('relaunchChallenges.hero.sub')}</p>
            <a href="#reserve" className="mc-btn mc-btn--xl">
              {t('relaunchChallenges.hero.cta')}
            </a>
          </div>
          <div className="mc-hero__media">
            <img
              src="/app-rewards.png"
              alt={t('relaunchChallenges.hero.imgAlt')}
              className="mc-hero__phone"
            />
          </div>
        </header>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section className="mc-section mc-section--band">
          <div className="mc-section__inner mc-how">
            <h2 className="mc-h2 font-display">{t('relaunchChallenges.howItWorks.h2')}</h2>
            <div className="mc-how__grid">
              {steps.map((st, i) => (
                <div key={st.num} className="mc-card mc-step">
                  <span
                    className={`mc-step__num font-display${i === steps.length - 1 ? ' mc-accent' : ''}`}
                  >
                    {st.num}
                  </span>
                  <span className="mc-step__name font-display">{st.name}</span>
                  <span className="mc-step__desc">{st.desc}</span>
                </div>
              ))}
            </div>
            <blockquote className="mc-quote">
              {t('relaunchChallenges.howItWorks.quote')}
              <footer className="mc-quote__author">
                {t('relaunchChallenges.howItWorks.quoteAuthor')}
              </footer>
            </blockquote>
          </div>
        </section>

        {/* ── PICK YOUR TIER ───────────────────────────────── */}
        <section className="mc-section">
          <div className="mc-section__inner mc-tiers">
            <div className="mc-tiers__head">
              <h2 className="mc-h2 font-display">{t('relaunchChallenges.tiers.h2')}</h2>
              <p className="mc-tiers__desc">{t('relaunchChallenges.tiers.desc')}</p>
            </div>
            <div className="mc-tiers__grid">
              {tiers.map((tier, i) => {
                const elevated = i === tiers.length - 1;
                return (
                  <div
                    key={tier.name}
                    className={`mc-card mc-tier${elevated ? ' mc-tier--elevated' : ''}`}
                  >
                    <div className="mc-tier__top">
                      <span
                        className={`mc-badge ${elevated ? 'mc-badge--accent' : 'mc-badge--default'}`}
                      >
                        {tier.plan}
                      </span>
                      <span className="mc-tier__spots">{tier.spots}</span>
                    </div>
                    <span className={`mc-tier__payout font-display${elevated ? ' mc-accent' : ''}`}>
                      {tier.payout}
                    </span>
                    <span className="mc-tier__name font-display">{tier.name}</span>
                    <span className="mc-tier__desc">{tier.desc}</span>
                    <div className="mc-tier__meter">
                      <div className="mc-tier__meter-row">
                        <span>{t('relaunchChallenges.tiers.dailyLabel')}</span>
                        <span className="mc-tier__daily">{tier.daily}</span>
                      </div>
                      <div className="mc-progress">
                        <div
                          className="mc-progress__fill"
                          style={{ width: `${effort[i] * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── REAL RULES ───────────────────────────────────── */}
        <section className="mc-section mc-section--band">
          <div className="mc-section__inner mc-rules">
            <h2 className="mc-h2 font-display">
              {t('relaunchChallenges.rules.h2Line1')}
              <br />
              {t('relaunchChallenges.rules.h2Line2')}
              <br />
              <span className="mc-accent">{t('relaunchChallenges.rules.h2Accent')}</span>
            </h2>
            <div className="mc-rules__list">
              {rules.map((r) => (
                <div key={r.title} className="mc-rule">
                  <span className="mc-rule__check" aria-hidden="true">
                    ✓
                  </span>
                  <div className="mc-rule__text">
                    <span className="mc-rule__title">{r.title}</span>
                    <span className="mc-rule__body">{r.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── RESERVE ──────────────────────────────────────── */}
        <ReserveSection />
      </main>

      <SiteFooter />
    </div>
  );
}

// Email capture — mirrors the design's #reserve block with the
// relaunchChallenges.reserve copy. Persists to the `challenge_waitlist` source.
function ReserveSection() {
  const { t } = useTranslation();
  const { email, setEmail, status, submit } = useWaitlistSubmit('challenge_waitlist');
  const done = status === 'success' || status === 'duplicate';

  return (
    <section id="reserve" className="mc-reserve">
      <h2 className="mc-reserve__title font-display">
        {t('relaunchChallenges.reserve.h2Line1')}
        <br />
        <span className="mc-accent">{t('relaunchChallenges.reserve.h2Accent')}</span>
      </h2>
      <p className="mc-reserve__body">{t('relaunchChallenges.reserve.body')}</p>

      {done ? (
        <div className="mc-reserve__confirm font-display">
          {t('relaunchChallenges.reserve.confirm')}
        </div>
      ) : (
        <form className="mc-reserve__form" onSubmit={submit}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('relaunchChallenges.reserve.emailPlaceholder')}
            className="mc-reserve__input"
            disabled={status === 'submitting'}
          />
          <button type="submit" className="mc-btn mc-reserve__submit" disabled={status === 'submitting'}>
            {status === 'submitting' ? '…' : t('relaunchChallenges.reserve.button')}
          </button>
        </form>
      )}

      <p className="mc-reserve__note">{t('relaunchChallenges.reserve.note')}</p>
    </section>
  );
}
