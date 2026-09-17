"use client";

import { useSyncExternalStore } from "react";

function subscribe(update: () => void) {
  const desktop = window.matchMedia("(min-width: 1024px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  desktop.addEventListener("change", update);
  reduced.addEventListener("change", update);
  document.addEventListener("visibilitychange", update);
  return () => {
    desktop.removeEventListener("change", update);
    reduced.removeEventListener("change", update);
    document.removeEventListener("visibilitychange", update);
  };
}

function snapshot(): "desktop" | "mobile" | null {
  if (document.hidden || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return window.matchMedia("(min-width: 1024px)").matches ? "desktop" : "mobile";
}

export function useTrailerLayout() {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
