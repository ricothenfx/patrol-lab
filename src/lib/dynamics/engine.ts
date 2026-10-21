/**
 * MuJoCo WASM engine for the DYNAMICS (beta) mode.
 *
 * Loads the official DeepMind WASM bindings from /mujoco/ (public/, not
 * bundled), populates the Emscripten virtual filesystem with the vendored
 * ANYmal C MJCF + assets, compiles a flat-floor physics scene, and exposes
 * step/read primitives. The three.js rig keeps rendering everything —
 * physics only produces numbers.
 *
 * Honest-scope note (ADR-02): this is real rigid-body dynamics driven by the
 * hand-written CPG controller in controller.ts. No learned policy yet.
 */
import { JOINT_NAMES } from "./controller";

export const PHYS_DT = 0.002; // model timestep (s)

const MODEL_BASE = "/models/anymal_c";
const MUJOCO_BASE = "/mujoco";

interface MujocoFS {
  mkdir(path: string): unknown;
  writeFile(path: string, data: Uint8Array | string): unknown;
}

interface MjDataHandle {
  qpos: Float64Array;
  qvel: Float64Array;
  ctrl: Float64Array;
}

interface MujocoModule {
  FS: MujocoFS;
  MjModel: { from_xml_path(path: string): unknown };
  MjData: new (model: unknown) => MjDataHandle;
  mj_step(model: unknown, data: MjDataHandle): void;
  mj_forward(model: unknown, data: MjDataHandle): void;
  mj_resetData(model: unknown, data: MjDataHandle): void;
}

export interface PhysPose {
  x: number;
  y: number;
  z: number;
  qw: number;
  qx: number;
  qy: number;
  qz: number;
  roll: number;
  pitch: number;
  yaw: number;
  /** base vertical velocity (m/s) */
  vz: number;
  joints: Record<string, number>;
}

export class DynamicsEngine {
  ready = false;
  private mujoco: MujocoModule | null = null;
  private modelRaw: unknown = null;
  private data: MjDataHandle | null = null;
  private actuatorIndex = new Map<string, number>();

  async init(onProgress?: (done: number, total: number) => void): Promise<void> {
    if (this.ready) return;
    const mujoco = await loadWasmModule();
    this.mujoco = mujoco;

    // --- virtual filesystem: scene + MJCF + every vendored asset ---
    const fs = mujoco.FS;
    try {
      fs.mkdir("/m");
    } catch {
      /* exists */
    }
    try {
      fs.mkdir("/m/assets");
    } catch {
      /* exists */
    }
    const manifest: string[] = await (await fetch(`${MODEL_BASE}/files.json`)).json();
    let done = 0;
    const total = manifest.length + 2;
    const step = () => onProgress?.(++done, total);
    await Promise.all(
      manifest.map(async (f) => {
        const res = await fetch(`${MODEL_BASE}/assets/${f}`);
        if (!res.ok) throw new Error(`dynamics: asset ${f} HTTP ${res.status}`);
        fs.writeFile(`/m/assets/${f}`, new Uint8Array(await res.arrayBuffer()));
        step();
      }),
    );
    const xml = await (await fetch(`${MODEL_BASE}/anymal_c.xml`)).text();
    fs.writeFile("/m/anymal_c.xml", xml);
    step();
    fs.writeFile(
      "/m/scene.xml",
      `<mujoco model="patrol_lab_scene">
  <include file="anymal_c.xml"/>
  <option timestep="${PHYS_DT}"/>
  <worldbody>
    <geom name="floor" size="60 60 0.05" type="plane" friction="1 0.02 0.01"/>
  </worldbody>
</mujoco>
`,
    );
    step();

    // --- compile + allocate ---
    this.modelRaw = mujoco.MjModel.from_xml_path("/m/scene.xml");
    this.data = new mujoco.MjData(this.modelRaw);
    for (let i = 0; i < JOINT_NAMES.length; i++) {
      this.actuatorIndex.set(JOINT_NAMES[i], i); // XML actuator order == JOINT_NAMES order
    }
    mujoco.mj_forward(this.modelRaw, this.data);
    this.ready = true;
  }

  /** place the robot at a world pose (mjcf x/y, height, yaw) in stance and settle */
  resetAt(x: number, y: number, z: number, yaw: number, stance: Record<string, number>): void {
    const { mujoco, modelRaw, data } = this.must();
    mujoco.mj_resetData(modelRaw, data);
    data.qpos[0] = x;
    data.qpos[1] = y;
    data.qpos[2] = z;
    data.qpos[3] = Math.cos(yaw / 2);
    data.qpos[6] = Math.sin(yaw / 2);
    for (const [name, idx] of this.actuatorIndex) data.ctrl[idx] = stance[name] ?? 0;
    mujoco.mj_forward(modelRaw, data);
  }

  setCtrl(name: string, value: number): void {
    const idx = this.actuatorIndex.get(name);
    if (idx !== undefined && this.data) this.data.ctrl[idx] = value;
  }

  step(): void {
    this.mujoco!.mj_step(this.modelRaw!, this.data!);
  }

  forward(): void {
    this.mujoco!.mj_forward(this.modelRaw!, this.data!);
  }

  pose(): PhysPose {
    const d = this.data!;
    const [x, y, z, qw, qx, qy, qz] = [d.qpos[0], d.qpos[1], d.qpos[2], d.qpos[3], d.qpos[4], d.qpos[5], d.qpos[6]];
    const sinr = 2 * (qw * qx + qy * qz);
    const cosr = 1 - 2 * (qx * qx + qy * qy);
    const sinp = 2 * (qw * qy - qz * qx);
    const yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
    const joints: Record<string, number> = {};
    for (const [name, idx] of this.actuatorIndex) joints[name] = d.qpos[7 + idx];
    return {
      x,
      y,
      z,
      qw,
      qx,
      qy,
      qz,
      roll: Math.atan2(sinr, cosr),
      pitch: Math.abs(sinp) >= 1 ? (Math.PI / 2) * Math.sign(sinp) : Math.asin(sinp),
      yaw,
      vz: d.qvel[2],
      joints,
    };
  }

  private must(): { mujoco: MujocoModule; modelRaw: unknown; data: MjDataHandle } {
    if (!this.mujoco || !this.modelRaw || !this.data) throw new Error("dynamics: engine not initialized");
    return { mujoco: this.mujoco, modelRaw: this.modelRaw, data: this.data };
  }
}

async function loadWasmModule(): Promise<MujocoModule> {
  // Served from /public/mujoco (official DeepMind WASM bindings, Apache-2.0).
  // The dynamic specifier is intentionally NOT a literal so the bundler never
  // tries to resolve it; the browser fetches it at runtime.
  const url = `${MUJOCO_BASE}/mujoco.js`;
  const mod = (await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ url)) as {
    default?: (cfg?: { locateFile?: (p: string) => string }) => Promise<MujocoModule>;
  };
  const factory = mod.default ?? (mod as unknown as (cfg?: object) => Promise<MujocoModule>);
  return factory({ locateFile: (p: string) => `${MUJOCO_BASE}/${p}` });
}
