import { assertApiKey, errorStatus, jsonError, jsonOk } from "@/lib/backend/http";
import { advanceRun } from "@/lib/backend/runs";

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
    const run = await advanceRun(runId);
    return jsonOk(run);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "Unknown error.", errorStatus(error));
  }
}
