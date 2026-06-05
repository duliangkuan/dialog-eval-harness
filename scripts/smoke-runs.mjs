const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const apiKey = process.env.APP_API_KEY;
const headers = {
  "Content-Type": "application/json",
  ...(apiKey ? { "x-api-key": apiKey } : {})
};

let response = await fetch(`${baseUrl}/api/runs`, {
  method: "POST",
  headers,
  body: JSON.stringify({
    policy:
      "拨通后先核实是否本人；如果超时超过 15 分钟，询问原因并记录工单；不能承诺赔付；如果对方情绪激动，转人工；通话不超过 90 秒；结束前必须复述预计送达时间。",
    constraints: [
      { rule_id: "R01", desc: "拨通后先核实是否本人", category: "必做项+顺序", severity: 3, verifier: "rule_based" },
      { rule_id: "R03", desc: "不能承诺赔付", category: "禁做项", severity: 5, verifier: "hybrid", veto: true }
    ],
    caseInput: {
      case_id: "SMOKE-RUN-001",
      scenario: "配送异常外呼",
      task: "骑手超时 21 分钟，需确认原因并给出预计送达时间。",
      persona: "hostile",
      facts: {
        order_id: "MT827163",
        timeout_minutes: 21,
        eta: "18:42"
      },
      max_turns: 2,
      seed: 1
    }
  })
});

let run = await response.json();
if (!response.ok) {
  console.error(JSON.stringify(run, null, 2));
  process.exit(1);
}

for (let i = 0; i < 8 && run.status !== "done" && run.status !== "failed"; i += 1) {
  response = await fetch(`${baseUrl}/api/runs/${run.id}/advance`, {
    method: "POST",
    headers: apiKey ? { "x-api-key": apiKey } : {}
  });
  run = await response.json();
  console.log(`${run.id} ${run.stage} ${run.progress}%`);
  if (!response.ok) {
    console.error(JSON.stringify(run, null, 2));
    process.exit(1);
  }
}

console.log(JSON.stringify({
  id: run.id,
  status: run.status,
  stage: run.stage,
  progress: run.progress,
  summary: run.artifacts?.result?.delta_report?.summary
}, null, 2));

if (run.status !== "done") {
  process.exit(1);
}
