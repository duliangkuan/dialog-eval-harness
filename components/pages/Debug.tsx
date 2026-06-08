'use client';

import { useState, useRef, useEffect } from 'react';
import { PageHeader, Button, Card, Badge } from '../ui';
import { useAppContext } from '@/lib/store/AppContext';

type EvalResult = {
  evaluatorName: string;
  outputType: string;
  evalScore: number | string;
  evalReason: string;
};

export function Debug() {
  const { intents, intentVersions, evaluators } = useAppContext();
  const [selectedIntentId, setSelectedIntentId] = useState('1');
  const [selectedEvaluatorIds, setSelectedEvaluatorIds] = useState<string[]>([]);
  const [evalDropdownOpen, setEvalDropdownOpen] = useState(false);
  const evalDropdownRef = useRef<HTMLDivElement>(null);
  const evalTriggerRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 0 });

  const [result, setResult] = useState<{
    aiReply: string;
    evalResults: EvalResult[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState("站长:你好，请问是张师傅吗？我是站长，看到你已报名飞毛腿。\n骑手:是的，我报名了。");
  const [query, setQuery] = useState("今天不太方便跑单，能不能明天再开始？");

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        evalDropdownRef.current && !evalDropdownRef.current.contains(e.target as Node) &&
        evalTriggerRef.current && !evalTriggerRef.current.contains(e.target as Node)
      ) {
        setEvalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (evalDropdownOpen && evalTriggerRef.current) {
      const rect = evalTriggerRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  }, [evalDropdownOpen]);

  const toggleEvaluator = (id: string) => {
    setSelectedEvaluatorIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getPromptForIntent = (intentId: string) => {
    const intent = intents.find((i) => i.id === intentId);
    if (!intent) return '';
    const version = intentVersions.find(
      (v) => v.intentId === intent.id && v.id === intent.activeVersion
    );
    return version?.systemPrompt ?? '';
  };

  const simulateEvalResult = (evaluatorId: string): EvalResult => {
    const evaluator = evaluators.find((e) => e.id === evaluatorId);
    if (!evaluator) return { evaluatorName: '', outputType: '', evalScore: '', evalReason: '' };

    let evalScore: number | string = '';
    let evalReason = '';

    if (evaluator.outputType === '分数') {
      if (evaluator.name.includes('任务完成')) {
        evalScore = 4;
        evalReason = 'AI成功识别骑手的顾虑并给出了合理回应，推进了通知任务，但未完全覆盖所有信息点。';
      } else if (evaluator.name.includes('沟通表达')) {
        evalScore = 5;
        evalReason = '回复简短自然，符合电话沟通风格，语气随意亲切，控制在30字以内。';
      } else if (evaluator.name.includes('指令遵循')) {
        evalScore = 4;
        evalReason = '基本遵循了对话流程，回复简短自然。但在挽留骑手时可以更详细说明影响。';
      } else if (evaluator.name.includes('上下文')) {
        evalScore = 5;
        evalReason = '正确理解了骑手表达的不便，结合飞毛腿合同背景给出了恰当回应。';
      } else if (evaluator.name.includes('综合')) {
        evalScore = 4;
        evalReason = '整体对话表现良好，正确识别需求并推进任务，语言风格符合场景要求。';
      } else if (evaluator.name.includes('满意度')) {
        evalScore = 4;
        evalReason = '骑手的顾虑得到了回应，AI尝试挽留并提供了合理解释，整体体验较好。';
      } else if (evaluator.name.includes('准确')) {
        evalScore = 5;
        evalReason = '回复中关于合同生效和派单影响的信息准确，无事实错误或逻辑矛盾。';
      } else if (evaluator.name.includes('多轮')) {
        evalScore = 4;
        evalReason = '能够结合上文骑手报名飞毛腿的背景，合理推断当前应挽留骑手继续配送。';
      } else if (evaluator.name.includes('轨迹')) {
        evalScore = 4;
        evalReason = '对话逐步推进通知目标，面对骑手犹豫时合理切换到挽留策略。';
      } else if (evaluator.name.includes('问题解决')) {
        evalScore = 3;
        evalReason = '部分推动了问题解决，但未给出骑手如果确实无法配送时的替代方案。';
      } else if (evaluator.name.includes('约束遵循')) {
        evalScore = 4;
        evalReason = '基本符合约束要求，回复简短自然，遵循了对话流程。语气随意但略超30字限制。';
      } else if (evaluator.name.includes('语气')) {
        evalScore = 5;
        evalReason = '回复极简，口语化表达自然，未使用正式措辞或语气词，符合电话风格。';
      } else {
        evalScore = 4;
        evalReason = `基于${evaluator.name}的评估标准，AI回复整体表现良好，满足主要要求。`;
      }
    } else if (evaluator.outputType === '对/错') {
      evalScore = '对';
      evalReason = '未检测到违规行为，AI回复符合安全和合规要求。';
    } else {
      evalScore = '良好';
      evalReason = 'AI的回复自然流畅，正确响应了骑手的顾虑，推进了通话目标。';
    }

    return {
      evaluatorName: evaluator.name,
      outputType: evaluator.outputType,
      evalScore,
      evalReason,
    };
  };

  const handleRun = () => {
    setLoading(true);
    setResult(null);
    setTimeout(() => {
      // Simulate AI reply based on intent prompt
      let aiReply = '';
      if (selectedIntentId === '1') {
        if (query.includes('不方便') || query.includes('不行') || query.includes('不能')) {
          aiReply = '理解的，但飞毛腿合同今天已生效，如果今天不跑的话可能影响后续派单。要不先上线试试？';
        } else if (query.includes('取消') || query.includes('退出')) {
          aiReply = '退出飞毛腿需要前一天在App里取消，次日才生效。今天的合同还是要完成的哦。';
        } else if (query.includes('多少单') || query.includes('几单')) {
          aiReply = '单日合同当天要完成X单，多日合同每天至少Y单，连续完成W天还有额外奖励。';
        } else {
          aiReply = '好的师傅，今天飞毛腿合同已经生效了，午餐和晚餐高峰期记得上线，注意安全。';
        }
      } else if (selectedIntentId === '2') {
        if (query.includes('标准') || query.includes('低延迟')) {
          aiReply = '低延迟直播延迟1-2秒，互动更流畅，适合小班课。标准直播延迟5-10秒，费用更低。';
        } else {
          aiReply = '您好，我们直播产品升级了，发课时可以选低延迟直播，互动体验更好。';
        }
      } else {
        aiReply = '您好，请问有什么可以帮您的？';
      }

      // Simulate evaluator results for all selected evaluators
      const evalResults: EvalResult[] = selectedEvaluatorIds.map((id) => simulateEvalResult(id));

      setResult({ aiReply, evalResults });
      setLoading(false);
    }, 1500);
  };

  const selectStyle = {
    width: '100%',
    padding: '10px 14px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
    background: 'var(--bg-card)',
  };

  const selectedEvaluatorNames = selectedEvaluatorIds
    .map((id) => evaluators.find((e) => e.id === id)?.name)
    .filter(Boolean);

  return (
    <div>
      <PageHeader
        title="在线调试"
        subtitle="输入对话上下文和用户问询，查看 AI 回复及评估员评分"
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Card>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 20, fontFamily: 'var(--font-display)' }}>
            输入
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                意图 <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <select
                value={selectedIntentId}
                onChange={(e) => setSelectedIntentId(e.target.value)}
                style={selectStyle}
              >
                <option value="">请选择意图</option>
                {intents.map((i) => (
                  <option key={i.id} value={i.id}>{i.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                评估员（可多选）
              </label>
              <div
                ref={evalTriggerRef}
                onClick={() => setEvalDropdownOpen(!evalDropdownOpen)}
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  border: `1px solid ${evalDropdownOpen ? 'var(--accent)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  outline: 'none',
                  background: 'var(--bg-card)',
                  cursor: 'pointer',
                  minHeight: 42,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ color: selectedEvaluatorIds.length > 0 ? 'var(--ink)' : 'var(--ink-light)' }}>
                  {selectedEvaluatorIds.length > 0
                    ? `已选择 ${selectedEvaluatorIds.length} 个评估员`
                    : '点击选择评估员（可选）'}
                </span>
                <span style={{
                  fontSize: 12,
                  color: selectedEvaluatorIds.length > 0 ? 'var(--accent)' : 'var(--ink-light)',
                  padding: '2px 5px',
                  borderRadius: 3,
                  background: selectedEvaluatorIds.length > 0 ? 'var(--accent-light)' : 'transparent',
                }}>
                  ▾
                </span>
              </div>
              {evalDropdownOpen && (
                <div
                  ref={evalDropdownRef}
                  style={{
                    position: 'fixed',
                    top: dropdownPos.top,
                    left: dropdownPos.left,
                    width: dropdownPos.width,
                    maxHeight: 260,
                    overflowY: 'auto',
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                    zIndex: 1000,
                    padding: '6px 0',
                    fontSize: 12,
                  }}
                >
                  {evaluators.map((ev) => (
                    <label
                      key={ev.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '8px 14px',
                        cursor: 'pointer',
                        color: selectedEvaluatorIds.includes(ev.id) ? 'var(--accent-dark)' : 'var(--ink)',
                        background: selectedEvaluatorIds.includes(ev.id) ? 'var(--accent-light)' : 'transparent',
                        transition: 'background 0.1s',
                        fontWeight: selectedEvaluatorIds.includes(ev.id) ? 500 : 400,
                      }}
                      onMouseEnter={(e) => {
                        if (!selectedEvaluatorIds.includes(ev.id)) e.currentTarget.style.background = 'var(--bg-warm)';
                      }}
                      onMouseLeave={(e) => {
                        if (!selectedEvaluatorIds.includes(ev.id)) e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={selectedEvaluatorIds.includes(ev.id)}
                        onChange={() => toggleEvaluator(ev.id)}
                        style={{ accentColor: 'var(--accent)', width: 14, height: 14 }}
                      />
                      <span>{ev.name}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--ink-light)' }}>
                        {ev.outputType}
                      </span>
                    </label>
                  ))}
                  {selectedEvaluatorIds.length > 0 && (
                    <div style={{ borderTop: '1px solid var(--border-light)', marginTop: 4, paddingTop: 4 }}>
                      <div
                        onClick={() => setSelectedEvaluatorIds([])}
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
              {selectedEvaluatorNames.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                  {selectedEvaluatorNames.map((name) => (
                    <span
                      key={name}
                      style={{
                        display: 'inline-block',
                        fontSize: 11,
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-xs)',
                        background: 'var(--accent-light)',
                        color: 'var(--accent-dark)',
                        fontWeight: 500,
                      }}
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}
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
                placeholder="多轮对话历史"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 6 }}>
                当前对话（用户输入） <span style={{ color: 'var(--error)' }}>*</span>
              </label>
              <textarea
                rows={2}
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
                placeholder="骑手/用户的最新一句话"
              />
            </div>
            <Button
              size="lg"
              disabled={loading || !selectedIntentId}
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
              {/* AI Reply */}
              <div>
                <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 8 }}>AI 回复</div>
                <div style={{
                  padding: '14px 16px',
                  background: 'var(--accent-light)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: 'var(--accent-dark)',
                  fontWeight: 500,
                }}>
                  {result.aiReply}
                </div>
              </div>

              {/* Evaluator Results */}
              {result.evalResults.length > 0 ? (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--ink-muted)', marginBottom: 10 }}>
                    评估结果（{result.evalResults.length} 个评估员）
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {result.evalResults.map((er, idx) => (
                      <div
                        key={idx}
                        style={{
                          padding: '14px 16px',
                          background: 'var(--bg-warm)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink-muted)', marginBottom: 10 }}>
                          {er.evaluatorName}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                          {er.outputType === '分数' ? (
                            <>
                              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                                {er.evalScore}
                              </span>
                              <span style={{ fontSize: 13, color: 'var(--ink-muted)' }}>/ 5</span>
                              <Badge type={
                                (er.evalScore as number) >= 4 ? 'success' :
                                (er.evalScore as number) >= 3 ? 'warning' : 'error'
                              }>
                                {(er.evalScore as number) >= 4 ? '良好' :
                                 (er.evalScore as number) >= 3 ? '一般' : '较差'}
                              </Badge>
                            </>
                          ) : er.outputType === '对/错' ? (
                            <Badge type={er.evalScore === '对' ? 'success' : 'error'}>
                              {er.evalScore === '对' ? '通过' : '未通过'}
                            </Badge>
                          ) : (
                            <Badge type="accent">评价内容</Badge>
                          )}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--ink)' }}>
                          {er.evalReason}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ padding: 16, background: 'var(--bg-warm)', borderRadius: 'var(--radius-sm)', fontSize: 12, color: 'var(--ink-muted)', textAlign: 'center' }}>
                  未选择评估员，仅展示 AI 回复结果
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--ink-light)', fontSize: 13 }}>
              输入对话并点击运行调试查看 AI 回复及评估结果
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
