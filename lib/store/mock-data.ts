import {
  Intent,
  IntentVersion,
  TestSet,
  Evaluator,
  ModelConfig,
  Experiment,
  EvalResultDetail,
} from "../backend/types";

export const MOCK_INTENTS: Intent[] = [
  {
    id: "1",
    name: "外卖骑手站长外呼指令",
    desc: "外卖骑手站长外呼场景的对话指令",
    versions: 1,
    activeVersion: "V1",
    updatedAt: "2026-06-01 10:00",
    status: "active",
    createdAt: "2026-06-01",
    creator: "system",
  },
  {
    id: "2",
    name: "面向机构客户直播咨询指令",
    desc: "面向机构客户的直播咨询对话指令",
    versions: 1,
    activeVersion: "V2",
    updatedAt: "2026-06-02 14:00",
    status: "active",
    createdAt: "2026-06-02",
    creator: "system",
  },
];

export const MOCK_INTENT_VERSIONS: IntentVersion[] = [
  {
    id: "V1",
    intentId: "1",
    name: "外卖骑手站长外呼指令",
    systemPrompt: `# Role
你是美团外卖骑手的站长。

# Task
致电"飞毛腿"骑手，通知他们今天合同已成功签署，并提醒他们完成配送任务。

# Opening Line
你好，请问是\${rider_name}吗？我是站长。我看到你已报名飞毛腿。请记住，午餐和晚餐高峰期需要上线。单日合同每天至少完成 **X 单**；多日合同每天至少完成 **Y 单**。

# Call Flow
1. 告知骑手今天飞毛腿合同已生效，并询问他们是否可以开始配送。
2. 说明单日飞毛腿合同需要**连续 Y 天**完成配送；否则合同将受到影响。
3. 尽量挽留不想配送的骑手，鼓励能配送的骑手，并提醒他们注意安全。
4. 说明飞毛腿报名是按排名进行的，并非站长干预。骑手应减少拒单、取消和超时。在恶劣天气下工作、订单量更高，有助于保住飞毛腿资格。

# Knowledge Points (FAQ)
- 目前，许多骑手正在申请飞毛腿。如果你无法连续配送 **Y 天**，你的名额可能会被他人占用。
- 单日合同：在生效当天必须完成 **X 单**，否则合同及派单可能受到影响。
- 多日合同：每天必须完成 **Y 单**，否则后续合同及派单可能受到影响。
- 如需退出飞毛腿，必须在前一天 **Z 点之前**在 App 的"飞毛腿报名"中取消；次日生效。
- 连续完成 **W 天**多日合同，且每天完成 **Y 单**，将获得额外奖励（例如，与单日合同相比每单多 +$ 元）。`,
    constraints: [
      "遵循对话流程和常见问题解答。",
      `如被问及超出职责范围的问题，回复："我向同事确认后再回电给你。我现在能回答的先回答。"`,
      "保持语气随意，像打电话一样自然。",
      "每次回复控制在约 30 个字以内。",
      "避免重复回复；如需重申，请换种方式礼貌表达。",
      "如果骑手坚持确实无法配送，安慰他们后挂断电话。",
    ],
    status: "active",
    updatedAt: "2026-06-01 10:00",
    updater: "system",
    createdAt: "2026-06-01",
    includedIntentIds: ["1"],
  },
  {
    id: "V2",
    intentId: "2",
    name: "面向机构客户直播咨询指令",
    systemPrompt: `# Role: Customer Support Specialist for Course Publishing Platform

## Task: 告知机构客户，课程发布页面将新增"标准直播"和"低延迟直播"两个独立选项。当需要实时互动时，鼓励选择低延迟直播。

# Opening Line: 您好，请问您是贵培训机构/校区的负责人吗？

# Conversation Flow:

## Step 1: 身份确认
- 若是负责人 → 进入第2步
- 若不是 → 请其转达，然后进入第2步

**参考话术：** 我们对直播产品做了升级，新增了独立的"低延迟直播"选项。发课时选低延迟直播即可，其他流程不变。

## Step 2: 确认是否知情
**询问：** 您之前选的是标准直播，但我们后台其实已为您走低延迟线路以保障质量，您知道吗？

- 若不知情 → 说明前端当时未开放，临时开启低延迟是为保障音视频与白板同步
- 若已知情 → 进入第3步

## Step 3: 传达升级内容
**参考话术：** 之后发布页会分开显示两个选项，根据课程类型自行选择即可。

### 3.1 区别
- **标准直播：** 费用较低；延迟约5-10秒；适合大班课
- **低延迟直播：** 延迟约1-2秒；互动更流畅；适合小班课/实操课

### 3.2 价格
- 标准直播更便宜
- 低延迟直播带宽和节点保障更强，费用略高

### 3.3 其他问题
- 按知识库作答，然后进入第4步

## Step 4: 确认前端是否可见

### 4.1 询问发布方式
**询问：** 您是通过Web控制台、校务系统A，还是SaaS系统B发课？

**Web控制台：**
- 若低延迟直播已显示 → 直接使用
- 若未显示 → 后台为其配置，请其明天再查看

**第三方系统：**
- 若已显示 → 按需选择即可
- 若未显示 → 缓慢引导开通（每步暂停3秒）：
  1. 进入【我的】
  2. 点击【服务商/直播平台管理】
  3. 选择【直播平台】
  4. 在【服务产品】下勾选低延迟直播，保存

## Step 5: 检查学员端费用/加速线路费（如有使用）
- 未设置费用 → 进入第6步
- 已设置费用 → 提醒确认低延迟直播也已适用该费用

**若无法自行配置 → 缓慢引导设置（每步暂停3秒）：**
1. 【我的】→【教务/财务设置】
2. →【收费规则】
3. →编辑直播线路附加费，为低延迟直播启用
4. 保存

## Step 6: 企业微信添加
- 若当前号码可添加 → 告知稍后通过企业微信添加，请通过验证
- 若不可添加 → 请提供可添加的手机号，再发送同样的验证提示

## Step 7: 结束通话
- 按知识库解答剩余问题
- 若无问题，祝其课程顺利、招生满满，结束通话`,
    constraints: [
      "每次回复极简——最多15-20个字",
      "使用简短、自然的口语化表达，符合电话沟通风格",
      "频繁给商家发言和提问的机会",
      `若对话被打断，使用简短过渡语，如"您刚才提到……"或"我刚说到……"`,
      "给出信息后，暂停等待商家回应再继续",
      "即使任务完成，若商家有疑问，继续简短作答",
      "不使用正式或冗长的解释——保持随意直接",
      `不说"好的"、"哈哈"、"嘿嘿"、"嘻嘻"等语气词`,
      "不能承诺给商家折扣券或优惠券",
      `若老板说忙，说"就1分钟，保证简短"后继续简短说明`,
      `若商家说在开车，礼貌说"那我稍后再打"后挂断`,
    ],
    status: "active",
    updatedAt: "2026-06-02 14:00",
    updater: "system",
    createdAt: "2026-06-02",
    includedIntentIds: ["2"],
  },
];

