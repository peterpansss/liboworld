import { Link } from 'react-router-dom';
import { colors, webExtras } from '../theme';

// ── Tier data (source of truth: Brand-Management/Project-Structure/TIER-STRATEGY.md) ──
type Tier = {
  id: 'free' | 'premium' | 'elite';
  name: string;
  priceMonthly: string;
  priceSuffix: string;
  annualLine?: string;
  badge?: string;
  features: string[];
  cta: string;
  href: string;
  highlight: 'none' | 'accent' | 'warning';
};

const TIERS: Tier[] = [
  {
    id: 'free',
    name: 'Free',
    priceMonthly: '€0',
    priceSuffix: 'forever',
    features: [
      '20 curated workouts',
      'Reps & kg tracking',
      'Basic progress charts',
      'Rewards program',
      'Entry-level money challenges (€5–15)',
    ],
    cta: 'Get started',
    href: '/onboarding',
    highlight: 'none',
  },
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: '€9',
    priceSuffix: '/month',
    annualLine: 'or €90/year — 17% off',
    badge: 'Most popular',
    features: [
      'Everything in Free',
      'Full 140-workout library',
      'Custom workout builder',
      'AI workout generator',
      'Advanced analytics',
      '2× rewards points',
      'Mid-tier money challenges (€15–50)',
      'Premium giveaways',
    ],
    cta: 'Start free trial',
    href: '/onboarding?tier=premium',
    highlight: 'accent',
  },
  {
    id: 'elite',
    name: 'Elite',
    priceMonthly: '€19',
    priceSuffix: '/month',
    annualLine: 'or €190/year',
    badge: 'Elite',
    features: [
      'Everything in Premium',
      'Exclusive seasonal workouts',
      'Elite money challenges (€50–250+)',
      'Real-money giveaways',
      'Creator perks',
      'Early access to new features',
    ],
    cta: 'Join Elite',
    href: '/onboarding?tier=elite',
    highlight: 'warning',
  },
];

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
  marginBottom: 56,
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

// ── Card variant styles ──
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
            challenges.
          </p>
        </header>

        <div className="pricing-grid">
          {TIERS.map((tier) => (
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
                  marginBottom: 16,
                }}
              >
                {tier.name}
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
                  {tier.priceMonthly}
                </span>
                <span style={{ fontSize: 14, color: colors.muted }}>{tier.priceSuffix}</span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: colors.muted,
                  minHeight: 18,
                  marginBottom: 24,
                }}
              >
                {tier.annualLine || ''}
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

              <Link to={tier.href} style={ctaStyle(tier.highlight)} className="pricing-cta">
                {tier.cta}
              </Link>
            </article>
          ))}
        </div>

        <p
          style={{
            marginTop: 40,
            textAlign: 'center',
            fontSize: 13,
            color: colors.muted,
          }}
        >
          7-day free trial on Premium. Cancel anytime. No ads, ever.
        </p>
      </div>
    </section>
  );
}
