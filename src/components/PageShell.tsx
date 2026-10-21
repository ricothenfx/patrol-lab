import { TopBar, type NavPage } from "@/components/TopBar";
import { resolveLocale } from "@/lib/i18n/server";
import { DICT } from "@/lib/i18n";

/**
 * Shell for content pages (/qa, /faq). The app shell keeps html/body at
 * overflow:hidden (the mission-control layout never scrolls), so content
 * pages own their scrolling via .page-body.
 */
export async function PageShell({ active, children }: { active: NavPage; children: React.ReactNode }) {
  const t = DICT[await resolveLocale()];
  return (
    <div className="page">
      <TopBar active={active} />
      <main className="page-body">{children}</main>
      <footer className="statusbar">
        <span>{t.home.footerRig}</span>
        <span className="statusbar-sep">·</span>
        <span>{t.home.footerSim}</span>
        <span className="statusbar-right">patrol-lab v0.1</span>
      </footer>
    </div>
  );
}
