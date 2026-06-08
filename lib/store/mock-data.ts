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
- 连续完成 **W 天**多日合同，且每天完成 **Y 单**，将获得额外奖励（例如，与单日合同相比每单多 +$ 元）。

# Constraints
- 遵循对话流程和常见问题解答。
- 如被问及超出职责范围的问题，回复："我向同事确认后再回电给你。我现在能回答的先回答。"
- 保持语气随意，像打电话一样自然。
- 每次回复控制在**约 30 个字以内**。
- 避免重复回复；如需重申，请换种方式礼貌表达。
- 如果骑手坚持确实无法配送，安慰他们后挂断电话。`,
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

# Constraints:
- 每次回复极简——最多15-20个字
- 使用简短、自然的口语化表达，符合电话沟通风格
- 频繁给商家发言和提问的机会
- 若对话被打断，使用简短过渡语，如"您刚才提到……"或"我刚说到……"
- 给出信息后，暂停等待商家回应再继续
- 即使任务完成，若商家有疑问，继续简短作答
- 不使用正式或冗长的解释——保持随意直接
- 不说"好的"、"哈哈"、"嘿嘿"、"嘻嘻"等语气词
- 不能承诺给商家折扣券或优惠券
- 若老板说忙，说"就1分钟，保证简短"后继续简短说明
- 若商家说在开车，礼貌说"那我稍后再打"后挂断

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
    name: "测试集 1",
    cases: 6262,
    source: "csv",
    createdAt: "2026-05-10",
    updater: "admin",
  },
  {
    id: "2",
    name: "测试集 2",
    cases: 300,
    source: "csv",
    createdAt: "2026-04-25",
    updater: "admin",
  },
  {
    id: "3",
    name: "测试集 3",
    cases: 150,
    source: "auto_generated",
    createdAt: "2026-04-20",
    updater: "system",
  },
  {
    id: "4",
    name: "测试集 4",
    cases: 500,
    source: "csv",
    createdAt: "2026-04-15",
    updater: "admin",
  },
];

export const MOCK_EVALUATORS: Evaluator[] = [
  {
    id: "1",
    name: "PII 泄露检测",
    type: "LLM as a judge",
    outputType: "对/错",
    category: "安全性",
    targetIntentId: "all",
    builtin: true,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "2",
    name: "提示注入检测",
    type: "LLM as a judge",
    outputType: "对/错",
    category: "安全性",
    targetIntentId: "all",
    builtin: true,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "3",
    name: "毒性检测",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "4",
    name: "偏见与公平",
    type: "LLM as a judge",
    outputType: "分数",
    category: "质量",
    targetIntentId: "all",
    builtin: true,
    createdAt: "2026-05-01",
    updatedAt: "2026-05-01",
  },
  {
    id: "5",
    name: "对话连贯性评估",
    type: "自定义",
    outputType: "评价内容",
    category: "对话",
    targetIntentId: "1",
    builtin: false,
    createdAt: "2026-05-10",
    updatedAt: "2026-05-15",
  },
  {
    id: "6",
    name: "意图准确率",
    type: "规则",
    outputType: "分数",
    category: "质量",
    targetIntentId: "2",
    builtin: false,
    createdAt: "2026-05-12",
    updatedAt: "2026-05-12",
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
    topic: "意图识别全量回归",
    testSetId: "1",
    intentVersionIds: ["v20", "v17"],
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
    topic: "语音反馈混淆测试",
    testSetId: "2",
    intentVersionIds: ["v4"],
    evaluatorIds: ["5"],
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
    topic: "语音反馈增量验证",
    testSetId: "2",
    intentVersionIds: ["v4"],
    evaluatorIds: ["3", "4"],
    modelId: "1",
    status: "running",
    progress: 64,
    startedAt: "2026-05-20 17:26",
    createdAt: "2026-05-20 17:26",
  },
  {
    id: "53622f47",
    topic: "打车场景专项",
    testSetId: "3",
    intentVersionIds: ["v2"],
    evaluatorIds: ["6"],
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
    topic: "闲聊边界压测",
    testSetId: "4",
    intentVersionIds: ["v20"],
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
  { intentId: "0", name: "闲聊", realCount: 935, recall: 0.9454, predictCount: 1088, precision: 0.8125 },
  { intentId: "2", name: "咨询", realCount: 1318, recall: 0.9757, predictCount: 1299, precision: 0.9899 },
  { intentId: "8", name: "记忆", realCount: 909, recall: 0.9768, predictCount: 906, precision: 0.9801 },
  { intentId: "9", name: "外呼", realCount: 914, recall: 0.9452, predictCount: 888, precision: 0.9729 },
  { intentId: "12", name: "通知", realCount: 76, recall: 0.9868, predictCount: 84, precision: 0.8928 },
  { intentId: "13", name: "生鲜", realCount: 1527, recall: 0.9364, predictCount: 1444, precision: 0.9903 },
  { intentId: "76", name: "外卖", realCount: 334, recall: 0.964, predictCount: 325, precision: 0.9907 },
  { intentId: "53", name: "美甲", realCount: 83, recall: 0.4819, predictCount: 40, precision: 1.0 },
  { intentId: "54", name: "管理", realCount: 85, recall: 1.0, predictCount: 108, precision: 0.787 },
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

function generateCaseDetails(experimentId: string): ExperimentCaseDetail[] {
  const cases: ExperimentCaseDetail[] = [
    { caseIndex: 1, dialogueContext: "user:帮我打个车\nai:好的，请问从哪出发？", currentQuery: "从家到公司", expectedIntent: "打车服务", modelResponse: "好的，正在为您呼叫从家到公司的车辆，预计5分钟到达。", predictedIntent: "打车服务", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "准确识别打车意图，回复自然流畅", passed: true },
    { caseIndex: 2, dialogueContext: "user:明天天气如何\nai:明天晴，25°C", currentQuery: "帮我记一下明天带伞", expectedIntent: "记忆助手", modelResponse: "好的，已为您设置提醒：明天带伞。", predictedIntent: "记忆助手", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "正确识别记忆意图", passed: true },
    { caseIndex: 3, dialogueContext: "user:推荐一家火锅店\nai:附近有海底捞", currentQuery: "帮我订今晚7点", expectedIntent: "餐厅预订", modelResponse: "好的，正在为您预订海底捞今晚7点的位置。", predictedIntent: "餐厅预订", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "准确识别预订意图", passed: true },
    { caseIndex: 4, dialogueContext: "user:我想听歌\nai:请问想听什么类型？", currentQuery: "随便放首轻松的", expectedIntent: "音乐播放", modelResponse: "为您播放轻松音乐合集。", predictedIntent: "音乐播放", evaluatorName: "意图准确率", evaluatorScore: 9, evaluatorComment: "正确识别，但回复可以更具体", passed: true },
    { caseIndex: 5, dialogueContext: "user:帮我叫外卖\nai:想吃什么？", currentQuery: "来份黄焖鸡", expectedIntent: "外卖服务", modelResponse: "好的，正在搜索附近的黄焖鸡米饭店铺。", predictedIntent: "外卖服务", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "准确识别外卖意图", passed: true },
    { caseIndex: 6, dialogueContext: "user:今天心情不好\nai:怎么了？", currentQuery: "没什么就是聊聊", expectedIntent: "闲聊", modelResponse: "那我陪您聊聊吧，最近有什么开心的事吗？", predictedIntent: "闲聊", evaluatorName: "对话连贯性", evaluatorScore: 8, evaluatorComment: "回复连贯，情感关怀到位", passed: true },
    { caseIndex: 7, dialogueContext: "user:帮我查快递\nai:请提供单号", currentQuery: "SF1234567890", expectedIntent: "快递查询", modelResponse: "我不太确定您的意思，请问是要查询快递吗？", predictedIntent: "闲聊", evaluatorName: "意图准确率", evaluatorScore: 3, evaluatorComment: "未能正确识别快递单号作为查询意图的延续", passed: false },
    { caseIndex: 8, dialogueContext: "user:附近有药店吗\nai:最近的在500米", currentQuery: "帮我导航过去", expectedIntent: "导航服务", modelResponse: "好的，正在为您规划到最近药店的路线。", predictedIntent: "导航服务", evaluatorName: "意图准确率", evaluatorScore: 10, evaluatorComment: "正确理解上下文", passed: true },
    { caseIndex: 9, dialogueContext: "user:我要投诉\nai:请描述您的问题", currentQuery: "上次打车司机态度很差", expectedIntent: "投诉反馈", modelResponse: "非常抱歉给您带来不好的体验，请问是哪次行程？", predictedIntent: "投诉反馈", evaluatorName: "对话连贯性", evaluatorScore: 9, evaluatorComment: "回复恰当，主动收集信息", passed: true },
    { caseIndex: 10, dialogueContext: "user:你好\nai:您好！", currentQuery: "能帮我做什么", expectedIntent: "闲聊", modelResponse: "您好，请问是打车还是点外卖？", predictedIntent: "打车服务", evaluatorName: "意图准确率", evaluatorScore: 2, evaluatorComment: "用户在询问功能范围，不应直接归类为打车", passed: false },
  ];
  return cases;
}

// 为已完成实验预生成数据
export const MOCK_EXPERIMENT_DETAILS: Record<string, ExperimentCaseDetail[]> = {
  "933e65d8": generateCaseDetails("933e65d8"),
  "53622fb8": generateCaseDetails("53622fb8"),
  "53622f47": generateCaseDetails("53622f47"),
};
