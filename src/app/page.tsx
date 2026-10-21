import { Viewport } from "@/components/Viewport";

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
          <span className="status-pill status-idle">SIM IDLE</span>
        </div>
      </header>

      <main className="main">
        <aside className="pane-left" data-testid="editor-pane">
          <div className="pane-title">MISSION EDITOR</div>
          <div className="editor-placeholder">
            <p>
              The mission DSL editor lands in <strong>Phase 2</strong>: write
              <code>GOTO / INSPECT / WAIT</code> scripts, run them step by step, and
              watch the highlighted line drive the robot on the right.
            </p>
            <div className="phase-list">
              <div className="phase done">P0 · foundation</div>
              <div className="phase active">P1 · robot on site</div>
              <div className="phase">P2 · mission DSL + editor</div>
              <div className="phase">P3 · locomotion + path following</div>
              <div className="phase">P4 · control-room dashboard</div>
              <div className="phase">P5 · LLM plugins</div>
              <div className="phase">P6 · hardening + launch</div>
            </div>
          </div>
        </aside>

        <Viewport />
      </main>

      <footer className="statusbar">
        <span>rig: ANYmal C (MuJoCo Menagerie, BSD-3)</span>
        <span className="statusbar-sep">·</span>
        <span>sim runs locally in your browser</span>
        <span className="statusbar-right">patrol-lab v0.1</span>
      </footer>
    </div>
  );
}
