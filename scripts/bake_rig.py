"""Bake the ANYmal C MJCF into a renderer-ready rig.json.

Run: uv run --with mujoco scripts/bake_rig.py
Parses anymal_c.xml with MuJoCo (ground truth for mesh COM recentering and default
class resolution) and emits public/models/anymal_c/rig.json:
  - bodies: kinematic tree (name, parent, pos, quat wxyz, optional joint)
  - geoms: visual geoms only (mesh file, material, pos, quat wxyz, body)
  - meshes: per-file COM offset (pos + quat wxyz) to bake into geometry at load
  - materials: name -> rgba and/or texture file
Coordinates stay in MuJoCo convention (Z-up, meters). The client converts.
"""
import json
import xml.etree.ElementTree as ET
from pathlib import Path

import mujoco
import numpy as np

HERE = Path(__file__).resolve().parent.parent
MODEL_DIR = HERE / "public" / "models" / "anymal_c"
OUT = MODEL_DIR / "rig.json"

xml_path = MODEL_DIR / "anymal_c.xml"
model = mujoco.MjModel.from_xml_path(str(xml_path))
data = mujoco.MjData(model)

# ---- parse raw XML for structure that the compiled model flattens -------------
root = ET.parse(xml_path).getroot()

def floats(s, n):
    v = [float(x) for x in s.split()]
    assert len(v) == n, (s, n)
    return v

def q_wxyz(s):
    return floats(s, 4) if s else None

# default classes: visual, visual_zflip (zflip adds quat 0 0 0 1)
geom_default_quat = {}
for dflt in root.iter("default"):
    cls = dflt.get("class")
    for g in dflt.findall("geom"):
        if g.get("quat"):
            geom_default_quat[cls] = q_wxyz(g.get("quat"))

materials = {}
for m in root.find("asset").findall("material"):
    entry = {}
    if m.get("rgba"):
        entry["rgba"] = floats(m.get("rgba"), 4)
    if m.get("texture"):
        tname = m.get("texture")
        t = next(t for t in root.find("asset").findall("texture") if t.get("name") == tname)
        entry["texture"] = t.get("file")
    materials[m.get("name")] = entry

# ---- walk the compiled model --------------------------------------------------
def mj_quat(i):
    q = model.body_quat[i]
    return [round(float(x), 8) for x in q]  # wxyz

bodies = []
name_to_idx = {}
for i in range(model.nbody):
    nm = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, i)
    name_to_idx[nm] = i

for i in range(model.nbody):
    nm = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, i)
    if i == 0:
        continue  # world
    parent = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, model.body_parentid[i])
    body = {
        "name": nm,
        "parent": parent,
        "pos": [round(float(x), 8) for x in model.body_pos[i]],
        "quat": mj_quat(i),
    }
    # freejoint on base: we control the root pose directly -> not a hinge
    for j in range(model.body_jntadr[i], model.body_jntadr[i] + model.body_jntnum[i]):
        if j < 0:
            continue
        jtype = model.jnt_type[j]
        if jtype == mujoco.mjtJoint.mjJNT_FREE:
            continue
        axis = [round(float(x), 8) for x in model.jnt_axis[j]]
        body["joint"] = {
            "name": mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_JOINT, j),
            "axis": axis,
            "range": [round(float(x), 4) for x in model.jnt_range[j]],
        }
    bodies.append(body)

geoms = []
for g in range(model.ngeom):
    gtype = model.geom_type[g]
    if gtype != mujoco.mjtGeom.mjGEOM_MESH:
        continue
    contype, conaffinity = int(model.geom_contype[g]), int(model.geom_conaffinity[g])
    if contype == 0 and conaffinity == 0 and model.geom_group[g] == 2:
        pass  # visual class
    else:
        continue
    body = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_BODY, model.geom_bodyid[g])
    dataid = model.geom_dataid[g]
    mesh_name = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_MESH, dataid)
    mat_id = model.geom_matid[g]
    mat = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_MATERIAL, mat_id) if mat_id >= 0 else None
    geoms.append({
        "body": body,
        "mesh": mesh_name,
        "material": mat,
        "pos": [round(float(x), 8) for x in model.geom_pos[g]],
        "quat": [round(float(x), 8) for x in model.geom_quat[g]],
    })

# mesh file mapping + COM offsets (mesh_pos/mesh_quat map compiled frame -> file frame)
meshes = {}
for m in range(model.nmesh):
    nm = mujoco.mj_id2name(model, mujoco.mjtObj.mjOBJ_MESH, m)
    meshes[nm] = {
        "file": nm + ".obj",
        "pos": [round(float(x), 8) for x in model.mesh_pos[m]],
        "quat": [round(float(x), 8) for x in model.mesh_quat[m]],
    }

rig = {
    "source": "MuJoCo Menagerie anybotics_anymal_c (BSD-3-Clause)",
    "compiler": {"angle": "radian"},
    "materials": materials,
    "meshes": meshes,
    "bodies": bodies,
    "geoms": geoms,
    "stand_pose": {"LF_HAA": 0.0, "LF_HFE": 0.55, "LF_KFE": -1.0,
                   "RF_HAA": 0.0, "RF_HFE": 0.55, "RF_KFE": -1.0,
                   "LH_HAA": 0.0, "LH_HFE": 0.55, "LH_KFE": -1.0,
                   "RH_HAA": 0.0, "RH_HFE": 0.55, "RH_KFE": -1.0},
}
OUT.write_text(json.dumps(rig, separators=(",", ":")))
kb = OUT.stat().st_size // 1024
print(f"wrote {OUT} ({kb} KB)  bodies={len(bodies)} geoms={len(geoms)} meshes={len(meshes)}")
nonzero = sum(1 for m in meshes.values() if any(abs(x) > 1e-9 for x in m["pos"]))
print(f"meshes with non-zero COM offset: {nonzero}/{len(meshes)}")
