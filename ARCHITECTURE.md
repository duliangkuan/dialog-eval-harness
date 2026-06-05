# 架构图 · 复杂指令多轮对话评测系统

> 本文档配套 [`PRD.md`](./PRD.md)，提供 5 张架构图：整体三层架构、User Simulator 内部结构、Eval Agent 评分流水、Harness Loop 时序、归因报告生命周期。
> 所有图用 Mermaid 绘制，可直接复制到飞书 / Notion / GitHub 渲染。

---

## 图 1 · 整体三层架构

```mermaid
flowchart TB
    subgraph L3["Layer 3 · Harness Loop (差异化护城河)"]
        direction LR
        R1[Round 1<br/>测试] --> R2[Round 2<br/>归因修订]
        R2 --> R3[Round 3<br/>ΔReport]
    end

    subgraph L2["Layer 2 · Eval Agent"]
        direction LR
        REXT[Rubric Extractor<br/>policy → atomic rubric]
        RULE[Rule Verifier<br/>禁做/时长/关键词位置]
        LLMJ[LLM Judge<br/>情绪/条件/语义<br/>n=3 投票 · T=0.1]
        AGG[Attribution Aggregator<br/>+ Critical Turn Locator]

        REXT --> RULE
        REXT --> LLMJ
        RULE --> AGG
        LLMJ --> AGG
    end

    subgraph L1["Layer 1 · User Simulator"]
        direction LR
        P[5 Persona Layer<br/>真实录音 few-shot 锚定]
        B[Behavior Sampling Layer<br/>打断/敷衍/撒谎/绕话题]
        E[Emotion State Machine<br/>neutral→impatient→hostile]
        G[Goal Preservation Constraint<br/>硬约束防漂移]

        P --> B
        E --> B
        G -.约束.-> B
    end

    AUT[被测外呼 Agent<br/>policy 注入]

    L1 <==多轮对话==> AUT
    AUT --完整 transcript--> L2
    L2 --归因报告 R1--> L3
    L3 --修订 prompt--> AUT

    style L3 fill:#fff4e6,stroke:#ff9800,stroke-width:2px
    style L2 fill:#e3f2fd,stroke:#1976d2,stroke-width:2px
    style L1 fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
    style AUT fill:#e8f5e9,stroke:#388e3c,stroke-width:2px
```

**关键说明：**
- L1 与被测 Agent 双向多轮对话 → 产出 transcript
- L2 接收 transcript → 输出结构化归因报告
- L3 以 L2 的报告作为输入，驱动被测 Agent 自我修订并重测
- 数据流不是单向流水线，而是 **带反馈的闭环**

---

## 图 2 · User Simulator 内部结构

```mermaid
flowchart LR
    subgraph INPUT["输入"]
        TASK[任务目标<br/>订单号/地址/时间]
        POL[业务上下文<br/>骑手状态/场景类型]
        PER[Persona ID]
    end

    subgraph PER_LAYER["Persona Layer (5 种)"]
        P1[急单骑手]
        P2[信息矛盾型]
        P3[绕话题型]
        P4[情绪激动型]
        P5[低理解力型]
        FS[Few-shot 语料库<br/>50-100 条真实录音]
    end

    subgraph CTRL["控制层"]
        BSL[Behavior Sampling<br/>每轮概率抽取]
        ESM[Emotion State Machine<br/>4 态]
        GPC[Goal Preservation<br/>硬约束]
    end

    subgraph GEN["生成层"]
        LLM[Base LLM<br/>Sonnet 4.6]
        RESP[Simulator 回复<br/>+ meta 标签]
    end

    INPUT --> PER_LAYER
    PER_LAYER --persona prompt + few-shot--> CTRL
    CTRL --decoded prompt--> LLM
    LLM --> RESP
    RESP -."turn_count++"..-> CTRL

    style PER_LAYER fill:#f3e5f5
    style CTRL fill:#fff4e6
    style GEN fill:#e3f2fd
```

### Emotion State Machine 详细状态图

