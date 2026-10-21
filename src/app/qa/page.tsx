import Link from "next/link";
import { PageShell } from "@/components/PageShell";
import { QaExplorer } from "./QaExplorer";

export const metadata = {
  title: "Q&A · patrol-lab",
  description:
    "Technical Q&A about patrol-lab: the kinematic gait, the 120 Hz interpreter, the LLM boundary, rig baking, determinism and the honest-numbers policy.",
};

export default function QaPage() {
  return (
    <PageShell active="qa">
      <article className="doc">
        <p className="doc-kicker">PATROL-LAB · Q&amp;A</p>
        <h1 className="doc-title">Technical questions &amp; answers</h1>
        <p className="doc-intro">
          How the simulation, mission DSL, determinism and LLM plugins actually work — searchable
          and filterable by tag. For product-level questions, see the{" "}
          <Link href="/faq">FAQ</Link>.
        </p>
        <QaExplorer />
        <p className="doc-crosslink">
          Looking for the basics? Read the <Link href="/faq">FAQ</Link> — or go back to{" "}
          <Link href="/">mission control</Link>.
        </p>
      </article>
    </PageShell>
  );
}
