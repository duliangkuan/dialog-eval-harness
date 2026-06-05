import { assertApiKey, errorStatus, jsonError, jsonOk, readJson } from "@/lib/backend/http";
import { createRun, listRuns } from "@/lib/backend/runs";
import { CaseInput, Constraint } from "@/lib/backend/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type Body = {
  policy?: string;
  caseInput?: CaseInput;
  constraints?: Constraint[];
};

export async function GET(request: Request) {
  try {
    assertApiKey(request);
    return jsonOk({ runs: listRuns() });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}

export async function POST(request: Request) {
  try {
    assertApiKey(request);
    const body = await readJson<Body>(request);
    if (!body.policy) return jsonError("policy is required.");
    if (!body.caseInput) return jsonError("caseInput is required.");

    const run = createRun({
      policy: body.policy,
      caseInput: body.caseInput,
      constraints: body.constraints
    });

    return jsonOk(run, { status: 201 });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}
