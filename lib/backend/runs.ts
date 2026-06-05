import { extractConstraints } from "./constraints";
import { evaluateDialogue } from "./evaluator";
import { diffReports } from "./harness";
import { simulateUserTurn } from "./simulator";
import { runDialogue } from "./test-agent";
import { CaseInput, Constraint, DialogueTurn, EvalReport, HarnessResult } from "./types";

export type RunStage =
  | "queued"
  | "extracting_constraints"
  | "simulating_round1"
  | "evaluating_round1"
  | "simulating_round2"
  | "evaluating_round2"
  | "done"
  | "failed";

export type RunRecord = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: "queued" | "running" | "done" | "failed";
  stage: RunStage;
  progress: number;
  input: {
    policy: string;
    caseInput: CaseInput;
    constraints?: Constraint[];
  };
  artifacts: {
    constraints?: Constraint[];
    extractRequestIds?: string[];
    round1Transcript?: DialogueTurn[];
    round1RequestIds?: string[];
    round1?: EvalReport;
    repairHints?: string[];
    round2Transcript?: DialogueTurn[];
    round2RequestIds?: string[];
    round2?: EvalReport;
    result?: HarnessResult;
  };
  error?: string;
};

type RunStore = Map<string, RunRecord>;

const globalForRuns = globalThis as typeof globalThis & {
  __meituanEvalRuns?: RunStore;
};

function store() {
  if (!globalForRuns.__meituanEvalRuns) {
    globalForRuns.__meituanEvalRuns = new Map();
  }
  return globalForRuns.__meituanEvalRuns;
}

export function createRun(input: {
  policy: string;
  caseInput: CaseInput;
  constraints?: Constraint[];
}): RunRecord {
  const now = new Date().toISOString();
  const run: RunRecord = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "queued",
    stage: input.constraints?.length ? "simulating_round1" : "queued",
    progress: input.constraints?.length ? 20 : 0,
    input,
    artifacts: input.constraints?.length ? { constraints: input.constraints, extractRequestIds: [] } : {}
  };

  store().set(run.id, run);
  return run;
}

export function getRun(runId: string) {
  return store().get(runId) ?? null;
}

export function saveRun(run: RunRecord) {
  store().set(run.id, run);
  return run;
}

export function listRuns() {
  return [...store().values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50);
}

export async function advanceRun(runId: string): Promise<RunRecord> {
  const run = getRun(runId);
  if (!run) {
    throw new Error(`Run not found: ${runId}`);
  }

  if (run.status === "done" || run.status === "failed") {
    return run;
  }

  try {
    run.status = "running";
    touch(run);

    switch (run.stage) {
      case "queued":
        run.stage = "extracting_constraints";
        run.progress = 8;
        touch(run);
        return run;

      case "extracting_constraints": {
        const extracted = await extractConstraints(run.input.policy);
        run.artifacts.constraints = extracted.constraints;
        run.artifacts.extractRequestIds = extracted.requestIds;
        run.stage = "simulating_round1";
        run.progress = 25;
        touch(run);
        return run;
      }

      case "simulating_round1": {
        const dialogue = await runDialogue({
          policy: run.input.policy,
          caseInput: run.input.caseInput,
          simulateUserTurn: (transcript) =>
            simulateUserTurn({
              caseInput: run.input.caseInput,
              transcript
            })
        });
        run.artifacts.round1Transcript = dialogue.transcript;
        run.artifacts.round1RequestIds = dialogue.requestIds;
        run.stage = "evaluating_round1";
        run.progress = 45;
        touch(run);
        return run;
      }

      case "evaluating_round1": {
        const constraints = requireConstraints(run);
        const round1 = await evaluateDialogue({
          case_id: run.input.caseInput.case_id,
          policy: run.input.policy,
          constraints,
          transcript: run.artifacts.round1Transcript ?? [],
          requestIds: [
            ...(run.artifacts.extractRequestIds ?? []),
            ...(run.artifacts.round1RequestIds ?? [])
          ]
        });
        run.artifacts.round1 = round1;
        run.artifacts.repairHints = flattenViolationHints(round1);
        run.stage = "simulating_round2";
        run.progress = 65;
        touch(run);
        return run;
      }

      case "simulating_round2": {
        const dialogue = await runDialogue({
          policy: run.input.policy,
          caseInput: {
            ...run.input.caseInput,
            seed: (run.input.caseInput.seed ?? 1) + 1
          },
          repairHints: run.artifacts.repairHints ?? [],
          simulateUserTurn: (transcript) =>
            simulateUserTurn({
              caseInput: run.input.caseInput,
              transcript
            })
        });
        run.artifacts.round2Transcript = dialogue.transcript;
        run.artifacts.round2RequestIds = dialogue.requestIds;
        run.stage = "evaluating_round2";
        run.progress = 82;
        touch(run);
        return run;
      }

      case "evaluating_round2": {
        const constraints = requireConstraints(run);
        const round1 = requireRound(run.artifacts.round1, "round1");
        const round2 = await evaluateDialogue({
          case_id: run.input.caseInput.case_id,
          policy: run.input.policy,
          constraints,
          transcript: run.artifacts.round2Transcript ?? [],
          requestIds: run.artifacts.round2RequestIds ?? []
        });
        run.artifacts.round2 = round2;
        run.artifacts.result = {
          case_id: run.input.caseInput.case_id,
          round1,
          round2,
          delta_report: diffReports(round1, round2)
        };
        run.stage = "done";
        run.status = "done";
        run.progress = 100;
        touch(run);
        return run;
      }

      case "done":
      case "failed":
        return run;
    }
  } catch (error) {
    run.status = "failed";
    run.stage = "failed";
    run.error = error instanceof Error ? error.message : "Unknown run error.";
    touch(run);
    return run;
  }
}

function requireConstraints(run: RunRecord) {
  if (!run.artifacts.constraints?.length) {
    throw new Error("Run has no constraints.");
  }
  return run.artifacts.constraints;
}

function requireRound(round: EvalReport | undefined, name: string) {
  if (!round) {
    throw new Error(`Run has no ${name} report.`);
  }
  return round;
}

function flattenViolationHints(report: EvalReport) {
  return report.turns
    .flatMap((turn) => turn.violations)
    .map(
      (violation) =>
        `${violation.rule_id} turn ${violation.turn_id}: ${violation.reason} Evidence: ${violation.evidence}`
    );
}

function touch(run: RunRecord) {
  run.updatedAt = new Date().toISOString();
  store().set(run.id, run);
}
