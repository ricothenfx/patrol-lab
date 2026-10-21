"use client";

import { create } from "zustand";
import type { Finding } from "@/lib/mission/findings";
import type { MissionEvent } from "@/lib/mission/runner";

export interface MissionSnapshotUi {
  status: "IDLE" | "RUNNING" | "PAUSED" | "DONE";
  missionName: string;
  currentLine: number;
  stmtIndex: number;
  stmtCount: number;
  missionClock: number;
  seed: number;
  findings: Finding[];
  events: MissionEvent[];
  targetPoi: string | null;
  phase: string;
}

interface UiState {
  // asset loading
  loadDone: number;
  loadTotal: number;
  viewportReady: boolean;
  simMode: "KINEMATIC";
  camMode: "orbit" | "follow";
  setCamMode: (m: "orbit" | "follow") => void;
  setProgress: (done: number, total: number) => void;
  setViewportReady: (ready: boolean) => void;

  // mission
  editorText: string;
  setEditorText: (t: string) => void;
  seed: number;
  setSeed: (n: number) => void;
  playback: number;
  setPlayback: (n: number) => void;
  snapshot: MissionSnapshotUi | null;
  setSnapshot: (s: MissionSnapshotUi) => void;
  runError: string | null;
  setRunError: (e: string | null) => void;
}

export const useUi = create<UiState>((set) => ({
  loadDone: 0,
  loadTotal: 0,
  viewportReady: false,
  simMode: "KINEMATIC",
  camMode: "follow",
  setCamMode: (camMode) => set({ camMode }),
  setProgress: (loadDone, loadTotal) => set({ loadDone, loadTotal }),
  setViewportReady: (viewportReady) => set({ viewportReady }),

  editorText: "",
  setEditorText: (editorText) => set({ editorText }),
  seed: 7,
  setSeed: (seed) => set({ seed: seed >>> 0 }),
  playback: 1,
  setPlayback: (playback) => set({ playback }),
  snapshot: null,
  setSnapshot: (snapshot) => set({ snapshot }),
  runError: null,
  setRunError: (runError) => set({ runError }),
}));
