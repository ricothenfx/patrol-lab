import { sim } from "./simworld";
import { MissionRunner } from "./mission/runner";

/**
 * Single facade the viewport ticks. Routes frames to the mission interpreter
 * when a mission is active (RUNNING or stepping), otherwise plays idle stance.
 * Playback multiplier scales wall-time into mission-time (deterministic).
 */
class Orchestrator {
  readonly runner = new MissionRunner(sim);
  playback = 1;

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
}

export const orchestrator = new Orchestrator();