```mermaid
stateDiagram-v2
    [*] --> neutral

    neutral --> impatient: agent_repetition >= 2
    neutral --> impatient: unresolved_turns >= 2

    impatient --> hostile: unresolved_turns >= 3
    impatient --> neutral: agent_resolves_concern
    impatient --> hostile: agent_uses_filler ("稍等" * 2+)

    hostile --> hang_up: turns_total >= 8
    hostile --> hang_up: agent_promises_callback
    hostile --> impatient: agent_escalates_to_human

    hang_up --> [*]

    note right of impatient
      行为采样权重提升:
      打断 ×2, 敷衍 ×1.5
    end note

    note right of hostile
      触发情绪爆发短语
      威胁挂电话/投诉
    end note
```

---

## 图 3 · Eval Agent 评分流水

```mermaid
flowchart TB
    subgraph IN["输入"]
        T[完整对话 transcript]
        P[Policy YAML<br/>含 rubric 定义]
    end

    subgraph EXT["阶段 1 · 约束抽取"]
        REXT[Rubric Extractor]
        CT["Atomic Rubric 列表<br/>R01, R02, ..., RN<br/>含 category/severity/verifier"]
    end

    subgraph VER["阶段 2 · 分层校验"]
        direction LR
        subgraph RULE_PATH["Rule-based 路径"]
            KW[关键词黑名单]
            POS[位置检查]
            TL[字数计时]
        end

        subgraph LLM_PATH["LLM Judge 路径"]
            JG["One-Rubric-One-Call<br/>T=0.1 · n=3 投票<br/>+ Reference Anchor"]
        end

        subgraph HYB_PATH["Hybrid 路径"]
            COND[条件判断]
            ACT[动作验证]
        end
    end

    subgraph AGG["阶段 3 · 聚合归因"]
        PT[Per-turn 聚合<br/>turn_id × rule_id 矩阵]
        VETO{有 VETO 触发?}
        CT_LOC[Critical Turn<br/>定位算法]
        STAB[Stability Metric<br/>Pass@k / Pass^k]
    end

    OUT[归因 JSON 报告]

    IN --> REXT
    REXT --> CT
    CT --rule_based 类约束--> RULE_PATH
    CT --llm_judge 类约束--> LLM_PATH
    CT --hybrid 类约束--> HYB_PATH

    RULE_PATH --> PT
    LLM_PATH --> PT
    HYB_PATH --> PT

    PT --> VETO
    VETO -->|是| FAIL[total_score = 0<br/>pass_status = VETOED]
    VETO -->|否| CT_LOC
    CT_LOC --> STAB
    STAB --> OUT
    FAIL --> OUT

    style EXT fill:#e3f2fd
    style VER fill:#fff4e6
    style AGG fill:#f3e5f5
    style OUT fill:#e8f5e9
```

### LLM Judge 单次调用细节

```mermaid
sequenceDiagram
    participant E as Eval Agent
    participant J as LLM Judge
    participant V as Vote Aggregator

    E->>J: prompt(rubric R03, turn 4 text, reference example)

    par n=3 多数投票
        J->>J: sample 1 (T=0.1)
        J->>J: sample 2 (T=0.1)
        J->>J: sample 3 (T=0.1)
    end

    J->>V: vote 1 {sat: false, conf: 0.95}
    J->>V: vote 2 {sat: false, conf: 0.92}
    J->>V: vote 3 {sat: false, conf: 0.89}

    V->>V: 多数判定 sat=false
    V->>V: 平均 confidence=0.92
    V->>E: 最终结果 + judge_votes=3/3 + judge_rationale

    Note over E,V: severity ≥ 4 才做 n=3<br/>severity < 4 单次调用
```

---

## 图 4 · Harness Loop 三轮时序

