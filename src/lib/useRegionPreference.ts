"use client";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/client-api";
import { resolveRegionOrNull } from "@/lib/geo";

const KEY = "sw-discovery-region-v1";
const EVENT = "sw-region-change";
export function useRegionPreference() {
  const [region, setRegion] = useState<string | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    let overridden = false;
    const apply = (value: string | null) => {
      overridden = true;
      setRegion(resolveRegionOrNull(value));
    };
    const onChange = (event: Event) => apply((event as CustomEvent<string | null>).detail);
    const onStorage = (event: StorageEvent) => { if (event.key === KEY || event.key === null) apply(event.newValue); };
    window.addEventListener(EVENT, onChange);
    window.addEventListener("storage", onStorage);
    const resolve = async () => {
      try {
        const saved = localStorage.getItem(KEY);
        if (saved === "global" || resolveRegionOrNull(saved)) {
          if (!cancelled) setRegion(saved === "global" ? null : resolveRegionOrNull(saved));
          return;
        }
      } catch { /* Detection still works when local storage is unavailable. */ }
      const response = await fetchJson<{ region: string; detected: boolean }>("/api/getRegion", { ttlMs: 60000 }).catch(() => null);
      if (!cancelled && !overridden) setRegion(response?.detected ? resolveRegionOrNull(response.region) : null);
    };
    void resolve();
    return () => { cancelled = true; window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", onStorage); };
  }, []);
  const changeRegion = (value: string) => {
    const next = resolveRegionOrNull(value);
    setRegion(next);
    try { localStorage.setItem(KEY, next ?? "global"); } catch { /* Apply for this visit. */ }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
  };
  return { region, changeRegion };
}
