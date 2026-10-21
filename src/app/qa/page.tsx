import { PageShell } from "@/components/PageShell";
import { resolveLocale } from "@/lib/i18n/server";
import { QaExplorer } from "./QaExplorer";
import { QA_PAGE } from "./qa-data";

export const metadata = {
  title: "Q&A · patrol-lab",
  description:
    "Technical Q&A about patrol-lab: the kinematic gait, the 120 Hz interpreter, the LLM boundary, rig baking, determinism and the honest-numbers policy.",
};

export default async function QaPage() {
  const c = QA_PAGE[await resolveLocale()];
  return (
    <PageShell active="qa">
      <article className="doc">
        <p className="doc-kicker">PATROL-LAB · Q&amp;A</p>
        <h1 className="doc-title">{c.title}</h1>
        <p className="doc-intro">{c.intro}</p>
        <QaExplorer />
        <p className="doc-crosslink">{c.crosslink}</p>
      </article>
    </PageShell>
  );
}
