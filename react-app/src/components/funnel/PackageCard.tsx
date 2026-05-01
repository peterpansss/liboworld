import { colors } from '../../theme';

export type PackageHighlight = 'entry' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'starter' | 'pro' | 'elite';

export type PackageInclusion = {
  /** Big number, e.g. "5", "1 Month", "€15" */
  value: string;
  /** Subtext under the number, e.g. "free entries", "Pro access" */
  label: string;
};

type Props = {
  /** Top label, e.g. "BRONZE" or "STARTER" */
  name: string;
  /** Hero number on card (e.g. "5", "100"). The big visual anchor. */
  hero: string;
  /** Label under hero number, e.g. "FREE BONUS ENTRIES" */
  heroLabel: string;
  /** Big price label, e.g. "€10" or "Free" */
  price: string;
  /** Small text under the price, e.g. "single payment · one-time" */
  priceSubline?: string;
  /** Highlight ribbon e.g. "MOST POPULAR" */
  badge?: string;
  /** Color theme of the card */
  highlight: PackageHighlight;
  /** Compact perk chips above the price (e.g. "+1 mo / +500 XP") */
  perks?: PackageInclusion[];
  /** CTA button text e.g. "SELECT" or "RESERVE MY SLOT" */
  ctaLabel: string;
  /** Click handler — opens shared modal */
  onSelect: () => void;
};

const HIGHLIGHT_COLORS: Record<PackageHighlight, { bg: string; border: string; accent: string; chip: string }> = {
  entry:    { bg: 'linear-gradient(165deg, #4a8fcf 0%, #2c5a8a 100%)', border: '#7ab0e0', accent: '#bce0ff', chip: 'rgba(255,255,255,0.18)' },
  bronze:   { bg: 'linear-gradient(165deg, #c08552 0%, #6f4422 100%)', border: '#d9a877', accent: '#ffe0bf', chip: 'rgba(255,255,255,0.18)' },
  silver:   { bg: 'linear-gradient(165deg, #6e7780 0%, #353a40 100%)', border: '#9aa0aa', accent: '#dde2e8', chip: 'rgba(255,255,255,0.18)' },
  gold:     { bg: 'linear-gradient(165deg, #d4a82e 0%, #8a6a14 100%)', border: '#f3d06f', accent: '#fff3c2', chip: 'rgba(255,255,255,0.18)' },
  platinum: { bg: 'linear-gradient(165deg, #8b5fbf 0%, #4a2d70 100%)', border: '#b58be0', accent: '#e6d4ff', chip: 'rgba(255,255,255,0.18)' },
  starter:  { bg: 'linear-gradient(165deg, #5a6a7a 0%, #2a323a 100%)', border: 'rgba(255,255,255,0.25)', accent: '#cfd8e0', chip: 'rgba(255,255,255,0.18)' },
  pro:      { bg: 'linear-gradient(165deg, #4d8f3a 0%, #244520 100%)', border: colors.accent, accent: colors.accent, chip: 'rgba(255,255,255,0.2)' },
  elite:    { bg: 'linear-gradient(165deg, #d4a82e 0%, #8a6a14 100%)', border: '#facc15', accent: '#fff3c2', chip: 'rgba(255,255,255,0.18)' },
};

export default function PackageCard({
  name,
  hero,
  heroLabel,
  price,
  priceSubline,
  badge,
  highlight,
  perks,
  ctaLabel,
  onSelect,
}: Props) {
  const palette = HIGHLIGHT_COLORS[highlight];

  return (
    <article
      style={{
        position: 'relative',
        borderRadius: 16,
        padding: '24px 16px 16px',
        background: palette.bg,
        border: '1px solid ' + palette.border,
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'center',
        boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
        transition: 'transform 0.15s ease, box-shadow 0.2s ease',
      }}
      className="funnel-package-card"
    >
      {badge && (
        <span
          style={{
            position: 'absolute',
            top: -10,
            left: '50%',
            transform: 'translateX(-50%)',
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            padding: '5px 12px',
            borderRadius: 6,
            background: '#FF6A1A',
            color: '#fff',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}
        >
          {badge}
        </span>
      )}

      <div
        className="font-display"
        style={{
          fontSize: 13,
          letterSpacing: 2,
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.85)',
          marginBottom: 4,
          fontWeight: 700,
        }}
      >
        {name}
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1.5, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: 16 }}>
        Package
      </div>

      <div
        className="font-display"
        style={{
          fontSize: 56,
          lineHeight: 1,
          color: '#fff',
          letterSpacing: '-1px',
          fontWeight: 900,
        }}
      >
        {hero}
      </div>
      <div
        style={{
          fontSize: 10,
          fontWeight: 800,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#fff',
          marginTop: 4,
          marginBottom: 16,
          fontStyle: 'italic',
        }}
      >
        {heroLabel}
      </div>

      {perks && perks.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 4, marginBottom: 12 }}>
          {perks.map((p, i) => (
            <span
              key={i}
              style={{
                fontSize: 10,
                padding: '3px 8px',
                borderRadius: 100,
                background: palette.chip,
                color: '#fff',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              +{p.value} {p.label}
            </span>
          ))}
        </div>
      )}

      <div
        className="font-display"
        style={{ fontSize: 32, lineHeight: 1, color: '#fff', fontWeight: 900, marginBottom: 4 }}
      >
        {price}
      </div>
      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.65)', marginBottom: 16, fontStyle: 'italic' }}>
        {priceSubline ?? ' '}
      </div>

      <button
        type="button"
        onClick={onSelect}
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          border: 'none',
          background: '#fff',
          color: '#1a1a1a',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          cursor: 'pointer',
          transition: 'transform 0.12s ease, background 0.15s ease',
          boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        }}
        onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.97)'; }}
        onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
      >
        {ctaLabel}
      </button>
    </article>
  );
}
