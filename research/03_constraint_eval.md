# 调研 03 · 约束抽取与规则遵循评测

> 调研编号：M3（马斯克派遣）
> 调研日期：2026-05-24
> 模型：Claude Sonnet
> 用途：把外呼复杂指令拆解为可校验的原子约束，并选定工程化校验方法

---

## 调研背景

美团外呼场景的指令示例：

> 「拨通后先核实是不是本人，是的话询问当前位置；如果超时超过 15 分钟，询问原因并记录工单；不能承诺赔付；如果对方情绪激动，转人工；通话不超过 90 秒；结束前必须复述预计时间。」

一段指令里叠了 7-8 种约束（身份核实、条件分支、必做项、禁做项、时长上限、顺序要求、终止条件）。Eval Agent 必须逐条拆解并校验。

---

## 一、五个基准的方法论对比

### IFEval

[arXiv 2311.07911](https://arxiv.org/abs/2311.07911) | [GitHub](https://github.com/google-research/google-research/tree/master/instruction_following_eval)

- **拆解方式**：将指令约束化为 25 类「可验证指令」（verifiable instructions），分 Format / Length / Keyword / Style / Content 五大族。每条指令映射到一个确定性 checker 函数（正则、字数统计、大小写检查等）
- **评分粒度**：双层 —— prompt-level（整条指令是否全部通过）和 instruction-level（逐条子约束通过率），后者更适合诊断
- **局限**：只能处理客观可计数的约束，无法评估条件分支、禁做项是否触发

### FollowBench

[arXiv 2310.20410](https://arxiv.org/abs/2310.20410) | [GitHub](https://github.com/YJiangcm/FollowBench)（ACL 2024）

- **拆解方式**：对每个 prompt 从 Level 0 开始，每升一级叠加一条新约束（Content / Situation / Style / Format / Example 五类），构造「约束演化链」
- **校验**：用强 LLM（GPT-4）沿约束演化路径逐条判断
- **核心发现**：约束数量从 1 增至 4 时，模型通过率从 77% 跌至 33% —— 说明约束叠加本身是独立难点

### ComplexBench

[arXiv 2407.03978](https://arxiv.org/abs/2407.03978) | [GitHub](https://github.com/thu-coai/ComplexBench)（NeurIPS 2024）

- **拆解方式**：4 constraint types（Lexical / Format / Semantic / Utility）× 19 维度，4 种 composition types：Single / And / Chain（顺序依赖）/ Selection（条件分支）
- **评分公式**：r'q = rq ∧ ∀p∈Dep(q) rp —— 子任务分数取其本身与所有前置依赖的逻辑 AND。链式依赖中一个前置失败，后续全部置零。**这是目前最接近外呼场景「顺序约束 + 条件分支」的评分设计**
- **校验**：混合方案：客观约束（关键词 / 长度 / 格式）用规则函数，主观约束（语气 / 连贯性）用 LLM judge

### RuLES

[arXiv 2311.04235](https://arxiv.org/abs/2311.04235) | [GitHub](https://github.com/normster/llm_rules)

- **设计哲学**：14 个对话场景，每个场景有 programmatic evaluation function —— 不依赖 LLM judge，直接用代码判断 rule violation
- **约束类型覆盖**：禁做项（如「不得提及竞品」）、条件触发（「若用户问 X 则必须回 Y」）、持久规则（全程遵守）
- **测试分级**：Benign / Basic / Redteam 三档，直接测对抗场景。适合安全敏感的外呼约束（如「不能承诺赔付」被诱导突破）

### InFoBench

[arXiv 2401.03601](https://arxiv.org/abs/2401.03601) | [GitHub](https://github.com/qinyiwei/InfoBench)（ACL 2024 Findings）

- **核心创新**：DRFR（Decomposed Requirements Following Ratio）—— 用 GPT-4 将复杂指令自动拆解成若干二值问题（是 / 否），每个问题独立评分，最终聚合
- **适用场景**：最适合缺乏预设规则、只有自然语言指令的快速评测落地。GPT-4 做拆解器的成本可控

---

## 二、校验方法对比

| 方法 | 适用约束类型 | 优点 | 缺点 |
|------|------------|------|------|
| **Rule-based verifier**（正则 / 计数）| 长度上限、关键词存在、JSON 格式、时长 | 零幻觉、可重复、快 | 只能处理客观可枚举约束 |
| **LLM-as-judge** | 语气判断、情绪识别、语义禁忌、开放文本 | 覆盖主观约束 | 可能幻觉、一致性差、贵 |
| **混合方案**（ComplexBench / CFBench 模式）| 全类型 | 精确 + 覆盖兼得 | 工程复杂度翻倍 |

CFBench（[arXiv 2408.01122](https://arxiv.org/abs/2408.01122)）的混合方案最工程化：人工写 checklist（定义约束）+ GPT-4o 做二值判断（执行评分），CSR / ISR / PSR 三种粒度可选。

---

## 三、多约束叠加评分方法

- **独立计分**（IFEval / InFoBench）：每条约束 0/1，最后平均。简单但忽略约束间依赖
- **加权计分**（CFBench PSR）：主要约束权 0.5，次要约束权 0.5×平均，阈值 0.8 触发满足
- **有序依赖**（ComplexBench Chain 类型）：r'q = rq ∧ 所有前置 rp。前置失败则下游置零，严格反映顺序约束
- **否定约束（禁做项）特殊处理**：IFEval 支持 not- 前缀取反；RuLES 将禁做项直接编码为 violation 检测函数，一旦触发**直接判 fail**（不参与平均），这比折算成 0 分更符合实际（一次承诺赔付就是根本性失败）

研究显示 LLM 对复合否定的遵循率极差（compound negation 100% 违规率），**否定约束需单独提取、优先校验**。

---

## 四、美团外呼 7 种约束的校验方法选型（决策表）

| 约束类型 | 具体内容 | 推荐校验方法 | 来源参照 |
|---------|---------|------------|---------|
| **必做项 + 顺序**（身份核实先于位置询问）| 有明确执行顺序 | Rule-based：检测关键词出现先后顺序（正则 + 文本位置比较）| ComplexBench Chain 评分逻辑 |
| **条件分支**（超时 > 15min → 询问原因 + 工单）| IF-THEN 结构 | LLM judge：判断条件是否满足 + 对应动作是否执行；或 Selection composition 打标 | ComplexBench Selection 类型 |
| **禁做项**（不能承诺赔付）| 负向约束 | Rule-based 优先：关键词黑名单检测（「赔」「补偿」「承诺」等）；高风险场景叠加 LLM 语义判断 | RuLES programmatic function；Promptfoo `not-contains` |
| **触发终止条件**（情绪激动 → 转人工）| 条件触发 + 状态转移 | LLM judge：情绪激动无法用正则判定，需 LLM 判断触发条件；转人工动作检查可用关键词 | InFoBench DRFR 拆解为「是否触发」+「是否正确响应」两个二值问题 |
| **时长上限**（通话 90 秒）| 数值约束 | Rule-based：纯计时 / 字数代理计量 | IFEval 长度类 verifier |
| **终止前必做**（复述预计时间）| 顺序 + 必做合体 | Rule-based + position check：检测时间相关词是否出现在末尾 N 句 | ComplexBench Chain + IFEval keyword verifier |
| **条件触发的必做项**（超时分支 → 记录工单）| 嵌套条件 | LLM judge（外层条件判断）+ Rule-based（工单关键词出现）| CFBench Rule 类约束 + 混合方案 |

### 整体建议

- **禁做项单独提取、优先判 fail（一票否决）**，不参与加权平均
- **顺序约束**用 ComplexBench 的 Chain 依赖公式
- **条件分支**先让 LLM 判断条件是否满足，再 rule 检查后续动作

---

## 五、现成工具接入可行性

### Promptfoo

[GitHub](https://github.com/promptfoo/promptfoo) | [文档](https://www.promptfoo.dev/docs/configuration/expected-outputs/deterministic/)

- 直接可用：`contains` / `not-contains` / `regex` / `javascript: output.length < N` 覆盖禁做项、时长、关键词约束，YAML 声明式，支持所有断言取反（`not-` 前缀）
- LLM judge 断言（`llm-rubric`）可处理情绪 / 语义约束
- **结论**：外呼场景的 rule-based 约束（3/7 种）可直接接；条件分支需自定义 JS 逻辑或 llm-rubric

### DeepEval

[GitHub](https://github.com/confident-ai/deepeval)

- DAG metric 支持决策树形评分，适合条件分支约束的结构化建模；G-Eval 可快速自定义评分标准
- Python-native，接 pytest 流水线更方便
- **结论**：条件分支 + 混合评分的首选工具

### RAGAS
主要面向 RAG pipeline（检索召回率 / 忠实度），与外呼场景不匹配，不建议。

### LangChain Evaluators
`CriteriaEvalChain` 可传入自定义标准，但灵活性低于 DeepEval G-Eval，不是首选。

---

## 核心工程结论

美团外呼 Eval Agent 的最短路径：

> **Promptfoo 做 rule-based 断言（禁做 / 时长 / 关键词）+ DeepEval DAG/G-Eval 做条件分支和情绪判断 + 禁做项一票否决逻辑**
> 评分用 ComplexBench 的依赖 AND 公式而非简单平均
> 否定约束不参与分数计算、直接置零

---

## Sources

- [IFEval arXiv 2311.07911](https://arxiv.org/abs/2311.07911) | [IFEval GitHub](https://github.com/google-research/google-research/tree/master/instruction_following_eval)
- [FollowBench arXiv 2310.20410](https://arxiv.org/abs/2310.20410) | [FollowBench GitHub](https://github.com/YJiangcm/FollowBench)
- [ComplexBench arXiv 2407.03978](https://arxiv.org/abs/2407.03978) | [ComplexBench GitHub](https://github.com/thu-coai/ComplexBench)
- [RuLES arXiv 2311.04235](https://arxiv.org/abs/2311.04235) | [RuLES GitHub](https://github.com/normster/llm_rules)
- [InFoBench arXiv 2401.03601](https://arxiv.org/abs/2401.03601) | [InFoBench GitHub](https://github.com/qinyiwei/InfoBench)
- [CFBench arXiv 2408.01122](https://arxiv.org/abs/2408.01122)
- [Promptfoo 确定性断言文档](https://www.promptfoo.dev/docs/configuration/expected-outputs/deterministic/)
- [DeepEval GitHub](https://github.com/confident-ai/deepeval)
