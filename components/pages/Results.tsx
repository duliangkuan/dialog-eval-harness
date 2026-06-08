'use client';

import { useState } from 'react';
import { PageHeader, Card, Button, Badge, HeaderFilter } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { MOCK_EXPERIMENT_DETAILS } from '@/lib/store/mock-data';

export function Results() {
  const { experiments, selectedExperimentId, setSelectedExperimentId, testSets, models, evaluators } = useAppContext();
  const completedExperiments = experiments.filter((e) => e.status === 'completed');

  const currentId = selectedExperimentId || (completedExperiments.length > 0 ? completedExperiments[0].id : null);
  const currentExperiment = experiments.find((e) => e.id === currentId);
  const caseDetails = currentId ? MOCK_EXPERIMENT_DETAILS[currentId] || [] : [];

  // Column header filters (multi-select)
  const [filterEvaluator, setFilterEvaluator] = useState<string[]>([]);
  const [filterScore, setFilterScore] = useState<string[]>([]);
  const [filterPassed, setFilterPassed] = useState<string[]>([]);

  const uniqueEvaluators = Array.from(new Set(caseDetails.map((c) => c.evaluatorName)));
  const uniqueScores = Array.from(new Set(caseDetails.map((c) => String(c.evaluatorScore)))).sort((a, b) => Number(b) - Number(a));

  const filteredCases = caseDetails.filter((c) => {
    if (filterEvaluator.length > 0 && !filterEvaluator.includes(c.evaluatorName)) return false;
    if (filterScore.length > 0 && !filterScore.includes(String(c.evaluatorScore))) return false;
    if (filterPassed.length > 0) {
      const passedStr = c.passed ? 'passed' : 'failed';
      if (!filterPassed.includes(passedStr)) return false;
    }
    return true;
  });

  const totalCases = caseDetails.length;
  const passedCases = caseDetails.filter((c) => c.passed).length;
  const failedCases = totalCases - passedCases;
  const avgScore = totalCases > 0
    ? (caseDetails.reduce((s, c) => s + (typeof c.evaluatorScore === 'number' ? c.evaluatorScore : 0), 0) / totalCases).toFixed(1)
    : '0';

  const handleExportExcel = () => {
    if (!currentExperiment || caseDetails.length === 0) return;
    const header = '序号,对话上下文,当前Query,期望意图,模型回复,预测意图,评估员,评分,评估内容,是否通过';
    const rows = caseDetails.map((c) =>
      [
        c.caseIndex,
        `"${c.dialogueContext.replace(/"/g, '""')}"`,
        `"${c.currentQuery}"`,
        `"${c.expectedIntent}"`,
        `"${c.modelResponse.replace(/"/g, '""')}"`,
        `"${c.predictedIntent}"`,
        `"${c.evaluatorName}"`,
        c.evaluatorScore,
        `"${c.evaluatorComment.replace(/"/g, '""')}"`,
        c.passed ? '通过' : '未通过',
      ].join(',')
    );
    const csvContent = '\uFEFF' + [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `评测结果_${currentExperiment.topic}_${currentExperiment.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader
        title="评测结果"
        subtitle="查看每次实验的逐条评测详情，包含模型模拟对话回复与评估员评价"
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
            <Button size="sm" disabled={caseDetails.length === 0} onClick={handleExportExcel}>
              导出 Excel
            </Button>
          </div>
        }
      />

      {currentExperiment ? (
        <>
          {/* Experiment Info */}
          <div
            style={{
              padding: '14px 20px',
              background: 'var(--accent-light)',
              borderRadius: 'var(--radius-sm)',
              marginBottom: 20,
              display: 'flex',
              gap: 24,
              flexWrap: 'wrap',
              alignItems: 'center',
              fontSize: 13,
            }}
          >
            <span>
              <strong>实验：</strong>{currentExperiment.topic}
            </span>
            <span>
              <strong>测试集：</strong>{testSets.find((t) => t.id === currentExperiment.testSetId)?.name || currentExperiment.testSetId}
            </span>
            <span>
              <strong>模型：</strong>{models.find((m) => m.id === currentExperiment.modelId)?.name || currentExperiment.modelId}
            </span>
            <span>
              <strong>评估员：</strong>{currentExperiment.evaluatorIds.map((id) => evaluators.find((e) => e.id === id)?.name || id).join(', ')}
            </span>
            <span>
              <strong>耗时：</strong>{currentExperiment.duration || '-'}
            </span>
          </div>

          {/* Stats - compact inline */}
          <div style={{
            display: 'flex',
            gap: 24,
            marginBottom: 20,
            padding: '12px 20px',
            background: 'var(--bg-warm)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 14,
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            <span>
              总用例 <strong style={{ fontSize: 18, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>{totalCases}</strong>
            </span>
            <span style={{ color: 'var(--success)' }}>
              通过 <strong style={{ fontSize: 18, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>{passedCases}</strong>
              <span style={{ fontSize: 12, marginLeft: 4 }}>({totalCases > 0 ? ((passedCases / totalCases) * 100).toFixed(1) : 0}%)</span>
            </span>
            <span style={{ color: 'var(--error)' }}>
              未通过 <strong style={{ fontSize: 18, fontFamily: 'var(--font-mono)', marginLeft: 4 }}>{failedCases}</strong>
              <span style={{ fontSize: 12, marginLeft: 4 }}>({totalCases > 0 ? ((failedCases / totalCases) * 100).toFixed(1) : 0}%)</span>
            </span>
            <span>
              平均评分 <strong style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginLeft: 4 }}>{avgScore}</strong>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)', marginLeft: 4 }}>/10</span>
            </span>
          </div>

          {/* Case Detail Table */}
          <Card style={{ padding: 0 }}>
            <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-display)' }}>
                逐条评测详情
              </span>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                显示 {filteredCases.length} / {totalCases} 条
              </span>
            </div>
            <div style={{ overflow: 'visible' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--bg-warm)' }}>
                    <th style={thStyle}>#</th>
                    <th colSpan={3} style={{ ...thStyle, borderBottom: '2px solid var(--accent)', textAlign: 'center', color: 'var(--accent-dark)' }}>
                      模拟对话内容
                    </th>
                    <th colSpan={3} style={{ ...thStyle, borderBottom: '2px solid var(--warning)', textAlign: 'center', color: 'var(--warning)' }}>
                      评估员评估
                    </th>
                    <th style={thStyle}>结果</th>
                  </tr>
                  <tr style={{ background: 'var(--bg-warm)' }}>
                    <th style={thStyle}></th>
                    <th style={{ ...thStyle, minWidth: 180 }}>对话上下文</th>
                    <th style={{ ...thStyle, minWidth: 100 }}>用户Query</th>
                    <th style={{ ...thStyle, minWidth: 180 }}>模型回复</th>
                    <th style={{ ...thStyle, minWidth: 80 }}>
                      <HeaderFilter
                        label="评估员"
                        value={filterEvaluator}
                        onChange={setFilterEvaluator}
                        options={uniqueEvaluators.map((ev) => ({ value: ev, label: ev }))}
                      />
                    </th>
                    <th style={thStyle}>
                      <HeaderFilter
                        label="评分"
                        value={filterScore}
                        onChange={setFilterScore}
                        options={uniqueScores.map((s) => ({ value: s, label: s }))}
                      />
                    </th>
                    <th style={{ ...thStyle, minWidth: 160 }}>评估内容</th>
                    <th style={thStyle}>
                      <HeaderFilter
                        label="通过"
                        value={filterPassed}
                        onChange={setFilterPassed}
                        options={[
                          { value: 'passed', label: '通过' },
                          { value: 'failed', label: '未通过' },
                        ]}
                      />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => (
                    <tr key={c.caseIndex} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={tdStyle}>{c.caseIndex}</td>
                      {/* 模拟对话内容 */}
                      <td style={{ ...tdStyle, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 11, lineHeight: 1.6, background: 'rgba(99,102,241,0.02)' }}>
                        {c.dialogueContext}
                      </td>
                      <td style={{ ...tdStyle, fontWeight: 500, background: 'rgba(99,102,241,0.02)' }}>
                        {c.currentQuery}
                        <div style={{ fontSize: 11, color: 'var(--ink-muted)', marginTop: 4 }}>
                          期望：{c.expectedIntent}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, background: 'rgba(99,102,241,0.02)' }}>
                        <div style={{ color: 'var(--ink)' }}>{c.modelResponse}</div>
                        <div style={{ marginTop: 6 }}>
                          <Badge type={c.predictedIntent === c.expectedIntent ? 'success' : 'error'}>
                            预测：{c.predictedIntent}
                          </Badge>
                        </div>
                      </td>
                      {/* 评估员评估 */}
                      <td style={{ ...tdStyle, fontSize: 12, background: 'rgba(245,158,11,0.02)' }}>{c.evaluatorName}</td>
                      <td style={{ ...tdStyle, fontFamily: 'var(--font-mono)', fontWeight: 600, textAlign: 'center', background: 'rgba(245,158,11,0.02)', color: typeof c.evaluatorScore === 'number' && c.evaluatorScore >= 8 ? 'var(--success)' : typeof c.evaluatorScore === 'number' && c.evaluatorScore >= 5 ? 'var(--warning)' : 'var(--error)' }}>
                        {c.evaluatorScore}
                      </td>
                      <td style={{ ...tdStyle, fontSize: 12, color: 'var(--ink-muted)', background: 'rgba(245,158,11,0.02)' }}>{c.evaluatorComment}</td>
                      {/* 结果 */}
                      <td style={tdStyle}>
                        <Badge type={c.passed ? 'success' : 'error'}>
                          {c.passed ? '通过' : '未通过'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-light)' }}>
            <div style={{ fontSize: 15, marginBottom: 8 }}>暂无已完成的实验</div>
            <div style={{ fontSize: 13 }}>请先在「自动化评测」页面发起并完成评测任务</div>
          </div>
        </Card>
      )}
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--ink-muted)',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 14px',
  verticalAlign: 'top',
};
