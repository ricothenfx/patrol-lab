import * as THREE from "three";
import type { Rig } from "./rig";
import { setJointAngle } from "./rig";
import { DynamicsBackend } from "./dynamics/backend";

export type SimMode = "unloaded" | "idle" | "mission";
export type LocMode = "kinematic" | "dynamics";

const BASE_SPEED = 0.85; // m/s at 1×
const TURN_RATE = 1.9; // rad/s
const STRIDE_RATE = 1.55; // gait cycles per second at 1×
const ARRIVE_EPS = 0.22; // meters — considered "at the POI"

const _xAxis = new THREE.Vector3(1, 0, 0);
const _roll = new THREE.Quaternion();

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
  private rig: Rig | null = null;
  private sim: import("./simworld").SimWorld;
  private gaitPhase = 0;

  constructor(sim: import("./simworld").SimWorld) {
    this.sim = sim;
  }

  attach(rig: Rig, pose: Pose): void {
    this.rig = rig;
    this.gaitPhase = 0;
    this.applyStand();
    void pose;
  }

  detach(): void {
    this.rig = null;
  }

  arrive(pose: Pose, target: { x: number; z: number }): void {
    pose.x = target.x;
    pose.z = target.z;
    this.applyStand();
  }

  tick(dt: number, cmd: LocoCmd): void {
    if (!this.rig) return;
    if (cmd.kind === "goto") {
      this.tickLocomotion(dt, cmd);
    } else if (cmd.kind === "stand") {
      this.applyStand();
    } else {
      this.tickIdle(dt);
    }
  }

  private tickIdle(dt: number): void {
    void dt;
    const rig = this.rig!;
    for (const [name, base] of Object.entries(rig.standPose)) {
      const leg = name.slice(0, 2);
      const isHaa = name.endsWith("HAA");
      let angle = base;
      if (isHaa) {
        const pair = leg === "LF" || leg === "RH" ? 0 : Math.PI;
        angle += 0.02 * Math.sin(this.sim.t * 0.9 + pair);
      } else {
        angle += 0.008 * Math.sin(this.sim.t * 0.6 + (name.endsWith("HFE") ? 0 : 1.3));
      }
      setJointAngle(rig, name, angle);
    }
    const base = rig.bodyPivots.get("base");
    if (base) base.position.z = 0.62 + 0.004 * Math.sin(this.sim.t * 0.7);
  }

  private tickLocomotion(dt: number, cmd: LocoCmd): void {
    const pose = this.sim.pose;
    const speedMult = cmd.speedMult;
    const dx = cmd.tx - pose.x;
    const dz = cmd.tz - pose.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(-dz, dx);
    const err = wrapAngle(desired - pose.heading);

    // turn in place first, then walk
    if (Math.abs(err) > 0.06) {
      const turn = Math.min(Math.abs(err), TURN_RATE * dt) * Math.sign(err);
      pose.heading = wrapAngle(pose.heading + turn);
      this.gaitPhase += dt * STRIDE_RATE * 0.45 * speedMult;
    } else {
      const step = Math.min(dist, BASE_SPEED * speedMult * dt);
      pose.x += Math.cos(pose.heading) * step;
      pose.z += -Math.sin(pose.heading) * step;
      this.sim.odometer += step;
      this.gaitPhase += dt * STRIDE_RATE * speedMult;
    }

    this.applyGait();
  }

  /** kinematic trot: diagonal pairs (LF+RH vs RF+LH) swing in anti-phase */
  private applyGait(): void {
    const rig = this.rig!;
    const stand = rig.standPose;
    const swing = Math.sin(2 * Math.PI * this.gaitPhase);
    const lift = 0.5 - 0.5 * Math.cos(2 * Math.PI * this.gaitPhase);

    for (const jointName of rig.joints.keys()) {
      const leg = jointName.slice(0, 2); // LF RF LH RH
      const pairOffset = leg === "LF" || leg === "RH" ? 0 : 0.5;
      const s = this.gaitPhase + pairOffset;
      const ph = 2 * Math.PI * s;
      const stance = Math.sin(ph) < 0; // swing half-cycle vs stance half-cycle
      const base = stand[jointName] ?? 0;

      let angle = base;
      if (jointName.endsWith("HAA")) {
        angle = base + 0.07 * Math.sin(ph);
      } else if (jointName.endsWith("HFE")) {
        angle = base + (stance ? 0.3 * Math.sin(ph) : 0.06 * Math.sin(ph));
      } else {
        // KFE folds during swing
        angle = base - (stance ? 0.42 * lift : 0.03);
      }
      setJointAngle(rig, jointName, angle);
    }

    // body bob + slight roll following the diagonal pairs
    // (roll multiplies ON TOP of the MJCF base quaternion — never overwrite it)
    const basePivot = rig.bodyPivots.get("base");
    if (basePivot) {
      basePivot.position.z = 0.62 + 0.014 * Math.abs(swing);
      _roll.setFromAxisAngle(_xAxis, 0.015 * Math.sin(2 * Math.PI * this.gaitPhase));
      basePivot.quaternion.copy(rig.baseQuat).multiply(_roll);
    }

    this.publishPose();
  }

  private applyStand(): void {
    const rig = this.rig;
    if (!rig) return;
    for (const [name, angle] of Object.entries(rig.standPose)) {
      setJointAngle(rig, name, angle);
    }
    const base = rig.bodyPivots.get("base");
    if (base) base.position.z = 0.62;
    this.publishPose();
  }

  private publishPose(): void {
    const rig = this.rig!;
    rig.holder.position.set(this.sim.pose.x, 0, this.sim.pose.z);
    rig.holder.rotation.y = this.sim.pose.heading;
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
  orientation(): { driver: [number, number, number]; base: [number, number, number] } {
    if (!this.rig) return { driver: [0, 0, 0], base: [0, 0, 0] };
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    this.rig.driver.getWorldQuaternion(q);
    e.setFromQuaternion(q);
    const driver: [number, number, number] = [e.x, e.y, e.z];
    const basePivot = this.rig.bodyPivots.get("base")!;
    basePivot.getWorldQuaternion(q);
    e.setFromQuaternion(q);
    return { driver, base: [e.x, e.y, e.z] };
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
      orient: () => { driver: [number, number, number]; base: [number, number, number] };
    };
  }
}

export { wrapAngle };
