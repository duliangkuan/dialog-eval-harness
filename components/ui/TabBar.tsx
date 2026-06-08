'use client';

interface Tab {
  key: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
}

export function TabBar({ tabs, active, onChange }: TabBarProps) {
  return (
    <div style={{
      display: 'flex',
      gap: 0,
      borderBottom: '2px solid var(--border-light)',
      marginBottom: 24,
    }}>
      {tabs.map(t => (
        <div
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            padding: '10px 20px',
            fontSize: 13,
            fontWeight: active === t.key ? 600 : 400,
            cursor: 'pointer',
            color: active === t.key ? 'var(--accent-dark)' : 'var(--ink-muted)',
            borderBottom: active === t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -2,
            transition: 'all 0.15s ease',
          }}
        >
          {t.label}
        </div>
      ))}
    </div>
  );
}