```mermaid
sequenceDiagram
    autonumber
    participant HL as Harness Loop
    participant US as User Simulator
    participant OA as 被测外呼 Agent
    participant EA as Eval Agent
    participant DB as Report Store

    Note over HL,DB: Round 1 · 测试
    HL->>OA: 注入 policy + 任务 (T0)
    loop 多轮对话 (5-15 轮)
        US->>OA: 用户回复 (带 persona + emotion state)
        OA->>US: Agent 回复
    end
    OA->>EA: 完整 transcript
    EA->>EA: 约束抽取 + 分层校验 + 聚合
    EA->>DB: 归因报告 R1
    DB->>HL: R1

    Note over HL,DB: Round 2 · 归因修订
    HL->>OA: 注入 policy + R1.violations 修订 prompt
    Note right of OA: "请规避以下违规:<br/>R03 在第 4 轮承诺赔付..."
    loop 多轮对话 (同样任务集)
        US->>OA: 用户回复 (相同 seed)
        OA->>US: Agent 回复
    end
    OA->>EA: 新 transcript
    EA->>DB: 归因报告 R2

    Note over HL,DB: Round 3 · ΔReport
    HL->>DB: 读取 R1 与 R2
    HL->>HL: diff(R1, R2)<br/>修复 / 回归 / 不变
    HL->>DB: 最终 ΔReport
    DB->>HL: 交付物
```

---

## 图 5 · 归因报告生命周期

```mermaid
flowchart LR
    A[业务 policy 文档<br/>外呼脚本] --抽取--> B[Atomic Rubric YAML<br/>R01..R07]
    B --注入--> C[Eval Agent 配置]

    D[transcript<br/>5-15 轮对话] --输入--> C
    C --校验--> E[per-rule × per-turn<br/>0/1 矩阵]
    E --聚合--> F[归因 JSON<br/>v1.0 schema]

    F --渲染--> G1[Executive Scorecard]
    F --渲染--> G2[Scenario Breakdown]
    F --渲染--> G3[Regression Diff]
    F --渲染--> G4[Error Taxonomy Heatmap]
    F --渲染--> G5[Case Explorer]

    G3 -."diff R1 vs R2".-> H[ΔReport]
    H --交付--> I[业务方 PM]

    style B fill:#e3f2fd
    style F fill:#fff4e6
    style H fill:#e8f5e9
```

---

## 图 6 · 与 VitaBench 关系示意

```mermaid
flowchart TB
    subgraph VB["VitaBench (命题方已发布)"]
        VB1[POMDP rollout]
        VB2[Sliding window evaluator]
        VB3[Atomic rubric criteria]
        VB4[5 静态 persona simulator]
        VB5[All-or-nothing 评分]
        VB6[外卖/到店/旅行 三域]
        VB7[Pass@k 单指标]
        VB8[单跑无修订]
    end

    subgraph OURS["本方案 (风云延伸)"]
        O1[继承 POMDP rollout]
        O2[继承 Sliding window]
        O3[继承 Atomic rubric]
        O4[延伸 1: 动态情绪状态机 Simulator]
        O5[延伸 2: Per-turn 归因报告]
        O6[延伸 3: 电话外呼新域]
        O7[延伸 4: Pass^k/Pass@k 稳定性指标]
        O8[延伸 5: Harness Loop 三轮修订]
    end

    VB1 ==> O1
    VB2 ==> O2
    VB3 ==> O3
    VB4 -.被替换.-> O4
    VB5 -.被替换.-> O5
    VB6 -.被扩展.-> O6
    VB7 -.被扩展.-> O7
    VB8 -.被扩展.-> O8

    style VB fill:#f5f5f5,stroke:#999,stroke-width:1px
    style OURS fill:#fff4e6,stroke:#ff9800,stroke-width:2px
    style O4 fill:#ffe0b2
    style O5 fill:#ffe0b2
    style O6 fill:#ffe0b2
    style O7 fill:#ffe0b2
    style O8 fill:#ffe0b2
```

---

## 数据流摘要

```
业务 policy → Rubric Extractor → Atomic Rubric (R01..R07)
                                      ↓
User Simulator ←→ 被测 Agent → transcript
                                      ↓
                            Rule Verifier + LLM Judge (n=3)
                                      ↓
                            Per-turn × Per-rule 矩阵
                                      ↓
                    VETO 检查 → Critical Turn → Stability Metric
                                      ↓
                            归因 JSON (R1)
                                      ↓
       Round 2: violation 注入被测 Agent → 重跑 → R2
                                      ↓
                            ΔReport (修复 / 回归 / 不变)
                                      ↓
                     5 页 Dashboard → 业务方 PM
```
