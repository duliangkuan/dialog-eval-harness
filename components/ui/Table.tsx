'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  title: string | ReactNode;
  align?: 'left' | 'center' | 'right';
  mono?: boolean;
  muted?: boolean;
  render?: (value: any, row: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
}

export function Table<T>({ columns, data, onRowClick }: TableProps<T>) {
  return (
    <div style={{ overflowX: 'auto', position: 'relative' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((col) => (
            <th
              key={col.key}
              style={{
                textAlign: col.align || 'left',
                padding: '12px 16px',
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--ink-muted)',
                borderBottom: '2px solid var(--border)',
                whiteSpace: 'nowrap',
                letterSpacing: '0.02em',
              }}
            >
              {col.title}
            </th>
          ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              style={{
                cursor: onRowClick ? 'pointer' : 'default',
                transition: 'background 0.1s',
              }}
              onClick={() => onRowClick?.(row)}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(74, 155, 127, 0.03)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border-light)',
                    fontSize: 13,
                    fontFamily: col.mono ? 'var(--font-mono)' : 'inherit',
                    color: col.muted ? 'var(--ink-muted)' : 'var(--ink)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.render ? col.render((row as any)[col.key], row) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
