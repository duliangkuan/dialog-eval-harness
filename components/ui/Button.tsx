'use client';

import { ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  style,
  className,
}: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'inherit',
    fontWeight: 500,
    borderRadius: 'var(--radius-sm)',
    transition: 'all 0.15s ease',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    opacity: disabled ? 0.6 : 1,
    ...style,
  };

  const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
    sm: { fontSize: 12, padding: '5px 12px' },
    md: { fontSize: 13, padding: '8px 18px' },
    lg: { fontSize: 14, padding: '10px 24px' },
  };

  const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
    primary: { background: 'var(--accent)', color: '#fff' },
    secondary: { background: 'var(--bg-warm)', color: 'var(--ink)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--accent)' },
    danger: { background: 'var(--error-light)', color: 'var(--error)' },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...baseStyle, ...sizeStyles[size], ...variantStyles[variant] }}
      className={className}
    >
      {children}
    </button>
  );
}
