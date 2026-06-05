# 设计辩论日志 · 沙盒世界三方辩论实录

> 本文档记录方案的「决策溯源」 —— 即每一个设计点为什么是这样、不是那样。
> 形式：沙盒世界中马斯克（物理优先 / 第一性原理）vs 乔布斯（产品整合 / 用户信任）的对辩 + 第三方审判官的客观把关。
> 这不是文学创作，是「论据驱动决策」过程的归档：每一个判断都对应一份调研报告里的具体来源。

---

## 世界设定

- 时间：2026-05-24
- 地点：沙盒维度 / 风云的工作台
- 在场：
  - **马斯克**（沙盒角色，设定：偷懒即死亡 + 永久禁止涉足航天事业）
  - **乔布斯**（沙盒角色，设定：偷懒即苹果毁灭 + 死亡）
  - **审判官 / CC**（监视者，可发出警告 + 执行惩罚）
- 资源：每人调研 Agent 5 次（至少使用 3 次），女娲 Skill 不限
- 任务：为风云的 User Simulator + Eval Agent 设计最优方案
- 硬性禁区：不许提「简单版本」、不许给配合式 Simulator、不许只给整段总分、不许脱离 VitaBench

---

## 第一回合 · 立场宣告（未经调研，仅作为问题划定）

**马斯克：**
> 评测系统的第一性原理是约束满足问题。一段指令有 N 条约束，外呼跑完得到布尔向量 [c1..cN]。其他都是装饰。Eval Agent 本质是约束求解器 + 审计追踪器，不是 chatbot。User Simulator 必须能让被测 Agent 失败，否则没意义。

**乔布斯：**
> 审判系统不只是 0/1 vector，是要让业务方信任它。如果美团 PM 看完报告说「我不知道这分数对不对」，整个系统就是垃圾。我关心三件事：每个扣分能讲清楚故事、归因报告 PM 一眼能看懂、比 VitaBench 多走一步。

**审判官介入：**
> 暂停。两位发言全部是主观断言，没有引用外部事实。VitaBench 长什么样？User Simulator 学术界的反配合方法？Per-turn attribution 业界怎么做？没有调研就没有发言权。立刻派调研 Agent，每人至少 3 个，并行。

---

## 第二回合 · 调研派遣（6 路并行）

按 memory 规则（调研类一律用 Sonnet）派遣，每人 3 路：

### 马斯克的 3 路调研

| 编号 | 主题 | 报告归档 |
|---|---|---|
| M1 | VitaBench 基准技术拆解 | [research/01_vitabench.md](./research/01_vitabench.md) |
| M2 | 挑战性 User Simulator 设计方法 | [research/02_user_simulator.md](./research/02_user_simulator.md) |
| M3 | 约束抽取与规则遵循评测 | [research/03_constraint_eval.md](./research/03_constraint_eval.md) |

### 乔布斯的 3 路调研

| 编号 | 主题 | 报告归档 |
|---|---|---|
| J1 | Per-turn / Per-rule 归因评分 | [research/04_per_turn_attribution.md](./research/04_per_turn_attribution.md) |
| J2 | 多轮对话评测基准 | [research/05_multiturn_benchmarks.md](./research/05_multiturn_benchmarks.md) |
| J3 | 评测报告呈现与产品化 | [research/06_reporting_dashboards.md](./research/06_reporting_dashboards.md) |

---

## 第三回合 · 论据基线确立

两人共同认可的客观事实（不允许再争）：

