'use client';

interface EmptyStateProps {
  text: string;
}

export function EmptyState({ text }: EmptyStateProps) {
  return (
    <div style={{ padding: '48px', textAlign: 'center', color: 'var(--ink-muted)', fontSize: '13px' }}>
      {text}
    </div>
  );
}
