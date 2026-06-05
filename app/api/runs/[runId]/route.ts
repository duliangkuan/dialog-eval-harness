import { assertApiKey, errorStatus, jsonError, jsonOk } from "@/lib/backend/http";
import { getRun } from "@/lib/backend/runs";

export const runtime = "nodejs";
export const maxDuration = 30;

type Params = {
  params: Promise<{
    runId: string;
  }>;
};

export async function GET(request: Request, { params }: Params) {
  try {
    assertApiKey(request);
    const { runId } = await params;
    const run = getRun(runId);
    if (!run) return jsonError(`Run not found: ${runId}`, 404);
    return jsonOk(run);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}