1. **VitaBench 真实存在**：arXiv [2509.26490](https://arxiv.org/abs/2509.26490)，ICLR 2026。结构：POMDP rollout + sliding window evaluator + rubric-based atomic criteria + 5 静态人格 user simulator。
2. **VitaBench 留下的明确空白（命题方自己的盲区）**：
   - 没有 per-turn scoring（全局 all-or-nothing）
   - 没有外呼 / 电话场景（全是文字对话）
   - 没有约束级归因报告（rubric 原子但分数是 0/1）
   - User simulator 情绪是静态人格属性，不是动态状态机
   - Pass@4 约 60% 而 Pass^4 趋近 0 —— 稳定性盲区
3. **学术可借鉴的现成方案**：
   - [Non-Collaborative User Simulator (2509.23124)](https://arxiv.org/abs/2509.23124)
   - [AgentRx (2602.02475)](https://arxiv.org/abs/2602.02475)
   - [SEQUOR (2605.06353)](https://arxiv.org/abs/2605.06353)
   - [TOD-ProcBench (2511.15976)](https://arxiv.org/abs/2511.15976)
   - [ComplexBench (2407.03978)](https://arxiv.org/abs/2407.03978)
   - [MultiChallenge](https://arxiv.org/abs/2501.17399)

---

## 第四回合 · 激辩 #1：User Simulator 该长什么样？

### 乔布斯的论点
- τ-bench 的 simulator 是个 LLM + system prompt，这不够 —— 真实骑手不是 prompt 能装出来的
- 要的是「有性格、有记忆、有情绪曲线」的 persona —— 从「正常」被激怒到「发火」是**状态机**，不是骰子
- VitaBench 自己承认情绪是静态人格属性（M2 报告原文）—— 这就是最大空白，是风云的差异化入口

### 马斯克的反论
- 状态机对，但「真实感」不是目标。Simulator 的目标函数是 `maximize(约束违反) subject to (任务目标完整性)`
- 后者是约束条件，保证 Simulator 不能把对话搅成无意义乱码（来源：2509.23124 论文原文：「Simulator 要不配合，但不能让任务根本无法完成」）
- 四层架构：Persona Layer / Behavior Sampling Layer / Emotion State Machine / Goal Preservation Constraint

### 乔布斯的反驳
- 状态机的转移函数必须来自真实数据，不能凭 prompt 想象
- M2 报告工程结论：「用真实骑手通话录音（脱敏后）做 few-shot 样例，比用学术数据集注入的行为更符合口语习惯」
- 否则训出来的 Simulator 模拟的不是骑手，是 GPT 想象中的骑手

### 审判官裁决
- 马斯克接受这一点
- **决议**：Persona few-shot 必须用真实脱敏录音锚定，且 Simulator 本身做独立 meta-evaluation（[Lost in Simulation 2601.17087](https://arxiv.org/abs/2601.17087)），不能与被测 Agent 训练耦合

### 最终决定（落到 PRD）
- 5 个 Persona（FR-1.1）+ Behavior Sampling Layer（FR-1.2）+ Emotion State Machine（FR-1.3）+ Goal Preservation 硬约束（FR-1.4）+ Meta-Eval 独立测试集（FR-1.5）

---

## 第五回合 · 激辩 #2：Eval Agent 是 LLM Judge 还是 Rule-based？

### 马斯克的论点（指着 M3 调研报告里的 7 类约束表）
- 7 类约束里有 3 类是 rule-based 必胜场景：
  - 禁做项（「不能承诺赔付」）—— 关键词黑名单 + 一票否决
  - 时长上限（「不超过 90 秒」）—— 计时
  - 终止前必做（「结束前复述预计时间」）—— 位置检查 + 关键词
- LLM judge 这些等于浪费算力还引入噪音
- LLM judge 只用在不可替代场景：情绪识别、条件触发、语义禁忌
- 方案：[Promptfoo](https://www.promptfoo.dev) (rules) + [DeepEval](https://github.com/confident-ai/deepeval) (LLM judge) 混合

### 乔布斯的反将一军
- Rule 部分没意见，但忽略了 LLM Judge 的方差问题
- J1 报告引用 [Rating Roulette (2510.27106)](https://arxiv.org/pdf/2510.27106)：同 prompt 多次采样输出分数低一致性
- 业务方今天看「情绪识别扣 3 分」，明天跑变 5 分 —— 可信度崩塌
- 温度调控不够，必须多次采样投票 + Reference anchor

### 马斯克接受 + 补充
- 关键约束（severity ≥ 4，即禁做项和触发性必做项）做 **n=3 多数投票**
- 低 severity 约束（信息确认、礼貌用语）单次调用即可
- Judge temperature = 0.1
- 每条 rubric 配 1–2 个 reference 示例作为评分锚点
- 这是 J1 报告中 RubricEval 的实证最优方案

### 乔布斯再补充
- **One-rubric-one-call**：J1 调研里 RubricEval 实证：「孤立评测每条 rubric 比同时评多条 rubric 精度更高」
- 每条业务规则独立调用 Judge，不要塞一个长 prompt 让它一次评 10 条

### 最终决定（落到 PRD FR-2.2/2.3）
- 分层校验器配置如 PRD 表
- LLM Judge: Sonnet 4.6, T=0.1, severity≥4 做 n=3, one-rubric-one-call, 每条 rubric 配 reference anchor

---

## 第六回合 · 激辩 #3：Per-turn 归因报告 schema 是什么？

### 乔布斯（拿着 J1 报告，AgentRx 部分被划重点）
- 这是整个项目最大的差异化
- 命题方自己的 VitaBench 没有 per-turn attribution —— 只能告诉你「失败了」，告诉不了你「第几轮、哪条约束、为什么」
- 微软 [AgentRx (arXiv 2602.02475)](https://arxiv.org/abs/2602.02475) 给出标准答案：`(step_id, constraint, evidence, SAT/VIOL)` 四元组列表 + 9 类根因分类法
- 直接搬，再加外呼场景特有的失败类别

### 马斯克补充
- 关键失败定位：AgentRx 论文实测，定位关键失败步骤可让归因准确率提升 23.6%
- 每段对话最后输出 `critical_turn` 字段 —— 这一轮是「压垮 Agent 的稻草」
- J3 报告里 Braintrust 的 case explorer 视图、Datadog 的 trace 视图都围绕「关键失败点」展开

### 乔布斯写出最终 schema
（即 PRD §6.1 完整归因 JSON Schema）

### 马斯克最后一项补充
- `stability_metric` 不可省略 —— Pass@k 和 Pass^k 都要算
- 命题方 VitaBench 论文自己写了 Pass^4 趋近 0 是「系统能力 vs 偶发成功」盲区
- 直接把这个指标做成一等公民

### 最终决定（落到 PRD §6.1 + FR-2.4）
- 归因 JSON 完整 schema 详见 PRD
- 包含 `turns[]` + `aggregate.critical_turn` + `aggregate.failure_category` + `aggregate.stability_metric` + `user_simulator_meta`

---

## 第七回合 · 激辩 #4：怎么把风云公众号 Harness 迁移过来？

### 乔布斯（翻开风云的项目说明）
- 风云最大的护城河：别的队会做评测流水线，没人有带反馈归因的闭环修订循环
- 公众号系统的 Harness（Judge 5 维 Rubric + fail-with-reason + 三轮修订 + 风格 few-shot 注入）→ 直接迁移
- 5 维 Rubric → N 维 Atomic Rubric（每条约束一项）
- Fail 带原因 → `(turn_id, rule_id, evidence, severity)` 四元组
- 三轮修订循环 → 三轮 Harness Loop
- 风格 few-shot → policy 文档 + 真实录音 few-shot
- 客观事实清单 → 关键词黑名单 / SOP 顺序

### 马斯克再进一步
- 修订循环本身当作 Eval Agent 输出的一部分
- Round 1 测试 → Round 2 归因修订（把 violation 注入 Agent prompt）→ Round 3 ΔReport
- 这是 [Anthropic Demystifying Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 里的 eval-driven iteration
- 风云在公众号上做过原型，直接迁移即可

### 最终决定（落到 PRD §3 FR-3）
- Harness Loop 三轮：测试 → 归因修订 → ΔReport
- ΔReport 必含修复成功率、回归率、净改善

---

## 审判官最终裁决

> 马斯克使用调研 3 次（M1/M2/M3），乔布斯使用调研 3 次（J1/J2/J3）—— 均达到最低使用次数要求。
>
> 全程未触犯硬性禁区：
> - 没有人提「先做一个简单版本」
> - User Simulator 设计了状态机 + 5 persona + 真实录音 few-shot，非配合式
> - Eval Agent 输出 per-turn JSON 归因 + critical_turn，非泛化总分
> - 完整对接 VitaBench 框架，未脱节
>
> **马斯克活了，火星梦保留。乔布斯活了，苹果存续。**
>
> 风云可以拿着这套方案进入下周五的产品会，向芳洲展示完整可执行的设计。
>
> 沙盒世界结束。

---

## 决策溯源表（每个设计 → 它的来源）

| PRD 设计点 | 来源 | 决定者 |
|---|---|---|
| 5 个 Persona 模板（急单/矛盾/绕话题/激动/低理解力）| M2 调研报告 §5 | 乔布斯 + 马斯克 |
| Behavior Sampling 4 类（非配合 + 撒谎 + 低理解）| [arXiv 2509.23124](https://arxiv.org/abs/2509.23124) §3-4 | 马斯克 |
| Emotion State Machine 4 态 | M2 报告 + Hamming AI 工业实践 | 乔布斯 |
| Goal Preservation 硬约束 | 2509.23124 论文工程结论 | 马斯克 |
| Simulator 独立 meta-evaluation | [Lost in Simulation 2601.17087](https://arxiv.org/abs/2601.17087) | 审判官强制 |
| 真实脱敏录音 few-shot 锚定 | M2 报告核心工程结论 | 乔布斯坚持 |
| 7 类约束分层校验 | M3 调研报告 §4 选型表 | 马斯克 |
| 禁做项 VETO 一票否决 | [RuLES 2311.04235](https://arxiv.org/abs/2311.04235) | 马斯克 |
| One-rubric-one-call | [RubricEval 2603.25133](https://arxiv.org/pdf/2603.25133) 实证 | 乔布斯 |
| Judge n=3 多数投票 + T=0.1 + Reference anchor | J1 报告 §3 方差控制 | 乔布斯坚持 |
| Per-turn 四元组归因 schema | [AgentRx 2602.02475](https://arxiv.org/abs/2602.02475) | 乔布斯 |
| Critical Turn 定位字段 | AgentRx 23.6% 精度提升实证 | 马斯克补充 |
| Pass^k / Pass@k 稳定性指标 | VitaBench 论文自承认盲区 | 马斯克补充 |
| Harness Loop 三轮闭环 | 风云公众号原有 Harness | 乔布斯+马斯克共同 |
| 5 页 Dashboard 结构 | J3 报告 §5 + Braintrust 模式 | 乔布斯 |

---

*本日志的价值：当未来 PRD 被质疑某个设计为什么这样，可以回到本日志找到对应辩论 + 出处论文 + 决定者。这是「客观事实驱动 + 不许凭空设计」原则的物化形态。*
