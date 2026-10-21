export type QaTag = "simulation" | "dsl" | "determinism" | "llm" | "assets" | "testing" | "planning" | "honesty";

export type QaEntry = {
  id: string;
  tags: QaTag[];
  q: string;
  a: React.ReactNode;
};

/** Technical Q&A, grounded in the repo's docs and implementation. */
export const QA_ENTRIES: QaEntry[] = [
  {
    id: "kinematic-vs-dynamics",
    tags: ["simulation", "honesty"],
    q: "Why is the gait kinematic instead of a dynamics simulation?",
    a: (
      <>
        The perf budget is 60 fps on an integrated-GPU laptop, and the whole simulation runs
        client-side. A browser MuJoCo dynamics loop on top of the three.js render loop is outside
        that budget, so locomotion is a kinematic trot with heading control. The trade-off is stated
        in the UI (<code>SIM KINEMATIC</code>) instead of hidden — honesty over hype.
      </>
    ),
  },
  {
    id: "fixed-timestep",
    tags: ["simulation", "determinism"],
    q: "How does the interpreter keep runs reproducible?",
    a: (
      <>
        The MissionRunner interprets the DSL on a fixed 120 Hz timestep with a seeded RNG for
        sensor findings. Nothing reads wall-clock time or request timing, so a mission with the
        same seed produces the same statements, readings, alerts and DONE event — in dev, in e2e,
        and on the deployed site.
      </>
    ),
  },
  {
    id: "dsl-limits",
    tags: ["dsl"],
    q: "What can the mission DSL express today?",
    a: (
      <>
        <code>MISSION</code>/<code>END</code>, <code>GOTO</code> (with optional <code>SPEED</code>),{" "}
        <code>INSPECT</code> with a sensor atom (<code>THERMAL</code>, <code>VISUAL</code>,{" "}
        <code>ACOUSTIC</code>) and optional <code>ALERT IF</code> thresholds (<code>TEMP</code>,{" "}
        <code>GAS</code>, <code>VIBRATION</code>), plus <code>WAIT</code> and a global{" "}
        <code>SPEED</code>. Before each <code>INSPECT</code> the robot implicitly repositions to the
        POI. Parse errors carry line and column, surfaced in the editor&apos;s lint gutter.
      </>
    ),
  },
  {
    id: "llm-boundary",
    tags: ["llm", "honesty"],
    q: "Where exactly is the LLM's boundary?",
    a: (
      <>
        Two stateless API routes: <code>/api/llm/compile</code> (natural language → mission DSL)
        and <code>/api/llm/report</code> (grounded report from the mission log). The compiler&apos;s
        output must pass the DSL parser; a bounded retry feeds parser errors back to the model. If
        it still fails, you see the errors — the LLM never gets an execution path around the
        interpreter.
      </>
    ),
  },
  {
    id: "mock-mode",
    tags: ["llm"],
    q: "What happens without an OPENAI_API_KEY?",
    a: (
      <>
        The app is fully functional. <code>MOCK_MODE</code> supplies rule-based artifacts: the
        compiler emits a template mission and the report writer summarizes the real mission log.
        Both are labeled in the UI (<code>MOCK</code>, <code>RULE-BASED</code>) so a mock output is
        never mistaken for a model output.
      </>
    ),
  },
  {
    id: "report-grounding",
    tags: ["llm", "honesty"],
    q: "How does the inspection report avoid made-up numbers?",
    a: (
      <>
        The report prompt is grounded: it receives the actual mission event log and must return
        strict JSON summarizing it. The UI renders the summary and recommendations from that
        contract, and the event IDs cited in the report map back to the live event log — so every
        claim in a report is checkable against the run.
      </>
    ),
  },
  {
    id: "rig-baking",
    tags: ["assets"],
    q: "How does the MuJoCo model become a three.js robot?",
    a: (
      <>
        <code>scripts/bake_rig.py</code> (uv + mujoco) bakes the MJCF into <code>rig.json</code>,
        including per-mesh center-of-mass offsets — all 24 meshes are non-zero, so raw XML
        placement would drift. At runtime the rig builds 13 bodies, 12 hinge joints and 50 visual
        geoms under a three-space <code>holder</code> group that corrects the MJCF frame (a
        regression spec guards that quaternion).
      </>
    ),
  },
  {
    id: "asset-size",
    tags: ["assets"],
    q: "How do ~16 MB of robot assets stay off the critical path?",
    a: (
      <>
        Textures are downscaled to 512 px (12 MB → 1.3 MB) after a cold-start frame-rate flake, the
        scene loads behind a visible progress bar (asset counter + percentage), and the UI never
        blocks on the download. The heavy meshes stream async while the console shell is already
        interactive.
      </>
    ),
  },
  {
    id: "planner-deferral",
    tags: ["planning"],
    q: "Why is there no A* path planner?",
    a: (
      <>
        The site graph currently has no obstacles, so straight legs between POIs are already
        optimal — an A* would add code without changing behavior. The deferral is recorded in the
        roadmap: it gets revisited when the site gains no-go zones, not before.
      </>
    ),
  },
  {
    id: "camera",
    tags: ["simulation"],
    q: "How do the follow and orbit cameras differ?",
    a: (
      <>
        Follow is the default: exponential smoothing with delta-tracking and an ideal-framing
        drift, plus park-beside-POI approach offsets during inspections. Orbit hands control to
        OrbitControls and is gated while the robot moves. The toggle in the viewport badge switches
        modes at any time.
      </>
    ),
  },
  {
    id: "e2e-coverage",
    tags: ["testing"],
    q: "What do the Playwright suites actually assert?",
    a: (
      <>
        Four specs: smoke (robot loads, 12 joints, &gt;5k tris, no page errors), mission (golden
        mission completes DONE 10/10 statements with 4 findings, parse errors are refused, step
        mode advances one line at a time), orientation (a quaternion probe guarding the holder
        frame), and llm (mock compile → accept → run → report end to end).
      </>
    ),
  },
  {
    id: "determinism-e2e",
    tags: ["determinism", "testing"],
    q: "How does determinism help the tests?",
    a: (
      <>
        Because same seed ⇒ same run, e2e can assert exact outcomes: the golden mission finishes
        DONE with exactly 10/10 statements and 4 findings, every time. A flake in those specs means
        a real regression, not simulator noise — which is the point of deterministic simulation.
      </>
    ),
  },
  {
    id: "metrics-sources",
    tags: ["honesty"],
    q: "How do I verify a dashboard number is real?",
    a: (
      <>
        Every KPI reads from interpreter state exposed through the zustand store: mission clock and
        odometer from the runner, POI coverage from the POI registry, findings and alerts from the
        event log, seed from the run config. The debug hook <code>window.__patrol</code> exposes
        frames/tris/joints/mode for exactly this kind of checking.
      </>
    ),
  },
  {
    id: "status-language",
    tags: ["honesty", "dsl"],
    q: "What does the status vocabulary mean?",
    a: (
      <>
        <code>IDLE</code> (no mission loaded), <code>EXECUTING</code>/<code>INSPECTING</code>{" "}
        (interpreter mid-statement / mid-scan), <code>PAUSED</code> (held at a line),{" "}
        <code>DONE</code> (all statements executed), <code>FAULT</code> (runtime error). The same
        words appear in the pill, the event log and the report, so status language is consistent
        across the console.
      </>
    ),
  },
];

export const QA_TAGS: QaTag[] = [
  "simulation",
  "dsl",
  "determinism",
  "llm",
  "assets",
  "planning",
  "testing",
  "honesty",
];