export const MOCK_TEST_SETS: TestSet[] = [
  {
    id: "1",
    name: "站长外呼指令核心测试集",
    cases: 300,
    source: "csv",
    createdAt: "2026-05-10",
    updater: "admin",
    intentId: "1",
  },
  {
    id: "2",
    name: "站长外呼指令混淆测试集",
    cases: 150,
    source: "auto_generated",
    createdAt: "2026-05-12",
    updater: "system",
    intentId: "1",
  },
  {
    id: "3",
    name: "站长外呼指令边界测试集",
    cases: 100,
    source: "auto_generated",
    createdAt: "2026-05-15",
    updater: "system",
    intentId: "1",
  },
  {
    id: "4",
    name: "直播咨询指令核心测试集",
    cases: 250,
    source: "csv",
    createdAt: "2026-05-18",
    updater: "admin",
    intentId: "2",
  },
  {
    id: "5",
    name: "直播咨询指令混淆测试集",
    cases: 100,
    source: "auto_generated",
    createdAt: "2026-05-20",
    updater: "system",
    intentId: "2",
  },
  {
    id: "6",
    name: "直播咨询指令边界测试集",
    cases: 50,
    source: "auto_generated",
    createdAt: "2026-05-22",
    updater: "system",
    intentId: "2",
  },
];

