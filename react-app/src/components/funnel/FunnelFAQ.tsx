import { useState } from 'react';
import { colors } from '../../theme';

export type FaqItem = { q: string; a: string };

type Props = {
  items: FaqItem[];
};

export default function FunnelFAQ({ items }: Props) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <div
            key={i}
            style={{
              borderTop: i === 0 ? '1px solid ' + colors.border : 'none',
              borderBottom: '1px solid ' + colors.border,
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 16,
                padding: '20px 4px',
                background: 'transparent',
                border: 'none',
                color: colors.text,
                fontFamily: 'inherit',
                fontSize: 16,
                fontWeight: 600,
                textAlign: 'left',
                cursor: 'pointer',
              }}
            >
              <span>{it.q}</span>
              <span aria-hidden="true" style={{ color: colors.accent, fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
                {isOpen ? '−' : '+'}
              </span>
            </button>
            {isOpen && (
              <div style={{ padding: '0 4px 20px', color: colors.muted, fontSize: 14, lineHeight: 1.6 }}>
                {it.a}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
