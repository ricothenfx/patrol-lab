/**
 * Empirically measures, per leg and joint, the WORLD-space direction the foot
 * (shank body) moves for a POSITIVE joint angle. Used to derive the gait sign
 * convention — the MJCF mirrors axes between legs, so identical joint targets
 * produce mirrored world motion (the reason the first gait crawled sideways).
 */
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(new URL("../package.json", import.meta.url));
const loadMujoco = require("@mujoco/mujoco").default;
const A = new URL("../public/models/anymal_c", import.meta.url).pathname;

const mujoco = await loadMujoco();
const FS = mujoco.FS;
FS.mkdir("/m");
FS.mkdir("/m/assets");
for (const f of readdirSync(`${A}/assets`)) FS.writeFile(`/m/assets/${f}`, readFileSync(`${A}/assets/${f}`));
FS.writeFile("/m/anymal_c.xml", readFileSync(`${A}/anymal_c.xml`));
FS.writeFile("/m/scene.xml", `<mujoco model="t"><include file="anymal_c.xml"/><option timestep="0.002"/></mujoco>`);
const model = mujoco.MjModel.from_xml_path("/m/scene.xml");
const data = new mujoco.MjData(model);
mujoco.mj_forward(model, data);

const bodyPos = (name) => {
  const id = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY.value, name);
  return [data.xpos[3 * id], data.xpos[3 * id + 1], data.xpos[3 * id + 2]];
};

console.log("base quat at qpos0:", [0, 1, 2, 3, 4, 5, 6].map((i) => data.qpos[i].toFixed(2)).join(","));

for (const leg of ["LF", "RF", "LH", "RH"]) {
  const jid = {};
  for (const j of ["HAA", "HFE", "KFE"]) {
    jid[j] = mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT.value, `${leg}_${j}`);
  }
  const out = [];
  for (const j of ["HAA", "HFE", "KFE"]) {
    mujoco.mj_resetData(model, data);
    const adr = model.jnt_qposadr[jid[j]];
    data.qpos[adr] = 0.15;
    mujoco.mj_forward(model, data);
    const p = bodyPos(`${leg}_SHANK`);
    out.push(`${j}: d=(${p[0].toFixed(3)},${p[1].toFixed(3)})`);
  }
  console.log(leg.padEnd(3), out.join("  "));
}
