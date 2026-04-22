import { useMemo, useState } from 'react';
import { colors } from '../../theme';

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => React.ReactNode;
  sort?: (a: T, b: T) => number;
  width?: string | number;
  align?: 'left' | 'right' | 'center';
};

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyLabel?: string;
  dense?: boolean;
};

export function DataTable<T>({ rows, columns, rowKey, onRowClick, emptyLabel = 'No data', dense }: Props<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sort) return rows;
    const copy = [...rows].sort(col.sort);
    return sortDir === 'asc' ? copy : copy.reverse();
  }, [rows, columns, sortKey, sortDir]);

  const toggleSort = (key: string, sortable: boolean) => {
    if (!sortable) return;
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  const cellPad = dense ? '8px 10px' : '12px 14px';

  return (
    <div style={{ background: colors.bg2, borderRadius: 12, border: `1px solid ${colors.border}`, overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: colors.bg3, borderBottom: `1px solid ${colors.border}` }}>
            {columns.map((c) => (
              <th
                key={c.key}
                onClick={() => toggleSort(c.key, Boolean(c.sort))}
                style={{
                  padding: cellPad,
                  textAlign: c.align ?? 'left',
                  color: colors.muted,
                  fontWeight: 600,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  cursor: c.sort ? 'pointer' : 'default',
                  userSelect: 'none',
                  width: c.width,
                  whiteSpace: 'nowrap',
                }}
              >
                {c.header}
                {sortKey === c.key && <span style={{ marginLeft: 6 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} style={{ padding: 40, textAlign: 'center', color: colors.muted }}>
                {emptyLabel}
              </td>
            </tr>
          ) : (
            sorted.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderBottom: `1px solid ${colors.border}`,
                  cursor: onRowClick ? 'pointer' : 'default',
                  color: colors.text,
                  transition: 'background 120ms ease',
                }}
                onMouseEnter={(e) => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = colors.bg3; }}
                onMouseLeave={(e) => { if (onRowClick) (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                {columns.map((c) => (
                  <td key={c.key} style={{ padding: cellPad, textAlign: c.align ?? 'left', verticalAlign: 'middle' }}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
