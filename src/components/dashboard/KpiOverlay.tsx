"use client";

import { useEffect, useState } from "react";
import { POIS } from "@/lib/site";
import { orchestrator } from "@/lib/orchestrator";
import { sim } from "@/lib/simworld";
import { useT } from "@/lib/i18n/LocaleProvider";
import type { MissionSnapshotUi } from "@/state/store";

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

/**
 * KPI card over the viewport. Polls the mutable sim + runner at 2 Hz —
 * per ADR-04 no per-frame React state. Every number is a real metric:
 * clock/stmts from the interpreter, odometer/pose from the sim, findings from
 * the seeded sensor model, coverage from inspected POI ids.
 */
export function KpiOverlay({ snapshot }: { snapshot: MissionSnapshotUi | null }) {
  const t = useT();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 500);
    return () => clearInterval(id);
  }, []);
  void tick;

  const findings = snapshot?.findings ?? [];
  const inspected = new Set(findings.map((f) => f.poi));
  const alerts = (snapshot?.events ?? []).filter((e) => e.severity === "critical").length;

  return (
    <div className="kpi-card" data-testid="kpi-card">
      <div className="kpi-row kpi-head">
        <span className="kpi-label">{t.kpi.telemetry}</span>
        <span className="kpi-mode">{snapshot?.status ?? "IDLE"}</span>
      </div>
      <div className="kpi-grid">
        <div className="kpi" data-testid="kpi-clock">
          <span className="kpi-value">{fmtClock(snapshot?.missionClock ?? 0)}</span>
          <span className="kpi-key">{t.kpi.missionClock}</span>
        </div>
        <div className="kpi" data-testid="kpi-odo">
          <span className="kpi-value">{sim.odometer.toFixed(1)} m</span>
          <span className="kpi-key">{t.kpi.odometer}</span>
        </div>
        <div className="kpi" data-testid="kpi-coverage">
          <span className="kpi-value">
            {inspected.size}/{POIS.length}
          </span>
          <span className="kpi-key">{t.kpi.coverage}</span>
        </div>
        <div className="kpi" data-testid="kpi-findings">
          <span className="kpi-value">{findings.length}</span>
          <span className="kpi-key">{t.kpi.findings}</span>
        </div>
        <div className="kpi" data-testid="kpi-alerts">
          <span className={`kpi-value ${alerts > 0 ? "kpi-alert" : ""}`}>{alerts}</span>
          <span className="kpi-key">{t.kpi.alerts}</span>
        </div>
        <div className="kpi">
          <span className="kpi-value kpi-mono">{(orchestrator.runner.snapshot.seed ?? 0) & 0xffff}</span>
          <span className="kpi-key">{t.kpi.seed}</span>
        </div>
      </div>
      <div className="kpi-pois" data-testid="kpi-pois">
        {POIS.map((p) => (
          <span
            key={p.id}
            className={`poi-chip ${inspected.has(p.id) ? "poi-done" : ""}`}
            style={inspected.has(p.id) ? { borderColor: p.color, color: p.color } : undefined}
            title={p.id}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
