# AGENTS.md — patrol-lab working agreement

Entry point for any person or AI agent working on this repository.
Development must rely on these documents, never on chat history.

## Identity

- **Name:** patrol-lab
- **One sentence:** Mission control for autonomous inspection robots — a web-native
  simulation of an ANYmal C quadruped patrolling an industrial site, driven by a
  mission script the user writes and watches execute line by line.
- **Goal:** Portfolio engineering project aimed at robotics/inspection companies
  (ANYbotics & peers). It must demonstrate: robotics-grade simulation in the browser,
  a deterministic mission interpreter, production-quality control-room UI, and honest,
  reproducible numbers.
- **Production URL:** https://patrol-lab.ricothen.com (Vercel)
- **Layout:** Next.js (App Router) + React Three Fiber + CodeMirror 6 + zustand.

## Read in this order (every new session)

1. `AGENTS.md` (this file)
2. `docs/PROGRESS.md` — current status
3. `docs/ROADMAP.md` — phases and definition of done
4. `docs/BLUEPRINT.md` — architecture decisions (ADR log)
5. `docs/DESIGN.md` — visual system and design tokens

## Hard rules

- **Language:** all code, docs, CLI output, and commit messages in **English**.
- **Deterministic core:** simulation, interpreter, planner, and scoring run without any
  network. The LLM is a plugin behind `OPENAI_API_KEY`; without it the app is fully
  functional (features hide, `MOCK_MODE` supplies pre-baked outputs). The LLM never
  drives the robot directly — it may only propose mission DSL code, which is validated
  by the DSL parser before execution ("AI proposes, the interpreter disposes").
- **Honesty over hype:** the UI must label the locomotion mode truthfully
  (`kinematic` vs `dynamics`). Never claim physics that is not running. Every number
  on a dashboard must come from a real metric source in the code.
- **Perf budget:** 60 fps on an integrated-GPU laptop; simulation runs on the client.
  The server (Vercel) only serves static assets and stateless API routes. Heavy assets
  (robot meshes ~16 MB) load async with a visible progress state, never blocking UI.
- **Secrets:** no secrets in git. Everything via env vars; `.env.example` holds
  placeholders only.
- **This VPS hosts other production stacks.** Never bind ports below 3031 and never
  assume port 3000 is free; local/e2e server uses `next start -p 3031` (registered in
  `~/PORTS.md`). Production runs on Vercel, not on this host.
- **Verification before done:** `npm run lint && npm run build` must pass, plus
  `npx playwright test` for affected flows. Always clean-build (`rm -rf .next`)
  when a source change "mysteriously" does not appear — the Turbopack incremental
  cache has served stale modules before. Phases are only complete after push.
  NEVER run the full e2e suite against the production URL — the traffic burst
  trips Vercel's automatic Security Checkpoint and blocks real visitors for a
  while. Use `E2E_BASE_URL` for at most one smoke pass when truly needed.
- **Commits:** conventional commits (`feat|fix|docs|chore|refactor|test(scope): msg`).
  One commit (or more) per phase, pushed; `docs/PROGRESS.md` updated in the same push.

## Layout

```
src/lib/          deterministic core (mjcf parser, rig, DSL, interpreter, planner, sim)
src/components/   UI (viewport, editor, dashboard, panels)
src/app/          Next.js routes
public/models/    vendored robot assets (BSD-3-Clause, see LICENSE there)
docs/             charter documents
e2e/              Playwright specs
```

## Robot model attribution

ANYmal C model and assets from
[MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie)
(`anybotics_anymal_c`, BSD-3-Clause, © DeepMind / ANYbotics contributors), vendored
under `public/models/anymal_c`. This project is an independent portfolio piece and is
not affiliated with ANYbotics AG.
