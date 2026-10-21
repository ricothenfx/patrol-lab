import { Viewport } from "@/components/Viewport";
import { TopBar } from "@/components/TopBar";
import { MissionEditor } from "@/components/editor/MissionEditor";
import { MissionControls } from "@/components/editor/MissionControls";
import { NlCompileBar, ReportPanel } from "@/components/editor/AiTools";
import { resolveLocale } from "@/lib/i18n/server";
import { DICT } from "@/lib/i18n";

export default async function Home() {
  const t = DICT[await resolveLocale()];
  return (
    <div className="app">
      <TopBar
        meta={t.home.meta}
        right={<span className="status-pill status-idle">SIM</span>}
      />

      <main className="main">
        <aside className="pane-left" data-testid="editor-pane">
          <div className="pane-title">{t.home.paneTitle}</div>
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
        <span>{t.home.footerRig}</span>
        <span className="statusbar-sep">·</span>
        <span>{t.home.footerSim}</span>
        <span className="statusbar-right">patrol-lab v0.1</span>
      </footer>
    </div>
  );
}
