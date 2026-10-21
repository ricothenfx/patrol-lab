import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";

export type QaTag = "simulation" | "dsl" | "determinism" | "llm" | "assets" | "testing" | "planning" | "honesty";

export type QaEntry = {
  id: string;
  tags: QaTag[];
  q: string;
  a: React.ReactNode;
};

export type QaPageContent = {
  title: string;
  intro: React.ReactNode;
  crosslink: React.ReactNode;
};

/* ------------------------------------------------------------------ de */

const deEntries: QaEntry[] = [
  {
    id: "kinematic-vs-dynamics",
    tags: ["simulation", "honesty"],
    q: "Warum ist der Gang kinematisch statt eine Dynamiksimulation?",
    a: (
      <>
        Das Perf-Budget sind 60 fps auf einem Laptop mit integrierter GPU, und die gesamte Simulation
        läuft client-seitig. Eine MuJoCo-Dynamikschleife im Browser über der three.js-Renderloop
        sprengt dieses Budget — daher ein kinematischer Trab mit Heading-Regelung. Der Trade-off wird
        in der UI genannt (<code>KINEMATIC</code>, standardmäßig aktiv; <code>DYNAMICS (BETA)</code> schaltet die MuJoCo-WASM-Physik dazu), nicht versteckt — Ehrlichkeit statt Hype.
      </>
    ),
  },
  {
    id: "fixed-timestep",
    tags: ["simulation", "determinism"],
    q: "Wie hält der Interpreter die Läufe reproduzierbar?",
    a: (
      <>
        Der MissionRunner interpretiert die DSL mit fester 120-Hz-Schrittweite und einem geseedeten
        RNG für Sensorbefunde. Nichts liest die Wanduhr oder das Request-Timing — eine Mission mit
        demselben Seed liefert dieselben Anweisungen, Messwerte, Alarme und dasselbe DONE-Ereignis:
        in dev, in e2e und auf der deployten Seite.
      </>
    ),
  },
  {
    id: "dsl-limits",
    tags: ["dsl"],
    q: "Was kann die Mission-DSL heute ausdrücken?",
    a: (
      <>
        <code>MISSION</code>/<code>END</code>, <code>GOTO</code> (mit optionalem <code>SPEED</code>),{" "}
        <code>INSPECT</code> mit Sensor-Atom (<code>THERMAL</code>, <code>VISUAL</code>,{" "}
        <code>ACOUSTIC</code>) und optionalen <code>ALERT IF</code>-Schwellen (<code>TEMP</code>,{" "}
        <code>GAS</code>, <code>VIBRATION</code>), dazu <code>WAIT</code> und ein globales{" "}
        <code>SPEED</code>. Vor jedem <code>INSPECT</code> positioniert der Roboter implizit am POI
        neu. Parse-Fehler tragen Zeile und Spalte und erscheinen im Lint-Gutter des Editors.
      </>
    ),
  },
  {
    id: "llm-boundary",
    tags: ["llm", "honesty"],
    q: "Wo genau liegt die Grenze des LLM?",
    a: (
      <>
        Zwei zustandslose API-Routen: <code>/api/llm/compile</code> (natürliche Sprache →
        Mission-DSL) und <code>/api/llm/report</code> (faktenbasierter Bericht aus dem Missionslog).
        Die Compiler-Ausgabe muss den DSL-Parser passieren; ein begrenzter Retry füttert
        Parser-Fehler zurück ins Modell. Scheitert das, sehen Sie die Fehler — das LLM erhält nie
        einen Ausführungspfad am Interpreter vorbei.
      </>
    ),
  },
  {
    id: "mock-mode",
    tags: ["llm"],
    q: "Was passiert ohne einen OPENAI_API_KEY?",
    a: (
      <>
        Die App bleibt voll funktionsfähig. <code>MOCK_MODE</code> liefert regelbasierte Artefakte:
        Der Compiler erzeugt eine Template-Mission, der Report-Writer fasst das echte Missionslog
        zusammen. Beide sind in der UI gekennzeichnet (<code>MOCK</code>, <code>RULE-BASED</code>),
        damit eine Mock-Ausgabe nie für eine Modellausgabe gehalten wird.
      </>
    ),
  },
  {
    id: "report-grounding",
    tags: ["llm", "honesty"],
    q: "Wie vermeidet der Prüfbericht erfundene Zahlen?",
    a: (
      <>
        Der Report-Prompt ist faktenbasiert: Er erhält das tatsächliche Missionsereignislog und muss
        striktes JSON dazu zurückgeben. Die UI rendert Zusammenfassung und Empfehlungen aus diesem
        Vertrag, und die im Bericht zitierten Ereignis-IDs mapen auf das Live-Ereignislog — jede
        Behauptung im Bericht ist gegen den Lauf prüfbar.
      </>
    ),
  },
  {
    id: "rig-baking",
    tags: ["assets"],
    q: "Wie wird das MuJoCo-Modell zu einem three.js-Roboter?",
    a: (
      <>
        <code>scripts/bake_rig.py</code> (uv + mujoco) backt die MJCF in <code>rig.json</code>,
        inklusive per-Mesh-Schwerpunkt-Offsets — alle 24 Meshes sind ungleich null, rohe
        XML-Platzierung würde driften. Zur Laufzeit baut das Rig 13 Bodies, 12 Hinge-Joints und 50
        visuelle Geoms unter einer three-space-<code>holder</code>-Gruppe, die das MJCF-Frame
        korrigiert (ein Regressionsspec bewacht dieses Quaternion).
      </>
    ),
  },
  {
    id: "asset-size",
    tags: ["assets"],
    q: "Wie bleiben ~16 MB Roboter-Assets außerhalb des kritischen Pfads?",
    a: (
      <>
        Texturen wurden nach einem Cold-Start-Frame-Rate-Flake auf 512 px herunterskaliert
        (12 MB → 1,3 MB), die Szene lädt hinter einer sichtbaren Fortschrittsleiste (Asset-Zähler +
        Prozent), und die UI blockiert nie auf dem Download. Die schweren Meshes streamen asynchron,
        während die Konsole bereits interaktiv ist.
      </>
    ),
  },
  {
    id: "planner-deferral",
    tags: ["planning"],
    q: "Warum gibt es keinen A*-Pfadplaner?",
    a: (
      <>
        Der Anlagen-Graph hat derzeit keine Hindernisse — gerade Verbindungen zwischen POIs sind
        bereits optimal. Ein A* würde Code hinzufügen, ohne das Verhalten zu ändern. Die
        Zurückstellung ist im Roadmap vermerkt: sie wird geprüft, sobald die Anlage No-Go-Zonen
        bekommt, nicht früher.
      </>
    ),
  },
  {
    id: "camera",
    tags: ["simulation"],
    q: "Wie unterscheiden sich Follow- und Orbit-Kamera?",
    a: (
      <>
        Follow ist der Standard: exponentielle Glättung mit Delta-Tracking und Ideal-Framing-Drift,
        plus Abstell-Offsets neben dem POI während Inspektionen. Orbit übergibt an OrbitControls und
        ist gesperrt, während sich der Roboter bewegt. Der Toggle im Viewport-Badge schaltet jederzeit um.
      </>
    ),
  },
  {
    id: "e2e-coverage",
    tags: ["testing"],
    q: "Was behaupten die Playwright-Suiten konkret?",
    a: (
      <>
        Vier Specs: smoke (Robot lädt, 12 Joints, &gt;5k Tris, keine Seitenfehler), mission (Goldene
        Mission erreicht DONE mit 10/10 Statements und 4 Feststellungen, Parse-Fehler werden
        abgewiesen, Step-Modus rückt zeilenweise vor), orientation (Quaternion-Probe für das
        holder-Frame) und llm (Mock-Compile → Accept → Run → Report end-to-end).
      </>
    ),
  },
  {
    id: "determinism-e2e",
    tags: ["determinism", "testing"],
    q: "Wie hilft der Determinismus den Tests?",
    a: (
      <>
        Weil gleicher Seed ⇒ gleicher Lauf, kann e2e exakte Ergebnisse behaupten: Die goldene Mission
        endet jedes Mal DONE mit exakt 10/10 Statements und 4 Feststellungen. Ein Flake in diesen
        Specs bedeutet eine echte Regression, kein Simulator-Rauschen — genau das ist der Punkt
        deterministischer Simulation.
      </>
    ),
  },
  {
    id: "metrics-sources",
    tags: ["honesty"],
    q: "Wie prüfe ich, ob eine Dashboard-Zahl echt ist?",
    a: (
      <>
        Jedes KPI liest den Interpreter-Zustand über den zustand-Store: Missionszeit und Odometrie
        vom Runner, POI-Abdeckung aus dem POI-Register, Feststellungen und Alarme aus dem
        Ereignislog, Seed aus der Lauf-Konfiguration. Der Debug-Hook <code>window.__patrol</code>{" "}
        legt frames/tris/joints/mode genau für solche Prüfungen offen.
      </>
    ),
  },
  {
    id: "status-language",
    tags: ["honesty", "dsl"],
    q: "Was bedeutet der Status-Wortschatz?",
    a: (
      <>
        <code>IDLE</code> (keine Mission geladen), <code>EXECUTING</code>/<code>INSPECTING</code>{" "}
        (Interpreter mitten im Statement / mitten im Scan), <code>PAUSED</code> (an einer Zeile
        angehalten), <code>DONE</code> (alle Statements ausgeführt), <code>FAULT</code>{" "}
        (Laufzeitfehler). Dieselben Wörter erscheinen im Status-Tag, im Ereignislog und im Bericht —
        der Status-Sprachgebrauch bleibt im gesamten Kontrollraum konsistent.
      </>
    ),
  },
];

