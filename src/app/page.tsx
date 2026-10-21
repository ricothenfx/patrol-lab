import { Viewport } from "@/components/Viewport";
import { MissionEditor } from "@/components/editor/MissionEditor";
import { MissionControls } from "@/components/editor/MissionControls";
import { NlCompileBar, ReportPanel } from "@/components/editor/AiTools";

export default function Home() {
  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" />
          PATROL<span className="brand-thin">LAB</span>
        </div>
        <div className="topbar-meta">
          mission control for autonomous inspection robots
        </div>
        <div className="topbar-status">
          <span className="status-pill status-idle">SIM KINEMATIC</span>
        </div>
      </header>

      <main className="main">
        <aside className="pane-left" data-testid="editor-pane">
          <div className="pane-title">MISSION EDITOR</div>
          <div className="editor-host-wrap">
            <MissionEditor />
          </div>
          <NlCompileBar />
          <MissionControls />
          <ReportPanel />
        </aside>

        <Viewport />
      </main>

      <footer className="statusbar">
        <span>rig: ANYmal C (MuJoCo Menagerie, BSD-3)</span>
        <span className="statusbar-sep">·</span>
        <span>deterministic sim — same seed, same readings</span>
        <span className="statusbar-right">patrol-lab v0.1</span>
      </footer>
    </div>
  );
}
