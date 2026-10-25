"use client";

import { useEffect, useRef } from "react";
import { basicSetup } from "codemirror";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import { EditorState, StateEffect, StateField, type Extension } from "@codemirror/state";
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";
import { tags as t } from "@lezer/highlight";
import { useUi } from "@/state/store";
import { parseMission } from "@/lib/mission/parse";
import { orchestrator } from "@/lib/orchestrator";

/* ---------------------------------------------------------------- presets */

export const PRESETS: { id: string; label: string; code: string }[] = [
  {
    id: "patrol_alpha",
    label: "patrol_alpha · golden demo",
    code: `# patrol_alpha — evening sweep of site A
# seeded run: same seed => same sensor readings
MISSION patrol_alpha

SPEED 1.0
GOTO pump_station
INSPECT pump_station THERMAL ALERT IF TEMP>75
WAIT 1

GOTO gauge_bank SPEED 1.2
INSPECT gauge_bank THERMAL
INSPECT gauge_bank ACOUSTIC

GOTO transformer_row
INSPECT transformer_row THERMAL ALERT IF TEMP>75

WAIT 2
END`,
  },
  {
    id: "valve_sweep",
    label: "valve_sweep · gas watch",
    code: `# valve_sweep — gas leak watch on the manifold row
MISSION valve_sweep

SPEED 1.2
GOTO valve_manifold
INSPECT valve_manifold VISUAL ALERT IF GAS>8
WAIT 0.5
INSPECT valve_manifold ACOUSTIC ALERT IF VIBRATION>2.5

GOTO tank_farm
INSPECT tank_farm THERMAL ALERT IF TEMP>60
END`,
  },
  {
    id: "beta_patrol",
    label: "beta_patrol · dynamics demo",
    code: `# beta_patrol — gentle arc for the DYNAMICS (beta) mode.
# The physics controller handles gentle heading changes; sharp
# turns stay on the roadmap (ADR-02).
MISSION beta_patrol

SPEED 1.0
GOTO pump_station
INSPECT pump_station THERMAL ALERT IF TEMP>75
INSPECT pump_station ACOUSTIC
END`,
  },
  {
    id: "full_circuit",
    label: "full_circuit · 5/5 coverage",
    code: `# full_circuit — one pass over every POI on the site.
# Mixed sensor modes, per-leg speeds, full coverage demo.
MISSION full_circuit

SPEED 1.0
GOTO pump_station SPEED 1.2
INSPECT pump_station THERMAL ALERT IF TEMP>75
INSPECT pump_station ACOUSTIC

GOTO tank_farm SPEED 1.4
INSPECT tank_farm VISUAL
INSPECT tank_farm ACOUSTIC ALERT IF GAS>10

GOTO gauge_bank SPEED 1.0
INSPECT gauge_bank THERMAL

GOTO valve_manifold SPEED 0.8
INSPECT valve_manifold VISUAL ALERT IF GAS>=8.5
WAIT 1

GOTO transformer_row SPEED 0.9
INSPECT transformer_row THERMAL ALERT IF TEMP>75
INSPECT transformer_row ACOUSTIC
WAIT 0.5
END`,
  },
  {
    id: "night_shift",
    label: "night_shift · slow cold watch",
    code: `# night_shift — slow night watch with long dwells.
# Also flags the opposite failures: a cold gauge bank and a
# stalled machine whose vibration signature goes quiet.
MISSION night_shift

SPEED 0.6
GOTO gauge_bank
WAIT 3
INSPECT gauge_bank THERMAL ALERT IF TEMP<=44
INSPECT gauge_bank ACOUSTIC ALERT IF VIBRATION<0.3

GOTO pump_station SPEED 0.7
WAIT 4
INSPECT pump_station THERMAL ALERT IF TEMP>65
INSPECT pump_station ACOUSTIC

GOTO transformer_row
WAIT 5
INSPECT transformer_row THERMAL ALERT IF TEMP>=75
END`,
  },
  {
    id: "vib_watch",
    label: "vib_watch · acoustic trio",
    code: `# vib_watch — rotating-machinery vibration survey.
# Acoustic-only passes with thresholds near the top of the
# healthy band, plus one thermal cross-check on the pump.
MISSION vib_watch

SPEED 0.9
GOTO pump_station
INSPECT pump_station ACOUSTIC ALERT IF VIBRATION>=2.55
INSPECT pump_station THERMAL ALERT IF TEMP>66

GOTO transformer_row SPEED 1.1
INSPECT transformer_row ACOUSTIC ALERT IF VIBRATION>1.65

GOTO valve_manifold SPEED 0.9
WAIT 2
INSPECT valve_manifold ACOUSTIC ALERT IF VIBRATION>=1.4
END`,
  },
  {
    id: "gas_patrol",
    label: "gas_patrol · leak survey",
    code: `# gas_patrol — leak survey of the tank farm and manifold row.
# Double-sampling: a second reading per POI to separate a
# drifting plume from sensor noise.
MISSION gas_patrol

SPEED 1.1
GOTO tank_farm
INSPECT tank_farm VISUAL ALERT IF GAS>10
WAIT 2
INSPECT tank_farm ACOUSTIC ALERT IF GAS>10

GOTO valve_manifold SPEED 0.8
INSPECT valve_manifold VISUAL ALERT IF GAS>=8.5
WAIT 2
INSPECT valve_manifold THERMAL
INSPECT valve_manifold ACOUSTIC ALERT IF GAS>=8.5
END`,
  },
  {
    id: "sprint_audit",
    label: "sprint_audit · fast pass",
    code: `# sprint_audit — fast full-speed audit, one thermal shot per
# asset. Trade dwell time for route time; per-GOTO speeds slow
# the approach leg only.
MISSION sprint_audit

SPEED 1.6
GOTO transformer_row SPEED 1.2
INSPECT transformer_row THERMAL ALERT IF TEMP>75

GOTO gauge_bank
INSPECT gauge_bank THERMAL ALERT IF TEMP>52

GOTO valve_manifold SPEED 1.4
INSPECT valve_manifold THERMAL ALERT IF TEMP>59

GOTO pump_station
INSPECT pump_station THERMAL ALERT IF TEMP>66
END`,
  },
];

