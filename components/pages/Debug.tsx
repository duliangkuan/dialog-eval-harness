'use client';

import { useState } from 'react';
import { PageHeader, Button, Card, Badge } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';

export function Debug() {
  const { intentVersions } = useAppContext();
  const [result, setResult] = useState<{ intent: string; confidence: number; reasoning: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("user:帮我打个车\nai:好的，请问您要从哪里出发？");
  const [query, setQuery] = useState("帮我记一下明天9点开会");

  const handleRun = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      const intentMap: Record<string, { intent: string; confidence: number; reasoning: string }> = {
        '记': { intent: '记忆助手', confidence: 3, reasoning: '用户明确表达了"记一下"的需求，结合时间信息，属于典型的记忆/提醒类意图。' },
        '打车': { intent: '打车服务', confidence: 3, reasoning: '用户表达了出行需求，属于典型的打车意图。' },
        '外卖': { intent: '外卖服务', confidence: 3, reasoning: '用户提到了外卖相关需求，属于外卖服务意图。' },
      };

      let matched = { intent: '未知意图', confidence: 1, reasoning: `根据用户输入"${query}"进行分析，未能匹配到明确的已知意图分类。可能需要扩展意图库。` };
      for (const [keyword, result] of Object.entries(intentMap)) {
        if (query.includes(keyword)) {
          matched = { ...result, reasoning: result.reasoning + `\n\n输入分析：用户说"${query}"，上下文为"${context.slice(0, 30)}..."` };
          break;
        }
      }

      setResult(matched);
      setLoading(false);
    }, 1500);
  };

  return (
    <div>
      <PageHeader
        title="在线调试"
        subtitle="快速验证单条对话，输入 Query 即时查看意图识别结果"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            输入
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                提示词版本 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <select
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
                <option>请选择要使用的提示词版本</option>
                {intentVersions.map((v) => (
                  <option key={v.id}>{v.id} - {v.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                对话上下文
              </label>
              <textarea
                rows={4}
                value={context}
                onChange={(e) => setContext(e.target.value)}
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
                placeholder="多轮对话历史，每行一条"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                当前对话 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <textarea
                rows={3}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  lineHeight: 1.7,
                  outline: 'none',
                  resize: 'vertical',
                }}
                placeholder="用户最新一条输入"
              />
            </div>
            <Button
              size="lg"
              disabled={loading}
              onClick={handleRun}
            >
              {loading ? '运行中...' : '运行调试'}
            </Button>
          </div>
        </Card>

        <Card style={{ background: result ? 'var(--bg-card)' : 'var(--bg-warm)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            调试结果
          </div>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: 'var(--accent)', marginBottom: 8, fontWeight: 500 }}>
                正在调用模型...
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-muted)' }}>
                模拟 API 请求中，请稍候
              </div>
            </div>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>识别意图</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>{result.intent}</div>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 4 }}>置信度</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                      {result.confidence}
                    </span>
                    <Badge type={result.confidence >= 3 ? 'success' : result.confidence >= 2 ? 'warning' : 'error'}>
                      {result.confidence >= 3 ? '高置信度' : result.confidence >= 2 ? '中置信度' : '低置信度'}
                    </Badge>
                  </div>
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>推理过程</div>
                <div
                  style={{
                    padding: 16,
                    background: 'var(--bg-warm)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 13,
                    lineHeight: 1.8,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {result.reasoning}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-light)', fontSize: 13 }}>
              输入 Query 并点击运行调试查看结果
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
