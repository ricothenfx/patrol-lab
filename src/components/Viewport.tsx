"use client";

import dynamic from "next/dynamic";
import { useUi } from "@/state/store";
import { useT } from "@/lib/i18n/LocaleProvider";
import { orchestrator } from "@/lib/orchestrator";
import { KpiOverlay } from "@/components/dashboard/KpiOverlay";
import { MiniMap } from "@/components/dashboard/MiniMap";

function SceneLoading() {
  const t = useT();
  return <div className="viewport-loading">{t.viewport.initRenderer}</div>;
}

const Scene = dynamic(() => import("./scene/Scene"), {
  ssr: false,
  loading: () => <SceneLoading />,
});

export function Viewport() {
  const { loadDone, loadTotal, viewportReady, simMode, locSwitching, locError, camMode, setCamMode, snapshot } = useUi();
  const t = useT();
  const pct = loadTotal > 0 ? Math.round((loadDone / loadTotal) * 100) : 0;

  const toggleLoc = () => {
    if (locSwitching) return;
    const next = simMode === "KINEMATIC" ? "dynamics" : "kinematic";
    void orchestrator.switchLocomotion(next);
  };

  return (
    <section className="viewport" data-testid="viewport">
      <Scene />

      {!viewportReady && (
        <div className="viewport-overlay" data-testid="viewport-loading">
          <div className="loading-title">{t.viewport.loadingRig}</div>
          <div className="loading-bar">
            <div className="loading-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="loading-meta">{t.viewport.assetsMeta(loadDone, loadTotal, pct)}</div>
        </div>
      )}

      {locSwitching && (
        <div className="viewport-overlay viewport-overlay-thin" data-testid="physics-loading">
          <div className="loading-title">{t.viewport.physicsLoading}</div>
          <div className="loading-bar">
            <div className="loading-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      <div className="viewport-badge">
        <span className="badge-dot" />
        {t.viewport.siteBadge}
        <span className="badge-sep">·</span>
        <button
          className="cam-toggle"
          data-testid="loc-toggle"
          onClick={toggleLoc}
          disabled={locSwitching}
          title={t.viewport.locToggleTitle}
        >
          {simMode}
        </button>
        <span className="badge-sep">·</span>
        <button
          className="cam-toggle"
          data-testid="cam-toggle"
          onClick={() => setCamMode(camMode === "orbit" ? "follow" : "orbit")}
        >
          {camMode === "follow" ? t.viewport.camFollow : t.viewport.camOrbit}
        </button>
      </div>

      {locError && (
        <div className="run-error" data-testid="loc-error">
          {t.viewport.locError}
        </div>
      )}

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
