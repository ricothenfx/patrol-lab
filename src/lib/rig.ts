/**
 * Rig construction from the baked MuJoCo Menagerie ANYmal C description.
 *
 * Coordinate convention: rig.json is in MuJoCo coordinates (Z-up). The returned
 * `root` group is pre-rotated so callers work in plain three.js Y-up world space:
 *   driver (yaw/position in world) -> root (Z-up fix) -> base body -> legs
 *
 * Body transform chain mirrors MuJoCo: parent frame -> static (pos, quat) ->
 * joint rotation (hinge about local axis). Visual geoms live in the joint frame.
 */
import * as THREE from "three";
import { mqQuat, mqVec } from "./quat";

export interface RigMaterialDef {
  rgba?: number[];
  texture?: string;
}

export interface RigMeshDef {
  file: string;
  pos: number[];
  quat: number[]; // wxyz
}

export interface RigJointDef {
  name: string;
  axis: number[];
  range: number[];
}

export interface RigBodyDef {
  name: string;
  parent: string;
  pos: number[];
  quat: number[]; // wxyz
  joint?: RigJointDef;
}

export interface RigGeomDef {
  body: string;
  mesh: string;
  material: string | null;
  pos: number[];
  quat: number[]; // wxyz
}

export interface RigSpec {
  materials: Record<string, RigMaterialDef>;
  meshes: Record<string, RigMeshDef>;
  bodies: RigBodyDef[];
  geoms: RigGeomDef[];
  stand_pose: Record<string, number>;
}

export interface JointHandle {
  name: string;
  pivot: THREE.Object3D;
  axis: THREE.Vector3;
  range: [number, number];
  angle: number;
}

export interface Rig {
  /** three.js-space transform target: position (x,0,z) + yaw around Y */
  holder: THREE.Group;
  root: THREE.Group;
  driver: THREE.Group;
  joints: Map<string, JointHandle>;
  bodyPivots: Map<string, THREE.Object3D>;
  standPose: Record<string, number>;
  /** original base quaternion from the MJCF (includes the 180° Z flip) */
  baseQuat: THREE.Quaternion;
  meshCount: number;
  geomCount: number;
}

export function buildRig(spec: RigSpec, geometries: Map<string, THREE.BufferGeometry>, materials: Map<string, THREE.Material>): Rig {
  // holder lives in plain three.js world space; root applies ONLY the
  // MuJoCo Z-up -> three.js Y-up axis fix. Mixing yaw/position into the
  // mujoco frame would pitch the robot and lift it by pose.z.
  const holder = new THREE.Group();
  holder.name = "anymal-holder";

  const root = new THREE.Group();
  root.name = "anymal-root";
  root.rotation.x = -Math.PI / 2;
  holder.add(root);

  const driver = new THREE.Group();
  driver.name = "anymal-driver";
  root.add(driver);

  const bodyPivots = new Map<string, THREE.Object3D>();
  const joints = new Map<string, JointHandle>();
  const byName = new Map<string, RigBodyDef>();
  for (const b of spec.bodies) byName.set(b.name, b);

  let meshCount = 0;
  let geomCount = 0;

  const ensurePivot = (bodyName: string): THREE.Object3D => {
    const pivot = bodyPivots.get(bodyName);
    if (pivot) return pivot;
    const def = byName.get(bodyName);
    if (!def) throw new Error(`rig: unknown body ${bodyName}`);
    const parentPivot = def.parent === "world" ? driver : ensurePivot(def.parent);
    const container = new THREE.Object3D();
    container.name = def.name;
    container.position.copy(mqVec(def.pos));
    container.quaternion.copy(mqQuat(def.quat));
    parentPivot.add(container);

    if (def.joint) {
      const pivot = new THREE.Object3D();
      pivot.name = `${def.name}:joint:${def.joint.name}`;
      container.add(pivot);
      const handle: JointHandle = {
        name: def.joint.name,
        pivot,
        axis: mqVec(def.joint.axis).normalize(),
        range: [def.joint.range[0], def.joint.range[1]],
        angle: 0,
      };
      joints.set(def.joint.name, handle);
      bodyPivots.set(bodyName, pivot);
    } else {
      bodyPivots.set(bodyName, container);
    }
    return bodyPivots.get(bodyName)!;
  };

  // base body has a freejoint in MJCF (skipped by the baker); its pivot is its
  // own container so we can bob height without touching legs.
  for (const b of spec.bodies) ensurePivot(b.name);
  const baseQuat = bodyPivots.get("base")!.quaternion.clone();

  for (const g of spec.geoms) {
    const geometry = geometries.get(g.mesh);
    if (!geometry) throw new Error(`rig: missing geometry ${g.mesh}`);
    const material = (g.material && materials.get(g.material)) || materials.get("__default");
    if (!material) throw new Error("rig: no default material");
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = `${g.body}:${g.mesh}`;
    mesh.position.copy(mqVec(g.pos));
    mesh.quaternion.copy(mqQuat(g.quat));
    mesh.castShadow = true;
    mesh.receiveShadow = false;
    const pivot = bodyPivots.get(g.body);
    if (!pivot) throw new Error(`rig: no pivot for geom body ${g.body}`);
    pivot.add(mesh);
    meshCount += 1;
    geomCount += 1;
  }

  return { holder, root, driver, joints, bodyPivots, standPose: spec.stand_pose, baseQuat, meshCount, geomCount };
}

/** Apply a named joint angle (radians), clamped to the MJCF range. */
export function setJointAngle(rig: Rig, name: string, angle: number): void {
  const j = rig.joints.get(name);
  if (!j) return;
  const clamped = Math.min(j.range[1], Math.max(j.range[0], angle));
  j.angle = clamped;
  j.pivot.quaternion.setFromAxisAngle(j.axis, clamped);
}
