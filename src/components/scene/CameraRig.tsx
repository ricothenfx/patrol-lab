"use client";

/* eslint-disable react-hooks/immutability -- three.js objects are imperative systems mutated inside the frame loop by design (ADR-04) */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useUi } from "@/state/store";
import { sim } from "@/lib/simworld";

/**
 * Follow camera: the orbit target tracks the robot EXACTLY (no lag, so the
 * robot stays composed while walking and scanning), while the camera offset
 * drifts slowly toward the ideal framing — keeping the operator's orbit angle
 * and zoom for a few seconds before recentering. OrbitControls is gated to
 * orbit mode (its update() would otherwise fight the follow).
 */
const IDEAL_OFFSET = new THREE.Vector3(2.3, 1.7, 2.4);
const offset = new THREE.Vector3();
const target = new THREE.Vector3();

export function CameraRig() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as
    | { target: THREE.Vector3; update: () => void; enabled: boolean }
    | null;
  const robotPos = useRef(new THREE.Vector3());
  const following = useRef(false);

  useEffect(() => {
    // debug/e2e hook extension: live camera pose for autonomous review
    const w = window as typeof window & {
      __patrol?: { camera?: () => { pos: [number, number, number]; target: [number, number, number] } };
    };
    if (w.__patrol) {
      w.__patrol.camera = () => ({
        pos: [camera.position.x, camera.position.y, camera.position.z],
        target: controls
          ? [controls.target.x, controls.target.y, controls.target.z]
          : [0, 0, 0],
      });
    }
  }, [camera, controls]);

  useFrame((_, delta) => {
    const mode = useUi.getState().camMode;
    // three.js OrbitControls is an imperative object; toggling `enabled` inside
    // the frame loop is its intended API (not React state).
    if (controls) controls.enabled = mode === "orbit";
    if (mode !== "follow" || sim.mode === "unloaded") {
      following.current = false;
      return;
    }

    robotPos.current.set(sim.pose.x, 0, sim.pose.z);
    if (!following.current) {
      // engage: adopt the current view, then start tracking from here
      offset.copy(camera.position).sub(robotPos.current);
      following.current = true;
    }

    // frame-rate-independent drift toward the ideal offset (keeps user angle
    // and zoom for several seconds, then gently recomposes)
    const k = 1 - Math.exp(-0.5 * Math.min(delta, 0.1));
    offset.lerp(IDEAL_OFFSET, k);

    target.copy(robotPos.current).setY(0.45);
    camera.position.copy(robotPos.current).add(offset);
    if (controls) {
      controls.target.copy(target);
      controls.update();
    } else {
      camera.lookAt(target);
    }
  });

  return null;
}
