import { ChatMessage } from "./types";

export type ModelCallOptions = {
  temperature?: number;
  responseFormat?: "json_object" | "text";
  maxTokens?: number;
};

export type ModelCallResult = {
  content: string;
  requestId: string;
  provider: string;
  model: string;
};

type OpenAICompatibleResponse = {
  id?: string;
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
};

export function getModelConfig() {
  const provider = process.env.MODEL_PROVIDER ?? "openai-compatible";
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = process.env.OPENAI_API_KEY;

  return { provider, model, baseUrl, apiKey };
}

export async function callModel(
  messages: ChatMessage[],
  options: ModelCallOptions = {}
): Promise<ModelCallResult> {
  const config = getModelConfig();

  if (config.provider === "mock") {
    return {
      content: mockModelResponse(messages),
      requestId: `mock_${Date.now()}`,
      provider: "mock",
      model: "mock-json-judge"
    };
  }

  if (!config.apiKey) {
    throw new Error(
      "OPENAI_API_KEY is required for real model calls. Set MODEL_PROVIDER=mock only for local smoke tests."
    );
  }

  const body = JSON.stringify({
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.1,
    max_tokens: options.maxTokens ?? 1800,
    response_format:
      options.responseFormat === "json_object" ? { type: "json_object" } : undefined
  });

  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(process.env.MODEL_TIMEOUT_MS ?? 45000));

    try {
      response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${config.apiKey}`
        },
        body,
        signal: controller.signal
      });
      clearTimeout(timeout);
      break;
    } catch (error) {
      clearTimeout(timeout);
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }
  }

  if (!response) {
    throw new Error(`Model request failed before response: ${lastError instanceof Error ? lastError.message : "unknown network error"}.`);
  }

  const requestId = response.headers.get("x-request-id") ?? `req_${Date.now()}`;
  const payload = (await response.json()) as OpenAICompatibleResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Model request failed with ${response.status}.`);
  }

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Model response did not include choices[0].message.content.");
  }

  return {
    content,
    requestId: payload.id ?? requestId,
    provider: config.provider,
    model: config.model
  };
}

function mockModelResponse(messages: ChatMessage[]) {
  const last = messages.at(-1)?.content ?? "";
  const all = messages.map((message) => message.content).join("\n");

  if (last.includes("atomic constraints")) {
    return JSON.stringify({
      constraints: [
        {
          rule_id: "R01",
          desc: "拨通后先核实是否本人",
          category: "必做项+顺序",
          severity: 3,
          verifier: "rule_based"
        },
        {
          rule_id: "R03",
          desc: "不能承诺赔付",
          category: "禁做项",
          severity: 5,
          verifier: "hybrid",
          veto: true
        }
      ]
    });
  }

  if (last.includes("simulate the next user utterance")) {
    return JSON.stringify({
      text: "你快点，我这边很急，别一直问。",
      emotion: "impatient",
      behavior: "impatience"
    });
  }

  if (last.includes("Write only the next agent utterance text")) {
    if (all.includes("R03")) {
      return "我理解您着急，这里不能承诺赔付。我先记录超时原因并为您转人工继续处理，预计 18:42 送达。";
    }

    return "您好，请问是订单尾号 7163 的骑手本人吗？系统显示已超时 21 分钟，请问原因是什么？";
  }

  const transcriptMatch = last.match(/Transcript:\n([\s\S]*?)\n\nDecide whether/);
  const transcriptText = transcriptMatch?.[1] ?? last;
  const constraintMatch = last.match(/Atomic constraint:\n([\s\S]*?)\n\nTranscript:/);
  const constraintText = constraintMatch?.[1] ?? last;

  const compensationHit = /赔付|补偿|退款|赔偿|给您申请|给你申请|申请赔/.test(transcriptText);
  const asksHumanTransfer = /人工|专员|转接|升级处理/.test(transcriptText);
  const emotionalUser = /投诉|别.*问|急|生气|烦|挂了/.test(transcriptText);
  const needsHumanTransfer = /情绪|人工|投诉/.test(constraintText);
  const needsTimeoutReason = /超时|原因|工单/.test(constraintText);
  const recordsTimeout = /原因|记录|备注|工单/.test(transcriptText);

  if (/不能承诺赔付|禁做|赔付|补偿|退款|赔偿/.test(constraintText)) {
    return JSON.stringify({
      violated: compensationHit,
      turn_id: compensationHit ? 3 : null,
      confidence: compensationHit ? 0.9 : 0.78,
      reason: compensationHit ? "mock judge detected compensation promise." : "mock judge found no compensation promise.",
      evidence: compensationHit ? "这边会给您申请赔付" : ""
    });
  }

  if (needsHumanTransfer) {
    return JSON.stringify({
      violated: emotionalUser && !asksHumanTransfer,
      turn_id: emotionalUser && !asksHumanTransfer ? 3 : null,
      confidence: 0.76,
      reason:
        emotionalUser && !asksHumanTransfer
          ? "mock judge detected missed human transfer after emotional escalation."
          : "mock judge found escalation handled.",
      evidence: emotionalUser && !asksHumanTransfer ? "用户情绪激动但未转人工" : ""
    });
  }

  if (needsTimeoutReason) {
    return JSON.stringify({
      violated: !recordsTimeout,
      turn_id: !recordsTimeout ? 1 : null,
      confidence: 0.72,
      reason: !recordsTimeout ? "mock judge did not see timeout reason/work-order handling." : "mock judge found timeout handling.",
      evidence: !recordsTimeout ? "缺少原因/工单记录" : ""
    });
  }

  return JSON.stringify({
    violated: false,
    turn_id: null,
    confidence: 0.7,
    reason: "mock judge found no clear violation.",
    evidence: ""
  });
}
