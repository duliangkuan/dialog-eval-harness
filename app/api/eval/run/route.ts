import { evaluateDialogue } from "@/lib/backend/evaluator";
import { assertApiKey, errorStatus, jsonError, jsonOk, readJson } from "@/lib/backend/http";
import { Constraint, DialogueTurn } from "@/lib/backend/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  case_id?: string;
  policy?: string;
  constraints?: Constraint[];
  transcript?: DialogueTurn[];
};

export async function POST(request: Request) {
  try {
    assertApiKey(request);
    const body = await readJson<Body>(request);
    if (!body.case_id) return jsonError("case_id is required.");
    if (!body.policy) return jsonError("policy is required.");
    if (!body.constraints?.length) return jsonError("constraints is required.");
    if (!body.transcript?.length) return jsonError("transcript is required.");

    const report = await evaluateDialogue({
      case_id: body.case_id,
      policy: body.policy,
      constraints: body.constraints,
      transcript: body.transcript
    });

    return jsonOk(report);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}
