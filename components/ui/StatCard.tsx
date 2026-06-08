'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  trend?: 'up' | 'down';
}

export function StatCard({ label, value, sub, trend }: StatCardProps) {
  return (
    <div
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: 24,
        flex: 1,
        minWidth: 180,
      }}
    >
      <div
        style={{
          fontSize: 12,
          color: 'var(--ink-muted)',
          marginBottom: 8,
          fontWeight: 500,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--ink)',
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            fontSize: 12,
            color:
              trend === 'up' ? 'var(--success)' :
              trend === 'down' ? 'var(--error)' : 'var(--ink-muted)',
            marginTop: 6,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
