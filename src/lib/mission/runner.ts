import type { Mission } from "./types";
import { POI_BY_ID, POI_POS } from "../site";
import { readSensors, compareMetric, type Finding } from "./findings";
import type { SimWorld } from "../simworld";
import { sim } from "../simworld";
import type { AlertIf } from "./types";

export type MissionStatus = "IDLE" | "RUNNING" | "PAUSED" | "DONE";

export interface MissionEvent {
  id: number;
  t: number;
  kind: "goto" | "inspect" | "alert" | "wait" | "speed" | "done";
  line: number;
  text: string;
  severity: "info" | "warn" | "critical";
}

export interface RunnerSnapshot {
  status: MissionStatus;
  missionName: string;
  currentLine: number;
  stmtIndex: number;
  stmtCount: number;
  missionClock: number;
  seed: number;
  findings: Finding[];
  events: MissionEvent[];
  targetPoi: string | null;
  phase: "idle" | "walking" | "turning" | "scanning" | "waiting" | "done";
}

const FIXED_DT = 1 / 120;

/**
 * Stop short of the POI center so the robot parks beside the asset, facing it,
 * instead of standing inside its plinth.
 */
function approachPoint(x: number, z: number, stopDistance: number): [number, number] {
  const dx = x - sim.pose.x;
  const dz = z - sim.pose.z;
  const d = Math.hypot(dx, dz);
  if (d <= stopDistance || d === 0) return [x, z];
  const ratio = (d - stopDistance) / d;
  return [sim.pose.x + dx * ratio, sim.pose.z + dz * ratio];
}
const SCAN_SECONDS = 3.0;
const ARRIVE_EPS = 0.22;

/**
 * The interpreter (ADR-05). Deterministic: fixed-timestep integration; sensor
 * readings seeded by (seed, poi, line). The renderer drives `tick(dt)`; React
 * receives throttled snapshots only.
 */
export class MissionRunner {
  status: MissionStatus = "IDLE";
  private mission: Mission | null = null;
  private seed = 1;
  private stmtIndex = 0;
  private clock = 0;
  private phase: RunnerSnapshot["phase"] = "idle";
  private stmtElapsed = 0;
  private implicitGoto = false;
  private currentFinding: Finding | null = null;
  private findings: Finding[] = [];
  private events: MissionEvent[] = [];
  private eventId = 0;
  private stepping = false;
  private snapshotCb: ((s: RunnerSnapshot) => void) | null = null;
  private lastPushed = { status: "", line: -1, events: 0, findings: 0, clock: 0 };

  constructor(private sim: SimWorld) {}

  get busy(): boolean {
    return this.status === "RUNNING" || this.stepping;
  }

  get hasMission(): boolean {
    return this.mission !== null;
  }

  onSnapshot(cb: (s: RunnerSnapshot) => void): void {
    this.snapshotCb = cb;
  }

  load(mission: Mission, seed: number): void {
    this.mission = mission;
    this.seed = seed;
    this.reset();
  }

  reset(): void {
    this.status = "IDLE";
    this.stmtIndex = 0;
    this.clock = 0;
    this.phase = "idle";
    this.stmtElapsed = 0;
    this.implicitGoto = false;
    this.currentFinding = null;
    this.findings = [];
    this.events = [];
    this.stepping = false;
    this.sim.enterIdle();
    this.push(true);
  }

  run(): void {
    if (!this.mission || this.status === "RUNNING") return;
    if (this.status === "DONE") this.reset();
    this.status = "RUNNING";
    this.push(true);
  }

  pause(): void {
    if (this.status !== "RUNNING") return;
    this.status = "PAUSED";
    this.push(true);
  }

  /** Run statements until the active line changes (debugger step-over). */
  step(): void {
    if (!this.mission || this.status === "RUNNING") return;
    if (this.status === "DONE") return;
    this.status = "PAUSED";
    this.stepping = true;
  }

  private push(force = false): void {
    const s = this.snapshot;
    const cur = this.lastPushed;
    const changed =
      force ||
      cur.status !== s.status ||
      cur.line !== s.currentLine ||
      cur.events !== s.events.length ||
      cur.findings !== s.findings.length ||
      Math.abs(cur.clock - s.missionClock) > 0.25;
    if (!changed) return;
    this.lastPushed = { status: s.status, line: s.currentLine, events: s.events.length, findings: s.findings.length, clock: s.missionClock };
    this.snapshotCb?.(s);
  }

  private log(kind: MissionEvent["kind"], line: number, text: string, severity: MissionEvent["severity"] = "info"): void {
    this.events.push({ id: this.eventId++, t: this.clock, kind, line, text, severity });
  }

  private get stmts() {
    return this.mission?.statements ?? [];
  }

