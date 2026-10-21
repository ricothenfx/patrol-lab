import { NextResponse } from "next/server";
import { parseMission } from "@/lib/mission/parse";
import { COMPILE_SYSTEM, callOpenAI, stripFences, type CompileResult } from "@/lib/llm/prompts";
import { POIS } from "@/lib/site";

const MOCK_MISSIONS: { match: RegExp; code: string }[] = [
  {
    match: /valve|gas|leak/i,
    code: `# compiled from NL (mock) — gas watch
MISSION nl_gas_watch

SPEED 1.1
GOTO valve_manifold
INSPECT valve_manifold VISUAL ALERT IF GAS>8
INSPECT valve_manifold ACOUSTIC ALERT IF VIBRATION>2.5
WAIT 1

GOTO tank_farm
INSPECT tank_farm THERMAL ALERT IF TEMP>60
END`,
  },
  {
    match: /transformer|listrik|electri|power/i,
    code: `# compiled from NL (mock) — electrical sweep
MISSION nl_electrical

SPEED 1.0
GOTO transformer_row
INSPECT transformer_row THERMAL ALERT IF TEMP>75
INSPECT transformer_row ACOUSTIC
WAIT 1

GOTO gauge_bank
INSPECT gauge_bank THERMAL
END`,
  },
];

const FALLBACK_MOCK = `# compiled from NL (mock) — general patrol
MISSION nl_patrol

SPEED 1.0
GOTO pump_station
INSPECT pump_station THERMAL ALERT IF TEMP>75

GOTO gauge_bank
INSPECT gauge_bank THERMAL
WAIT 1

GOTO transformer_row
INSPECT transformer_row THERMAL ALERT IF TEMP>75
END`;

function mockCompile(prompt: string): string {
  for (const m of MOCK_MISSIONS) if (m.match.test(prompt)) return m.code;
  return FALLBACK_MOCK;
}

function llmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.MOCK_MODE !== "1";
}

export async function POST(req: Request): Promise<NextResponse> {
  let prompt = "";
  try {
    const body = (await req.json()) as { prompt?: string };
    prompt = (body.prompt ?? "").slice(0, 500);
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }
  if (!prompt.trim()) {
    return NextResponse.json({ ok: false, error: "empty prompt" }, { status: 400 });
  }

  if (!llmEnabled()) {
    const code = mockCompile(prompt);
    return NextResponse.json({ ok: true, code, usedMock: true } satisfies CompileResult);
  }

  try {
    const poiHint = `Known POIs: ${POIS.map((p) => p.id).join(", ")}.`;
    let text = stripFences(await callOpenAI(COMPILE_SYSTEM, `${poiHint}\nRequest: ${prompt}`));
    let parsed = parseMission(text);
    if (!parsed.ok) {
      // one bounded retry with the parser errors fed back
      const feedback = parsed.errors.map((e) => `line ${e.line}: ${e.message}`).join("\n");
      text = stripFences(
        await callOpenAI(COMPILE_SYSTEM, `${poiHint}\nRequest: ${prompt}\n\nYour previous output failed validation:\n${feedback}\nFix it and output only the corrected mission.`),
      );
      parsed = parseMission(text);
    }
    if (!parsed.ok) {
      return NextResponse.json({
        ok: false,
        error: `model output failed DSL validation (${parsed.errors.length} errors) — try rephrasing`,
        usedMock: false,
      } satisfies CompileResult);
    }
    return NextResponse.json({ ok: true, code: text, usedMock: false } satisfies CompileResult);
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: `upstream: ${String(err).slice(0, 140)}`, usedMock: false },
      { status: 502 },
    );
  }
}
