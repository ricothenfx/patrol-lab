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
  { tag: t.keyword, color: "#57b6ff", fontWeight: "600" },
  { tag: t.atom, color: "#35e0a1" },
  { tag: t.number, color: "#ffb454" },
  { tag: t.comment, color: "#5c6a7e", fontStyle: "italic" },
  { tag: t.operator, color: "#ff9db1" },
  { tag: t.variableName, color: "#c9d6e8" },
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
    ".cm-content": { caretColor: "#35e0a1" },
    ".cm-gutters": {
      backgroundColor: "transparent",
      color: "#3c4a5e",
      border: "none",
    },
    ".cm-activeLine": { backgroundColor: "rgba(53, 224, 161, 0.05)" },
    ".cm-mission-active": {
      backgroundColor: "rgba(53, 224, 161, 0.14)",
      boxShadow: "inset 2px 0 0 #35e0a1",
    },
    ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#93a1b5" },
    "&.cm-focused": { outline: "none" },
    ".cm-tooltip": {
      backgroundColor: "#11161d",
      border: "1px solid #1b2330",
      color: "#e8edf4",
    },
  },
  { dark: true },
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

export function runCurrentMission(): { ok: boolean; error?: string } {
  const { editorText } = useUi.getState();
  const res = parseMission(editorText);
  if (!res.ok) {
    return { ok: false, error: `${res.errors.length} parse error(s) — see highlighted lines` };
  }
  orchestrator.runner.load(res.mission, useUi.getState().seed);
  orchestrator.runner.run();
  return { ok: true };
}

export function pauseMission(): void {
  orchestrator.runner.pause();
}

export function stepMission(): void {
  const runner = orchestrator.runner;
  if (!runner.hasMission || runner.status === "DONE") {
    const res = parseMission(useUi.getState().editorText);
    if (!res.ok) {
      useUi.getState().setRunError(`${res.errors.length} parse error(s) — see highlighted lines`);
      return;
    }
    useUi.getState().setRunError(null);
    runner.load(res.mission, useUi.getState().seed);
  }
  runner.step();
}

export function resetMission(): void {
  orchestrator.runner.reset();
}