/* --------------------------------------------------------------- language */

const KEYWORDS = new Set(["MISSION", "END", "GOTO", "INSPECT", "WAIT", "SPEED", "ALERT", "IF"]);
const ATOMS = new Set(["THERMAL", "VISUAL", "ACOUSTIC", "TEMP", "GAS", "VIBRATION"]);

const missionLanguage = StreamLanguage.define({
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.peek() === "#") {
      stream.skipToEnd();
      return "comment";
    }
    if (/[0-9]/.test(stream.peek()!)) {
      stream.eatWhile(/[0-9.]/);
      return "number";
    }
    if (stream.peek() === ">") {
      stream.next();
      if (stream.peek() === "=") stream.next();
      return "operator";
    }
    if (stream.peek() === "<") {
      stream.next();
      if (stream.peek() === "=") stream.next();
      return "operator";
    }
    if (stream.peek() === "=") {
      stream.next();
      if (stream.peek() === "=") stream.next();
      return "operator";
    }
    if (/[A-Za-z_]/.test(stream.peek()!)) {
      stream.eatWhile(/[A-Za-z0-9_]/);
      const word = stream.current().toUpperCase();
      if (KEYWORDS.has(word)) return "keyword";
      if (ATOMS.has(word)) return "atom";
      return "variableName";
    }
    stream.next();
    return null;
  },
});

const missionHighlight = HighlightStyle.define([
  { tag: t.keyword, color: "var(--code-keyword)", fontWeight: "600" },
  { tag: t.atom, color: "var(--code-atom)" },
  { tag: t.number, color: "var(--code-number)" },
  { tag: t.comment, color: "var(--code-comment)", fontStyle: "italic" },
  { tag: t.operator, color: "var(--code-operator)" },
  { tag: t.variableName, color: "var(--code-variable)" },
]);

/* ------------------------------------------------- active line decoration */

const setActiveLine = StateEffect.define<number | null>();

