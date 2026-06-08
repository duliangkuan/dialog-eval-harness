'use client';

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: React.CSSProperties;
  onClick?: () => void;
  className?: string;
}

export function Card({ children, style, onClick, className }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        padding: 24,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.2s ease',
        ...style,
      }}
      className={className}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.boxShadow = 'var(--shadow)';
        }
      }}
    >
      {children}
    </div>
  );
}
