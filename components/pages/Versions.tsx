'use client';

import { useState } from 'react';
import { PageHeader, Button, Table, Modal, Badge, Card } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';
import { IntentVersion } from '@/lib/backend/types';

export function Versions() {
  const { intents, intentVersions, addIntentVersion, updateIntentVersion, deleteIntentVersion } = useAppContext();

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<IntentVersion | null>(null);

  // 新建草稿版本
  const [createOpen, setCreateOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [selectedIntentIds, setSelectedIntentIds] = useState<string[]>([]);

  // 编辑版本
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<IntentVersion | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editIntentIds, setEditIntentIds] = useState<string[]>([]);

  const toggleIntent = (id: string) => {
    setSelectedIntentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleEditIntent = (id: string) => {
    setEditIntentIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreate = () => {
    if (!formName.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    const nextId = `v${intentVersions.length + 1}`;
    addIntentVersion({
      id: nextId,
      intentId: '1',
      name: formName.trim(),
      systemPrompt: formPrompt.trim(),
      constraints: [],
      status: 'draft',
      updatedAt: now,
      updater: 'admin',
      createdAt: now.slice(0, 10),
      includedIntentIds: selectedIntentIds,
    });
    setFormName('');
    setFormPrompt('');
    setSelectedIntentIds([]);
    setCreateOpen(false);
  };

  const openEdit = (item: IntentVersion) => {
    setEditItem(item);
    setEditName(item.name);
    setEditPrompt(item.systemPrompt);
    setEditIntentIds(item.includedIntentIds || []);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editItem || !editName.trim()) return;
    const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
    updateIntentVersion(editItem.id, {
      name: editName.trim(),
      systemPrompt: editPrompt.trim(),
      includedIntentIds: editIntentIds,
      updatedAt: now,
    });
    setEditOpen(false);
    setEditItem(null);
  };

  const handleDelete = (item: IntentVersion) => {
    if (item.status === 'active') {
      alert('无法删除当前启用版本，请先切换到其他版本。');
      return;
    }
    if (confirm(`确定要删除版本「${item.id} - ${item.name}」吗？`)) {
      deleteIntentVersion(item.id);
    }
  };

  const getIntentNames = (ids?: string[]) => {
    if (!ids || ids.length === 0) return [];
    return ids.map((id) => {
      const intent = intents.find((i) => i.id === id);
      return intent ? intent.name : `意图 ${id}`;
    });
  };

  const columns = [
    {
      key: 'id',
      title: '版本号',
      mono: true,
      render: (v: string) => <span style={{ fontWeight: 500 }}>{v}</span>,
    },
    { key: 'name', title: '名称' },
    {
      key: 'status',
      title: '状态',
      render: (v: string) => <Badge type={v === 'active' ? 'success' : 'default'}>{v === 'active' ? '启用' : '草稿'}</Badge>,
    },
    {
      key: 'includedIntentIds',
      title: '关联意图',
      render: (ids: string[] | undefined) => {
        const names = getIntentNames(ids);
        if (names.length === 0) return <span style={{ color: 'var(--ink-light)', fontSize: 12 }}>无</span>;
        return (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {names.slice(0, 2).map((n, i) => (
              <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 'var(--radius-xs)', background: 'var(--accent-light)', color: 'var(--accent-dark)', fontWeight: 500 }}>
                {n}
              </span>
            ))}
            {names.length > 2 && <span style={{ fontSize: 11, color: 'var(--ink-muted)' }}>+{names.length - 2}</span>}
          </div>
        );
      },
    },
    { key: 'updatedAt', title: '更新时间', muted: true, mono: true },
    { key: 'updater', title: '更新人', muted: true },
    {
      key: 'actions',
      title: '操作',
      render: (_: any, row: IntentVersion) => (
        <div style={{ display: 'flex', gap: 12 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedVersion(row);
              setDetailOpen(true);
            }}
          >
            查看
          </Button>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>编辑</Button>
          {row.status !== 'active' && (
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleDelete(row); }} style={{ color: 'var(--error)' }}>
              删除
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="版本管理"
        subtitle="管理意图提示词的各个版本，勾选关联意图创建新草稿"
        actions={<Button onClick={() => setCreateOpen(true)}>新建草稿版本</Button>}
      />
      <Card style={{ padding: 0 }}>
        <Table columns={columns} data={intentVersions} onRowClick={(row: IntentVersion) => {
          setSelectedVersion(row);
          setDetailOpen(true);
        }} />
      </Card>

      {/* 新建草稿版本 Modal */}
      <Modal title="新建草稿版本" open={createOpen} onClose={() => setCreateOpen(false)} width={640}>
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
            选择要纳入此版本的意图，新版本将以草稿状态创建，确认后可发布为启用版本。
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              版本名称 <span style={{ color: 'var(--error)' }}>*</span>
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
              placeholder="如：意图识别提示词 v21"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
              选择关联意图 <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>（勾选要纳入此版本的意图）</span>
            </label>
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              maxHeight: 240,
              overflow: 'auto',
            }}>
              {intents.map((intent) => (
                <label
                  key={intent.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 16px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-light)',
                    background: selectedIntentIds.includes(intent.id) ? 'var(--accent-light)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={selectedIntentIds.includes(intent.id)}
                    onChange={() => toggleIntent(intent.id)}
                    style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{intent.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{intent.desc}</div>
                  </div>
                  <Badge type={intent.status === 'active' ? 'success' : 'default'}>
                    {intent.status === 'active' ? '启用' : '草稿'}
                  </Badge>
                </label>
              ))}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8 }}>
              已选择 {selectedIntentIds.length} 个意图
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              System Prompt
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
              placeholder="可选：为此版本设置系统提示词..."
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!formName.trim() || selectedIntentIds.length === 0}>
              创建草稿版本
            </Button>
          </div>
        </div>
      </Modal>

      {/* 版本详情 Modal */}
      <Modal
        title="版本详情"
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={720}
      >
        {selectedVersion && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>名称</span>
                <div style={{ marginTop: 4, fontWeight: 500 }}>{selectedVersion.name}</div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>状态</span>
                <div style={{ marginTop: 4 }}>
                  <Badge type={selectedVersion.status === 'active' ? 'success' : 'default'}>
                    {selectedVersion.status === 'active' ? '启用' : '草稿'}
                  </Badge>
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>更新时间</span>
                <div style={{ marginTop: 4, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                  {selectedVersion.updatedAt}
                </div>
              </div>
              <div>
                <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>更新人</span>
                <div style={{ marginTop: 4 }}>{selectedVersion.updater}</div>
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>System Prompt</span>
              <div style={{
                marginTop: 8,
                padding: 20,
                background: 'var(--bg-warm)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                maxHeight: 280,
                overflow: 'auto'
              }}>
                {selectedVersion.systemPrompt}
              </div>
            </div>
            <div>
              <span style={{ fontSize: 12, color: 'var(--ink-muted)' }}>关联意图</span>
              <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {getIntentNames(selectedVersion.includedIntentIds).length > 0 ? (
                  getIntentNames(selectedVersion.includedIntentIds).map((name, idx) => (
                    <Badge key={idx} type="accent">{name}</Badge>
                  ))
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--ink-light)' }}>未关联意图</span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              {selectedVersion.status !== 'active' && (
                <Button variant="danger" onClick={() => { handleDelete(selectedVersion); setDetailOpen(false); }}>删除</Button>
              )}
              <Button variant="secondary" onClick={() => setDetailOpen(false)}>关闭</Button>
              <Button onClick={() => { openEdit(selectedVersion); setDetailOpen(false); }}>编辑</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑版本 Modal */}
      <Modal title="编辑版本" open={editOpen} onClose={() => setEditOpen(false)} width={640}>
        {editItem && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                版本名称 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8 }}>
                关联意图 <span style={{ color: 'var(--ink-muted)', fontWeight: 400 }}>（勾选要纳入此版本的意图）</span>
              </label>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                maxHeight: 200,
                overflow: 'auto',
              }}>
                {intents.map((intent) => (
                  <label
                    key={intent.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 16px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--border-light)',
                      background: editIntentIds.includes(intent.id) ? 'var(--accent-light)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={editIntentIds.includes(intent.id)}
                      onChange={() => toggleEditIntent(intent.id)}
                      style={{ accentColor: 'var(--accent)', width: 16, height: 16 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{intent.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 2 }}>{intent.desc}</div>
                    </div>
                    <Badge type={intent.status === 'active' ? 'success' : 'default'}>
                      {intent.status === 'active' ? '启用' : '草稿'}
                    </Badge>
                  </label>
                ))}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginTop: 8 }}>
                已选择 {editIntentIds.length} 个意图
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                System Prompt
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
            <div style={{
              padding: 12,
              background: 'var(--bg-warm)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 12,
              color: 'var(--ink-muted)',
            }}>
              版本号：{editItem.id} &nbsp;|&nbsp; 状态：{editItem.status === 'active' ? '启用' : '草稿'} &nbsp;|&nbsp; 创建时间：{editItem.createdAt}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <Button variant="secondary" onClick={() => setEditOpen(false)}>取消</Button>
              <Button onClick={handleEdit}>保存修改</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
