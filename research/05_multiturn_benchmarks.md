# 调研 05 · 多轮对话评测基准

> 调研编号：J2（乔布斯派遣）
> 调研日期：2026-05-24
> 模型：Claude Sonnet
> 用途：找最适合外呼场景借鉴的多轮对话评测协议

---

## 调研背景

美团外呼是真实的多轮电话对话（5-15 轮典型），不是单轮 prompt-response。Eval Agent 要评估**多轮一致性、上下文保持、指令的累积遵守**（即第 1 轮答应了的事第 8 轮要兑现）。

---

## 一、主要基准对比

### MT-Bench（LMSYS，2023）

[arXiv 2306.05685](https://arxiv.org/abs/2306.05685)

80 道两轮对话题，用 GPT-4 作裁判（LLM-as-Judge）打 1-10 分。协议极简：每道题固定两轮，第二轮是预设的追问，无真实用户 simulator。侧重写作、推理、STEM、角色扮演 8 类能力。与人类投票吻合率约 85%。

### MT-Bench-101（2024）

[arXiv 2402.14762](https://arxiv.org/abs/2402.14762)

三级能力分类（Perceptivity / Adaptability / Interactivity），13 项任务，1,388 段对话、4,208 轮。新增上下文记忆、指代消解、话题切换、内容改写等细粒度维度。评分依然是 LLM-as-Judge，无动态用户模拟。

### MT-Eval（EMNLP 2024）

[arXiv 2401.16745](https://arxiv.org/abs/2401.16745) | [GitHub](https://github.com/KwanWaiChung/MT-Eval)

提炼四类真实用户行为模式：
- **Recollection**（回溯信息）
- **Expansion**（话题扩展）
- **Refinement**（指令修正）
- **Follow-up**（基于前轮追问）

1,170 条对话，GPT-4 辅助构造。核心发现：多轮性能衰减与模型基础能力不相关，主因是「相关内容距离」和「错误传播」。

### MultiChallenge（Scale AI，2025）⭐ 重点

[arXiv 2501.17399](https://arxiv.org/abs/2501.17399) | [Leaderboard](https://scale.com/leaderboard/multichallenge)

最高 10 轮，测四类挑战：
- 指令遵循（**跨轮累积**）
- 上下文分配
- 对话推理
- 需求追踪

每条样例配 instance-level rubric，LLM-as-Judge 自动评分。

**结论震撼：所有 frontier 模型准确率低于 50%，Claude 3.5 Sonnet 最高仅 41.4%。**

**这是目前最接近「指令累积遵守」的专项基准。**

### τ-bench（Sierra，2024）⭐ 重点

[arXiv 2406.12045](https://arxiv.org/abs/2406.12045) | [GitHub](https://github.com/sierra-research/tau-bench)

**真正有 user simulator（LLM 扮演用户）的动态多轮基准**，航空 / 零售两个领域，含 domain-specific API 工具集和 policy 文档。评分用 pass^k 指标（对同一任务跑 k 次，看稳定通过率）。对比终态数据库与 goal state。

GPT-4o 零售 pass^8 不到 25%。

**唯一覆盖工具调用 + 策略合规 + 动态用户的基准。**

### AgentBench（清华，ICLR 2024）

[arXiv 2308.03688](https://arxiv.org/abs/2308.03688) | [GitHub](https://github.com/THUDM/AgentBench)

8 个环境（OS、DB、Web、游戏等），评 LLM 在多轮开放式生成中的推理和决策能力。任务完成率为主指标。用户侧无真实 simulator，环境反馈是程序化的。

### AppWorld（ACL 2024）

[arXiv 2407.18901](https://arxiv.org/abs/2407.18901)

9 个 App（笔记、购物、消息等）+ 457 个 API，750 道任务，要求迭代 code generation。基于状态单元测试评分，检查 collateral damage（意外副作用）。GPT-4o 普通任务约 49%，挑战任务约 30%。

---

## 二、评分维度覆盖矩阵

| 基准 | 连贯性 | 指令遵循 | 工具调用准确性 | 任务完成率 | 安全 / 策略 | 约束累积 |
|---|---|---|---|---|---|---|
| MT-Bench | ✓ | 弱 | ✗ | ✗ | ✗ | ✗ |
| MT-Bench-101 | ✓ | ✓ | ✗ | ✗ | ✗ | 弱 |
| MT-Eval | ✓ | ✓ | ✗ | ✗ | ✗ | 弱 |
| **MultiChallenge** | ✓ | ✓✓ | ✗ | 弱 | ✗ | **✓✓** |
| **τ-bench** | ✓ | ✓ | **✓✓** | **✓✓** | **✓** | 弱 |
| AgentBench | 弱 | 弱 | ✓ | ✓ | ✗ | ✗ |
| AppWorld | 弱 | ✓ | **✓✓** | ✓ | ✗ | ✗ |

---

## 三、各基准核心弱点

- **MT-Bench / MT-Bench-101**：静态 prompt，仅 2 轮或预设轮次，无 user simulator，没有约束级评分，只看「最终输出质量」而非「跨轮一致性」
- **MT-Eval**：四类模式偏学术，样本由 GPT-4 构造（分布偏），无工具调用，无用户动态介入
- **MultiChallenge**：无 user simulator（历史是静态截断），无工具调用，无 per-turn attribution（只判最终轮），也没有针对 policy 文档的策略合规测试
- **τ-bench**：有 user simulator 但 policy 文档是全局前置注入、不测「第 N 轮是否仍遵守第 1 轮的约束」，无 per-turn 细粒度归因
- **AgentBench**：用户侧完全是程序化环境反馈，与真实自然语言对话场景距离大；无 per-turn 指令追踪
- **AppWorld**：偏 coding agent，自然语言对话不是主角；无 policy / constraint 积累测试

### 通用短板

**所有基准都没有专门的「第 1 轮约束在第 N 轮是否兑现」的 per-turn attribution 指标。**

最新的 [SEQUOR (arXiv 2605.06353, 2026-05)](https://arxiv.org/abs/2605.06353) 是迄今最直接测这一问题的基准，实测单约束跨轮准确率跌幅 > 11%，多约束同时遵守跌幅 > 40%。

---

## 四、指令累积问题：哪些基准显式测了？

| 基准 | 是否显式测「第 1 轮约束第 N 轮兑现」|
|---|---|
| MT-Bench / AgentBench | 否 |
| MT-Eval（Recollection 类）| 间接测「信息回溯」，不是「约束遵守」 |
| **MultiChallenge** | **是**，4 类挑战之一就是跨轮指令持续遵守 |
| **τ-bench（policy document）** | **是**，policy 注入在系统消息，任意轮均需合规 |
| **SEQUOR（2026 新）** | **是，最系统**，专门测长对话约束累积衰减 |
| **TOD-ProcBench** ([arXiv 2511.15976](https://arxiv.org/abs/2511.15976))| **是**，If-Then 流程指令在多轮中逐步核验违规 |

---

## 五、美团外呼场景推荐

### 首选：τ-bench 协议 + MultiChallenge rubric 方法 混合设计

**理由：**

1. **τ-bench 是结构最接近外呼的基准**：它有真实 user simulator（LLM 扮演用户）、domain policy 文档（类比外呼话术规则集）、工具调用（类比 CRM / 工单 API）、pass^k 可以直接量化稳定性（这在电话外呼里比一次准确率更重要）。

2. **MultiChallenge 的 rubric 设计可直接搬用**：instance-level rubric 允许为每轮对话定制「这条约束在此轮是否被遵守」的判断条件，恰好是外呼「第 1 轮承诺第 8 轮要兑现」的直接映射。

3. **补充 SEQUOR 的衰减测量**：SEQUOR 的「约束数 × 轮次」衰减分析框架，可以用来定量评估「承诺遗忘率」 —— 外呼 Eval Agent 里这是一个独立 KPI。

4. **TOD-ProcBench 可用于流程合规子维度**：外呼有严格 SOP，TOD-ProcBench 的 If-Then 嵌套指令格式与 SOP 天然同构，可以直接借鉴其违规检测协议。

### AgentBench / AppWorld 不适合外呼

两者偏 OS / code 操作，自然语言对话能力不是主角，与外呼场景偏差过大。

---

## 关键 Paper 链接

- [MT-Bench: arXiv 2306.05685](https://arxiv.org/abs/2306.05685)
- [MT-Bench-101: arXiv 2402.14762](https://arxiv.org/abs/2402.14762)
- [MT-Eval: arXiv 2401.16745](https://arxiv.org/abs/2401.16745)
- [MultiChallenge: arXiv 2501.17399](https://arxiv.org/abs/2501.17399) | [Leaderboard](https://scale.com/leaderboard/multichallenge)
- [τ-bench: arXiv 2406.12045](https://arxiv.org/abs/2406.12045) | [GitHub](https://github.com/sierra-research/tau-bench)
- [AgentBench: arXiv 2308.03688](https://arxiv.org/abs/2308.03688)
- [AppWorld: arXiv 2407.18901](https://arxiv.org/abs/2407.18901)
- [SEQUOR: arXiv 2605.06353](https://arxiv.org/abs/2605.06353)（最新，2026-05，专测长对话约束累积）
- [TOD-ProcBench: arXiv 2511.15976](https://arxiv.org/abs/2511.15976)（客服 SOP 合规）
