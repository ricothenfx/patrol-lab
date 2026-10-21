"use client";

import { create } from "zustand";

interface UiState {
  loadDone: number;
  loadTotal: number;
  viewportReady: boolean;
  simMode: "KINEMATIC";
  setProgress: (done: number, total: number) => void;
  setViewportReady: (ready: boolean) => void;
}

export const useUi = create<UiState>((set) => ({
  loadDone: 0,
  loadTotal: 0,
  viewportReady: false,
  simMode: "KINEMATIC",
  setProgress: (loadDone, loadTotal) => set({ loadDone, loadTotal }),
  setViewportReady: (viewportReady) => set({ viewportReady }),
}));
