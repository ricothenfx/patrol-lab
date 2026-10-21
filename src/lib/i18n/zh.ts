import type { Dictionary } from "./en";

const zh: Dictionary = {
  nav: {
    qa: "问答",
    faq: "常见问题",
  },
  home: {
    meta: "自主巡检机器人的任务控制台",
    paneTitle: "任务编辑器",
    footerRig: "rig: ANYmal C (MuJoCo Menagerie, BSD-3)",
    footerSim: "确定性仿真 — 相同种子，相同读数",
  },
  viewport: {
    initRenderer: "正在初始化渲染器…",
    loadingRig: "ANYmal C · 正在加载机器人模型与资源",
    assetsMeta: (done, total, pct) => `${done}/${total} 项资源 · ${pct}%`,
    siteBadge: "SITE A · 变电站仿真",
    camFollow: "◎ 跟随",
    physicsLoading: "正在加载 MuJoCo WASM 物理…",
    locToggleTitle: "切换运动模式（DYNAMICS = 测试版）",
    locError: "物理初始化失败 — 保持 KINEMATIC",
    camOrbit: "✥ 环绕",
  },
  kpi: {
    telemetry: "任务遥测",
    missionClock: "任务时钟",
    odometer: "里程计",
    coverage: "POI 覆盖",
    findings: "发现",
    alerts: "告警",
    seed: "种子",
  },
  minimap: {
    title: "SITE A · 战术地图",
  },
  controls: {
    run: "▶ 运行",
    pause: "⏸ 暂停",
    step: "⇥ 单步",
    reset: "↺ 重置",
    seed: "种子",
    playback: "回放",
    line: "行",
    stmt: "语句",
    phase: "阶段",
    findingsCount: (n) => `◈ ${n} 项发现`,
    emptyLog: "任务日志 — 运行任务以查看事件",
  },
  nl: {
    open: "✎ 用自然语言描述任务（→ DSL）",
    placeholder: "例如：先监测阀组的气体，再对储罐做热成像",
    compile: "编译",
    proposed: "建议的任务 — 请检查后接受",
    accept: "✓ 接受",
    discard: "丢弃",
  },
  report: {
    generate: "⇒ 生成巡检报告",
    needsRun: "报告（请先运行任务）",
    grounded: "内容基于任务日志",
    failed: "报告生成失败",
  },
  errors: {
    parseErrors: (n) => `${n} 个解析错误 — 见高亮行`,
  },
  qa: {
    searchPlaceholder: "搜索问题与答案…",
    answered: (n, total) => `${n}/${total} 已回答`,
    all: "全部",
    empty: (query, tag) =>
      `没有问题匹配“${query}”${tag ? `（标签：${tag}）` : ""} — 请换个关键词或清除标签筛选。`,
  },
};

export default zh;
