/**
 * Pricing section for the public landing page.
 *
 * Card grid over VISIBLE_TIERS: Free / Premium (highlighted) at launch. Elite
 * is deferred (see VISIBLE_TIER_IDS in data/tiers.ts) but its data is kept for
 * relaunch. Monthly/Yearly toggle at the top. Copy mirrors the mobile paywall:
 *   - Premium: €12.99/mo or €6.67/mo billed annually (€79.99/yr, 49% off), 1 freeze token, 2x points, €50 pools
 *   - Elite (deferred): €19.99/mo or €149/yr, 3 freeze tokens, 3x points
 * Premium: 7-day free trial.
 *
 * Tier-by-feature policy (PARTNERSHIP-FINANCE-MODEL.md, Y1):
 *   - Cash challenges run on ALL tiers; stakes scale by tier
 *     (Free €5–15 / Premium €15–50 / Elite €50–250+).
 *   - Common product giveaways: all tiers.
 *   - Premium + Special giveaways (e.g. iPhone-class items): Premium AND Elite.
 *   - "Elite-exclusive" framing is reserved for genuinely rare campaigns
 *     (€5k+, experiences) — not the Premium-class items.
 *
 * Source of truth for numbers: Brand-Management/Project-Structure/TIER-STRATEGY.md
 * and libo-app-v2/src/constants/tierFeatures.ts. These values are duplicated
 * here because the landing builds in isolation (no monorepo import possible).
 * If tier numbers change there, update them here too.
 *
 * Intentionally styled with inline styles for the common case; hover +
 * stacking rules live in Landing.css under the `.pricing-*` scope.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { colors, webExtras } from '../theme';
import { VISIBLE_TIERS, YEARLY_PRICE, YEARLY_DISCOUNT, TRIAL_DAYS, buildHref, type Tier, type BillingCycle } from '../data/tiers';

// ── Styles ──
const sectionStyle: React.CSSProperties = {
  padding: '120px 40px',
  borderTop: '1px solid ' + colors.border,
  background: webExtras.bgDeep,
};

const innerStyle: React.CSSProperties = {
  maxWidth: 1100,
  margin: '0 auto',
};

const headerStyle: React.CSSProperties = {
  textAlign: 'center',
  marginBottom: 32,
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: 2,
  textTransform: 'uppercase',
  color: colors.accent,
  marginBottom: 16,
  display: 'block',
};

const subStyle: React.CSSProperties = {
  marginTop: 20,
  fontSize: 16,
  lineHeight: 1.6,
  color: colors.muted,
  maxWidth: 560,
  marginLeft: 'auto',
  marginRight: 'auto',
};

// Cycle toggle
const toggleWrapStyle: React.CSSProperties = {
  display: 'inline-flex',
  gap: 4,
  padding: 4,
  borderRadius: 100,
  border: '1px solid ' + colors.border,
  background: colors.bg2,
  marginBottom: 48,
};

function toggleButtonStyle(active: boolean): React.CSSProperties {
  return {
    border: 'none',
    background: active ? colors.accent : 'transparent',
    color: active ? webExtras.accentText : colors.muted,
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    padding: '8px 18px',
    borderRadius: 100,
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  };
}

// Card variant styles
function cardStyle(highlight: Tier['highlight']): React.CSSProperties {
  if (highlight === 'accent') {
    return {
      background: colors.bg2,
      border: '1px solid ' + colors.accent,
      boxShadow: '0 0 0 1px ' + colors.accent + ', 0 20px 48px rgba(202,255,0,0.08)',
      transform: 'translateY(-8px)',
    };
  }
  if (highlight === 'warning') {
    return {
      background: colors.bg2,
      border: '1px solid ' + colors.warning,
      boxShadow: '0 16px 40px rgba(234,179,8,0.08)',
    };
  }
  return {
    background: colors.bg2,
    border: '1px solid ' + colors.border,
  };
}

function badgeStyle(highlight: Tier['highlight']): React.CSSProperties {
  const isAccent = highlight === 'accent';
  return {
    position: 'absolute',
    top: -14,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    padding: '6px 14px',
    borderRadius: 8,
    background: isAccent ? colors.accent : colors.warning,
    color: webExtras.accentText,
    whiteSpace: 'nowrap',
  };
}

function ctaStyle(highlight: Tier['highlight']): React.CSSProperties {
  const base: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'center',
    padding: '14px 20px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    letterSpacing: 0.5,
    textDecoration: 'none',
    transition: 'opacity 0.2s, transform 0.2s',
    marginTop: 28,
    fontFamily: 'inherit',
    border: 'none',
    cursor: 'pointer',
  };
  if (highlight === 'accent') {
    return { ...base, background: colors.accent, color: webExtras.accentText };
  }
  if (highlight === 'warning') {
    return { ...base, background: colors.warning, color: webExtras.accentText };
  }
  return {
    ...base,
    background: 'transparent',
    color: colors.text,
    border: '1px solid ' + colors.border,
  };
}

// ── Component ──
export default function PricingSection() {
  const [cycle, setCycle] = useState<BillingCycle>('yearly');

  return (
    <section id="pricing" style={sectionStyle} aria-labelledby="pricing-heading">
      <div style={innerStyle}>
        <header style={headerStyle}>
          <span style={labelStyle}>Pricing</span>
          <h2
            id="pricing-heading"
            className="display display-md font-display"
            style={{ margin: 0 }}
          >
            Simple pricing. Real rewards.
          </h2>
          <p style={subStyle}>
            Start free. Upgrade when you want the full library, smarter tools, and bigger
            challenges. {TRIAL_DAYS}-day free trial on Premium.
          </p>
        </header>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            role="tablist"
            aria-label="Billing cycle"
            style={toggleWrapStyle}
          >
            <button
              type="button"
              role="tab"
              aria-selected={cycle === 'monthly'}
              onClick={() => setCycle('monthly')}
              style={toggleButtonStyle(cycle === 'monthly')}
            >
              Monthly
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={cycle === 'yearly'}
              onClick={() => setCycle('yearly')}
              style={toggleButtonStyle(cycle === 'yearly')}
            >
              Yearly
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: 6,
                  background:
                    cycle === 'yearly' ? webExtras.accentText : colors.accent,
                  color:
                    cycle === 'yearly' ? colors.accent : webExtras.accentText,
                }}
              >
                Save up to {YEARLY_DISCOUNT.premium}%
              </span>
            </button>
          </div>
        </div>

        <div className="pricing-grid">
          {VISIBLE_TIERS.map((tier) => {
            const priceLabel =
              cycle === 'monthly' ? tier.monthlyLabel : tier.yearlyLabel;
            const priceSub =
              cycle === 'monthly' ? tier.monthlySubline : tier.yearlySubline;
            return (
              <article
                key={tier.id}
                className="pricing-card"
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  padding: '40px 28px 32px',
                  display: 'flex',
                  flexDirection: 'column',
                  ...cardStyle(tier.highlight),
                }}
              >
                {tier.badge && <span style={badgeStyle(tier.highlight)}>{tier.badge}</span>}

                <div
                  className="font-display"
                  style={{
                    fontSize: 20,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: colors.text,
                    marginBottom: 8,
                  }}
                >
                  {tier.name}
                </div>

                <div
                  style={{
                    fontSize: 13,
                    color: colors.muted,
                    marginBottom: 20,
                    minHeight: 20,
                  }}
                >
                  {tier.tagline}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
                  <span
                    className="font-display"
                    style={{
                      fontSize: 56,
                      lineHeight: 1,
                      letterSpacing: '-1px',
                      color: colors.text,
                    }}
                  >
                    {priceLabel}
                  </span>
                  <span style={{ fontSize: 14, color: colors.muted }}>{priceSub}</span>
                </div>
                {cycle === 'yearly' && (tier.id === 'premium' || tier.id === 'elite') && (
                  <div style={{ fontSize: 12, color: colors.muted, opacity: 0.8, marginBottom: 6 }}>
                    €{YEARLY_PRICE[tier.id].toFixed(2)}/year · save {YEARLY_DISCOUNT[tier.id]}%
                  </div>
                )}

                {/* Trial line — only on paid tiers */}
                <div
                  style={{
                    fontSize: 13,
                    color:
                      tier.id === 'free'
                        ? 'transparent'
                        : tier.highlight === 'accent'
                          ? colors.accent
                          : colors.warning,
                    fontWeight: 600,
                    minHeight: 18,
                    marginBottom: 24,
                  }}
                >
                  {tier.id === 'free' ? '—' : `${TRIAL_DAYS} days free, cancel anytime`}
                </div>

                <ul
                  style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    flex: 1,
                  }}
                >
                  {tier.features.map((feat) => (
                    <li
                      key={feat}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                        fontSize: 14,
                        lineHeight: 1.5,
                        color: colors.text,
                      }}
                    >
                      <span
                        aria-hidden="true"
                        style={{
                          color:
                            tier.highlight === 'accent'
                              ? colors.accent
                              : tier.highlight === 'warning'
                                ? colors.warning
                                : colors.muted,
                          fontWeight: 700,
                          flexShrink: 0,
                          lineHeight: 1.5,
                        }}
                      >
                        {'✓'}
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={buildHref(tier.href, tier.id, cycle)}
                  style={ctaStyle(tier.highlight)}
                  className="pricing-cta"
                >
                  {tier.cta}
                </Link>
              </article>
            );
          })}
        </div>

        <p
          style={{
            marginTop: 40,
            textAlign: 'center',
            fontSize: 13,
            color: colors.muted,
          }}
        >
          {TRIAL_DAYS}-day free trial on Premium. Cancel anytime. No ads, ever.
        </p>
      </div>
    </section>
  );
}
