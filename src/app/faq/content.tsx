import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";

export type FaqItem = { q: string; a: React.ReactNode };

export type FaqPageContent = {
  title: string;
  intro: React.ReactNode;
  crosslink: React.ReactNode;
  items: FaqItem[];
};

const de: FaqPageContent = {
  title: "Häufig gestellte Fragen",
  intro: (
    <>
      Kurze Antworten dazu, was patrol-lab ist, was (und was nicht) simuliert wird und woher jede
      Zahl stammt. Tiefergehende, technischere Fragen finden Sie auf der{" "}
      <Link href="/qa">Q&amp;A-Seite</Link>.
    </>
  ),
  crosslink: (
    <>
      Mehr technisches Detail? Lesen Sie das <Link href="/qa">Q&amp;A</Link> — oder zurück zur{" "}
      <Link href="/">Missionskontrolle</Link>.
    </>
  ),
  items: [
    {
      q: "Was ist patrol-lab?",
      a: (
        <>
          Missionskontrolle für autonome Inspektionsroboter. Links schreiben Sie ein Missionsskript
          und rechts sehen Sie, wie ein ANYmal-C-Quadruped es auf einer live 3D-Industrieanlage
          ausführt — mit Missionstelemetrie, POI-Abdeckung, Feststellungen und Alarmen auf dem
          Dashboard. Alles läuft deterministisch in Ihrem Browser.
        </>
      ),
    },
    {
      q: "Ist das Software von ANYbotics?",
      a: (
        <>
          Nein. patrol-lab ist ein unabhängiges Portfolio-Projekt und steht in keiner Verbindung zur
          ANYbotics AG. Das ANYmal-C-Robotermodell stammt aus{" "}
          <a href="https://github.com/google-deepmind/mujoco_menagerie" target="_blank" rel="noreferrer">
            MuJoCo Menagerie
          </a>{" "}
          (<code>anybotics_anymal_c</code>, BSD-3-Clause), mit Quellenangabe eingebunden.
        </>
      ),
    },
    {
      q: "Ist das echte Physik?",
      a: (
        <>
          Nein — und die UI sagt es ehrlich: Das Modus-Tag zeigt <code>KINEMATIC</code> — und per Klick gibt es <code>DYNAMICS (BETA)</code> mit echter MuJoCo-WASM-Physik. Der
          Roboter läuft in einem kinematischen Trabgang mit Heading-Regelung, angetrieben von einem
          Missionsinterpreter mit fester Schrittweite (120 Hz). Im Browser läuft keine
          Dynamik-Engine.
        </>
      ),
    },
    {
      q: "Ändern sich die Ergebnisse zwischen Läufen?",
      a: (
        <>
          Nicht bei gleichem Seed. Die Simulation ist deterministisch: ein geseedeter RNG erzeugt die
          Sensorbefunde, der Interpreter läuft mit fester Schrittweite, und nichts hängt an der
          Wanduhr. Gleicher Seed und Preset ergeben exakt dieselbe Mission, dieselben Messwerte und
          Alarme.
        </>
      ),
    },
    {
      q: "Was ist die Missionsskriptsprache?",
      a: (
        <>
          Eine kleine DSL: <code>MISSION</code>, <code>GOTO</code>, <code>INSPECT</code>,{" "}
          <code>WAIT</code>, <code>SPEED</code> und <code>ALERT IF</code>. Der Parser meldet Fehler
          mit Zeile und Spalte; der Interpreter führt das Programm Schritt für Schritt aus, mit
          Pause/Fortsetzen/Einzelschritt. Der Editor bringt Presets wie <code>patrol_alpha</code>
          mit.
        </>
      ),
    },
    {
      q: "Steuert die KI den Roboter?",
      a: (
        <>
          Nie. Das LLM ist ein optionales Plugin, das aus einer natürlichsprachigen Anfrage nur{" "}
          <em>vorschlagen</em> kann. Der Vorschlag wird vom DSL-Parser geprüft, bevor er laufen darf —
          „die KI schlägt vor, der Interpreter verfügt“. Ohne API-Key läuft der Compiler im
          Mock-Modus, klar als <code>MOCK</code> gekennzeichnet.
        </>
      ),
    },
    {
      q: "Woher kommen die Zahlen im Dashboard?",
      a: (
        <>
          Aus echten Metrikquellen der laufenden Simulation: Missionszeit, Odometrie, POI-Abdeckung,
          Feststellungen und Alarme lesen alle den Interpreter-Zustand. Keine Zahl im Dashboard ist
          hart codiert oder gemockt. Der Prüfbericht zitiert aus demselben Grund
          Missionsereignis-IDs.
        </>
      ),
    },
    {
      q: "Welche Sensoren werden simuliert?",
      a: (
        <>
          Thermische, visuelle und akustische Inspektionen, mit geseedeten Messwerten und
          Schwellenwert-Alarmen wie <code>ALERT IF TEMP&gt;75</code>. Feststellungen tragen einen
          Schweregrad (info / warn / critical) und erscheinen im Ereignislog, während die Mission
          läuft.
        </>
      ),
    },
    {
      q: "Kann es einen echten Roboter steuern?",
      a: (
        <>
          Nein. patrol-lab ist eine Browser-Simulation eines Inspektions-Workflows — es gibt keine
          Verbindung zu echter Hardware oder einer echten Flotte. Es demonstriert das
          Kontrollraum-Erlebnis, einen deterministischen Missionsinterpreter und ehrliche Telemetrie.
        </>
      ),
    },
    {
      q: "Funktioniert es auf dem Smartphone?",
      a: (
        <>
          Das Layout passt sich unter 900 px an (Viewport oben, Editor unten), aber patrol-lab ist
          als Desktop-Kontrollraum konzipiert — ein breiter Bildschirm liefert das beabsichtigte
          Erlebnis.
        </>
      ),
    },
    {
      q: "Wer hat das gebaut?",
      a: (
        <>
          patrol-lab ist ein offenes Portfolio-Projekt von Rico. Der Stack: Next.js (App Router),
          React Three Fiber, CodeMirror 6 und zustand, deployed auf Vercel. Der Quellcode ist
          öffentlich auf GitHub.
        </>
      ),
    },
  ],
};

