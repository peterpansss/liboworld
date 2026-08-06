import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import SiteNav from '../components/SiteNav';
import SiteFooter from '../components/SiteFooter';
import { SeoHead } from '../components/SeoHead';
import ScrollRevealText from '../components/ScrollRevealText';
import './Founder.css';

// /founder — the "About Libo" page.
//   hero → why we're building this (photo + 4 pillars) → pull quote
//   → vision statement card → join CTA.
//
// FOUNDER-PAGE-TICKET.md is authoritative here: this is a bio/vita page, so no
// cash, payout, price, spot-count or challenge-mechanic copy appears on it.
// Money talk lives on Home, /cash-challenges and /membership.
//
// The hero keys (relaunchFounder.hero.*) already match the approved design and
// are reused as-is. Copy the ticket changed is authored under the page-local
// `founderV2` namespace as t(key, { defaultValue }) so a later harvest pass can
// lift it into the locale files — this page never edits src/i18n/locales.

interface Pillar {
  num: string;
  title: string;
  body: string;
}

export default function Founder() {
  const { t } = useTranslation();

  const pillars = t('relaunchFounder.why.pillars', { returnObjects: true }) as Pillar[];
  const basePillars = Array.isArray(pillars) ? pillars : [];

  // All four pillars are rewritten by the target canvas (DECISIONS-V3 confirms
  // it is current): 01/02 replace the football CV and setback story with the
  // competition + companies framing; 03/04 carry the standards/club copy.
  const pillarOverride: Record<string, Partial<Pillar>> = {
    '01': {
      title: t('founderV2.pillars.01.title', { defaultValue: 'Rooted in competition' }),
      body: t('founderV2.pillars.01.body', {
        defaultValue:
          "Libo's DNA is competition and self-improvement — becoming the best version of yourself, in training and everywhere else. Consistency is what carries you there, and it holds when something real is on the line. Libo builds those stakes into everyday training.",
      }),
    },
    '02': {
      title: t('founderV2.pillars.02.title', { defaultValue: 'Built to finish' }),
      body: t('founderV2.pillars.02.body', {
        defaultValue:
          'Off the pitch, Noah built two successful companies — the fashion label Mieuxnoir and the fashion production company Manufactnow. Every venture demanded the same thing sport did: showing up daily, holding the standard, finishing what he started. That’s the pattern Libo rewards — consistency that compounds.',
      }),
    },
    '03': {
      title: t('founderV2.pillars.03.title', { defaultValue: 'Standards beat motivation' }),
      body: t('founderV2.pillars.03.body', {
        defaultValue:
          'Willpower fades; standards hold. Libo turns training into a commitment with real stakes: a streak that never resets to zero, and cash challenges where finishing is worth real money.',
      }),
    },
    '04': {
      body: t('founderV2.pillars.04.body', {
        defaultValue:
          'No coaches or influencers selling courses — members get everything through membership. The product is the people showing up, day after day — the app just keeps score and pays the receipts.',
      }),
    },
  };

  const pillarList = basePillars.map((p) => ({ ...p, ...(pillarOverride[p.num] ?? {}) }));

  const whyHeading = t('relaunchFounder.why.h2');
  const visionLine1 = t('relaunchFounder.vision.h2Line1');
  const visionLine2 = t('relaunchFounder.vision.h2Line2');
  const joinLine1 = t('relaunchFounder.joinCta.h2Line1');
  const joinAccent = t('relaunchFounder.joinCta.h2Accent');
  const quoteLine1 = t('relaunchFounder.pullQuote.line1');
  const quoteLine2Pre = t('relaunchFounder.pullQuote.line2Pre');
  const quoteLine2Accent = t('relaunchFounder.pullQuote.line2Accent');

  return (
    <div className="founder-page">
      <SeoHead
        title={t('founderV2.seo.title', {
          defaultValue: 'About Libo — Libo World · Training Club',
        })}
        description={t('relaunchFounder.hero.sub')}
        canonical="https://liboworld.com/about"
        ogImage="https://liboworld.com/brand/og-image.png"
      />
      <SiteNav />

      {/* ── Hero ── */}
      <header className="fp-hero">
        <span className="fp-badge">{t('relaunchFounder.hero.badge')}</span>
        <h1>
          {t('relaunchFounder.hero.h1Line1')}
          <br />
          <span className="fp-accent">{t('relaunchFounder.hero.h1Accent')}</span>
        </h1>
        <p className="fp-hero-sub">{t('relaunchFounder.hero.sub')}</p>
      </header>

      {/* ── Why we're building this ── */}
      <section className="fp-why" aria-label={whyHeading}>
        <div className="fp-why-media">
          {/* Founder photo v2 (Noah, 2026-08-07) — 1050×1400 = 3:4 in a 4:5
              slot, so object-fit crops a sliver top/bottom; the face stays
              centred. New filename on purpose: Cloudflare caches asset URLs,
              so overwriting the old path would serve the stale photo for
              hours. No name-plate overlay (HANDOFF-V2 §B6). */}
          <img
            className="fp-why-img"
            src="/noah-founder-v2.jpg"
            alt={t('relaunchFounder.why.imgAlt')}
            width={1050}
            height={1400}
            loading="lazy"
          />
        </div>

        <div className="fp-why-body">
          {/* SPEC: this band alone uses the wider 1.0 → 0.55 reveal window. */}
          <ScrollRevealText as="h2" className="fp-why-h2" start={1.0} end={0.55}>
            {whyHeading}
          </ScrollRevealText>
          {pillarList.map((p) => (
            <div className="fp-pillar" key={p.num}>
              <span className="fp-pillar-num">{p.num}</span>
              <div className="fp-pillar-text">
                <span className="fp-pillar-title">{p.title}</span>
                <p className="fp-pillar-body">{p.body}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pull quote ── */}
      <section className="fp-pull">
        <div className="fp-pull-inner">
          <blockquote className="fp-pull-quote">
            <ScrollRevealText as="span" className="fp-line">
              {quoteLine1}
            </ScrollRevealText>
            {quoteLine2Pre ? (
              <ScrollRevealText as="span" className="fp-line">
                {quoteLine2Pre}
              </ScrollRevealText>
            ) : null}
            <ScrollRevealText as="span" className="fp-line fp-line--accent">
              {quoteLine2Accent}
            </ScrollRevealText>
          </blockquote>
          <div className="fp-pull-attrib">
            <span className="fp-pull-name">{t('relaunchFounder.pullQuote.name')}</span>
            <span className="fp-pull-source">{t('relaunchFounder.pullQuote.source')}</span>
          </div>
          <Link to="/blog" className="fp-btn-outline">
            {t('relaunchFounder.pullQuote.cta')}
          </Link>
        </div>
      </section>

      {/* ── Vision ── */}
      <section className="fp-vision">
        <div className="fp-vision-head">
          <h2 className="fp-vision-h2">
            <ScrollRevealText as="span" className="fp-line">
              {visionLine1}
            </ScrollRevealText>
            <ScrollRevealText as="span" className="fp-line">
              {visionLine2}
            </ScrollRevealText>
          </h2>
          <p className="fp-vision-desc">
            {t('founderV2.vision.desc', {
              defaultValue:
                'Noah’s vision is a club — an ecosystem where showing up compounds: training, challenges, community, and rewards feeding each other. We’d rather ship what’s next than announce it.',
            })}
          </p>
        </div>
        <div className="fp-vision-card">
          <p>
            {t('founderV2.vision.cardPre', {
              defaultValue: 'The app is chapter one. What comes next stays inside the club — ',
            })}
            <span className="fp-accent">
              {t('founderV2.vision.cardAccent', {
                defaultValue: 'what never changes is that showing up counts.',
              })}
            </span>
          </p>
        </div>
      </section>

      {/* ── Join CTA ── */}
      <section className="fp-join">
        <div className="fp-join-inner">
          <h2 className="fp-join-h2">
            <ScrollRevealText as="span" className="fp-line">
              {joinLine1}
            </ScrollRevealText>
            <ScrollRevealText as="span" className="fp-line fp-line--accent">
              {joinAccent}
            </ScrollRevealText>
          </h2>
          <p className="fp-join-body">
            {t('founderV2.joinCta.body', {
              defaultValue: 'Cash challenges open on launch day — your 30 days start the moment you join. Founding Members are first through the door.',
            })}
          </p>
          <div className="fp-join-actions">
            {/* The old challenge + pricing paths are redirects now — link the
                live routes (/join, /membership) directly. */}
            <Link to="/join" className="fp-btn-primary">
              {t('founderV2.joinCta.ctaPrimary', { defaultValue: 'Become a Founding Member →' })}
            </Link>
            <Link to="/membership" className="fp-btn-secondary">
              {t('founderV2.joinCta.ctaSecondary', { defaultValue: 'See membership' })}
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
