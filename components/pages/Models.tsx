'use client';

import { useState } from 'react';
import { PageHeader, Button, Card, Modal, Badge } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';

export function Models() {
  const { models, addModel, deleteModel } = useAppContext();
  const [addModal, setAddModal] = useState(false);
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState('OpenAI');
  const [formApiKey, setFormApiKey] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');

  const handleAdd = () => {
    if (!formName.trim() || !formApiKey.trim()) return;
    const now = new Date().toISOString().slice(0, 10);
    addModel({
      id: String(Date.now()),
      name: formName.trim(),
      provider: formProvider as any,
      apiKey: formApiKey.slice(0, 3) + '****' + formApiKey.slice(-3),
      baseUrl: formBaseUrl.trim() || undefined,
      status: '未验证',
      createdAt: now,
      updatedAt: now,
    });
    setFormName('');
    setFormProvider('OpenAI');
    setFormApiKey('');
    setFormBaseUrl('');
    setAddModal(false);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`确定要删除模型「${name}」吗？`)) {
      deleteModel(id);
    }
  };

  return (
    <div>
      <PageHeader
        title="模型管理"
        subtitle="配置项目模型和 API Key，用于对话模拟与评估员调用"
        actions={<Button onClick={() => setAddModal(true)}>添加模型</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {models.map((m) => (
          <Card
            key={m.id}
            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>{m.name}</span>
                <Badge type={m.status === '正常' ? 'success' : m.status === '异常' ? 'error' : 'default'}>{m.status}</Badge>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-muted)', marginBottom: 4 }}>
                提供方：{m.provider}
              </div>
              <div style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--ink-light)', marginBottom: 4 }}>
                API Key：{m.apiKey}
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-light)' }}>
                最近使用：{m.lastUsed || '未使用'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button variant="secondary" size="sm">编辑</Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(m.id, m.name)}>删除</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal title="添加模型" open={addModal} onClose={() => setAddModal(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              模型名称 <span style={{ color: 'var(--error)' }}>*</span>
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
              placeholder="如：GPT-4o"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              提供方 <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <select
              value={formProvider}
              onChange={(e) => setFormProvider(e.target.value)}
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
              <option>OpenAI</option>
              <option>Anthropic</option>
              <option>DeepSeek</option>
              <option>其他</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              API Key <span style={{ color: 'var(--error)' }}>*</span>
            </label>
            <input
              type="password"
              value={formApiKey}
              onChange={(e) => setFormApiKey(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
              placeholder="sk-..."
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
              API Base URL（可选）
            </label>
            <input
              value={formBaseUrl}
              onChange={(e) => setFormBaseUrl(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 14,
                fontFamily: 'var(--font-mono)',
                outline: 'none',
              }}
              placeholder="https://api.openai.com/v1"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
            <Button variant="secondary" onClick={() => setAddModal(false)}>取消</Button>
            <Button onClick={handleAdd}>添加模型</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