const dePage: QaPageContent = {
  title: "Technische Fragen & Antworten",
  intro: (
    <>
      Wie Simulation, Missions-DSL, Determinismus und LLM-Plugins wirklich funktionieren —
      durchsuchbar und per Tag filterbar. Fragen auf Produktebene finden Sie im{" "}
      <Link href="/faq">FAQ</Link>.
    </>
  ),
  crosslink: (
    <>
      Auf der Suche nach den Grundlagen? Lesen Sie das <Link href="/faq">FAQ</Link> — oder zurück
      zur <Link href="/">Missionskontrolle</Link>.
    </>
  ),
};

/* ------------------------------------------------------------------ en */

const enEntries: QaEntry[] = [
  {
    id: "kinematic-vs-dynamics",
    tags: ["simulation", "honesty"],
    q: "Why is the gait kinematic instead of a dynamics simulation?",
    a: (
      <>
        The perf budget is 60 fps on an integrated-GPU laptop, and the whole simulation runs
        client-side. A browser MuJoCo dynamics loop on top of the three.js render loop is outside
        that budget, so locomotion is a kinematic trot with heading control. The trade-off is stated
        in the UI (<code>KINEMATIC</code> by default; <code>DYNAMICS (BETA)</code> switches on the MuJoCo WASM physics) instead of hidden — honesty over hype.
      </>
    ),
  },
  {
    id: "fixed-timestep",
    tags: ["simulation", "determinism"],
    q: "How does the interpreter keep runs reproducible?",
    a: (
      <>
        The MissionRunner interprets the DSL on a fixed 120 Hz timestep with a seeded RNG for
        sensor findings. Nothing reads wall-clock time or request timing, so a mission with the
        same seed produces the same statements, readings, alerts and DONE event — in dev, in e2e,
        and on the deployed site.
      </>
    ),
  },
  {
    id: "dsl-limits",
    tags: ["dsl"],
    q: "What can the mission DSL express today?",
    a: (
      <>
        <code>MISSION</code>/<code>END</code>, <code>GOTO</code> (with optional <code>SPEED</code>),{" "}
        <code>INSPECT</code> with a sensor atom (<code>THERMAL</code>, <code>VISUAL</code>,{" "}
        <code>ACOUSTIC</code>) and optional <code>ALERT IF</code> thresholds (<code>TEMP</code>,{" "}
        <code>GAS</code>, <code>VIBRATION</code>), plus <code>WAIT</code> and a global{" "}
        <code>SPEED</code>. Before each <code>INSPECT</code> the robot implicitly repositions to the
        POI. Parse errors carry line and column, surfaced in the editor&apos;s lint gutter.
      </>
    ),
  },
  {
    id: "llm-boundary",
    tags: ["llm", "honesty"],
    q: "Where exactly is the LLM's boundary?",
    a: (
      <>
        Two stateless API routes: <code>/api/llm/compile</code> (natural language → mission DSL)
        and <code>/api/llm/report</code> (grounded report from the mission log). The compiler&apos;s
        output must pass the DSL parser; a bounded retry feeds parser errors back to the model. If
        it still fails, you see the errors — the LLM never gets an execution path around the
        interpreter.
      </>
    ),
  },
  {
    id: "mock-mode",
    tags: ["llm"],
    q: "What happens without an OPENAI_API_KEY?",
    a: (
      <>
        The app is fully functional. <code>MOCK_MODE</code> supplies rule-based artifacts: the
        compiler emits a template mission and the report writer summarizes the real mission log.
        Both are labeled in the UI (<code>MOCK</code>, <code>RULE-BASED</code>) so a mock output is
        never mistaken for a model output.
      </>
    ),
  },
  {
    id: "report-grounding",
    tags: ["llm", "honesty"],
    q: "How does the inspection report avoid made-up numbers?",
    a: (
      <>
        The report prompt is grounded: it receives the actual mission event log and must return
        strict JSON summarizing it. The UI renders the summary and recommendations from that
        contract, and the event IDs cited in the report map back to the live event log — so every
        claim in a report is checkable against the run.
      </>
    ),
  },
  {
    id: "rig-baking",
    tags: ["assets"],
    q: "How does the MuJoCo model become a three.js robot?",
    a: (
      <>
        <code>scripts/bake_rig.py</code> (uv + mujoco) bakes the MJCF into <code>rig.json</code>,
        including per-mesh center-of-mass offsets — all 24 meshes are non-zero, so raw XML
        placement would drift. At runtime the rig builds 13 bodies, 12 hinge joints and 50 visual
        geoms under a three-space <code>holder</code> group that corrects the MJCF frame (a
        regression spec guards that quaternion).
      </>
    ),
  },
  {
    id: "asset-size",
    tags: ["assets"],
    q: "How do ~16 MB of robot assets stay off the critical path?",
    a: (
      <>
        Textures are downscaled to 512 px (12 MB → 1.3 MB) after a cold-start frame-rate flake, the
        scene loads behind a visible progress bar (asset counter + percentage), and the UI never
        blocks on the download. The heavy meshes stream async while the console shell is already
        interactive.
      </>
    ),
  },
  {
    id: "planner-deferral",
    tags: ["planning"],
    q: "Why is there no A* path planner?",
    a: (
      <>
        The site graph currently has no obstacles, so straight legs between POIs are already
        optimal — an A* would add code without changing behavior. The deferral is recorded in the
        roadmap: it gets revisited when the site gains no-go zones, not before.
      </>
    ),
  },
  {
    id: "camera",
    tags: ["simulation"],
    q: "How do the follow and orbit cameras differ?",
    a: (
      <>
        Follow is the default: exponential smoothing with delta-tracking and an ideal-framing
        drift, plus park-beside-POI approach offsets during inspections. Orbit hands control to
        OrbitControls and is gated while the robot moves. The toggle in the viewport badge switches
        modes at any time.
      </>
    ),
  },
  {
    id: "e2e-coverage",
    tags: ["testing"],
    q: "What do the Playwright suites actually assert?",
    a: (
      <>
        Four specs: smoke (robot loads, 12 joints, &gt;5k tris, no page errors), mission (golden
        mission completes DONE 10/10 statements with 4 findings, parse errors are refused, step
        mode advances one line at a time), orientation (a quaternion probe guarding the holder
        frame), and llm (mock compile → accept → run → report end to end).
      </>
    ),
  },
  {
    id: "determinism-e2e",
    tags: ["determinism", "testing"],
    q: "How does determinism help the tests?",
    a: (
      <>
        Because same seed ⇒ same run, e2e can assert exact outcomes: the golden mission finishes
        DONE with exactly 10/10 statements and 4 findings, every time. A flake in those specs means
        a real regression, not simulator noise — which is the point of deterministic simulation.
      </>
    ),
  },
  {
    id: "metrics-sources",
    tags: ["honesty"],
    q: "How do I verify a dashboard number is real?",
    a: (
      <>
        Every KPI reads from interpreter state exposed through the zustand store: mission clock and
        odometer from the runner, POI coverage from the POI registry, findings and alerts from the
        event log, seed from the run config. The debug hook <code>window.__patrol</code> exposes
        frames/tris/joints/mode for exactly this kind of checking.
      </>
    ),
  },
  {
    id: "status-language",
    tags: ["honesty", "dsl"],
    q: "What does the status vocabulary mean?",
    a: (
      <>
        <code>IDLE</code> (no mission loaded), <code>EXECUTING</code>/<code>INSPECTING</code>{" "}
        (interpreter mid-statement / mid-scan), <code>PAUSED</code> (held at a line),{" "}
        <code>DONE</code> (all statements executed), <code>FAULT</code> (runtime error). The same
        words appear in the pill, the event log and the report, so status language is consistent
        across the console.
      </>
    ),
  },
];

