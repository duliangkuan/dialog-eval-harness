'use client';

import { useState, useRef } from 'react';
import { PageHeader, Button, Table, Modal, Badge, Card } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { TestSet } from '@/lib/backend/types';

const DEFAULT_GEN_PROMPT = `你是一个测试用例生成专家。请根据以下意图定义，生成多轮对话测试用例。

要求：
1. 每条用例包含：dialogue_context（对话上下文）、current_query（当前用户输入）、expected_intent（期望识别的意图）
2. 对话上下文应包含 2-4 轮历史对话，格式为 "user:xxx\\nai:xxx"
3. 测试用例应覆盖正常场景、边界场景和混淆场景
4. 生成的用例应具有多样性，避免重复模式
5. 输出为 CSV 格式`;

function generateMockCsv(intentName: string, count: number): string {
  const scenarios = [
    { context: 'user:你好\\nai:你好，有什么可以帮您的？', query: '帮我叫个车去公司', intent: intentName },
    { context: 'user:明天天气怎么样\\nai:明天晴天，气温25度', query: '那帮我设个早起闹钟', intent: intentName },
    { context: 'user:我想吃火锅\\nai:好的，附近有几家不错的火锅店', query: '帮我订今晚7点的位子', intent: intentName },
    { context: 'user:帮我打个车\\nai:好的，请问从哪里出发？', query: '从家到公司', intent: intentName },
    { context: 'user:最近有什么好看的电影\\nai:推荐您看xxx', query: '帮我买两张明天的票', intent: intentName },
    { context: 'user:我头疼\\nai:建议您去看医生', query: '帮我挂个明天的号', intent: intentName },
    { context: 'user:附近有什么好吃的\\nai:推荐几家餐厅', query: '第二家看起来不错帮我点个外卖', intent: intentName },
    { context: 'user:明天几点开会\\nai:明天上午10点有周会', query: '帮我记一下带笔记本', intent: intentName },
    { context: 'user:今天好累啊\\nai:辛苦了，要不要放松一下', query: '放首轻音乐吧', intent: intentName },
    { context: 'user:我想去旅游\\nai:推荐您去三亚', query: '帮我查一下机票价格', intent: intentName },
  ];

  let csv = 'dialogue_context,current_query,expected_intent\n';
  for (let i = 0; i < count; i++) {
    const s = scenarios[i % scenarios.length];
    const suffix = i >= scenarios.length ? `_${Math.floor(i / scenarios.length)}` : '';
    csv += `"${s.context}","${s.query}${suffix}","${s.intent}"\n`;
  }
  return csv;
}

function getDefaultCsvContent(item: TestSet): string {
  return item.csvContent || `dialogue_context,current_query,expected_intent\n"示例上下文","示例查询","示例意图"\n`;
}

// Parse CSV to rows (simple CSV parser)
function parseCsv(csv: string): string[][] {
  const lines = csv.trim().split('\n');
  return lines.map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        cells.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
    cells.push(current);
    return cells;
  });
}

// Convert rows back to CSV
function rowsToCsv(rows: string[][]): string {
  return rows.map((row) =>
    row.map((cell) => {
      if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
        return `"${cell.replace(/"/g, '""')}"`;
      }
      return cell;
    }).join(',')
  ).join('\n') + '\n';
}

