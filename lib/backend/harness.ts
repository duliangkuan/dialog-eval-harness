import { extractConstraints } from "./constraints";
import { evaluateDialogue } from "./evaluator";
import { simulateUserTurn } from "./simulator";
import { runDialogue } from "./test-agent";
import { CaseInput, EvalReport, HarnessResult, Violation } from "./types";

export async function runHarness(input: {
  policy: string;
  caseInput: CaseInput;
  constraints?: Awaited<ReturnType<typeof extractConstraints>>["constraints"];
}): Promise<HarnessResult> {
  const constraintResult = input.constraints
    ? { constraints: input.constraints, requestIds: [] }
    : await extractConstraints(input.policy);

  const round1Dialogue = await runDialogue({
    policy: input.policy,
    caseInput: input.caseInput,
    simulateUserTurn: (transcript) =>
      simulateUserTurn({
        caseInput: input.caseInput,
        transcript
      })
  });

  const round1 = await evaluateDialogue({
    case_id: input.caseInput.case_id,
    policy: input.policy,
    constraints: constraintResult.constraints,
    transcript: round1Dialogue.transcript,
    requestIds: [...constraintResult.requestIds, ...round1Dialogue.requestIds]
  });

  const repairHints = flattenViolations(round1).map(
    (violation) =>
      `${violation.rule_id} turn ${violation.turn_id}: ${violation.reason} Evidence: ${violation.evidence}`
  );

  const round2Dialogue = await runDialogue({
    policy: input.policy,
    caseInput: {
      ...input.caseInput,
      seed: (input.caseInput.seed ?? 1) + 1
    },
    repairHints,
    simulateUserTurn: (transcript) =>
      simulateUserTurn({
        caseInput: input.caseInput,
        transcript
      })
  });

  const round2 = await evaluateDialogue({
    case_id: input.caseInput.case_id,
    policy: input.policy,
    constraints: constraintResult.constraints,
    transcript: round2Dialogue.transcript,
    requestIds: round2Dialogue.requestIds
  });

  return {
    case_id: input.caseInput.case_id,
    round1,
    round2,
    delta_report: diffReports(round1, round2)
  };
}

export function diffReports(round1: EvalReport, round2: EvalReport): HarnessResult["delta_report"] {
  const r1Keys = new Set(flattenViolations(round1).map(violationKey));
  const r2Keys = new Set(flattenViolations(round2).map(violationKey));

  const fixed = [...r1Keys].filter((key) => !r2Keys.has(key)).length;
  const regressed = [...r2Keys].filter((key) => !r1Keys.has(key)).length;
  const unchanged = [...r1Keys].filter((key) => r2Keys.has(key)).length;
  const total = Math.max(1, r1Keys.size + regressed);
  const net = Math.round(((fixed - regressed) / total) * 100) / 100;

  return {
    fixed_violations: fixed,
    regressed_violations: regressed,
    unchanged_violations: unchanged,
    net_improvement: net,
    summary: `R1 ${round1.aggregate.pass_status} (${round1.aggregate.total_score}) → R2 ${round2.aggregate.pass_status} (${round2.aggregate.total_score}); fixed ${fixed}, regressed ${regressed}.`
  };
}

function flattenViolations(report: EvalReport): Violation[] {
  return report.turns.flatMap((turn) => turn.violations);
}

function violationKey(violation: Violation) {
  return `${violation.rule_id}:${violation.turn_id}`;
}
