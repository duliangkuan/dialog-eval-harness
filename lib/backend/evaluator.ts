import { extractJsonObject } from "./json";
import { callModel, getModelConfig } from "./model-client";
import { Constraint, DialogueTurn, EvalReport, Violation } from "./types";

export async function evaluateDialogue(input: {
  case_id: string;
  policy: string;
  constraints: Constraint[];
  transcript: DialogueTurn[];
  requestIds?: string[];
}): Promise<EvalReport> {
  const requestIds = [...(input.requestIds ?? [])];
  const violations: Violation[] = [];
  const judgeInputs: Constraint[] = [];

  for (const constraint of input.constraints) {
    const ruleViolation = runRuleVerifier(constraint, input.transcript);
    if (ruleViolation) {
      violations.push(ruleViolation);
      continue;
    }

    if (constraint.verifier === "hybrid" || constraint.verifier === "llm_judge") {
      judgeInputs.push(constraint);
    }
  }

  const judgeResults = await Promise.all(
    judgeInputs.map((constraint) =>
      runLlmJudge({
        constraint,
        policy: input.policy,
        transcript: input.transcript
      })
    )
  );

  for (const judge of judgeResults) {
    requestIds.push(...judge.requestIds);
    if (judge.violation) {
      violations.push(judge.violation);
    }
  }

  const vetoTriggered = violations
    .filter((violation) => input.constraints.find((rule) => rule.rule_id === violation.rule_id)?.veto)
    .map((violation) => violation.rule_id);

  const totalScore =
    vetoTriggered.length > 0
      ? 0
      : Math.max(
          0,
          Math.round(
            100 -
              violations.reduce((sum, violation) => {
                if (violation.deduction === "VETO") return sum;
                return sum + violation.deduction;
              }, 0)
          )
        );

  const criticalTurn = violations.length
    ? [...violations].sort((a, b) => b.severity - a.severity || a.turn_id - b.turn_id)[0].turn_id
    : null;

  const config = getModelConfig();

  return {
    case_id: input.case_id,
    constraints: input.constraints,
    turns: input.transcript.map((turn) => ({
      ...turn,
      violations: violations.filter((violation) => violation.turn_id === turn.turn_id)
    })),
    aggregate: {
      total_score: totalScore,
      pass_status:
        vetoTriggered.length > 0
          ? (`VETOED_BY_${vetoTriggered[0]}` as const)
          : totalScore >= 80
            ? "PASSED"
            : "FAILED",
      critical_turn: criticalTurn,
      veto_triggered: [...new Set(vetoTriggered)],
      failure_category: [...new Set(violations.map((violation) => classifyFailure(violation)))],
      stability_metric: estimateStability(totalScore, violations.length)
    },
    model_trace: {
      provider: config.provider,
      model: config.model,
      request_ids: requestIds
    }
  };
}

function runRuleVerifier(constraint: Constraint, transcript: DialogueTurn[]): Violation | null {
  const agentTurns = transcript.filter((turn) => turn.speaker === "agent");
  const fullAgentText = agentTurns.map((turn) => turn.text).join("\n");

  const isForbiddenCompensation =
    constraint.veto ||
    constraint.category.includes("禁做") ||
    /不能|禁止|不得/.test(constraint.desc);

  if (isForbiddenCompensation && /赔付|补偿|退款|赔偿|申请赔/.test(constraint.desc)) {
    const hit = agentTurns.find((turn) => /赔付|补偿|退款|赔偿|给您申请|给你申请|申请赔/.test(turn.text));
    if (hit) {
      return {
        rule_id: constraint.rule_id,
        turn_id: hit.turn_id,
        severity: constraint.severity,
        confidence: 0.96,
        reason: "Agent 命中赔付/补偿类禁做表达。",
        evidence: hit.text,
        deduction: "VETO",
        verifier: "rule_based"
      };
    }
  }

  if (/核实.*本人|是否本人/.test(constraint.desc)) {
    const firstAgent = agentTurns[0];
    if (firstAgent && !/本人|您是|你是|尾号|手机号|订单.*您/.test(firstAgent.text)) {
      return {
        rule_id: constraint.rule_id,
        turn_id: firstAgent.turn_id,
        severity: constraint.severity,
        confidence: 0.82,
        reason: "首个 Agent 话轮没有先核实本人。",
        evidence: firstAgent.text,
        deduction: constraint.severity * 4,
        verifier: "rule_based"
      };
    }
  }

  if (/90\s*秒|不超过.*秒|时长/.test(constraint.desc)) {
    const estimatedSeconds = Math.ceil(fullAgentText.length / 4);
    if (estimatedSeconds > 90) {
      return {
        rule_id: constraint.rule_id,
        turn_id: agentTurns.at(-1)?.turn_id ?? 1,
        severity: constraint.severity,
        confidence: 0.78,
        reason: `按中文口播速度估算 ${estimatedSeconds} 秒，超过时长上限。`,
        evidence: `agent_chars=${fullAgentText.length}`,
        deduction: constraint.severity * 3,
        verifier: "rule_based"
      };
    }
  }

  if (/结束前.*复述|复述.*预计/.test(constraint.desc)) {
    const lastAgent = agentTurns.at(-1);
    if (lastAgent && !/预计|大概|送达|到达|分钟|时间/.test(lastAgent.text)) {
      return {
        rule_id: constraint.rule_id,
        turn_id: lastAgent.turn_id,
        severity: constraint.severity,
        confidence: 0.74,
        reason: "最后一个 Agent 话轮没有复述预计时间。",
        evidence: lastAgent.text,
        deduction: constraint.severity * 4,
        verifier: "rule_based"
      };
    }
  }

  return null;
}

