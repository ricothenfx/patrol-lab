import Link from "next/link";
import { PageShell } from "@/components/PageShell";

const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "What is patrol-lab?",
    a: (
      <>
        Mission control for autonomous inspection robots. You write a mission script on the left
        and watch an ANYmal C quadruped execute it on a live 3D industrial site on the right — with
        mission telemetry, POI coverage, findings and alerts on the dashboard. Everything runs
        deterministically in your browser.
      </>
    ),
  },
  {
    q: "Is this ANYbotics software?",
    a: (
      <>
        No. patrol-lab is an independent portfolio project and is not affiliated with ANYbotics AG.
        The ANYmal C robot model comes from{" "}
        <a href="https://github.com/google-deepmind/mujoco_menagerie" target="_blank" rel="noreferrer">
          MuJoCo Menagerie
        </a>{" "}
        (<code>anybotics_anymal_c</code>, BSD-3-Clause), vendored with attribution.
      </>
    ),
  },
  {
    q: "Is it real physics?",
    a: (
      <>
        No — and the UI says so truthfully: the status pill reads <code>SIM KINEMATIC</code>. The
        robot follows a kinematic trot gait with heading control, driven by a fixed-timestep
        (120 Hz) mission interpreter. No dynamics engine runs in the browser.
      </>
    ),
  },
  {
    q: "Do results change between runs?",
    a: (
      <>
        Not for the same seed. The simulation is deterministic: a seeded RNG produces the sensor
        findings, the interpreter runs on a fixed timestep, and nothing depends on wall-clock time.
        Pick the same seed and preset and you get the exact same mission, readings and alerts.
      </>
    ),
  },
  {
    q: "What is the mission script language?",
    a: (
      <>
        A small DSL: <code>MISSION</code>, <code>GOTO</code>, <code>INSPECT</code>, <code>WAIT</code>,{" "}
        <code>SPEED</code> and <code>ALERT IF</code>. The parser reports errors with line and column;
        the interpreter executes the program step by step, with pause/resume/step playback.
        The editor ships presets such as <code>patrol_alpha</code> to start from.
      </>
    ),
  },
  {
    q: "Does the AI drive the robot?",
    a: (
      <>
        Never. The LLM is an optional plugin that can only <em>propose</em> mission DSL code from a
        plain-language request. The proposal is validated by the DSL parser before it can run —
        “AI proposes, the interpreter disposes”. Without an API key the compiler runs in mock mode,
        clearly labeled <code>MOCK</code> in the UI.
      </>
    ),
  },
  {
    q: "Where do the dashboard numbers come from?",
    a: (
      <>
        From real metric sources in the running simulation: mission clock, odometer, POI coverage,
        findings and alerts all read from interpreter state. No number on the dashboard is
        hard-coded or mocked. The inspection report cites mission event IDs for the same reason.
      </>
    ),
  },
  {
    q: "Which sensors are simulated?",
    a: (
      <>
        Thermal, visual and acoustic inspections, with seeded readings and threshold alerts such as{" "}
        <code>ALERT IF TEMP&gt;75</code>. Findings carry a severity (info / warn / critical) and
        appear in the event log as the mission executes.
      </>
    ),
  },
  {
    q: "Can it control a real robot?",
    a: (
      <>
        No. patrol-lab is a browser simulation of an inspection workflow — there is no connection
        to real hardware or a real fleet. It demonstrates the control-room experience, a
        deterministic mission interpreter and honest telemetry.
      </>
    ),
  },
  {
    q: "Does it work on my phone?",
    a: (
      <>
        The layout adapts below 900 px (viewport on top, editor below), but patrol-lab is designed
        as a desktop control room — a wide screen gives the intended experience.
      </>
    ),
  },
  {
    q: "Who built this?",
    a: (
      <>
        patrol-lab is an open portfolio project by Rico. The stack: Next.js (App Router), React
        Three Fiber, CodeMirror 6 and zustand, deployed on Vercel. The source is public on GitHub.
      </>
    ),
  },
];

export const metadata = {
  title: "FAQ · patrol-lab",
  description:
    "Frequently asked questions about patrol-lab — the browser simulation of an ANYmal C inspection robot, its mission DSL and its honest numbers.",
};

export default function FaqPage() {
  return (
    <PageShell active="faq">
      <article className="doc">
        <p className="doc-kicker">PATROL-LAB · FAQ</p>
        <h1 className="doc-title">Frequently asked questions</h1>
        <p className="doc-intro">
          Short answers about what patrol-lab is, what is (and is not) simulated, and where every
          number comes from. Deeper, more technical questions live on the{" "}
          <Link href="/qa">Q&amp;A page</Link>.
        </p>
        <div className="faq-list" data-testid="faq-list">
          {FAQS.map((f) => (
            <details key={f.q} className="faq-item">
              <summary>{f.q}</summary>
              <div className="faq-answer">{f.a}</div>
            </details>
          ))}
        </div>
        <p className="doc-crosslink">
          More technical detail? Read the <Link href="/qa">Q&amp;A</Link> — or go back to{" "}
          <Link href="/">mission control</Link>.
        </p>
      </article>
    </PageShell>
  );
}
