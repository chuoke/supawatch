"use client";

import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/client-api";
import { useRegionPreference } from "@/lib/useRegionPreference";
import type { WatchProvider } from "@/lib/media";

type Result = { providers: WatchProvider[]; link: string | null };
const EMPTY: WatchProvider[] = [];

/** Availability is scoped to both title type and country. Never display a
 * previous title/country's providers while the next lookup is pending. */
export function useWatchProviders(id: number | undefined, type: "movie" | "tv") {
  const { region } = useRegionPreference();
  const key = id && region ? `/api/getWatchProviders?id=${id}&region=${region}&media_type=${type}` : null;
  const [result, setResult] = useState<{ key: string; data: Result } | null>(null);
  useEffect(() => {
    if (!key) return;
    let cancelled = false;
    fetchJson<Result>(key).then(data => {
      if (!cancelled) setResult({ key, data });
    }).catch(() => { /* No availability claim when the provider cannot verify it. */ });
    return () => { cancelled = true; };
  }, [key]);
  const current = result?.key === key ? result?.data : null;
  return { providers: current?.providers ?? EMPTY, providersLink: current?.link ?? null };
}
