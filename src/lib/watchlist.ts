"use client";

import { useSyncExternalStore } from "react";
import { normalizeTitle, titleKey, type DiscoveryTitle } from "@/lib/discovery";

const KEY = "sw-watchlist-v1";
const EVENT = "sw-watchlist-change";
const EMPTY: DiscoveryTitle[] = [];
let cachedRaw: string | null = null;
let cachedItems: DiscoveryTitle[] = EMPTY;
function read(): DiscoveryTitle[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cachedRaw) return cachedItems;
    let data: unknown = [];
    try { data = raw ? JSON.parse(raw) : []; } catch { /* Invalid stored JSON is an empty list, not stale cached titles. */ }
    const seen = new Set<string>();
    cachedItems = Array.isArray(data) ? data.slice(0, 200).flatMap(value => {
      const item = value && typeof value === "object" ? normalizeTitle(value) : null;
      if (!item || seen.has(titleKey(item))) return [];
      seen.add(titleKey(item));
      return [item];
    }) : EMPTY;
    cachedRaw = raw;
    return cachedItems;
  } catch { return cachedItems; }
}
function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) callback(); };
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", onStorage);
  return () => { window.removeEventListener(EVENT, callback); window.removeEventListener("storage", onStorage); };
}
export function useWatchlist() { return useSyncExternalStore(subscribe, read, () => EMPTY); }
export function toggleSaved(item: DiscoveryTitle): boolean {
  const items = read();
  const exists = items.some(saved => titleKey(saved) === titleKey(item));
  const next = exists ? items.filter(saved => titleKey(saved) !== titleKey(item)) : [item, ...items].slice(0, 200);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(EVENT));
    return true;
  } catch { return false; }
}
