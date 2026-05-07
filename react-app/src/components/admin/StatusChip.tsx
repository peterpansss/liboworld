import { colors } from '../../theme';
import type { ContentStatus } from '../../lib/adminApi';

function statusStyle(status: ContentStatus): React.CSSProperties {
  if (status === 'published') return { background: colors.successDim, color: colors.success };
  if (status === 'archived') return { background: colors.bg3, color: colors.muted };
  return { background: colors.warningDim, color: colors.warning };
}

export function StatusChip({ status }: { status: ContentStatus }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '3px 10px',
        borderRadius: 8,
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        ...statusStyle(status),
      }}
    >
      {status}
    </span>
  );
}
