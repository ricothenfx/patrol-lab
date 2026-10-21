import { NextResponse } from "next/server";
import { REPORT_SYSTEM, callOpenAI } from "@/lib/llm/prompts";

interface ReportPayload {
  missionName?: string;
  seed?: number;
  clock?: number;
  events?: { t: number; kind: string; text: string; severity: string }[];
  findings?: { id: string; poi: string; mode: string; detail: string; metrics: Record<string, number> }[];
}

export interface ReportData {
  summary: string;
  recommendations: string[];
  usedMock: boolean;
}

function mockReport(payload: ReportPayload): ReportData {
  const findings = payload.findings ?? [];
  const alerts = (payload.events ?? []).filter((e) => e.severity === "critical");
  const hottest = [...findings].sort((a, b) => (b.metrics.temp ?? 0) - (a.metrics.temp ?? 0))[0];
  const pois = [...new Set(findings.map((f) => f.poi))];
  const lines: string[] = [];
  lines.push(
    `Mission '${payload.missionName ?? "—"}' (seed ${payload.seed ?? "—"}) completed in ${Math.round(payload.clock ?? 0)} s, ` +
      `covering ${pois.length} POI: ${pois.join(", ") || "none"}.`,
  );
  lines.push(`${findings.length} sensor findings recorded, ${alerts.length} threshold alert(s) raised.`);
  if (hottest) {
    lines.push(`Hottest reading: ${hottest.poi} at ${hottest.metrics.temp?.toFixed(1)} °C (${hottest.mode}).`);
  }
  const summary = lines.join(" ");
  const recommendations: string[] = [];
  if (alerts.length === 0) {
    recommendations.push("No thresholds exceeded — keep the current patrol interval.");
  } else {
    recommendations.push(`Review the ${alerts.length} alert(s) in the mission log before the next shift.`);
  }
  if (hottest && (hottest.metrics.temp ?? 0) > 70) {
    recommendations.push(`Schedule a manual thermal check for ${hottest.poi} (reading above 70 °C).`);
  }
  recommendations.push("Re-run with the same seed to reproduce these exact readings.");
  return { summary, recommendations, usedMock: true };
}

function llmEnabled(): boolean {
  return Boolean(process.env.OPENAI_API_KEY) && process.env.MOCK_MODE !== "1";
}

export async function POST(req: Request): Promise<NextResponse> {
  let payload: ReportPayload;
  try {
    payload = (await req.json()) as ReportPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid body" }, { status: 400 });
  }

  if (!llmEnabled()) {
    return NextResponse.json({ ok: true, report: mockReport(payload) });
  }

  try {
    const evidence = JSON.stringify(
      {
        mission: payload.missionName,
        seed: payload.seed,
        duration_s: payload.clock,
        findings: payload.findings,
        alerts: (payload.events ?? []).filter((e) => e.severity === "critical"),
      },
      null,
      1,
    ).slice(0, 4000);
    const text = await callOpenAI(
      REPORT_SYSTEM,
      `Mission data:\n${evidence}`,
    );
    const parsed = JSON.parse(text) as { summary?: string; recommendations?: string[] };
    if (!parsed.summary || !Array.isArray(parsed.recommendations)) {
      throw new Error("missing fields");
    }
    const report: ReportData = {
      summary: String(parsed.summary).slice(0, 800),
      recommendations: parsed.recommendations.slice(0, 5).map((r) => String(r).slice(0, 200)),
      usedMock: false,
    };
    return NextResponse.json({ ok: true, report });
  } catch (err) {
    // honest fallback: rule-based report from the same data, labeled as such
    const report = mockReport(payload);
    report.summary = `[rule-based fallback — LLM failed: ${String(err).slice(0, 80)}] ` + report.summary;
    return NextResponse.json({ ok: true, report });
  }
}
