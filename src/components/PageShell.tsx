import { TopBar, type NavPage } from "@/components/TopBar";

/**
 * Shell for content pages (/qa, /faq). The app shell keeps html/body at
 * overflow:hidden (the mission-control layout never scrolls), so content
 * pages own their scrolling via .page-body.
 */
export function PageShell({ active, children }: { active: NavPage; children: React.ReactNode }) {
  return (
    <div className="page">
      <TopBar active={active} />
      <main className="page-body">{children}</main>
      <footer className="statusbar">
        <span>rig: ANYmal C (MuJoCo Menagerie, BSD-3)</span>
        <span className="statusbar-sep">·</span>
        <span>deterministic sim — same seed, same readings</span>
        <span className="statusbar-right">patrol-lab v0.1</span>
      </footer>
    </div>
  );
}
