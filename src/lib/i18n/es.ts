import type { Dictionary } from "./en";

const es: Dictionary = {
  nav: {
    qa: "Q&A",
    faq: "FAQ",
  },
  home: {
    meta: "control de misión para robots de inspección autónomos",
    paneTitle: "EDITOR DE MISIÓN",
    footerRig: "rig: ANYmal C (MuJoCo Menagerie, BSD-3)",
    footerSim: "sim determinista — misma semilla, mismas lecturas",
  },
  viewport: {
    initRenderer: "inicializando el renderizador…",
    loadingRig: "ANYmal C · cargando robot y recursos",
    assetsMeta: (done, total, pct) => `${done}/${total} recursos · ${pct}%`,
    siteBadge: "SITE A · sim de subestación",
    camFollow: "◎ seguir",
    camOrbit: "✥ orbitar",
  },
  kpi: {
    telemetry: "TELEMETRÍA DE MISIÓN",
    missionClock: "reloj de misión",
    odometer: "odómetro",
    coverage: "cobertura de POI",
    findings: "hallazgos",
    alerts: "alertas",
    seed: "semilla",
  },
  minimap: {
    title: "SITE A · MAPA TÁCTICO",
  },
  controls: {
    run: "▶ ejecutar",
    pause: "⏸ pausar",
    step: "⇥ paso",
    reset: "↺ reiniciar",
    seed: "semilla",
    playback: "reproducción",
    line: "línea",
    stmt: "inst.",
    phase: "fase",
    findingsCount: (n) => `◈ ${n} hallazgos`,
    emptyLog: "registro de misión — ejecuta una misión para ver eventos",
  },
  nl: {
    open: "✎ describir misión (NL → DSL)",
    placeholder: "p. ej., vigilancia de gas en el colector de válvulas y luego térmica en los tanques",
    compile: "compilar",
    proposed: "misión propuesta — revísala y acéptala",
    accept: "✓ aceptar",
    discard: "descartar",
  },
  report: {
    generate: "⇒ generar informe de inspección",
    needsRun: "informe (ejecuta primero una misión)",
    grounded: "basado en el registro de la misión",
    failed: "fallo del informe",
  },
  errors: {
    parseErrors: (n) => `${n} errores de análisis — ver las líneas resaltadas`,
  },
  qa: {
    searchPlaceholder: "buscar preguntas y respuestas…",
    answered: (n, total) => `${n}/${total} respondidas`,
    all: "todas",
    empty: (query, tag) =>
      `ninguna pregunta coincide con “${query}”${tag ? ` en ${tag}` : ""} — prueba otro término o quita el filtro de etiqueta.`,
  },
};

export default es;
