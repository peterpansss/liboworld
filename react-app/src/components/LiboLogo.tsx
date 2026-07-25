// Inline SVG version of /brand/logo_options/libo-dark.svg.
// Rendered as a real DOM node (not an <img src>) so the SVG's <text>
// elements use the page's @fontsource Barlow Condensed / Inter. Loaded
// as an <img>, the SVG runs in an isolated document with no access to
// the host's fonts, falls back to system sans-serif on iOS, and "LIBO"
// renders wide enough to cover the start of "TRAINING CLUB".

type Props = {
  className?: string;
  ariaLabel?: string;
  // When true, render only the dots + "LIBO" wordmark (omit "TRAINING CLUB"
  // subtext) with a tightened viewBox. Use at small render heights (≲28px)
  // where the subtext is illegible.
  compact?: boolean;
};

export default function LiboLogo({
  className,
  ariaLabel = 'Libo World · Training Club',
  compact = false,
}: Props) {
  return (
    <svg
      className={className}
      viewBox={compact ? '0 0 300 140' : '0 0 460 140'}
      fill="none"
      role="img"
      aria-label={compact ? 'Libo World' : ariaLabel}
    >
      <circle cx="146" cy="42" r="4" fill="#CAFF00" />
      <circle cx="166" cy="30" r="6.5" fill="#CAFF00" />
      <circle cx="192" cy="18" r="10" fill="#CAFF00" />
      <text
        x="108"
        y="122"
        fontFamily="'Barlow Condensed', 'Arial Narrow', sans-serif"
        fontWeight={900}
        fontSize={92}
        fill="#FFFFFF"
        letterSpacing="2"
      >
        LIBO
      </text>
      {!compact && (
        <text
          x="304"
          y="118"
          fontFamily="'Inter', 'Helvetica Neue', sans-serif"
          fontWeight={600}
          fontSize={12}
          fill="#FFFFFF"
          letterSpacing="3"
          fillOpacity={0.7}
        >
          TRAINING CLUB
        </text>
      )}
    </svg>
  );
}
