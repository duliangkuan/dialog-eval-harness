'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PageHeader, Button, Table, Modal, Badge, HeaderFilter } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { Experiment } from '@/lib/backend/types';
import { MOCK_EXPERIMENT_DETAILS } from '@/lib/store/mock-data';

interface ExperimentsProps {
  onNavigate?: (page: string) => void;
}

export function Experiments({ onNavigate }: ExperimentsProps) {
  const { experiments, evaluators, models, testSets, intents, addExperiment, updateExperiment, deleteExperiment, setSelectedExperimentId } = useAppContext();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [formTopic, setFormTopic] = useState('');
  const [formIntentId, setFormIntentId] = useState('');
  const [formTestSetId, setFormTestSetId] = useState('');
  const [formModelId, setFormModelId] = useState('');
  const [formEvaluatorIds, setFormEvaluatorIds] = useState<string[]>([]);

  // Filters (multi-select)
  const [filterIntentId, setFilterIntentId] = useState<string[]>([]);
  const [filterTestSetId, setFilterTestSetId] = useState<string[]>([]);
  const [filterEvaluatorId, setFilterEvaluatorId] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  const getStatusDisplay = (status: string) => {
    if (status === 'completed') return 'completed';
    if (status === 'failed') return 'failed';
    return 'running';
  };

  const filteredExperiments = experiments.filter((e) => {
    if (filterIntentId.length > 0 && !e.intentVersionIds.some((id) => filterIntentId.includes(id))) return false;
    if (filterTestSetId.length > 0 && !filterTestSetId.includes(e.testSetId)) return false;
    if (filterEvaluatorId.length > 0 && !e.evaluatorIds.some((id) => filterEvaluatorId.includes(id))) return false;
    if (filterStatus.length > 0) {
      const displayStatus = getStatusDisplay(e.status);
      if (!filterStatus.includes(displayStatus)) return false;
    }
    return true;
  });

  const handleStartExperiment = () => {
    if (!formTopic.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    addExperiment({
      id: Math.random().toString(16).slice(2, 10),
      topic: formTopic.trim(),
      testSetId: formTestSetId || '1',
      intentVersionIds: formIntentId ? [formIntentId] : [],
      evaluatorIds: formEvaluatorIds.length > 0 ? formEvaluatorIds : ['1'],
      modelId: formModelId || '1',
      status: 'running',
      progress: 0,
      startedAt: now,
      createdAt: now,
    });
    setFormTopic('');
    setFormIntentId('');
    setFormTestSetId('');
    setFormModelId('');
    setFormEvaluatorIds([]);
    setCreateModalOpen(false);
  };

  const toggleEvaluator = (id: string) => {
    setFormEvaluatorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleDelete = (item: Experiment) => {
    if (confirm(`确定要删除实验「${item.topic}」(${item.id}) 吗？此操作不可撤销。`)) {
      deleteExperiment(item.id);
    }
  };

  const handleRerun = (item: Experiment) => {
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    updateExperiment(item.id, {
      status: 'running',
      progress: 0,
      startedAt: now,
      completedAt: undefined,
      duration: undefined,
    });
  };

  const handleCancel = (item: Experiment) => {
    updateExperiment(item.id, {
      status: 'failed',
      duration: '已取消',
    });
  };

  // Auto-export Excel when experiment completes
  const autoExportExcel = useCallback((experiment: Experiment) => {
    const caseDetails = MOCK_EXPERIMENT_DETAILS[experiment.id] || [];
    if (caseDetails.length === 0) return;
    const header = '序号,对话上下文,当前Query,期望意图,模型回复,预测意图,评估员,评分,评语,是否通过';
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
    a.download = `评测结果_${experiment.topic}_${experiment.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Progress simulation for running experiments
  const progressTimers = useRef<Record<string, NodeJS.Timeout>>({});
  const [completionNotice, setCompletionNotice] = useState<string | null>(null);

  useEffect(() => {
    const runningExps = experiments.filter((e) => e.status === 'running');
    for (const exp of runningExps) {
      if (!progressTimers.current[exp.id]) {
        progressTimers.current[exp.id] = setInterval(() => {
          const current = experiments.find((e) => e.id === exp.id);
          if (!current || current.status !== 'running') {
            clearInterval(progressTimers.current[exp.id]);
            delete progressTimers.current[exp.id];
            return;
          }
          const newProgress = Math.min(current.progress + Math.floor(Math.random() * 8) + 3, 100);
          if (newProgress >= 100) {
            const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
            const startTime = current.startedAt ? new Date(current.startedAt.replace(' ', 'T')).getTime() : Date.now();
            const duration = Math.floor((Date.now() - startTime) / 1000);
            updateExperiment(exp.id, {
              status: 'completed',
              progress: 100,
              completedAt: now,
              duration: `${duration} 秒`,
            });
            clearInterval(progressTimers.current[exp.id]);
            delete progressTimers.current[exp.id];
            // Auto-export on completion
            setTimeout(() => {
              autoExportExcel({ ...current, status: 'completed' });
              setCompletionNotice(`评测「${current.topic}」已完成，评估结果已自动导出 Excel，可在「评测结果」和「结果可视化」页面查看数据。`);
              setTimeout(() => setCompletionNotice(null), 5000);
            }, 500);
          } else {
            updateExperiment(exp.id, { progress: newProgress });
          }
        }, 2000);
      }
    }
    return () => {
      Object.values(progressTimers.current).forEach(clearInterval);
    };
  }, [experiments, updateExperiment, autoExportExcel]);

  const StatusCell = ({ status, progress }: { status: string; progress: number }) => {
    if (status === 'completed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="var(--success)" opacity="0.15" />
            <path d="M5.5 9.2L7.8 11.5L12.5 6.5" stroke="var(--success)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span style={{ fontSize: 12, color: 'var(--success)', fontWeight: 500 }}>完成</span>
        </span>
      );
    }
    if (status === 'failed') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="var(--ink-light)" opacity="0.2" />
            <path d="M6 6L12 12M12 6L6 12" stroke="var(--error)" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          </svg>
          <span style={{ fontSize: 12, color: 'var(--error)', fontWeight: 500 }}>失败</span>
        </span>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
        <div style={{ flex: 1, height: 6, background: 'var(--border-light)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', borderRadius: 3, transition: 'width 0.5s ease' }} />
        </div>
        <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {progress}%
        </span>
      </div>
    );
  };

  const TagList = ({ items, max = 2 }: { items: string[]; max?: number }) => {
    const show = max ? items.slice(0, max) : items;
    const more = max && items.length > max ? items.length - max : 0;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {show.map((item, idx) => (
          <span
            key={idx}
            style={{
              display: 'inline-block',
              fontSize: 11,
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--accent-light)',
              color: 'var(--accent-dark)',
              fontWeight: 500,
              whiteSpace: 'nowrap',
            }}
          >
            {item}
          </span>
        ))}
        {more > 0 && (
          <span style={{ fontSize: 11, color: 'var(--ink-muted)', padding: '2px 4px' }}>
            +{more}
          </span>
        )}
      </div>
    );
  };

  const columns = [
    {
      key: 'id',
      title: '任务 ID',
      mono: true,
      render: (value: string) => (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{value}</span>
      ),
    },
    {
      key: 'topic',
      title: '测试主题',
      render: (value: string) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: 'testSetId',
      title: (
        <HeaderFilter
          label="测试集"
          value={filterTestSetId}
          onChange={setFilterTestSetId}
          options={testSets.map((t) => ({ value: t.id, label: t.name }))}
        />
      ),
      render: (value: string) => {
        const ts = testSets.find(t => t.id === value);
        return <span>{ts ? ts.name : value}</span>;
      },
    },
    {
      key: 'intentVersionIds',
      title: (
        <HeaderFilter
          label="选用意图"
          value={filterIntentId}
          onChange={setFilterIntentId}
          options={intents.map((i) => ({ value: i.id, label: i.name }))}
        />
      ),
      render: (value: string[]) => {
        const names = value.map(id => {
          const intent = intents.find(i => i.id === id);
          return intent ? intent.name : id;
        });
        return <TagList items={names} max={2} />;
      },
    },
    {
      key: 'evaluatorIds',
      title: (
        <HeaderFilter
          label="评估员"
          value={filterEvaluatorId}
          onChange={setFilterEvaluatorId}
          options={evaluators.map((ev) => ({ value: ev.id, label: ev.name }))}
        />
      ),
      render: (value: string[]) => {
        const names = value.map(id => {
          const ev = evaluators.find(e => e.id === id);
          return ev ? ev.name : id;
        });
        return <TagList items={names} max={2} />;
      },
    },
    {
      key: 'status',
      title: (
        <HeaderFilter
          label="状态"
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'completed', label: '完成' },
            { value: 'running', label: '运行中' },
            { value: 'failed', label: '失败' },
          ]}
        />
      ),
      render: (_: string, row: any) => <StatusCell status={row.status} progress={row.progress} />,
    },
    { key: 'startedAt', title: '开始时间', muted: true, mono: true },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: Experiment) => (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button
            variant="ghost"
            size="sm"
            disabled={row.status !== 'completed'}
            onClick={() => {
              setSelectedExperimentId(row.id);
              onNavigate?.('results');
            }}
          >
            查看评测结果
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} style={{ color: 'var(--error)' }}>
            删除记录
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={row.status === 'running'}
            onClick={() => handleRerun(row)}
          >
            重跑
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={row.status !== 'running'}
            onClick={() => handleCancel(row)}
            style={{ color: row.status === 'running' ? 'var(--warning)' : undefined }}
          >
            取消
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="自动化评测"
        subtitle="批量运行模型对话测试，对比不同版本与模型的表现"
        actions={<Button onClick={() => setCreateModalOpen(true)}>发起评测任务</Button>}
      />
      {/* Completion Notice */}
      {completionNotice && (
        <div
          style={{
            padding: '12px 20px',
            background: 'var(--success)',
            color: '#fff',
            borderRadius: 'var(--radius-sm)',
            marginBottom: 16,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="8" fill="#fff" opacity="0.2" />
            <path d="M5.5 9.2L7.8 11.5L12.5 6.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          {completionNotice}
        </div>
      )}
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <Table columns={columns} data={filteredExperiments} />
      </div>

      {/* 发起评测 Modal */}
      <Modal
        title="发起评测任务"
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        width={560}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div
            style={{
              padding: 16,
              background: 'var(--accent-light)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              color: 'var(--accent-dark)',
              lineHeight: 1.6,
            }}
          >
            选择意图、测试集、评估员和项目模型的组合，系统将自动批量模拟多轮对话并评估结果。
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              测试主题 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              value={formTopic}
              onChange={(e) => setFormTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
              }}
              placeholder="如：意图识别全量回归"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              选择意图 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formIntentId}
              onChange={(e) => setFormIntentId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--bg-card)',
              }}
            >
              <option value="">请选择意图</option>
              {intents.map((i) => (
                <option key={i.id} value={i.id}>ID:{i.id} - {i.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              测试集 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formTestSetId}
              onChange={(e) => setFormTestSetId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--bg-card)',
              }}
            >
              <option value="">请选择测试集</option>
              {testSets.map((t) => (
                <option key={t.id} value={t.id}>{t.name}（{t.cases} 条）</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              评估员（可多选）
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {evaluators.slice(0, 6).map((ev) => (
                <label
                  key={ev.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    border: `1px solid ${formEvaluatorIds.includes(ev.id) ? 'var(--accent)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    cursor: 'pointer',
                    background: formEvaluatorIds.includes(ev.id) ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={formEvaluatorIds.includes(ev.id)}
                    onChange={() => toggleEvaluator(ev.id)}
                    style={{ accentColor: 'var(--accent)' }}
                  />
                  {ev.name}
                </label>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              项目模型 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formModelId}
              onChange={(e) => setFormModelId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                background: 'var(--bg-card)',
              }}
            >
              <option value="">请选择模型</option>
              {models.filter((m) => m.status === '正常').map((m) => (
                <option key={m.id} value={m.id}>{m.name}（{m.provider}）</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setCreateModalOpen(false)}>取消</Button>
            <Button onClick={handleStartExperiment}>开始评测</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