const en: FaqPageContent = {
  title: "Frequently asked questions",
  intro: (
    <>
      Short answers about what patrol-lab is, what is (and is not) simulated, and where every number
      comes from. Deeper, more technical questions live on the <Link href="/qa">Q&amp;A page</Link>.
    </>
  ),
  crosslink: (
    <>
      More technical detail? Read the <Link href="/qa">Q&amp;A</Link> — or go back to{" "}
      <Link href="/">mission control</Link>.
    </>
  ),
  items: [
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
          No — and the UI says so truthfully: the mode badge reads <code>KINEMATIC</code> — and one click switches to <code>DYNAMICS (BETA)</code> with real MuJoCo WASM physics. The
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
  ],
};

const zh: FaqPageContent = {
  title: "常见问题",
  intro: (
    <>
      关于 patrol-lab 是什么、哪些内容（和哪些内容不）是仿真的、以及每个数字来自哪里——这里都有简短回答。
      更深入的技术问题请看 <Link href="/qa">问答页</Link>。
    </>
  ),
  crosslink: (
    <>
      想看更多技术细节？阅读 <Link href="/qa">问答</Link> —— 或返回{" "}
      <Link href="/">任务控制台</Link>。
    </>
  ),
  items: [
    {
      q: "patrol-lab 是什么？",
      a: (
        <>
          自主巡检机器人的任务控制台。你在左侧编写任务脚本，在右侧观看 ANYmal C
          四足机器人在实时 3D 工业场景中执行——仪表板上显示任务遥测、POI
          覆盖、发现与告警。一切都在你的浏览器中确定性运行。
        </>
      ),
    },
    {
      q: "这是 ANYbotics 的软件吗？",
      a: (
        <>
          不是。patrol-lab 是独立的个人作品集项目，与 ANYbotics AG
          无任何关联。ANYmal C 机器人模型来自{" "}
          <a href="https://github.com/google-deepmind/mujoco_menagerie" target="_blank" rel="noreferrer">
            MuJoCo Menagerie
          </a>{" "}
          （<code>anybotics_anymal_c</code>，BSD-3-Clause），已注明出处引入。
        </>
      ),
    },
    {
      q: "这是真实物理吗？",
      a: (
        <>
          不是——UI 如实说明：模式徽标显示 <code>KINEMATIC</code>——一键切换到 <code>DYNAMICS (BETA)</code>，运行真实的 MuJoCo WASM 物理
          。机器人以带航向控制的运动学小跑步态移动，由固定步长（120 Hz）的任务解释器驱动。浏览器中不运行动力学引擎。
        </>
      ),
    },
    {
      q: "每次运行的结果会变化吗？",
      a: (
        <>
          相同种子下不会。仿真是确定性的：带种子的随机数生成器产生传感器发现，解释器以固定步长运行，任何东西都不依赖真实时钟。
          选择相同的种子和预设，就会得到完全相同的任务、读数和告警。
        </>
      ),
    },
    {
      q: "任务脚本语言是什么？",
      a: (
        <>
          一个小型 DSL：<code>MISSION</code>、<code>GOTO</code>、<code>INSPECT</code>、{" "}
          <code>WAIT</code>、<code>SPEED</code> 和 <code>ALERT IF</code>
          。解析器会报告带行号和列号的错误；解释器逐条执行程序，支持暂停/继续/单步。编辑器自带{" "}
          <code>patrol_alpha</code> 等预设。
        </>
      ),
    },
    {
      q: "AI 会驾驶机器人吗？",
      a: (
        <>
          绝不会。LLM 是可选插件，只能根据自然语言请求<em>提议</em>任务 DSL 代码。
          提议必须先通过 DSL 解析器校验才能运行——“AI 提议，解释器裁决”。
          没有 API 密钥时，编译器以模拟模式运行，并在 UI 中明确标注 <code>MOCK</code>。
        </>
      ),
    },
    {
      q: "仪表板上的数字来自哪里？",
      a: (
        <>
          来自运行中仿真的真实指标源：任务时钟、里程计、POI
          覆盖、发现和告警都读取解释器状态。仪表板上没有任何数字是硬编码或伪造的。
          巡检报告引用任务事件 ID 也是出于同样原因。
        </>
      ),
    },
    {
      q: "模拟了哪些传感器？",
      a: (
        <>
          热成像、视觉和声学巡检，带种子的读数和阈值告警（如 <code>ALERT IF TEMP&gt;75</code>
          ）。发现带有严重级别（info / warn / critical），并随任务执行出现在事件日志中。
        </>
      ),
    },
    {
      q: "它能控制真实机器人吗？",
      a: (
        <>
          不能。patrol-lab 是巡检工作流的浏览器仿真——与真实硬件或真实机队没有任何连接。
          它展示的是控制室体验、确定性任务解释器和诚实的遥测数据。
        </>
      ),
    },
    {
      q: "它能在手机上运行吗？",
      a: (
        <>
          布局在 900 px 以下会自适应（视口在上、编辑器在下），但 patrol-lab
          是为桌面控制室设计的——宽屏才能获得预期体验。
        </>
      ),
    },
    {
      q: "这是谁做的？",
      a: (
        <>
          patrol-lab 是 Rico 的公开作品集项目。技术栈：Next.js（App Router）、React Three Fiber、
          CodeMirror 6 和 zustand，部署在 Vercel 上。源代码公开在 GitHub。
        </>
      ),
    },
  ],
};

