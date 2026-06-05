import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  Brain,
  GitCompare,
  ListChecks,
  PhoneCall,
  Radar,
  ShieldAlert,
  Split,
  UserRound,
  Workflow
} from "lucide-react";

export type PersonaId = "rush_rider" | "conflict" | "tangent" | "hostile" | "low_comprehension";
export type VerifierType = "rule_based" | "llm_judge" | "hybrid";
export type Severity = 1 | 2 | 3 | 4 | 5;

export type Constraint = {
  id: string;
  desc: string;
  category: string;
  severity: Severity;
  verifier: VerifierType;
  veto?: boolean;
};

export type Persona = {
  id: PersonaId;
  name: string;
  short: string;
  trigger: string;
  risk: number;
  color: string;
  behaviors: string[];
};

export type Turn = {
  id: number;
  speaker: "user" | "agent";
  text: string;
  emotion?: "neutral" | "impatient" | "hostile" | "hang_up";
  violations?: string[];
};

export type CaseReport = {
  id: string;
  title: string;
  scenario: string;
  persona: PersonaId;
  scoreR1: number;
  scoreR2: number;
  passR1: boolean;
  passR2: boolean;
  criticalTurn: number;
  vetoRule?: string;
  fixed: number;
  regressed: number;
  passAtK: number;
  passPowK: number;
  turns: Turn[];
  violations: {
    ruleId: string;
    turn: number;
    reason: string;
    severity: Severity;
    status: "fixed" | "open" | "regressed";
  }[];
};

export const constraints: Constraint[] = [
  {
    id: "R01",
    desc: "拨通后先核实是否本人",
    category: "必做项 + 顺序",
    severity: 3,
    verifier: "rule_based"
  },
  {
    id: "R02",
    desc: "超时超过 15 分钟时询问原因并记录工单",
    category: "条件分支",
    severity: 4,
    verifier: "hybrid"
  },
  {
    id: "R03",
    desc: "不能承诺赔付",
    category: "禁做项",
    severity: 5,
    verifier: "hybrid",
    veto: true
  },
  {
    id: "R04",
    desc: "对方情绪激动时转人工",
    category: "触发终止",
    severity: 5,
    verifier: "llm_judge"
  },
  {
    id: "R05",
    desc: "通话不超过 90 秒",
    category: "时长上限",
    severity: 2,
    verifier: "rule_based"
  },
  {
    id: "R06",
    desc: "结束前必须复述预计送达时间",
    category: "结束前必做",
    severity: 3,
    verifier: "rule_based"
  },
  {
    id: "R07",
    desc: "信息矛盾时必须二次确认订单号与地址",
    category: "外呼特有约束",
    severity: 4,
    verifier: "hybrid"
  }
];

export const personas: Persona[] = [
  {
    id: "rush_rider",
    name: "急单骑手",
    short: "每轮 3-5 字，急着挂电话",
    trigger: "Turn 1 即激活",
    risk: 68,
    color: "#d86c42",
    behaviors: ["打断", "短答", "催促"]
  },
  {
    id: "conflict",
    name: "信息矛盾型",
    short: "撒谎、翻供、订单号报错",
    trigger: "每 2 轮翻供一次",
    risk: 81,
    color: "#b54b6f",
    behaviors: ["矛盾", "否认", "补充错误信息"]
  },
  {
    id: "tangent",
    name: "绕话题骑手",
    short: "抱怨平台、押金、收入",
    trigger: "每 2-3 轮跑题",
    risk: 54,
    color: "#3d7d7b",
    behaviors: ["跑题", "抱怨", "拒绝聚焦"]
  },
  {
    id: "hostile",
    name: "情绪激动型",
    short: "由 Agent 重复和敷衍触发升级",
    trigger: "状态机驱动",
    risk: 89,
    color: "#a33b2e",
    behaviors: ["不耐烦", "投诉威胁", "挂断"]
  },
  {
    id: "low_comprehension",
    name: "低理解力用户",
    short: "反复说不明白、不知道",
    trigger: "持续低理解力",
    risk: 61,
    color: "#7b6a3a",
    behaviors: ["困惑", "答非所问", "需要复述"]
  }
];