const enPage: QaPageContent = {
  title: "Technical questions & answers",
  intro: (
    <>
      How the simulation, mission DSL, determinism and LLM plugins actually work — searchable
      and filterable by tag. For product-level questions, see the <Link href="/faq">FAQ</Link>.
    </>
  ),
  crosslink: (
    <>
      Looking for the basics? Read the <Link href="/faq">FAQ</Link> — or go back to{" "}
      <Link href="/">mission control</Link>.
    </>
  ),
};

/* ------------------------------------------------------------------ zh */

const zhEntries: QaEntry[] = [
  {
    id: "kinematic-vs-dynamics",
    tags: ["simulation", "honesty"],
    q: "为什么步态是运动学的而不是动力学仿真？",
    a: (
      <>
        性能预算是集成 GPU 笔记本上的 60 fps，而且整个仿真都在客户端运行。在 three.js
        渲染循环之上再跑浏览器端 MuJoCo 动力学循环超出了预算，因此运动采用带航向控制的运动学小跑。
        这一取舍在 UI 中明示（默认 <code>KINEMATIC</code>；<code>DYNAMICS (BETA)</code> 开启 MuJoco WASM 物理）而非隐藏——诚实优先于噱头。
      </>
    ),
  },
  {
    id: "fixed-timestep",
    tags: ["simulation", "determinism"],
    q: "解释器如何保证运行可复现？",
    a: (
      <>
        MissionRunner 以固定的 120 Hz 步长解释 DSL，并用带种子的随机数生成器产生传感器发现。
        任何东西都不读取真实时钟或请求计时，因此相同种子的任务会产出相同的语句、读数、告警和 DONE
        事件——无论在开发、e2e 还是线上站点。
      </>
    ),
  },
  {
    id: "dsl-limits",
    tags: ["dsl"],
    q: "任务 DSL 目前能表达什么？",
    a: (
      <>
        <code>MISSION</code>/<code>END</code>、<code>GOTO</code>（可选 <code>SPEED</code>）、带传感器原子（
        <code>THERMAL</code>、<code>VISUAL</code>、<code>ACOUSTIC</code>）和可选 <code>ALERT IF</code> 阈值（
        <code>TEMP</code>、<code>GAS</code>、<code>VIBRATION</code>）的 <code>INSPECT</code>，以及{" "}
        <code>WAIT</code> 和全局 <code>SPEED</code>。每次 <code>INSPECT</code>{" "}
        前机器人会隐式重新定位到 POI。解析错误带行号和列号，显示在编辑器的 lint 侧栏。
      </>
    ),
  },
  {
    id: "llm-boundary",
    tags: ["llm", "honesty"],
    q: "LLM 的边界到底在哪里？",
    a: (
      <>
        两个无状态 API 路由：<code>/api/llm/compile</code>（自然语言 → 任务 DSL）和{" "}
        <code>/api/llm/report</code>（基于任务日志的报告）。编译器的输出必须通过 DSL 解析器；
        有界重试会把解析错误回传给模型。如果仍然失败，你会看到错误——LLM
        永远无法绕过解释器获得执行路径。
      </>
    ),
  },
  {
    id: "mock-mode",
    tags: ["llm"],
    q: "没有 OPENAI_API_KEY 会怎样？",
    a: (
      <>
        应用功能完整。<code>MOCK_MODE</code> 提供基于规则的产物：编译器输出模板任务，报告生成器汇总真实的任务日志。
        两者都在 UI 中标注（<code>MOCK</code>、<code>RULE-BASED</code>
        ），确保模拟输出不会被误认为模型输出。
      </>
    ),
  },
  {
    id: "report-grounding",
    tags: ["llm", "honesty"],
    q: "巡检报告如何避免编造数字？",
    a: (
      <>
        报告提示词是有据可依的：它接收真实的任务事件日志，并且必须返回严格 JSON 来概括它。
        UI 按照该契约渲染摘要与建议，报告中引用的事件 ID 能对应到实时事件日志——报告中的每个论断都可对照本次运行核查。
      </>
    ),
  },
  {
    id: "rig-baking",
    tags: ["assets"],
    q: "MuJoCo 模型如何变成 three.js 机器人？",
    a: (
      <>
        <code>scripts/bake_rig.py</code>（uv + mujoco）把 MJCF 烘焙成 <code>rig.json</code>
        ，包含每个网格的质心偏移——24 个网格全部非零，直接用 XML 原始摆放会产生漂移。
        运行时，rig 在修正 MJCF 坐标系的三维空间 <code>holder</code>{" "}
        组下构建 13 个刚体、12 个铰链关节和 50 个可视化几何体（有回归规范守护该四元数）。
      </>
    ),
  },
  {
    id: "asset-size",
    tags: ["assets"],
    q: "约 16 MB 的机器人资源如何避免阻塞关键路径？",
    a: (
      <>
        在一次冷启动帧率抖动后，纹理被降采样到 512 px（12 MB → 1.3 MB），场景在可见的进度条后加载（资源计数 +
        百分比），UI 从不因下载而阻塞。重型网格异步流式加载，控制台外壳保持可交互。
      </>
    ),
  },
  {
    id: "planner-deferral",
    tags: ["planning"],
    q: "为什么没有 A* 路径规划器？",
    a: (
      <>
        当前站点图中没有障碍物，POI 之间的直线路径已经是最优的——A* 只会增加代码而不改变行为。
        推迟已在路线图中记录：等到站点引入禁行区时再重新评估，而不是之前。
      </>
    ),
  },
  {
    id: "camera",
    tags: ["simulation"],
    q: "跟随相机和环绕相机有何区别？",
    a: (
      <>
        跟随是默认模式：指数平滑的增量跟踪加理想取景漂移，巡检时还有停靠在 POI 旁的接近偏移。
        环绕将控制权交给 OrbitControls，且在机器人移动时被锁定。视口徽标中的开关可随时切换。
      </>
    ),
  },
  {
    id: "e2e-coverage",
    tags: ["testing"],
    q: "Playwright 套件究竟断言了什么？",
    a: (
      <>
        四个规范：smoke（机器人加载、12 个关节、&gt;5k 三角面、无页面错误）、mission（黄金任务以 10/10
        语句和 4 个发现达到 DONE，解析错误被拒绝，单步模式逐行推进）、orientation（守护 holder
        坐标系的四元数探针）和 llm（模拟编译 → 接受 → 运行 → 报告的端到端流程）。
      </>
    ),
  },
  {
    id: "determinism-e2e",
    tags: ["determinism", "testing"],
    q: "确定性如何帮助测试？",
    a: (
      <>
        因为相同种子 ⇒ 相同运行，e2e 可以断言精确结果：黄金任务每次都以恰好 10/10 语句和 4 个发现完成 DONE。
        这些规范中的抖动意味着真正的回归，而不是仿真器噪声——这正是确定性仿真的意义所在。
      </>
    ),
  },
  {
    id: "metrics-sources",
    tags: ["honesty"],
    q: "如何验证仪表板数字是真实的？",
    a: (
      <>
        每个 KPI 都从通过 zustand store 暴露的解释器状态读取：任务时钟和里程计来自 runner，POI
        覆盖来自 POI 注册表，发现和告警来自事件日志，种子来自运行配置。调试钩子{" "}
        <code>window.__patrol</code> 正是为此类核查暴露 frames/tris/joints/mode。
      </>
    ),
  },
  {
    id: "status-language",
    tags: ["honesty", "dsl"],
    q: "状态词汇表是什么意思？",
    a: (
      <>
        <code>IDLE</code>（未加载任务）、<code>EXECUTING</code>/<code>INSPECTING</code>
        （解释器处于语句中/扫描中）、<code>PAUSED</code>（停在某一行为）、<code>DONE</code>
        （所有语句已执行）、<code>FAULT</code>（运行时错误）。同样的词汇出现在状态徽标、事件日志和报告中，状态用语在整个控制台保持一致。
      </>
    ),
  },
];

