import { jsonOk } from "@/lib/backend/http";
import { getModelConfig } from "@/lib/backend/model-client";

export const runtime = "nodejs";

export async function GET() {
  const config = getModelConfig();

  return jsonOk({
    ok: true,
    service: "meituan-hackathon-eval",
    model: {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      hasApiKey: Boolean(config.apiKey)
    },
    authEnabled: Boolean(process.env.APP_API_KEY)
    ,
    testedAgent: {
      mode: process.env.TEST_AGENT_ENDPOINT ? "external_webhook" : "model_adapter",
      hasEndpoint: Boolean(process.env.TEST_AGENT_ENDPOINT),
      hasApiKey: Boolean(process.env.TEST_AGENT_API_KEY)
    }
  });
}
