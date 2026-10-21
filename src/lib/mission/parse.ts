import type { Mission, MissionError, ParseResult, Statement, InspectMode, Metric, Op, AlertIf } from "./types";
import { POI_BY_ID } from "../site";

/**
 * Mission DSL grammar (line-oriented, `#` comments):
 *
 *   MISSION <name>
 *     GOTO <poi> [SPEED <0.4-1.6>]
 *     INSPECT <poi> [THERMAL|VISUAL|ACOUSTIC] [ALERT IF <metric><op><value>]
 *     WAIT <0.1-30>
 *     SPEED <0.4-1.6>
 *   END
 *
 * The parser is the single gateway to execution (ADR-05): every error carries
 * line + column so the editor can point at it.
 */

const MODES = new Set(["THERMAL", "VISUAL", "ACOUSTIC"]);
const METRICS = new Set(["TEMP", "GAS", "VIBRATION"]);
const OPS: Op[] = [">=", "<=", "==", ">", "<"];

function tokenize(line: string): { tokens: { text: string; col: number }[] } {
  const tokens: { text: string; col: number }[] = [];
  let i = 0;
  while (i < line.length) {
    while (i < line.length && /\s/.test(line[i])) i++;
    if (i >= line.length) break;
    // ALERT IF attaches the rest as one token group handled by the caller
    const start = i;
    while (i < line.length && !/\s/.test(line[i])) i++;
    tokens.push({ text: line.slice(start, i), col: start + 1 });
  }
  return { tokens };
}

function isNum(s: string): boolean {
  return /^[+-]?(\d+\.?\d*|\.\d+)$/.test(s);
}

export function parseMission(text: string): ParseResult {
  const errors: MissionError[] = [];
  const statements: Statement[] = [];
  let name = "";
  let depth = 0;

  const lines = text.split("\n");
  lines.forEach((rawLine, idx) => {
    const line = idx + 1;
    const noComment = rawLine.split("#")[0];
    if (!noComment.trim()) return;
    const { tokens } = tokenize(noComment);
    if (tokens.length === 0) return;
    const kw = tokens[0].text.toUpperCase();
    const at = tokens[0].col;

    const err = (col: number, message: string) => errors.push({ line, col, message });

    if (kw === "MISSION") {
      if (depth > 0) err(at, "MISSION inside a MISSION block");
      if (tokens.length < 2) {
        err(at + 7, "MISSION needs a name, e.g. MISSION patrol_alpha");
        return;
      }
      name = tokens[1].text;
      depth = 1;
      return;
    }
    if (kw === "END") {
      if (depth === 0) err(at, "END without MISSION");
      depth = 0;
      return;
    }
    if (depth === 0) {
      err(at, `statement outside MISSION block — wrap it in MISSION <name> ... END`);
      return;
    }

    switch (kw) {
      case "GOTO": {
        const poi = tokens[1]?.text.toLowerCase();
        if (!poi) return err(at + 4, "GOTO needs a POI id");
        if (!POI_BY_ID[poi]) return err(tokens[1].col, `unknown POI '${tokens[1].text}' — known: ${Object.keys(POI_BY_ID).join(", ")}`);
        let speed: number | undefined;
        if (tokens[2]) {
          if (tokens[2].text.toUpperCase() !== "SPEED") return err(tokens[2].col, `expected SPEED here, got '${tokens[2].text}'`);
          if (!tokens[3] || !isNum(tokens[3].text)) return err(tokens[2].col + 6, "SPEED needs a number 0.4–1.6");
          speed = parseFloat(tokens[3].text);
          if (speed < 0.4 || speed > 1.6) return err(tokens[3].col, `SPEED ${speed} out of range 0.4–1.6`);
        }
        statements.push({ kind: "goto", line, poi, speed });
        return;
      }
      case "INSPECT": {
        const poi = tokens[1]?.text.toLowerCase();
        if (!poi) return err(at + 7, "INSPECT needs a POI id");
        if (!POI_BY_ID[poi]) return err(tokens[1].col, `unknown POI '${tokens[1].text}' — known: ${Object.keys(POI_BY_ID).join(", ")}`);
        let mode: InspectMode = "thermal";
        let rest = 2;
        if (tokens[2] && MODES.has(tokens[2].text.toUpperCase())) {
          mode = tokens[2].text.toLowerCase() as InspectMode;
          rest = 3;
        }
        let alertIf: AlertIf | undefined = undefined;
        if (tokens[rest]) {
          if (tokens[rest].text.toUpperCase() !== "ALERT") return err(tokens[rest].col, `expected ALERT IF here, got '${tokens[rest].text}'`);
          if (!tokens[rest + 1] || tokens[rest + 1].text.toUpperCase() !== "IF") return err(tokens[rest].col, "expected ALERT IF");
          const condCol = tokens[rest + 2]?.col ?? tokens[rest].col;
          const cond = tokens[rest + 2]?.text ?? "";
          // ALERT IF TEMP>80 (no spaces) or ALERT IF TEMP > 80
          const m = /^(TEMP|GAS|VIBRATION)(>=|<=|==|>|<)(-?\d+\.?\d*)$/i.exec(cond);
          if (m) {
            if (!METRICS.has(m[1].toUpperCase()) ) return err(condCol, `unknown metric '${m[1]}'`);
            alertIf = { metric: m[1].toLowerCase() as Metric, op: m[2] as Op, value: parseFloat(m[3]) };
          } else {
            const metricTok = tokens[rest + 2];
            const opTok = tokens[rest + 3];
            const valTok = tokens[rest + 4];
            if (!metricTok || !METRICS.has(metricTok.text.toUpperCase())) return err(condCol, `ALERT IF needs TEMP|GAS|VIBRATION <op> <value>, got '${cond}'`);
            if (!opTok || !OPS.includes(opTok.text as Op)) return err(opTok?.col ?? condCol, `unknown operator '${opTok?.text}' — use > < >= <= ==`);
            if (!valTok || !isNum(valTok.text)) return err(valTok?.col ?? condCol, "threshold must be a number");
            alertIf = { metric: metricTok.text.toLowerCase() as Metric, op: opTok.text as Op, value: parseFloat(valTok.text) };
          }
        }
        statements.push({ kind: "inspect", line, poi, mode, alertIf });
        return;
      }
      case "WAIT": {
        const v = tokens[1];
        if (!v || !isNum(v.text)) return err(at + 4, "WAIT needs seconds, e.g. WAIT 2");
        const seconds = parseFloat(v.text);
        if (seconds < 0.1 || seconds > 30) return err(v.col, `WAIT ${seconds}s out of range 0.1–30`);
        statements.push({ kind: "wait", line, seconds });
        return;
      }
      case "SPEED": {
        const v = tokens[1];
        if (!v || !isNum(v.text)) return err(at + 5, "SPEED needs a multiplier 0.4–1.6");
        const multiplier = parseFloat(v.text);
        if (multiplier < 0.4 || multiplier > 1.6) return err(v.col, `SPEED ${multiplier} out of range 0.4–1.6`);
        statements.push({ kind: "speed", line, multiplier });
        return;
      }
      default:
        err(at, `unknown statement '${tokens[0].text}' — use GOTO, INSPECT, WAIT or SPEED`);
    }
  });

  if (depth > 0) errors.push({ line: lines.length, col: 1, message: "MISSION block never closed — add END" });
  if (statements.length === 0 && errors.length === 0) {
    errors.push({ line: 1, col: 1, message: "mission has no statements" });
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, mission: { name: name || "unnamed", statements } };
}
