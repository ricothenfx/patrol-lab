"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

/* The theme source of truth is the data-theme attribute that layout.tsx's
   inline script sets before first paint. Subscribers keep every toggle
   instance (and any future listener) in sync without effects. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Theme {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function getServerSnapshot(): Theme {
  return "dark";
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("patrol-lab-theme", next);
    } catch {
      // private mode: theme still applies for this session
    }
    listeners.forEach((notify) => notify());
  }

  return (
    <button
      className="btn theme-toggle"
      data-testid="theme-toggle"
      onClick={toggle}
      title="Toggle light / dark theme"
    >
      {theme === "dark" ? "◐ dark" : "◑ light"}
    </button>
  );
}
