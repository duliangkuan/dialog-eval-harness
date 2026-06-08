'use client';

import { PageHeader, Card, Button } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { Badge } from '../ui/Badge';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { experiments } = useAppContext();
  const recentExperiments = experiments.slice(0, 3);

  return (
    <div>
      <PageHeader
        title="项目概览"
        subtitle="Echo 评测系统运行状态一览"
      />

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        {[
          { label: '发起评测', desc: '选择提示词 + 测试集批量跑', page: 'experiments' },
          { label: '在线调试', desc: '单条对话快速验证', page: 'debug' },
          { label: '新建评估员', desc: '自定义评估策略', page: 'evaluators' },
          { label: '模型管理', desc: '配置 API Key', page: 'models' },
        ].map((item) => (
          <div
            key={item.label}
            onClick={() => onNavigate(item.page)}
            style={{
              flex: 1,
              minWidth: 180,
              padding: '16px 20px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              background: 'var(--bg-card)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.background = 'var(--accent-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--bg-card)';
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>
              {item.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
              {item.desc}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        <Card>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 16,
              fontFamily: 'var(--font-display)',
            }}
          >
            最近实验
          </div>
          {recentExperiments.map((exp) => (
            <div
              key={exp.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid var(--border-light)',
              }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{exp.topic}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 4 }}>
                  {exp.testSetId} · {exp.startedAt}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {exp.duration && (
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {exp.duration}
                  </span>
                )}
                <Badge
                  type={
                    exp.status === 'completed' ? 'success' :
                    exp.status === 'failed' ? 'error' : 'warning'
                  }
                >
                  {exp.status === 'completed' ? '完成' :
                   exp.status === 'failed' ? '失败' :
                   exp.status === 'running' ? '运行中' : '等待中'}
                </Badge>
              </div>
            </div>
          ))}
          <div style={{ marginTop: 12 }}>
            <Button variant="ghost" size="sm" onClick={() => onNavigate('experiments')}>
              查看全部实验 →
            </Button>
          </div>
        </Card>

        <Card>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              marginBottom: 16,
              fontFamily: 'var(--font-display)',
            }}
          >
            准确率趋势（近 7 次）
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 8,
              height: 140,
              padding: '0 8px',
            }}
          >
            {[88, 91, 89, 93, 94, 92, 93.4].map((val, idx) => {
              const height = ((val - 80) / 20) * 120;
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                    {val}%
                  </span>
                  <div
                    style={{
                      width: '100%',
                      height,
                      background: idx === 6 ? 'var(--accent)' : 'var(--accent-light)',
                      borderRadius: '4px 4px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                </div>
              );
            })}
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '8px 8px 0',
              fontSize: 11,
              color: 'var(--ink-light)',
            }}
          >
            <span>#41</span>
            <span>#42</span>
            <span>#43</span>
            <span>#44</span>
            <span>#45</span>
            <span>#46</span>
            <span>#47</span>
          </div>
        </Card>
      </div>

    </div>
  );
}
