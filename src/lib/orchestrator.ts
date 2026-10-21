import { sim, dynamicsBackend, KinematicBackend } from "./simworld";
import { MissionRunner } from "./mission/runner";

/**
 * Single facade the viewport ticks. Routes frames to the mission interpreter
 * when a mission is active (RUNNING or stepping), otherwise plays idle stance.
 * Playback multiplier scales wall-time into mission-time (deterministic).
 * Also owns the locomotion-mode switch (KINEMATIC ↔ DYNAMICS beta).
 */
class Orchestrator {
  readonly runner = new MissionRunner(sim);
  playback = 1;
  private switching = false;

  setPlayback(m: number): void {
    this.playback = m;
  }

  tick(dtRaw: number): void {
    if (this.runner.busy) {
      this.runner.tick(dtRaw * this.playback);
    } else {
      sim.tick(dtRaw);
    }
  }

  /**
   * Swap the locomotion backend. The dynamics engine (WASM + mesh assets into
   * the virtual FS) initializes on first use; the UI surfaces the progress.
   * Falls back to KINEMATIC on failure — the demo never breaks.
   */
  async switchLocomotion(mode: "kinematic" | "dynamics"): Promise<boolean> {
    if (this.switching || mode === sim.locMode) return mode === sim.locMode;
    this.switching = true;
    const ui = useUi.getState();
    ui.setLocError(null);
    ui.setLocSwitching(true);
    try {
      if (mode === "dynamics") {
        await dynamicsBackend.ensureReady((done, total) => ui.setProgress(done, total));
      }
      sim.useLocomotion(mode, mode === "dynamics" ? dynamicsBackend : new KinematicBackend(sim));
      ui.setSimMode(mode === "dynamics" ? "DYNAMICS (BETA)" : "KINEMATIC");
      return true;
    } catch (err) {
      ui.setLocError(String(err instanceof Error ? err.message : err));
      return false;
    } finally {
      ui.setLocSwitching(false);
      this.switching = false;
    }
  }
}

import { useUi } from "@/state/store";

export const orchestrator = new Orchestrator();
