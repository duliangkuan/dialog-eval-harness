# 调研 04 · Per-turn / Per-rule 归因评分

> 调研编号：J1（乔布斯派遣）
> 调研日期：2026-05-24
> 模型：Claude Sonnet
> 用途：让 Eval Agent 能定位到具体话轮，输出可解释的归因报告

---

## 调研背景

风云要做的 Eval Agent 必须能定位到具体话轮（turn ID），说明哪条约束被违反、扣多少分、为什么扣。**不是给整段对话一个总分，而是产出一份「归因报告」。**

---

## 一、主要系统的归因机制对比

### G-Eval（arXiv:2303.16634，EMNLP 2023）

[论文](https://arxiv.org/abs/2303.16634)

采用 Chain-of-Thought + 概率加权评分。先用 LLM 将用户定义的评测维度（coherence、factuality 等）展开为逐步评测指令，再对 token 概率做加权求和得到最终分数。

本质是 **per-aspect 单轮评分** —— 每个 aspect 独立调用一次 Judge，没有内建的 per-turn 支持。多维度归因靠 one-judge-per-criterion 实现，不是一次输出所有维度。

### Prometheus / Prometheus 2（KAIST，EMNLP 2024）

[arXiv 2405.01535](https://arxiv.org/abs/2405.01535)

开源专用 Judge 模型，支持「直接评分」和「两两排序」两种模式。Rubric 格式为文本描述 + 1-5 分锚点说明，输出格式：

```
Feedback: [explanation] [RESULT] [1-5]
```

**单一维度单次评分**，不原生支持多维度 per-rule 拆分。但因为是开源模型，可以改造 prompt 做多次调用实现逐规则打分。

### FLASK（KAIST，ICLR 2024 Spotlight）

[arXiv 2307.10928](https://arxiv.org/abs/2307.10928) | [GitHub kaistAI/FLASK](https://github.com/kaistAI/FLASK)

核心贡献是把粗粒度整体评分拆解为 **12 个 skill 维度**（Logical Correctness、Comprehension、Faithfulness、Metacognition 等）。每条 instruction 先标注需要哪些 skill，再对对应 skill 逐一打 1-5 分。

实验证明细粒度评分比整体评分更接近人类判断，并能减少模型偏差。**不支持 per-turn 多轮**，面向单轮 instruction-response pair。

### Auto-J（GAIR-NLP）

[arXiv 2310.05470](https://arxiv.org/abs/2310.05470) | [GitHub GAIR-NLP/auto-j](https://github.com/GAIR-NLP/auto-j)

13B 开源 generative judge，训练覆盖 58 个真实用户场景。亮点是同时支持单答案评分和两两比较，并输出**详细评语（critique）**。critique 对违反规则的理由有文字说明，但不是结构化 JSON，turn-level 归因需后处理。有中英双语 6B 版本。

### JudgeLM（BAAI，ICLR 2025 Spotlight）

[arXiv 2310.17631](https://arxiv.org/abs/2310.17631) | [GitHub baaivision/JudgeLM](https://github.com/baaivision/JudgeLM)

通过 SFT 在 GPT-4 生成的 judgment 上微调，7B / 13B / 33B 三档。训练时加入了 swap augmentation（交换两个答案位置以消除 position bias）、reference support（提供参考答案）、reference drop（有时不给参考以提升泛化）。

**声明支持 multi-turn chat 评估**，但输出仍是整体分数，不是逐 turn 的归因拆分。

### PandaLM（ICLR 2024）

[arXiv 2306.05087](https://arxiv.org/abs/2306.05087)

LLaMA-based pairwise judge，在 conciseness、clarity、instruction adherence、comprehensiveness、formality 等主观维度做两两比较，输出胜负判断 + rationale。**Reference-based**（需提供参考答案）。无 per-turn 支持，以模型对比为主要应用场景。

### AgentRx（Microsoft，2026）⭐ 重点

[arXiv 2602.02475](https://arxiv.org/abs/2602.02475) | [GitHub microsoft/AgentRx](https://github.com/microsoft/AgentRx)

**目前学术界最接近「归因报告」需求的工作。** 框架为 Agent 轨迹逐步合成约束（guard + assertion），产出 **step-indexed 违规日志**，每条记录为：

```
(step_id, constraint, evidence, SAT/VIOL)
```

再由 LLM judge 汇总定位关键失败步骤并归类。内置 **9 类根因分类法**（Instruction Adherence Failure、Invalid Invocation、Misinterpretation of Tool Output 等）。

**在 115 条真实失败轨迹上，关键步骤定位准确率提升 23.6%。**

---

## 二、技术方法精度 / 成本对比

| 方法 | 精度 | 成本 | per-turn | 说明 |
|---|---|---|---|---|
| CoT Judge（G-Eval 风格）| 高（ρ +8-13%）| 高（每 aspect 一次 LLM 调用）| 否 | 每个维度独立 prompt |
| Rubric-based（Prometheus 风格）| 中高 | 中 | 否 | 单次调用，输出 1 分 + 理由 |
| Reference-based（PandaLM）| 高 | 中高 | 否 | 需要参考答案 |
| Reference-free（Auto-J）| 中 | 中 | 部分 | 输出 critique 可后处理 |
| Batched multi-turn judge | 低风险增加 | 低 | 近似 | 一次输入整段对话，精度下降 |
| **Per-step constraint（AgentRx）** | **最高（+23.6%）** | **高** | **是** | **step-by-step 逐步验证** |

### 关键结论

RubricEval 实验证明：**孤立评测每条 rubric**（one-rubric-one-call）比同时评多条 rubric 精度更高，干扰更少。但成本随 rubric 数线性增长。

对外呼场景（规则数有限，约 5-15 条），**per-rule 独立调用是最优解**。

---

## 三、归因报告可重复性控制

### 问题本质

[arXiv 2510.27106](https://arxiv.org/pdf/2510.27106)（Rating Roulette）实测证明，同一 prompt 多次采样输出分数低一致性。[arXiv 2603.28304](https://arxiv.org/html/2603.28304v1) 证明 temperature 主要影响**决策方差**而非均值准确率。

### 有效控制方法

- **温度调控**：推荐 temperature=0.1-0.2 用于单次评分，temperature=0.3-0.5 用于多样本投票。温度 = 0 会提高重复性但降低与人类的一致性（与人类对齐需要一定随机性）
- **多次采样 + 多数投票 / 均值**：G-Eval 原始方法即采用 token 概率加权，避免 argmax 的不稳定性。实践中对连续分数取 n=5-10 次采样均值能显著降方差
- **Self-consistency**：让 Judge 先生成 rationale 再评分，而不是直接输出分数 —— 强制 CoT 约束分布，提高内部一致性
- **Reference anchor**：提供 gold standard 参考答案或 few-shot 评分示例，把分布锚定在具体案例上，减少分数漂移
- **Conformal Prediction**（[arXiv 2604.15302](https://arxiv.org/abs/2604.15302)）：用区间估计替代点估计，输出「score ∈ [3, 4], confidence 90%」，更诚实地表达不确定性

---

## 四、归因报告的数据格式与 UI 现状

### 学术侧

- **AgentRx**：用 `(step_id, constraint, evidence, SAT/VIOL)` 列表
- **RankJudge**：用 `(y*, r*, t*)` 三元组（哪段对话更好、第几轮出现问题、失败类型），要求 Judge 联合预测三者且必须全对才算正确

### 工程侧

- **DeepEval** 的 component-level eval 把 metrics 附加到单个 span，每个 span 输出 `{score, reason, threshold, pass}`；**多轮 component-level eval 尚未支持，在 roadmap 中**
- **LangSmith** 的 eval 输出格式为 `{key, score, comment}`，支持 Numeric / Categorical / Boolean 三种分数类型，无内建 per-turn 拆分
- **Langfuse** 类似，无原生 per-turn attribution schema

### 最接近工程可用的 JSON schema 范式

```json
{
  "conversation_id": "...",
  "turns": [
    {
      "turn_id": 2,
      "speaker": "assistant",
      "violations": [
        {
          "rule_id": "R03",
          "rule_desc": "不得承诺退款时效超过 5 个工作日",
          "severity": 4,
          "evidence": "原文:'我们会在 10 个工作日内处理'",
          "deduction": -2.0,
          "sat": false
        }
      ],
      "turn_score": 3.0
    }
  ],
  "total_score": 7.5,
  "critical_turn": 2,
  "failure_category": "Instruction Adherence Failure"
}
```

这一 schema 无直接论文出处，是对 AgentRx + FLASK + RankJudge 三者设计的综合工程化。

### UI / Trace Viewer

- Anthropic 建议「定期人工阅读 transcript 校验」
- LangSmith 和 Langfuse 提供可视化 trace，但无专用的「规则违反热力图」
- aevals.ai 宣称支持从 OpenTelemetry trace 中评分，但尚无 per-turn violation 专用 UI

---

## 五、给外呼 Eval Agent 的具体推荐

### Base Judge 模型选择

- **主力推荐：Claude Sonnet 4.x 或 Gemini 2.5 Pro**
  - JudgeBench（ICLR 2025）数据：闭源模型整体优于开源，thinking 模型（CoT）显著优于无推理版本
  - 如需成本控制，用 GPT-4o mini 跑粗筛，Sonnet 跑精判
- **开源备选：Prometheus-2（8B / 7B）**，专为评分任务微调，在低资源环境比通用模型更稳定

### Rubric 格式

采用 **one-rubric-one-call** 策略（RubricEval 和 G-Eval 的共同结论），每条业务规则独立调用 Judge：

```
你是一个外呼合规评审 AI。
规则:[R03] 客服不得承诺超过 5 个工作日的退款时效。
以下是对话片段 (Turn 3, speaker=assistant):
"我们会在 10 个工作日内处理您的退款..."
判断:该话轮是否违反规则 R03?
输出 JSON:{"sat": false/true, "evidence": "...", "severity": 1-5, "reason": "..."}
```

### 归因 JSON 输出

在顶层 orchestrator 中聚合所有 per-rule-per-turn 结果，生成上述 schema 的完整 attribution report，包括 `turn_id`、`rule_id`、`severity`、`deduction`、`evidence` 字段。

`failure_category` 参考 AgentRx 的 9 类分类法映射到外呼领域（如「话术越权」、「信息捏造」、「意图未确认」等）。

### 方差控制

Judge 调用统一 temperature=0.1，关键规则（severity ≥ 4）做 n=3 多数投票，低 severity 规则单次调用即可。

---

## Sources

- [G-Eval (arXiv:2303.16634)](https://arxiv.org/abs/2303.16634)
- [Prometheus 2 (arXiv:2405.01535)](https://arxiv.org/abs/2405.01535) | [ACL Anthology EMNLP 2024](https://aclanthology.org/2024.emnlp-main.248/)
- [FLASK (arXiv:2307.10928)](https://arxiv.org/abs/2307.10928) | [ICLR 2024](https://openreview.net/forum?id=CYmF38ysDa) | [GitHub kaistAI/FLASK](https://github.com/kaistAI/FLASK)
- [Auto-J (arXiv:2310.05470)](https://arxiv.org/abs/2310.05470) | [GitHub GAIR-NLP/auto-j](https://github.com/GAIR-NLP/auto-j)
- [JudgeLM (arXiv:2310.17631)](https://arxiv.org/abs/2310.17631) | [GitHub baaivision/JudgeLM](https://github.com/baaivision/JudgeLM)
- [PandaLM (arXiv:2306.05087)](https://arxiv.org/abs/2306.05087) | [ICLR 2024](https://proceedings.iclr.cc/paper_files/paper/2024/file/be3b0d51a2b86cb4ffe50f13480217e0-Paper-Conference.pdf)
- [AgentRx (Microsoft, 2026, arXiv:2602.02475)](https://arxiv.org/abs/2602.02475) | [GitHub microsoft/AgentRx](https://github.com/microsoft/AgentRx)
- [RankJudge (arXiv:2605.21748)](https://arxiv.org/html/2605.21748)
- [Amulet (arXiv:2505.20451)](https://arxiv.org/abs/2505.20451)
- [Rating Roulette 方差分析 (arXiv:2510.27106)](https://arxiv.org/pdf/2510.27106)
- [Temperature in Judge (arXiv:2603.28304)](https://arxiv.org/html/2603.28304v1)
- [RubricEval (arXiv:2603.25133)](https://arxiv.org/pdf/2603.25133)
- [JudgeBench ICLR 2025 (arXiv:2410.12784)](https://arxiv.org/pdf/2410.12784)
- [Anthropic Demystifying Agent Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [DeepEval component-level](https://deepeval.com/docs/evaluation-component-level-llm-evals)
- [Scale AI Rubrics as Rewards](https://scale.com/blog/rubrics-as-rewards)
