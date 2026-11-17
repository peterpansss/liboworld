import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import StoreBadges from '../components/StoreBadges';
import {
  EarnHero, StepStrip, PremiumStrip, EarnNext, PhoneShot, AppCta, RulesLink,
} from '../components/earn/EarnKit';
import {
  featuredRound, roundStatus, GIVEAWAY_ENTRIES, LOYALTY_PER_MONTH, LOYALTY_MAX_MONTHS,
} from '../data/giveawayRounds';
import './GiveawayPage.css';

/** Loyalty months shown in the entries ladder. */
const LADDER_MONTHS = [0, 3, 6, LOYALTY_MAX_MONTHS];

/**
 * /giveaway — the live giveaway round (one big giveaway a month, Noah
 * 14 Nov 2026). Entries are automatic (Free 1 / Premium 3, the same again per
 * loyalty month), one workout in the round activates them, the draw runs at
 * the close. No winners feed (canon, 10 Nov 2026): proof lives on social and
 * the rules. Everything numeric comes from data/giveawayRounds.ts, which must
 * match the server.
 */
export default function Giveaway() {
  const { t, i18n } = useTranslation();
  const round = featuredRound();
  const status = round ? roundStatus(round) : 'closed';

  const fmt = (ymd: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', timeZone: 'UTC' })
      .format(new Date(`${ymd}T12:00:00Z`));

  const statusLine = round
    ? t(`earnPages.giveaway.status.${status}`, { opens: fmt(round.opens), closes: fmt(round.closes) })
    : '';

  return (
    <>
      <SeoHead
        title={t('earnPages.giveaway.seo.title', { prize: round?.prizeName ?? '' })}
        description={t('earnPages.giveaway.seo.description', { prize: round?.prizeName ?? '' })}
        canonical="/giveaway"
      />
      <SiteNav />
      <main id="main-content" className="earn-page">
        <EarnHero
          eyebrow={round ? t('earnPages.giveaway.eyebrow', { n: round.n }) : t('earnPages.giveaway.eyebrowNone')}
          title={round
            ? <>{t('earnPages.giveaway.title1')} <span className="accent">{round.prizeName}.</span></>
            : t('earnPages.giveaway.titleNone')}
          sub={t('earnPages.giveaway.sub')}
          props={round ? [round.prop, 'controller'] : ['trophy-lime']}
        >
          {round && (
            <p className={`gw-status gw-status--${status}`}>
              <span className="gw-status__dot" aria-hidden="true" />
              {statusLine}
            </p>
          )}
          <StoreBadges className="gw-badges" />
        </EarnHero>

        {round && (
          <p className="gw-cash">
            {t('earnPages.giveaway.cash', { prize: round.prizeName, cash: round.cashEur })}
          </p>
        )}

        <StepStrip
          heading={t('earnPages.giveaway.steps.heading')}
          steps={[
            { prop: 'kettlebell-lime', title: t('earnPages.giveaway.steps.s1.title'), text: t('earnPages.giveaway.steps.s1.text') },
            { prop: 'gym-card', title: t('earnPages.giveaway.steps.s2.title'), text: t('earnPages.giveaway.steps.s2.text') },
            { prop: 'trophy-lime', title: t('earnPages.giveaway.steps.s3.title'), text: t('earnPages.giveaway.steps.s3.text') },
          ]}
        />

        <section className="earn-section">
          <h2 className="earn-h2 font-display">{t('earnPages.giveaway.entries.heading')}</h2>
          <p className="earn-lead">{t('earnPages.giveaway.entries.lead')}</p>
          <div className="gw-entries-wrap">
            <table className="gw-ladder">
              <caption className="sr-only">{t('earnPages.giveaway.entries.caption')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('earnPages.giveaway.entries.months')}</th>
                  <th scope="col">{t('earnPages.common.free')}</th>
                  <th scope="col" className="gw-ladder__premium">{t('earnPages.common.premium')}</th>
                </tr>
              </thead>
              <tbody>
                {LADDER_MONTHS.map((m) => (
                  <tr key={m}>
                    <th scope="row">{m === 0 ? t('earnPages.giveaway.entries.firstRound') : t('earnPages.giveaway.entries.monthsInRow', { count: m })}</th>
                    <td className="font-display">{GIVEAWAY_ENTRIES.free + LOYALTY_PER_MONTH.free * m}</td>
                    <td className="font-display gw-ladder__premium">{GIVEAWAY_ENTRIES.premium + LOYALTY_PER_MONTH.premium * m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <PhoneShot src="giveaway" alt={t('earnPages.giveaway.screenAlt')} className="gw-phone" />
          </div>
          <p className="earn-fine">{t('earnPages.giveaway.entries.fine')}</p>
          <PremiumStrip text={t('earnPages.giveaway.premiumText')} />
        </section>

        <EarnNext current="giveaway" />
        <RulesLink to="/giveaway-rules" label={t('earnPages.giveaway.rules')} />
        <p className="earn-fine">{t('earnPages.giveaway.trademark')}</p>
        <AppCta title={t('earnPages.common.ctaTitle')} sub={t('earnPages.common.ctaSub')} />
      </main>
      <SiteFooter />
    </>
  );
}
