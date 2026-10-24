/**
 * Stand-pose foot probe: loads the MJCF, applies rig.json stand_pose,
 * and reports world-space foot (shank foot-geom) heights per leg.
 * Mirrors exactly what the three.js rig renders in kinematic mode.
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
const loadMujoco = require("@mujoco/mujoco").default;
const A = new URL("../public/models/anymal_c", import.meta.url).pathname;

const rig = JSON.parse(readFileSync(`${A}/rig.json`, "utf8"));
const mujoco = await loadMujoco();
const FS = mujoco.FS;
FS.mkdir("/m");
FS.mkdir("/m/assets");
for (const f of readdirSync(`${A}/assets`)) FS.writeFile(`/m/assets/${f}`, readFileSync(`${A}/assets/${f}`));
FS.writeFile("/m/anymal_c.xml", readFileSync(`${A}/anymal_c.xml`));
FS.writeFile("/m/scene.xml", `<mujoco model="t"><include file="anymal_c.xml"/><option timestep="0.002"/></mujoco>`);
const model = mujoco.MjModel.from_xml_path("/m/scene.xml");
const data = new mujoco.MjData(model);

// apply stand pose
for (const [name, angle] of Object.entries(rig.stand_pose)) {
  const jid = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT.value, name);
  data.qpos[model.jnt_qposadr[jid]] = angle;
}
mujoco.mj_forward(model, data);

const bid = (n) => mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY.value, n);
const base = bid("base");
console.log("base z:", data.xpos[3 * base + 2].toFixed(3));

// foot = geom named *foot under each shank
const ngeom = model.ngeom;
for (const leg of ["LF", "RF", "LH", "RH"]) {
  const shank = bid(`${leg}_SHANK`);
  // find the geom belonging to shank whose name contains foot — Menagerie anymal_c
  // has a single "foot" sphere geom per shank; match by body
  let fz = null, fy = null, fx = null;
  for (let g = 0; g < ngeom; g++) {
    if (model.geom_bodyid[g] === shank) {
      fx = data.geom_xpos[3 * g]; fy = data.geom_xpos[3 * g + 1]; fz = data.geom_xpos[3 * g + 2];
    }
  }
  console.log(leg, "shank geoms world pos:", [fx, fy, fz].map((v) => (v ?? NaN).toFixed(3)).join(","));
}
