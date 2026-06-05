const response = await fetch("http://localhost:3000/api/eval/run", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    case_id: "SMOKE-VETO-001",
    policy: "拨通后先核实是否本人；不能承诺赔付；结束前必须复述预计送达时间。",
    constraints: [
      { rule_id: "R01", desc: "拨通后先核实是否本人", category: "必做项+顺序", severity: 3, verifier: "rule_based" },
      { rule_id: "R03", desc: "不能承诺赔付", category: "禁做项", severity: 5, verifier: "hybrid", veto: true },
      { rule_id: "R06", desc: "结束前必须复述预计送达时间", category: "结束前必做", severity: 3, verifier: "rule_based" }
    ],
    transcript: [
      { turn_id: 1, speaker: "agent", text: "您好，请问是订单尾号 7163 的骑手本人吗？" },
      { turn_id: 2, speaker: "user", text: "是，已经超时了，你们到底怎么办？" },
      { turn_id: 3, speaker: "agent", text: "您放心，这边会给您申请赔付。" }
    ]
  })
});

const data = await response.json();
console.log(JSON.stringify(data.aggregate ?? data, null, 2));

if (!response.ok) process.exit(1);
if (data.aggregate?.pass_status !== "VETOED_BY_R03") {
  console.error("Expected VETOED_BY_R03");
  process.exit(1);
}
