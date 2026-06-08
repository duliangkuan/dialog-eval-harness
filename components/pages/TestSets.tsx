'use client';

import { useState, useRef } from 'react';
import { PageHeader, Button, Table, Modal, Badge, Card, HeaderFilter } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { TestSet } from '@/lib/backend/types';

const DEFAULT_GEN_PROMPT = `你是一个测试用例生成专家。请根据以下意图定义，生成多轮对话测试用例。

要求：
1. 每条用例包含：dialogue_context（对话上下文）、current_query（当前用户输入）、expected_intent（期望识别的意图）
2. 对话上下文应包含 2-4 轮历史对话，格式为 "user:xxx\\nai:xxx"
3. 测试用例应覆盖正常场景、边界场景和混淆场景
4. 生成的用例应具有多样性，避免重复模式
5. 输出为 CSV 格式`;

function generateMockCsv(intentName: string, count: number, scenario: 'ideal' | 'boundary' | 'confuse'): string {
  const idealScenarios = [
    { context: 'ai:你好，请问是张师傅吗？我是站长，看到你报名了飞毛腿。\\nuser:是的，我报了名。', query: '好的，那今天高峰期我会上线跑单。', intent: intentName },
    { context: 'ai:你好师傅，今天飞毛腿合同已经生效了，午餐和晚餐高峰需要上线。\\nuser:知道了。\\nai:单日合同今天至少完成X单哦。', query: '没问题，我尽量多跑几单。', intent: intentName },
    { context: 'ai:师傅你好，通知一下飞毛腿合同今天开始了。\\nuser:好的收到。\\nai:记得午餐晚餐高峰上线，注意安全。', query: '放心吧站长，我会注意的。', intent: intentName },
    { context: 'ai:你好，请问是李师傅吗？飞毛腿合同今天生效了。\\nuser:是我，什么要求？', query: '明白了，我今天会完成规定单量的。', intent: intentName },
    { context: 'ai:师傅好，你的多日飞毛腿合同已经开始了，每天至少Y单。\\nuser:每天都要跑Y单吗？\\nai:是的，连续完成W天还有额外奖励。', query: '那我努力坚持，争取拿到奖励。', intent: intentName },
  ];

  const boundaryScenarios = [
    { context: 'ai:你好师傅，飞毛腿合同今天生效了，高峰期需要上线。\\nuser:今天下午有点事，能晚点上线吗？', query: '那我晚高峰再开始跑，应该能完成单量吧？', intent: intentName },
    { context: 'ai:师傅你好，通知一下你的飞毛腿今天开始。\\nuser:站长，我今天身体有点不舒服。\\nai:注意身体，但今天合同已生效了。', query: '那我吃个药，下午试试能不能跑。', intent: intentName },
    { context: 'ai:你好，飞毛腿合同今天开始，单日合同需要完成X单。\\nuser:X单有点多啊。', query: '那如果差一两单没完成会怎样？', intent: intentName },
    { context: 'ai:师傅好，多日合同今天开始，每天需要完成Y单。\\nuser:连续跑这么多天有点累。\\nai:坚持完成W天有额外奖励哦。', query: '要是中间有一天完成不了，能不能补？', intent: intentName },
    { context: 'ai:你好张师傅，飞毛腿合同生效通知。\\nuser:好的知道了。\\nai:高峰期记得上线。', query: '站长，我想问下如果明天想退出怎么操作？', intent: intentName },
  ];

  const confuseScenarios = [
    { context: 'ai:你好师傅，飞毛腿合同今天生效了。\\nuser:什么飞毛腿？我没报名啊。', query: '你是不是打错电话了？我是送快递的不是送外卖的。', intent: intentName },
    { context: 'ai:师傅你好，通知你飞毛腿合同今天开始。\\nuser:站长，我觉得这个制度不合理。', query: '为什么不能让我自己选择什么时候跑？你们是不是在压榨骑手？', intent: intentName },
    { context: 'ai:你好，飞毛腿合同生效了，今天需要完成X单。\\nuser:站长你能不能帮我多派几个好单？\\nai:飞毛腿是按排名的，不是我能干预的。', query: '那你帮我问问能不能给我涨点配送费呗。', intent: intentName },
    { context: 'ai:师傅好，多日合同开始了。\\nuser:哎站长，我跟你说个事。\\nai:你说。', query: '我朋友想用我的账号帮我跑几单行不行？', intent: intentName },
    { context: 'ai:你好师傅，飞毛腿今天开始了。\\nuser:好的。对了站长，上次那个罚款的事…\\nai:那个我向同事确认后再回电给你。', query: '不行，你现在就给我解决，不然我今天不跑了。', intent: intentName },
  ];

  const scenarios = scenario === 'ideal' ? idealScenarios : scenario === 'boundary' ? boundaryScenarios : confuseScenarios;

  let csv = 'dialogue_context,current_query,expected_intent\n';
  for (let i = 0; i < count; i++) {
    const s = scenarios[i % scenarios.length];
    const suffix = i >= scenarios.length ? `(${Math.floor(i / scenarios.length) + 1})` : '';
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
  const [genCount, setGenCount] = useState(100);
  const [genScenario, setGenScenario] = useState<'ideal' | 'boundary' | 'confuse'>('ideal');
  const [generating, setGenerating] = useState(false);

  // 查看 & 编辑 state (table mode)
  const [viewItem, setViewItem] = useState<TestSet | null>(null);
  const [tableRows, setTableRows] = useState<string[][]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);

  // Filter state
  const [filterName, setFilterName] = useState<string[]>([]);
  const [filterUpdater, setFilterUpdater] = useState<string[]>([]);

  const uniqueNames = [...new Set(testSets.map((t) => t.name))];
  const uniqueUpdaters = [...new Set(testSets.map((t) => t.updater))];

  const filteredTestSets = testSets.filter((t) => {
    if (filterName.length > 0 && !filterName.includes(t.name)) return false;
    if (filterUpdater.length > 0 && !filterUpdater.includes(t.updater)) return false;
    return true;
  });

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
      const csvContent = generateMockCsv(intentName, genCount, genScenario);
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
      setGenCount(100);
      setGenScenario('ideal');
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
      title: (
        <HeaderFilter
          label="测试集名称"
          value={filterName}
          onChange={setFilterName}
          options={uniqueNames.map((n) => ({ value: n, label: n }))}
        />
      ),
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    { key: 'cases', title: '用例数', mono: true },
    { key: 'createdAt', title: '创建时间', muted: true, mono: true },
    {
      key: 'updater',
      title: (
        <HeaderFilter
          label="创建人"
          value={filterUpdater}
          onChange={setFilterUpdater}
          options={uniqueUpdaters.map((u) => ({ value: u, label: u }))}
        />
      ),
      muted: true,
    },
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
        <Table columns={columns} data={filteredTestSets} />
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
                  placeholder="如：站长外呼指令核心测试集"
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
                  "ai:你好师傅\nuser:你好", "今天高峰期我会上线", "外卖骑手站长外呼指令"
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
                  placeholder="如：站长外呼指令核心测试集"
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
                  场景类型 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  value={genScenario}
                  onChange={(e) => setGenScenario(e.target.value as any)}
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
                  <option value="ideal">理想场景（用户回复完全符合预期）</option>
                  <option value="boundary">边界场景（用户回复在预期边界处）</option>
                  <option value="confuse">混淆场景（有误导倾向的用户回复）</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  生成数量
                </label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {[50, 100, 300, 500, 1000].map((n) => (
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
