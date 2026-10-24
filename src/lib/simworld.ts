import * as THREE from "three";
import type { Rig } from "./rig";
import { DynamicsBackend } from "./dynamics/backend";
import { SteppingGait, BODY_HEIGHT } from "./gait";

export type SimMode = "unloaded" | "idle" | "mission";
export type LocMode = "kinematic" | "dynamics";

const BASE_SPEED = 0.85; // m/s at 1×
const TURN_RATE = 1.9; // rad/s
const STRIDE_RATE = 1.55; // gait cycles per second at 1×
const ARRIVE_EPS = 0.22; // meters — considered "at the POI"
const ARRIVE_EPS_KIN = 0.02; // kinematic walks onto the target (no visible snap)
const TURN_GAIT_SCALE = 0.45; // slower stride rhythm while turning in place

function wrapAngle(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

export interface Pose {
  x: number;
  z: number;
  heading: number;
}

/** what the locomotion backend should do this tick */
export interface LocoCmd {
  kind: "idle" | "stand" | "goto";
  tx: number;
  tz: number;
  speedMult: number;
}

/**
 * A locomotion backend owns HOW the robot moves: it integrates state, mutates
 * `sim.pose` / `sim.odometer` and writes the rig. The interpreter and UI stay
 * agnostic (ADR-02 swappability).
 */
export interface LocoBackend {
  readonly kind: LocMode;
  detach(): void;
  /** arrival radius override (dynamics arcs need a wider capture window) */
  readonly arriveEps?: number;
  /** deterministic mission start: pin physics to a canonical stance (dynamics) */
  prepareRun?(pose: Pose): void;
  /** adopt the rig + current pose (switching modes must be seamless) */
  attach(rig: Rig, pose: Pose): void;
  tick(dt: number, cmd: LocoCmd): void;
  /**
   * arrival handling: kinematic snaps onto the waypoint; physics just clears
   * the target (teleporting a rigid body would look wrong).
   */
  arrive(pose: Pose, target: { x: number; z: number }): void;
}

export class KinematicBackend implements LocoBackend {
  readonly kind: LocMode = "kinematic";
  /** walks onto the target — the ≤2 cm settle is invisible, unlike a snap */
  readonly arriveEps = ARRIVE_EPS_KIN;
  private rig: Rig | null = null;
  private sim: import("./simworld").SimWorld;
  private gait = new SteppingGait();
  /** soft body bob for idle/scan breathing (rad/s phase) */
  private breathe = 0;

  constructor(sim: import("./simworld").SimWorld) {
    this.sim = sim;
  }

  attach(rig: Rig, pose: Pose): void {
    this.rig = rig;
    this.gait = new SteppingGait();
    this.gait.attach(rig);
    this.publishBody();
    this.gait.plantFeet(pose.x, pose.z, pose.heading);
  }

  detach(): void {
    this.rig = null;
  }

  arrive(pose: Pose, target: { x: number; z: number }): void {
    pose.x = target.x;
    pose.z = target.z;
    this.publishBody();
    this.gait.plantFeet(pose.x, pose.z, pose.heading);
  }

  tick(dt: number, cmd: LocoCmd): void {
    if (!this.rig) return;
    if (cmd.kind === "goto") {
      this.tickLocomotion(dt, cmd);
    } else {
      // stand/idle: planted feet, gentle breathing bob
      this.breathe += dt;
      this.gait.body(this.rig);
      const base = this.rig.bodyPivots.get("base");
      if (base) base.position.z = BODY_HEIGHT + 0.004 * Math.sin(this.breathe * 0.7);
      this.gait.update({ dtPhase: 0, bx: this.sim.pose.x, bz: this.sim.pose.z, heading: this.sim.pose.heading, leadFwd: 0, leadTurn: 0, walking: false });
    }
  }

  private publishBody(): void {
    const rig = this.rig!;
    rig.holder.position.set(this.sim.pose.x, 0, this.sim.pose.z);
    rig.holder.rotation.y = this.sim.pose.heading;
  }

  private tickLocomotion(dt: number, cmd: LocoCmd): void {
    const pose = this.sim.pose;
    const speedMult = cmd.speedMult;
    const dx = cmd.tx - pose.x;
    const dz = cmd.tz - pose.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(-dz, dx);
    const err = wrapAngle(desired - pose.heading);

    let walking = false;
    if (Math.abs(err) > 0.06) {
      // turn in place first, then walk
      const turn = Math.min(Math.abs(err), TURN_RATE * dt) * Math.sign(err);
      pose.heading = wrapAngle(pose.heading + turn);
    } else {
      const step = Math.min(dist, BASE_SPEED * speedMult * dt);
      pose.x += Math.cos(pose.heading) * step;
      pose.z += -Math.sin(pose.heading) * step;
      this.sim.odometer += step;
      walking = step > 1e-5;
    }

    // body first (feet planted in world, IK compensates), then legs
    this.publishBody();
    this.gait.body(this.rig!);
    const dtPhase = dt * STRIDE_RATE * speedMult * (walking ? 1 : TURN_GAIT_SCALE);
    // stride lead: stretch the step toward the target; shrink near arrival so
    // the robot settles instead of stepping past it. While pivoting, swing the
    // feet slightly ahead of the rotation.
    const leadFwd = walking ? Math.min(0.3, Math.max(0.06, dist * 0.5)) : 0;
    const leadTurn = walking ? 0 : 0.1 * Math.sign(err);
    this.gait.update({ dtPhase, bx: pose.x, bz: pose.z, heading: pose.heading, leadFwd, leadTurn, walking });
  }
}

/**
 * Deterministic per-frame simulation state (ADR-04). Lives outside React:
 * `tick` writes joint angles straight into the rig. The MissionRunner drives
 * the robot in mission mode; otherwise an idle stance plays.
 *
 * Locomotion is pluggable (ADR-02): `kinematic` (default, scripted gait) or
 * `dynamics` (MuJoCo WASM rigid-body physics, beta). The UI labels the active
 * mode honestly.
 */
export class SimWorld {
  mode: SimMode = "unloaded";
  locMode: LocMode = "kinematic";
  speedMult = 1;
  pose: Pose = { x: 0, z: 0, heading: 0 };
  target: { x: number; z: number } | null = null;
  targetPoi: string | null = null;
  scanning = false;

  private rig: Rig | null = null;
  private backend: LocoBackend;
  t = 0;
  frames = 0;
  odometer = 0; // meters walked since attach — real metric, shown in the KPI card
  resets = 0; // physics fall-recoveries (dynamics mode only)
  private resetFlag = false;

  constructor(backend?: LocoBackend) {
    this.backend = backend ?? new KinematicBackend(this);
  }

  get jointCount(): number {
    return this.rig ? this.rig.joints.size : 0;
  }

  /** debug: world-space orientation of driver + base as euler angles (rad) */
  orientation(): {
    driver: [number, number, number];
    base: [number, number, number];
    driverForward: [number, number, number];
  } {
    if (!this.rig) {
      return { driver: [0, 0, 0], base: [0, 0, 0], driverForward: [1, 0, 0] };
    }
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    this.rig.driver.getWorldQuaternion(q);
    e.setFromQuaternion(q);
    const driver: [number, number, number] = [e.x, e.y, e.z];
    const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const driverForward: [number, number, number] = [fwd.x, fwd.y, fwd.z];
    const basePivot = this.rig.bodyPivots.get("base")!;
    basePivot.getWorldQuaternion(q);
    e.setFromQuaternion(q);
    return { driver, base: [e.x, e.y, e.z], driverForward };
  }

  /**
   * debug: rendered holder world position — must always equal `pose`.
   * Guards the scene-graph mount (a reparented holder silently orphans the
   * pose: the robot dances at the origin while the sim walks away).
   */
  holderWorld(): { x: number; y: number; z: number } | null {
    if (!this.rig) return null;
    const p = new THREE.Vector3();
    this.rig.holder.getWorldPosition(p);
    return { x: p.x, y: p.y, z: p.z };
  }

  get arrived(): boolean {
    return this.target === null;
  }

  attach(rig: Rig): void {
    this.rig = rig;
    this.backend.attach(rig, this.pose);
    this.mode = "idle";
  }

  detach(): void {
    this.rig = null;
    this.mode = "unloaded";
    this.target = null;
    this.targetPoi = null;
    this.scanning = false;
    this.speedMult = 1;
  }

  /**
   * Swap the locomotion backend, preserving the world pose. The dynamics
   * engine must be ready before calling this with "dynamics".
   */
  useLocomotion(kind: LocMode, backend: LocoBackend): void {
    if (kind === this.locMode || !this.rig) return;
    this.backend.detach();
    this.backend = backend;
    this.locMode = kind;
    this.backend.attach(this.rig, this.pose);
  }

  enterIdle(): void {
    this.mode = "idle";
    this.target = null;
    this.targetPoi = null;
    this.scanning = false;
    this.speedMult = 1;
  }

  setMissionTarget(x: number, z: number, mult: number, poiId?: string): void {
    this.mode = "mission";
    this.target = { x, z };
    this.targetPoi = poiId ?? null;
    this.speedMult = mult;
    this.scanning = false;
  }

  setSpeedMult(m: number): void {
    this.speedMult = m;
  }

  /** called by the interpreter when a fresh mission starts running */
  prepareRun(): void {
    this.backend.prepareRun?.(this.pose);
  }

  beginScan(): void {
    this.scanning = true;
    this.target = null;
  }

  endScan(): void {
    this.scanning = false;
  }

  atPoint(x: number, z: number, eps = 0.4): boolean {
    const dx = this.pose.x - x;
    const dz = this.pose.z - z;
    return dx * dx + dz * dz <= eps * eps;
  }

  distanceTo(x: number, z: number): number {
    return Math.hypot(this.pose.x - x, this.pose.z - z);
  }

  /** consume the fall-reset flag (used by the mission log) */
  popReset(): boolean {
    if (!this.resetFlag) return false;
    this.resetFlag = false;
    return true;
  }

  /** record a physics fall-recovery (dynamics backend) */
  markReset(): void {
    this.resets += 1;
    this.resetFlag = true;
  }

  /**
   * Advance one frame. Called by the MissionRunner while a mission is active
   * (with the mission speed), or by the viewport ticker in idle mode.
   * dt is clamped so tab-switches never produce jumps.
   */
  tick(dtRaw: number, speedMult = 1): void {
    if (!this.rig || this.mode === "unloaded") return;
    const dt = Math.min(dtRaw, 0.05);
    this.t += dt;
    this.frames += 1;

    let cmd: LocoCmd;
    if (this.mode === "mission" && !this.scanning && this.target) {
      cmd = { kind: "goto", tx: this.target.x, tz: this.target.z, speedMult };
    } else if (this.mode === "mission") {
      cmd = { kind: "stand", tx: 0, tz: 0, speedMult: 1 };
    } else {
      cmd = { kind: "idle", tx: 0, tz: 0, speedMult: 1 };
    }

    this.backend.tick(dt, cmd);

    // centralized arrival detection (identical criterion for both backends)
    if (this.target) {
      const dx = this.target.x - this.pose.x;
      const dz = this.target.z - this.pose.z;
      const dist = Math.hypot(dx, dz);
      const desired = Math.atan2(-dz, dx);
      const err = wrapAngle(desired - this.pose.heading);
      const eps = this.backend.arriveEps ?? ARRIVE_EPS;
      if (dist <= eps && Math.abs(err) < 0.1) {
        this.backend.arrive(this.pose, this.target);
        this.target = null;
      }
    }
  }
}

export const sim = new SimWorld();
export const dynamicsBackend = new DynamicsBackend(sim);

declare global {
  interface Window {
    __patrol?: {
      frames: () => number;
      tris: () => number;
      joints: () => number;
      mode: () => string;
      loc: () => string;
      pose: () => Pose;
      holder: () => { x: number; y: number; z: number } | null;
      camera?: () => { pos: [number, number, number]; target: [number, number, number] };
      orient: () => {
        driver: [number, number, number];
        base: [number, number, number];
        driverForward: [number, number, number];
      };
    };
  }
}

export { wrapAngle };
