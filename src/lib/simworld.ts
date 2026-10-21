import type { Rig } from "./rig";
import { setJointAngle } from "./rig";

export type SimMode = "unloaded" | "idle";

/**
 * Deterministic per-frame simulation state. Lives outside React (ADR-04):
 * `tick()` is called once per frame from the render loop and writes joint
 * angles straight into the rig; React only sees low-frequency store updates.
 */
export class SimWorld {
  mode: SimMode = "unloaded";
  private rig: Rig | null = null;
  private t = 0;
  frames = 0;

  get jointCount(): number {
    return this.rig ? this.rig.joints.size : 0;
  }

  attach(rig: Rig): void {
    this.rig = rig;
    this.applyStand();
    this.mode = "idle";
  }

  detach(): void {
    this.rig = null;
    this.mode = "unloaded";
  }

  /** Standing pose from the baked MJCF stand pose. */
  applyStand(): void {
    if (!this.rig) return;
    for (const [name, angle] of Object.entries(this.rig.standPose)) {
      setJointAngle(this.rig, name, angle);
    }
  }

  /**
   * Advance one frame. dt is clamped so tab-switches never produce jumps.
   * Phase 1: idle stance with a subtle weight shift — deterministic in t.
   */
  tick(dtRaw: number): void {
    if (!this.rig || this.mode === "unloaded") return;
    const dt = Math.min(dtRaw, 0.05);
    this.t += dt;
    this.frames += 1;

    const rig = this.rig;
    for (const [name, base] of Object.entries(rig.standPose)) {
      const leg = name.slice(0, 2); // LF RF LH RH
      const isHaa = name.endsWith("HAA");
      let angle = base;
      if (isHaa) {
        // diagonal pairs shift weight in anti-phase
        const pair = leg === "LF" || leg === "RH" ? 0 : Math.PI;
        angle += 0.02 * Math.sin(this.t * 0.9 + pair);
      } else {
        angle += 0.008 * Math.sin(this.t * 0.6 + (name.endsWith("HFE") ? 0 : 1.3));
      }
      setJointAngle(rig, name, angle);
    }
    // gentle body breathing
    const base = rig.bodyPivots.get("base");
    if (base) base.position.z = 0.62 + 0.004 * Math.sin(this.t * 0.7);
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
    };
  }
}