const zhPage: QaPageContent = {
  title: "技术问答",
  intro: (
    <>
      仿真、任务 DSL、确定性与 LLM 插件的实际工作方式——支持搜索与按标签筛选。产品层面的问题请看{" "}
      <Link href="/faq">常见问题</Link>。
    </>
  ),
  crosslink: (
    <>
      想了解基础内容？阅读 <Link href="/faq">常见问题</Link> —— 或返回{" "}
      <Link href="/">任务控制台</Link>。
    </>
  ),
};

/* ------------------------------------------------------------------ es */

const esEntries: QaEntry[] = [
  {
    id: "kinematic-vs-dynamics",
    tags: ["simulation", "honesty"],
    q: "¿Por qué la marcha es cinemática y no una simulación de dinámica?",
    a: (
      <>
        El presupuesto de rendimiento es 60 fps en un portátil con GPU integrada, y toda la
        simulación corre en el cliente. Un bucle de dinámica MuJoCo en el navegador sobre el render
        loop de three.js excede ese presupuesto, así que la locomoción es un trote cinemático con
        control de rumbo. El compromiso se declara en la UI (<code>KINEMATIC</code> por defecto; <code>DYNAMICS (BETA)</code> activa la física MuJoCo WASM) en vez de
        ocultarse — honestidad antes que humo.
      </>
    ),
  },
  {
    id: "fixed-timestep",
    tags: ["simulation", "determinism"],
    q: "¿Cómo mantiene el intérprete la reproducibilidad de las ejecuciones?",
    a: (
      <>
        El MissionRunner interpreta el DSL a un paso fijo de 120 Hz con un RNG con semilla para los
        hallazgos del sensor. Nada lee el reloj ni el timing de peticiones, así que una misión con
        la misma semilla produce las mismas instrucciones, lecturas, alertas y evento DONE — en
        dev, en e2e y en el sitio desplegado.
      </>
    ),
  },
  {
    id: "dsl-limits",
    tags: ["dsl"],
    q: "¿Qué puede expresar hoy el DSL de misión?",
    a: (
      <>
        <code>MISSION</code>/<code>END</code>, <code>GOTO</code> (con <code>SPEED</code> opcional),{" "}
        <code>INSPECT</code> con un átomo de sensor (<code>THERMAL</code>, <code>VISUAL</code>,{" "}
        <code>ACOUSTIC</code>) y umbrales opcionales <code>ALERT IF</code> (<code>TEMP</code>,{" "}
        <code>GAS</code>, <code>VIBRATION</code>), además de <code>WAIT</code> y un{" "}
        <code>SPEED</code> global. Antes de cada <code>INSPECT</code> el robot se reposiciona
        implícitamente en el POI. Los errores de parser llevan línea y columna, visibles en el
        gutter de lint del editor.
      </>
    ),
  },
  {
    id: "llm-boundary",
    tags: ["llm", "honesty"],
    q: "¿Dónde está exactamente el límite del LLM?",
    a: (
      <>
        Dos rutas de API sin estado: <code>/api/llm/compile</code> (lenguaje natural → DSL de
        misión) y <code>/api/llm/report</code> (informe fundamentado a partir del registro de
        misión). La salida del compilador debe pasar el parser de DSL; un reintento acotado devuelve
        los errores del parser al modelo. Si aún falla, ves los errores — el LLM nunca obtiene una
        vía de ejecución que esquive al intérprete.
      </>
    ),
  },
  {
    id: "mock-mode",
    tags: ["llm"],
    q: "¿Qué pasa sin un OPENAI_API_KEY?",
    a: (
      <>
        La app sigue siendo plenamente funcional. <code>MOCK_MODE</code> suministra artefactos
        basados en reglas: el compilador emite una misión plantilla y el escritor de informes
        resume el registro real de la misión. Ambos se etiquetan en la UI (<code>MOCK</code>,{" "}
        <code>RULE-BASED</code>) para que una salida mock nunca se confunda con una del modelo.
      </>
    ),
  },
  {
    id: "report-grounding",
    tags: ["llm", "honesty"],
    q: "¿Cómo evita el informe de inspección números inventados?",
    a: (
      <>
        El prompt del informe está fundamentado: recibe el registro real de eventos de la misión y
        debe devolver JSON estricto que lo resuma. La UI renderiza el resumen y las recomendaciones
        desde ese contrato, y los IDs de eventos citados se corresponden con el registro en vivo —
        cada afirmación del informe es verificable contra la ejecución.
      </>
    ),
  },
  {
    id: "rig-baking",
    tags: ["assets"],
    q: "¿Cómo se convierte el modelo MuJoCo en un robot de three.js?",
    a: (
      <>
        <code>scripts/bake_rig.py</code> (uv + mujoco) hornea la MJCF en <code>rig.json</code>,
        incluidos los offsets de centro de masa por malla — las 24 mallas son no nulas, así que la
        colocación XML cruda derivaría. En tiempo de ejecución el rig construye 13 cuerpos, 12
        uniones de bisagra y 50 geoms visuales bajo un grupo <code>holder</code> en espacio three
        que corrige el marco MJCF (un spec de regresión custodia ese cuaternión).
      </>
    ),
  },
  {
    id: "asset-size",
    tags: ["assets"],
    q: "¿Cómo se mantienen ~16 MB de recursos del robot fuera del camino crítico?",
    a: (
      <>
        Las texturas se redujeron a 512 px (12 MB → 1,3 MB) tras una fluctuación de frame-rate en
        arranque en frío, la escena carga tras una barra de progreso visible (contador de recursos
        + porcentaje) y la UI nunca se bloquea por la descarga. Las mallas pesadas llegan en
        streaming asíncrono mientras la consola ya es interactiva.
      </>
    ),
  },
  {
    id: "planner-deferral",
    tags: ["planning"],
    q: "¿Por qué no hay un planificador de rutas A*?",
    a: (
      <>
        El grafo del sitio hoy no tiene obstáculos, así que los tramos rectos entre POIs ya son
        óptimos — un A* añadiría código sin cambiar el comportamiento. La postergación queda
        anotada en la hoja de ruta: se retomará cuando el sitio tenga zonas de exclusión, no antes.
      </>
    ),
  },
  {
    id: "camera",
    tags: ["simulation"],
    q: "¿En qué se diferencian las cámaras de seguimiento y órbita?",
    a: (
      <>
        Seguir es la opción por defecto: suavizado exponencial con delta-tracking y una deriva de
        encuadre ideal, más offsets de aparcamiento junto al POI durante las inspecciones. Órbita
        cede el control a OrbitControls y queda bloqueada mientras el robot se mueve. El interruptor
        en la insignia del visor cambia de modo en cualquier momento.
      </>
    ),
  },
  {
    id: "e2e-coverage",
    tags: ["testing"],
    q: "¿Qué afirman realmente las suites de Playwright?",
    a: (
      <>
        Cuatro specs: smoke (el robot carga, 12 uniones, &gt;5k tris, sin errores de página),
        mission (la misión dorada termina DONE con 10/10 instrucciones y 4 hallazgos, los errores de
        parseo se rechazan, el modo paso avanza línea a línea), orientation (una sonda de
        cuaterniones que custodia el marco holder) y llm (compilación mock → aceptar → ejecutar →
        informe de punta a punta).
      </>
    ),
  },
  {
    id: "determinism-e2e",
    tags: ["determinism", "testing"],
    q: "¿Cómo ayuda el determinismo a las pruebas?",
    a: (
      <>
        Como misma semilla ⇒ misma ejecución, e2e puede afirmar resultados exactos: la misión dorada
        termina DONE con exactamente 10/10 instrucciones y 4 hallazgos, siempre. Un flake en esas
        specs es una regresión real, no ruido del simulador — de eso se trata la simulación
        determinista.
      </>
    ),
  },
  {
    id: "metrics-sources",
    tags: ["honesty"],
    q: "¿Cómo verifico que un número del panel es real?",
    a: (
      <>
        Cada KPI lee del estado del intérprete expuesto por el store de zustand: reloj de misión y
        odómetro del runner, cobertura de POI del registro de POIs, hallazgos y alertas del registro
        de eventos, semilla de la configuración de la ejecución. El hook de depuración{" "}
        <code>window.__patrol</code> expone frames/tris/joints/mode justo para este tipo de
        comprobaciones.
      </>
    ),
  },
  {
    id: "status-language",
    tags: ["honesty", "dsl"],
    q: "¿Qué significa el vocabulario de estados?",
    a: (
      <>
        <code>IDLE</code> (sin misión cargada), <code>EXECUTING</code>/<code>INSPECTING</code>{" "}
        (intérprete a mitad de instrucción / de escaneo), <code>PAUSED</code> (detenido en una
        línea), <code>DONE</code> (todas las instrucciones ejecutadas), <code>FAULT</code> (error en
        tiempo de ejecución). Las mismas palabras aparecen en la pastilla de estado, el registro de
        eventos y el informe, así el lenguaje de estado es consistente en toda la consola.
      </>
    ),
  },
];

