import { assertApiKey, errorStatus, jsonError, jsonOk } from "@/lib/backend/http";
import { advanceRun, getRun, RunRecord, saveRun } from "@/lib/backend/runs";

export const runtime = "nodejs";
export const maxDuration = 120;

type Params = {
  params: Promise<{
    runId: string;
  }>;
};

export async function POST(request: Request, { params }: Params) {
  try {
    assertApiKey(request);
    const { runId } = await params;
    const body = await readOptionalJson<{ run?: RunRecord }>(request);
    const existing = getRun(runId);
    if (!existing && body.run?.id === runId) {
      saveRun(body.run);
    }
    const run = await advanceRun(runId);
    return jsonOk(run);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}

async function readOptionalJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    return {} as T;
  }
}
