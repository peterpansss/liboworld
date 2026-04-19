import { ICON_STROKE, resolveIcon, type LucideIcon } from '../utils/icons';

interface EmojiIconProps {
  emoji?: string;
  icon?: LucideIcon;
  size?: number;
  color?: string;
  strokeWidth?: number;
  fallback?: LucideIcon;
  className?: string;
}

export function EmojiIcon({
  emoji,
  icon,
  size = 20,
  color,
  strokeWidth = ICON_STROKE,
  fallback,
  className,
}: EmojiIconProps) {
  const Icon = icon ?? resolveIcon(emoji, fallback);
  return (
    <Icon
      size={size}
      strokeWidth={strokeWidth}
      color={color}
      className={className}
    />
  );
}