const esPage: QaPageContent = {
  title: "Preguntas y respuestas técnicas",
  intro: (
    <>
      Cómo funcionan de verdad la simulación, el DSL de misión, el determinismo y los plugins LLM —
      con búsqueda y filtro por etiqueta. Para preguntas de producto, consulta las{" "}
      <Link href="/faq">FAQ</Link>.
    </>
  ),
  crosslink: (
    <>
      ¿Buscas lo básico? Lee las <Link href="/faq">FAQ</Link> — o vuelve al{" "}
      <Link href="/">control de misión</Link>.
    </>
  ),
};

/* -------------------------------------------------------------- registry */

/** Technical Q&A, grounded in the repo's docs and implementation. */
export const QA_CONTENT: Record<Locale, QaEntry[]> = {
  de: deEntries,
  en: enEntries,
  zh: zhEntries,
  es: esEntries,
};

export const QA_PAGE: Record<Locale, QaPageContent> = {
  de: dePage,
  en: enPage,
  zh: zhPage,
  es: esPage,
};

export const QA_TAGS: QaTag[] = [
  "simulation",
  "dsl",
  "determinism",
  "llm",
  "assets",
  "planning",
  "testing",
  "honesty",
];

/** Filter-tag labels follow the UI locale; tag ids stay canonical (protocol). */
export const QA_TAG_LABELS: Record<Locale, Record<QaTag, string>> = {
  de: {
    simulation: "Simulation",
    dsl: "DSL",
    determinism: "Determinismus",
    llm: "LLM",
    assets: "Assets",
    planning: "Planung",
    testing: "Tests",
    honesty: "Transparenz",
  },
  en: {
    simulation: "simulation",
    dsl: "dsl",
    determinism: "determinism",
    llm: "llm",
    assets: "assets",
    planning: "planning",
    testing: "testing",
    honesty: "honesty",
  },
  zh: {
    simulation: "仿真",
    dsl: "DSL",
    determinism: "确定性",
    llm: "LLM",
    assets: "资产",
    planning: "规划",
    testing: "测试",
    honesty: "诚实原则",
  },
  es: {
    simulation: "simulación",
    dsl: "DSL",
    determinism: "determinismo",
    llm: "LLM",
    assets: "recursos",
    planning: "planificación",
    testing: "pruebas",
    honesty: "honestidad",
  },
};
