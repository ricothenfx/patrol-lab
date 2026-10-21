"use client";

import dynamic from "next/dynamic";
import { useUi } from "@/state/store";
import { KpiOverlay } from "@/components/dashboard/KpiOverlay";
import { MiniMap } from "@/components/dashboard/MiniMap";

const Scene = dynamic(() => import("./scene/Scene"), {
  ssr: false,
  loading: () => <div className="viewport-loading">initializing renderer…</div>,
});

export function Viewport() {
  const { loadDone, loadTotal, viewportReady, simMode, camMode, setCamMode, snapshot } = useUi();
  const pct = loadTotal > 0 ? Math.round((loadDone / loadTotal) * 100) : 0;

  return (
    <section className="viewport" data-testid="viewport">
      <Scene />

      {!viewportReady && (
        <div className="viewport-overlay" data-testid="viewport-loading">
          <div className="loading-title">ANYmal C · loading rig + assets</div>
          <div className="loading-bar">
            <div className="loading-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="loading-meta">
            {loadDone}/{loadTotal} assets · {pct}%
          </div>
        </div>
      )}

      <div className="viewport-badge">
        <span className="badge-dot" />
        SITE A · SUBSTATION SIM
        <span className="badge-sep">·</span>
        {simMode}
        <span className="badge-sep">·</span>
        <button
          className="cam-toggle"
          data-testid="cam-toggle"
          onClick={() => setCamMode(camMode === "orbit" ? "follow" : "orbit")}
        >
          {camMode === "follow" ? "◎ follow" : "✥ orbit"}
        </button>
      </div>

      {viewportReady && (
        <>
          <div data-testid="viewport-ready" className="viewport-ready-flag" />
          <KpiOverlay snapshot={snapshot} />
          <MiniMap />
        </>
      )}
    </section>
  );
}
