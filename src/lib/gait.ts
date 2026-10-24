/**
 * World-anchored stepping gait for the KINEMATIC locomotion backend.
 *
 * The previous gait drove joint angles directly with one shared sine shape.
 * The MJCF bends front knees opposite to hind knees (elbow vs knee), so
 * identical joint offsets move front and hind feet in opposite world
 * directions, and the baked stand pose left the front paws floating — the
 * robot skittered, slid and looked nose-heavy (scripts/sign_probe.mjs).
 *
 * This engine works in world space instead: each foot owns a planted world
 * anchor. During stance the anchor is FROZEN and a small numeric IK re-solves
 * the leg every frame as the body moves, so feet cannot slide. Diagonal trot
 * pairs swing in anti-phase along an arc to a fresh anchor ahead of the hip.
 * The level stand places every foot exactly on the ground.
 *
 * Deterministic: phase derives only from accumulated dt; no randomness.
 */
import * as THREE from "three";
import type { Rig, JointHandle } from "./rig";

export const LEGS = ["LF", "RF", "LH", "RH"] as const;
export type Leg = (typeof LEGS)[number];

/** nominal body ride height (m) — feet planted under the hips at this height */
export const BODY_HEIGHT = 0.55;
/** home foot offsets under the hips in the body frame (x forward, y left) */
const HOME: Record<Leg, [number, number]> = {
  LF: [0.36, 0.3],
  RF: [0.36, -0.3],
  LH: [-0.36, 0.3],
  RH: [-0.36, -0.3],
};
/** trot: diagonal pairs move together (LF+RH vs RF+LH) */
const PAIR: Record<Leg, number> = { LF: 0, RH: 0, RF: 0.5, LH: 0.5 };
/** fraction of the stride spent swinging */
const SWING_FRAC = 0.5;
/** swing apex height (m) */
const SWING_LIFT = 0.09;
/** foot sphere radius (m) — targets the paw CENTER so the sole rests at y=0 */
const FOOT_R = 0.03;
/** body bob amplitude (m) — two bobs per stride, as in a real trot */
const BOB = 0.006;
/** body roll amplitude (rad) — diagonal-pair rhythm */
const ROLL = 0.012;

const _target = new THREE.Vector3();
const _world = new THREE.Vector3();
const _roll = new THREE.Quaternion();
const _xAxis = new THREE.Vector3(1, 0, 0);
const _err = new THREE.Vector3();
const _dq = [0, 0, 0];

function frac(x: number): number {
  return x - Math.floor(x);
}

interface LegRig {
  joints: [JointHandle, JointHandle, JointHandle]; // HAA HFE KFE
  foot: THREE.Object3D;
  anchorFrom: THREE.Vector3;
  anchorTo: THREE.Vector3;
  lastU: number;
}

/** solve 3x3 system A x = b via Cramer's rule; returns false when singular */
function solve3(A: number[][], b: number[], out: number[]): boolean {
  const det =
    A[0][0] * (A[1][1] * A[2][2] - A[1][2] * A[2][1]) -
    A[0][1] * (A[1][0] * A[2][2] - A[1][2] * A[2][0]) +
    A[0][2] * (A[1][0] * A[2][1] - A[1][1] * A[2][0]);
  if (Math.abs(det) < 1e-12) return false;
  for (let i = 0; i < 3; i++) {
    const M = A.map((row, r) => row.map((v, c) => (c === i ? b[r] : v)));
    out[i] =
      (M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) -
        M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) +
        M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0])) /
      det;
  }
  return true;
}

export class SteppingGait {
  phase = 0;
  private legs = new Map<Leg, LegRig>();

  attach(rig: Rig): void {
    this.legs.clear();
    for (const leg of LEGS) {
      const haa = rig.joints.get(`${leg}_HAA`);
      const hfe = rig.joints.get(`${leg}_HFE`);
      const kfe = rig.joints.get(`${leg}_KFE`);
      const shank = rig.bodyPivots.get(`${leg}_SHANK`);
      if (!haa || !hfe || !kfe || !shank) continue;
      let foot: THREE.Object3D | undefined;
      shank.traverse((o) => {
        if (o.name === `${leg}_SHANK:foot`) foot = o;
      });
      if (!foot) continue;
      this.legs.set(leg, {
        joints: [haa, hfe, kfe],
        foot,
        anchorFrom: new THREE.Vector3(),
        anchorTo: new THREE.Vector3(),
        lastU: 0,
      });
    }
  }

  /** world position of a foot right now (requires an up-to-date holder transform) */
  private footWorld(leg: Leg, out: THREE.Vector3): THREE.Vector3 {
    const l = this.legs.get(leg)!;
    l.foot.updateWorldMatrix(true, false);
    return out.setFromMatrixPosition(l.foot.matrixWorld);
  }

  /** world-space home anchor for a leg given body pose + stride lead */
  private footHome(
    leg: Leg,
    bx: number,
    bz: number,
    heading: number,
    leadFwd: number,
    leadTurn: number,
    out: THREE.Vector3,
  ): THREE.Vector3 {
    const [hx, hy] = HOME[leg];
    const cos = Math.cos(heading);
    const sin = Math.sin(heading);
    // body frame: x forward, y LEFT. The rig lives under a -90° X root flip,
    // so body-left is holder -z; rotating the home by (heading + leadTurn)
    // mirrors R_y: (x, z) -> (x cosθ + z sinθ, -x sinθ + z cosθ).
    const a = heading + leadTurn;
    const rx = hx * Math.cos(a) - hy * Math.sin(a);
    const rz = -(hx * Math.sin(a) + hy * Math.cos(a));
    return out.set(bx + rx + cos * leadFwd, FOOT_R, bz + rz - sin * leadFwd);
  }

