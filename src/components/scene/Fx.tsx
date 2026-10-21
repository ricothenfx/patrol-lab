"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { sim } from "@/lib/simworld";

/**
 * Mission visual effects, all driven from the mutable sim singleton (ADR-04):
 *  - route line: glowing current leg robot → target
 *  - target marker: pulsing ring at the destination POI
 *  - scan FX: expanding ground rings + beam while INSPECT runs
 */

export function RouteLine() {
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
    return g;
  }, []);
  const material = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        color: new THREE.Color("#35e0a1"),
        transparent: true,
        opacity: 0.6,
        toneMapped: false,
      }),
    [],
  );
  const line = useMemo(() => new THREE.Line(geometry, material), [geometry, material]);
  line.frustumCulled = false;

  useFrame(() => {
    const show = sim.mode === "mission" && sim.target !== null && !sim.scanning;
    line.visible = show;
    if (!show || !sim.target) return;
    const attr = geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.setXYZ(0, sim.pose.x, 0.05, sim.pose.z);
    attr.setXYZ(1, sim.target.x, 0.05, sim.target.z);
    attr.needsUpdate = true;
    geometry.computeBoundingSphere();
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return <primitive object={line} />;
}

export function TargetMarker() {
  const meshRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    if (sim.mode === "mission" && sim.target) {
      mesh.visible = true;
      mesh.position.set(sim.target.x, 0.03, sim.target.z);
      const pulse = 0.42 + 0.1 * Math.sin(t * 5);
      mesh.scale.setScalar(pulse / 0.42);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 + 0.3 * Math.sin(t * 5);
    } else {
      mesh.visible = false;
    }
  });
  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} visible={false}>
      <ringGeometry args={[0.4, 0.48, 48]} />
      <meshBasicMaterial color="#35e0a1" transparent opacity={0.6} toneMapped={false} />
    </mesh>
  );
}

const SCAN_DURATION = 3.0;
const scanState = { t0: 0, active: false };

export function ScanFx() {
  const ringsRef = useRef<THREE.Group>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const matsRef = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame(({ clock }) => {
    const group = ringsRef.current;
    if (!group) return;

    if (sim.scanning && !scanState.active) {
      scanState.active = true;
      scanState.t0 = clock.elapsedTime;
    }
    if (!sim.scanning && scanState.active) {
      scanState.active = false;
    }

    group.visible = scanState.active;
    if (beamRef.current) beamRef.current.visible = scanState.active;
    if (!scanState.active) return;

    const p = (clock.elapsedTime - scanState.t0) / SCAN_DURATION; // 0..1
    const cx = sim.pose.x;
    const cz = sim.pose.z;

    group.children.forEach((child, i) => {
      const delay = i * 0.35;
      const local = (p + delay) % 1;
      child.position.set(cx, 0.04, cz);
      child.scale.setScalar(0.2 + local * 3.4);
      const mat = matsRef.current[i];
      if (mat) mat.opacity = 0.55 * (1 - local);
    });

    if (beamRef.current) {
      beamRef.current.position.set(cx, 0.5, cz);
      beamRef.current.rotation.y = clock.elapsedTime * 2.4;
    }
  });

  const ringMats = useMemo(
    () =>
      [0, 1, 2].map(
        () =>
          new THREE.MeshBasicMaterial({
            color: "#35e0a1",
            transparent: true,
            opacity: 0,
            toneMapped: false,
            side: THREE.DoubleSide,
          }),
      ),
    [],
  );

  return (
    <group>
      <group ref={ringsRef} visible={false}>
        {ringMats.map((mat, i) => (
          <mesh
            key={i}
            ref={(m) => {
              if (m) matsRef.current[i] = m.material as THREE.MeshBasicMaterial;
            }}
            rotation={[-Math.PI / 2, 0, 0]}
          >
            <ringGeometry args={[0.86, 1, 48]} />
            <primitive object={mat} attach="material" />
          </mesh>
        ))}
      </group>
      <mesh ref={beamRef} visible={false}>
        <cylinderGeometry args={[0.5, 0.5, 1.0, 24, 1, true]} />
        <meshBasicMaterial color="#35e0a1" transparent opacity={0.12} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}
