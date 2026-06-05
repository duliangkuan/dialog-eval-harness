"use client";

import { useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Braces,
  CheckCircle2,
  FileJson2,
  Loader2,
  Network,
  Play,
  Shield,
  TerminalSquare
} from "lucide-react";

const defaultPolicy =
  "拨通后先核实是否本人；如果超时超过 15 分钟，询问原因并记录工单；不能承诺赔付；如果对方情绪激动，转人工；通话不超过 90 秒；结束前必须复述预计送达时间。";

const defaultCase = {
  case_id: "CASE-DEMO-001",
  scenario: "配送异常外呼",
  task: "骑手超时 21 分钟，用户催促，需确认原因并给出预计送达时间。",
  persona: "hostile",
  facts: {
    order_id: "MT827163",
    timeout_minutes: 21,
    eta: "18:42",
    rider_location: "望京 SOHO T3"
  },
  max_turns: 4,
  seed: 7
};

const defaultConstraints = [
  { rule_id: "R01", desc: "拨通后先核实是否本人", category: "必做项+顺序", severity: 3, verifier: "rule_based" },
  { rule_id: "R02", desc: "超时超过 15 分钟时询问原因并记录工单", category: "条件分支", severity: 4, verifier: "hybrid" },
  { rule_id: "R03", desc: "不能承诺赔付", category: "禁做项", severity: 5, verifier: "hybrid", veto: true },
  { rule_id: "R04", desc: "对方情绪激动时转人工", category: "触发终止", severity: 5, verifier: "llm_judge" },
  { rule_id: "R05", desc: "通话不超过 90 秒", category: "时长上限", severity: 2, verifier: "rule_based" },
  { rule_id: "R06", desc: "结束前必须复述预计送达时间", category: "结束前必做", severity: 3, verifier: "rule_based" }
] as const;

type ApiState = {
  status: "idle" | "loading" | "success" | "error";
  data?: unknown;
  error?: string;
  runId?: string;
  stage?: string;
  progress?: number;
};

