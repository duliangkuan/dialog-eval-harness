export type Role = "system" | "user" | "assistant";

export type ChatMessage = {
  role: Role;
  content: string;
};

export type VerifierType = "rule_based" | "llm_judge" | "hybrid";

export type Constraint = {
  rule_id: string;
  desc: string;
  category: string;
  severity: 1 | 2 | 3 | 4 | 5;
  verifier: VerifierType;
  veto?: boolean;
  reference_examples?: string[];
};

export type PersonaId =
  | "rush_rider"
  | "conflict"
  | "tangent"
  | "hostile"
  | "low_comprehension";

export type CaseInput = {
  case_id: string;
  scenario: string;
  task: string;
  persona: PersonaId;
  facts: Record<string, string | number | boolean>;
  max_turns?: number;
  seed?: number;
};

export type DialogueTurn = {
  turn_id: number;
  speaker: "user" | "agent";
  text: string;
  meta?: Record<string, unknown>;
};

export type Violation = {
  rule_id: string;
  turn_id: number;
  severity: number;
  confidence: number;
  reason: string;
  evidence: string;
  deduction: number | "VETO";
  verifier: VerifierType;
};

export type EvalReport = {
  case_id: string;
  constraints: Constraint[];
  turns: Array<
    DialogueTurn & {
      violations: Violation[];
    }
  >;
  aggregate: {
    total_score: number;
    pass_status: "PASSED" | "FAILED" | `VETOED_BY_${string}`;
    critical_turn: number | null;
    veto_triggered: string[];
    failure_category: string[];
    stability_metric: {
      pass_at_k: number;
      pass_pow_k: number;
      reliability_ratio: number;
    };
  };
  model_trace: {
    provider: string;
    model: string;
    request_ids: string[];
  };
};

export type HarnessResult = {
  case_id: string;
  round1: EvalReport;
  round2: EvalReport;
  delta_report: {
    fixed_violations: number;
    regressed_violations: number;
    unchanged_violations: number;
    net_improvement: number;
    summary: string;
  };
};
