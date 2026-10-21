/**
 * Pure control law for the DYNAMICS (beta) locomotion mode.
 *
 * A CPG crawl-trot fed through the real MuJoCo physics as position-servo
 * targets, plus four lightweight feedback terms: roll damping via common-mode
 * HAA, pitch damping via a joint-common HFE shift, height hold via a KFE
 * common mode, and yaw steering via a diagonal HFE differential (tank steer).
 *
 * Sign conventions (FORE/YAWD, rollSign, pitchSign, kZ) are empirical
 * constants of THIS model — settled on the headless harness
 * (scripts/dyn_harness.mjs), where the MJCF's mirrored leg axes make
 * first-principles derivation treacherous. The robot walks reliably forward
 * and arcs gently toward waypoints; sharp turns and a learned locomotion
 * policy remain documented future work (ADR-02).
 *
 * Shared between the browser engine and the harness so tuned parameters
 * cannot drift. Keep it free of browser/DOM APIs (erasable TS only — Node
 * runs it via native type stripping).
 */

export interface GaitParams {
  /** settled standing targets (matches the rig stand pose) */
  stance: { HAA: number; HFE: number; KFE: number };
  /** fore-aft HFE sweep half-span (rad) */
  ampHfeSwing: number;
  /** KFE fold depth during swing (rad) */
  ampKfeLift: number;
  /** gait cycles per second at 1× */
  strideRate: number;
  /** duty factor: 0.5 = trot (diagonal pairs), 0.75 = crawl (3-foot support) */
  duty: number;
  kpRoll: number;
  kdRoll: number;
  kpPitch: number;
  /** diagonal HFE differential per rad of yaw error */
  kpYaw: number;
  /** max |differential| applied to one HFE (rad) */
  yawDiffLimit: number;
  /** feedback signs — empirical constants of the model's mirrored axes */
  rollSign: number;
  pitchSign: number;
  liftSign: number;
  /** active height hold: target base height (m) and KFE common-mode gains */
  stanceZ: number;
  kZ: number;
  kdZ: number;
}

export const DEFAULT_GAIT: GaitParams = {
  stance: { HAA: 0.0, HFE: 0.55, KFE: -1.0 },
  ampHfeSwing: 0.5,
  ampKfeLift: 0.45,
  strideRate: 1.3,
  duty: 0.75,
  kpRoll: 0.3,
  kdRoll: 0.04,
  kpPitch: 0.35,
  kpYaw: 0.35,
  yawDiffLimit: 0.32,
  rollSign: 1,
  pitchSign: 1,
  liftSign: 1,
  stanceZ: 0.42,
  kZ: -1.4,
  kdZ: 0.2,
};

export const LEGS = ["LF", "RF", "LH", "RH"] as const;
export type Leg = (typeof LEGS)[number];
export const JOINT_NAMES: string[] = LEGS.flatMap((l) => [`${l}_HAA`, `${l}_HFE`, `${l}_KFE`]);

/** lateral crawl footfall sequence LF → LH → RF → RH (net yaw moment ≈ 0) */
const OFFSET: Record<string, number> = { LF: 0, LH: 0.25, RF: 0.5, RH: 0.75 };

/** diagonal pairs for the trot duty: LF+RH vs RF+LH */
function gaitOffset(leg: string, duty: number): number {
  return duty >= 0.75 ? OFFSET[leg] : leg === "LF" || leg === "RH" ? 0 : 0.5;
}

/** stride shape per leg: fore-aft sweep in [−0.5,0.5] and lift in [0,1] */
function strideShape(theta: number, duty: number): { sweep: number; lift: number } {
  if (duty >= 0.75) {
    // swing on θ∈[0,0.25), planted linear rearward sweep on the rest
    if (theta < 0.25) {
      const v = theta / 0.25;
      return { sweep: -0.5 + v, lift: Math.sin(Math.PI * v) };
    }
    const s = (theta - 0.25) / 0.75;
    return { sweep: 0.5 - s, lift: 0 };
  }
  // trot: planted (sweep +1 → −1) on θ∈[0,0.5), lift on the return
  const ph = 2 * Math.PI * theta;
  return { sweep: Math.cos(ph), lift: Math.max(0, -Math.sin(ph)) };
}

/**
 * World-consistent sign structure, measured from the MJCF
 * (scripts/axis_probe.mjs): a positive HFE swings a FRONT foot forward but a
 * REAR foot backward, so the fore-aft drive is front/rear-mirrored in joint
 * space (FORE). Pitch feedback is joint-common (a world fore/aft
 * differential) and yaw steering is a diagonal differential (world left/right
 * stride difference, YAWD).
 */
const FORE = { LF: 1, RF: 1, LH: -1, RH: -1 };
const YAWD = { LF: 1, RF: -1, LH: -1, RH: 1 };

export interface GaitState {
  phase: number; // cycles
  roll: number; // rad
  rollRate: number;
  pitch: number; // rad
  yawErr: number; // desired − current heading (rad)
  speedMult: number;
  /** seconds since walking started — soft-start ramp */
  walkT: number;
  /** base height error: target − actual (m) */
  zErr: number;
  /** base vertical velocity (m/s) */
  zRate: number;
}

/**
 * Joint targets for all 12 joints at one control instant.
 * `phase` is advanced by the caller (physics-rate integration keeps it
 * deterministic with the playback multiplier).
 */
export function jointTargets(g: GaitState, p: GaitParams): Record<string, number> {
  const softStart = Math.min(1, Math.max(0, g.walkT) / 0.6);
  const intensity = softStart;
  const out: Record<string, number> = {};

  const yawDiff = Math.max(-p.yawDiffLimit, Math.min(p.yawDiffLimit, p.kpYaw * wrap(g.yawErr)));
  const pitchShift = p.pitchSign * p.kpPitch * g.pitch;
  const rollFb = p.rollSign * (p.kpRoll * g.roll + p.kdRoll * g.rollRate);
  const zFb = p.kZ * g.zErr - p.kdZ * g.zRate;

  for (const leg of LEGS) {
    const theta = g.phase + gaitOffset(leg, p.duty);
    const th = theta - Math.floor(theta);
    const { sweep, lift } = strideShape(th, p.duty);

    const haa = p.stance.HAA + rollFb;
    const hfe = p.stance.HFE + FORE[leg] * intensity * p.ampHfeSwing * sweep + pitchShift + YAWD[leg] * yawDiff;
    const kfe = p.stance.KFE - intensity * p.liftSign * p.ampKfeLift * lift + zFb;

    out[`${leg}_HAA`] = haa;
    out[`${leg}_HFE`] = hfe;
    out[`${leg}_KFE`] = kfe;
  }
  return out;
}

/** gait-phase increment (cycles) for one physics step */
export function phaseStep(dt: number, g: Pick<GaitState, "speedMult">, p: GaitParams): number {
  return dt * p.strideRate * g.speedMult;
}

function wrap(a: number): number {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}