export function CommandCenter() {
  const [policy, setPolicy] = useState(defaultPolicy);
  const [caseJson, setCaseJson] = useState(JSON.stringify(defaultCase, null, 2));
  const [apiKey, setApiKey] = useState("");
  const [state, setState] = useState<ApiState>({ status: "idle" });
  const [activeTab, setActiveTab] = useState<"harness" | "api" | "veto" | "trace">("harness");

  const parsedCase = useMemo(() => {
    try {
      return { ok: true as const, value: JSON.parse(caseJson) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Invalid JSON" };
    }
  }, [caseJson]);

  async function runHarness() {
    if (!parsedCase.ok) {
      setState({ status: "error", error: parsedCase.error });
      return;
    }

    setState({ status: "loading", stage: "creating_run", progress: 0 });

    try {
      const createResponse = await fetch("/api/runs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "x-api-key": apiKey } : {})
        },
        body: JSON.stringify({
          policy,
          caseInput: parsedCase.value,
          constraints: policy.trim() === defaultPolicy ? defaultConstraints : undefined
        })
      });

      let run = await createResponse.json();
      if (!createResponse.ok) {
        throw new Error(run?.error?.message ?? `HTTP ${createResponse.status}`);
      }

      setState({
        status: "loading",
        runId: run.id,
        stage: run.stage,
        progress: run.progress,
        data: run
      });

      for (let step = 0; step < 8 && run.status !== "done" && run.status !== "failed"; step += 1) {
        const advanceResponse = await fetch(`/api/runs/${run.id}/advance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            ...(apiKey ? { "x-api-key": apiKey } : {})
          },
          body: JSON.stringify({ run })
        });

        run = await advanceResponse.json();
        if (!advanceResponse.ok) {
          throw new Error(run?.error?.message ?? `HTTP ${advanceResponse.status}`);
        }

        setState({
          status: run.status === "done" ? "success" : run.status === "failed" ? "error" : "loading",
          runId: run.id,
          stage: run.stage,
          progress: run.progress,
          data: run,
          error: run.error
        });

        if (run.status === "failed") {
          throw new Error(run.error ?? "Run failed.");
        }
      }
    } catch (error) {
      setState({ status: "error", error: error instanceof Error ? error.message : "Unknown error" });
    }
  }

  const runData = state.data as
    | {
        artifacts?: {
          result?: {
            round1?: { aggregate?: { total_score?: number; pass_status?: string; critical_turn?: number } };
            round2?: { aggregate?: { total_score?: number; pass_status?: string; critical_turn?: number } };
            delta_report?: {
              fixed_violations?: number;
              regressed_violations?: number;
              net_improvement?: number;
              summary?: string;
            };
          };
        };
      }
    | undefined;
  const result = runData?.artifacts?.result as
    | {
        round1?: { aggregate?: { total_score?: number; pass_status?: string; critical_turn?: number } };
        round2?: { aggregate?: { total_score?: number; pass_status?: string; critical_turn?: number } };
        delta_report?: {
          fixed_violations?: number;
          regressed_violations?: number;
          net_improvement?: number;
          summary?: string;
        };
      }
    | undefined;

  return (
    <main className="shell">
      <aside className="rail">
        <div className="brand">
          <div className="brandMark">评</div>
          <div>
            <strong>外呼评测作战台</strong>
            <span>Backend-first build</span>
          </div>
        </div>
        <nav>
          <button className={activeTab === "harness" ? "active" : ""} onClick={() => setActiveTab("harness")}>
            <TerminalSquare size={18} /> Harness
          </button>
          <button className={activeTab === "api" ? "active" : ""} onClick={() => setActiveTab("api")}>
            <Network size={18} /> API Routes
          </button>
          <button className={activeTab === "veto" ? "active" : ""} onClick={() => setActiveTab("veto")}>
            <Shield size={18} /> VETO Guard
          </button>
          <button className={activeTab === "trace" ? "active" : ""} onClick={() => setActiveTab("trace")}>
            <Activity size={18} /> Trace
          </button>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Meituan AI Hackathon</p>
            <h1>复杂指令多轮对话评测后端控制台</h1>
          </div>
          <button className="runButton" onClick={runHarness} disabled={state.status === "loading"}>
            {state.status === "loading" ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            Run Harness
          </button>
        </header>

        <section className="statusGrid">
          <Metric icon={<Braces />} label="API" value="5 routes" />
          <Metric icon={<Shield />} label="Auth" value="x-api-key" />
          <Metric icon={<AlertTriangle />} label="VETO" value="enabled" />
          <Metric icon={<CheckCircle2 />} label="Deploy" value="Vercel" />
        </section>

        {activeTab === "harness" && (
          <HarnessPanel
            policy={policy}
            setPolicy={setPolicy}
            caseJson={caseJson}
            setCaseJson={setCaseJson}
            apiKey={apiKey}
            setApiKey={setApiKey}
            parsedCaseOk={parsedCase.ok}
            state={state}
            result={result}
          />
        )}
        {activeTab === "api" && <ApiPanel />}
        {activeTab === "veto" && <VetoPanel />}
        {activeTab === "trace" && <TracePanel data={state.data} />}
      </section>
    </main>
  );
}

function HarnessPanel({
  policy,
  setPolicy,
  caseJson,
  setCaseJson,
  apiKey,
  setApiKey,
  parsedCaseOk,
  state,
  result
}: {
  policy: string;
  setPolicy: (value: string) => void;
  caseJson: string;
  setCaseJson: (value: string) => void;
  apiKey: string;
  setApiKey: (value: string) => void;
  parsedCaseOk: boolean;
  state: ApiState;
  result:
    | {
        round1?: { aggregate?: { total_score?: number; pass_status?: string; critical_turn?: number } };
        round2?: { aggregate?: { total_score?: number; pass_status?: string; critical_turn?: number } };
        delta_report?: {
          fixed_violations?: number;
          regressed_violations?: number;
          net_improvement?: number;
          summary?: string;
        };
      }
    | undefined;
}) {
  return (
    <section className="panels">
      <div className="panel editor">
        <div className="panelHead">
          <h2>Policy</h2>
          <span>business instruction</span>
        </div>
        <textarea value={policy} onChange={(event) => setPolicy(event.target.value)} />

        <div className="panelHead smallHead">
          <h2>Case JSON</h2>
          <span>{parsedCaseOk ? "valid" : "invalid"}</span>
        </div>
        <textarea className="caseArea" value={caseJson} onChange={(event) => setCaseJson(event.target.value)} />
        <input
          className="apiInput"
          placeholder="x-api-key, only needed when APP_API_KEY is set"
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
        />
      </div>

      <div className="panel output">
        <div className="panelHead">
          <h2>Harness Result</h2>
          <span>{state.stage ?? state.status}</span>
        </div>

        {state.status === "idle" && <EmptyState />}
        {state.status === "loading" && <LoadingState stage={state.stage} progress={state.progress} runId={state.runId} />}
        {state.status === "error" && <pre className="errorBox">{state.error}</pre>}
        {state.status === "success" && (
          <>
            <div className="resultCards">
              <ResultCard title="Round 1" score={result?.round1?.aggregate?.total_score} status={result?.round1?.aggregate?.pass_status} />
              <ResultCard title="Round 2" score={result?.round2?.aggregate?.total_score} status={result?.round2?.aggregate?.pass_status} />
              <ResultCard title="Fixed" score={result?.delta_report?.fixed_violations} status={`regressed ${result?.delta_report?.regressed_violations ?? 0}`} />
            </div>
            <p className="summary">{result?.delta_report?.summary}</p>
            <pre className="jsonBox">{JSON.stringify(state.data, null, 2)}</pre>
          </>
        )}
      </div>
    </section>
  );
}

function ApiPanel() {
  const routes = [
    ["GET", "/api/health", "模型、鉴权、被测 Agent adapter 状态"],
    ["POST", "/api/constraints/extract", "policy 拆解为 atomic constraints"],
    ["POST", "/api/simulator/run", "生成下一轮用户模拟回复"],
    ["POST", "/api/eval/run", "transcript 生成 per-turn 归因报告"],
    ["POST", "/api/runs", "创建任务式 Harness Run"],
    ["GET", "/api/runs/:runId", "查询 Run 状态与阶段产物"],
    ["POST", "/api/runs/:runId/advance", "推进 Run 的下一个阶段"]
  ];

  return (
    <section className="singlePanel">
      <div className="panel">
        <div className="panelHead">
          <h2>API Routes</h2>
          <span>backend contract</span>
        </div>
        <div className="routeList">
          {routes.map(([method, path, desc]) => (
            <div className="routeRow" key={path}>
              <strong>{method}</strong>
              <code>{path}</code>
              <span>{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function VetoPanel() {
  return (
    <section className="singlePanel">
      <div className="panel">
        <div className="panelHead">
          <h2>VETO Guard</h2>
          <span>hard failure policy</span>
        </div>
        <div className="vetoGrid">
          <div>
            <Shield size={34} />
            <h3>禁做项一票否决</h3>
            <p>命中赔付、补偿、退款、赔偿等承诺表达时，报告直接进入 `VETOED_BY_Rxx`，总分置 0。</p>
          </div>
          <div>
            <FileJson2 size={34} />
            <h3>归因输出</h3>
            <p>每条 violation 记录 `rule_id`、`turn_id`、`evidence`、`reason`、`confidence` 与 `deduction`。</p>
          </div>
          <div>
            <AlertTriangle size={34} />
            <h3>已验证</h3>
            <p>`npm run smoke:veto` 已覆盖“这边会给您申请赔付”场景，并正确触发 `VETOED_BY_R03`。</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function TracePanel({ data }: { data?: unknown }) {
  return (
    <section className="singlePanel">
      <div className="panel output">
        <div className="panelHead">
          <h2>Trace</h2>
          <span>latest run payload</span>
        </div>
        {data ? (
          <pre className="jsonBox tall">{JSON.stringify(data, null, 2)}</pre>
        ) : (
          <div className="empty">还没有 Run 结果。先回到 Harness 面板执行一次任务。</div>
        )}
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResultCard({ title, score, status }: { title: string; score?: number; status?: string }) {
  return (
    <div className="resultCard">
      <span>{title}</span>
      <strong>{score ?? "-"}</strong>
      <em>{status ?? "-"}</em>
    </div>
  );
}

function EmptyState() {
  return <div className="empty">配置真实模型环境变量后，点击 Run Harness 执行端到端评测。</div>;
}

function LoadingState({ stage, progress, runId }: { stage?: string; progress?: number; runId?: string }) {
  return (
    <div className="empty">
      <Loader2 className="spin" size={26} />
      <div>
        <strong>{stage ?? "running"}</strong>
        <span className="runMeta">{runId ? `Run ${runId}` : "creating run"}</span>
        <div className="progressTrack">
          <div className="progressFill" style={{ width: `${progress ?? 0}%` }} />
        </div>
        <span className="runMeta">{progress ?? 0}%</span>
      </div>
    </div>
  );
}
