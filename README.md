# 美团 AI Hackathon · 复杂指令多轮对话评测系统

> 风云在 2026 美团 AI Hackathon 命题二「复杂指令下的多轮对话评测系统」中负责的两个 Agent —— **User Simulator** 与 **Eval Agent** —— 的完整方案与调研归档。

---

## 文档地图

| 文件 | 用途 | 读者 |
|---|---|---|
| [`PRD.md`](./PRD.md) | 正式产品需求文档，含功能/非功能需求、模块设计、数据格式、里程碑、验收标准 | 芳洲、翰霖、亮宽、命题方 |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | 详细架构图（Mermaid），含整体架构、User Simulator 状态机、Eval Agent 评分流、Harness Loop 时序 | 工程实现者、技术评委 |
| [`DESIGN_DEBATE_LOG.md`](./DESIGN_DEBATE_LOG.md) | 沙盒世界中马斯克 / 乔布斯 / 审判官三方辩论的完整记录（论据驱动决策的过程归档） | 想了解「为什么这样设计」的人 |
| [`research/`](./research/) | 6 份独立调研报告，每份针对一个关键问题，全部带 arXiv / GitHub 链接 | 想深入某个技术点的人 |

## 调研归档（research/）

| 编号 | 主题 | 关键产出 |
|---|---|---|
| [`01_vitabench.md`](./research/01_vitabench.md) | VitaBench 基准技术拆解 | 命题方 VitaBench 的架构、评分机制、5 个明确空白点 |
| [`02_user_simulator.md`](./research/02_user_simulator.md) | 挑战性 User Simulator 设计方法 | Non-Collaborative 4 类行为、5 个外呼 persona 模板 |
| [`03_constraint_eval.md`](./research/03_constraint_eval.md) | 约束抽取与规则遵循评测 | IFEval/FollowBench/ComplexBench/RuLES 对比、7 类外呼约束选型表 |
| [`04_per_turn_attribution.md`](./research/04_per_turn_attribution.md) | Per-turn / Per-rule 归因评分 | AgentRx 四元组归因 schema、Judge 方差控制方案 |
| [`05_multiturn_benchmarks.md`](./research/05_multiturn_benchmarks.md) | 多轮对话评测基准 | τ-bench / MultiChallenge / SEQUOR 对比、外呼场景选型 |
| [`06_reporting_dashboards.md`](./research/06_reporting_dashboards.md) | 评测报告呈现与产品化 | Braintrust / LangSmith / Datadog 模式、5 页业务方报告结构 |

## 核心结论一句话

> 别的队会搭评测流水线；风云做的是 **「带反馈归因的闭环」 + 「动态情绪 Simulator」 + 「Per-turn 约束归因报告」**，这三点恰好是命题方自己 VitaBench (arXiv 2509.26490) 论文明确承认的空白。

## 与 VitaBench 的关系

- **继承**：POMDP rollout、sliding window evaluator、atomic rubric、persona-based simulator
- **延伸 5 个空白**：
  1. 新增电话外呼场景域
  2. Per-turn Constraint Attribution（VitaBench 仅 0/1 全或无）
  3. 动态情绪状态机 Simulator（VitaBench 是静态人格）
  4. Reliability = Pass^k / Pass@k 指标（VitaBench 论文承认是盲区）
  5. Harness Loop 三轮修订（VitaBench 是单跑）

## 项目元信息

- **命题方**：美团履约平台技术部，命题人孙宜钊
- **重要外部锚点**：VitaBench (arXiv [2509.26490](https://arxiv.org/abs/2509.26490))，必须延伸不能脱节
- **风云分工来源**：芳洲（黄秋宜）在群里指派 —— 用户模拟 Agent + 评估 Agent
- **可复用资产**：风云个人公众号系统的 Harness 评分闭环（5 维 Rubric + fail-with-reason + 三轮修订）

## 下一步行动建议

1. **下周五会议前**：把 `ARCHITECTURE.md` 的「整体架构图」浓缩成 1 页，配 `PRD.md` 的「差异化护城河」段落，给芳洲对齐方向
2. **数据准备**：找美团或公开渠道拿 50–100 条脱敏外呼录音，作为 Simulator 的 persona few-shot 锚定
3. **代码起步**：clone 公众号 Harness 项目的 Judge 骨架（5 维 Rubric + fail-with-reason），70% 可复用为 Eval Agent 起点
4. **风险点**：Simulator 的 meta-evaluation 必须独立测试集，不能与 Eval Agent 训练循环共享样本

---

文档整理时间：2026-05-24

---

## 可运行产品

本仓库已升级为 Next.js 后端优先项目，目标部署平台为 Vercel。

### 本地启动

```bash
npm install
cp .env.example .env.local
npm run dev
```

访问 `http://localhost:3000` 打开后端控制台。

### 真实模型配置

后端使用 OpenAI-compatible `/v1/chat/completions` 接口：

```bash
MODEL_PROVIDER=openai-compatible
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4.1-mini
APP_API_KEY=...
```

如果设置了 `APP_API_KEY`，所有 POST API 都需要带 `x-api-key`。

### 接入真实被测 Agent

默认情况下，系统会用同一个模型网关模拟“被测外呼 Agent”。生产评测时应设置：

```bash
TEST_AGENT_ENDPOINT=https://your-agent-service.example.com/next-turn
TEST_AGENT_API_KEY=...
```

`TEST_AGENT_ENDPOINT` 需要接收：

```json
{
  "policy": "...",
  "caseInput": {},
  "transcript": [],
  "repairHints": []
}
```

并返回：

```json
{ "text": "下一轮外呼 Agent 回复" }
```

### 后端 API

| API | 用途 |
|---|---|
| `GET /api/health` | 检查模型配置与鉴权状态 |
| `POST /api/constraints/extract` | policy → atomic constraints |
| `POST /api/simulator/run` | 生成下一轮用户模拟回复 |
| `POST /api/eval/run` | transcript → per-turn 归因报告 |
| `POST /api/harness/run` | 端到端 R1/R2 Harness Loop |
| `POST /api/runs` | 创建任务式 Harness Run |
| `GET /api/runs/:runId` | 查询 Run 状态和阶段产物 |
| `POST /api/runs/:runId/advance` | 推进 Run 的下一个阶段，避免长请求超时 |

### Smoke Test

```bash
MODEL_PROVIDER=mock npm run dev
node scripts/smoke-harness.mjs
npm run smoke:runs
npm run smoke:veto
```

生产环境不要使用 `MODEL_PROVIDER=mock`。

### 任务式 Harness 说明

`/api/harness/run` 仍保留为单请求端到端接口，适合本地短 case 调试。真实模型生产环境请优先使用任务式接口：

1. `POST /api/runs` 创建 Run
2. 前端或调用方循环调用 `POST /api/runs/:runId/advance`
3. 每次 advance 只推进一个阶段，避免 Vercel 长请求超时
4. `GET /api/runs/:runId` 查询当前阶段、进度和阶段产物

当前 Run Store 是内存实现，适合本地开发和单实例 demo。生产持久化时替换 `lib/backend/runs.ts` 中的 store adapter 即可，建议使用 Supabase / Neon / Vercel Postgres 存储：

- `runs`: id, status, stage, progress, input, artifacts, error, created_at, updated_at
- `model_calls`: run_id, stage, provider, model, request_id, latency_ms, status
- `eval_reports`: run_id, round, report_json
