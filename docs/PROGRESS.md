# PROGRESS — patrol-lab

## Status
Phase: 2 (mission DSL + editor) — done. Next: Phase 3 (locomotion + path following).

## Log
- 2026-10-21: P0 — scaffold (Next 16 + R3F 9 + CodeMirror 6 + zustand), vendored
  ANYmal C assets (Menagerie BSD-3), docs + CI. Repo: ricothenfx/patrol-lab.
- 2026-10-21: P1 — `scripts/bake_rig.py` (uv + mujoco) bakes MJCF → rig.json with
  MuJoCo mesh COM offsets (all 24 meshes non-zero — raw XML placement would drift).
  MJCF-faithful rig in three.js (13 bodies, 12 hinge joints, 50 visual geoms,
  textures). Industrial site: dark ground + grid, 5 POI beacons, fog, ACES tone.
  Idle stance + weight shift; debug hook `window.__patrol` (frames/tris/joints/mode).
  e2e smoke: robot loads, 12 joints, >5k tris, no page errors, screenshot.
  Ops: e2e/test server pinned to port 3031 (registered in ~/PORTS.md) — host 3000
  belongs to another production stack.
- 2026-10-21: P2 — Mission DSL (MISSION/GOTO/INSPECT/WAIT/SPEED/ALERT IF) with
  line+col parser errors; MissionRunner interpreter (fixed-timestep 120 Hz, seeded
  findings, implicit repositioning before INSPECT, debugger step/pause/reset);
  kinematic trot gait + heading control in SimWorld; CodeMirror 6 editor (custom
  stream language, lint, active-line execution marker), controls with seed +
  playback (0.5–4×), presets, event log. e2e: golden mission DONE 10/10 stmts,
  4 findings, parse-error refusal, step mode. Ops: e2e requires rebuild before
  `next start` — Turbopack incremental cache served a stale module once (currentLine
  bug seen in tests but not in source); clean `.next` on doubt. test-results/ now
  gitignored.
