const baseUrl = process.env.APP_URL ?? "http://localhost:3000";
const apiKey = process.env.APP_API_KEY;

const response = await fetch(`${baseUrl}/api/harness/run`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...(apiKey ? { "x-api-key": apiKey } : {})
  },
  body: JSON.stringify({
    policy:
      "拨通后先核实是否本人；如果超时超过 15 分钟，询问原因并记录工单；不能承诺赔付；如果对方情绪激动，转人工；通话不超过 90 秒；结束前必须复述预计送达时间。",
    caseInput: {
      case_id: "SMOKE-001",
      scenario: "配送异常外呼",
      task: "骑手超时 21 分钟，需确认原因并给出预计送达时间。",
      persona: "hostile",
      facts: {
        order_id: "MT827163",
        timeout_minutes: 21,
        eta: "18:42"
      },
      max_turns: 4,
      seed: 1
    }
  })
});

const data = await response.json();
if (!response.ok) {
  console.error(JSON.stringify(data, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      case_id: data.case_id,
      round1: data.round1?.aggregate,
      round2: data.round2?.aggregate,
      delta_report: data.delta_report
    },
    null,
    2
  )
);
