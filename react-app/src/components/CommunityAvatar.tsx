// Placeholder avatar used by CommunityConstellation. Renders an
// intentional-looking gradient circle with initials, sized like a real
// avatar so the section reads as "design choice" rather than "missing
// photo." When real member photos arrive, add an optional `image` prop
// here and branch on its presence — the wrapping <div> styling stays
// identical so the swap is invisible at the layout level.

export type AvatarGradient = 'a' | 'b' | 'c' | 'd' | 'e';

const GRADIENTS: Record<AvatarGradient, string> = {
  a: 'linear-gradient(135deg, #1a1a1a 0%, #2d3338 100%)',
  b: 'linear-gradient(135deg, #1c2419 0%, #2a3526 100%)',
  c: 'linear-gradient(135deg, #1a1d20 0%, #34383d 100%)',
  d: 'linear-gradient(135deg, #0f1418 0%, #2a3038 100%)',
  e: 'linear-gradient(135deg, #1a1a1a 0%, #404040 100%)',
};

type Props = {
  initials: string;
  gradient: AvatarGradient;
  size: number;
};

export default function CommunityAvatar({ initials, gradient, size }: Props) {
  return (
    <div
      className="community-avatar"
      style={{
        width: size,
        height: size,
        background: GRADIENTS[gradient],
        fontSize: Math.round(size * 0.4),
      }}
      aria-hidden="true"
    >
      <span>{initials}</span>
    </div>
  );
}