  private startStatement(): void {
    const stmt = this.stmts[this.stmtIndex];
    if (!stmt) return;
    this.stmtElapsed = 0;
    this.implicitGoto = false;
    this.currentFinding = null;
    switch (stmt.kind) {
      case "goto": {
        const p = POI_POS[stmt.poi];
        this.phase = "walking";
        const [tx, tz] = approachPoint(p.x, p.z, 0.9);
        this.sim.setMissionTarget(tx, tz, stmt.speed ?? 1, stmt.poi);
        this.log("goto", stmt.line, `en route → ${stmt.poi.toUpperCase()}${stmt.speed ? ` @ ${stmt.speed}×` : ""}`);
        break;
      }
      case "inspect": {
        const p = POI_POS[stmt.poi];
        const at = this.sim.atPoint(p.x, p.z, 1.1);
        if (!at) {
          // implicit walk-to, then scan (logged, still deterministic)
          this.implicitGoto = true;
          this.phase = "walking";
          const [tx, tz] = approachPoint(p.x, p.z, 0.9);
          this.sim.setMissionTarget(tx, tz, 1, stmt.poi);
          this.log("goto", stmt.line, `repositioning → ${stmt.poi.toUpperCase()} (INSPECT target)`);
        } else {
          this.beginScan(stmt);
        }
        break;
      }
      case "wait":
        this.phase = "waiting";
        this.log("wait", stmt.line, `holding position ${stmt.seconds}s`);
        break;
      case "speed":
        this.sim.setSpeedMult(stmt.multiplier);
        this.log("speed", stmt.line, `mission speed ${stmt.multiplier}×`);
        break;
    }
  }

  private beginScan(stmt: Extract<import("./types").Statement, { kind: "inspect" }>): void {
    this.implicitGoto = false;
    this.phase = "scanning";
    this.sim.setSpeedMult(1);
    this.sim.beginScan();
    void stmt;
  }

  private finishScan(stmt: Extract<import("./types").Statement, { kind: "inspect" }>): void {
    const finding = readSensors({
      seed: this.seed,
      poi: stmt.poi,
      kind: POI_BY_ID[stmt.poi].kind,
      mode: stmt.mode,
      statementLine: stmt.line,
      t: this.clock,
    });
    this.currentFinding = finding;
    this.findings.push(finding);
    const label = finding.metrics.temp !== undefined ? `${finding.metrics.temp.toFixed(1)}°C` : "";
    this.log(
      "inspect",
      stmt.line,
      `${stmt.mode.toUpperCase()} @ ${stmt.poi.toUpperCase()} — ${finding.detail}${label ? ` · ${label}` : ""}`,
    );
    if (stmt.alertIf) {
      const a: AlertIf = stmt.alertIf;
      const value = finding.metrics[a.metric];
      if (compareMetric(value, a.op, a.value)) {
        this.log(
          "alert",
          stmt.line,
          `ALERT ${a.metric.toUpperCase()} ${value.toFixed(1)} ${a.op} ${a.value} @ ${stmt.poi.toUpperCase()}`,
          "critical",
        );
      } else {
        this.log("inspect", stmt.line, `no alert: ${a.metric.toUpperCase()} ${value.toFixed(1)} ${a.op} ${a.value} ok`, "info");
      }
    }
    this.sim.endScan();
  }

  private advance(): void {
    this.stmtIndex += 1;
    if (this.stmtIndex >= this.stmts.length) {
      this.status = "DONE";
      this.phase = "done";
      this.sim.enterIdle();
      this.log("done", this.stmts.at(-1)?.line ?? 0, `mission '${this.mission?.name}' complete — ${this.findings.length} findings, ${this.events.filter((e) => e.severity === "critical").length} alerts`);
    } else {
      this.startStatement();
    }
  }

  /** Called from the render loop; integrates with a fixed timestep. */
  tick(dtRaw: number): void {
    if (!this.mission) return;
    if (this.status !== "RUNNING" && !this.stepping) {
      this.push();
      return;
    }
    let remaining = Math.min(dtRaw, 0.25);
    const lineAtStart = this.stmts[this.stmtIndex]?.line ?? -1;
    while (remaining > 1e-6) {
      const dt = Math.min(FIXED_DT, remaining);
      remaining -= dt;
      this.tickFixed(dt);
      if (this.status === "DONE") break;
      if (this.stepping && (this.stmts[this.stmtIndex]?.line ?? -1) !== lineAtStart) {
        this.stepping = false;
        break;
      }
    }
    this.push();
  }

  private tickFixed(dt: number): void {
    const speed = this.sim.speedMult;
    this.clock += dt * speed;
    this.sim.tick(dt, speed);
    const stmt = this.stmts[this.stmtIndex];
    if (!stmt) return;
    this.stmtElapsed += dt * speed;

    switch (stmt.kind) {
      case "goto": {
        if (this.sim.arrived) this.advance();
        break;
      }
      case "inspect": {
        if (this.implicitGoto) {
          if (this.sim.arrived) this.beginScan(stmt);
        } else if (this.sim.scanning) {
          if (this.stmtElapsed >= SCAN_SECONDS) this.finishScan(stmt);
        } else if (this.currentFinding) {
          this.advance();
        }
        break;
      }
      case "wait": {
        if (this.stmtElapsed >= stmt.seconds) this.advance();
        break;
      }
      case "speed": {
        this.advance();
        break;
      }
    }
  }

  get snapshot(): RunnerSnapshot {
    const i = this.stmtIndex;
    const line =
      i < this.stmts.length ? this.stmts[i].line : (this.stmts.at(-1)?.line ?? -1);
    return {
      status: this.status,
      missionName: this.mission?.name ?? "",
      currentLine: line,
      stmtIndex: this.stmtIndex,
      stmtCount: this.stmts.length,
      missionClock: this.clock,
      seed: this.seed,
      findings: this.findings,
      events: this.events,
      targetPoi: this.sim.targetPoi,
      phase: this.phase,
    };
  }
}
