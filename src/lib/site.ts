/** Single source of truth for the simulated industrial site. */

export type PoiKind = "pump" | "transformer" | "gauge" | "valve" | "tank";

export interface Poi {
  id: string;
  label: string;
  x: number;
  z: number;
  color: string;
  kind: PoiKind;
}

export const POIS: Poi[] = [
  { id: "pump_station", label: "PUMP-STATION", x: 3.4, z: 2.2, color: "#ffb454", kind: "pump" },
  { id: "transformer_row", label: "TRANSFORMER-ROW", x: -3.8, z: 2.8, color: "#57b6ff", kind: "transformer" },
  { id: "gauge_bank", label: "GAUGE-BANK", x: -3.2, z: -2.6, color: "#35e0a1", kind: "gauge" },
  { id: "valve_manifold", label: "VALVE-MANIFOLD", x: 0.6, z: -3.4, color: "#ff5d5d", kind: "valve" },
  { id: "tank_farm", label: "TANK-FARM", x: 4.1, z: -1.8, color: "#b48cff", kind: "tank" },
];

export const POI_BY_ID: Record<string, Poi> = Object.fromEntries(POIS.map((p) => [p.id, p]));

/** Ambient metric baselines per POI kind (what a healthy asset reads). */
export const POI_BASELINES: Record<PoiKind, { temp: number; gas: number; vibration: number }> = {
  pump: { temp: 62, gas: 4, vibration: 2.1 },
  transformer: { temp: 71, gas: 2, vibration: 1.2 },
  gauge: { temp: 48, gas: 3, vibration: 0.6 },
  valve: { temp: 55, gas: 6, vibration: 0.9 },
  tank: { temp: 41, gas: 9, vibration: 0.3 },
};

export const POI_POS: Record<string, { x: number; z: number }> = Object.fromEntries(
  POIS.map((p) => [p.id, { x: p.x, z: p.z }]),
);
