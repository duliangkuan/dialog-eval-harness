'use client';

import { useState } from 'react';
import { PageHeader, Card } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { MOCK_EXPERIMENT_DETAILS } from '@/lib/store/mock-data';

export function Visualization() {
  const { experiments, intents, intentVersions, testSets, evaluators } = useAppContext();
  const completedExperiments = experiments.filter((e) => e.status === 'completed');

  const [selectedIntentId, setSelectedIntentId] = useState(intents.length > 0 ? intents[0].id : '');
  const [selectedEvaluatorId, setSelectedEvaluatorId] = useState('');
  const [selectedTestSetId, setSelectedTestSetId] = useState('');

  // Get intent info
  const selectedIntent = intents.find((i) => i.id === selectedIntentId);
  const intentVersionsList = intentVersions.filter((v) => v.intentId === selectedIntentId);
  const intentTestSets = testSets.filter((t) => t.intentId === selectedIntentId);
  const intentExperiments = completedExperiments.filter((e) =>
    e.intentVersionIds.some((vid) => intentVersionsList.some((v) => v.id === vid))
  );

  // Filter experiments by test set if selected
  const filteredExperiments = selectedTestSetId
    ? intentExperiments.filter((e) => e.testSetId === selectedTestSetId)
    : intentExperiments;

  // Get case details for filtered experiments
  const allCaseDetails = filteredExperiments.flatMap((exp) =>
    (MOCK_EXPERIMENT_DETAILS[exp.id] || []).map((c) => ({ ...c, experimentId: exp.id, experimentTopic: exp.topic }))
  );

  // Compute evaluator stats: for each evaluator, average score and pass rate
  const evaluatorStats = (() => {
    const map = new Map<string, { scores: number[]; passed: number; total: number }>();
    for (const c of allCaseDetails) {
      const key = c.evaluatorName;
      if (!map.has(key)) map.set(key, { scores: [], passed: 0, total: 0 });
      const stat = map.get(key)!;
      stat.total++;
      if (c.passed) stat.passed++;
      if (typeof c.evaluatorScore === 'number') stat.scores.push(c.evaluatorScore);
    }
    return Array.from(map.entries()).map(([name, stat]) => ({
      name,
      avgScore: stat.scores.length > 0 ? stat.scores.reduce((a, b) => a + b, 0) / stat.scores.length : 0,
      passRate: stat.total > 0 ? (stat.passed / stat.total) * 100 : 0,
      total: stat.total,
    }));
  })();

  // Line chart data: per experiment scores for selected evaluator
  const lineChartEvaluator = selectedEvaluatorId
    ? evaluators.find((e) => e.id === selectedEvaluatorId)?.name || ''
    : (evaluatorStats.length > 0 ? evaluatorStats[0].name : '');

  const lineChartData = filteredExperiments.map((exp) => {
    const cases = (MOCK_EXPERIMENT_DETAILS[exp.id] || []).filter((c) => c.evaluatorName === lineChartEvaluator);
    const scores = cases.filter((c) => typeof c.evaluatorScore === 'number').map((c) => c.evaluatorScore as number);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    return { id: exp.id, topic: exp.topic, avgScore: avg, startedAt: exp.startedAt || '' };
  });

  // Summary stats for this intent
  const totalVersions = intentVersionsList.length;
  const totalTestSetCases = intentTestSets.reduce((s, t) => s + t.cases, 0);
  const totalExperimentRuns = intentExperiments.length;

  const selectStyle: React.CSSProperties = {
    padding: '8px 14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 13,
    fontFamily: 'inherit',
    outline: 'none',
    background: 'var(--bg-card)',
  };

  return (
    <div>
      <PageHeader
        title="结果可视化"
        subtitle="按意图维度聚合多次评测数据，可视化展示评估趋势和分布"
        actions={
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <select
              value={selectedIntentId}
              onChange={(e) => { setSelectedIntentId(e.target.value); setSelectedTestSetId(''); }}
              style={{ ...selectStyle, minWidth: 200 }}
            >
              {intents.map((i) => (
                <option key={i.id} value={i.id}>{i.name}</option>
              ))}
            </select>
            <select
              value={selectedTestSetId}
              onChange={(e) => setSelectedTestSetId(e.target.value)}
              style={{ ...selectStyle, minWidth: 160 }}
            >
              <option value="">全部测试集</option>
              {intentTestSets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        }
      />

      {/* Intent Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card style={{ padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>提示词版本数</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {totalVersions}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-light)', marginTop: 4 }}>
            {intentVersionsList.map((v) => v.id).join(', ')}
          </div>
        </Card>
        <Card style={{ padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>关联测试集用例</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {totalTestSetCases}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-light)', marginTop: 4 }}>
            {intentTestSets.length} 个测试集
          </div>
        </Card>
        <Card style={{ padding: '20px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>已完成实验次数</div>
          <div style={{ fontSize: 32, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
            {totalExperimentRuns}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-light)', marginTop: 4 }}>
            {filteredExperiments.length === intentExperiments.length ? '全部' : `筛选后 ${filteredExperiments.length} 次`}
          </div>
        </Card>
      </div>

      {/* Bar Chart + Line Chart side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            各评估员评分 / 通过率
          </div>
          {evaluatorStats.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {evaluatorStats.map((ev) => {
                const barValue = ev.avgScore > 0 ? (ev.avgScore / 10) * 100 : ev.passRate;
                const displayValue = ev.avgScore > 0 ? `${ev.avgScore.toFixed(1)} 分` : `${ev.passRate.toFixed(1)}%`;
                const barColor = barValue >= 80 ? 'var(--accent)' : barValue >= 60 ? 'var(--warning)' : 'var(--error)';
                return (
                  <div key={ev.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 100, fontSize: 11, color: 'var(--ink-muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ev.name}
                    </div>
                    <div style={{ flex: 1, height: 20, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${barValue}%`,
                          height: '100%',
                          background: barColor,
                          borderRadius: 4,
                          transition: 'width 0.5s ease',
                        }}
                      />
                    </div>
                    <div style={{ width: 60, fontSize: 11, fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'right', color: barColor }}>
                      {displayValue}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-light)', fontSize: 13 }}>
              暂无评测数据
            </div>
          )}
        </Card>

        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
              多次实验评分趋势
            </div>
            <select
              value={selectedEvaluatorId}
              onChange={(e) => setSelectedEvaluatorId(e.target.value)}
              style={{ ...selectStyle, minWidth: 140, fontSize: 12 }}
            >
              <option value="">
                {evaluatorStats.length > 0 ? evaluatorStats[0].name : '选择评估员'}
              </option>
              {evaluatorStats.map((ev) => (
                <option key={ev.name} value={evaluators.find((e) => e.name === ev.name)?.id || ''}>
                  {ev.name}
                </option>
              ))}
            </select>
          </div>
          {lineChartData.length > 0 ? (
            <div>
              <svg viewBox={`0 0 ${Math.max(300, lineChartData.length * 70 + 80)} 180`} style={{ width: '100%', height: 160 }}>
                {/* Y axis labels */}
                {[0, 2.5, 5, 7.5, 10].map((v) => (
                  <g key={v}>
                    <line
                      x1={40}
                      y1={15 + (1 - v / 10) * 135}
                      x2={Math.max(300, lineChartData.length * 70 + 80) - 10}
                      y2={15 + (1 - v / 10) * 135}
                      stroke="var(--border-light)"
                      strokeWidth={1}
                    />
                    <text
                      x={35}
                      y={19 + (1 - v / 10) * 135}
                      fontSize={9}
                      fill="var(--ink-light)"
                      textAnchor="end"
                      fontFamily="var(--font-mono)"
                    >
                      {v}
                    </text>
                  </g>
                ))}
                {/* Line and points */}
                {lineChartData.map((d, idx) => {
                  const x = 60 + idx * 60;
                  const y = 15 + (1 - d.avgScore / 10) * 135;
                  const prevD = idx > 0 ? lineChartData[idx - 1] : null;
                  const prevX = prevD ? 60 + (idx - 1) * 60 : 0;
                  const prevY = prevD ? 15 + (1 - prevD.avgScore / 10) * 135 : 0;
                  return (
                    <g key={d.id}>
                      {prevD && (
                        <line
                          x1={prevX}
                          y1={prevY}
                          x2={x}
                          y2={y}
                          stroke="var(--accent)"
                          strokeWidth={2}
                        />
                      )}
                      <circle cx={x} cy={y} r={4} fill="var(--accent)" />
                      <text
                        x={x}
                        y={170}
                        fontSize={8}
                        fill="var(--ink-light)"
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                      >
                        {d.id.slice(0, 6)}
                      </text>
                      <text
                        x={x}
                        y={y - 8}
                        fontSize={9}
                        fill="var(--accent)"
                        textAnchor="middle"
                        fontFamily="var(--font-mono)"
                        fontWeight="600"
                      >
                        {d.avgScore.toFixed(1)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4, paddingLeft: 40 }}>
                {lineChartData.map((d) => (
                  <span key={d.id} style={{ fontSize: 10, color: 'var(--ink-muted)' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{d.id.slice(0, 6)}</span> = {d.topic}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-light)', fontSize: 13 }}>
              当前筛选条件下暂无多次实验数据
            </div>
          )}
        </Card>
      </div>

      {/* Bottom: Test set and version detail */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
            关联测试集分布
          </div>
          {intentTestSets.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {intentTestSets.map((ts) => {
                const maxCases = Math.max(...intentTestSets.map((t) => t.cases));
                const pct = maxCases > 0 ? (ts.cases / maxCases) * 100 : 0;
                return (
                  <div key={ts.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 140, fontSize: 12, color: 'var(--ink-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {ts.name}
                    </div>
                    <div style={{ flex: 1, height: 20, background: 'var(--border-light)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 4 }} />
                    </div>
                    <div style={{ width: 50, fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 500, textAlign: 'right' }}>
                      {ts.cases}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-light)', fontSize: 13 }}>
              暂无关联测试集
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, fontFamily: 'var(--font-display)' }}>
            实验运行记录
          </div>
          {intentExperiments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {intentExperiments.map((exp) => (
                <div key={exp.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-warm)', borderRadius: 'var(--radius-sm)' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{exp.topic}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 2 }}>
                      {testSets.find((t) => t.id === exp.testSetId)?.name || exp.testSetId} · {exp.startedAt}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)' }}>
                    {exp.duration || '-'}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-light)', fontSize: 13 }}>
              暂无实验记录
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