  /**
   * Place every foot on the ground under its hip (level stand) and freeze the
   * anchors there. Used on attach, after arrival and after resets.
   */
  plantFeet(bx: number, bz: number, heading: number): void {
    for (const leg of this.legs.keys()) {
      this.footHome(leg, bx, bz, heading, 0, 0, _target);
      this.solve(leg, _target, 8);
      const l = this.legs.get(leg)!;
      this.footWorld(leg, _world);
      l.anchorTo.set(_world.x, FOOT_R, _world.z);
      l.anchorFrom.copy(l.anchorTo);
      l.lastU = frac(this.phase + PAIR[leg]);
    }
  }

  /**
   * Advance the stepping gait one tick.
   * `leadFwd` (m) stretches the step ahead along the walk direction; when
   * turning in place `leadTurn` (rad) rotates the homes around the pivot.
   */
  update(opts: {
    dtPhase: number;
    bx: number;
    bz: number;
    heading: number;
    leadFwd: number;
    leadTurn: number;
    walking: boolean;
  }): void {
    this.phase += opts.dtPhase;
    for (const [leg, l] of this.legs) {
      const u = frac(this.phase + PAIR[leg]);
      if (u < l.lastU) {
        // wrapped into swing: capture the planted foot and step to a fresh anchor
        this.footWorld(leg, _world);
        l.anchorFrom.set(_world.x, FOOT_R, _world.z);
        this.footHome(leg, opts.bx, opts.bz, opts.heading, opts.leadFwd, opts.leadTurn, l.anchorTo);
      }
      l.lastU = u;
      if (u < SWING_FRAC && opts.walking) {
        const s = u / SWING_FRAC;
        _target.lerpVectors(l.anchorFrom, l.anchorTo, s);
        _target.y = FOOT_R + Math.sin(Math.PI * s) * SWING_LIFT;
        this.solve(leg, _target, 3);
      } else {
        // planted: frozen world anchor, IK keeps it there while the body moves
        // (warm-started single iteration — the frame-to-frame drift is mm)
        _target.copy(l.anchorTo);
        this.solve(leg, _target, 1);
      }
    }
  }

  /** body ride height + bob + diagonal roll (call BEFORE solving the legs) */
  body(rig: Rig): void {
    const base = rig.bodyPivots.get("base");
    if (!base) return;
    base.position.z = BODY_HEIGHT + BOB * (0.5 - 0.5 * Math.cos(4 * Math.PI * this.phase));
    _roll.setFromAxisAngle(_xAxis, ROLL * Math.sin(2 * Math.PI * this.phase));
    base.quaternion.copy(rig.baseQuat).multiply(_roll);
  }

  /**
   * Numeric 3-DOF IK (HAA/HFE/KFE) placing the foot at a world target.
   * Damped Gauss-Newton with a finite-difference Jacobian evaluated on the
   * live chain (the same transforms the renderer uses). Converges in a few
   * iterations from the previous frame's angles.
   */
  private solve(leg: Leg, target: THREE.Vector3, iters: number): void {
    const l = this.legs.get(leg);
    if (!l) return;
    const handles = l.joints;
    const h = 0.02;
    const p0 = [0, 0, 0];
    const p1 = [0, 0, 0];
    for (let iter = 0; iter < iters; iter++) {
      this.footWorld(leg, _world);
      _err.set(target.x - _world.x, target.y - _world.y, target.z - _world.z);
      if (_err.lengthSq() < 1e-6) return;
      p0[0] = _world.x;
      p0[1] = _world.y;
      p0[2] = _world.z;
      // Jacobian J[row][joint] = dfoot/dangle from finite differences
      const J: number[][] = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
      for (let j = 0; j < 3; j++) {
        const jt = handles[j];
        jt.pivot.quaternion.setFromAxisAngle(jt.axis, jt.angle + h);
        this.footWorld(leg, _world);
        p1[0] = _world.x;
        p1[1] = _world.y;
        p1[2] = _world.z;
        // restoring the angle reproduces p0 exactly — no re-measure needed
        jt.pivot.quaternion.setFromAxisAngle(jt.axis, jt.angle);
        for (let r = 0; r < 3; r++) J[r][j] = (p1[r] - p0[r]) / h;
      }
      // damped least squares: dq = Jᵀ (JJᵀ + λI)⁻¹ err
      const lam = 1e-4;
      const A: number[][] = [];
      for (let r = 0; r < 3; r++) {
        const row: number[] = [];
        for (let c = 0; c < 3; c++) {
          let s = r === c ? lam : 0;
          for (let k = 0; k < 3; k++) s += J[r][k] * J[c][k];
          row.push(s);
        }
        A.push(row);
      }
      const b = [0, 0, 0];
      for (let r = 0; r < 3; r++) {
        b[r] = J[r][0] * _err.x + J[r][1] * _err.y + J[r][2] * _err.z;
      }
      if (!solve3(A, b, _dq)) return;
      for (let j = 0; j < 3; j++) {
        const jt = handles[j];
        const step = Math.max(-0.2, Math.min(0.2, _dq[j]));
        const next = Math.max(jt.range[0], Math.min(jt.range[1], jt.angle + step));
        jt.angle = next;
        jt.pivot.quaternion.setFromAxisAngle(jt.axis, next);
      }
    }
  }
}
