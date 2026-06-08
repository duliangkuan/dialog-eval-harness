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

// ===========================================
// 产品需求新增类型
// ===========================================

export type IntentStatus = "active" | "draft" | "archived";

export type Intent = {
  id: string;
  name: string;
  desc: string;
  versions: number;
  activeVersion: string;
  updatedAt: string;
  status: IntentStatus;
  createdAt: string;
};

export type IntentVersion = {
  id: string;
  intentId: string;
  name: string;
  systemPrompt: string;
  status: "active" | "draft";
  updatedAt: string;
  updater: string;
  createdAt: string;
  includedIntentIds?: string[];
};

export type TestSetSource = "csv" | "auto_generated" | "manual";

export type TestSet = {
  id: string;
  name: string;
  cases: number;
  source: TestSetSource;
  createdAt: string;
  updater: string;
  testCases?: TestCase[];
  csvContent?: string;
  intentId?: string;
};

export type TestCase = {
  id: string;
  testSetId: string;
  dialogueContext: string;
  currentQuery: string;
  expectedIntent: string;
  expectedOutput?: string;
  metadata?: Record<string, unknown>;
};

export type EvaluatorType = "LLM as a judge" | "规则" | "自定义";
export type EvaluatorOutputType = "分数" | "对/错" | "评价内容";
export type EvaluatorCategory = "安全性" | "质量" | "对话" | "自定义";

export type Evaluator = {
  id: string;
  name: string;
  type: EvaluatorType;
  outputType: EvaluatorOutputType;
  category: EvaluatorCategory;
  targetIntentId?: string; // 'all' or specific intent id
  builtin: boolean;
  systemPrompt?: string;
  modelId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ModelProvider = "OpenAI" | "Anthropic" | "DeepSeek" | "其他";
export type ModelStatus = "正常" | "异常" | "未验证";

export type ModelConfig = {
  id: string;
  name: string;
  provider: ModelProvider;
  apiKey: string;
  baseUrl?: string;
  status: ModelStatus;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
};

export type ExperimentStatus = "pending" | "running" | "completed" | "failed";

export type Experiment = {
  id: string;
  topic: string;
  testSetId: string;
  intentVersionIds: string[];
  evaluatorIds: string[];
  modelId: string;
  status: ExperimentStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  duration?: string;
  result?: ExperimentResult;
  createdAt: string;
};

export type ExperimentResult = {
  totalCases: number;
  passedCases: number;
  failedCases: number;
  totalScore: number;
  caseResults: CaseResult[];
  metrics: {
    recall: number;
    precision: number;
    accuracy?: number;
    f1?: number;
  };
};

export type CaseResult = {
  caseId: string;
  passed: boolean;
  score?: number;
  evaluatorResults: Record<string, EvaluatorResult>;
  transcript?: DialogueTurn[];
};

export type EvaluatorResult = {
  evaluatorId: string;
  output: number | boolean | string;
  confidence?: number;
  reasoning?: string;
};

export type EvalResultDetail = {
  intentId: string;
  name: string;
  realCount: number;
  recall: number;
  predictCount: number;
  precision: number;
};
