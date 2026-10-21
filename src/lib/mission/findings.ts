import { mulberry32, hashString } from "./rng";
import { POI_BASELINES } from "../site";
import type { InspectMode, Metric } from "./types";

export interface Metrics {
  temp: number;
  gas: number;
  vibration: number;
}

export interface Finding {
  id: string;
  poi: string;
  mode: InspectMode;
  metrics: Metrics;
  /** mission-clock seconds when the reading completed */
  t: number;
  statementLine: number;
  detail: string;
}

export const METRIC_LABEL: Record<Metric, string> = {
  temp: "TEMP",
  gas: "GAS ppm",
  vibration: "VIB mm/s",
};

function modeDetail(mode: InspectMode, metrics: Metrics, rng: () => number): string {
  switch (mode) {
    case "thermal":
      return `thermal map ${metrics.temp.toFixed(1)}°C peak, Δ${(2 + rng() * 3).toFixed(1)}°C vs ambient`;
    case "visual":
      return rng() < 0.25 ? `faint corrosion spot on housing` : `surface visually clean`;
    case "acoustic":
      return `vibration signature ${metrics.vibration.toFixed(2)} mm/s, no harmonic anomaly`;
  }
}

/**
 * Produce the sensor reading for one INSPECT statement.
 * Deterministic in (seed, poi, statementLine): the same mission run twice with
 * the same seed reads identical sensors — replayable, diffable, honest.
 */
export function readSensors(args: {
  seed: number;
  poi: string;
  kind: keyof typeof POI_BASELINES;
  mode: InspectMode;
  statementLine: number;
  t: number;
}): Finding {
  const { seed, poi, kind, mode, statementLine, t } = args;
  const rng = mulberry32(hashString(`${seed}:${poi}:${statementLine}:${mode}`));
  const base = POI_BASELINES[kind];
  const metrics: Metrics = {
    temp: base.temp + (rng() - 0.5) * 9,
    gas: Math.max(0, base.gas + (rng() - 0.5) * 5),
    vibration: Math.max(0, base.vibration + (rng() - 0.5) * 1.1),
  };
  return {
    id: `F${statementLine.toString().padStart(2, "0")}-${poi.slice(0, 6).toUpperCase()}`,
    poi,
    mode,
    metrics,
    t,
    statementLine,
    detail: modeDetail(mode, metrics, rng),
  };
}

export function compareMetric(value: number, op: string, threshold: number): boolean {
  switch (op) {
    case ">":
      return value > threshold;
    case "<":
      return value < threshold;
    case ">=":
      return value >= threshold;
    case "<=":
      return value <= threshold;
    case "==":
      return Math.abs(value - threshold) < 1e-6;
    default:
      return false;
  }
}
