import * as THREE from "three";

/** MuJoCo quaternions are (w x y z); three.js is (x y z w). */
export function mqQuat(wxyz: number[]): THREE.Quaternion {
  return new THREE.Quaternion(wxyz[1], wxyz[2], wxyz[3], wxyz[0]);
}

export function mqVec(xyz: number[]): THREE.Vector3 {
  return new THREE.Vector3(xyz[0], xyz[1], xyz[2]);
}
