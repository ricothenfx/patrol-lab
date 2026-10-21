import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import type { RigSpec } from "./rig";
import { mqQuat, mqVec } from "./quat";

export interface LoadedRigAssets {
  geometries: Map<string, THREE.BufferGeometry>;
  materials: Map<string, THREE.Material>;
}

const MODEL_BASE = "/models/anymal_c";
const ASSET_BASE = `${MODEL_BASE}/assets`;

/**
 * Load all OBJ geometries (with the baked MuJoCo COM offset applied to the
 * vertex data) and every material referenced by the rig spec.
 * `onProgress` receives (done, total) over meshes + textures.
 */
export async function loadRigAssets(spec: RigSpec, onProgress?: (done: number, total: number) => void): Promise<LoadedRigAssets> {
  const meshDefs = Object.values(spec.meshes);
  const textureFiles = new Set<string>();
  for (const m of Object.values(spec.materials)) if (m.texture) textureFiles.add(m.texture);

  const total = meshDefs.length + textureFiles.size;
  let done = 0;
  const step = () => {
    done += 1;
    onProgress?.(done, total);
  };

  const geometries = new Map<string, THREE.BufferGeometry>();
  await Promise.all(
    meshDefs.map(async (def) => {
      const res = await fetch(`${ASSET_BASE}/${def.file}`);
      if (!res.ok) throw new Error(`asset ${def.file}: HTTP ${res.status}`);
      const text = await res.text();
      const obj = new OBJLoader().parse(text);
      // OBJLoader returns a Group with one or more child meshes; merge children.
      const parts: THREE.BufferGeometry[] = [];
      obj.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) parts.push((child as THREE.Mesh).geometry.clone());
      });
      if (parts.length === 0) throw new Error(`asset ${def.file}: no mesh data`);
      let geometry: THREE.BufferGeometry;
      if (parts.length === 1) {
        geometry = parts[0];
      } else {
        // merge without needing BufferGeometryUtils: accumulate via group transform
        geometry = parts[0];
        for (let i = 1; i < parts.length; i++) {
          // mergeGeometries is available in examples; avoid the extra import by
          // using the non-indexed merge util only when actually required.
          geometry = mergeGeometries([geometry, parts[i]]);
        }
      }
      // Bake MuJoCo's mesh-frame offset (COM recentering) into the vertices.
      const m = new THREE.Matrix4().compose(mqVec(def.pos), mqQuat(def.quat), new THREE.Vector3(1, 1, 1));
      geometry.applyMatrix4(m);
      if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
      geometries.set(def.file.replace(/\.obj$/, ""), geometry);
      step();
    }),
  );

  const materials = new Map<string, THREE.Material>();
  materials.set("__default", new THREE.MeshStandardMaterial({ color: 0x202830, roughness: 0.8 }));

  const textureCache = new Map<string, THREE.Texture>();
  await Promise.all(
    [...textureFiles].map(async (file) => {
      const tex = await new Promise<THREE.Texture>((resolve, reject) => {
        new THREE.TextureLoader().load(`${ASSET_BASE}/${file}`, resolve, undefined, reject);
      });
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      textureCache.set(file, tex);
      step();
    }),
  );

  for (const [name, def] of Object.entries(spec.materials)) {
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.72, metalness: 0.08 });
    if (def.texture && textureCache.has(def.texture)) {
      mat.map = textureCache.get(def.texture)!;
    } else if (def.rgba) {
      mat.color = new THREE.Color(def.rgba[0], def.rgba[1], def.rgba[2]);
    } else {
      mat.color = new THREE.Color(0x39424e);
    }
    materials.set(name, mat);
  }

  return { geometries, materials };
}

function mergeGeometries(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // Minimal position+normal+uv merge (non-indexed) to avoid importing
  // BufferGeometryUtils — every Menagerie part shares this attribute set.
  const attrNames = ["position", "normal", "uv"] as const;
  const nonIndexed = parts.map((p) => (p.index ? p.toNonIndexed() : p));
  const merged = new THREE.BufferGeometry();
  for (const name of attrNames) {
    const first = nonIndexed[0].getAttribute(name);
    if (!first) continue;
    const itemSize = first.itemSize;
    let count = 0;
    for (const p of nonIndexed) {
      const a = p.getAttribute(name);
      if (a) count += a.count;
    }
    const array = new Float32Array(count * itemSize);
    let offset = 0;
    for (const p of nonIndexed) {
      const a = p.getAttribute(name) as THREE.BufferAttribute | undefined;
      if (!a) continue;
      array.set(a.array as Float32Array, offset);
      offset += a.count * itemSize;
    }
    merged.setAttribute(name, new THREE.BufferAttribute(array, itemSize));
  }
  return merged;
}
