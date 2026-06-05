import { assertApiKey, errorStatus, jsonError, jsonOk, readJson } from "@/lib/backend/http";
import { simulateUserTurn } from "@/lib/backend/simulator";
import { CaseInput, DialogueTurn } from "@/lib/backend/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type Body = {
  caseInput?: CaseInput;
  transcript?: DialogueTurn[];
};

export async function POST(request: Request) {
  try {
    assertApiKey(request);
    const body = await readJson<Body>(request);
    if (!body.caseInput) return jsonError("caseInput is required.");

    const result = await simulateUserTurn({
      caseInput: body.caseInput,
      transcript: body.transcript ?? []
    });

    return jsonOk(result);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}
