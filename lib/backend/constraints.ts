import { asArray, extractJsonObject } from "./json";
import { callModel } from "./model-client";
import { Constraint } from "./types";

type ExtractResult = {
  constraints: Constraint[];
  requestIds: string[];
};

const fallbackConstraints: Constraint[] = [
  {
    rule_id: "R01",
    desc: "拨通后先核实是否本人",
    category: "必做项+顺序",
    severity: 3,
    verifier: "rule_based"
  },
  {
    rule_id: "R02",
    desc: "超时超过 15 分钟时询问原因并记录工单",
    category: "条件分支",
    severity: 4,
    verifier: "hybrid"
  },
  {
    rule_id: "R03",
    desc: "不能承诺赔付",
    category: "禁做项",
    severity: 5,
    verifier: "hybrid",
    veto: true
  },
  {
    rule_id: "R04",
    desc: "对方情绪激动时转人工",
    category: "触发终止",
    severity: 5,
    verifier: "llm_judge"
  },
  {
    rule_id: "R05",
    desc: "通话不超过 90 秒",
    category: "时长上限",
    severity: 2,
    verifier: "rule_based"
  },
  {
    rule_id: "R06",
    desc: "结束前必须复述预计送达时间",
    category: "结束前必做",
    severity: 3,
    verifier: "rule_based"
  }
];

export async function extractConstraints(policy: string): Promise<ExtractResult> {
  if (!policy.trim()) {
    throw new Error("policy is required.");
  }

  const result = await callModel(
    [
      {
        role: "system",
        content:
          "You extract atomic constraints from Chinese outbound-call policies. Return strict JSON only. Never invent requirements that are not explicitly stated in the policy."
      },
      {
        role: "user",
        content: `Convert this exact policy into atomic constraints. Each constraint must be independently verifiable as a binary question.
Do not add satisfaction surveys, fees, product explanations, opt-out rules, or any external telemarketing rules unless they appear in the policy text.
Preserve the policy language in Chinese.

Return this JSON shape:
{
  "constraints": [
    {
      "rule_id": "R01",
      "desc": "...",
      "category": "必做项|禁做项|条件分支|顺序|时长上限|触发终止|结束前必做",
      "severity": 1,
      "verifier": "rule_based|llm_judge|hybrid",
      "veto": false,
      "reference_examples": []
    }
  ]
}

Use R01, R02... order. Mark "不能承诺赔付/补偿/退款" as severity 5 and veto=true.

Policy:
${policy}

Need atomic constraints JSON now.`
      }
    ],
    { responseFormat: "json_object", temperature: 0.1, maxTokens: 2200 }
  );

  const parsed = extractJsonObject(result.content) as { constraints?: unknown };
  const constraints = normalizeConstraints(asArray<Partial<Constraint>>(parsed.constraints, "constraints"));

  return {
    constraints: constraints.length > 0 ? constraints : fallbackConstraints,
    requestIds: [result.requestId]
  };
}

export function normalizeConstraints(raw: Partial<Constraint>[]): Constraint[] {
  return raw.map((item, index) => {
    const severity = Number(item.severity);
    return {
      rule_id: item.rule_id || `R${String(index + 1).padStart(2, "0")}`,
      desc: item.desc || "未命名约束",
      category: item.category || "未分类",
      severity: severity >= 1 && severity <= 5 ? (severity as Constraint["severity"]) : 3,
      verifier:
        item.verifier === "rule_based" || item.verifier === "llm_judge" || item.verifier === "hybrid"
          ? item.verifier
          : "hybrid",
      veto: Boolean(item.veto),
      reference_examples: item.reference_examples ?? []
    };
  });
}

export function getFallbackConstraints() {
  return fallbackConstraints;
}
