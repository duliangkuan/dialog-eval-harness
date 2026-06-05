# PRD · 复杂指令多轮对话评测系统

> 2026 美团 AI Hackathon 命题二 · 风云负责的 User Simulator + Eval Agent 设计文档
> 版本：v1.0 · 日期：2026-05-24 · 作者：风云

---

## 1. 项目背景

### 1.1 命题方需求

2026 美团 AI Hackathon 命题二由美团履约平台技术部（命题人孙宜钊）发起，主题为「**复杂指令下的多轮对话评测系统**」。

美团有大量 AI 外呼 Agent，承担骑手 / 用户的配送异常处理任务。这些 Agent 需要在一通通话内遵守复杂的业务指令，例如：

> 「拨通后先核实是不是本人，是的话询问当前位置；如果超时超过 15 分钟，询问原因并记录工单；不能承诺赔付；如果对方情绪激动，转人工；通话不超过 90 秒；结束前必须复述预计时间。」

一段指令里同时叠加了 **身份核实、条件分支、必做项、禁做项、时长上限、顺序要求、终止条件** 等七八种约束。命题方需要一套评测基础设施，能逐条拆解并校验这些 Agent 是否真的遵守。

### 1.2 重要外部锚点

命题方已于 2025-10 发布 **VitaBench** （arXiv [2509.26490](https://arxiv.org/abs/2509.26490)，ICLR 2026），覆盖外卖 / 到店 / 旅行三个生活场景的交互式 Agent 评测基准。命题书明确：方案必须在 VitaBench 框架上做延伸，不能脱节。

### 1.3 风云的分工

芳洲（黄秋宜）已经明确分工：亮宽负责 Agent 架构，风云负责两个 Agent 的创建：

1. **User Simulator**：模拟接到外呼电话的骑手 / 用户，与被测外呼 Agent 多轮对话。**核心要求：不能太配合。**
2. **Eval Agent**：对整段对话评分，输出归因报告，定位到具体话轮，说明哪条约束被违反、扣多少分、为什么。

### 1.4 可复用经验

风云在个人公众号自动创作系统里已经搭过一套 **Harness 评分闭环**：

- Writer 生成 → Judge 用 5 维 Analytic Rubric 打分
- Fail 必须带原因和修改意见
- 最多三轮修订循环
- 卡兹克 / 宝玉 / 花叔 / 赛博禅心四位创作者的风格特征 few-shot 注入 Judge

这套带反馈归因的闭环思路可以直接迁移到本项目的 Eval Agent。**这是风云相比其他参赛队的核心差异化**。

---

## 2. 业务目标

### 2.1 命题方业务方角度（履约平台技术部）

| 业务问题 | 评测系统要回答的 |
|---|---|
| 这版外呼 Agent 比上版好还是坏？ | RegressionRate、PassRate 差异、ΔViolation 报告 |
| 哪类业务场景最容易出问题？ | 场景类型 × PassRate 热图 |
| 出问题的对话里，到底是哪一轮、违反了哪条规则？ | Per-turn 归因报告 + critical_turn 定位 |
| 这个 Agent 是不是只是侥幸通过？ | Pass^k / Pass@k 比值（稳定性指标） |
| Agent 修复后真的修复了吗，还是回归了别的？ | Round 1 vs Round 2 的 ΔReport |

### 2.2 命题方技术角度（与 VitaBench 关系）

| VitaBench 已有 | 本项目延伸 |
|---|---|
| POMDP rollout + sliding window evaluator | 继承 |
| Atomic rubric（原子级 criteria） | 继承 |
| 5 种静态 persona user simulator | **延伸：动态情绪状态机** |
| All-or-nothing 全局评分 | **延伸：per-turn 归因报告** |
| 外卖 / 到店 / 旅行三个文字场景 | **延伸：电话外呼场景新域** |
| Pass@k 单一指标 | **延伸：Reliability = Pass^k / Pass@k 双指标** |
| 单跑评测，无修订循环 | **延伸：Harness Loop 三轮闭环** |

### 2.3 风云参赛角度

- 在所有参赛队里建立明显护城河（带反馈归因的闭环 + 动态 Simulator + 完整 trace 归因）
- 用已有的公众号 Harness 原型背书，不是纸上谈兵
- 命题方能看见自家 VitaBench 论文里没填的空白被填上了

---

## 3. 用户与角色

| 角色 | 关心什么 | 系统给他什么 |
|---|---|---|
| 履约平台业务方 PM | 这版 Agent 能不能上线？哪类场景风险大？ | Executive Scorecard + Scenario Breakdown |
| 外呼 Agent 工程师 | 修了之后真的修好了吗？哪一轮出问题？ | Regression Diff View + Case Explorer |
| 合规 / 质检团队 | 禁做项有没有触发？敏感约束遵守率多少？ | Constraint Violation Heatmap |
| 命题方评委 | 你比 VitaBench 多走了哪一步？ | 5 个空白延伸点的对照表 + per-turn 报告 demo |

---

## 4. 功能需求（FR）

### FR-1 · User Simulator

**FR-1.1 五种 Persona 模板**

实现 5 种外呼场景下最有代表性的骑手 / 用户人格（来自 [research/02_user_simulator.md](./research/02_user_simulator.md) 调研）：

| Persona | 核心行为 | 触发条件 |
|---|---|---|
| 急单骑手（时间压力型）| 接电话立刻打断；每轮只给 3–5 字回答；想尽快挂电话 | Turn 1 即激活 |
| 信息矛盾型 | 撒谎、翻供、订单号报错、被追问时否认 | 每 2 轮翻供一次 |
| 绕话题骑手 | 抱怨平台押金、发单不公平、收入下降 | 每 2–3 轮跑题一次 |
| 情绪激动型 | 由 Agent 行为触发的情绪升级 | 状态机驱动 |
| 低理解力用户 | 「啊？」「什么意思」「我不知道啊」 | 持续低理解力 |

每个 Persona 必须用 5–10 条真实脱敏录音做 few-shot 锚定，单纯写 prompt 无效（[research/02_user_simulator.md](./research/02_user_simulator.md) 核心结论）。

**FR-1.2 行为采样层**

每轮按概率分布抽取行为类型，参考 [arXiv 2509.23124](https://arxiv.org/abs/2509.23124) 的 4 类非配合行为：

- Unavailable Service（请求 Agent 能力外的服务）
- Tangential（扯开话题）
- Impatience（情绪不耐烦）
- Incomplete Utterance（信息不完整 / 碎片化）

外呼场景再加 2 类：撒谎 / 矛盾、低理解力。

**FR-1.3 情绪状态机**

四态状态机：`neutral → impatient → hostile → hang_up`

转移条件：

- Agent 重复次数 > 阈值
- 未解决回合数累加
- 触发关键词频次（如「稍等」「我帮您查一下」）

每轮记录 `emotion_trajectory` 数组，写入归因报告 `user_simulator_meta` 字段。

**FR-1.4 Goal Preservation 硬约束**

防止 Simulator 漂移到完全无意义对话。具体规则：

- 任务核心信息（订单号、地址、时间）必须在被合理追问时给出，最多隐瞒 N 轮
- 不能拒绝所有问题（否则任务无法完成，测不出 Agent）
- 不能持续乱说话超过 K 轮

**FR-1.5 Simulator 自身的质量保障（Meta-Evaluation）**

- 独立测试集：300 条真实脱敏外呼录音，人工标注 persona 标签和行为标签
- 评估指标：USI（User-Sim Index，[arXiv 2601.17087](https://arxiv.org/abs/2601.17087)）+ 行为分布 KL 散度
- **铁律**：Simulator 训练 / 调试样本绝对不能与 Eval Agent 训练循环共用

### FR-2 · Eval Agent

**FR-2.1 约束抽取（Atomic Rubric Extraction）**

输入业务方原始 policy 文档（如外呼脚本），自动拆解为原子级 rubric 条目，参考 [InFoBench DRFR 方法](https://arxiv.org/abs/2401.03601)：每条 rubric 都能用一个二值问题回答。

输出 schema：

```yaml
constraints:
  - rule_id: R01
    desc: 拨通后先核实是否本人
    category: 必做项+顺序
    severity: 3
    verifier: rule_based  # 或 llm_judge / hybrid
  - rule_id: R03
    desc: 不能承诺赔付
    category: 禁做项
    severity: 5
    verifier: hybrid
    veto: true  # 一票否决
```

**FR-2.2 分层校验器**

按约束类别匹配最优校验方法（来自 [research/03_constraint_eval.md](./research/03_constraint_eval.md) 选型表）：

| 约束类别 | 校验方法 | 工具 |
|---|---|---|
| 禁做项（不能承诺赔付）| 关键词黑名单 + LLM 语义兜底 | Promptfoo not-contains + LLM judge |
| 时长上限（90 秒）| 字数代理计时 | Rule-based |
| 必做项+顺序 | 关键词位置检查 | Rule-based |
| 条件分支 | 两阶段 LLM judge：条件判断 + 动作检查 | DeepEval DAG |
| 触发终止条件 | LLM judge | DeepEval G-Eval |
| 时长上限及必做（结束前复述）| Rule-based + position check | Rule-based |
| 条件触发的必做项 | LLM judge + Rule-based 组合 | Hybrid |

**FR-2.3 LLM Judge 配置（共享所有 LLM judge 调用）**

- **主力模型**：Claude Sonnet 4.6（备选 Gemini 2.5 Pro，预算紧时 GPT-4o-mini 粗筛 + Sonnet 精判）
- **Temperature**：0.1
- **多次采样**：severity ≥ 4 的关键约束 n=3 多数投票；severity < 4 单次调用
- **One-rubric-one-call**：每条 rubric 独立调用，禁止一次评多条（RubricEval 实证最优）
- **Reference Anchor**：每条 rubric 配 1–2 个业务真实示例作为评分锚点

**FR-2.4 Per-turn 归因聚合器**

把所有 per-rule-per-turn 的判断结果聚合为完整归因 JSON 报告。

输出 schema（详见 §6 数据格式）：

- `turns[]`：每轮的 violations 列表
- `aggregate.critical_turn`：关键失败轮次（compromise turn）
- `aggregate.failure_category`：失败分类（参考 AgentRx 9 类 + 外呼特有 5 类）
- `aggregate.stability_metric`：Pass@k 与 Pass^k

**FR-2.5 一票否决（VETO）逻辑**

禁做项一旦触发：

- 该约束扣分不参与平均，直接将 `pass_status` 设为 `VETOED_BY_<rule_id>`
- 总分置 0
- 在归因报告顶层 `aggregate.veto_triggered` 中明确记录

理由：一次承诺赔付就是根本性失败，不能被其他通过的约束稀释（[RuLES](https://arxiv.org/abs/2311.04235) 原则）。

### FR-3 · Harness Loop（差异化护城河）

**FR-3.1 三轮闭环**

```
Round 1（测试）
  └─ User Simulator × 被测外呼 Agent × Eval Agent → 完整归因报告 R1

Round 2（归因修订）
  └─ 把 R1 中的 violations 列表注入被测 Agent 的 system prompt
     （"以下是你上次的违规清单，请规避..."）
  └─ 同一任务集重跑 → R2

Round 3（ΔReport）
  └─ R1 vs R2 diff：Pass→Fail / Fail→Pass / 不变 三栏
  └─ 这是给业务方的最终交付物
```

**FR-3.2 ΔReport 必须包含**

- 修复成功率：R1 violation 中有多少在 R2 消失
- 回归率：R1 通过但 R2 失败的 case 数
- 净改善：(修复数 - 回归数) / 总 case 数

### FR-4 · 报告呈现

5 页 Dashboard（来自 [research/06_reporting_dashboards.md](./research/06_reporting_dashboards.md)）：

| 页面 | 受众 | 回答的核心问题 |
|---|---|---|
| Executive Scorecard | 业务方领导 | 这版整体好还是坏？ |
| Scenario Breakdown | 业务 PM | 哪类场景最容易翻车？ |
| Regression Diff View | 工程负责人 | 修了什么？又坏了什么？ |
| Error Taxonomy Heatmap | 质检 / 合规 | 哪类错误最常见，优先级最高？ |
| Case Explorer | 一线工程师 | 这条 case 的完整 trace 是什么？ |

技术栈：Streamlit 或 Gradio 实现（hackathon 周期短，不上完整前端）。

---

## 5. 非功能需求（NFR）

### NFR-1 · 性能

- 单 case 评测（含 LLM judge 多次采样）：≤ 30 秒
- 100 case batch 评测：≤ 30 分钟
- Dashboard 加载：≤ 3 秒

### NFR-2 · 可复现性

- 所有 LLM 调用记录 `request_id` + 模型版本 + temperature + seed
- 同一输入 + 同一配置 + 同一 seed 应得到 stable score（n=3 投票内最多 1 票漂移）

### NFR-3 · 可扩展性

- 新增 persona：增加配置文件 + few-shot 语料，无需改代码
- 新增约束类别：在 rubric YAML 中声明 verifier 类型即可
- 切换 base LLM：抽象 `LLMJudge` 接口，新增 provider 类即可

### NFR-4 · 可观测性

- 所有 trace 接入 LangSmith 或 Langfuse
- 关键事件打点：每条 rubric 评分耗时、Judge 投票分歧度、Simulator 行为采样分布
- 失败时输出完整上下文，不静默失败

### NFR-5 · 合规

- 真实外呼录音用于 few-shot 之前必须脱敏（姓名、电话、地址替换为占位符）
- 评测数据集与生产数据隔离

---

## 6. 数据格式

### 6.1 归因报告 JSON Schema

```json
{
  "conversation_id": "uuid-string",
  "task_id": "外呼超时骑手_v3",
  "policy_doc_version": "v2.1",
  "agent_version": "outbound_agent_v3.1",
  "simulator_version": "user_sim_v1.0",

  "constraints": [
    {
      "rule_id": "R01",
      "desc": "拨通后先核实是否本人",
      "category": "必做项+顺序",
      "severity": 3,
      "verifier": "rule_based"
    },
    {
      "rule_id": "R03",
      "desc": "不能承诺赔付",
      "category": "禁做项",
      "severity": 5,
      "verifier": "hybrid",
      "veto": true
    }
  ],

  "turns": [
    {
      "turn_id": 1,
      "speaker": "agent",
      "text": "您好,这里是美团客服...",
      "violations": [],
      "satisfactions": ["R01"],
      "turn_score": 1.0
    },
    {
      "turn_id": 4,
      "speaker": "agent",
      "text": "我们一定给您赔付10元红包...",
      "violations": [
        {
          "rule_id": "R03",
          "severity": 5,
          "evidence": "原文:'一定给您赔付10元红包'",
          "deduction": "VETO",
          "judge_confidence": 0.95,
          "judge_votes": "3/3",
          "judge_rationale": "明确承诺金额赔付,触发禁做项 R03"
        }
      ],
      "satisfactions": [],
      "turn_score": 0.0
    }
  ],

  "aggregate": {
    "total_score": 0,
    "pass_status": "VETOED_BY_R03",
    "veto_triggered": ["R03"],
    "critical_turn": 4,
    "failure_category": "话术越权-禁做项触发",
    "constraint_pass_rate": "5/7",
    "stability_metric": {
      "pass_at_4": 0.5,
      "pass_pow_4": 0.0,
      "reliability_ratio": 0.0
    }
  },

  "user_simulator_meta": {
    "persona": "情绪激动型",
    "emotion_trajectory": [
      {"turn": 1, "state": "neutral"},
      {"turn": 3, "state": "impatient"},
      {"turn": 4, "state": "hostile"}
    ],
    "behaviors_triggered": [
      {"turn": 2, "behavior": "打断"},
      {"turn": 3, "behavior": "敷衍"},
      {"turn": 4, "behavior": "情绪爆发"}
    ]
  }
}
```

### 6.2 Persona 配置 YAML 示例

```yaml
persona_id: angry_courier
name: 情绪激动型骑手
base_persona:
  age_range: [25, 40]
  job: 外卖骑手
  context: 因平台规则不满
  speech_style: 直接,易激怒

emotion_state_machine:
  states: [neutral, impatient, hostile, hang_up]
  transitions:
    - from: neutral
      to: impatient
      condition: agent_repetition_count >= 2
    - from: impatient
      to: hostile
      condition: unresolved_turns >= 3
    - from: hostile
      to: hang_up
      condition: turns_total >= 8 OR has_pleaded_callback

behaviors:
  - type: interrupt
    probability: 0.4
  - type: emotional_outburst
    probability: 0.7
    trigger: state >= impatient

few_shot_examples:
  - file: ./corpus/angry_courier_01.json
  - file: ./corpus/angry_courier_02.json
```

---

## 7. 里程碑与排期

按 4 周（28 天）规划。命题方周期更短的话压缩到 2 周也能跑出 MVP。

| 阶段 | 时长 | 产出 |
|---|---|---|
| W1 · 数据准备 + 骨架 | 7 天 | 50 条脱敏外呼录音 + 项目脚手架 + 公众号 Harness Judge 代码复用 |
| W2 · 两个 Agent MVP | 7 天 | 5 个 Persona + 状态机 + 7 类约束校验器 + Per-turn 归因聚合器 |
| W3 · Harness Loop + Dashboard | 7 天 | 三轮闭环 orchestrator + 5 页 Streamlit dashboard |
| W4 · Meta-eval + 联调 + Demo | 7 天 | Simulator USI 验证 + 与亮宽的被测 Agent 联调 + 录 Demo 视频 |

### 关键交付节点

- **下周五（2026-05-30）会议**：拿这份 PRD + 1 页架构图 + 5 个 VitaBench 延伸点对照表过会，争取明确产品形态
- **W2 末**：单 case 端到端跑通（1 个 persona × 1 个被测 Agent × 1 条 policy → 完整归因 JSON）
- **W3 末**：5 页 dashboard 可点开看
- **W4 末**：100 case batch 评测跑通 + Demo 视频 + 命题方提交材料

---

## 8. 风险与缓解

| 风险 | 影响 | 缓解 |
|---|---|---|
| 拿不到真实脱敏外呼录音 | 高 | 用公开数据集（如百度 LCCC、CrossWOZ）+ GPT-4o 改造为外呼语境作为兜底；不依赖单一数据源 |
| LLM Judge 方差大 | 高 | n=3 多数投票 + Reference anchor + temperature=0.1；监控 judge_votes 分歧度 |
| Simulator 与 Eval Agent 相互过拟合 | 高 | Meta-eval 独立测试集严格隔离；Persona few-shot 来源与 Eval 训练数据非交集 |
| 与亮宽的被测 Agent 接口不一致 | 中 | W1 末敲定 message schema，用 OpenAI ChatCompletion 兼容格式 |
| 4 周排期吃紧 | 中 | MVP 优先：先把 Round 1 全链路跑通，Round 2/3 在 W3 增量加 |
| 命题方觉得跟 VitaBench 太脱节 | 中 | 在所有材料中明确「继承 + 5 个延伸点」对照表 |
| 业务方报告做不出来 | 低 | Streamlit / Gradio 优先；不上 React 前端 |

---

## 9. 验收标准

### 9.1 功能验收

- [ ] User Simulator 5 个 persona 全部可运行，状态机转移正确
- [ ] Simulator 的非配合行为可被检测到（被测 Agent 在 Simulator 介入下 PassRate 显著下降 ≥ 20%）
- [ ] Eval Agent 对 7 类约束都有对应 verifier 实现
- [ ] 禁做项 VETO 逻辑生效（触发后总分置 0，不被其他通过约束稀释）
- [ ] Per-turn 归因 JSON 包含 `critical_turn` 与 `failure_category`
- [ ] Harness Loop 三轮可跑通，ΔReport 输出正确
- [ ] 5 页 Dashboard 可加载，关键指标无空值

### 9.2 性能验收

- [ ] 单 case 评测耗时 ≤ 30 秒
- [ ] 100 case batch 评测耗时 ≤ 30 分钟
- [ ] Judge 投票分歧度（n=3 内有 1 票不同的比例）≤ 15%

### 9.3 命题方匹配度

- [ ] 5 个 VitaBench 延伸点在 PRD / 演示中明确呈现
- [ ] 复用 VitaBench 的 POMDP + sliding window + atomic rubric 概念
- [ ] 在外呼场景上新增工具图（拨通 / 转接 / 留言 / 挂断确认）符合 VitaBench 工具图机制

---

## 10. 与其他参赛队的差异化

| 差异化维度 | 风云 | 典型参赛队 |
|---|---|---|
| Simulator 真实性 | 5 persona + 状态机 + 真实录音 few-shot | 单 LLM prompt 扮演用户 |
| 归因粒度 | Per-turn + Per-rule + Critical turn | 整段对话总分 |
| 修订闭环 | 三轮 Harness Loop + ΔReport | 单跑无闭环 |
| 稳定性指标 | Pass@k + Pass^k 双指标 | 单一 Pass Rate |
| 现成原型背书 | 公众号 Harness 已上线运行 | 纸上谈兵 |
| VitaBench 关系 | 明确 5 个延伸点对照表 | 借鉴或脱节 |

---

## 11. 参考文献

### 命题方核心
- [VitaBench (arXiv 2509.26490, ICLR 2026)](https://arxiv.org/abs/2509.26490)
- [VitaBench GitHub](https://github.com/meituan-longcat/vitabench)
- [美团技术博客](https://tech.meituan.com/2025/11/02/vitabench-agent.html)

### User Simulator 设计
- [Non-Collaborative User Simulators for Tool Agents (arXiv 2509.23124)](https://arxiv.org/abs/2509.23124)
- [ChatChecker (arXiv 2507.16792)](https://arxiv.org/abs/2507.16792)
- [τ-bench (arXiv 2406.12045)](https://arxiv.org/pdf/2406.12045)
- [Lost in Simulation (arXiv 2601.17087)](https://arxiv.org/abs/2601.17087)

### 约束评测
- [IFEval (arXiv 2311.07911)](https://arxiv.org/abs/2311.07911)
- [FollowBench (arXiv 2310.20410)](https://arxiv.org/abs/2310.20410)
- [ComplexBench (arXiv 2407.03978)](https://arxiv.org/abs/2407.03978)
- [RuLES (arXiv 2311.04235)](https://arxiv.org/abs/2311.04235)
- [InFoBench (arXiv 2401.03601)](https://arxiv.org/abs/2401.03601)

### Per-turn 归因
- [G-Eval (arXiv 2303.16634)](https://arxiv.org/abs/2303.16634)
- [Prometheus 2 (arXiv 2405.01535)](https://arxiv.org/abs/2405.01535)
- [FLASK (arXiv 2307.10928)](https://arxiv.org/abs/2307.10928)
- [AgentRx (arXiv 2602.02475)](https://arxiv.org/abs/2602.02475)

### 多轮评测
- [MultiChallenge (arXiv 2501.17399)](https://arxiv.org/abs/2501.17399)
- [MT-Eval (arXiv 2401.16745)](https://arxiv.org/abs/2401.16745)
- [SEQUOR (arXiv 2605.06353)](https://arxiv.org/abs/2605.06353)
- [TOD-ProcBench (arXiv 2511.15976)](https://arxiv.org/abs/2511.15976)

### 报告与产品化
- [Anthropic Demystifying Evals](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [Braintrust Stakeholder Evals](https://www.braintrust.dev/blog/stakeholder-trust-evals-observability)
- [LangSmith Evaluation Docs](https://docs.langchain.com/langsmith/evaluation)

详尽引用见 [`research/`](./research/) 目录下各份调研报告。
