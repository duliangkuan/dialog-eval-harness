# 调研 06 · 评测报告呈现与产品化

> 调研编号：J3（乔布斯派遣）
> 调研日期：2026-05-24
> 模型：Claude Sonnet
> 用途：让最终评测报告能被业务方（履约平台技术部）看懂、能行动

---

## 调研背景

美团 Hackathon 评测系统最终要让业务方看懂：

- 哪些外呼 Agent 跑得差？
- 差在哪？
- 修了之后是否真的变好？

**不是一个学术 leaderboard，是工业 eval infra。**

---

## 一、业界标杆的 eval 报告 / dashboard 设计

### Braintrust

[stakeholder trust blog](https://www.braintrust.dev/blog/stakeholder-trust-evals-observability) | [how to eval](https://www.braintrust.dev/articles/how-to-eval)

当前业界最精致的「**利益相关者分离结构**」：

- **领导视图**：3 个元素 —— 30 天平均质量分（单数字）、同期时序趋势、总请求量与成本
- **工程师视图**：p95 延迟、错误率、按模型的 token 消耗时序
- 核心原则：「领导评审要短。仪表盘要小，每张图都聚焦」

PR 合并时 CI/CD 自动留下「改进 case / 退化 case」的回归报告评论。

### LangSmith

[LangSmith Evaluation Docs](https://docs.langchain.com/langsmith/evaluation) | [trajectories vs outputs](https://www.langchain.com/articles/llm-evaluation-framework)

核心是「**production-to-dataset loop**」设计：实运营失败自动成为回归测试集。提供按实验 side-by-side 对比视图，2025-07 起新增 custom view 高亮关键信息。支持人工评估（annotation queue）、LLM-as-judge、pairwise 比较。

### OpenAI Evals API

[regression detection cookbook](https://developers.openai.com/cookbook/examples/evaluation/use-cases/regression) | [best practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)

**Eval（基准设定）+ Run（执行）两层结构**。基线 run 与变更 run 通过 `report_url` 对比，回归用通过率分数下降表面化。每条 case 可下钻。

### Datadog LLM Observability

[dashboard blog](https://www.datadoghq.com/blog/llm-observability-at-datadog-dashboards/)

**程序化验证**（JSON schema、必填字段）与 **LLM-as-judge**（准确性 / 质量 / 完成度二值打分）并行运行。Experiments 功能可视化 prompt / 模型版本间分数聚合。

在外呼 Agent 这类复杂链条里强项：**区分「prompt 问题 / 模型行为问题 / 基础设施问题」**。

### Humanloop

[Agent Evals in UI](https://humanloop.com/docs/quickstart/agent-evals-in-ui)

用 **spider plot** 汇总各 evaluator 平均性能。Stats 与 Review 两个 tab 分离，Review tab 是「专家标记日志」的探索界面。

### Helicone

[eval scores](https://docs.helicone.ai/features/advanced-usage/scores)

轻量观测平台，以成本、延迟、TTFT 为一等指标。把外部 eval（RAGAS、LangSmith 等）的分数集中展示。

### Anthropic 公开研究

[statistical approach to model evals](https://www.anthropic.com/research/statistical-approach-to-model-evals)

聚焦统计严密性，核心建议：
- **报告分数必须带 SEM（平均标准误差）**
- 依赖性问题用 clustered standard error
- 原则可直接进 dashboard 设计：「单一分数对比会隐藏置信区间」

---

## 二、PM / 业务方关心的核心指标

业界公开材料中共同出现的指标，按可行动性排序：

| 指标 | 定义 | Actionable 原因 |
|---|---|---|
| **TaskCompletionRate（PassRate）** | 外呼会话达成目标（预约 / 信息传递）的比例 | 单一汇总指标，版本对比的基线 |
| **EscalationRate** | 转人工的比例 | 与成本、客户体验直接相关，能设目标值 |
| **ConstraintViolationRate** | 违规话术次数 / 总轮数 | 合规风险，可立即整改 |
| **AverageTurnsToComplete** | 达成目标的平均轮数 | 效率指标，可早期发现退化 |
| **RegressionRate** | 比上版本 「通过 → 失败」case 比例 | 部署决策核心 guardrail |
| **SLA 准时率** | p95 响应延迟超阈值的比例 | 技术团队与业务团队的共同语言 |

**Langwatch 核心原则：「避免单一混合分数。按切片（场景类型、客户分段、地区）分析才能暴露真正的弱点。」**

---

## 三、Per-turn Attribution → 产品级指标聚合路径

LangChain / Confident AI 资料里整理的实用路径：

### 第 1 步：建立错误分类（taxonomy）

把 case 失败按原因分类。维度示例：
- 工具执行错误
- 参数误解
- 信息检索失败
- 约束违规
- 目标偏离

[arXiv「Hierarchical Look into Multi-Agent Error Attribution」](https://arxiv.org/pdf/2510.04886) 提出 **12 类错误分类体系** + ECHO 方法（通过层次化交互 trace 表示追踪归因）。

### 第 2 步：频率 × 严重度矩阵

各错误类型的发生次数 × 对 TaskCompletion 的影响交叉聚合。

「频繁但影响小」 vs 「罕见但致命」必须分开，优先级才准确。

### 第 3 步：产品级 rollup

单个 turn 的失败信号汇总到 session 级。例：一个 session 内 ConstraintViolation ≥ 2 次 → 标为「高风险 session」。再按场景类型聚合 → 回答「哪类场景最容易失败」。

---

## 四、回归检测（Version A → Version B）

业界标准方法：

### Case 级 diff
同一测试集双版本运行，按 case 分三类：Pass→Fail（退化）、Fail→Pass（改进）、不变。

Braintrust：「side-by-side experiment comparisons show score breakdowns, regression detection, and output diffs at the test case level」。

### 统计边界
按 Anthropic 建议：不是单纯分数差，而是**置信区间**。[arXiv「Beyond the Mean: Within-Model Reliable Change Detection」](https://arxiv.org/html/2604.27405) 给出该方法的模型更新场景适配。

### CI / CD 自动化
代码部署时自动跑 eval pipeline，PR 评论里报告「X 个 case 退化、Y 个 case 改进」。LangSmith 和 Braintrust 都支持 GitHub Actions 集成。

### 二值守门告警
Datadog 模式：ConstraintViolationRate / EscalationRate 比基线增加超过 N% 时发送部署阻断告警。

---

## 五、给美团业务方的报告推荐结构（5 页 / 视图）

### Page 1: Executive Scorecard（经营层 / 业务负责人）

**回答**：这版整体好还是坏？

- 4 个核心指标的本期 vs 上版数字（TaskCompletionRate、EscalationRate、ConstraintViolationRate、AvgTurns）
- 每个指标红 / 黄 / 绿信号灯
- 总 case 数、置信区间明确标注

### Page 2: Scenario Breakdown（场景分解）

**回答**：哪类外呼场景集中出问题？

- 场景类型（预约确认 / 投诉处理 / 销售推荐 等）× PassRate 热力图
- 最差 5 个场景列表，每个配 1 行主要失败原因摘要
- 用 Braintrust 的「top list」模式

### Page 3: Regression Diff View（版本对比）

**回答**：这次改动修了哪里、又坏了哪里？

- Pass→Fail（退化）/ Fail→Pass（改进）/ 不变 三栏 case 数
- 退化 case 抽样 5 个，带完整对话 trace
- 退化 case 的错误类型分布

### Page 4: Error Taxonomy Heatmap（错误分布）

**回答**：最常发生哪些失败类型、修复优先级？

- 错误类型 × 发生频率 × TaskCompletion 影响度 气泡图
- 各类型最近 5 个版本时序趋势
- 「立即修 / 监控 / 低优先级」三段分类

### Page 5: Case Explorer（一线工程师）

**回答**：失败的 case 完整对话长什么样？

- 失败 case 过滤（错误类型、场景、版本）
- 选中 case 的完整 trace（逐轮输入 / 输出、工具调用、评分）
- 与 LangSmith 的 trace viewer 同构

---

## 设计原则总结

Braintrust 明确原则：**「一个 dashboard 对应一类观众」**。经营层（P1）→ 场景 PM（P2）→ 开发工程师（P3）逐级下钻 —— 这是工业 eval infra 的标准模式。

**单一混合分数把所有信息塞进去，就会落入「数字看起来好，但不知道哪里出问题」的陷阱。**

---

## Sources

- [Braintrust: Stakeholder Trust Evals Observability](https://www.braintrust.dev/blog/stakeholder-trust-evals-observability)
- [Braintrust: How to Eval LLMs and AI Agents in Production](https://www.braintrust.dev/articles/how-to-eval)
- [Braintrust: LLM Evaluation Guide](https://www.braintrust.dev/articles/llm-evaluation-guide)
- [LangSmith Evaluation Docs](https://docs.langchain.com/langsmith/evaluation)
- [LangChain: Trajectories vs Outputs](https://www.langchain.com/articles/llm-evaluation-framework)
- [OpenAI Evals: Regression Detection Cookbook](https://developers.openai.com/cookbook/examples/evaluation/use-cases/regression)
- [OpenAI Evaluation Best Practices](https://developers.openai.com/api/docs/guides/evaluation-best-practices)
- [Datadog: LLM Observability at Datadog Dashboards](https://www.datadoghq.com/blog/llm-observability-at-datadog-dashboards/)
- [Humanloop: Agent Evals in UI](https://humanloop.com/docs/quickstart/agent-evals-in-ui)
- [Helicone: Eval Scores](https://docs.helicone.ai/features/advanced-usage/scores)
- [Anthropic: Statistical Approach to Model Evals](https://www.anthropic.com/research/statistical-approach-to-model-evals)
- [Langwatch: Essential LLM Evaluation Metrics](https://langwatch.ai/blog/essential-llm-evaluation-metrics-for-ai-quality-control)
- [arXiv: Hierarchical Look into Multi-Agent Error Attribution](https://arxiv.org/pdf/2510.04886)
- [arXiv: Beyond the Mean — Reliable Change Detection](https://arxiv.org/html/2604.27405)
