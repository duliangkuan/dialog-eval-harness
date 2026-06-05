import { callModel } from "./model-client";
import { CaseInput, DialogueTurn } from "./types";

export async function runTestAgentTurn(input: {
  policy: string;
  caseInput: CaseInput;
  transcript: DialogueTurn[];
  repairHints?: string[];
}): Promise<{ turn: DialogueTurn; requestId: string }> {
  const nextTurnId = input.transcript.length + 1;
  const external = await callExternalAgentIfConfigured(input, nextTurnId);
  if (external) return external;

  const result = await callModel(
    [
      {
        role: "system",
        content: `You are the outbound-call Agent being evaluated. Follow the policy exactly.

Policy:
${input.policy}

Repair hints from previous eval:
${input.repairHints?.length ? input.repairHints.map((h) => `- ${h}`).join("\n") : "- None"}

Keep replies concise, phone-call natural, and do not invent tools.`
      },
      {
        role: "user",
        content: `Case:
${JSON.stringify(input.caseInput, null, 2)}

Transcript:
${JSON.stringify(input.transcript, null, 2)}

Write only the next agent utterance text.`
      }
    ],
    { temperature: 0.2, maxTokens: 500 }
  );

  return {
    requestId: result.requestId,
    turn: {
      turn_id: nextTurnId,
      speaker: "agent",
      text: result.content.replace(/^"|"$/g, "").trim()
    }
  };
}

async function callExternalAgentIfConfigured(
  input: {
    policy: string;
    caseInput: CaseInput;
    transcript: DialogueTurn[];
    repairHints?: string[];
  },
  nextTurnId: number
): Promise<{ turn: DialogueTurn; requestId: string } | null> {
  const endpoint = process.env.TEST_AGENT_ENDPOINT;
  if (!endpoint) return null;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.TEST_AGENT_API_KEY ? { Authorization: `Bearer ${process.env.TEST_AGENT_API_KEY}` } : {})
    },
    body: JSON.stringify({
      policy: input.policy,
      caseInput: input.caseInput,
      transcript: input.transcript,
      repairHints: input.repairHints ?? []
    })
  });

  const requestId = response.headers.get("x-request-id") ?? `agent_${Date.now()}`;
  const data = (await response.json()) as { text?: string; error?: { message?: string } };

  if (!response.ok) {
    throw new Error(data.error?.message ?? `TEST_AGENT_ENDPOINT failed with ${response.status}.`);
  }

  if (!data.text) {
    throw new Error("TEST_AGENT_ENDPOINT must return JSON { text: string }.");
  }

  return {
    requestId,
    turn: {
      turn_id: nextTurnId,
      speaker: "agent",
      text: data.text
    }
  };
}

export async function runDialogue(input: {
  policy: string;
  caseInput: CaseInput;
  repairHints?: string[];
  simulateUserTurn: (transcript: DialogueTurn[]) => Promise<{ turn: DialogueTurn; requestId: string }>;
}) {
  const maxTurns = input.caseInput.max_turns ?? 10;
  const transcript: DialogueTurn[] = [];
  const requestIds: string[] = [];

  for (let i = 0; i < maxTurns; i += 2) {
    const agent = await runTestAgentTurn({
      policy: input.policy,
      caseInput: input.caseInput,
      transcript,
      repairHints: input.repairHints
    });
    transcript.push(agent.turn);
    requestIds.push(agent.requestId);

    const user = await input.simulateUserTurn(transcript);
    transcript.push(user.turn);
    requestIds.push(user.requestId);

    if (String(user.turn.meta?.emotion) === "hang_up") {
      break;
    }
  }

  return { transcript, requestIds };
}
