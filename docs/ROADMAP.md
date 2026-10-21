# ROADMAP — patrol-lab

Each phase ends with: lint + build green, Playwright checks for affected flows,
`docs/PROGRESS.md` updated, conventional commit, pushed.

## Phase 0 — Foundation (done)
- Next.js scaffold, dependency stack, repo on GitHub, CI (lint + build).
- Docs skeleton; ANYmal C assets vendored (Menagerie, BSD-3).

## Phase 1 — Robot on site (3D viewport)
- MJCF parser → three.js rig for ANYmal C (bodies, joints, visual geoms, textures).
- Industrial site: dark ground, grid, POI markers, fog, lighting, orbit controls.
- Idle stance animation; debug hook exposing triangle count + sim tick for e2e.
- **DoD:** robot renders, 60 fps target, no page errors, screenshot test stable.

## Phase 2 — Mission DSL + editor (left pane)
- Mission DSL (GOTO / INSPECT / WAIT / SPEED / ALERT IF), parser with precise errors.
- Interpreter: step-by-step execution, pause/resume/step/speed slider.
- CodeMirror 6 editor: custom language, dark theme, **active-line highlight** while
  running, markers for errors.
- **DoD:** sample mission drives `sim state` end-to-end in headless test; invalid
  missions produce line-accurate errors.

## Phase 3 — Locomotion + path following
- Heading control + CPG trot gait (kinematic driver). [A* deferred: no obstacles yet — straight legs optimal; revisit with no-go zones]
- `INSPECT` choreography: approach → scan sweep FX (rings + beam) → result event.
- Camera modes: orbit / follow.
- **DoD:** golden mission completes deterministically for a fixed seed; foot slip
  artifacts absent at normal speed; e2e asserts mission completion event.

## Phase 4 — Control-room dashboard
- Alerts (thermal threshold from INSPECT results), alert feed with MTTA/coverage KPIs.
- Mission timeline, POI registry, live minimap, replay of the last mission.
- **DoD:** every dashboard number traces to a metric source; replay mode works offline.

## Phase 5 — LLM plugins (done)
- NL → mission DSL compiler with validate-retry loop; mock mode pre-baked.
- Grounded inspection report writer (report cites event IDs).
- **DoD:** without API key UI shows nothing broken; with key, compile→run works;
  invalid LLM output is rejected by parser and retried then surfaced honestly.

## Phase 6 — Hardening + launch (done)
- Playwright suite (viewport, editor, mission run, dashboard, LLM mock).
- README with reproducible numbers + demo GIF; Vercel deploy; DNS handoff notes.
- **DoD:** production URL live, e2e green against production build.

## Phase 7 — DYNAMICS (beta): real physics stepping (done, scoped)
- MuJoCo WASM (official `@mujoco/mujoco` bindings served from `public/mujoco`) steps the
  real ANYmal C MJCF on a flat physics floor; the three.js rig renders the result.
- CPG crawl-trot controller with empirical attitude/height/yaw feedback
  (src/lib/dynamics/); the headless tuning harness (scripts/dyn_harness.mjs) shares the
  controller with the app, so harness-tuned parameters cannot drift.
- Kill-switch per ADR-02: KINEMATIC stays the default; the viewport badge toggles
  DYNAMICS (BETA) with a visible load state and falls back on failure.
- Fall auto-recovery (in-place reset, logged as a warn event); physics-derived odometer.
- **DoD:** e2e/dynamics.spec.ts — switch + beta_patrol completes at 4×, findings logged,
  finite pose, odometer > 2 m, no page errors; lint+build green.
- Honest limits (documented, not hidden): gentle heading arcs only; sharp turns and an
  MJX-trained policy are future work.
