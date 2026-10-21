"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUi } from "@/state/store";
import { sim } from "@/lib/simworld";

/**
 * Follow camera: translates the whole camera rig (position + orbit target) by
 * the robot's per-frame delta, so the operator keeps whatever orbit angle they
 * had when follow engaged — and OrbitControls never fights the follow (its
 * update() would otherwise re-derive position from its own spherical state).
 */
const IDEAL_OFFSET = new THREE.Vector3(2.3, 1.7, 2.4);
const idealPos = new THREE.Vector3();
const idealTarget = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update: () => void; enabled: boolean }
    | null;
  const lastRobot = useRef(new THREE.Vector3());
  const following = useRef(false);
  const robotPos = useRef(new THREE.Vector3());
  const delta = useRef(new THREE.Vector3());

  useFrame(({ clock }) => {
    const mode = useUi.getState().camMode;
    if (controls) controls.enabled = mode === "orbit";
    if (mode !== "follow" || sim.mode === "unloaded") {
      following.current = false;
      return;
    }

    robotPos.current.set(sim.pose.x, 0, sim.pose.z);
    if (!following.current) {
      // engage: adopt current view, just start tracking from here
      lastRobot.current.copy(robotPos.current);
      following.current = true;
      return;
    }

    delta.current.copy(robotPos.current).sub(lastRobot.current);
    if (delta.current.lengthSq() > 1e-8) {
      camera.position.add(delta.current);
      if (controls) {
        controls.target.add(delta.current);
      } else {
        camera.lookAt(robotPos.current);
      }
      lastRobot.current.copy(robotPos.current);
    }

    // gentle drift toward the ideal framing so the robot stays well composed
    // (slow enough to keep user orbit angles for several seconds)
    const k = 1 - Math.exp(-0.55 * 0.016);
    void clock;
    idealPos.copy(robotPos.current).add(IDEAL_OFFSET);
    idealTarget.copy(robotPos.current).setY(0.45);
    camera.position.lerp(idealPos, k);
    if (controls) {
      controls.target.lerp(idealTarget, k);
      controls.update();
    } else {
      camera.lookAt(idealTarget);
    }
  });

  return null;
}
