# PROGRESS — patrol-lab

## Status
Phase 6 (hardening + launch) — done. Shipped: https://patrol-lab.vercel.app

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
- 2026-10-21: P3 — follow/orbit camera toggle (exp-smoothed, OrbitControls gated),
  route line robot→target, pulsing target ring, INSPECT scan FX (expanding rings +
  rotating beam, 3 s sync with interpreter), playwright retries=1 for the 4-core
  host. A* planner intentionally deferred: site graph has no obstacles, straight
  legs are already optimal — revisit if the site gains no-go zones (ROADMAP note).
- 2026-10-21: P4 — control-room layer: mission telemetry KPI card (clock,
  odometer, POI coverage, findings, alerts, seed — all real metrics), POI
  coverage chips, canvas tactical minimap (POIs, robot pose/heading, target
  link), default follow camera with delta-tracking + ideal-framing drift,
  park-beside-POI approach offsets.
  Two structural bugs found by screenshot review + a quaternion probe
  (e2e/orient.spec.ts): (1) yaw/position applied inside the mujoco frame
  pitched the robot 90 deg and lifted it by pose.z — fixed with a three-space
  `holder` group above the axis-flip root; (2) gait roll wrote Euler onto the
  base pivot, wiping the MJCF 180-deg quaternion — roll now multiplies on top
  of the preserved base quaternion. Textures downscaled to 512 px
  (12 MB -> 1.3 MB) after cold-start frame-rate flake; playwright retries=1.
- 2026-10-21: P5 — LLM as optional plugin (ADR-06): POST /api/llm/compile
  (NL -> mission DSL; grammar in system prompt; parse-validate + one bounded
  retry feeding parser errors back; mock rule-based artifacts when no key /
  MOCK_MODE=1, labeled MOCK in UI) and POST /api/llm/report (grounded report
  from the mission log; strict-JSON contract; honest rule-based fallback
  labeled RULE-BASED). UI: NL bar with reviewable diff + accept/discard,
  report panel. e2e/llm.spec.ts covers mock compile->accept->run->report.
  Orientation regression spec added (holder-frame guard). Lint clean
  (react-hooks/immutability disabled only in three.js-imperative files).
- 2026-10-21: P6 — production deploy on Vercel (project patrol-lab). Verified
  public 200 + mock API + rig.json. Notes for ops: (1) never run the full e2e
  suite against production — the traffic burst trips Vercel's automatic
  Security Checkpoint for the source IP (decays on its own; browsers pass the
  JS challenge); E2E_BASE_URL exists for a single smoke run when needed.
  (2) A first deploy accidentally targeted the parent folder's linked project
  ("portfolio") — rolled back to the previous production deployment and
  re-deployed explicitly from an isolated directory with a pinned
  .vercel/project.json. (3) CI green on GitHub runners (lint+build+e2e).