const es: FaqPageContent = {
  title: "Preguntas frecuentes",
  intro: (
    <>
      Respuestas breves sobre qué es patrol-lab, qué se simula (y qué no) y de dónde sale cada
      número. Las preguntas más profundas y técnicas están en la{" "}
      <Link href="/qa">página de Q&amp;A</Link>.
    </>
  ),
  crosslink: (
    <>
      ¿Más detalle técnico? Lee las <Link href="/qa">Q&amp;A</Link> — o vuelve al{" "}
      <Link href="/">control de misión</Link>.
    </>
  ),
  items: [
    {
      q: "¿Qué es patrol-lab?",
      a: (
        <>
          Control de misión para robots de inspección autónomos. Escribes un script de misión a la
          izquierda y ves a un cuadrúpedo ANYmal C ejecutarlo en una escena industrial 3D en vivo a
          la derecha — con telemetría de misión, cobertura de POI, hallazgos y alertas en el panel.
          Todo se ejecuta de forma determinista en tu navegador.
        </>
      ),
    },
    {
      q: "¿Es software de ANYbotics?",
      a: (
        <>
          No. patrol-lab es un proyecto de portafolio independiente y no está afiliado a ANYbotics
          AG. El modelo del robot ANYmal C proviene de{" "}
          <a href="https://github.com/google-deepmind/mujoco_menagerie" target="_blank" rel="noreferrer">
            MuJoCo Menagerie
          </a>{" "}
          (<code>anybotics_anymal_c</code>, BSD-3-Clause), incluido con la atribución
          correspondiente.
        </>
      ),
    },
    {
      q: "¿Es física real?",
      a: (
        <>
          No — y la UI lo dice con honestidad: la etiqueta de modo muestra <code>KINEMATIC</code> — y un clic cambia a <code>DYNAMICS (BETA)</code> con física real MuJoCo WASM.
          El robot sigue un trote cinemático con control de rumbo, impulsado por un intérprete de
          misión de paso fijo (120 Hz). No hay motor de dinámica en el navegador.
        </>
      ),
    },
    {
      q: "¿Cambian los resultados entre ejecuciones?",
      a: (
        <>
          No con la misma semilla. La simulación es determinista: un RNG con semilla produce los
          hallazgos del sensor, el intérprete corre a paso fijo y nada depende del reloj. Con la
          misma semilla y el mismo preset obtienes exactamente la misma misión, lecturas y alertas.
        </>
      ),
    },
    {
      q: "¿Cuál es el lenguaje de script de misión?",
      a: (
        <>
          Un DSL pequeño: <code>MISSION</code>, <code>GOTO</code>, <code>INSPECT</code>,{" "}
          <code>WAIT</code>, <code>SPEED</code> y <code>ALERT IF</code>. El parser informa errores
          con línea y columna; el intérprete ejecuta el programa paso a paso, con
          pausa/reanudar/paso a paso. El editor incluye presets como <code>patrol_alpha</code>.
        </>
      ),
    },
    {
      q: "¿La IA controla el robot?",
      a: (
        <>
          Nunca. El LLM es un plugin opcional que solo puede <em>proponer</em> código DSL de misión a
          partir de una petición en lenguaje natural. La propuesta se valida con el parser de DSL
          antes de poder ejecutarse — «la IA propone, el intérprete dispone». Sin clave de API, el
          compilador corre en modo mock, claramente etiquetado como <code>MOCK</code> en la UI.
        </>
      ),
    },
    {
      q: "¿De dónde salen los números del panel?",
      a: (
        <>
          De fuentes métricas reales de la simulación en curso: reloj de misión, odómetro, cobertura
          de POI, hallazgos y alertas leen del estado del intérprete. Ningún número del panel está
          hard-coded ni simulado. El informe de inspección cita IDs de eventos de misión por la misma
          razón.
        </>
      ),
    },
    {
      q: "¿Qué sensores se simulan?",
      a: (
        <>
          Inspecciones térmicas, visuales y acústicas, con lecturas con semilla y alertas por umbral
          como <code>ALERT IF TEMP&gt;75</code>. Los hallazgos llevan severidad (info / warn /
          critical) y aparecen en el registro de eventos a medida que la misión se ejecuta.
        </>
      ),
    },
    {
      q: "¿Puede controlar un robot real?",
      a: (
        <>
          No. patrol-lab es una simulación en el navegador de un flujo de inspección — no hay
          conexión con hardware real ni con una flota real. Demuestra la experiencia de sala de
          control, un intérprete de misión determinista y telemetría honesta.
        </>
      ),
    },
    {
      q: "¿Funciona en mi teléfono?",
      a: (
        <>
          El diseño se adapta por debajo de 900 px (visor arriba, editor abajo), pero patrol-lab está
          pensado como sala de control de escritorio — una pantalla ancha da la experiencia prevista.
        </>
      ),
    },
    {
      q: "¿Quién lo construyó?",
      a: (
        <>
          patrol-lab es un proyecto de portafolio abierto de Rico. El stack: Next.js (App Router),
          React Three Fiber, CodeMirror 6 y zustand, desplegado en Vercel. El código fuente es
          público en GitHub.
        </>
      ),
    },
  ],
};

export const FAQ_PAGE: Record<Locale, FaqPageContent> = { de, en, zh, es };
