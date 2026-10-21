"use client";

import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUi } from "@/state/store";
import { sim } from "@/lib/simworld";

const OFFSET = new THREE.Vector3(2.4, 1.7, 2.6);
const lerpTarget = new THREE.Vector3();
const lerpPos = new THREE.Vector3();

/**
 * Follow camera: trails the robot while a mission runs. Orbit stays available
 * by toggling the badge button; any manual follow→orbit switch returns control
 * to OrbitControls at the current pose (no snap-back).
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update: () => void; enabled: boolean }
    | null;

  useFrame((_, dt) => {
    const mode = useUi.getState().camMode;
    if (controls) controls.enabled = mode === "orbit";
    if (mode !== "follow" || sim.mode === "unloaded") return;
    const k = 1 - Math.exp(-3.2 * Math.min(dt, 0.05));
    lerpPos.set(sim.pose.x + OFFSET.x, OFFSET.y, sim.pose.z + OFFSET.z);
    camera.position.lerp(lerpPos, k);
    lerpTarget.set(sim.pose.x, 0.45, sim.pose.z);
    if (controls) {
      controls.target.lerp(lerpTarget, k);
      controls.update();
    } else {
      camera.lookAt(lerpTarget);
    }
  });

  return null;
}

