import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function jsonError(message: string, status = 400, details?: unknown) {
  return NextResponse.json(
    {
      error: {
        message,
        details
      }
    },
    { status }
  );
}

export async function readJson<T>(request: Request): Promise<T> {
  try {
    return (await request.json()) as T;
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

export function assertApiKey(request: Request) {
  const expected = process.env.APP_API_KEY;
  if (!expected) return;

  const actual = request.headers.get("x-api-key");
  if (actual !== expected) {
    const error = new Error("Unauthorized. Provide a valid x-api-key header.");
    error.name = "UnauthorizedError";
    throw error;
  }
}

export function errorStatus(error: unknown) {
  if (error instanceof Error && error.name === "UnauthorizedError") return 401;
  return 400;
}
