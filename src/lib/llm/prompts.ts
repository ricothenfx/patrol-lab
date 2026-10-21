import { POIS } from "../site";

/** The grammar reference embedded in the LLM system prompt. */
export const DSL_GRAMMAR = `Mission DSL (line-oriented, # comments):

MISSION <name>
  SPEED <0.4-1.6>                      # set mission speed multiplier
  GOTO <poi> [SPEED <0.4-1.6>]         # walk to a POI
  INSPECT <poi> [THERMAL|VISUAL|ACOUSTIC] [ALERT IF <metric><op><value>]
  WAIT <0.1-30>                        # hold position, seconds
END

Rules:
- poi is one of: ${POIS.map((p) => p.id).join(", ")}
- metric is TEMP (°C) | GAS (ppm) | VIBRATION (mm/s); op is > < >= <= ==
- INSPECT thermal readings are 35-80°C typically, gas 0-12 ppm, vibration 0-3 mm/s
- output ONLY the mission code, no explanations, no markdown fences`;

export const COMPILE_SYSTEM = `You compile natural-language inspection requests into patrol mission code.
${DSL_GRAMMAR}`;

export function stripFences(text: string): string {
  return text
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export interface CompileResult {
  ok: boolean;
  code?: string;
  error?: string;
  usedMock: boolean;
}

export async function callOpenAI(system: string, user: string): Promise<string> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("no api key");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 600,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`openai ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export const REPORT_SYSTEM = `You write industrial inspection reports for a quadruped robot patrol.
You receive the mission's structured findings and alerts as JSON.
Return STRICT JSON only: {"summary": string (2-4 sentences, factual, cite POI ids and numbers),
"recommendations": string[] (1-4 short actionable items)}.
Never invent readings that are not in the data.`;
