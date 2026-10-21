const en = {
  nav: {
    qa: "Q&A",
    faq: "FAQ",
  },
  home: {
    meta: "mission control for autonomous inspection robots",
    paneTitle: "MISSION EDITOR",
    footerRig: "rig: ANYmal C (MuJoCo Menagerie, BSD-3)",
    footerSim: "deterministic sim — same seed, same readings",
  },
  viewport: {
    initRenderer: "initializing renderer…",
    loadingRig: "ANYmal C · loading rig + assets",
    assetsMeta: (done: number, total: number, pct: number) => `${done}/${total} assets · ${pct}%`,
    siteBadge: "SITE A · SUBSTATION SIM",
    camFollow: "◎ follow",
    camOrbit: "✥ orbit",
  },
  kpi: {
    telemetry: "MISSION TELEMETRY",
    missionClock: "mission clock",
    odometer: "odometer",
    coverage: "poi coverage",
    findings: "findings",
    alerts: "alerts",
    seed: "seed",
  },
  minimap: {
    title: "SITE A · TAC MAP",
  },
  controls: {
    run: "▶ run",
    pause: "⏸ pause",
    step: "⇥ step",
    reset: "↺ reset",
    seed: "seed",
    playback: "playback",
    line: "line",
    stmt: "stmt",
    phase: "phase",
    findingsCount: (n: number) => `◈ ${n} findings`,
    emptyLog: "mission log — run a mission to see events",
  },
  nl: {
    open: "✎ describe mission (NL → DSL)",
    placeholder: "e.g. gas watch on the valve manifold, then thermal on the tanks",
    compile: "compile",
    proposed: "proposed mission — review, then accept",
    accept: "✓ accept",
    discard: "discard",
  },
  report: {
    generate: "⇒ generate inspection report",
    needsRun: "report (run a mission first)",
    grounded: "grounded in the mission log",
    failed: "report failed",
  },
  errors: {
    parseErrors: (n: number) => `${n} parse error(s) — see highlighted lines`,
  },
  qa: {
    searchPlaceholder: "search questions and answers…",
    answered: (n: number, total: number) => `${n}/${total} answered`,
    all: "all",
    empty: (query: string, tag: string | null) =>
      `no question matches “${query}”${tag ? ` in ${tag}` : ""} — try a different term or clear the tag filter.`,
  },
};

export type Dictionary = typeof en;
export default en;
