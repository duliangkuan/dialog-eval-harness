'use client';

import { ReactNode } from 'react';

type BadgeType = 'default' | 'success' | 'error' | 'warning' | 'accent';

interface BadgeProps {
  children: ReactNode;
  type?: BadgeType;
}

export function Badge({ children, type = 'default' }: BadgeProps) {
  const colors: Record<BadgeType, { bg: string; color: string }> = {
    default: { bg: 'var(--border-light)', color: 'var(--ink-muted)' },
    success: { bg: 'var(--success-light)', color: 'var(--success)' },
    error: { bg: 'var(--error-light)', color: 'var(--error)' },
    warning: { bg: 'var(--warning-light)', color: 'var(--warning)' },
    accent: { bg: 'var(--accent-light)', color: 'var(--accent-dark)' },
  };

  const color = colors[type] || colors.default;

  return (
    <span
      style={{
        display: 'inline-block',
        fontSize: 12,
        padding: '2px 10px',
        borderRadius: 'var(--radius-xs)',
        background: color.bg,
        color: color.color,
        fontWeight: 500,
      }}
    >
      {children}
    </span>
  );
}
