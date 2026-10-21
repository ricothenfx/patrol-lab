# patrol-lab

**Mission control for autonomous inspection robots** — write a mission script on the
left, watch an ANYmal C quadruped execute it on a live 3D industrial site on the right.
Every alert, ETA and coverage number on the dashboard comes from the running
simulation — deterministic, seeded, reproducible.

![status](https://img.shields.io/badge/status-under_construction-ffb454)

> Independent portfolio project. Not affiliated with ANYbotics AG. Robot model:
> [MuJoCo Menagerie](https://github.com/google-deepmind/mujoco_menagerie)
> `anybotics_anymal_c` (BSD-3-Clause).

## The idea

Industrial inspection robots like ANYmal walk plants and substations following mission
plans, streaming thermal/visual/acoustic findings to a control room. patrol-lab
rebuilds that experience end-to-end in the browser:

- **Left:** a mission DSL editor (CodeMirror 6) with line-accurate errors and a
  debugger-style execution view — the line being executed is highlighted while the
  robot acts it out.
- **Right:** a three.js scene of a dark industrial site where the ANYmal C (real MJCF
  rig, real proportions) walks POI-to-POI, inspects, and triggers alerts.
- **Dashboard:** alerts with MTTA, POI coverage per mission, mission timeline, replay.

No GPU server, no robot, no game engine install — physics-faithful geometry, honest
kinematics (labeled as such), 60 fps on an integrated laptop GPU.

## Status

Under construction — see docs/ROADMAP.md and docs/PROGRESS.md.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build
npx playwright test
```

Optional: `OPENAI_API_KEY` enables the NL-to-mission compiler and report writer;
without it the app is fully functional (MOCK_MODE supplies pre-baked outputs).