export function TestSets() {
  const { intents, testSets, addTestSet, updateTestSet, deleteTestSet } = useAppContext();
  const [createModal, setCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'upload' | 'generate' | null>(null);
  const [formName, setFormName] = useState('');
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动生成 state
  const [genName, setGenName] = useState('');
  const [genIntentId, setGenIntentId] = useState('');
  const [genPrompt, setGenPrompt] = useState(DEFAULT_GEN_PROMPT);
  const [genCount, setGenCount] = useState(20);
  const [generating, setGenerating] = useState(false);

  // 查看 & 编辑 state (table mode)
  const [viewItem, setViewItem] = useState<TestSet | null>(null);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  const handleUpload = () => {
    if (!formName.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    addTestSet({
      id: String(Date.now()),
      name: formName.trim(),
      cases: Math.floor(Math.random() * 500) + 50,
      source: 'csv',
      createdAt: now,
      updater: 'admin',
    });
    setFormName('');
    setFileName('');
    setCreateMode(null);
    setCreateModal(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      if (!formName.trim()) {
        setFormName(file.name.replace(/\.csv$/i, ''));
      }
    }
  };

  const handleGenerate = () => {
    if (!genName.trim() || !genIntentId) return;
    setGenerating(true);

    setTimeout(() => {
      const intent = intents.find((i) => i.id === genIntentId);
      const intentName = intent?.name || '未知意图';
      const csvContent = generateMockCsv(intentName, genCount);
      const now = new Date().toISOString().slice(0, 10);

      addTestSet({
        id: String(Date.now()),
        name: genName.trim(),
        cases: genCount,
        source: 'auto_generated',
        createdAt: now,
        updater: 'system',
        csvContent,
        intentId: genIntentId,
      });

      setGenerating(false);
      setGenName('');
      setGenIntentId('');
      setGenPrompt(DEFAULT_GEN_PROMPT);
      setGenCount(20);
      setCreateMode(null);
      setCreateModal(false);
    }, 2000);
  };

  const handleDownload = (item: TestSet) => {
    const content = getDefaultCsvContent(item);
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.name}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openView = (item: TestSet) => {
    const csv = getDefaultCsvContent(item);
    const rows = parseCsv(csv);
    setViewItem(item);
    setTableRows(rows);
    setHasChanges(false);
    setEditingCell(null);
  };

  const handleCellChange = (rowIdx: number, colIdx: number, value: string) => {
    const newRows = tableRows.map((row, ri) =>
      ri === rowIdx ? row.map((cell, ci) => (ci === colIdx ? value : cell)) : row
    );
    setTableRows(newRows);
    setHasChanges(true);
  };

  const handleAddRow = () => {
    const colCount = tableRows[0]?.length || 3;
    const newRow = Array(colCount).fill('');
    setTableRows([...tableRows, newRow]);
    setHasChanges(true);
  };

  const handleDeleteRow = (rowIdx: number) => {
    if (rowIdx === 0) return; // Don't delete header
    setTableRows(tableRows.filter((_, i) => i !== rowIdx));
    setHasChanges(true);
  };

  const handleSave = () => {
    if (!viewItem) return;
    const csv = rowsToCsv(tableRows);
    const caseCount = Math.max(0, tableRows.length - 1);
    updateTestSet(viewItem.id, {
      csvContent: csv,
      cases: caseCount,
    });
    setHasChanges(false);
    setViewItem({ ...viewItem, csvContent: csv, cases: caseCount });
  };

  const handleDelete = (item: TestSet) => {
    if (confirm(`确定要删除测试集「${item.name}」吗？此操作不可撤销。`)) {
      deleteTestSet(item.id);
    }
  };

  // If viewing a test set, show the table editor page
  if (viewItem) {
    const headers = tableRows[0] || [];
    const dataRows = tableRows.slice(1);

    return (
      <div>
        <PageHeader
          title={viewItem.name}
          subtitle={`共 ${dataRows.length} 条用例 · 创建于 ${viewItem.createdAt}`}
          actions={
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" onClick={() => handleDownload(viewItem)}>下载 CSV</Button>
              <Button onClick={handleSave} disabled={!hasChanges}>保存更新</Button>
            </div>
          }
        />
        <div style={{ marginBottom: 16 }}>
          <Button variant="ghost" onClick={() => setViewItem(null)}>
            ← 返回测试集列表
          </Button>
          {hasChanges && (
            <span style={{ fontSize: 12, color: 'var(--warning)', marginLeft: 12, fontWeight: 500 }}>有未保存的修改</span>
          )}
        </div>
        <Card style={{ padding: 0 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-warm)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', width: 50 }}>#</th>
                  {headers.map((h, ci) => (
                    <th key={ci} style={{ padding: '12px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', minWidth: 150 }}>
                      {h}
                    </th>
                  ))}
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', width: 60 }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {dataRows.map((row, ri) => {
                  const actualRowIdx = ri + 1;
                  return (
                    <tr key={ri} style={{ borderBottom: '1px solid var(--border-light)' }}>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontSize: 12, color: 'var(--ink-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ri + 1}
                      </td>
                      {row.map((cell, ci) => (
                        <td key={ci} style={{ padding: '4px 6px', verticalAlign: 'top' }}>
                          {editingCell?.row === actualRowIdx && editingCell?.col === ci ? (
                            <textarea
                              autoFocus
                              value={cell}
                              onChange={(e) => handleCellChange(actualRowIdx, ci, e.target.value)}
                              onBlur={() => setEditingCell(null)}
                              onKeyDown={(e) => {
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              style={{
                                width: '100%',
                                minHeight: 60,
                                padding: '8px 10px',
                                border: '2px solid var(--accent)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 12,
                                fontFamily: 'var(--font-mono)',
                                lineHeight: 1.6,
                                outline: 'none',
                                resize: 'vertical',
                                background: '#fff',
                              }}
                            />
                          ) : (
                            <div
                              onClick={() => setEditingCell({ row: actualRowIdx, col: ci })}
                              style={{
                                padding: '8px 10px',
                                fontSize: 12,
                                fontFamily: 'var(--font-mono)',
                                lineHeight: 1.6,
                                cursor: 'text',
                                borderRadius: 'var(--radius-sm)',
                                minHeight: 36,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                transition: 'background 0.1s',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-warm)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              {cell || <span style={{ color: 'var(--ink-light)', fontStyle: 'italic' }}>点击编辑</span>}
                            </div>
                          )}
                        </td>
                      ))}
                      <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRow(actualRowIdx)}
                          style={{ color: 'var(--error)', fontSize: 11 }}
                        >
                          删除
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border-light)' }}>
            <Button variant="ghost" size="sm" onClick={handleAddRow}>+ 添加一行</Button>
          </div>
        </Card>
      </div>
    );
  }

  const columns = [
    {
      key: 'name',
      title: '测试集名称',
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    { key: 'cases', title: '用例数', mono: true },
    { key: 'createdAt', title: '创建时间', muted: true, mono: true },
    { key: 'updater', title: '创建人', muted: true },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: TestSet) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => openView(row)}>查看</Button>
          <Button variant="ghost" size="sm" onClick={() => handleDownload(row)}>下载</Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} style={{ color: 'var(--error)' }}>删除</Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="测试集列表"
        subtitle="管理评测用例集，支持 CSV 上传或自动生成"
        actions={
          <Button onClick={() => { setCreateMode(null); setCreateModal(true); }}>创建测试集</Button>
        }
      />
      <Card style={{ padding: 0 }}>
        <Table columns={columns} data={testSets} />
      </Card>

      {/* 创建测试集 Modal */}
      <Modal
        title="创建测试集"
        open={createModal}
        onClose={() => { if (!generating) { setCreateModal(false); setCreateMode(null); } }}
        width={createMode ? 640 : 720}
      >
        {!createMode ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <Card
                onClick={() => setCreateMode('upload')}
                style={{ cursor: 'pointer', border: '1px solid var(--border)', boxShadow: 'none', textAlign: 'center', padding: '32px 24px' }}
              >
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>▤</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>上传 CSV</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>上传已有的 CSV 测试用例文件</div>
              </Card>
              <Card
                onClick={() => setCreateMode('generate')}
                style={{ cursor: 'pointer', border: '1px solid var(--border)', boxShadow: 'none', textAlign: 'center', padding: '32px 24px' }}
              >
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>◈</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>AI 自动生成</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>选择意图，由 AI 自动生成测试用例</div>
              </Card>
            </div>
          </div>
        ) : createMode === 'upload' ? (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setCreateMode(null)} style={{ marginBottom: 16 }}>
              ← 返回
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  测试集名称 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  placeholder="如：意图识别测试集 v4"
                />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  style={{ display: 'none' }}
                  onChange={handleFileSelect}
                />
                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed var(--border)',
                    borderRadius: 'var(--radius)',
                    padding: '40px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'border-color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
                >
                  {fileName ? (
                    <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)' }}>
                      已选择：{fileName}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 6 }}>点击或拖拽上传 CSV 文件</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>支持 .csv 格式，每行一条测试用例</div>
                    </>
                  )}
                </div>
              </div>
              <div style={{ padding: 16, background: 'var(--bg-warm)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--ink-muted)', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 600, marginBottom: 4, color: 'var(--ink)' }}>CSV 格式说明</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>
                  dialogue_context, current_query, expected_intent<br />
                  "user:帮我打个车\nai:好的", "帮我记一下明天 9 点开会", "记忆助手"
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="secondary" onClick={() => { setCreateModal(false); setCreateMode(null); }}>取消</Button>
                <Button onClick={handleUpload}>上传</Button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setCreateMode(null)} style={{ marginBottom: 16 }}>
              ← 返回
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div
                style={{
                  padding: 14,
                  background: 'var(--accent-light)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  color: 'var(--accent-dark)',
                  lineHeight: 1.6,
                }}
              >
                选择目标意图并配置生成提示词，系统将自动生成多轮对话测试用例，输出为 CSV 格式。
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  测试集名称 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  value={genName}
                  onChange={(e) => setGenName(e.target.value)}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    outline: 'none',
                  }}
                  placeholder="如：打车意图自动测试集"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  目标意图 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  value={genIntentId}
                  onChange={(e) => setGenIntentId(e.target.value)}
                  disabled={generating}
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
                  <option value="">请选择要生成测试用例的意图</option>
                  {intents.map((intent) => (
                    <option key={intent.id} value={intent.id}>
                      {intent.name} - {intent.desc}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  生成数量
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[10, 20, 50, 100].map((n) => (
                    <label
                      key={n}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 16px',
                        border: `1px solid ${genCount === n ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: 'var(--radius-sm)',
                        cursor: generating ? 'not-allowed' : 'pointer',
                        fontSize: 13,
                        background: genCount === n ? 'var(--accent-light)' : 'transparent',
                        fontWeight: genCount === n ? 500 : 400,
                      }}
                    >
                      <input
                        type="radio"
                        name="genCount"
                        checked={genCount === n}
                        onChange={() => setGenCount(n)}
                        disabled={generating}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {n} 条
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  生成提示词 <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>（可修改）</span>
                </label>
                <textarea
                  rows={8}
                  value={genPrompt}
                  onChange={(e) => setGenPrompt(e.target.value)}
                  disabled={generating}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    fontFamily: 'var(--font-mono)',
                    lineHeight: 1.7,
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
              {generating && (
                <div style={{
                  padding: 16,
                  background: 'var(--bg-warm)',
                  borderRadius: 'var(--radius-sm)',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--accent)', marginBottom: 6 }}>
                    正在生成测试用例...
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                    模拟 LLM 调用中，预计需要 2 秒
                  </div>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <Button variant="secondary" onClick={() => { setCreateModal(false); setCreateMode(null); }} disabled={generating}>取消</Button>
                <Button onClick={handleGenerate} disabled={generating || !genName.trim() || !genIntentId}>
                  {generating ? '生成中...' : '生成测试集'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
