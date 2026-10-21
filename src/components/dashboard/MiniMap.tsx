"use client";

import { useEffect, useRef } from "react";
import { sim } from "@/lib/simworld";
import { POIS } from "@/lib/site";
import { orchestrator } from "@/lib/orchestrator";
import { useT } from "@/lib/i18n/LocaleProvider";

const MAP_R = 74; // px
const SITE_R = 6.2; // world units mapped to MAP_R

function toPx(x: number, z: number): [number, number] {
  return [MAP_R + (x / SITE_R) * MAP_R, MAP_R + (z / SITE_R) * MAP_R];
}

/**
 * Top-down tactical minimap: POIs, robot pose (from the mutable sim singleton,
 * read at draw time — no React churn), current target, scanned POIs from the
 * runner snapshot. All positions are real simulation state.
 */
export function MiniMap() {
  const t = useT();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;

    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const size = MAP_R * 2;
      if (canvas.width !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // frame
      ctx.strokeStyle = "#1b2330";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(MAP_R, MAP_R, MAP_R - 2, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = "#131b26";
      ctx.beginPath();
      ctx.arc(MAP_R, MAP_R, (MAP_R - 2) * 0.55, 0, Math.PI * 2);
      ctx.stroke();

      const inspected = new Set(orchestrator.runner.snapshot.findings.map((f) => f.poi));

      // POIs
      for (const poi of POIS) {
        const [px, py] = toPx(poi.x, poi.z);
        ctx.beginPath();
        ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = inspected.has(poi.id) ? poi.color : "#1c2530";
        ctx.fill();
        ctx.strokeStyle = inspected.has(poi.id) ? poi.color : "#2a3648";
        ctx.stroke();
      }

      // target link
      if (sim.target) {
        const [tx, ty] = toPx(sim.target.x, sim.target.z);
        const [rx, ry] = toPx(sim.pose.x, sim.pose.z);
        ctx.strokeStyle = "rgba(53,224,161,0.55)";
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(rx, ry);
        ctx.lineTo(tx, ty);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.strokeStyle = "#35e0a1";
        ctx.stroke();
      }

      // robot: heading triangle
      const [rx, ry] = toPx(sim.pose.x, sim.pose.z);
      const heading = sim.pose.heading; // three.js Y rotation; forward = +X
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate(-heading);
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-4, 4);
      ctx.lineTo(-4, -4);
      ctx.closePath();
      ctx.fillStyle = "#ff5d5d";
      ctx.fill();
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="minimap" data-testid="minimap">
      <div className="minimap-title">{t.minimap.title}</div>
      <canvas ref={canvasRef} style={{ width: MAP_R * 2, height: MAP_R * 2 }} />
    </div>
  );
}
