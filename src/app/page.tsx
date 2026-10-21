import { Viewport } from "@/components/Viewport";
import { TopBar } from "@/components/TopBar";
import { MissionEditor } from "@/components/editor/MissionEditor";
import { MissionControls } from "@/components/editor/MissionControls";
import { NlCompileBar, ReportPanel } from "@/components/editor/AiTools";

export default function Home() {
  return (
    <div className="app">
      <TopBar
        meta="mission control for autonomous inspection robots"
        right={<span className="status-pill status-idle">SIM KINEMATIC</span>}
      />

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
