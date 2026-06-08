'use client';

import { ReactNode } from 'react';

interface ModalProps {
  title: string;
  open: boolean;
  onClose: () => void;
  width?: number;
  children: ReactNode;
}

export function Modal({ title, open, onClose, width = 640, children }: ModalProps) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(45, 45, 45, 0.3)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'relative',
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-lg)',
          width,
          maxHeight: '85vh',
          overflow: 'auto',
          padding: 32,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              fontWeight: 600,
            }}
          >
            {title}
          </h2>
          <span
            style={{
              cursor: 'pointer',
              fontSize: 20,
              color: 'var(--ink-muted)',
              lineHeight: 1,
            }}
            onClick={onClose}
          >
            ×
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
