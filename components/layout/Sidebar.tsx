'use client';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const sections = [
    {
      label: '概览',
      items: [{ key: 'dashboard', label: '项目概览', icon: '◈' }],
    },
    {
      label: 'Prompt 管理',
      items: [
        { key: 'intents', label: '意图管理', icon: '◇' },
      ],
    },
    {
      label: '测试集管理',
      items: [
        { key: 'testsets', label: '测试集列表', icon: '▦' },
        { key: 'experiments', label: '自动化评测', icon: '▶' },
      ],
    },
    {
      label: '评估',
      items: [
        { key: 'evaluators', label: '评估员管理', icon: '◉' },
        { key: 'results', label: '评测结果', icon: '◫' },
        { key: 'visualization', label: '结果可视化', icon: '◰' },
      ],
    },
    {
      label: '工具',
      items: [{ key: 'debug', label: '在线调试', icon: '⟐' }],
    },
    {
      label: '设置',
      items: [{ key: 'models', label: '模型管理', icon: '⬡' }],
    },
  ];

  return (
    <div
      style={{
        width: 240,
        minWidth: 240,
        height: '100vh',
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 22,
            fontWeight: 700,
            color: 'var(--ink)',
            letterSpacing: '0.02em',
          }}
        >
          Echo
        </div>
        <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
          多轮对话模型评测系统
        </div>
      </div>
      <nav style={{ flex: 1, overflow: 'auto', padding: '12px 0' }}>
        {sections.map((sec) => (
          <div key={sec.label} style={{ padding: '0 12px', marginBottom: 4 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--ink-light)',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.08em',
                padding: '12px 8px 6px',
                userSelect: 'none',
              }}
            >
              {sec.label}
            </div>
            {sec.items.map((item) => (
              <div
                key={item.key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: currentPage === item.key ? 500 : 400,
                  transition: 'all 0.15s ease',
                  background: currentPage === item.key ? 'var(--accent-light)' : 'transparent',
                  color: currentPage === item.key ? 'var(--accent-dark)' : 'var(--ink)',
                }}
                onClick={() => onNavigate(item.key)}
                onMouseEnter={(e) => {
                  if (currentPage !== item.key) {
                    e.currentTarget.style.background = 'rgba(74, 155, 127, 0.06)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== item.key) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ fontSize: 14, opacity: 0.7 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </nav>
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border)',
          fontSize: 12,
          color: 'var(--ink-muted)',
        }}
      >
        v0.1.0 · 内部版
      </div>
    </div>
  );
}
