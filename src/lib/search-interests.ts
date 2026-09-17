import type { TasteInput } from "@/lib/taste";
const KEY = "sw-search-interests-v1";
export function getSearchInterests(): TasteInput[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(data) ? data.filter((item): item is TasteInput => !!item && Number.isSafeInteger(item.id) && item.id > 0 && ["movie", "tv"].includes(item.media_type) && typeof item.title === "string").slice(0, 3) : [];
  } catch { return []; }
}
/** Search signals are weaker than an opened title, and never count as watches. */
export function recordSearchInterest(item: TasteInput) {
  try {
    const previous = getSearchInterests();
    if (previous[0]?.id === item.id && previous[0]?.media_type === item.media_type) return;
    localStorage.setItem(KEY, JSON.stringify([item, ...previous.filter(old => old.id !== item.id || old.media_type !== item.media_type)].slice(0, 3)));
    window.dispatchEvent(new Event("sw-taste-change"));
  } catch { /* Storage is optional. */ }
}
