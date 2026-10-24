"use client";

import { useEffect, useState } from "react";
import { useUi } from "@/state/store";
import { loadRigAssets } from "@/lib/assets";
import { buildRig, type Rig, type RigSpec } from "@/lib/rig";
import { sim } from "@/lib/simworld";

/**
 * Loads the baked ANYmal C rig + assets, builds the three.js hierarchy and
 * hands it to the simulation.
 */
export default function AnymalC() {
  const setProgress = useUi((s) => s.setProgress);
  const setViewportReady = useUi((s) => s.setViewportReady);
  const [rig, setRig] = useState<Rig | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const res = await fetch("/models/anymal_c/rig.json");
      if (!res.ok) throw new Error(`rig.json: HTTP ${res.status}`);
      const spec = (await res.json()) as RigSpec;
      const { geometries, materials } = await loadRigAssets(spec, (done, total) => {
        if (!cancelled) setProgress(done, total);
      });
      if (cancelled) return;
      const built = buildRig(spec, geometries, materials);
      sim.attach(built);
      setRig(built);
      setViewportReady(true);
    })().catch((err) => {
      console.error("[patrol-lab] rig load failed", err);
    });

    return () => {
      cancelled = true;
      sim.detach();
      setViewportReady(false);
      setRig(null);
    };
  }, [setProgress, setViewportReady]);

  return rig ? <primitive object={rig.holder} /> : null;
}
