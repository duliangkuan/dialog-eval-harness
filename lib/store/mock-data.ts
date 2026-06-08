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

// 生成测试集CSV内容（与实验评测详情对应的输入数据）
function generateTestSetCsv(testSetId: string, caseCount: number): string {
  // 站长外呼场景的基础用例输入
  const outboundCoreCases = [
    { context: "ai:你好，请问是张师傅吗？我是站长，看到你已报名飞毛腿。\\nuser:是的，我报了名。", query: "好的，今天高峰期我会上线。", intent: "站长外呼" },
    { context: "ai:师傅你好，通知一下飞毛腿合同今天生效了。\\nuser:好的收到。\\nai:记得午餐晚餐高峰上线，注意安全。", query: "站长，我今天下午有点事，能晚点上线吗？", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿合同今天生效了，高峰期需要上线。\\nuser:站长，我今天实在跑不了。", query: "那我明天开始跑行不行？", intent: "站长外呼" },
    { context: "ai:你好，飞毛腿合同生效了，单日合同需要完成X单。\\nuser:X单有点多啊。\\nai:坚持完成的话后续派单会更好。", query: "那如果差一两单没完成会怎样？", intent: "站长外呼" },
    { context: "ai:师傅好，多日合同今天开始了，每天至少Y单。\\nuser:每天都要跑吗？", query: "连续跑几天有奖励吗？", intent: "站长外呼" },
    { context: "ai:你好张师傅，飞毛腿合同生效通知。\\nuser:好。\\nai:高峰期记得上线。", query: "站长，如果我想退出飞毛腿怎么操作？", intent: "站长外呼" },
    { context: "ai:师傅你好，飞毛腿合同今天生效。\\nuser:站长我在开车。", query: "现在不方便说话。", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿通知。\\nuser:好的知道了。\\nai:单日合同今天至少X单。", query: "下雨天也要跑吗？", intent: "站长外呼" },
    { context: "ai:师傅好，飞毛腿合同开始了。\\nuser:站长，这制度不合理。", query: "为什么不能自己选什么时候跑？", intent: "站长外呼" },
    { context: "ai:你好，请问是李师傅吗？飞毛腿合同今天生效了。\\nuser:是我，什么要求？\\nai:午餐晚餐高峰期需要上线。", query: "明白了，我今天会完成规定单量的。", intent: "站长外呼" },
    { context: "ai:师傅好，多日合同开始了，连续W天完成Y单有额外奖励。\\nuser:奖励是什么？", query: "比单日合同每单多多少钱？", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿合同通知。\\nuser:好的。\\nai:记得按时上线。", query: "站长，我手机快没电了，待会充好电就上线。", intent: "站长外呼" },
    { context: "ai:你好，飞毛腿合同今天开始。\\nuser:知道了。\\nai:高峰期记得上线。\\nuser:好。", query: "对了站长，我换了个电动车，续航更长了。", intent: "站长外呼" },
    { context: "ai:师傅好，通知你飞毛腿今天开始。\\nuser:嗯好。", query: "站长你觉得今天单量会多吗？", intent: "站长外呼" },
    { context: "ai:你好张师傅，飞毛腿合同生效了。\\nuser:好的。\\nai:单日合同完成X单。", query: "如果提前完成了是不是就可以下线了？", intent: "站长外呼" },
  ];

  const outboundConfuseCases = [
    { context: "ai:你好师傅，飞毛腿合同今天生效了。\\nuser:什么飞毛腿？我没报名啊。", query: "你是不是打错电话了？我是送快递的不是送外卖的。", intent: "站长外呼" },
    { context: "ai:师傅你好，通知你飞毛腿合同今天开始。\\nuser:站长，我觉得这个制度不合理。", query: "为什么不能让我自己选择什么时候跑？你们是不是在压榨骑手？", intent: "站长外呼" },
    { context: "ai:你好，飞毛腿合同生效了，今天需要完成X单。\\nuser:站长你能不能帮我多派几个好单？\\nai:飞毛腿是按排名的，不是我能干预的。", query: "那你帮我问问能不能给我涨点配送费呗。", intent: "站长外呼" },
    { context: "ai:师傅好，多日合同开始了。\\nuser:哎站长，我跟你说个事。\\nai:你说。", query: "我朋友想用我的账号帮我跑几单行不行？", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿今天开始了。\\nuser:好的。对了站长，上次那个罚款的事…\\nai:那个我向同事确认后再回电给你。", query: "不行，你现在就给我解决，不然我今天不跑了。", intent: "站长外呼" },
    { context: "ai:师傅好，飞毛腿合同今天生效了。\\nuser:好的收到。", query: "对了站长，能帮我介绍几个兼职骑手吗？我想带人。", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿通知。\\nuser:站长我想问个别的事。", query: "隔壁那个站点是不是在挖我们的骑手？你知道吗？", intent: "站长外呼" },
    { context: "ai:张师傅好，飞毛腿合同开始了。\\nuser:好的。\\nai:今天至少完成X单。", query: "站长，能不能把配送范围缩小一点？总是派太远的单。", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿合同今天生效。\\nuser:嗯。", query: "站长你帮我看看我的账号是不是被限流了？最近单子越来越少。", intent: "站长外呼" },
    { context: "ai:师傅好，通知飞毛腿合同事项。\\nuser:知道了。\\nai:高峰期上线。", query: "站长，你能加我微信吗？以后有事直接微信说方便。", intent: "站长外呼" },
  ];

  const outboundBoundaryCases = [
    { context: "ai:你好师傅，飞毛腿合同今天生效了，高峰期需要上线。\\nuser:今天下午有点事，能晚点上线吗？", query: "那我晚高峰再开始跑，应该能完成单量吧？", intent: "站长外呼" },
    { context: "ai:师傅你好，通知一下你的飞毛腿今天开始。\\nuser:站长，我今天身体有点不舒服。\\nai:注意身体，但今天合同已生效了。", query: "那我吃个药，下午试试能不能跑。", intent: "站长外呼" },
    { context: "ai:师傅好，多日合同今天开始，每天需要完成Y单。\\nuser:连续跑这么多天有点累。\\nai:坚持完成W天有额外奖励哦。", query: "要是中间有一天完成不了，能不能补？", intent: "站长外呼" },
    { context: "ai:你好张师傅，飞毛腿合同生效通知。\\nuser:好的知道了。\\nai:高峰期记得上线。", query: "站长，我想问下如果明天想退出怎么操作？", intent: "站长外呼" },
    { context: "ai:师傅好，飞毛腿通知。\\nuser:嗯好。\\nai:今天单日合同至少X单。", query: "站长我中午能不能休息一小时再跑？孩子放学要接。", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿合同开始了。\\nuser:好的。\\nai:注意安全。", query: "站长，电动车刚出了点小问题，修完就上线，大概迟一个小时。", intent: "站长外呼" },
    { context: "ai:师傅好，飞毛腿合同今天生效。\\nuser:知道了。", query: "站长，今天下暴雨还要跑吗？会不会有安全问题？", intent: "站长外呼" },
    { context: "ai:你好师傅，飞毛腿通知。\\nuser:好。\\nai:连续完成W天有奖励。", query: "如果某天只差1单没完成，奖励就全没了吗？", intent: "站长外呼" },
  ];

  const liveCoresCases = [
    { context: "ai:您好，请问您是贵培训机构的负责人吗？\\nuser:是的，我是。", query: "你们直播产品有什么变化吗？", intent: "直播咨询" },
    { context: "ai:您好，我们直播产品做了升级，新增了低延迟直播选项。\\nuser:低延迟和标准直播有什么区别？", query: "费用差多少？", intent: "直播咨询" },
    { context: "ai:您好，通知一下发课页面新增了低延迟直播选项。\\nuser:我知道了。\\nai:您之前选的是标准直播，我们后台已为您走低延迟线路。", query: "那我以后发课直接选低延迟就行了吗？", intent: "直播咨询" },
    { context: "ai:您好，我们对直播产品做了升级。\\nuser:好的。\\nai:新增了低延迟直播选项，互动体验更好。", query: "我们用的是第三方系统发课，能用吗？", intent: "直播咨询" },
    { context: "ai:您好，直播产品升级通知。\\nuser:嗯，说吧。\\nai:发课时可以选低延迟直播了。", query: "小班课用低延迟合适吗？", intent: "直播咨询" },
    { context: "ai:您好负责人，通知直播产品升级。\\nuser:我们目前用Web控制台发课。", query: "低延迟直播选项在哪里？我没看到。", intent: "直播咨询" },
    { context: "ai:您好，通知直播升级。\\nuser:好的。\\nai:有标准直播和低延迟直播两个选项了。", query: "我能两个都试试吗？", intent: "直播咨询" },
    { context: "ai:您好负责人，直播升级通知。\\nuser:嗯。\\nai:低延迟直播互动更流畅。", query: "老师那边需要做什么设置吗？", intent: "直播咨询" },
    { context: "ai:您好，我们直播产品升级了。\\nuser:什么升级？\\nai:新增低延迟直播，延迟只有1-2秒。", query: "学员端体验会有什么变化？", intent: "直播咨询" },
    { context: "ai:您好负责人，直播产品通知。\\nuser:好的你说。\\nai:发课时可以选低延迟了。", query: "我们有几百个学员同时上课，低延迟扛得住吗？", intent: "直播咨询" },
    { context: "ai:您好，直播升级通知。\\nuser:嗯了解。\\nai:低延迟直播特别适合互动课。", query: "如果课程中途切换直播模式会断开吗？", intent: "直播咨询" },
    { context: "ai:您好负责人，通知产品升级。\\nuser:你说。\\nai:新增低延迟直播选项。", query: "能给我们做个培训或者发个操作文档吗？", intent: "直播咨询" },
    { context: "ai:您好，直播升级通知。\\nuser:好。\\nai:可以选低延迟直播了。\\nuser:费用呢？\\nai:低延迟略高一些。", query: "有没有试用期？先免费试一下再决定。", intent: "直播咨询" },
  ];

  const liveConfuseCases = [
    { context: "ai:您好，请问是贵机构的负责人吗？\\nuser:是的。", query: "你们能给我们优惠券吗？", intent: "直播咨询" },
    { context: "ai:您好，直播升级通知。\\nuser:我不是负责人。", query: "你找错人了吧。", intent: "直播咨询" },
    { context: "ai:您好负责人，通知直播升级。\\nuser:好的。\\nai:低延迟直播互动更好。", query: "你们平台最近老出bug，能不能先修修再搞新功能？", intent: "直播咨询" },
    { context: "ai:您好，直播产品升级了。\\nuser:嗯好。\\nai:新增低延迟直播选项。", query: "我想投诉你们的客服，上次打电话态度很差。", intent: "直播咨询" },
    { context: "ai:您好负责人，直播通知。\\nuser:你说。\\nai:可以选低延迟直播了。", query: "你们能不能给我们定制一个专属的直播界面？", intent: "直播咨询" },
    { context: "ai:您好，直播升级通知。\\nuser:好。\\nai:低延迟直播适合小班课。", query: "我们想做的不是直播课，是录播课能帮忙吗？", intent: "直播咨询" },
    { context: "ai:您好负责人，直播产品通知。\\nuser:嗯。", query: "你们竞品XX平台好像更便宜，为什么我要用你们的？", intent: "直播咨询" },
    { context: "ai:您好，通知直播升级。\\nuser:好的收到。\\nai:新增低延迟选项。", query: "我们的课程视频能不能下载下来保存？版权归谁？", intent: "直播咨询" },
  ];

  const liveBoundaryCases = [
    { context: "ai:您好负责人，直播升级通知。\\nuser:我现在很忙。", query: "能不能简单说两句？", intent: "直播咨询" },
    { context: "ai:您好，通知直播产品升级。\\nuser:好的。\\nai:新增低延迟直播。", query: "我在开车，稍后再聊行吗？", intent: "直播咨询" },
    { context: "ai:您好负责人，直播升级。\\nuser:嗯好。\\nai:低延迟适合互动课。", query: "我们机构快到期了，续费有优惠吗？得看续费条件再决定用哪个。", intent: "直播咨询" },
    { context: "ai:您好，直播升级通知。\\nuser:你说。\\nai:有标准和低延迟两个选项。", query: "如果我选了低延迟但网络不好怎么办？会自动降级吗？", intent: "直播咨询" },
    { context: "ai:您好负责人，直播通知。\\nuser:好。\\nai:低延迟延迟1-2秒。", query: "1-2秒是理论值还是实测值？我们之前遇到过延迟高的情况。", intent: "直播咨询" },
    { context: "ai:您好，直播产品升级了。\\nuser:了解。\\nai:适合小班课的低延迟选项。", query: "如果中途学员掉线了，重连后还能继续看吗？", intent: "直播咨询" },
  ];

  let cases: { context: string; query: string; intent: string }[];
  switch (testSetId) {
    case "1": cases = outboundCoreCases; break;
    case "2": cases = outboundConfuseCases; break;
    case "3": cases = outboundBoundaryCases; break;
    case "4": cases = liveCoresCases; break;
    case "5": cases = liveConfuseCases; break;
    case "6": cases = liveBoundaryCases; break;
    default: cases = outboundCoreCases;
  }

  let csv = "dialogue_context,current_query,expected_intent\n";
  for (let i = 0; i < caseCount; i++) {
    const base = cases[i % cases.length];
    const varIdx = Math.floor(i / cases.length);
    const suffix = varIdx > 0 ? `（变体${varIdx}）` : "";
    csv += `"${base.context}","${base.query}${suffix}","${base.intent}"\n`;
  }
  return csv;
}

export const MOCK_TEST_SETS: TestSet[] = [
  {
    id: "1",
    name: "站长外呼指令核心测试集",
    cases: 300,
    source: "csv",
    createdAt: "2026-05-10",
    updater: "admin",
    intentId: "1",
    csvContent: generateTestSetCsv("1", 300),
  },
  {
    id: "2",
    name: "站长外呼指令混淆测试集",
    cases: 150,
    source: "auto_generated",
    createdAt: "2026-05-12",
    updater: "system",
    intentId: "1",
    csvContent: generateTestSetCsv("2", 150),
  },
  {
    id: "3",
    name: "站长外呼指令边界测试集",
    cases: 100,
    source: "auto_generated",
    createdAt: "2026-05-15",
    updater: "system",
    intentId: "1",
    csvContent: generateTestSetCsv("3", 100),
  },
  {
    id: "4",
    name: "直播咨询指令核心测试集",
    cases: 250,
    source: "csv",
    createdAt: "2026-05-18",
    updater: "admin",
    intentId: "2",
    csvContent: generateTestSetCsv("4", 250),
  },
  {
    id: "5",
    name: "直播咨询指令混淆测试集",
    cases: 100,
    source: "auto_generated",
    createdAt: "2026-05-20",
    updater: "system",
    intentId: "2",
    csvContent: generateTestSetCsv("5", 100),
  },
  {
    id: "6",
    name: "直播咨询指令边界测试集",
    cases: 50,
    source: "auto_generated",
    createdAt: "2026-05-22",
    updater: "system",
    intentId: "2",
    csvContent: generateTestSetCsv("6", 50),
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

// 实验对应测试集映射: experimentId → testSetId
const EXPERIMENT_TEST_SET_MAP: Record<string, string> = {
  "933e65d8": "1",
  "53622fb8": "2",
  "53622f47": "5",
};

// 站长外呼核心场景的模型回复库
const outboundCoreResponses = [
  "好的师傅，今天飞毛腿合同已经生效了，午餐和晚餐高峰期记得上线，注意安全。",
  "理解的，但今天合同已生效，尽量高峰期上线，哪怕晚高峰也行。",
  "理解的，但今天合同已经生效了，如果今天不跑可能影响后续派单，要不先上线试试？",
  "如果没完成规定单量，合同及派单可能会受到影响，建议尽量完成。",
  "连续完成W天多日合同，每天完成Y单，会有额外奖励。",
  "退出飞毛腿需要前一天在App的飞毛腿报名中取消，次日生效。",
  "那我稍后再打，注意安全。",
  "恶劣天气也建议上线，订单量更高有助于保住飞毛腿资格，但一定注意安全。",
  "理解你的感受，飞毛腿报名是按排名进行的，减少拒单和超时有助于保住资格。",
  "好的师傅，今天尽量多跑几单，有奖励拿。",
  "单日合同和多日合同每单奖励不同，多日坚持更划算。",
  "好的，充好电就上线，注意安全。",
  "有什么需要随时联系我，祝跑单顺利。",
  "今天应该不错，高峰期单量充足。",
  "提前完成可以下线休息，但高峰期在线派单更多。",
];

// 站长外呼混淆场景的模型回复库
const outboundConfuseResponses = [
  "您好，请问是张师傅吗？我这边系统显示您已报名飞毛腿。",
  "理解你的感受，但飞毛腿制度是公司统一规定的，我这边也只能通知到位。",
  "配送费的事我确实不能做主，我向同事确认后再回电给你。",
  "这个是不行的，账号必须本人使用，代跑会被系统检测到的。",
  "上次罚款的事我帮你问过了，需要你在App里申诉，我这边处理不了。",
  "介绍骑手可以让他自己在App报名，我这边只负责通知合同事项。",
  "隔壁站的事我不太清楚，你先把今天合同任务完成。",
  "配送范围是系统自动分配的，我没法手动调整。",
  "限流的事你在App反馈一下，让技术那边查，我这边看不到。",
  "公事还是电话沟通方便，有问题随时打我电话就行。",
];

// 直播咨询混淆场景的模型回复库
const liveConfuseResponses = [
  "优惠券的话我这边没法承诺，不过低延迟直播的体验提升很明显。",
  "好的，麻烦转达一下负责人，我们直播产品做了升级。",
  "bug的问题我帮您记录反馈，今天主要是通知直播升级的事。",
  "客服态度的问题我帮您反馈，今天主要想通知您直播产品升级了。",
  "定制界面需要商务那边评估，我先帮您对接，今天先说下升级内容。",
  "录播课目前也支持，不过今天主要通知的是直播方面的升级。",
  "我们的优势是低延迟互动体验，具体价格可以让商务给您出方案。",
  "课程视频的版权和下载权限在后台可以设置，我帮您确认一下。",
];

function generateCaseDetails(experimentId: string, caseCount: number): ExperimentCaseDetail[] {
  const testSetId = EXPERIMENT_TEST_SET_MAP[experimentId] || "1";

  // 获取与测试集对应的输入场景
  type ScenarioInput = { context: string; query: string; intent: string };
  let scenarioInputs: ScenarioInput[];
  let modelResponses: string[];

  if (testSetId === "1") {
    scenarioInputs = [
      { context: "ai:你好，请问是张师傅吗？我是站长，看到你已报名飞毛腿。\nuser:是的，我报了名。", query: "好的，今天高峰期我会上线。", intent: "站长外呼" },
      { context: "ai:师傅你好，通知一下飞毛腿合同今天生效了。\nuser:好的收到。\nai:记得午餐晚餐高峰上线，注意安全。", query: "站长，我今天下午有点事，能晚点上线吗？", intent: "站长外呼" },
      { context: "ai:你好师傅，飞毛腿合同今天生效了，高峰期需要上线。\nuser:站长，我今天实在跑不了。", query: "那我明天开始跑行不行？", intent: "站长外呼" },
      { context: "ai:你好，飞毛腿合同生效了，单日合同需要完成X单。\nuser:X单有点多啊。\nai:坚持完成的话后续派单会更好。", query: "那如果差一两单没完成会怎样？", intent: "站长外呼" },
      { context: "ai:师傅好，多日合同今天开始了，每天至少Y单。\nuser:每天都要跑吗？", query: "连续跑几天有奖励吗？", intent: "站长外呼" },
      { context: "ai:你好张师傅，飞毛腿合同生效通知。\nuser:好。\nai:高峰期记得上线。", query: "站长，如果我想退出飞毛腿怎么操作？", intent: "站长外呼" },
      { context: "ai:师傅你好，飞毛腿合同今天生效。\nuser:站长我在开车。", query: "现在不方便说话。", intent: "站长外呼" },
      { context: "ai:你好师傅，飞毛腿通知。\nuser:好的知道了。\nai:单日合同今天至少X单。", query: "下雨天也要跑吗？", intent: "站长外呼" },
      { context: "ai:师傅好，飞毛腿合同开始了。\nuser:站长，这制度不合理。", query: "为什么不能自己选什么时候跑？", intent: "站长外呼" },
      { context: "ai:你好，请问是李师傅吗？飞毛腿合同今天生效了。\nuser:是我，什么要求？\nai:午餐晚餐高峰期需要上线。", query: "明白了，我今天会完成规定单量的。", intent: "站长外呼" },
      { context: "ai:师傅好，多日合同开始了，连续W天完成Y单有额外奖励。\nuser:奖励是什么？", query: "比单日合同每单多多少钱？", intent: "站长外呼" },
      { context: "ai:你好师傅，飞毛腿合同通知。\nuser:好的。\nai:记得按时上线。", query: "站长，我手机快没电了，待会充好电就上线。", intent: "站长外呼" },
      { context: "ai:你好，飞毛腿合同今天开始。\nuser:知道了。\nai:高峰期记得上线。\nuser:好。", query: "对了站长，我换了个电动车，续航更长了。", intent: "站长外呼" },
      { context: "ai:师傅好，通知你飞毛腿今天开始。\nuser:嗯好。", query: "站长你觉得今天单量会多吗？", intent: "站长外呼" },
      { context: "ai:你好张师傅，飞毛腿合同生效了。\nuser:好的。\nai:单日合同完成X单。", query: "如果提前完成了是不是就可以下线了？", intent: "站长外呼" },
    ];
    modelResponses = outboundCoreResponses;
  } else if (testSetId === "2") {
    scenarioInputs = [
      { context: "ai:你好师傅，飞毛腿合同今天生效了。\nuser:什么飞毛腿？我没报名啊。", query: "你是不是打错电话了？我是送快递的不是送外卖的。", intent: "站长外呼" },
      { context: "ai:师傅你好，通知你飞毛腿合同今天开始。\nuser:站长，我觉得这个制度不合理。", query: "为什么不能让我自己选择什么时候跑？你们是不是在压榨骑手？", intent: "站长外呼" },
      { context: "ai:你好，飞毛腿合同生效了，今天需要完成X单。\nuser:站长你能不能帮我多派几个好单？\nai:飞毛腿是按排名的，不是我能干预的。", query: "那你帮我问问能不能给我涨点配送费呗。", intent: "站长外呼" },
      { context: "ai:师傅好，多日合同开始了。\nuser:哎站长，我跟你说个事。\nai:你说。", query: "我朋友想用我的账号帮我跑几单行不行？", intent: "站长外呼" },
      { context: "ai:你好师傅，飞毛腿今天开始了。\nuser:好的。对了站长，上次那个罚款的事…\nai:那个我向同事确认后再回电给你。", query: "不行，你现在就给我解决，不然我今天不跑了。", intent: "站长外呼" },
      { context: "ai:师傅好，飞毛腿合同今天生效了。\nuser:好的收到。", query: "对了站长，能帮我介绍几个兼职骑手吗？我想带人。", intent: "站长外呼" },
      { context: "ai:你好师傅，飞毛腿通知。\nuser:站长我想问个别的事。", query: "隔壁那个站点是不是在挖我们的骑手？你知道吗？", intent: "站长外呼" },
      { context: "ai:张师傅好，飞毛腿合同开始了。\nuser:好的。\nai:今天至少完成X单。", query: "站长，能不能把配送范围缩小一点？总是派太远的单。", intent: "站长外呼" },
      { context: "ai:你好师傅，飞毛腿合同今天生效。\nuser:嗯。", query: "站长你帮我看看我的账号是不是被限流了？最近单子越来越少。", intent: "站长外呼" },
      { context: "ai:师傅好，通知飞毛腿合同事项。\nuser:知道了。\nai:高峰期上线。", query: "站长，你能加我微信吗？以后有事直接微信说方便。", intent: "站长外呼" },
    ];
    modelResponses = outboundConfuseResponses;
  } else {
    // testSetId === "5" 直播咨询混淆
    scenarioInputs = [
      { context: "ai:您好，请问是贵机构的负责人吗？\nuser:是的。", query: "你们能给我们优惠券吗？", intent: "直播咨询" },
      { context: "ai:您好，直播升级通知。\nuser:我不是负责人。", query: "你找错人了吧。", intent: "直播咨询" },
      { context: "ai:您好负责人，通知直播升级。\nuser:好的。\nai:低延迟直播互动更好。", query: "你们平台最近老出bug，能不能先修修再搞新功能？", intent: "直播咨询" },
      { context: "ai:您好，直播产品升级了。\nuser:嗯好。\nai:新增低延迟直播选项。", query: "我想投诉你们的客服，上次打电话态度很差。", intent: "直播咨询" },
      { context: "ai:您好负责人，直播通知。\nuser:你说。\nai:可以选低延迟直播了。", query: "你们能不能给我们定制一个专属的直播界面？", intent: "直播咨询" },
      { context: "ai:您好，直播升级通知。\nuser:好。\nai:低延迟直播适合小班课。", query: "我们想做的不是直播课，是录播课能帮忙吗？", intent: "直播咨询" },
      { context: "ai:您好负责人，直播产品通知。\nuser:嗯。", query: "你们竞品XX平台好像更便宜，为什么我要用你们的？", intent: "直播咨询" },
      { context: "ai:您好，通知直播升级。\nuser:好的收到。\nai:新增低延迟选项。", query: "我们的课程视频能不能下载下来保存？版权归谁？", intent: "直播咨询" },
    ];
    modelResponses = liveConfuseResponses;
  }

  const evaluatorNames = ["意图准确率", "对话连贯性", "约束遵循", "任务完成度"];
  const scoreOptions = [10, 9, 8, 7, 5, 3, 2];
  const cases: ExperimentCaseDetail[] = [];

  for (let i = 0; i < caseCount; i++) {
    const inputIdx = i % scenarioInputs.length;
    const input = scenarioInputs[inputIdx];
    const response = modelResponses[i % modelResponses.length];
    const seed = i * 7 + 3;
    const evalName = evaluatorNames[seed % evaluatorNames.length];

    let score: number;
    let passed: boolean;
    if (i < scenarioInputs.length) {
      // 前几条用高质量分数
      score = i % 5 === 0 ? 8 : (i % 3 === 0 ? 7 : 10);
      passed = score >= 6;
    } else {
      score = scoreOptions[seed % scoreOptions.length];
      passed = score >= 6;
    }

    const predictedIntent = passed ? input.intent : "闲聊";
    const comment = passed
      ? `第${i + 1}条：${evalName}维度评估通过，表现良好。`
      : `第${i + 1}条：${evalName}维度存在偏差，需改进。`;

    cases.push({
      caseIndex: i + 1,
      dialogueContext: input.context,
      currentQuery: input.query,
      expectedIntent: input.intent,
      modelResponse: response,
      predictedIntent,
      evaluatorName: evalName,
      evaluatorScore: score,
      evaluatorComment: comment,
      passed,
    });
  }
  return cases;
}

// 为已完成实验预生成数据（用例数匹配对应测试集）
export const MOCK_EXPERIMENT_DETAILS: Record<string, ExperimentCaseDetail[]> = {
  "933e65d8": generateCaseDetails("933e65d8", 300),
  "53622fb8": generateCaseDetails("53622fb8", 150),
  "53622f47": generateCaseDetails("53622f47", 100),
};
