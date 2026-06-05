import { extractConstraints } from "@/lib/backend/constraints";
import { assertApiKey, errorStatus, jsonError, jsonOk, readJson } from "@/lib/backend/http";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  policy?: string;
};

export async function POST(request: Request) {
  try {
    assertApiKey(request);
    const body = await readJson<Body>(request);
    if (!body.policy) return jsonError("policy is required.");

    const result = await extractConstraints(body.policy);
    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}