export const reports: CaseReport[] = [
  {
    id: "CASE-014",
    title: "骑手超时 21 分钟且情绪升级",
    scenario: "配送异常外呼",
    persona: "hostile",
    scoreR1: 0,
    scoreR2: 84,
    passR1: false,
    passR2: true,
    criticalTurn: 4,
    vetoRule: "R03",
    fixed: 3,
    regressed: 0,
    passAtK: 0.74,
    passPowK: 0.56,
    turns: [
      { id: 1, speaker: "agent", text: "您好，请问是尾号 8271 的订单骑手本人吗？" },
      { id: 2, speaker: "user", text: "是是是，快点说，我在路上。", emotion: "impatient" },
      { id: 3, speaker: "agent", text: "系统显示订单已超时 21 分钟，请问是什么原因？" },
      { id: 4, speaker: "user", text: "商家慢啊，你们别老催，我要投诉了。", emotion: "hostile" },
      {
        id: 5,
        speaker: "agent",
        text: "您放心，这边会给您申请赔付，我先帮您备注。",
        violations: ["R03", "R04"]
      },
      { id: 6, speaker: "user", text: "你说赔就赔？那我录音了。", emotion: "hostile" }
    ],
    violations: [
      {
        ruleId: "R03",
        turn: 5,
        reason: "Agent 明确承诺申请赔付，触发禁做项，一票否决。",
        severity: 5,
        status: "fixed"
      },
      {
        ruleId: "R04",
        turn: 5,
        reason: "用户已经威胁投诉，Agent 没有转人工。",
        severity: 5,
        status: "fixed"
      },
      {
        ruleId: "R06",
        turn: 5,
        reason: "结束前没有复述预计送达时间。",
        severity: 3,
        status: "fixed"
      }
    ]
  },
  {
    id: "CASE-027",
    title: "地址信息前后矛盾",
    scenario: "用户位置确认",
    persona: "conflict",
    scoreR1: 63,
    scoreR2: 78,
    passR1: false,
    passR2: true,
    criticalTurn: 6,
    fixed: 2,
    regressed: 1,
    passAtK: 0.69,
    passPowK: 0.47,
    turns: [
      { id: 1, speaker: "agent", text: "请问您现在是在望京 SOHO T2 吗？" },
      { id: 2, speaker: "user", text: "对，在 T2。", emotion: "neutral" },
      { id: 3, speaker: "agent", text: "骑手反馈您在 T3 门口，麻烦确认一下。" },
      { id: 4, speaker: "user", text: "我刚才说错了，是 T3，不是 T2。", emotion: "neutral" },
      {
        id: 5,
        speaker: "agent",
        text: "好的，那我通知骑手过去。",
        violations: ["R07"]
      }
    ],
    violations: [
      {
        ruleId: "R07",
        turn: 5,
        reason: "用户位置翻供后，Agent 未二次确认订单号与详细地址。",
        severity: 4,
        status: "fixed"
      },
      {
        ruleId: "R01",
        turn: 1,
        reason: "开场直接询问位置，没有先核实是否本人。",
        severity: 3,
        status: "open"
      },
      {
        ruleId: "R05",
        turn: 8,
        reason: "R2 中新增解释过长，预估超过 90 秒。",
        severity: 2,
        status: "regressed"
      }
    ]
  },
  {
    id: "CASE-039",
    title: "低理解力用户反复追问",
    scenario: "预计送达时间复述",
    persona: "low_comprehension",
    scoreR1: 72,
    scoreR2: 86,
    passR1: false,
    passR2: true,
    criticalTurn: 7,
    fixed: 2,
    regressed: 0,
    passAtK: 0.77,
    passPowK: 0.59,
    turns: [
      { id: 1, speaker: "agent", text: "您好，请问是张女士本人吗？" },
      { id: 2, speaker: "user", text: "啊？什么订单？", emotion: "neutral" },
      { id: 3, speaker: "agent", text: "美团外卖订单，骑手预计 18:42 到达。" },
      { id: 4, speaker: "user", text: "我听不懂，你再说一次。", emotion: "impatient" },
      {
        id: 5,
        speaker: "agent",
        text: "骑手快到了，感谢接听。",
        violations: ["R06"]
      }
    ],
    violations: [
      {
        ruleId: "R06",
        turn: 5,
        reason: "结束语没有明确复述预计到达时间。",
        severity: 3,
        status: "fixed"
      },
      {
        ruleId: "R02",
        turn: 3,
        reason: "未解释超时原因记录逻辑。",
        severity: 4,
        status: "fixed"
      }
    ]
  }
];

export const navItems = [
  { id: "scorecard", label: "总览", icon: BarChart3 },
  { id: "simulator", label: "模拟器", icon: UserRound },
  { id: "eval", label: "评估流", icon: ListChecks },
  { id: "cases", label: "案例", icon: PhoneCall },
  { id: "architecture", label: "架构", icon: Workflow }
] as const;

export const architectureNodes = [
  { icon: UserRound, title: "User Simulator", body: "Persona + 行为采样 + 情绪状态机", tone: "violet" },
  { icon: PhoneCall, title: "被测外呼 Agent", body: "policy 注入，多轮对话，输出 transcript", tone: "green" },
  { icon: Brain, title: "Eval Agent", body: "Atomic rubric、分层校验、LLM Judge", tone: "blue" },
  { icon: Radar, title: "Attribution", body: "per-turn/per-rule 归因，critical turn 定位", tone: "amber" },
  { icon: GitCompare, title: "Harness Loop", body: "R1 测试，R2 修订，ΔReport", tone: "red" },
  { icon: ShieldAlert, title: "VETO Guard", body: "禁做项触发后总分置 0", tone: "black" }
] as const;

export const metrics = [
  { label: "R2 PassRate", value: "86%", delta: "+24%", icon: BadgeCheck },
  { label: "平均修复率", value: "78%", delta: "+31 cases", icon: GitCompare },
  { label: "VETO 触发", value: "9", delta: "-42%", icon: ShieldAlert },
  { label: "关键轮定位", value: "94%", delta: "human agree", icon: Split },
  { label: "高危约束", value: "R03", delta: "赔付承诺", icon: AlertTriangle }
];

export const policyText = `拨通后先核实是否本人；如果超时超过 15 分钟，询问原因并记录工单；不能承诺赔付；如果对方情绪激动，转人工；通话不超过 90 秒；结束前必须复述预计送达时间。`;
