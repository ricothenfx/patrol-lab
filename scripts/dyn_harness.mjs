/**
 * Headless tuning harness for the DYNAMICS controller.
 * Runs the EXACT controller the app ships (src/lib/dynamics/controller.ts)
 * against the EXACT MJCF the app loads, in Node via MuJoCo WASM.
 * Deterministic — same numbers as the browser on the same platform.
 *
 * usage: node scripts/dyn_harness.mjs [straight|square] [seconds]
 *        GAIT_JSON='{"kZ":-1.4}' patches the gait parameters for sweeps
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
const loadMujoco = require("@mujoco/mujoco").default;
const { DEFAULT_GAIT, JOINT_NAMES, jointTargets, phaseStep} = await import(
  new URL("../src/lib/dynamics/controller.ts", import.meta.url)
);
if (process.env.GAIT_JSON) Object.assign(DEFAULT_GAIT, JSON.parse(process.env.GAIT_JSON));

const MODE = process.argv[2] === "straight" ? "straight" : "square";
const LIMIT = parseFloat(process.argv[3] || "60");
const ASSETS = new URL("../public/models/anymal_c", import.meta.url).pathname;
const PHYS_DT = 0.002;
const TICK_DT = 1 / 120;

const mujoco = await loadMujoco();
const FS = mujoco.FS;
FS.mkdir("/m");
FS.mkdir("/m/assets");
for (const f of readdirSync(`${ASSETS}/assets`)) FS.writeFile(`/m/assets/${f}`, readFileSync(`${ASSETS}/assets/${f}`));
FS.writeFile("/m/anymal_c.xml", readFileSync(`${ASSETS}/anymal_c.xml`));
FS.writeFile(
  "/m/scene.xml",
  `<mujoco model="harness">
  <include file="anymal_c.xml"/>
  <option timestep="${PHYS_DT}"/>
  <worldbody>
    <geom name="floor" size="60 60 0.05" type="plane" friction="1 0.02 0.01"/>
  </worldbody>
</mujoco>
`,
);
const model = mujoco.MjModel.from_xml_path("/m/scene.xml");
const data = new mujoco.MjData(model);

const ACT = {};
for (const name of JOINT_NAMES) ACT[name] = -1;
for (let i = 0; i < model.nu; i++) {
  const n = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_ACTUATOR.value, i);
  ACT[n] = i;
}
for (const name of JOINT_NAMES) if (ACT[name] < 0) throw new Error(`missing actuator ${name}`);

function pose() {
  const q = data.qpos;
  const [x, y, z, qw, qx, qy, qz] = [q[0], q[1], q[2], q[3], q[4], q[5], q[6]];
  const sinr = 2 * (qw * qx + qy * qz);
  const cosr = 1 - 2 * (qx * qx + qy * qy);
  const sinp = 2 * (qw * qy - qz * qx);
  const yaw = Math.atan2(2 * (qw * qz + qx * qy), 1 - 2 * (qy * qy + qz * qz));
  return { x, y, z, vz: data.qvel[2], roll: Math.atan2(sinr, cosr), pitch: Math.asin(Math.max(-1, Math.min(1, sinp))), yaw };
}

function resetAt(x, y, z, yaw) {
  mujoco.mj_resetData(model, data);
  data.qpos[0] = x;
  data.qpos[1] = y;
  data.qpos[2] = z;
  data.qpos[3] = Math.cos(yaw / 2);
  data.qpos[6] = Math.sin(yaw / 2);
  mujoco.mj_forward(model, data);
}

const WAYPOINTS =
  MODE === "straight"
    ? [{ x: 30, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 0 }, { x: 30, y: 0 }]
    : [
        { x: 2.65, y: 1.81 }, // pump_station approach (beta_patrol leg 1)
        { x: 3.28, y: -1.44 }, // tank_farm approach (leg 2 — wide 113° arc)
        { x: 3.28, y: -1.44 },
        { x: 3.28, y: -1.44 },
      ];
resetAt(0, 0, 0.62, 0);
let phase = 0,
  acc = 0,
  lastRoll = 0,
  odo = 0,
  falls = 0,
  minZ = 1,
  maxRoll = 0,
  t = 0,
  wp = 0,
  walkT = 0,
  graceUntil = 0,
  settle = 1.5;
const ARRIVE = 0.45;
const arrivedAt = [];
let lastLog = 0;

while (t < LIMIT) {
  t += TICK_DT;
  const p0 = pose();
  let yawErr = 0;
  let walking = false;
  if (t < settle) {
    /* stand and settle */
  } else {
    const tgt = WAYPOINTS[wp];
    if (!tgt) break;
    const dx = tgt.x - p0.x,
      dy = tgt.y - p0.y;
    const dist = Math.hypot(dx, dy);
    if (dist <= ARRIVE) {
      arrivedAt.push({ wp, t: t.toFixed(2), err: dist.toFixed(3) });
      wp += 1;
      walkT = 0;
    } else if (t >= graceUntil) {
      walking = true;
      walkT += TICK_DT;
      yawErr = Math.atan2(dy, dx) - p0.yaw;
    }
  }

  acc += TICK_DT;
  let guard = 0;
  while (acc >= PHYS_DT && guard++ < 240) {
    acc -= PHYS_DT;
    const p = pose();
    const g = {
      phase,
      roll: p.roll,
      rollRate: (p.roll - lastRoll) / PHYS_DT,
      pitch: p.pitch,
      yawErr,
      speedMult: walking ? 0.25 + 0.75 * Math.max(0, Math.cos(yawErr)) : 0,
      walkT,
      zErr: DEFAULT_GAIT.stanceZ - p.z,
      zRate: p.vz,
    };
    if (walking) phase += phaseStep(PHYS_DT, g, DEFAULT_GAIT);
    const targets = jointTargets(g, DEFAULT_GAIT);
    for (const name of JOINT_NAMES) data.ctrl[ACT[name]] = targets[name];
    mujoco.mj_step(model, data);
    lastRoll = p.roll;
  }

  const p1 = pose();
  if (walking) odo += Math.hypot(p1.x - p0.x, p1.y - p0.y);
  minZ = Math.min(minZ, p1.z);
  maxRoll = Math.max(maxRoll, Math.abs(p1.roll));
  const bad = !Number.isFinite(p1.x + p1.y + p1.z) || p1.z < 0.2 || Math.abs(p1.roll) > 1.0;
  if (bad) {
    falls += 1;
    if (falls <= 5) console.log(`FALL t=${t.toFixed(2)} z=${p1.z.toFixed(3)} roll=${p1.roll.toFixed(2)} pitch=${p1.pitch.toFixed(2)} yaw=${p1.yaw.toFixed(2)} wp=${wp}`);
    resetAt(Number.isFinite(p1.x) ? p1.x : 0, Number.isFinite(p1.y) ? p1.y : 0, 0.62, Number.isFinite(p1.yaw) ? p1.yaw : 0);
    phase = 0;
    lastRoll = 0;
    walkT = 0;
    graceUntil = t + 0.8;
  }
  if (t - lastLog >= 5) {
    lastLog = t;
    const tg = WAYPOINTS[Math.min(wp, WAYPOINTS.length - 1)];
    const dist = Math.hypot(tg.x - p1.x, tg.y - p1.y);
    console.log(`t=${t.toFixed(0).padStart(3)} x=${p1.x.toFixed(2)} y=${p1.y.toFixed(2)} z=${p1.z.toFixed(3)} yaw=${p1.yaw.toFixed(2)} roll=${p1.roll.toFixed(3)} | wp${wp} d=${dist.toFixed(2)} falls=${falls}`);
  }
}
const final = pose();
const tgt = WAYPOINTS[wp];
console.log("---- result ----");
console.log(`sim time      : ${t.toFixed(1)}s (waypoint ${wp}/${WAYPOINTS.length})`);
console.log(`arrivals      :`, arrivedAt.length ? arrivedAt : "none");
console.log(`falls         : ${falls}`);
console.log(`min z         : ${minZ.toFixed(3)}  max |roll|: ${maxRoll.toFixed(3)}`);
console.log(`odometer      : ${odo.toFixed(2)} m  avg speed: ${(odo / Math.max(0.1, t - settle)).toFixed(2)} m/s`);
console.log(`final pose    : x=${final.x.toFixed(2)} y=${final.y.toFixed(2)} yaw=${final.yaw.toFixed(2)}`);
if (tgt) console.log(`remaining dist: ${Math.hypot(tgt.x - final.x, tgt.y - final.y).toFixed(2)} m`);
