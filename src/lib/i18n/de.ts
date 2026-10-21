import type { Dictionary } from "./en";

const de: Dictionary = {
  nav: {
    qa: "Q&A",
    faq: "FAQ",
  },
  home: {
    meta: "Missionskontrolle für autonome Inspektionsroboter",
    paneTitle: "MISSIONSEDITOR",
    footerRig: "rig: ANYmal C (MuJoCo Menagerie, BSD-3)",
    footerSim: "deterministische Simulation — gleicher Seed, gleiche Messwerte",
  },
  viewport: {
    initRenderer: "Renderer wird initialisiert …",
    loadingRig: "ANYmal C · Rig + Assets werden geladen",
    assetsMeta: (done, total, pct) => `${done}/${total} Assets · ${pct}%`,
    siteBadge: "SITE A · Umspannwerk-Sim",
    camFollow: "◎ folgen",
    camOrbit: "✥ Orbit",
  },
  kpi: {
    telemetry: "MISSIONSTELEMETRIE",
    missionClock: "Missionszeit",
    odometer: "Odometrie",
    coverage: "POI-Abdeckung",
    findings: "Feststellungen",
    alerts: "Alarme",
    seed: "Seed",
  },
  minimap: {
    title: "SITE A · TAKTISCHE KARTE",
  },
  controls: {
    run: "▶ Start",
    pause: "⏸ Pause",
    step: "⇥ Schritt",
    reset: "↺ Zurücksetzen",
    seed: "Seed",
    playback: "Wiedergabe",
    line: "Zeile",
    stmt: "Anw.",
    phase: "Phase",
    findingsCount: (n) => `◈ ${n} Feststellungen`,
    emptyLog: "Missionslog — Mission starten, um Ereignisse zu sehen",
  },
  nl: {
    open: "✎ Mission beschreiben (NL → DSL)",
    placeholder: "z. B. Gasüberwachung am Ventilblock, dann Thermografie an den Tanks",
    compile: "Kompilieren",
    proposed: "Vorgeschlagene Mission — prüfen, dann übernehmen",
    accept: "✓ übernehmen",
    discard: "verwerfen",
  },
  report: {
    generate: "⇒ Prüfbericht erstellen",
    needsRun: "Bericht (erst Mission ausführen)",
    grounded: "basierend auf dem Missionslog",
    failed: "Bericht fehlgeschlagen",
  },
  errors: {
    parseErrors: (n) => `${n} Parse-Fehler — siehe markierte Zeilen`,
  },
  qa: {
    searchPlaceholder: "Fragen und Antworten durchsuchen…",
    answered: (n, total) => `${n}/${total} beantwortet`,
    all: "alle",
    empty: (query, tag) =>
      `keine Frage passt zu „${query}“${tag ? ` in ${tag}` : ""} — anderer Suchbegriff versuchen oder Tag-Filter aufheben.`,
  },
};

export default de;
