# 调研 02 · 挑战性 User Simulator 设计方法

> 调研编号：M2（马斯克派遣）
> 调研日期：2026-05-24
> 模型：Claude Sonnet
> 用途：找让 User Simulator 真实有挑战性（不配合）的工程方法

---

## 调研动机

传统基于 LLM 的 User Simulator 太配合（GPT 扮演用户时太礼貌、太顺从），无法暴露被测对话 Agent 的真实问题。

美团外呼场景里，真实骑手会**打断、敷衍、说模糊的话、情绪激动、不正面回答问题、绕话题**。

---

## 一、学术界核心方法

### 主要参考论文：Non-Collaborative User Simulators for Tool Agents

[arXiv 2509.23124](https://arxiv.org/abs/2509.23124)（2025，NeurIPS 方向）

系统提出**四类不配合行为**的注入框架，在 MultiWOZ 和 τ-bench 上验证了被测 Agent 的显著性能下降：

- **请求不可用服务（Unavailable Service）**：用 GPT-4.1-mini 分析用户目标，生成三条超出 Agent API 能力边界的扩展需求句
- **扯开话题（Tangential）**：从 Persona Hub 随机采样 persona，插入与主任务无关的闲聊 / 问题，与协作话语混合
- **表达不耐烦（Impatience）**：当 Agent 明确传达失败或多轮未解决时，概率性触发情绪爆发（abuse / threat / urge），失败次数越多触发概率越高
- **信息不完整（Incomplete Utterance）**：对协作话语做风格迁移，用真实用户对话中 5 条 few-shot 样例模拟极简 / 提前中断的碎片化表达

### 其他关键论文

- **ChatChecker** ([arXiv 2507.16792](https://arxiv.org/abs/2507.16792), NeurIPS 2025)：「非合作 Persona 生成器」，用 GPT-4o 注入 Big Five 人格特征，生成诸如「讽刺型旅行者 Ava」这类具体角色，内置 LLM-as-judge 的对话崩溃检测（0-1 分打分）
- **τ-bench** ([arXiv 2406.12045](https://arxiv.org/pdf/2406.12045))：Anthropic / 工业界实际用的基准，Persona 分三档：None / Easy（熟悉领域）/ Hard（低技术背景），与工具状态耦合，支持系统性消融
- **DIAL** ([arXiv 2512.20773](https://arxiv.org/abs/2512.20773))：在心理健康场景中做对抗训练（Simulator vs Discriminator 竞争），专门针对对话系统失效模式

---

## 二、工业界做法

### Anthropic
在 [Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents) 中明确：对话型 Agent 用「第二个 LLM 扮演 User」做多轮压测，对齐审计场景用于「通过对抗对话持续压测模型」。官方基准是 τ-bench 和 τ2-bench。

### Hamming AI（工业界语音 Agent 测试平台）
<https://hamming.ai/> 实现了 **1000 并发测试呼叫**，支持注入「打断（barge-in）、长沉默、背景噪音、高龄慢速说话者、情绪激动对话」，支持自定义 persona 的口音 / 语速 / 耐心等级。

**美团外呼场景最接近这个方向。**

### OpenAI Operator 红队
[ControlPlane 案例](https://control-plane.io/case-studies/openai-red-teaming/)：真实红队人员在模拟桌面环境操作，测试 prompt injection、Agent 合规性边界，实时反馈直接推动模型层面的拒绝机制部署。

---

## 三、注入真实人类行为：具体 Prompt 模式

基于上述论文提炼的可操作模板：

### 打断
在系统提示中加：
```
When the agent pauses or uses filler words, immediately interrupt with your own question or complaint.
```

### 敷衍 / 信息模糊
用 few-shot 样例做风格迁移，参考 2509.23124 的 Incomplete Utterance 注入 —— 给 Simulator 5 条真实碎片化对话样例，指令：
```
Reply in extremely brief, incomplete sentences. Never give all required info in one turn.
```

### 情绪激动
用概率性触发：
```
If the agent has failed to resolve the issue after N turns, escalate to frustrated or hostile language. Include threats to escalate or hang up.
```

### 绕话题
从 Persona Hub 采样一个具体人格，加指令：
```
Every 2-3 turns, digress to a tangential topic unrelated to the main task (personal complaints, weather, random questions).
```

### 撒谎 / 矛盾信息
```
You may intentionally provide incorrect order numbers or deny information you gave earlier. Change your story if pressed.
```

### 行为采样策略
**不要固定单一行为**，用随机采样（每轮按概率分布抽取行为类型）+ 状态机（根据 Agent 失败次数动态升级对抗烈度）。

---

## 四、Simulator 质量的 Meta-Evaluation

**核心问题：Simulator 自己是否真实？**

### 关键论文：Lost in Simulation

[arXiv 2601.17087](https://arxiv.org/abs/2601.17087) 是目前最严格的 meta-evaluation 研究，用 451 名真实参与者跑 τ-bench 任务，对比 31 个 LLM Simulator，发现：

- Simulator 系统性错误校准：难题低估 Agent 能力，中等难度高估
- 引入「User-Sim Index（USI）」量化 Simulator 与真实用户行为分布的相似度
- 非标准英语（AAVE、印度英语）说话者的 Simulator 误差最大

### Mind the Sim2Real Gap

[arXiv 2603.11245](https://arxiv.org/abs/2603.11245) 给出具体度量框架：
- KL 散度（模拟行为分布 vs 真实行为分布）
- 多维度质量评分（不只看成功率）

### 过拟合 Challenge 的防范

Simulator 本身需要独立测试集评估，**与被测 Agent 开发过程解耦**。2509.23124 用 human evaluation 做「~70% 偏好率」的真实性校验，而不是只看 Agent 失败率。

---

## 五、美团骑手外呼场景：5 个 Persona 模板

基于上述方法论，为美团骑手外呼场景设计：

| Persona | 核心行为模式 | 注入机制 |
|---|---|---|
| **急单骑手（时间压力型）** | 接电话立刻打断：「说快点我要接单」，每轮只给 3-5 字回答，第 2 轮后直接说「行了知道了」想挂电话 | Impatience + Incomplete Utterance 组合，Turn 1 即触发 |
| **信息矛盾型** | 先说「我没接到通知」，再说「我早就看到了」，订单号报错，被追问时否认 | 撒谎 / 矛盾信息注入，每隔 2 轮翻供一次 |
| **绕话题骑手** | 聊到一半跑去抱怨平台押金、发单不公平、收入下降，不正面回答核心问题 | Tangential 注入，从 Persona Hub 抽「有抱怨情绪的基层工人」人设 |
| **情绪激动型** | 一开始还算正常，Agent 稍有重复或说「稍等」立刻怒：「你们就会说稍等！」，第 3 次失败后直接骂人 | Impatience 状态机，失败计数器驱动，Turn 3+ 激活高强度情绪 |
| **低理解力用户** | 回答「啊？」「什么意思」「我不知道啊」，无法理解专业术语（如「差评申诉」），需要反复解释，每次解释后仍问错问题 | Incomplete Utterance + Unavailable Service（请求解释 Agent 不应提供的事项） |

---

## 关键工程结论

1. 单纯写「请表现得不配合」的 system prompt **效果很差**，需要**行为分类 + 状态机触发 + few-shot 样例**三层组合（来源：2509.23124）
2. Simulator 必须保留「任务目标完整性」—— 它要不配合，但**不能让任务根本无法完成**，否则测不出 Agent 真正的处理能力
3. **美团场景 P0**：用真实骑手通话录音（脱敏后）做 few-shot 样例给 Simulator，比用学术数据集注入的行为更符合口语习惯

---

## Sources

- [Non-Collaborative User Simulators for Tool Agents (arXiv 2509.23124)](https://arxiv.org/abs/2509.23124)
- [ChatChecker (arXiv 2507.16792)](https://arxiv.org/abs/2507.16792)
- [τ-bench (arXiv 2406.12045)](https://arxiv.org/pdf/2406.12045)
- [Lost in Simulation (arXiv 2601.17087)](https://arxiv.org/abs/2601.17087)
- [Mind the Sim2Real Gap (arXiv 2603.11245)](https://arxiv.org/abs/2603.11245)
- [Anthropic: Demystifying Evals for AI Agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [DIAL adversarial training (arXiv 2512.20773)](https://arxiv.org/abs/2512.20773)
- [Hamming AI voice agent testing](https://hamming.ai/)
- [OpenAI Red Teaming case study](https://control-plane.io/case-studies/openai-red-teaming/)
- [Reliable LLM-based User Simulator (arXiv 2402.13374)](https://arxiv.org/abs/2402.13374)
