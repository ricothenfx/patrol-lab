/**
 * DYNAMICS (beta) locomotion backend: rigid-body physics via the MuJoCo WASM
 * engine, driven by the shared CPG controller (controller.ts).
 *
 * Contract (LocoBackend, see simworld.ts): tick() advances physics by dt of
 * mission time, then writes the resulting pose/joints into the three.js rig
 * and sim.pose. Falls are recovered by an in-place reset (counted via
 * sim.markReset(), logged by the interpreter) so a demo can never dead-end.
 *
 * Honest scope: the controller walks forward reliably and arcs gently toward
 * waypoints (arrival tolerance 0.45 m). Sharp turns are future work (ADR-02).
 */
import type { Rig } from "../rig";
import { setJointAngle } from "../rig";
import type { LocoBackend, LocoCmd, LocMode, Pose, SimWorld } from "../simworld";
import { wrapAngle } from "../simworld";
import { DynamicsEngine, PHYS_DT } from "./engine";
import { DEFAULT_GAIT, JOINT_NAMES, jointTargets, phaseStep } from "./controller";

const MIN_STAND_Z = 0.2; // below this the body is on the ground → recover
const MAX_ROLL = 1.0; // rad
export const ARRIVE_EPS_DYN = 0.45; // wide arcs → generous capture radius

const STAND = { HAA: 0, HFE: 0.55, KFE: -1 };

export class DynamicsBackend implements LocoBackend {
  readonly kind: LocMode = "dynamics";
  readonly arriveEps = ARRIVE_EPS_DYN;
  readonly engine = new DynamicsEngine();
  private sim: SimWorld;
  private rig: Rig | null = null;
  private ready = false;
  private phase = 0;
  private acc = 0;
  private lastRoll = 0;
  private walkT = 0;

  constructor(sim: SimWorld) {
    this.sim = sim;
  }

  async ensureReady(onProgress?: (done: number, total: number) => void): Promise<void> {
    if (this.ready) return;
    await this.engine.init(onProgress);
    this.ready = true;
    const p = this.sim.pose;
    this.engine.resetAt(p.x, -p.z, 0.62, p.heading, STAND);
    this.engine.forward();
  }

  attach(rig: Rig, pose: Pose): void {
    this.rig = rig;
    this.phase = 0;
    this.acc = 0;
    this.walkT = 0;
    if (this.ready) {
      this.engine.resetAt(pose.x, -pose.z, 0.62, pose.heading, STAND);
      this.engine.forward();
      this.applyPhysPose(this.engine.pose());
    } else {
      // engine not initialized yet — hold the visual stance until ensureReady
      for (const [name, angle] of Object.entries(rig.standPose)) setJointAngle(rig, name, angle);
      const base = rig.bodyPivots.get("base");
      if (base) base.position.z = 0.62;
      rig.holder.position.set(pose.x, 0, pose.z);
      rig.holder.rotation.y = pose.heading;
    }
  }

  detach(): void {
    this.rig = null;
  }

  arrive(): void {
    // no snap: the rigid body must walk the last centimeters itself
  }

  tick(dt: number, cmd: LocoCmd): void {
    if (!this.rig || !this.ready) return;

    // physics is the source of truth for pose in this mode
    const p0 = this.engine.pose();
    const pose = this.sim.pose;
    pose.x = p0.x;
    pose.z = -p0.y;
    pose.heading = p0.yaw;

    // heading error toward the waypoint (three.js convention == mjcf yaw)
    let yawErr = 0;
    if (cmd.kind === "goto") {
      const desired = Math.atan2(-(cmd.tz - pose.z), cmd.tx - pose.x);
      yawErr = wrapAngle(desired - pose.heading);
    }

    // controller runs at tick rate; targets held across the physics substeps
    // (deterministic: same command stream → same targets)
    const g = {
      phase: this.phase,
      roll: p0.roll,
      rollRate: (p0.roll - this.lastRoll) / dt,
      pitch: p0.pitch,
      yawErr,
      speedMult: cmd.kind === "goto" ? cmd.speedMult : 0,
      walkT: this.walkT,
      zErr: DEFAULT_GAIT.stanceZ - p0.z,
      zRate: p0.vz,
    };
    if (cmd.kind === "goto") {
      this.phase += phaseStep(dt, g, DEFAULT_GAIT);
      this.walkT += dt;
    }
    const targets = jointTargets(g, DEFAULT_GAIT);
    for (const name of JOINT_NAMES) this.engine.setCtrl(name, targets[name]);
    this.lastRoll = p0.roll;

    this.acc += dt;
    let guard = 0;
    while (this.acc >= PHYS_DT && guard++ < 240) {
      this.acc -= PHYS_DT;
      this.engine.step();
    }

    const p1 = this.engine.pose();

    // fall guard: recover in place instead of dead-ending the mission
    const fallen =
      !Number.isFinite(p1.x + p1.y + p1.z) || p1.z < MIN_STAND_Z || Math.abs(p1.roll) > MAX_ROLL;
    if (fallen) {
      const x = Number.isFinite(p1.x) ? p1.x : pose.x;
      const y = Number.isFinite(p1.y) ? p1.y : -pose.z;
      const yaw = Number.isFinite(p1.yaw) ? p1.yaw : pose.heading;
      this.engine.resetAt(x, y, 0.62, yaw, STAND);
      this.engine.forward();
      this.phase = 0;
      this.walkT = 0;
      this.lastRoll = 0;
      this.sim.markReset();
    } else {
      if (cmd.kind === "goto") this.sim.odometer += Math.hypot(p1.x - p0.x, p1.y - p0.y);
      this.applyPhysPose(p1);
    }
  }

  /** write physics pose into rig: holder (world x/z + yaw), base pivot (z + quat), joints */
  private applyPhysPose(p: ReturnType<DynamicsEngine["pose"]>): void {
    const rig = this.rig!;
    this.sim.pose.x = p.x;
    this.sim.pose.z = -p.y;
    this.sim.pose.heading = p.yaw;

    rig.holder.position.set(p.x, 0, -p.y);
    rig.holder.rotation.y = p.yaw;

    const base = rig.bodyPivots.get("base");
    if (base) {
      base.position.z = p.z;
      base.quaternion.set(p.qx, p.qy, p.qz, p.qw);
    }
    for (const name of JOINT_NAMES) setJointAngle(rig, name, p.joints[name] ?? 0);
  }
}
