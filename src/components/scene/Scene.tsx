"use client";

import { useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import AnymalC from "./AnymalC";
import { Site } from "./Site";
import { sim } from "@/lib/simworld";

function Ticker() {
  const gl = useThree((s) => s.gl);

  useEffect(() => {
    // debug/e2e hook — honest render stats, no fakes
    window.__patrol = {
      frames: () => sim.frames,
      tris: () => gl.info.render.triangles,
      joints: () => sim.jointCount,
      mode: () => sim.mode,
    };
  }, [gl]);

  useFrame((_, dt) => {
    sim.tick(dt);
  });
  return null;
}

export default function Scene() {
  return (
    <Canvas
      dpr={[1, 2]}
      shadows
      camera={{ position: [3.4, 1.9, 3.6], fov: 42 }}
      gl={{ antialias: true }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
      }}
    >
      <Ticker />
      <Site />
      <AnymalC />
    </Canvas>
  );
}
