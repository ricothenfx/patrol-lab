import { PageShell } from "@/components/PageShell";
import { resolveLocale } from "@/lib/i18n/server";
import { FAQ_PAGE } from "./content";

export const metadata = {
  title: "FAQ · patrol-lab",
  description:
    "Frequently asked questions about patrol-lab — the browser simulation of an ANYmal C inspection robot, its mission DSL and its honest numbers.",
};

export default async function FaqPage() {
  const c = FAQ_PAGE[await resolveLocale()];
  return (
    <PageShell active="faq">
      <article className="doc">
        <p className="doc-kicker">PATROL-LAB · FAQ</p>
        <h1 className="doc-title">{c.title}</h1>
        <p className="doc-intro">{c.intro}</p>
        <div className="faq-list" data-testid="faq-list">
          {c.items.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <div className="faq-answer">{f.a}</div>
            </details>
          ))}
        </div>
        <p className="doc-crosslink">{c.crosslink}</p>
      </article>
    </PageShell>
  );
}
