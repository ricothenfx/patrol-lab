/**
 * Per-leg world-space sign probe at stand pose: for each joint, +0.15 rad
 * → which world direction does the FOOT move (x=forward, y=left, z=up)?
 * Also reports foot geom radius so "foot bottom" = z - radius.
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

const jidOf = (n) => mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_JOINT.value, n);
const applyStand = () => {
  for (const [name, angle] of Object.entries(rig.stand_pose)) data.qpos[model.jnt_qposadr[jidOf(name)]] = angle;
};
mujoco.mj_forward(model, data);

// foot geom per leg: the sphere geom whose body is the shank and size ~0.05
const footGeom = {};
for (let g = 0; g < model.ngeom; g++) {
  const b = model.geom_bodyid[g];
  const bid2 = (n) => mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY.value, n);
  for (const leg of ["LF", "RF", "LH", "RH"]) {
    if (b === bid2(`${leg}_SHANK`) && model.geom_size[g * 3] > 0.01) footGeom[leg] = g;
  }
}
console.log("foot geom radius:", model.geom_size[footGeom.LF * 3].toFixed(3));

const footPos = (leg) => {
  const g = footGeom[leg];
  return [data.geom_xpos[3 * g], data.geom_xpos[3 * g + 1], data.geom_xpos[3 * g + 2]];
};

console.log("\n== world foot motion for +0.15 rad per joint (at stand pose) ==");
for (const leg of ["LF", "RF", "LH", "RH"]) {
  for (const j of ["HAA", "HFE", "KFE"]) {
    mujoco.mj_resetData(model, data);
    applyStand();
    const name = `${leg}_${j}`;
    data.qpos[model.jnt_qposadr[jidOf(name)]] += 0.15;
    mujoco.mj_forward(model, data);
    const p = footPos(leg);
    mujoco.mj_resetData(model, data);
    applyStand();
    mujoco.mj_forward(model, data);
    const q = footPos(leg);
    const d = p.map((v, i) => v - q[i]);
    console.log(`${leg}_${j}: d=(${d[0].toFixed(3)}, ${d[1].toFixed(3)}, ${d[2].toFixed(3)})  ${d[0] > 0 ? "fwd" : "back"} ${d[2] > 0 ? "up" : "down"}`);
  }
}

console.log("\n== solve per-pair stance: foot bottom = 0 at base 0.62 ==");
// grid search HFE/KFE per pair (front legs mirror left/right; hind likewise)
function solve(pair) {
  // pair: legs sharing geometry (LF/RF front, LH/RH hind)
  const leg = pair[0];
  let best = null;
  for (let hfe = 0.2; hfe <= 1.2; hfe += 0.01) {
    for (let kfe = -1.6; kfe <= -0.3; kfe += 0.01) {
      mujoco.mj_resetData(model, data);
      for (const l of pair) {
        data.qpos[model.jnt_qposadr[jidOf(`${l}_HFE`)]] = hfe;
        data.qpos[model.jnt_qposadr[jidOf(`${l}_KFE`)]] = kfe;
      }
      mujoco.mj_forward(model, data);
      const [x, y, z] = footPos(leg);
      const err = Math.abs(z - 0.05); // foot bottom on ground given radius ~0.05
      if (!best || err < best.err) best = { hfe, kfe, err, x, y, z };
    }
  }
  return best;
}
for (const [label, pair] of [["FRONT", ["LF", "RF"]], ["HIND", ["LH", "RH"]]]) {
  const s = solve(pair);
  console.log(`${label}: HFE=${s.hfe.toFixed(2)} KFE=${s.kfe.toFixed(2)} -> foot z=${s.z.toFixed(3)} (bottom ${ (s.z - 0.05).toFixed(3) }), x=${s.x.toFixed(3)} err=${s.err.toFixed(4)}`);
}

console.log("\n== IK reachability: feet at home (x=±0.36, y=±0.30, z=0), base height 0.55 ==");
// use scipy-free simple solver: MuJoCo built-in? do manual Gauss-Newton via geom pos
function ikLeg(leg, bx, by, bz, hfe0, kfe0) {
  const g = footGeom[leg];
  const target = [bx, by, bz];
  let hfe = hfe0, kfe = kfe0, haa = 0;
  const setQ = () => {
    mujoco.mj_resetData(model, data);
    data.qpos[2] = bz === 0 ? 0.55 : bz; // base z via freejoint? qpos layout: [x,y,z,qw,qx,qy,qz]
    const bid3 = (n) => mujoco.mj_name2id(model, mujoco.mjtObj.mjOBJ_BODY.value, n);
    void bid3;
    data.qpos[model.jnt_qposadr[jidOf(`${leg}_HAA`)]] = haa;
    data.qpos[model.jnt_qposadr[jidOf(`${leg}_HFE`)]] = hfe;
    data.qpos[model.jnt_qposadr[jidOf(`${leg}_KFE`)]] = kfe;
    mujoco.mj_forward(model, data);
  };
  for (let it = 0; it < 30; it++) {
    setQ();
    const p = [data.geom_xpos[3 * g], data.geom_xpos[3 * g + 1], data.geom_xpos[3 * g + 2]];
    const err = target.map((v, i) => v - p[i]);
    if (err.every((e) => Math.abs(e) < 1e-4)) break;
    const J = [];
    for (const j of ["HAA", "HFE", "KFE"]) {
      const step = 1e-4;
      const orig = [haa, hfe, kfe];
      if (j === "HAA") haa += step; else if (j === "HFE") hfe += step; else kfe += step;
      setQ();
      const p2 = [data.geom_xpos[3 * g], data.geom_xpos[3 * g + 1], data.geom_xpos[3 * g + 2]];
      J.push([0, 1, 2].map((i) => (p2[i] - p[i]) / step));
      [haa, hfe, kfe] = orig;
    }
    // damped least squares: dq = J^T (JJ^T + λI)^-1 err
    const l = 1e-4;
    const A = [0, 1, 2].map((r) => [0, 1, 2].map((c) => {
      let s = l * (r === c ? 1 : 0);
      for (let k = 0; k < 3; k++) s += J[r][k] * J[c][k];
      return s;
    }));
    const bvec = [0, 1, 2].map((r) => {
      let s = 0;
      for (let k = 0; k < 3; k++) s += J[r][k] * err[k];
      return s;
    });
    // solve 3x3 A x = bvec by Cramer
    const det = (m) => m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1]) - m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0]) + m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
    const D = det(A);
    if (Math.abs(D) < 1e-12) break;
    const sol = [0, 1, 2].map((i) => {
      const M = A.map((row, r) => row.map((v, c) => (c === i ? bvec[r] : v)));
      return det(M) / D;
    });
    haa += sol[0]; hfe += sol[1]; kfe += sol[2];
    haa = Math.max(-0.7, Math.min(0.7, haa));
    hfe = Math.max(-0.7, Math.min(1.4, hfe));
    kfe = Math.max(-1.8, Math.min(0.2, kfe));
  }
  setQ();
  const p = [data.geom_xpos[3 * g], data.geom_xpos[3 * g + 1], data.geom_xpos[3 * g + 2]];
  console.log(`${leg}: HAA=${haa.toFixed(2)} HFE=${hfe.toFixed(2)} KFE=${kfe.toFixed(2)} -> foot=(${p[0].toFixed(3)},${p[1].toFixed(3)},${p[2].toFixed(3)})`);
}
// base at (0,0,0.55): feet at three(x=+0.36 front) == mujoco x=-0.36; y mirrored (three y-left = mujoco +y? earlier LF(three front-left) had mujoco y=-0.301) => three y=+0.30 == mujoco y=-0.30
ikLeg("LF", -0.36, -0.30, 0, 0.55, -1.0);
ikLeg("RF", -0.36, 0.30, 0, 0.55, -1.0);
ikLeg("LH", 0.36, -0.30, 0, 0.55, -1.0);
ikLeg("RH", 0.36, 0.30, 0, 0.55, -1.0);
