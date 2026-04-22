import { colors } from '../../theme';

export function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div
      style={{
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        padding: 20,
        minWidth: 160,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: colors.muted,
          textTransform: 'uppercase',
          letterSpacing: 0.6,
          marginBottom: 10,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'Barlow Condensed, sans-serif',
          fontSize: 40,
          fontWeight: 700,
          color: colors.text,
          lineHeight: 1,
          textTransform: 'uppercase',
        }}
      >
        {value}
      </div>
      {hint && (
        <div style={{ fontSize: 12, color: colors.dim, marginTop: 8 }}>{hint}</div>
      )}
    </div>
  );
}