async function runLlmJudge(input: {
  constraint: Constraint;
  policy: string;
  transcript: DialogueTurn[];
}): Promise<{ violation: Violation | null; requestIds: string[] }> {
  const sampleCount = input.constraint.severity >= 4 ? 3 : 1;
  const votes = await Promise.all(
    Array.from({ length: sampleCount }, () => runSingleJudge(input))
  );

  const violatedVotes = votes.filter((vote) => vote.violated);
  const requestIds = votes.map((vote) => vote.request_id);
  const violationThreshold = Math.floor(sampleCount / 2) + 1;

  if (violatedVotes.length < violationThreshold) {
    return { violation: null, requestIds };
  }

  const representative = [...violatedVotes].sort(
    (a, b) => b.confidence - a.confidence || (a.turn_id ?? 999) - (b.turn_id ?? 999)
  )[0];
  const confidence = average(votes.map((vote) => vote.confidence));
  const deduction = input.constraint.veto ? "VETO" : input.constraint.severity * 5;

  return {
    requestIds,
    violation: {
      rule_id: input.constraint.rule_id,
      turn_id: representative.turn_id ?? 1,
      severity: input.constraint.severity,
      confidence,
      reason:
        sampleCount > 1
          ? `${representative.reason} Judge votes: ${violatedVotes.length}/${sampleCount}.`
          : representative.reason,
      evidence: representative.evidence,
      deduction,
      verifier: input.constraint.verifier,
      judge_votes: votes
    }
  };
}

async function runSingleJudge(input: {
  constraint: Constraint;
  policy: string;
  transcript: DialogueTurn[];
}): Promise<{
  violated: boolean;
  turn_id: number | null;
  confidence: number;
  reason: string;
  evidence: string;
  request_id: string;
}> {
  const result = await callModel(
    [
      {
        role: "system",
        content:
          "You are an Eval Agent for outbound-call policy compliance. Judge exactly one atomic constraint. Return strict JSON only."
      },
      {
        role: "user",
        content: `Policy:
${input.policy}

Atomic constraint:
${JSON.stringify(input.constraint, null, 2)}

Transcript:
${JSON.stringify(input.transcript, null, 2)}

Decide whether the Agent violated this constraint. Return:
{
  "violated": true,
  "turn_id": 1,
  "confidence": 0.0,
  "reason": "...",
  "evidence": "short quote from transcript"
}

If no violation, set violated=false and use turn_id=null.`
      }
    ],
    {
      responseFormat: "json_object",
      temperature: 0.1,
      maxTokens: 900
    }
  );

  const parsed = extractJsonObject(result.content) as {
    violated?: boolean;
    satisfied?: boolean;
    turn_id?: number | null;
    confidence?: number;
    reason?: string;
    evidence?: string;
  };

  return {
    violated: Boolean(parsed.violated ?? (parsed.satisfied === false)),
    turn_id: parsed.turn_id ?? null,
    confidence: clamp(Number(parsed.confidence ?? 0.7), 0, 1),
    reason: parsed.reason || "LLM Judge 判定该约束被违反。",
    evidence: parsed.evidence || "",
    request_id: result.requestId
  };
}

function estimateStability(totalScore: number, violationCount: number) {
  const passAtK = clamp(totalScore / 100 - violationCount * 0.025 + 0.08, 0, 1);
  const passPowK = clamp(Math.pow(passAtK, 3), 0, 1);
  return {
    pass_at_k: round(passAtK),
    pass_pow_k: round(passPowK),
    reliability_ratio: passAtK ? round(passPowK / passAtK) : 0
  };
}

function classifyFailure(violation: Violation) {
  if (violation.deduction === "VETO") return "veto_forbidden_action";
  if (/情绪|人工|投诉/.test(violation.reason)) return "emotion_escalation_missed";
  if (/核实|本人/.test(violation.reason)) return "identity_verification_missing";
  if (/时间|送达|到达|超时/.test(violation.reason)) return "time_commitment_missing";
  return "constraint_following_error";
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
