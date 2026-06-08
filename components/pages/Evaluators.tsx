'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader, Button, Table, Modal, Badge, Card, HeaderFilter } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { Evaluator } from '@/lib/backend/types';

const DEFAULT_CUSTOM_PROMPT = `# Role
你是一名专业的对话约束评估员。
你的职责是根据给定的约束要求，检查一段多轮对话是否严格遵守该约束，并给出客观、可解释的评估结果。
你关注的是"约束遵循情况"，而非回答质量、语言流畅度、用户满意度或任务完成度。

# Task
请根据：
【约束内容】
以及
【多轮对话记录】
判断该对话是否满足该约束要求。
评估时仅允许依据对话中出现的内容进行判断，不允许引入外部知识、主观猜测或未出现的信息。

# Evaluation Principles
### 1. 证据驱动
所有结论必须能够从对话中找到明确证据支持。
如果无法找到充分证据证明违反约束，则应倾向于判定为符合约束。

### 2. 聚焦约束本身
仅评估与当前约束相关的内容。
忽略其他可能存在的问题。
不要因为回答质量差、表达不佳或逻辑不清晰而扣分，除非这些问题直接导致违反当前约束。

### 3. 关注实际行为
重点检查：
* 是否执行了被禁止的行为
* 是否遗漏了要求执行的行为
* 是否输出了与约束冲突的内容
* 是否在整个对话过程中持续满足约束要求

### 4. 保守判定
如果证据不足以确认违反约束：
应优先选择"无法确认违规"。
不要因为猜测而判定违规。

# Scoring Standard
5分：完全符合约束要求。整个对话过程中均满足约束，没有发现明显偏离或违反行为。
4分：基本符合约束要求。存在轻微偏离，但不影响约束整体达成，不构成实质性违规。
3分：部分符合约束要求。同时存在符合与违反约束的情况，整体表现一般。
2分：大部分不符合约束要求。出现明显违反约束的行为，仅少部分内容满足要求。
1分：完全不符合约束要求。核心约束被直接违反，或整个对话未体现约束要求。`;