const activeLineField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(decos, tr) {
    for (const e of tr.effects) {
      if (e.is(setActiveLine)) {
        if (e.value == null) return Decoration.none;
        const lineInfo = tr.state.doc.line(Math.min(e.value, tr.state.doc.lines));
        return Decoration.set([Decoration.line({ class: "cm-mission-active" }).range(lineInfo.from)]);
      }
    }
    return tr.docChanged ? Decoration.none : decos;
  },
});

const missionTheme = EditorView.theme(
  {
    "&": { height: "100%", fontSize: "12.5px", backgroundColor: "transparent" },
    ".cm-scroller": {
      fontFamily: "var(--mono)",
      lineHeight: "1.65",
      padding: "6px 0",
    },
    ".cm-content": { caretColor: "var(--accent)" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "var(--code-gutter)",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "color-mix(in srgb, var(--accent) 6%, transparent)" },
    ".cm-mission-active": {
      backgroundColor: "color-mix(in srgb, var(--accent) 14%, transparent)",
      boxShadow: "inset 2px 0 0 var(--accent)",
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--text-1)" },
    "&.cm-focused": { outline: "none" },
    ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
      backgroundColor: "var(--selection) !important",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--bg-2)",
      border: "1px solid var(--line)",
      color: "var(--text-0)",
    },
  },
  // flag only marks base-style flavor; all colors come from CSS vars above,
  // so the same theme serves light and dark
  { dark: false },
);

/* ---------------------------------------------------------------- editor */

let editorViewRef: EditorView | null = null;

/** Replace the CodeMirror document (preset loading). */
export function setEditorDoc(code: string): void {
  const view = editorViewRef;
  if (!view) return;
  view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: code } });
}

export function MissionEditor() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  const setEditorText = useUi((s) => s.setEditorText);
  const setSnapshot = useUi((s) => s.setSnapshot);

  useEffect(() => {
    if (!hostRef.current || viewRef.current) return;

    const lintSource = (view: EditorView): Diagnostic[] => {
      const text = view.state.doc.toString();
      const res = parseMission(text);
      if (res.ok) return [];
      return res.errors.map((e) => {
        const lineInfo = view.state.doc.line(Math.min(e.line, view.state.doc.lines));
        const from = Math.min(lineInfo.from + Math.max(0, e.col - 1), lineInfo.to);
        return { from, to: lineInfo.to, message: e.message, severity: "error" as const };
      });
    };

    const extensions: Extension[] = [
      basicSetup,
      missionLanguage,
      missionTheme,
      syntaxHighlighting(missionHighlight),
      activeLineField,
      linter(lintSource, { delay: 250 }),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) setEditorText(update.state.doc.toString());
      }),
    ];

    const view = new EditorView({
      state: EditorState.create({ doc: PRESETS[0].code, extensions }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    editorViewRef = view;
    setEditorText(PRESETS[0].code);

    // interpreter → UI: push snapshots + drive the active-line marker
    orchestrator.runner.onSnapshot((s) => {
      setSnapshot(s);
      const effect = s.status === "RUNNING" || s.status === "PAUSED" ? s.currentLine : null;
      view.dispatch({ effects: setActiveLine.of(effect && effect > 0 ? effect : null) });
    });

    return () => {
      view.destroy();
      viewRef.current = null;
      editorViewRef = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div className="editor-host" ref={hostRef} data-testid="mission-editor" />;
}

/* --------------------------------------------------------------- actions */

export function runCurrentMission(): { ok: boolean; parseErrors?: number } {
  const { editorText } = useUi.getState();
  const res = parseMission(editorText);
  if (!res.ok) {
    return { ok: false, parseErrors: res.errors.length };
  }
  orchestrator.runner.load(res.mission, useUi.getState().seed);
  orchestrator.runner.run();
  return { ok: true };
}

export function pauseMission(): void {
  orchestrator.runner.pause();
}

export function stepMission(): { ok: boolean; parseErrors?: number } {
  const runner = orchestrator.runner;
  if (!runner.hasMission || runner.status === "DONE") {
    const res = parseMission(useUi.getState().editorText);
    if (!res.ok) {
      return { ok: false, parseErrors: res.errors.length };
    }
    runner.load(res.mission, useUi.getState().seed);
  }
  runner.step();
  return { ok: true };
}

export function resetMission(): void {
  orchestrator.runner.reset();
}
