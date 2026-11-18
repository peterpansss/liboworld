import { useState, useRef, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { SeoHead } from '../components/SeoHead';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { AppCta, EarnHero, Band } from '../components/earn/EarnKit';
import './Faq.css';

/**
 * /faq — one page for the questions every earn page would otherwise repeat
 * (LMCT+ pattern: category tabs). Existing Home/Pricing answers are reused by
 * key so there is still one source of truth per answer; new answers live
 * under earnPages.faq.*. Each tab ends with the rules page it summarises.
 */
type Qa = { q: string; a: string };
type Tab = { id: string; items: Qa[]; rules?: { to: string; key: string } };

const k = (base: string, id: string): Qa => ({ q: `${base}.q${id}`, a: `${base}.a${id}` });
const E = 'earnPages.faq';

/** "Questions, answered." → ["Questions,", "answered."]: last word in lime. */
const splitTitle = (text: string): [string, string] => {
  const w = text.trim().split(/\s+/);
  return w.length < 2 ? ['', text] : [w.slice(0, -1).join(' '), w[w.length - 1]];
};

const TABS: Tab[] = [
  { id: 'points', items: [k(E, 'PointsWhat'), k(E, 'PointsEarn'), k(E, 'PointsExpire'), k(E, 'PointsSpend'), k(E, 'PointsBuy')], rules: { to: '/rewards-rules', key: 'rewardsRules' } },
  { id: 'challenges', items: [k(E, 'ChallengeHow'), k(E, 'ChallengeMiss'), k(E, 'ChallengePaid')], rules: { to: '/rules', key: 'challengeRules' } },
  { id: 'giveaway', items: [k(E, 'GiveawayEnter'), k(E, 'GiveawayPay'), k(E, 'GiveawayWho'), k(E, 'GiveawayCash')], rules: { to: '/giveaway-rules', key: 'giveawayRules' } },
  { id: 'membership', items: [k('relaunchHome.faq', '3'), { q: 'relaunchPricing.faq.qPrice', a: 'relaunchPricing.faq.aPrice' }, k(E, 'Cancel')] },
  { id: 'app', items: [k('relaunchHome.faq', '1'), k('relaunchHome.faq', '6'), k('relaunchHome.faq', '5'), k('relaunchHome.faq', '7'), k('relaunchHome.faq', '8')] },
];

export default function Faq() {
  const { t } = useTranslation();
  const [active, setActive] = useState(0);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (active + dir + TABS.length) % TABS.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const tab = TABS[active];

  return (
    <>
      <SeoHead
        title={t('earnPages.faq.seo.title')}
        description={t('earnPages.faq.seo.description')}
        canonical="/faq"
      />
      <SiteNav />
      <main id="main-content" className="earn-page">
        <EarnHero
          compact
          eyebrow={t('earnPages.faq.eyebrow')}
          title={splitTitle(t('earnPages.faq.title'))}
          props={['libo-coin']}
        />

        <Band raised>
        <div className="fq-tabs" role="tablist" aria-label={t('earnPages.faq.tabsLabel')}>
          {TABS.map((tb, i) => (
            <button
              key={tb.id}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`fq-tab-${tb.id}`}
              aria-selected={i === active}
              aria-controls={`fq-panel-${tb.id}`}
              tabIndex={i === active ? 0 : -1}
              className="fq-tab"
              onClick={() => setActive(i)}
              onKeyDown={onKey}
            >
              {t(`earnPages.faq.tabs.${tb.id}`)}
            </button>
          ))}
        </div>

        <div role="tabpanel" id={`fq-panel-${tab.id}`} aria-labelledby={`fq-tab-${tab.id}`} className="fq-panel">
          {tab.items.map((qa) => (
            <details key={qa.q} className="fq-item">
              <summary className="fq-q">
                <span>{t(qa.q)}</span>
                <span className="fq-q__icon" aria-hidden="true">+</span>
              </summary>
              <p className="fq-a">{t(qa.a)}</p>
            </details>
          ))}
          {tab.rules && (
            <p className="earn-rules">
              <Link to={tab.rules.to}>{t(`earnPages.faq.rulesLinks.${tab.rules.key}`)} <span aria-hidden="true">→</span></Link>
            </p>
          )}
        </div>

        <p className="fq-contact">
          {t('earnPages.faq.contact')} <a href="mailto:hello@liboworld.com">hello@liboworld.com</a>
        </p>
        </Band>
        <AppCta title={t('earnPages.common.ctaTitle')} sub={t('earnPages.common.ctaSub')} />
      </main>
      <SiteFooter />
    </>
  );
}
