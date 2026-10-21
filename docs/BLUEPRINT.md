# BLUEPRINT — architecture decisions (ADR log)

Append-only. One entry per decision. Newest last.

## ADR-01 — Robot source: MuJoCo Menagerie ANYmal C
Use the official `anybotics_anymal_c` MJCF + OBJ/PNG assets (BSD-3) vendored in
`public/models/anymal_c/`. Faithful geometry and proportions of the industry-standard
quadruped; no license risk; strong signal to robotics employers.

## ADR-02 — Simulation driver: kinematic rig first, dynamics later
Phase 1–3 drive the rig kinematically (CPG trot, analytic stance, planner-fed heading).
The rig is built from the same MJCF tree (bodies/joints/geoms) so a dynamics backend
(MuJoCo WASM, `@mujoco/mujoco`) can replace the driver later without touching scene
code. UI labels the active mode honestly (`KINEMATIC` / `DYNAMICS`).
Rationale: a standing RL/physics gait is a research task; a ship-able, honest demo is
the product. The swap path stays open by construction.

## ADR-03 — Rendering: three.js WebGL2 via R3F; WebGPU behind a flag
R3F v9 + WebGL2 is the stable path (drei compatibility, integrated-GPU laptops).
A `WEBGPU=1` runtime flag may switch `WebGPURenderer`; scene code stays
renderer-agnostic. Do not block phases on WebGPU.

## ADR-04 — State: zustand for UI, mutable singleton for per-frame sim
Per-frame data (joint angles, pose) lives in a plain mutable `SimWorld` object read in
`useFrame`; zustand store carries low-frequency UI state (mission status, alerts, KPIs,
editor binding). Prevents React re-renders at 60 Hz.

## ADR-05 — Mission DSL is the only control surface
Editor, presets, and the LLM all produce DSL text; the parser is the single gateway to
execution. Errors carry line/column. Deterministic execution given (mission, seed).

## ADR-06 — LLM as optional plugin
Routes call OpenAI only when `OPENAI_API_KEY` is set; `MOCK_MODE=1` (or missing key)
returns pre-baked artifacts. Every LLM output is schema/parser-validated with a
bounded retry loop, then shown as a reviewable diff — never auto-trusted.

## ADR-07 — UI languages: cookie-based locale, German default
Four UI locales — German (default), English, Chinese, Spanish — chosen with the
topbar switcher and persisted in the `patrol-lab-locale` cookie. The server reads
the cookie (`resolveLocale()`) so SSR, `<html lang>` and hydration always agree;
`LocaleProvider` mirrors it for client components and `router.refresh()` swaps
server-rendered text. No `[locale]` URL routing: the control room is an app, not
a content tree, and existing URLs/SEO stay stable. FAQ/QA content lives in
per-locale content modules. Protocol vocabulary stays English everywhere (status
words IDLE/RUNNING/PAUSED/DONE/FAULT, DSL keywords, MOCK/LLM/RULE-BASED badges,
preset names) so the honesty labels remain consistent across languages; the
server-generated inspection report is likewise an English artifact.
