'use client';

import { useState } from 'react';
import { PageHeader, Button, Table, Modal, Badge, HeaderFilter } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { Intent } from '@/lib/backend/types';

export function Intents() {
  const { intents, intentVersions, addIntent, addIntentVersion, updateIntent, deleteIntent, updateIntentVersion } = useAppContext();
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formId, setFormId] = useState('');
  const [formCreator, setFormCreator] = useState('');
  const [formVersion, setFormVersion] = useState('V1');
  const [formConstraints, setFormConstraints] = useState<string[]>(['']);

  // Filter state (multi-select)
  const [filterId, setFilterId] = useState<string[]>([]);
  const [filterVersion, setFilterVersion] = useState<string[]>([]);
  const [filterCreator, setFilterCreator] = useState<string[]>([]);

  // View / Edit state
  const [viewItem, setViewItem] = useState<Intent | null>(null);
  const [editItem, setEditItem] = useState<Intent | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editStatus, setEditStatus] = useState<string>('draft');
  const [editPrompt, setEditPrompt] = useState('');

  const filteredIntents = intents.filter((i) => {
    if (filterId.length > 0 && !filterId.includes(i.id)) return false;
    if (filterVersion.length > 0 && !filterVersion.includes(i.activeVersion)) return false;
    if (filterCreator.length > 0 && !filterCreator.includes(i.creator)) return false;
    return true;
  });

  const uniqueIds = [...new Set(intents.map((i) => i.id))];
  const uniqueVersions = [...new Set(intents.map((i) => i.activeVersion))];
  const uniqueCreators = [...new Set(intents.map((i) => i.creator))];

  const getPromptForIntent = (intent: Intent) => {
    const version = intentVersions.find(
      (v) => v.intentId === intent.id && v.id === intent.activeVersion
    );
    return version?.systemPrompt ?? '';
  };

  const getConstraintsForIntent = (intent: Intent) => {
    const version = intentVersions.find(
      (v) => v.intentId === intent.id && v.id === intent.activeVersion
    );
    return version?.constraints ?? [];
  };

  const handleCreate = () => {
    if (!formName.trim() || !formPrompt.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const intentId = formId.trim() || String(Date.now());
    const version = formVersion.trim() || 'V1';
    const creator = formCreator.trim() || 'system';
    addIntent({
      id: intentId,
      name: formName.trim(),
      desc: formDesc.trim() || formName.trim(),
      versions: 1,
      activeVersion: version,
      updatedAt: now,
      status: 'draft',
      createdAt: now.slice(0, 10),
      creator,
    });
    addIntentVersion({
      id: version,
      intentId,
      name: formName.trim(),
      systemPrompt: formPrompt.trim(),
      constraints: formConstraints.filter((c) => c.trim() !== ''),
      status: 'draft',
      updatedAt: now,
      updater: creator,
      createdAt: now.slice(0, 10),
      includedIntentIds: [intentId],
    });
    setFormId('');
    setFormName('');
    setFormDesc('');
    setFormPrompt('');
    setFormCreator('');
    setFormVersion('V1');
    setFormConstraints(['']);
    setModalOpen(false);
  };

  const handleAddConstraint = () => {
    setFormConstraints([...formConstraints, '']);
  };

  const handleConstraintChange = (index: number, value: string) => {
    const updated = [...formConstraints];
    updated[index] = value;
    setFormConstraints(updated);
  };

  const handleRemoveConstraint = (index: number) => {
    if (formConstraints.length <= 1) return;
    const updated = formConstraints.filter((_, i) => i !== index);
    setFormConstraints(updated);
  };

  const openEdit = (item: Intent) => {
    setEditItem(item);
    setEditName(item.name);
    setEditDesc(item.desc);
    setEditStatus(item.status);
    setEditPrompt(getPromptForIntent(item));
  };

  const handleEdit = () => {
    if (!editItem || !editName.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    updateIntent(editItem.id, {
      name: editName.trim(),
      desc: editDesc.trim(),
      status: editStatus as Intent['status'],
      updatedAt: now,
    });
    // Update the prompt in the corresponding version
    const version = intentVersions.find(
      (v) => v.intentId === editItem.id && v.id === editItem.activeVersion
    );
    if (version) {
      updateIntentVersion(version.id, { systemPrompt: editPrompt, updatedAt: now });
    }
    setEditItem(null);
  };

  const handleDelete = (item: Intent) => {
    if (confirm(`确定要删除意图「${item.name}」吗？此操作不可撤销。`)) {
      deleteIntent(item.id);
    }
  };

  const columns = [
    {
      key: 'id',
      title: (
        <HeaderFilter
          label="意图 ID"
          value={filterId}
          onChange={setFilterId}
          options={uniqueIds.map((id) => ({ value: id, label: `ID: ${id}` }))}
        />
      ),
      mono: true,
      render: (value: string) => <span style={{ fontWeight: 600, color: 'var(--accent)' }}>{value}</span>,
    },
    {
      key: 'name',
      title: '意图名称',
      render: (value: string) => <span style={{ fontWeight: 500 }}>{value}</span>,
    },
    {
      key: 'creator',
      title: (
        <HeaderFilter
          label="创建人"
          value={filterCreator}
          onChange={setFilterCreator}
          options={uniqueCreators.map((c) => ({ value: c, label: c }))}
        />
      ),
      render: (value: string) => <span style={{ fontSize: 13 }}>{value}</span>,
    },
    {
      key: 'activeVersion',
      title: (
        <HeaderFilter
          label="当前版本"
          value={filterVersion}
          onChange={setFilterVersion}
          options={uniqueVersions.map((v) => ({ value: v, label: v }))}
        />
      ),
      render: (value: string) => <Badge type="accent">{value}</Badge>,
    },
    {
      key: 'status',
      title: '状态',
      render: (value: string) => (
        <Badge type={value === 'active' ? 'success' : 'default'}>
          {value === 'active' ? '启用' : '草稿'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: Intent) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <Button variant="ghost" size="sm" onClick={() => setViewItem(row)}>查看</Button>
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>编辑</Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={row.status === 'active'}
            onClick={() => handleDelete(row)}
            style={{ color: row.status === 'active' ? 'var(--ink-light)' : 'var(--error)', cursor: row.status === 'active' ? 'not-allowed' : 'pointer' }}
          >删除</Button>
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

  return (
    <div>
      <PageHeader
        title="意图管理"
        subtitle="管理任务指令提示词，创建和维护对话意图"
        actions={<Button onClick={() => setModalOpen(true)}>新建意图</Button>}
      />
      <div style={{ background: 'var(--bg-card)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)' }}>
        <Table columns={columns} data={filteredIntents} />
      </div>

      {/* 新建意图 Modal */}
      <Modal title="新建意图" open={modalOpen} onClose={() => setModalOpen(false)} width={700}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                意图 ID
              </label>
              <input
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                style={inputStyle}
                placeholder="如：3（留空则自动生成）"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                创建人
              </label>
              <input
                value={formCreator}
                onChange={(e) => setFormCreator(e.target.value)}
                style={inputStyle}
                placeholder="留空默认为 system"
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                意图名称 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                style={inputStyle}
                placeholder="如：外卖骑手站长外呼指令"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                版本
              </label>
              <input
                value={formVersion}
                onChange={(e) => setFormVersion(e.target.value)}
                style={inputStyle}
                placeholder="如：V1"
              />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              描述
            </label>
            <input
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              style={inputStyle}
              placeholder="简要描述该意图的用途"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              提示词 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <textarea
              rows={6}
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
              placeholder="输入该意图的系统提示词..."
            />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <label style={{ fontSize: 13, fontWeight: 500 }}>
                指令约束
              </label>
              <button
                type="button"
                onClick={handleAddConstraint}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: '1px solid var(--accent)',
                  background: 'var(--accent)',
                  color: '#fff',
                  fontSize: 16,
                  lineHeight: '22px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                title="添加新约束"
              >
                +
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {formConstraints.map((constraint, index) => (
                <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: 'var(--ink-muted)', minWidth: 20 }}>{index + 1}.</span>
                  <input
                    value={constraint}
                    onChange={(e) => handleConstraintChange(index, e.target.value)}
                    style={{ ...inputStyle, fontSize: 13 }}
                    placeholder={`约束条件 ${index + 1}`}
                  />
                  {formConstraints.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveConstraint(index)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--error)',
                        fontSize: 14,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                      title="删除此约束"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>取消</Button>
            <Button onClick={handleCreate}>创建意图</Button>
          </div>
        </div>
      </Modal>

      {/* 查看意图 Modal */}
      <Modal title="意图详情" open={!!viewItem} onClose={() => setViewItem(null)} width={700}>
        {viewItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>意图 ID</div>
                <div style={{ fontSize: 15, fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{viewItem.id}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>意图名称</div>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{viewItem.name}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>状态</div>
                <Badge type={viewItem.status === 'active' ? 'success' : 'default'}>
                  {viewItem.status === 'active' ? '启用' : '草稿'}
                </Badge>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>描述</div>
              <div style={{ fontSize: 14 }}>{viewItem.desc}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>当前版本</div>
                <Badge type="accent">{viewItem.activeVersion}</Badge>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>创建人</div>
                <div style={{ fontSize: 13 }}>{viewItem.creator}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>创建时间</div>
                <div style={{ fontSize: 13, fontFamily: 'var(--font-mono)' }}>{viewItem.createdAt}</div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>指令约束</div>
              {getConstraintsForIntent(viewItem).length > 0 ? (
                <div style={{
                  padding: '12px 16px',
                  background: 'var(--bg-warm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}>
                  {getConstraintsForIntent(viewItem).map((c, i) => (
                    <div key={i} style={{ fontSize: 13, lineHeight: 1.6, display: 'flex', gap: 8 }}>
                      <span style={{ color: 'var(--ink-muted)', minWidth: 20 }}>{i + 1}.</span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink-muted)' }}>暂无约束</div>
              )}
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 6 }}>提示词</div>
              <div style={{
                padding: '14px 16px',
                background: 'var(--bg-warm)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                maxHeight: 300,
                overflow: 'auto',
              }}>
                {getPromptForIntent(viewItem) || '暂无提示词'}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setViewItem(null)}>关闭</Button>
              <Button onClick={() => { openEdit(viewItem); setViewItem(null); }}>编辑</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑意图 Modal */}
      <Modal title="编辑意图" open={!!editItem} onClose={() => setEditItem(null)} width={700}>
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                意图 ID
              </label>
              <div style={{ padding: '10px 14px', fontSize: 14, fontFamily: 'var(--font-mono)', color: 'var(--ink-muted)', background: 'var(--bg-warm)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                {editItem.id}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                意图名称 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                描述
              </label>
              <input
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                提示词
              </label>
              <textarea
                rows={10}
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
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                状态
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                {['active', 'draft'].map((s) => (
                  <label
                    key={s}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontSize: 13 }}
                  >
                    <input
                      type="radio"
                      name="editStatus"
                      checked={editStatus === s}
                      onChange={() => setEditStatus(s)}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    {s === 'active' ? '启用' : '草稿'}
                  </label>
                ))}
              </div>
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
