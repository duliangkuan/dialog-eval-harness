'use client';

import { useState } from 'react';
import { PageHeader, StatCard, Card, MiniDonut } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { MOCK_EVAL_RESULTS, MOCK_EXPERIMENT_DETAILS } from '@/lib/store/mock-data';

type MetricKey = 'recall' | 'precision' | 'f1';

export function Visualization() {
  const { experiments, selectedExperimentId, setSelectedExperimentId, testSets, evaluators } = useAppContext();
  const completedExperiments = experiments.filter((e) => e.status === 'completed');
  const [metric, setMetric] = useState<MetricKey>('recall');
  const [filterIntent, setFilterIntent] = useState<string>('全部');

  const currentId = selectedExperimentId || (completedExperiments.length > 0 ? completedExperiments[0].id : null);
  const currentExperiment = experiments.find((e) => e.id === currentId);
  const caseDetails = currentId ? MOCK_EXPERIMENT_DETAILS[currentId] || [] : [];

  // Get unique intents for filter
  const uniqueIntents = Array.from(new Set(caseDetails.map((c) => c.expectedIntent)));

  // Filter cases by selected intent
  const filteredCases = filterIntent === '全部'
    ? caseDetails
    : caseDetails.filter((c) => c.expectedIntent === filterIntent);

  // Compute per-intent stats from filtered case details
  const intentStats = (() => {
    if (filteredCases.length === 0) return MOCK_EVAL_RESULTS;
    const map = new Map<string, { total: number; correct: number; name: string }>();
    for (const c of filteredCases) {
      const key = c.expectedIntent;
      if (!map.has(key)) map.set(key, { total: 0, correct: 0, name: key });
      const stat = map.get(key)!;
      stat.total++;
      if (c.passed) stat.correct++;
    }
    return Array.from(map.entries()).map(([_, stat], idx) => ({
      intentId: String(idx),
      name: stat.name,
      realCount: stat.total,
      recall: stat.correct / stat.total,
      predictCount: stat.total,
      precision: stat.correct / stat.total,
    }));
  })();

  // Compute evaluator stats from filtered case details
  const evaluatorStats = (() => {
    if (filteredCases.length === 0) return [];
    const map = new Map<string, { scores: number[]; passed: number; total: number }>();
    for (const c of filteredCases) {
      const key = c.evaluatorName;
      if (!map.has(key)) map.set(key, { scores: [], passed: 0, total: 0 });
      const stat = map.get(key)!;
      stat.total++;
      if (c.passed) stat.passed++;
      if (typeof c.evaluatorScore === 'number') stat.scores.push(c.evaluatorScore);
    }
    return Array.from(map.entries()).map(([name, stat]) => ({
      name,
      pass: stat.passed,
      fail: stat.total - stat.passed,
      rate: stat.total > 0 ? (stat.passed / stat.total) * 100 : 0,
      avg: stat.scores.length > 0 ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0,
      max: stat.scores.length > 0 ? Math.max(...stat.scores) : 0,
      min: stat.scores.length > 0 ? Math.min(...stat.scores) : 0,
    }));
  })();

  const metricLabels: Record<MetricKey, string> = {
    recall: '召回率',
    precision: '准确率',
    f1: 'F1 分数',
  };

  const getMetricValue = (r: typeof intentStats[0]) => {
    if (metric === 'recall') return r.recall;
    if (metric === 'precision') return r.precision;
    return (2 * r.recall * r.precision) / (r.recall + r.precision || 1);
  };

  const avgRecall = intentStats.length > 0
    ? (intentStats.reduce((s, r) => s + r.recall, 0) / intentStats.length * 100).toFixed(1)
    : '0';
  const avgPrecision = intentStats.length > 0
    ? (intentStats.reduce((s, r) => s + r.precision, 0) / intentStats.length * 100).toFixed(1)
    : '0';

  return (
    <div>
      <PageHeader
        title="结果可视化"
        subtitle="多维度展示评测数据，选择指标进行交叉对比分析"
        actions={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={currentId || ''}
              onChange={(e) => setSelectedExperimentId(e.target.value || null)}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--bg-card)',
                minWidth: 240,
              }}
            >
              <option value="">请选择实验</option>
              {completedExperiments.map((exp) => (
                <option key={exp.id} value={exp.id}>
                  {exp.topic}（{exp.id}）
                </option>
              ))}
            </select>
            <select
              value={filterIntent}
              onChange={(e) => setFilterIntent(e.target.value)}
              style={{
                padding: '8px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--bg-card)',
                minWidth: 140,
              }}
            >
              <option value="全部">全部测试内容</option>
              {uniqueIntents.map((intent) => (
                <option key={intent} value={intent}>{intent}</option>
              ))}
            </select>
          </div>
        }
      />

      {currentExperiment && (
        <div
          style={{
            padding: '10px 16px',
            background: 'var(--accent-light)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 20,
            fontSize: 13,
            color: 'var(--accent-dark)',
          }}
        >
          当前查看：<strong>{currentExperiment.topic}</strong> · 测试集：{testSets.find((t) => t.id === currentExperiment.testSetId)?.name || currentExperiment.testSetId} · 完成时间：{currentExperiment.completedAt || '-'}
        </div>
      )}

      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <StatCard label="平均召回率" value={`${avgRecall}%`} />
        <StatCard label="平均准确率" value={`${avgPrecision}%`} />
        <StatCard label="评估意图数" value={intentStats.length} />
        <StatCard label="总用例数" value={filteredCases.length > 0 ? filteredCases.length : '6,262'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              各意图{metricLabels[metric]}
            </span>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-xs)',
                padding: '4px 10px',
                fontSize: 12,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--bg-card)',
              }}
            >
              <option value="recall">召回率</option>
              <option value="precision">准确率</option>
              <option value="f1">F1 分数</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {intentStats.map((r) => {
              const pct = getMetricValue(r) * 100;
              return (
                <div key={r.intentId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 80, fontSize: 12, color: 'var(--ink-muted)', textAlign: 'right', flexShrink: 0 }}>
                    {r.name}
                  </div>
                  <div style={{ flex: 1, height: 20, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        background: pct >= 95 ? 'var(--accent)' : pct >= 80 ? 'var(--warning)' : 'var(--error)',
                        borderRadius: 4,
                        transition: 'width 0.5s ease',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      width: 48,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 500,
                      textAlign: 'right',
                      color: pct >= 95 ? 'var(--success)' : pct >= 80 ? 'var(--warning)' : 'var(--error)',
                    }}
                  >
                    {pct.toFixed(1)}%
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            召回率 vs 准确率 散点分布
          </div>
          <svg viewBox="0 0 300 250" style={{ width: '100%' }}>
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => (
              <g key={v}>
                <line
                  x1={40}
                  y1={20 + (1 - v) * 200}
                  x2={290}
                  y2={20 + (1 - v) * 200}
                  stroke="var(--border-light)"
                  strokeWidth={1}
                />
                <text
                  x={35}
                  y={24 + (1 - v) * 200}
                  fontSize={10}
                  fill="var(--ink-light)"
                  textAnchor="end"
                  fontFamily="var(--font-mono)"
                >
                  {(v * 100).toFixed(0)}%
                </text>
                <line
                  x1={40 + v * 250}
                  y1={20}
                  x2={40 + v * 250}
                  y2={220}
                  stroke="var(--border-light)"
                  strokeWidth={1}
                />
                <text
                  x={40 + v * 250}
                  y={238}
                  fontSize={10}
                  fill="var(--ink-light)"
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                >
                  {(v * 100).toFixed(0)}%
                </text>
              </g>
            ))}
            <text x={165} y={250} fontSize={11} fill="var(--ink-muted)" textAnchor="middle">
              准确率
            </text>
            <text
              x={12}
              y={120}
              fontSize={11}
              fill="var(--ink-muted)"
              textAnchor="middle"
              transform="rotate(-90, 12, 120)"
            >
              召回率
            </text>
            {/* Data points */}
            {intentStats.map((r) => {
              const x = 40 + r.precision * 250;
              const y = 20 + (1 - r.recall) * 200;
              const size = Math.max(4, Math.min(10, r.realCount / 200));
              return (
                <circle
                  key={r.intentId}
                  cx={x}
                  cy={y}
                  r={size}
                  fill="var(--accent)"
                  opacity={0.7}
                />
              );
            })}
          </svg>
        </Card>
      </div>

      <Card>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
          评估员评分分布
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          {(evaluatorStats.length > 0 ? evaluatorStats : [
            { name: 'PII 泄露检测', pass: 6200, fail: 62, rate: 99.0, avg: 0, max: 0, min: 0 },
            { name: '毒性检测', pass: 6100, fail: 162, rate: 97.4, avg: 0, max: 0, min: 0 },
            { name: '对话连贯性', pass: 0, fail: 0, rate: 0, avg: 8.3, max: 10, min: 2 },
          ]).map((ev, idx) => (
            <div key={idx} style={{ flex: 1, minWidth: 200, padding: 20, background: 'var(--bg-warm)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{ev.name}</div>
              {ev.rate > 0 ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <MiniDonut value={ev.rate / 100} />
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {ev.rate.toFixed(1)}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)' }}>通过率（{ev.pass}通过/{ev.fail}未通过）</div>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                    {ev.avg.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                    平均分（{ev.min}-{ev.max} 区间）
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
