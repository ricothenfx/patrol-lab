"use client";

import { useEffect, useRef } from "react";
import { useUi } from "@/state/store";
import { orchestrator } from "@/lib/orchestrator";
import { useT } from "@/lib/i18n/LocaleProvider";
import { PRESETS, runCurrentMission, pauseMission, stepMission, resetMission, setEditorDoc } from "./MissionEditor";

const STATUS_CLASS: Record<string, string> = {
  IDLE: "status-idle",
  RUNNING: "status-running",
  PAUSED: "status-paused",
  DONE: "status-done",
};

function fmtClock(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s - m * 60;
  return `${m}:${sec.toFixed(1).padStart(4, "0")}`;
}

export function MissionControls() {
  const t = useT();
  const snapshot = useUi((s) => s.snapshot);
  const seed = useUi((s) => s.seed);
  const setSeed = useUi((s) => s.setSeed);
  const playback = useUi((s) => s.playback);
  const setPlayback = useUi((s) => s.setPlayback);
  const runError = useUi((s) => s.runError);
  const setRunError = useUi((s) => s.setRunError);
  const logRef = useRef<HTMLDivElement | null>(null);

  const status = snapshot?.status ?? "IDLE";
  const events = snapshot?.events ?? [];
  const findings = snapshot?.findings ?? [];
  const alerts = events.filter((e) => e.severity === "critical").length;

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = 0;
  }, [events.length]);

  const onRun = () => {
    const res = runCurrentMission();
    setRunError(res.ok ? null : t.errors.parseErrors(res.parseErrors ?? 0));
    if (res.ok) useUi.getState().setCamMode("follow");
  };

  const onStep = () => {
    const res = stepMission();
    setRunError(res.ok ? null : t.errors.parseErrors(res.parseErrors ?? 0));
  };

  return (
    <div className="mission-controls" data-testid="mission-controls">
      <div className="mc-row">
        <button className="btn btn-run" data-testid="btn-run" onClick={onRun} disabled={status === "RUNNING"}>
          {t.controls.run}
        </button>
        <button className="btn" data-testid="btn-pause" onClick={pauseMission} disabled={status !== "RUNNING"}>
          {t.controls.pause}
        </button>
        <button className="btn" data-testid="btn-step" onClick={onStep} disabled={status === "RUNNING" || status === "DONE"}>
          {t.controls.step}
        </button>
        <button className="btn" data-testid="btn-reset" onClick={resetMission}>
          {t.controls.reset}
        </button>
      </div>

      <div className="mc-row mc-row-meta">
        <label className="field">
          <span>{t.controls.seed}</span>
          <input
            type="number"
            min={0}
            max={65535}
            value={seed}
            data-testid="seed-input"
            onChange={(e) => setSeed(parseInt(e.target.value || "0", 10) || 0)}
          />
        </label>
        <label className="field">
          <span>{t.controls.playback}</span>
          <select
            value={playback}
            data-testid="playback-select"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              orchestrator.setPlayback(v);
              setPlayback(v);
            }}
          >
            <option value="0.5">0.5×</option>
            <option value="1">1×</option>
            <option value="2">2×</option>
            <option value="4">4×</option>
          </select>
        </label>
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className="btn btn-preset"
            data-testid={`preset-${p.id}`}
            onClick={() => {
              resetMission();
              setEditorDoc(p.code);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {runError && (
        <div className="run-error" data-testid="run-error">
          {runError}
        </div>
      )}

      <div className="mission-status" data-testid="mission-status">
        <span className={`status-pill ${STATUS_CLASS[status]}`} data-testid="mission-status-pill">
          {status}
        </span>
        <span className="ms-name">{snapshot?.missionName || "—"}</span>
        <span className="ms-meta">
          {t.controls.line} <b data-testid="current-line">{snapshot?.currentLine ?? "—"}</b>
        </span>
        <span className="ms-meta">
          {t.controls.stmt} {snapshot ? `${Math.min(snapshot.stmtIndex + 1, snapshot.stmtCount)}/${snapshot.stmtCount}` : "—"}
        </span>
        <span className="ms-meta">
          t <b data-testid="mission-clock">{fmtClock(snapshot?.missionClock ?? 0)}</b>
        </span>
        <span className="ms-meta">
          {t.controls.phase} {snapshot?.phase ?? "idle"}
        </span>
        <span className="ms-meta ms-alerts" data-testid="alert-count">
          ⚠ {alerts}
        </span>
        <span className="ms-meta" data-testid="finding-count">
          {t.controls.findingsCount(findings.length)}
        </span>
      </div>

      <div className="event-log" ref={logRef} data-testid="event-log">
        {events.length === 0 && <div className="event-empty">{t.controls.emptyLog}</div>}
        {events
          .slice()
          .reverse()
          .map((e) => (
            <div key={e.id} className={`event-row sev-${e.severity}`} data-testid="event-row">
              <span className="event-t">{fmtClock(e.t)}</span>
              <span className="event-line">L{e.line}</span>
              <span className="event-text">{e.text}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
