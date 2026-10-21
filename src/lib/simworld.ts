import * as THREE from "three";
import type { Rig } from "./rig";
import { setJointAngle } from "./rig";

export type SimMode = "unloaded" | "idle" | "mission";

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

/**
 * Deterministic per-frame simulation state (ADR-04). Lives outside React:
 * `tick` writes joint angles straight into the rig. The MissionRunner drives
 * the robot in mission mode; otherwise an idle stance plays. All higher-level
 * motion is kinematic — the UI labels it honestly (KINEMATIC).
 */
export class SimWorld {
  mode: SimMode = "unloaded";
  speedMult = 1;
  pose: Pose = { x: 0, z: 0, heading: 0 };
  target: { x: number; z: number } | null = null;
  targetPoi: string | null = null;
  scanning = false;

  private rig: Rig | null = null;
  private t = 0;
  private gaitPhase = 0;
  frames = 0;
  odometer = 0; // meters walked since attach — real metric, shown in the KPI card

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
    this.applyStand();
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

  enterIdle(): void {
    this.mode = "idle";
    this.target = null;
    this.targetPoi = null;
    this.scanning = false;
    this.speedMult = 1;
    this.applyStand();
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
    this.applyStand();
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

  applyStand(): void {
    if (!this.rig) return;
    for (const [name, angle] of Object.entries(this.rig.standPose)) {
      setJointAngle(this.rig, name, angle);
    }
    const base = this.rig.bodyPivots.get("base");
    if (base) base.position.z = 0.62;
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

    if (this.mode === "mission") this.tickLocomotion(dt, speedMult);
    else this.tickIdle();
  }

  private tickIdle(): void {
    const rig = this.rig!;
    for (const [name, base] of Object.entries(rig.standPose)) {
      const leg = name.slice(0, 2);
      const isHaa = name.endsWith("HAA");
      let angle = base;
      if (isHaa) {
        const pair = leg === "LF" || leg === "RH" ? 0 : Math.PI;
        angle += 0.02 * Math.sin(this.t * 0.9 + pair);
      } else {
        angle += 0.008 * Math.sin(this.t * 0.6 + (name.endsWith("HFE") ? 0 : 1.3));
      }
      setJointAngle(rig, name, angle);
    }
    const base = rig.bodyPivots.get("base");
    if (base) base.position.z = 0.62 + 0.004 * Math.sin(this.t * 0.7);
  }

  private tickLocomotion(dt: number, speedMult: number): void {
    const target = this.target;

    if (this.scanning) {
      // hold still while sensors run; settle into stance
      this.applyStand();
      return;
    }

    if (!target) {
      this.applyStand();
      return;
    }

    const dx = target.x - this.pose.x;
    const dz = target.z - this.pose.z;
    const dist = Math.hypot(dx, dz);
    const desired = Math.atan2(-dz, dx);
    const err = wrapAngle(desired - this.pose.heading);

    // turn in place first, then walk
    if (Math.abs(err) > 0.06) {
      const turn = Math.min(Math.abs(err), TURN_RATE * dt) * Math.sign(err);
      this.pose.heading = wrapAngle(this.pose.heading + turn);
      this.gaitPhase += dt * STRIDE_RATE * 0.45 * speedMult;
    } else {
      const step = Math.min(dist, BASE_SPEED * speedMult * dt);
      this.pose.x += Math.cos(this.pose.heading) * step;
      this.pose.z += -Math.sin(this.pose.heading) * step;
      this.odometer += step;
      this.gaitPhase += dt * STRIDE_RATE * speedMult;
    }

    this.applyGait();

    if (dist <= ARRIVE_EPS && Math.abs(err) < 0.1) {
      this.pose.x = target.x;
      this.pose.z = target.z;
      this.target = null;
      this.applyStand();
    }
  }

  /**
   * Kinematic trot: diagonal pairs (LF+RH vs RF+LH) swing in anti-phase.
   * Amplitudes are conservative on purpose — visual plausibility without
   * claiming dynamics.
   */
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

    // publish holder transform (three.js world space)
    rig.holder.position.set(this.pose.x, 0, this.pose.z);
    rig.holder.rotation.y = this.pose.heading;
  }
}

export const sim = new SimWorld();

declare global {
  interface Window {
    __patrol?: {
      frames: () => number;
      tris: () => number;
      joints: () => number;
      mode: () => string;
      pose: () => Pose;
      orient: () => { driver: [number, number, number]; base: [number, number, number] };
    };
  }
}
