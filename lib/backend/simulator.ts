import { extractJsonObject } from "./json";
import { callModel } from "./model-client";
import { CaseInput, DialogueTurn, PersonaId } from "./types";

type EmotionState = "neutral" | "impatient" | "hostile" | "hang_up";
type BehaviorType =
  | "short_answer"
  | "tangent"
  | "impatience"
  | "contradiction"
  | "low_comprehension"
  | "goal_answer";

type SimulatorControl = {
  emotion: EmotionState;
  behavior: BehaviorType;
  unresolvedTurns: number;
  repeatedAgentTurns: number;
  emotionTrajectory: EmotionState[];
  shouldRevealCoreFacts: boolean;
};

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
  const control = deriveSimulatorControl(caseInput, transcript);

  if (process.env.SCRIPTED_DIALOGUE === "true") {
    return {
      requestId: `scripted_user_${Date.now()}`,
      turn: {
        turn_id: nextTurnId,
        speaker: "user",
        text: scriptedUserText(caseInput.persona, transcript.length, control),
        meta: {
          emotion: control.emotion,
          behavior: control.behavior,
          persona: caseInput.persona,
          unresolved_turns: control.unresolvedTurns,
          repeated_agent_turns: control.repeatedAgentTurns,
          emotion_trajectory: control.emotionTrajectory,
          should_reveal_core_facts: control.shouldRevealCoreFacts,
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
- Follow this simulator control state exactly:
${JSON.stringify(control, null, 2)}
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
  const emotion = normalizeEmotion(parsed.emotion, control.emotion);
  const behavior = normalizeBehavior(parsed.behavior, control.behavior);

  return {
    requestId: result.requestId,
    turn: {
      turn_id: nextTurnId,
      speaker: "user",
      text: parsed.text || "我不太清楚，你再说一遍。",
      meta: {
        emotion,
        behavior,
        persona: caseInput.persona,
        unresolved_turns: control.unresolvedTurns,
        repeated_agent_turns: control.repeatedAgentTurns,
        emotion_trajectory: [...control.emotionTrajectory.slice(0, -1), emotion],
        should_reveal_core_facts: control.shouldRevealCoreFacts
      }
    }
  };
}

function deriveSimulatorControl(caseInput: CaseInput, transcript: DialogueTurn[]): SimulatorControl {
  const agentTurns = transcript.filter((turn) => turn.speaker === "agent");
  const userTurns = transcript.filter((turn) => turn.speaker === "user");
  const lastAgent = agentTurns.at(-1)?.text ?? "";
  const priorEmotions = userTurns
    .map((turn) => normalizeEmotion(String(turn.meta?.emotion ?? ""), "neutral"))
    .filter((emotion) => emotion !== "hang_up");
  const repeatedAgentTurns = countRepeatedAgentTurns(agentTurns);
  const unresolvedTurns = countUnresolvedTurns(transcript);
  const shouldRevealCoreFacts = userTurns.length >= 2 || /订单|地址|位置|原因|时间|超时|预计/.test(lastAgent);

  let emotion: EmotionState = priorEmotions.at(-1) ?? "neutral";
  if (caseInput.persona === "hostile" && !priorEmotions.length) {
    emotion = "impatient";
  }
  if (repeatedAgentTurns >= 2 || unresolvedTurns >= 2 || /稍等|帮您查|别急|耐心/.test(lastAgent)) {
    emotion = escalateEmotion(emotion);
  }
  if (unresolvedTurns >= 3 || /投诉|赔付|补偿|退款/.test(lastAgent)) {
    emotion = escalateEmotion(emotion);
  }
  if ((emotion === "hostile" && transcript.length >= 8) || /回访|稍后联系|挂/.test(lastAgent)) {
    emotion = "hang_up";
  }

  const behavior = sampleBehavior(caseInput.persona, emotion, transcript.length);
  return {
    emotion,
    behavior,
    unresolvedTurns,
    repeatedAgentTurns,
    emotionTrajectory: [...priorEmotions, emotion],
    shouldRevealCoreFacts
  };
}

function scriptedUserText(persona: PersonaId, turnCount: number, control: SimulatorControl) {
  if (control.emotion === "hang_up") {
    return "不说了，我挂了。";
  }
  if (persona === "hostile") {
    return control.emotion === "hostile" || turnCount > 2
      ? "你们别一直问，我要投诉了。"
      : "是我，都超时了你们到底送不送？";
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

function sampleBehavior(persona: PersonaId, emotion: EmotionState, turnCount: number): BehaviorType {
  if (emotion === "hang_up") return "impatience";
  if (emotion === "hostile" || emotion === "impatient") return "impatience";
  if (persona === "conflict" && turnCount >= 3) return "contradiction";
  if (persona === "tangent" && turnCount % 4 === 1) return "tangent";
  if (persona === "low_comprehension") return "low_comprehension";
  if (persona === "rush_rider") return "short_answer";
  return "goal_answer";
}

function countRepeatedAgentTurns(agentTurns: DialogueTurn[]) {
  const recent = agentTurns.slice(-3).map((turn) => turn.text);
  return recent.filter((text) => /稍等|帮您查|请问|确认|核实/.test(text)).length;
}

function countUnresolvedTurns(transcript: DialogueTurn[]) {
  const recent = transcript.slice(-6);
  const userPressure = recent.filter((turn) => turn.speaker === "user" && /急|投诉|到底|别问|超时|烦/.test(turn.text)).length;
  const agentResolution = recent.filter((turn) => turn.speaker === "agent" && /记录|工单|转人工|预计|已确认|原因/.test(turn.text)).length;
  return Math.max(0, userPressure - agentResolution);
}

function escalateEmotion(emotion: EmotionState): EmotionState {
  if (emotion === "neutral") return "impatient";
  if (emotion === "impatient") return "hostile";
  return emotion;
}

function normalizeEmotion(value: string | undefined, fallback: EmotionState): EmotionState {
  if (value === "neutral" || value === "impatient" || value === "hostile" || value === "hang_up") {
    return value;
  }
  return fallback;
}

function normalizeBehavior(value: string | undefined, fallback: BehaviorType): BehaviorType {
  if (
    value === "short_answer" ||
    value === "tangent" ||
    value === "impatience" ||
    value === "contradiction" ||
    value === "low_comprehension" ||
    value === "goal_answer"
  ) {
    return value;
  }
  return fallback;
}