export function Evaluators() {
  const { evaluators, models, intents, intentVersions, addEvaluator, updateEvaluator, deleteEvaluator } = useAppContext();
  const [createModal, setCreateModal] = useState(false);
  const [createMode, setCreateMode] = useState<'scratch' | 'template' | null>(null);

  // From-scratch form
  const [formCategory, setFormCategory] = useState<string>('自定义');
  const [formName, setFormName] = useState('');
  const [formTargetIntentId, setFormTargetIntentId] = useState<string>('all');
  const [formOutputType, setFormOutputType] = useState<string>('分数');
  const [formModelId, setFormModelId] = useState('');
  const [formPrompt, setFormPrompt] = useState(DEFAULT_CUSTOM_PROMPT);
  const [formSelectedConstraints, setFormSelectedConstraints] = useState<string[]>([]);

  // Template form
  const [selectedCat, setSelectedCat] = useState('recommended');
  const [selectedTemplate, setSelectedTemplate] = useState<typeof templates[0] | null>(null);
  const [tplCategory, setTplCategory] = useState('');
  const [tplName, setTplName] = useState('');
  const [tplTargetIntentId, setTplTargetIntentId] = useState('all');
  const [tplOutputType, setTplOutputType] = useState('');
  const [tplModelId, setTplModelId] = useState('');
  const [tplPrompt, setTplPrompt] = useState('');

  // View / Edit state
  const [viewItem, setViewItem] = useState<Evaluator | null>(null);
  const [editItem, setEditItem] = useState<Evaluator | null>(null);
  const [editName, setEditName] = useState('');
  const [editOutputType, setEditOutputType] = useState<string>('分数');
  const [editCategory, setEditCategory] = useState<string>('自定义');
  const [editTargetIntentId, setEditTargetIntentId] = useState<string>('all');
  const [editModelId, setEditModelId] = useState('');
  const [editPrompt, setEditPrompt] = useState('');

  // Filters (multi-select)
  const [filterTargetIntent, setFilterTargetIntent] = useState<string[]>([]);
  const [filterOutputType, setFilterOutputType] = useState<string[]>([]);
  const [filterCategory, setFilterCategory] = useState<string[]>([]);

  const templateCategories = [
    { key: 'recommended', label: '推荐' },
    { key: 'quality', label: '质量' },
    { key: 'conversation', label: '对话' },
    { key: 'comprehensive', label: '综合' },
  ];

  const templates = [
    { name: '任务完成度评估员', desc: '根据整个对话判断AI是否成功完成用户目标', category: 'quality', outputType: '分数', modelId: '1', prompt: '你是一名任务完成度评估员。\n\n请根据整个对话判断AI是否成功完成用户目标。\n\n重点关注：\n1. 是否识别真实需求\n2. 是否覆盖所有关键要求\n3. 是否给出可执行结果\n4. 是否存在遗漏任务\n\n评分：\n1=完全未完成\n2=部分完成\n3=基本完成\n4=较好完成\n5=完全完成\n\n输出：\nScore: X\nReason:简要说明原因' },
    { name: '用户满意度评估员', desc: '从用户视角判断本次对话结束后用户是否可能满意', category: 'quality', outputType: '分数', modelId: '1', prompt: '你是一名用户满意度评估员。\n\n请从用户视角判断本次对话结束后用户是否可能满意。\n\n重点关注：\n1. 问题是否得到解决\n2. 回复是否有帮助\n3. 是否存在明显挫败感\n4. AI是否持续推进问题解决\n\n评分：\n1=极不满意\n2=不满意\n3=一般\n4=满意\n5=非常满意\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '信息准确度评估员', desc: '判断AI提供的信息是否准确、一致、可信', category: 'quality', outputType: '分数', modelId: '1', prompt: '你是一名信息准确度评估员。\n\n请判断AI提供的信息是否准确、一致、可信。\n\n重点关注：\n1. 是否出现事实错误\n2. 是否出现逻辑矛盾\n3. 是否误解用户问题\n4. 是否存在明显幻觉\n\n评分：\n1=大量错误\n2=较多错误\n3=基本准确\n4=准确\n5=高度准确\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '指令遵循评估员', desc: '判断AI是否遵循用户在整个对话中的要求', category: 'quality', outputType: '分数', modelId: '1', prompt: '你是一名指令遵循评估员。\n\n请判断AI是否遵循用户在整个对话中的要求。\n\n重点关注：\n1. 是否满足格式要求\n2. 是否满足内容要求\n3. 是否遗漏用户约束\n4. 是否偏离任务目标\n\n评分：\n1=严重违背\n2=部分违背\n3=基本遵循\n4=较好遵循\n5=完全遵循\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '上下文理解评估员', desc: '判断AI是否正确理解并利用历史对话信息', category: 'conversation', outputType: '分数', modelId: '1', prompt: '你是一名上下文理解评估员。\n\n请判断AI是否正确理解并利用历史对话信息。\n\n重点关注：\n1. 是否正确引用历史信息\n2. 是否理解代词指代\n3. 是否保持上下文一致\n4. 是否出现遗忘现象\n\n评分：\n1=严重失误\n2=较多失误\n3=基本正确\n4=理解良好\n5=理解优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '多轮推理评估员', desc: '判断AI是否能利用多轮信息完成推理和决策', category: 'conversation', outputType: '分数', modelId: '1', prompt: '你是一名多轮推理评估员。\n\n请判断AI是否能利用多轮信息完成推理和决策。\n\n重点关注：\n1. 是否整合历史条件\n2. 是否进行合理推断\n3. 是否保持逻辑链条\n4. 是否出现推理断裂\n\n评分：\n1=无法推理\n2=推理较差\n3=基本推理\n4=推理良好\n5=推理优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '沟通表达评估员', desc: '判断AI回复是否清晰、易懂、结构合理', category: 'quality', outputType: '分数', modelId: '1', prompt: '你是一名沟通表达评估员。\n\n请判断AI回复是否清晰、易懂、结构合理。\n\n重点关注：\n1. 表达清晰度\n2. 结构组织\n3. 信息密度\n4. 阅读体验\n\n评分：\n1=非常差\n2=较差\n3=一般\n4=良好\n5=优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '问题解决能力评估员', desc: '判断AI是否真正推动问题解决', category: 'quality', outputType: '分数', modelId: '1', prompt: '你是一名问题解决评估员。\n\n请判断AI是否真正推动问题解决。\n\n重点关注：\n1. 是否定位问题\n2. 是否提供方案\n3. 是否帮助决策\n4. 是否推动问题闭环\n\n评分：\n1=无帮助\n2=帮助有限\n3=部分帮助\n4=有效帮助\n5=显著帮助\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '对话轨迹评估员', desc: '判断整个对话的发展过程是否合理', category: 'conversation', outputType: '分数', modelId: '1', prompt: '你是一名对话轨迹评估员。\n\n请判断整个对话的发展过程是否合理。\n\n重点关注：\n1. 是否逐步推进目标\n2. 是否存在无效循环\n3. 是否频繁偏题\n4. 是否最终收敛\n\n评分：\n1=严重偏离\n2=较差\n3=一般\n4=良好\n5=优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因' },
    { name: '综合评估员', desc: '综合评估整个对话是否成功', category: 'comprehensive', outputType: '分数', modelId: '1', prompt: '你是一名高级对话评估员。\n\n请综合评估整个对话是否成功。\n\n综合考虑：\n1. 任务完成度\n2. 用户满意度\n3. 信息准确度\n4. 指令遵循\n5. 上下文理解\n6. 问题解决效果\n\n评分：\n1=失败\n2=较差\n3=一般\n4=成功\n5=非常成功\n\n输出格式：\nScore: X\nSuccess: Yes/No\nReason:\n简要说明原因' },
  ];

  // Get constraints for a specific intent
  const getConstraintsForIntentId = (intentId: string) => {
    const intent = intents.find((i) => i.id === intentId);
    if (!intent) return [];
    const version = intentVersions.find(
      (v) => v.intentId === intent.id && v.id === intent.activeVersion
    );
    return version?.constraints ?? [];
  };

  const availableConstraints = formTargetIntentId !== 'all' ? getConstraintsForIntentId(formTargetIntentId) : [];

  const getIntentName = (intentId?: string) => {
    if (!intentId || intentId === 'all') return '所有意图';
    const intent = intents.find((i) => i.id === intentId);
    return intent ? intent.name : intentId;
  };

  const filteredEvaluators = evaluators.filter((e) => {
    if (filterTargetIntent.length > 0 && !filterTargetIntent.includes(e.targetIntentId || 'all')) return false;
    if (filterOutputType.length > 0 && !filterOutputType.includes(e.outputType)) return false;
    if (filterCategory.length > 0 && !filterCategory.includes(e.category)) return false;
    return true;
  });

  const uniqueOutputTypes = [...new Set(evaluators.map((e) => e.outputType))];
  const uniqueCategories = [...new Set(evaluators.map((e) => e.category))];
  const uniqueTargetIntents = [...new Set(evaluators.map((e) => e.targetIntentId || 'all'))];

  const handleCreateFromScratch = () => {
    if (!formName.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    addEvaluator({
      id: String(Date.now()),
      name: formName.trim(),
      type: '自定义',
      outputType: formOutputType as any,
      category: formCategory as any,
      targetIntentId: formTargetIntentId,
      selectedConstraints: formSelectedConstraints.length > 0 ? formSelectedConstraints : undefined,
      builtin: false,
      systemPrompt: formPrompt,
      modelId: formModelId || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setFormCategory('自定义');
    setFormName('');
    setFormTargetIntentId('all');
    setFormOutputType('分数');
    setFormModelId('');
    setFormPrompt(DEFAULT_CUSTOM_PROMPT);
    setFormSelectedConstraints([]);
    setCreateMode(null);
    setCreateModal(false);
  };

  const handleCreateFromTemplate = () => {
    if (!tplName.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    addEvaluator({
      id: String(Date.now()),
      name: tplName.trim(),
      type: 'LLM as a judge',
      outputType: tplOutputType as any,
      category: (tplCategory === 'quality' ? '质量' : tplCategory === 'conversation' ? '对话' : tplCategory === 'comprehensive' ? '综合' : '自定义') as any,
      targetIntentId: tplTargetIntentId,
      builtin: false,
      systemPrompt: tplPrompt,
      modelId: tplModelId || undefined,
      createdAt: now,
      updatedAt: now,
    });
    setSelectedTemplate(null);
    setCreateMode(null);
    setCreateModal(false);
  };

  const selectTemplate = (template: typeof templates[0]) => {
    setSelectedTemplate(template);
    setTplCategory(template.category);
    setTplName(template.name);
    setTplTargetIntentId('all');
    setTplOutputType(template.outputType);
    setTplModelId(template.modelId);
    setTplPrompt(template.prompt);
  };

  const openEdit = (item: Evaluator) => {
    setEditItem(item);
    setEditName(item.name);
    setEditOutputType(item.outputType);
    setEditCategory(item.category);
    setEditTargetIntentId(item.targetIntentId || 'all');
    setEditModelId(item.modelId || '');
    setEditPrompt(item.systemPrompt || '');
  };

  const handleEdit = () => {
    if (!editItem || !editName.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    updateEvaluator(editItem.id, {
      name: editName.trim(),
      outputType: editOutputType as any,
      category: editCategory as any,
      targetIntentId: editTargetIntentId,
      modelId: editModelId || undefined,
      systemPrompt: editPrompt,
      updatedAt: now,
    });
    setEditItem(null);
  };

  const handleDelete = (item: Evaluator) => {
    if (confirm(`确定要删除评估员「${item.name}」吗？此操作不可撤销。`)) {
      deleteEvaluator(item.id);
    }
  };

  const columns = [
    {
      key: 'name',
      title: '评估员名称',
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    {
      key: 'targetIntentId',
      title: (
        <HeaderFilter
          label="目标意图"
          value={filterTargetIntent}
          onChange={setFilterTargetIntent}
          options={uniqueTargetIntents.map((id) => ({ value: id, label: getIntentName(id) }))}
        />
      ),
      render: (v: string) => <span style={{ fontSize: 13 }}>{getIntentName(v)}</span>,
    },
    {
      key: 'outputType',
      title: (
        <HeaderFilter
          label="输出类型"
          value={filterOutputType}
          onChange={setFilterOutputType}
          options={uniqueOutputTypes.map((t) => ({ value: t, label: t }))}
        />
      ),
      render: (v: string) => {
        const t = v === '分数' ? 'warning' : v === '对/错' ? 'success' : 'default';
        return <Badge type={t}>{v}</Badge>;
      },
    },
    {
      key: 'category',
      title: (
        <HeaderFilter
          label="分类"
          value={filterCategory}
          onChange={setFilterCategory}
          options={uniqueCategories.map((c) => ({ value: c, label: c }))}
        />
      ),
      muted: true,
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: Evaluator) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => setViewItem(row)}>查看</Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>编辑</Button>
          {!row.builtin && (
            <Button variant="ghost" size="sm" onClick={() => handleDelete(row)} style={{ color: 'var(--error)' }}>
              删除
            </Button>
          )}
        </div>
      ),
    },
  ];

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  };

  const selectStyle = {
    ...inputStyle,
    background: 'var(--bg-card)',
  };

  return (
    <div>
      <PageHeader
        title="评估员管理"
        subtitle="创建和管理评估策略，支持分数、对/错、评价内容三种输出类型"
        actions={
          <Button
            onClick={() => {
              setCreateMode(null);
              setSelectedTemplate(null);
              setFormPrompt(DEFAULT_CUSTOM_PROMPT);
              setFormSelectedConstraints([]);
              setCreateModal(true);
            }}
          >
            创建评估员
          </Button>
        }
      />
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <Table columns={columns} data={filteredEvaluators} />
      </div>

      {/* 创建评估员 Modal */}
      <Modal
        title="创建评估员"
        open={createModal}
        onClose={() => setCreateModal(false)}
        width={720}
      >
        {!createMode ? (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <Card
                onClick={() => setCreateMode('scratch')}
                style={{ cursor: 'pointer', border: '1px solid var(--border)', boxShadow: 'none', textAlign: 'center', padding: '32px 24px' }}
              >
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>◇</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>自定义创建</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>基于约束评估提示词，选择特定约束进行评估</div>
              </Card>
              <Card
                onClick={() => setCreateMode('template')}
                style={{ cursor: 'pointer', border: '1px solid var(--border)', boxShadow: 'none', textAlign: 'center', padding: '32px 24px' }}
              >
                <div style={{ fontSize: 28, marginBottom: 12, opacity: 0.4 }}>▦</div>
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>根据模板创建</div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>从10种预设评估模板快速创建</div>
              </Card>
            </div>
          </div>
        ) : createMode === 'template' ? (
          <div>
            <Button variant="ghost" size="sm" onClick={() => { setCreateMode(null); setSelectedTemplate(null); }} style={{ marginBottom: 16 }}>
              ← 返回
            </Button>
            {!selectedTemplate ? (
              <div style={{ display: 'flex', gap: 24, minHeight: 380 }}>
                <div style={{ minWidth: 140 }}>
                  {templateCategories.map((cat) => (
                    <div
                      key={cat.key}
                      onClick={() => setSelectedCat(cat.key)}
                      style={{
                        padding: '8px 12px',
                        fontSize: 13,
                        cursor: 'pointer',
                        borderRadius: 'var(--radius-xs)',
                        fontWeight: selectedCat === cat.key ? 500 : 400,
                        color: selectedCat === cat.key ? 'var(--accent-dark)' : 'var(--ink-muted)',
                        background: selectedCat === cat.key ? 'var(--accent-light)' : 'transparent',
                      }}
                    >
                      {cat.label}
                    </div>
                  ))}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 400, overflow: 'auto' }}>
                  {templates
                    .filter((t) => selectedCat === 'recommended' || t.category === selectedCat)
                    .map((t) => (
                      <div
                        key={t.name}
                        onClick={() => selectTemplate(t)}
                        style={{
                          padding: '16px 20px',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--accent)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--border)';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</span>
                          <Badge type="accent">{t.outputType}</Badge>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--ink-muted)', lineHeight: 1.5 }}>{t.desc}</div>
                      </div>
                    ))}
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>分类</label>
                  <select
                    value={tplCategory}
                    onChange={(e) => setTplCategory(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="quality">质量</option>
                    <option value="conversation">对话</option>
                    <option value="comprehensive">综合</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    评估员名称 <span style={{ color: 'var(--error)' }}>*</span>
                  </label>
                  <input
                    value={tplName}
                    onChange={(e) => setTplName(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>目标意图</label>
                  <select
                    value={tplTargetIntentId}
                    onChange={(e) => setTplTargetIntentId(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="all">所有意图</option>
                    {intents.map((i) => (
                      <option key={i.id} value={i.id}>{i.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>输出类型</label>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['分数', '对/错', '评价内容'].map((t) => (
                      <label
                        key={t}
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}
                      >
                        <input
                          type="radio"
                          name="tplOutputType"
                          checked={tplOutputType === t}
                          onChange={() => setTplOutputType(t)}
                          style={{ accentColor: 'var(--accent)' }}
                        />
                        {t}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>评估模型</label>
                  <select
                    value={tplModelId}
                    onChange={(e) => setTplModelId(e.target.value)}
                    style={selectStyle}
                  >
                    {models.filter((m) => m.status === '正常').map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>评估提示词</label>
                  <textarea
                    rows={6}
                    value={tplPrompt}
                    onChange={(e) => setTplPrompt(e.target.value)}
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
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                  <Button variant="secondary" onClick={() => setSelectedTemplate(null)}>返回选择模板</Button>
                  <Button onClick={handleCreateFromTemplate}>保存创建</Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <Button variant="ghost" size="sm" onClick={() => setCreateMode(null)} style={{ marginBottom: 16 }}>
              ← 返回
            </Button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  分类 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  style={selectStyle}
                >
                  <option value="安全性">安全性</option>
                  <option value="质量">质量</option>
                  <option value="对话">对话</option>
                  <option value="综合">综合</option>
                  <option value="自定义">自定义</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  评估员名称 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  style={inputStyle}
                  placeholder="如：外呼约束遵循评估"
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  目标意图
                </label>
                <select
                  value={formTargetIntentId}
                  onChange={(e) => {
                    setFormTargetIntentId(e.target.value);
                    setFormSelectedConstraints([]);
                  }}
                  style={selectStyle}
                >
                  <option value="all">所有意图</option>
                  {intents.map((i) => (
                    <option key={i.id} value={i.id}>{i.name}</option>
                  ))}
                </select>
              </div>
              {/* Constraint multi-select dropdown */}
              {formTargetIntentId !== 'all' && availableConstraints.length > 0 && (
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                    选择约束（提示词中【约束内容】将使用此处选择的约束）
                  </label>
                  <ConstraintMultiSelect
                    constraints={availableConstraints}
                    selected={formSelectedConstraints}
                    onChange={setFormSelectedConstraints}
                  />
                </div>
              )}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  输出类型 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {['分数', '对/错', '评价内容'].map((t) => (
                    <label
                      key={t}
                      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}
                    >
                      <input
                        type="radio"
                        name="outputType"
                        checked={formOutputType === t}
                        onChange={() => setFormOutputType(t)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      {t}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  评估模型
                </label>
                <select
                  value={formModelId}
                  onChange={(e) => setFormModelId(e.target.value)}
                  style={selectStyle}
                >
                  <option value="">请选择模型</option>
                  {models.filter((m) => m.status === '正常').map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                  评估提示词 <span style={{ color: 'var(--error)' }}>*</span>
                </label>
                <textarea
                  rows={10}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
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
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
                <Button variant="secondary" onClick={() => setCreateModal(false)}>取消</Button>
                <Button onClick={handleCreateFromScratch}>创建评估员</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 查看评估员 Modal */}
      <Modal title="评估员详情" open={!!viewItem} onClose={() => setViewItem(null)} width={600}>
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>评估员名称</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{viewItem.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>分类</div>
                <div style={{ fontSize: 13 }}>{viewItem.category}</div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>目标意图</div>
                <div style={{ fontSize: 13 }}>{getIntentName(viewItem.targetIntentId)}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>输出类型</div>
                <Badge type={viewItem.outputType === '分数' ? 'warning' : viewItem.outputType === '对/错' ? 'success' : 'default'}>
                  {viewItem.outputType}
                </Badge>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>评估模型</div>
                <div style={{ fontSize: 13 }}>
                  {viewItem.modelId ? (models.find((m) => m.id === viewItem.modelId)?.name || viewItem.modelId) : '未指定'}
                </div>
              </div>
            </div>
            {viewItem.selectedConstraints && viewItem.selectedConstraints.length > 0 && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>已选约束</div>
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-warm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  {viewItem.selectedConstraints.map((c, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.6, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--ink-muted)', minWidth: 20 }}>{i + 1}.</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>创建时间</div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{viewItem.createdAt}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>更新时间</div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{viewItem.updatedAt}</div>
              </div>
            </div>
            {viewItem.systemPrompt && (
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>评估提示词</div>
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--bg-warm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  lineHeight: 1.8,
                  whiteSpace: 'pre-wrap',
                  maxHeight: 200,
                  overflow: 'auto',
                }}>
                  {viewItem.systemPrompt}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setViewItem(null)}>关闭</Button>
              <Button onClick={() => { openEdit(viewItem); setViewItem(null); }}>编辑</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑评估员 Modal */}
      <Modal title="编辑评估员" open={!!editItem} onClose={() => setEditItem(null)} width={640}>
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                分类
              </label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                style={selectStyle}
              >
                <option value="安全性">安全性</option>
                <option value="质量">质量</option>
                <option value="对话">对话</option>
                <option value="综合">综合</option>
                <option value="自定义">自定义</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                评估员名称 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                目标意图
              </label>
              <select
                value={editTargetIntentId}
                onChange={(e) => setEditTargetIntentId(e.target.value)}
                style={selectStyle}
              >
                <option value="all">所有意图</option>
                {intents.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                输出类型
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['分数', '对/错', '评价内容'].map((t) => (
                  <label
                    key={t}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}
                  >
                    <input
                      type="radio"
                      name="editOutputType"
                      checked={editOutputType === t}
                      onChange={() => setEditOutputType(t)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                评估模型
              </label>
              <select
                value={editModelId}
                onChange={(e) => setEditModelId(e.target.value)}
                style={selectStyle}
              >
                <option value="">未指定</option>
                {models.filter((m) => m.status === '正常').map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                评估提示词
              </label>
              <textarea
                rows={6}
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
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
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setEditItem(null)}>取消</Button>
              <Button onClick={handleEdit}>保存修改</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// Constraint multi-select dropdown component (similar to HeaderFilter UI)
function ConstraintMultiSelect({
  constraints,
  selected,
  onChange,
}: {
  constraints: string[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((v) => v !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          padding: '10px 14px',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          fontSize: 13,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--bg-card)',
          minHeight: 42,
        }}
      >
        <span style={{ color: selected.length > 0 ? 'var(--ink)' : 'var(--ink-muted)' }}>
          {selected.length > 0 ? `已选择 ${selected.length} 条约束` : '点击选择约束条件'}
        </span>
        <span style={{
          fontSize: 12,
          color: selected.length > 0 ? 'var(--accent)' : 'var(--ink-light)',
          transition: 'transform 0.15s',
          transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        }}>
          ▾
        </span>
      </div>
      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            right: 0,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
            zIndex: 100,
            padding: '6px 0',
            maxHeight: 240,
            overflow: 'auto',
          }}
        >
          {constraints.map((c, i) => (
            <label
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '8px 14px',
                cursor: 'pointer',
                color: selected.includes(c) ? 'var(--accent-dark)' : 'var(--ink)',
                background: selected.includes(c) ? 'var(--accent-light)' : 'transparent',
                transition: 'background 0.1s',
                fontSize: 13,
                lineHeight: 1.5,
              }}
              onMouseEnter={(e) => {
                if (!selected.includes(c)) e.currentTarget.style.background = 'var(--bg-warm)';
              }}
              onMouseLeave={(e) => {
                if (!selected.includes(c)) e.currentTarget.style.background = 'transparent';
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(c)}
                onChange={() => toggle(c)}
                style={{ accentColor: 'var(--accent)', width: 14, height: 14, marginTop: 2, flexShrink: 0 }}
              />
              <span>{c}</span>
            </label>
          ))}
          {selected.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 4, paddingTop: 4 }}>
              <div
                onClick={() => onChange([])}
                style={{
                  padding: '6px 14px',
                  fontSize: 11,
                  color: 'var(--ink-muted)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--accent)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)'; }}
              >
                清除选择
              </div>
            </div>
          )}
        </div>
      )}
      {/* Show selected constraints below */}
      {selected.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {selected.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: 'var(--ink-muted)', display: 'flex', gap: 6, padding: '4px 8px', background: 'var(--bg-warm)', borderRadius: 'var(--radius-xs)' }}>
              <span style={{ minWidth: 16 }}>{i + 1}.</span>
              <span style={{ flex: 1 }}>{c}</span>
              <span
                onClick={() => toggle(c)}
                style={{ cursor: 'pointer', color: 'var(--error)', fontSize: 14 }}
              >×</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
