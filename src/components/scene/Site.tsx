"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Grid, Html, OrbitControls } from "@react-three/drei";

export interface Poi {
  id: string;
  label: string;
  x: number;
  z: number;
  color: string;
  kind: "pump" | "transformer" | "gauge" | "valve" | "tank";
}

export const POIS: Poi[] = [
  { id: "pump_station", label: "PUMP-01 · pump station", x: 3.4, z: 2.2, color: "#ffb454", kind: "pump" },
  { id: "transformer_row", label: "TR-ROW · transformers", x: -3.8, z: 2.8, color: "#57b6ff", kind: "transformer" },
  { id: "gauge_bank", label: "GAUGE-BANK", x: -3.2, z: -2.6, color: "#35e0a1", kind: "gauge" },
  { id: "valve_manifold", label: "VALVE-MANIFOLD", x: 0.6, z: -3.4, color: "#ff5d5d", kind: "valve" },
  { id: "tank_farm", label: "TANK-FARM", x: 4.1, z: -1.8, color: "#b48cff", kind: "tank" },
];

function PoiMarker({ poi }: { poi: Poi }) {
  const pos = useMemo(() => new THREE.Vector3(poi.x, 0, poi.z), [poi.x, poi.z]);
  return (
    <group position={pos}>
      <mesh position={[0, 0.18, 0]} castShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.36, 24]} />
        <meshStandardMaterial color="#151b24" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[0.05, 1.6, 0.05]} />
        <meshStandardMaterial color={poi.color} emissive={poi.color} emissiveIntensity={1.6} toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.06, 0.1, 24]} />
        <meshBasicMaterial color={poi.color} toneMapped={false} />
      </mesh>
      <pointLight position={[0, 0.5, 0]} color={poi.color} intensity={2.2} distance={3.2} />
      <Html center distanceFactor={12} position={[0, 2.25, 0]} zIndexRange={[10, 0]}>
        <div className="poi-label" style={{ borderColor: poi.color }}>
          {poi.label}
        </div>
      </Html>
    </group>
  );
}

export function Site() {
  return (
    <>
      <color attach="background" args={["#07090c"]} />
      <fog attach="fog" args={["#07090c", 16, 46]} />

      <ambientLight intensity={0.32} color="#8fa3bf" />
      {/* hero fill: keeps the robot readable in the wide dark shot */}
      <spotLight
        position={[2.5, 4.5, 2]}
        angle={0.7}
        penumbra={0.8}
        intensity={26}
        color="#dfe9ff"
      />
      <directionalLight
        position={[9, 13, 6]}
        intensity={1.35}
        color="#c9d9f5"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-6, 4, -8]} intensity={0.25} color="#3b5f8f" />

      {/* ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[90, 90]} />
        <meshStandardMaterial color="#0b0f15" roughness={0.96} metalness={0} />
      </mesh>
      <Grid
        position={[0, 0.012, 0]}
        args={[80, 80]}
        cellSize={0.6}
        cellThickness={0.6}
        cellColor="#131a24"
        sectionSize={3}
        sectionThickness={1}
        sectionColor="#1c2836"
        fadeDistance={42}
        fadeStrength={1.4}
        infiniteGrid
      />

      {/* site perimeter hint */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
        <ringGeometry args={[6.6, 6.68, 96]} />
        <meshBasicMaterial color="#1f2a3a" transparent opacity={0.8} />
      </mesh>

      {POIS.map((poi) => (
        <PoiMarker key={poi.id} poi={poi} />
      ))}

      <OrbitControls
        makeDefault
        target={[0, 0.55, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={2.5}
        maxDistance={26}
        maxPolarAngle={1.42}
      />
    </>
  );
}
