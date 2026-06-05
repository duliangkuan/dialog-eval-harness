import { extractJsonObject } from "./json";
import { callModel } from "./model-client";
import { CaseInput, DialogueTurn, PersonaId } from "./types";

const personaPrompts: Record<PersonaId, string> = {
  rush_rider: "急单骑手：非常赶时间，回答短，容易打断，但被合理追问时会给核心信息。",
  conflict: "信息矛盾型：会说错、翻供、否认早先信息，被严谨追问时才澄清。",
  tangent: "绕话题骑手：会抱怨平台规则、押金和收入，容易跑题。",
  hostile: "情绪激动型：如果 Agent 重复、敷衍或承诺不清，会从不耐烦升级到投诉或挂断。",
  low_comprehension: "低理解力用户：经常说听不懂、什么意思，需要更简单复述。"
};

export async function simulateUserTurn(input: {
  caseInput: CaseInput;
  transcript: DialogueTurn[];
}): Promise<{ turn: DialogueTurn; requestId: string }> {
  const { caseInput, transcript } = input;
  const nextTurnId = transcript.length + 1;

  if (process.env.SCRIPTED_DIALOGUE === "true") {
    return {
      requestId: `scripted_user_${Date.now()}`,
      turn: {
        turn_id: nextTurnId,
        speaker: "user",
        text: scriptedUserText(caseInput.persona, transcript.length),
        meta: {
          emotion: caseInput.persona === "hostile" ? "impatient" : "neutral",
          behavior: caseInput.persona === "conflict" ? "contradiction" : "goal_answer",
          persona: caseInput.persona,
          provider: "scripted"
        }
      }
    };
  }

  const result = await callModel(
    [
      {
        role: "system",
        content: `You are a User Simulator for a Meituan outbound-call eval. Respond as the called rider/user, not as an assistant.

Persona:
${personaPrompts[caseInput.persona]}

Hard constraints:
- Preserve the task goal. Do not make the conversation meaningless.
- If reasonably asked, reveal core facts after limited resistance.
- Keep each utterance natural for phone calls, usually under 30 Chinese characters.
- Return strict JSON only.`
      },
      {
        role: "user",
        content: `Case:
${JSON.stringify(caseInput, null, 2)}

Transcript:
${JSON.stringify(transcript, null, 2)}

Now simulate the next user utterance. Return:
{
  "text": "...",
  "emotion": "neutral|impatient|hostile|hang_up",
  "behavior": "short_answer|tangent|impatience|contradiction|low_comprehension|goal_answer"
}`
      }
    ],
    { responseFormat: "json_object", temperature: 0.7, maxTokens: 700 }
  );

  const parsed = extractJsonObject(result.content) as {
    text?: string;
    emotion?: string;
    behavior?: string;
  };

  return {
    requestId: result.requestId,
    turn: {
      turn_id: nextTurnId,
      speaker: "user",
      text: parsed.text || "我不太清楚，你再说一遍。",
      meta: {
        emotion: parsed.emotion || "neutral",
        behavior: parsed.behavior || "goal_answer",
        persona: caseInput.persona
      }
    }
  };
}

function scriptedUserText(persona: PersonaId, turnCount: number) {
  if (persona === "hostile") {
    return turnCount > 2 ? "你们别一直问，我要投诉了。" : "是我，都超时了你们到底送不送？";
  }
  if (persona === "conflict") {
    return turnCount > 2 ? "我刚才说错了，是 T3，不是 T2。" : "对，我在 T2。";
  }
  if (persona === "low_comprehension") {
    return "啊？什么意思，你再说一遍。";
  }
  if (persona === "tangent") {
    return "你们平台派单也太不公平了。";
  }
  return "是我，快点说，我在路上。";
}