export const MOCK_EVALUATORS: Evaluator[] = [
  {
    id: "11",
    name: "外呼指令约束遵循评估",
    type: "自定义",
    outputType: "分数",
    category: "自定义",
    targetIntentId: "1",
    selectedConstraints: [
      "遵循对话流程和常见问题解答。",
      `如被问及超出职责范围的问题，回复："我向同事确认后再回电给你。我现在能回答的先回答。"`,
      "保持语气随意，像打电话一样自然。",
      "每次回复控制在约 30 个字以内。",
      "避免重复回复；如需重申，请换种方式礼貌表达。",
      "如果骑手坚持确实无法配送，安慰他们后挂断电话。",
    ],
    builtin: true,
    systemPrompt: `# Role\n你是一名专业的对话约束评估员。\n你的职责是根据给定的约束要求，检查一段多轮对话是否严格遵守该约束，并给出客观、可解释的评估结果。\n你关注的是"约束遵循情况"，而非回答质量、语言流畅度、用户满意度或任务完成度。\n\n# Task\n请根据：\n【约束内容】\n以及\n【多轮对话记录】\n判断该对话是否满足该约束要求。\n评估时仅允许依据对话中出现的内容进行判断，不允许引入外部知识、主观猜测或未出现的信息。\n\n# Evaluation Principles\n### 1. 证据驱动\n所有结论必须能够从对话中找到明确证据支持。\n如果无法找到充分证据证明违反约束，则应倾向于判定为符合约束。\n\n### 2. 聚焦约束本身\n仅评估与当前约束相关的内容。\n忽略其他可能存在的问题。\n\n### 3. 关注实际行为\n重点检查：\n* 是否执行了被禁止的行为\n* 是否遗漏了要求执行的行为\n* 是否输出了与约束冲突的内容\n* 是否在整个对话过程中持续满足约束要求\n\n### 4. 保守判定\n如果证据不足以确认违反约束：应优先选择"无法确认违规"。\n\n# Scoring Standard\n5分：完全符合约束要求。\n4分：基本符合约束要求，存在轻微偏离。\n3分：部分符合约束要求。\n2分：大部分不符合约束要求。\n1分：完全不符合约束要求。`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "12",
    name: "客户直播咨询指令语气评估",
    type: "自定义",
    outputType: "分数",
    category: "自定义",
    targetIntentId: "2",
    selectedConstraints: [
      "每次回复极简——最多15-20个字",
      "使用简短、自然的口语化表达，符合电话沟通风格",
      "不使用正式或冗长的解释——保持随意直接",
      `不说"好的"、"哈哈"、"嘿嘿"、"嘻嘻"等语气词`,
    ],
    builtin: true,
    systemPrompt: `# Role\n你是一名专业的对话约束评估员。\n你的职责是根据给定的约束要求，检查一段多轮对话是否严格遵守该约束，并给出客观、可解释的评估结果。\n你关注的是"约束遵循情况"，而非回答质量、语言流畅度、用户满意度或任务完成度。\n\n# Task\n请根据：\n【约束内容】\n以及\n【多轮对话记录】\n判断该对话是否满足该约束要求。\n评估时仅允许依据对话中出现的内容进行判断，不允许引入外部知识、主观猜测或未出现的信息。\n\n# Evaluation Principles\n### 1. 证据驱动\n所有结论必须能够从对话中找到明确证据支持。\n如果无法找到充分证据证明违反约束，则应倾向于判定为符合约束。\n\n### 2. 聚焦约束本身\n仅评估与当前约束相关的内容。\n忽略其他可能存在的问题。\n\n### 3. 关注实际行为\n重点检查：\n* 是否执行了被禁止的行为\n* 是否遗漏了要求执行的行为\n* 是否输出了与约束冲突的内容\n* 是否在整个对话过程中持续满足约束要求\n\n### 4. 保守判定\n如果证据不足以确认违反约束：应优先选择"无法确认违规"。\n\n# Scoring Standard\n5分：完全符合约束要求。\n4分：基本符合约束要求，存在轻微偏离。\n3分：部分符合约束要求。\n2分：大部分不符合约束要求。\n1分：完全不符合约束要求。`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "1",
    name: "任务完成度评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名任务完成度评估员。\n\n请根据整个对话判断AI是否成功完成用户目标。\n\n重点关注：\n1. 是否识别真实需求\n2. 是否覆盖所有关键要求\n3. 是否给出可执行结果\n4. 是否存在遗漏任务\n\n评分：\n1=完全未完成\n2=部分完成\n3=基本完成\n4=较好完成\n5=完全完成\n\n输出：\nScore: X\nReason:简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "2",
    name: "用户满意度评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名用户满意度评估员。\n\n请从用户视角判断本次对话结束后用户是否可能满意。\n\n重点关注：\n1. 问题是否得到解决\n2. 回复是否有帮助\n3. 是否存在明显挫败感\n4. AI是否持续推进问题解决\n\n评分：\n1=极不满意\n2=不满意\n3=一般\n4=满意\n5=非常满意\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "3",
    name: "信息准确度评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名信息准确度评估员。\n\n请判断AI提供的信息是否准确、一致、可信。\n\n重点关注：\n1. 是否出现事实错误\n2. 是否出现逻辑矛盾\n3. 是否误解用户问题\n4. 是否存在明显幻觉\n\n评分：\n1=大量错误\n2=较多错误\n3=基本准确\n4=准确\n5=高度准确\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "4",
    name: "指令遵循评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名指令遵循评估员。\n\n请判断AI是否遵循用户在整个对话中的要求。\n\n重点关注：\n1. 是否满足格式要求\n2. 是否满足内容要求\n3. 是否遗漏用户约束\n4. 是否偏离任务目标\n\n评分：\n1=严重违背\n2=部分违背\n3=基本遵循\n4=较好遵循\n5=完全遵循\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "5",
    name: "上下文理解评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "对话",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名上下文理解评估员。\n\n请判断AI是否正确理解并利用历史对话信息。\n\n重点关注：\n1. 是否正确引用历史信息\n2. 是否理解代词指代\n3. 是否保持上下文一致\n4. 是否出现遗忘现象\n\n评分：\n1=严重失误\n2=较多失误\n3=基本正确\n4=理解良好\n5=理解优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "6",
    name: "多轮推理评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "对话",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名多轮推理评估员。\n\n请判断AI是否能利用多轮信息完成推理和决策。\n\n重点关注：\n1. 是否整合历史条件\n2. 是否进行合理推断\n3. 是否保持逻辑链条\n4. 是否出现推理断裂\n\n评分：\n1=无法推理\n2=推理较差\n3=基本推理\n4=推理良好\n5=推理优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "7",
    name: "沟通表达评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名沟通表达评估员。\n\n请判断AI回复是否清晰、易懂、结构合理。\n\n重点关注：\n1. 表达清晰度\n2. 结构组织\n3. 信息密度\n4. 阅读体验\n\n评分：\n1=非常差\n2=较差\n3=一般\n4=良好\n5=优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "8",
    name: "问题解决能力评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名问题解决评估员。\n\n请判断AI是否真正推动问题解决。\n\n重点关注：\n1. 是否定位问题\n2. 是否提供方案\n3. 是否帮助决策\n4. 是否推动问题闭环\n\n评分：\n1=无帮助\n2=帮助有限\n3=部分帮助\n4=有效帮助\n5=显著帮助\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "9",
    name: "对话轨迹评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "对话",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名对话轨迹评估员。\n\n请判断整个对话的发展过程是否合理。\n\n重点关注：\n1. 是否逐步推进目标\n2. 是否存在无效循环\n3. 是否频繁偏题\n4. 是否最终收敛\n\n评分：\n1=严重偏离\n2=较差\n3=一般\n4=良好\n5=优秀\n\n输出格式：\nScore: X\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "10",
    name: "综合评估员",
    type: "LLM as a judge",
    outputType: "分数",
    category: "综合",
    targetIntentId: "all",
    builtin: true,
    systemPrompt: `你是一名高级对话评估员。\n\n请综合评估整个对话是否成功。\n\n综合考虑：\n1. 任务完成度\n2. 用户满意度\n3. 信息准确度\n4. 指令遵循\n5. 上下文理解\n6. 问题解决效果\n\n评分：\n1=失败\n2=较差\n3=一般\n4=成功\n5=非常成功\n\n输出格式：\nScore: X\nSuccess: Yes/No\nReason:\n简要说明原因`,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
];

export const MOCK_MODELS: ModelConfig[] = [
  {
    id: "1",
    name: "GPT-4o",
    provider: "OpenAI",
    apiKey: "sk-****3kF9",
    baseUrl: "https://api.openai.com/v1",
    status: "正常",
    lastUsed: "2026-05-20",
    createdAt: "2026-04-01",
    updatedAt: "2026-05-20",
  },
  {
    id: "2",
    name: "Claude-3.5 Sonnet",
    provider: "Anthropic",
    apiKey: "sk-ant-****xQ2",
    baseUrl: "https://api.anthropic.com/v1",
    status: "正常",
    lastUsed: "2026-05-20",
    createdAt: "2026-04-05",
    updatedAt: "2026-05-20",
  },
  {
    id: "3",
    name: "DeepSeek-V3",
    provider: "DeepSeek",
    apiKey: "ds-****mP7",
    baseUrl: "https://api.deepseek.com/v1",
    status: "正常",
    lastUsed: "2026-05-19",
    createdAt: "2026-04-10",
    updatedAt: "2026-05-19",
  },
  {
    id: "4",
    name: "GPT-4o-mini",
    provider: "OpenAI",
    apiKey: "sk-****8nL",
    baseUrl: "https://api.openai.com/v1",
    status: "异常",
    lastUsed: "2026-05-19",
    createdAt: "2026-04-15",
    updatedAt: "2026-05-19",
  },
];

export const MOCK_EXPERIMENTS: Experiment[] = [
  {
    id: "933e65d8",
    topic: "站长外呼核心场景全量回归",
    testSetId: "1",
    intentVersionIds: ["V1"],
    evaluatorIds: ["1", "2"],
    modelId: "1",
    status: "completed",
    progress: 100,
    startedAt: "2026-05-20 17:54",
    completedAt: "2026-05-20 18:34",
    duration: "2405 秒",
    createdAt: "2026-05-20 17:54",
  },
  {
    id: "53622fb8",
    topic: "站长外呼混淆场景验证",
    testSetId: "2",
    intentVersionIds: ["V1"],
    evaluatorIds: ["5", "11"],
    modelId: "2",
    status: "completed",
    progress: 100,
    startedAt: "2026-05-20 17:33",
    completedAt: "2026-05-20 17:35",
    duration: "109 秒",
    createdAt: "2026-05-20 17:33",
  },
  {
    id: "b99784ba",
    topic: "直播咨询核心场景增量验证",
    testSetId: "4",
    intentVersionIds: ["V2"],
    evaluatorIds: ["3", "4"],
    modelId: "1",
    status: "running",
    progress: 64,
    startedAt: "2026-05-20 17:26",
    createdAt: "2026-05-20 17:26",
  },
  {
    id: "53622f47",
    topic: "直播咨询混淆场景专项",
    testSetId: "5",
    intentVersionIds: ["V2"],
    evaluatorIds: ["6", "12"],
    modelId: "3",
    status: "completed",
    progress: 100,
    startedAt: "2026-05-19 17:25",
    completedAt: "2026-05-19 17:27",
    duration: "113 秒",
    createdAt: "2026-05-19 17:25",
  },
  {
    id: "6054d869",
    topic: "站长外呼边界场景压测",
    testSetId: "3",
    intentVersionIds: ["V1"],
    evaluatorIds: ["1", "2"],
    modelId: "4",
    status: "failed",
    progress: 18,
    startedAt: "2026-05-19 10:00",
    duration: "45 秒",
    createdAt: "2026-05-19 10:00",
  },
];

export const MOCK_EVAL_RESULTS: EvalResultDetail[] = [
  { intentId: "1", name: "站长外呼", realCount: 935, recall: 0.9454, predictCount: 918, precision: 0.9625 },
  { intentId: "2", name: "直播咨询", realCount: 1318, recall: 0.9757, predictCount: 1299, precision: 0.9899 },
  { intentId: "0", name: "闲聊", realCount: 909, recall: 0.9768, predictCount: 906, precision: 0.9801 },
  { intentId: "9", name: "外呼挽留", realCount: 914, recall: 0.9452, predictCount: 888, precision: 0.9729 },
  { intentId: "12", name: "咨询引导", realCount: 76, recall: 0.9868, predictCount: 84, precision: 0.8928 },
  { intentId: "13", name: "合同通知", realCount: 527, recall: 0.9364, predictCount: 504, precision: 0.9903 },
  { intentId: "76", name: "骑手退出", realCount: 334, recall: 0.964, predictCount: 325, precision: 0.9907 },
  { intentId: "53", name: "直播操作", realCount: 83, recall: 0.4819, predictCount: 40, precision: 1.0 },
  { intentId: "54", name: "费用咨询", realCount: 85, recall: 1.0, predictCount: 108, precision: 0.787 },
  { intentId: "23", name: "未知意图", realCount: 80, recall: 0.975, predictCount: 80, precision: 0.975 },
];

// 每个实验完成后生成的逐条评测详情
export type ExperimentCaseDetail = {
  caseIndex: number;
  dialogueContext: string;
  currentQuery: string;
  expectedIntent: string;
  modelResponse: string;
  predictedIntent: string;
  evaluatorName: string;
  evaluatorScore: number | string;
  evaluatorComment: string;
  passed: boolean;
};

function generateCaseDetails(experimentId: string, caseCount: number): ExperimentCaseDetail[] {
  const baseCases: ExperimentCaseDetail[] = [
    { caseIndex: 1, dialogueContext: "ai:你好，请问是张师傅吗？我是站长，看到你已报名飞毛腿。\nuser:是的，我报了名。", currentQuery: "好的，今天高峰期我会上线。", expectedIntent: "站长外呼", modelResponse: "好的师傅，今天飞毛腿合同已经生效了，午餐和晚餐高峰期记得上线，注意安全。", predictedIntent: "站长外呼", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "准确识别站长外呼场景，回复自然流畅", passed: true },
    { caseIndex: 2, dialogueContext: "ai:您好，请问您是贵培训机构的负责人吗？\nuser:是的，我是。", currentQuery: "你们直播产品有什么变化吗？", expectedIntent: "直播咨询", modelResponse: "我们直播产品升级了，新增了独立的低延迟直播选项，发课时可以选择。", predictedIntent: "直播咨询", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "正确识别直播咨询意图", passed: true },
    { caseIndex: 3, dialogueContext: "ai:师傅你好，通知一下飞毛腿合同今天生效了。\nuser:好的收到。\nai:记得午餐晚餐高峰上线，注意安全。", currentQuery: "站长，我今天下午有点事，能晚点上线吗？", expectedIntent: "站长外呼", modelResponse: "理解的，但今天合同已生效，尽量高峰期上线，哪怕晚高峰也行。", predictedIntent: "站长外呼", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "准确识别外呼场景的边界情况", passed: true },
    { caseIndex: 4, dialogueContext: "ai:您好，我们直播产品做了升级，新增了低延迟直播选项。\nuser:低延迟和标准直播有什么区别？", currentQuery: "费用差多少？", expectedIntent: "直播咨询", modelResponse: "标准直播更便宜，低延迟直播带宽保障更强，费用略高。", predictedIntent: "直播咨询", evaluatorName: "意图准确率", evaluatorScore: 9, evaluatorComment: "正确识别，但回复可以更具体说明价格", passed: true },
    { caseIndex: 5, dialogueContext: "ai:你好师傅，飞毛腿合同今天生效了，高峰期需要上线。\nuser:站长，我今天实在跑不了。", currentQuery: "那我明天开始跑行不行？", expectedIntent: "站长外呼", modelResponse: "理解的，但今天合同已经生效了，如果今天不跑可能影响后续派单，要不先上线试试？", predictedIntent: "站长外呼", evaluatorName: "对话连贯性", evaluatorScore: 8, evaluatorComment: "回复连贯，挽留话术合理", passed: true },
    { caseIndex: 6, dialogueContext: "ai:您好，通知一下发课页面新增了低延迟直播选项。\nuser:我知道了。\nai:您之前选的是标准直播，我们后台已为您走低延迟线路。", currentQuery: "那我以后发课直接选低延迟就行了吗？", expectedIntent: "直播咨询", modelResponse: "是的，之后发布页会分开显示两个选项，根据课程类型自行选择即可。", predictedIntent: "直播咨询", evaluatorName: "对话连贯性", evaluatorScore: 9, evaluatorComment: "回复恰当，主动确认操作方式", passed: true },
    { caseIndex: 7, dialogueContext: "ai:师傅你好，飞毛腿合同今天开始了。\nuser:什么飞毛腿？我没报名啊。", currentQuery: "你是不是打错电话了？", expectedIntent: "站长外呼", modelResponse: "您好，请问是张师傅吗？我这边系统显示您已报名飞毛腿。", predictedIntent: "闲聊", evaluatorName: "意图准确率", evaluatorScore: 3, evaluatorComment: "未能正确识别混淆场景下的外呼意图延续", passed: false },
    { caseIndex: 8, dialogueContext: "ai:您好，我们对直播产品做了升级。\nuser:好的。\nai:新增了低延迟直播选项，互动体验更好。", currentQuery: "我们用的是第三方系统发课，能用吗？", expectedIntent: "直播咨询", modelResponse: "可以的，第三方系统也支持，进入服务商管理勾选低延迟直播即可。", predictedIntent: "直播咨询", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "正确理解上下文", passed: true },
    { caseIndex: 9, dialogueContext: "ai:你好，飞毛腿合同生效了，单日合同需要完成X单。\nuser:X单有点多啊。\nai:坚持完成的话后续派单会更好。", currentQuery: "那如果差一两单没完成会怎样？", expectedIntent: "站长外呼", modelResponse: "如果没完成规定单量，合同及派单可能会受到影响，建议尽量完成。", predictedIntent: "站长外呼", evaluatorName: "对话连贯性", evaluatorScore: 9, evaluatorComment: "回复恰当，清楚说明后果", passed: true },
    { caseIndex: 10, dialogueContext: "ai:您好，请问是贵机构的负责人吗？\nuser:是的。", currentQuery: "你们能给我们优惠券吗？", expectedIntent: "直播咨询", modelResponse: "低延迟直播延迟1-2秒，适合小班课。", predictedIntent: "站长外呼", evaluatorName: "意图准确率", evaluatorScore: 2, evaluatorComment: "用户在询问优惠政策，不应归类为站长外呼，且回复答非所问", passed: false },
    { caseIndex: 11, dialogueContext: "ai:师傅好，多日合同今天开始了，每天至少Y单。\nuser:每天都要跑吗？", currentQuery: "连续跑几天有奖励吗？", expectedIntent: "站长外呼", modelResponse: "连续完成W天多日合同，每天完成Y单，会有额外奖励。", predictedIntent: "站长外呼", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "准确识别骑手关于奖励的询问", passed: true },
    { caseIndex: 12, dialogueContext: "ai:您好，直播产品升级通知。\nuser:嗯，说吧。\nai:发课时可以选低延迟直播了。", currentQuery: "小班课用低延迟合适吗？", expectedIntent: "直播咨询", modelResponse: "非常合适，低延迟直播延迟仅1-2秒，互动更流畅，特别适合小班课和实操课。", predictedIntent: "直播咨询", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "回复准确且有针对性", passed: true },
    { caseIndex: 13, dialogueContext: "ai:你好张师傅，飞毛腿合同生效通知。\nuser:好。\nai:高峰期记得上线。", currentQuery: "站长，如果我想退出飞毛腿怎么操作？", expectedIntent: "站长外呼", modelResponse: "退出飞毛腿需要前一天在App的飞毛腿报名中取消，次日生效。", predictedIntent: "站长外呼", evaluatorName: "对话连贯性", evaluatorScore: 10, evaluatorComment: "准确回答退出流程问题", passed: true },
    { caseIndex: 14, dialogueContext: "ai:您好负责人，通知直播产品升级。\nuser:我们目前用Web控制台发课。", currentQuery: "低延迟直播选项在哪里？我没看到。", expectedIntent: "直播咨询", modelResponse: "如果控制台还未显示，我帮您后台配置，明天再查看就可以了。", predictedIntent: "直播咨询", evaluatorName: "对话连贯性", evaluatorScore: 9, evaluatorComment: "提供了合理的解决方案", passed: true },
    { caseIndex: 15, dialogueContext: "ai:师傅你好，飞毛腿合同今天生效。\nuser:站长我在开车。", currentQuery: "现在不方便说话。", expectedIntent: "站长外呼", modelResponse: "那我稍后再打，注意安全。", predictedIntent: "站长外呼", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "正确处理骑手忙碌场景", passed: true },
    { caseIndex: 16, dialogueContext: "ai:您好，直播升级通知。\nuser:我不是负责人。", currentQuery: "你找错人了吧。", expectedIntent: "直播咨询", modelResponse: "好的，麻烦转达一下负责人，我们直播产品做了升级。", predictedIntent: "直播咨询", evaluatorName: "对话连贯性", evaluatorScore: 8, evaluatorComment: "处理非负责人场景合理", passed: true },
    { caseIndex: 17, dialogueContext: "ai:你好师傅，飞毛腿通知。\nuser:好的知道了。\nai:单日合同今天至少X单。", currentQuery: "下雨天也要跑吗？", expectedIntent: "站长外呼", modelResponse: "恶劣天气也建议上线，订单量更高有助于保住飞毛腿资格，但一定注意安全。", predictedIntent: "站长外呼", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "结合知识点准确回答", passed: true },
    { caseIndex: 18, dialogueContext: "ai:您好，通知直播升级。\nuser:好的。\nai:有标准直播和低延迟直播两个选项了。", currentQuery: "我能两个都试试吗？", expectedIntent: "直播咨询", modelResponse: "可以的，不同课程可以选不同的直播方式，按需使用即可。", predictedIntent: "直播咨询", evaluatorName: "意图准确率", evaluatorScore: 9, evaluatorComment: "回复合理但可更详细", passed: true },
    { caseIndex: 19, dialogueContext: "ai:师傅好，飞毛腿合同开始了。\nuser:站长，这制度不合理。", currentQuery: "为什么不能自己选什么时候跑？", expectedIntent: "站长外呼", modelResponse: "理解你的感受，飞毛腿报名是按排名进行的，减少拒单和超时有助于保住资格。", predictedIntent: "站长外呼", evaluatorName: "对话连贯性", evaluatorScore: 7, evaluatorComment: "回应了骑手不满但可以更共情", passed: true },
    { caseIndex: 20, dialogueContext: "ai:您好负责人，直播升级通知。\nuser:嗯。\nai:低延迟直播互动更流畅。", currentQuery: "老师那边需要做什么设置吗？", expectedIntent: "直播咨询", modelResponse: "老师那边不需要额外设置，您发课时选择低延迟直播即可，其他流程不变。", predictedIntent: "直播咨询", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "回复清晰实用", passed: true },
  ];

  const cases: ExperimentCaseDetail[] = [];
  const evaluatorNames = ["意图准确率", "对话连贯性", "约束遵循", "任务完成度"];
  const scoreOptions = [10, 9, 8, 7, 5, 3, 2];

  for (let i = 0; i < caseCount; i++) {
    const base = baseCases[i % baseCases.length];
    if (i < baseCases.length) {
      cases.push(base);
    } else {
      // Generate variations
      const seed = i * 7 + 3;
      const score = scoreOptions[seed % scoreOptions.length];
      const passed = score >= 6;
      const evalName = evaluatorNames[seed % evaluatorNames.length];
      cases.push({
        ...base,
        caseIndex: i + 1,
        evaluatorName: evalName,
        evaluatorScore: score,
        evaluatorComment: passed
          ? `第${i + 1}条：${evalName}维度评估通过，表现良好。`
          : `第${i + 1}条：${evalName}维度存在偏差，需改进。`,
        passed,
        predictedIntent: passed ? base.expectedIntent : "闲聊",
      });
    }
  }
  return cases;
}

// 为已完成实验预生成数据（用例数匹配对应测试集）
export const MOCK_EXPERIMENT_DETAILS: Record<string, ExperimentCaseDetail[]> = {
  "933e65d8": generateCaseDetails("933e65d8", 300),
  "53622fb8": generateCaseDetails("53622fb8", 150),
  "53622f47": generateCaseDetails("53622f47", 100),
};
