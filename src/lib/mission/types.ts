export type InspectMode = "thermal" | "visual" | "acoustic";

export type Metric = "temp" | "gas" | "vibration";
export type Op = ">" | "<" | ">=" | "<=" | "==";

export interface AlertIf {
  metric: Metric;
  op: Op;
  value: number;
}

export type Statement =
  | { kind: "goto"; line: number; poi: string; speed?: number }
  | {
      kind: "inspect";
      line: number;
      poi: string;
      mode: InspectMode;
      alertIf?: AlertIf;
    }
  | { kind: "wait"; line: number; seconds: number }
  | { kind: "speed"; line: number; multiplier: number };

export interface Mission {
  name: string;
  statements: Statement[];
}

export interface MissionError {
  line: number;
  col: number;
  message: string;
}

export type ParseResult =
  | { ok: true; mission: Mission }
  | { ok: false; errors: MissionError[] };
