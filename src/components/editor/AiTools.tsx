"use client";

import { useState } from "react";
import { useUi } from "@/state/store";
import { setEditorDoc } from "./MissionEditor";
import type { CompileResult } from "@/lib/llm/prompts";
import type { ReportData } from "@/app/api/llm/report/route";

/**
 * LLM plugins as optional adapters (ADR-06): the app is fully functional
 * without a key (server falls back to rule-based mock artifacts, labeled as
 * such). The model only ever PROPOSES mission code — the parser validates it
 * and the interpreter owns execution.
 */

export function NlCompileBar() {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<CompileResult | null>(null);

  const compile = async () => {
    setBusy(true);
    setPreview(null);
    try {
      const res = await fetch("/api/llm/compile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const json = (await res.json()) as CompileResult & { error?: string };
      setPreview(json);
    } catch (err) {
      setPreview({ ok: false, error: String(err).slice(0, 120), usedMock: false });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="nl-bar" data-testid="nl-bar">
      {!open && (
        <button className="btn btn-nl" data-testid="nl-open" onClick={() => setOpen(true)}>
          ✎ describe mission (NL → DSL)
        </button>
      )}
      {open && (
        <div className="nl-body">
          <div className="nl-row">
            <input
              className="nl-input"
              data-testid="nl-input"
              placeholder="e.g. gas watch on the valve manifold, then thermal on the tanks"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && prompt.trim() && !busy) void compile();
              }}
            />
            <button className="btn btn-run" data-testid="nl-compile" onClick={() => void compile()} disabled={busy || !prompt.trim()}>
              {busy ? "…" : "compile"}
            </button>
            <button className="btn" data-testid="nl-close" onClick={() => { setOpen(false); setPreview(null); }}>
              ×
            </button>
          </div>
          {preview && (
            <div className="nl-preview" data-testid="nl-preview">
              {preview.ok ? (
                <>
                  <div className="nl-preview-head">
                    <span className="nl-badge">{preview.usedMock ? "MOCK" : "LLM"}</span>
                    <span className="nl-note">proposed mission — review, then accept</span>
                    <button
                      className="btn btn-run"
                      data-testid="nl-accept"
                      onClick={() => {
                        setEditorDoc(preview.code!);
                        useUi.getState().setEditorText(preview.code!);
                        setOpen(false);
                        setPreview(null);
                      }}
                    >
                      ✓ accept
                    </button>
                    <button className="btn" data-testid="nl-discard" onClick={() => setPreview(null)}>
                      discard
                    </button>
                  </div>
                  <pre className="nl-code">{preview.code}</pre>
                </>
              ) : (
                <div className="run-error">{preview.error}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReportPanel() {
  const snapshot = useUi((s) => s.snapshot);
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const done = snapshot?.status === "DONE";

  const generate = async () => {
    if (!snapshot) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/llm/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionName: snapshot.missionName,
          seed: snapshot.seed,
          clock: snapshot.missionClock,
          events: snapshot.events.map((e) => ({ t: e.t, kind: e.kind, text: e.text, severity: e.severity })),
          findings: snapshot.findings.map((f) => ({
            id: f.id,
            poi: f.poi,
            mode: f.mode,
            detail: f.detail,
            metrics: f.metrics as unknown as Record<string, number>,
          })),
        }),
      });
      const json = (await res.json()) as { ok: boolean; report?: ReportData; error?: string };
      if (json.ok && json.report) setReport(json.report);
      else setError(json.error ?? "report failed");
    } catch (err) {
      setError(String(err).slice(0, 120));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="report-panel" data-testid="report-panel">
      <button className="btn btn-preset" data-testid="report-generate" onClick={() => void generate()} disabled={!done || busy}>
        {busy ? "…" : done ? "⇒ generate inspection report" : "report (run a mission first)"}
      </button>
      {error && <div className="run-error">{error}</div>}
      {report && (
        <div className="report-body" data-testid="report-body">
          <div className="nl-preview-head">
            <span className="nl-badge">{report.usedMock ? "RULE-BASED" : "LLM"}</span>
            <span className="nl-note">grounded in the mission log</span>
          </div>
          <p className="report-summary">{report.summary}</p>
          <ul className="report-recs">
            {report.recommendations.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
