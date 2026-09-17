/* ── Chart scales ──────────────────────────────────────────────────────────
   Shared maths for the viz primitives. Lifted out of TopSix so every chart
   on the site scales the same way and the reasoning lives in one place. */

export type VizDatum = {
  key: string;
  label: string;
  /* null is "we couldn't find out", which must never render as zero — a
     zero bar asserts an absence the data doesn't support. */
  value: number | null;
  /* Secondary line under the label — a year, a count, a role. */
  sub?: string;
  href?: string;
  /* Marks the single highlighted datum. Exactly one per chart: see the
     --viz-peak note in globals.css. */
  peak?: boolean;
};

/* The seven ramp steps, as CSS var references. Index 0 is "no data". */
export const VIZ_STEPS = [
  "var(--viz-0)",
  "var(--viz-1)",
  "var(--viz-2)",
  "var(--viz-3)",
  "var(--viz-4)",
  "var(--viz-5)",
  "var(--viz-6)",
] as const;

export const VIZ_PEAK = "var(--viz-peak)";

/* Bars are scaled to their own chart, not to the metric's absolute range.
   Five titles ranked by rating always cluster inside half a point — on an
   absolute 0–10 scale they render as five identical bars, which tells the
   reader nothing. Here the leader fills the track and the rest fall away in
   proportion to how far behind they actually are, so the standing is legible
   at a glance; the exact figure sits beside the bar for the absolute read.

   BAR_MIN keeps last place a short bar rather than an empty track, and
   BAR_TAIL is the headroom below it — so a five-way tie renders as five full
   bars, which is the honest picture. */
export const BAR_MIN = 34;
export const BAR_TAIL = 0.35;

export function barScale(
  values: number[],
  { min = BAR_MIN, tail = BAR_TAIL }: { min?: number; tail?: number } = {},
) {
  if (values.length === 0) return () => 0;
  const hi = Math.max(...values);
  const lo = Math.min(...values) - tail;
  const span = hi - lo;
  return (value: number) =>
    span <= 0 ? 100 : min + ((value - lo) / span) * (100 - min);
}

/* Counts, unlike ratings, genuinely start at zero — "you watched 40 dramas
   and 2 westerns" is a real 20× gap and flattening it would lie. Use this
   where zero is meaningful and barScale where it isn't. */
export function absoluteScale(values: number[], max?: number) {
  const hi = max ?? Math.max(...values, 0);
  return (value: number) => (hi <= 0 ? 0 : (value / hi) * 100);
}

/**
 * Map a value onto the ramp. Quantile binning (the default) spends every
 * step regardless of distribution, which matters because real chart data is
 * almost never uniform — a linear ramp over watch counts puts 95% of days in
 * the darkest bin and shows a black rectangle.
 */
export function rampScale(
  values: number[],
  { mode = "quantile", domain }: { mode?: "quantile" | "linear"; domain?: [number, number] } = {},
) {
  const positive = values.filter((v) => v > 0).sort((a, b) => a - b);
  const steps = VIZ_STEPS.length - 1; // step 0 is reserved for "no data"

  if (positive.length === 0) return () => VIZ_STEPS[0];

  if (mode === "linear" || domain) {
    const [lo, hi] = domain ?? [positive[0], positive[positive.length - 1]];
    const span = hi - lo;
    return (value: number) => {
      if (!(value > 0)) return VIZ_STEPS[0];
      const t = span <= 0 ? 1 : (value - lo) / span;
      const i = Math.min(steps, Math.max(1, Math.ceil(t * steps)));
      return VIZ_STEPS[i];
    };
  }

  /* Quantile cut points, one per step. */
  const cuts = Array.from({ length: steps }, (_, i) =>
    positive[Math.min(positive.length - 1, Math.floor(((i + 1) / steps) * (positive.length - 1)))],
  );
  return (value: number) => {
    if (!(value > 0)) return VIZ_STEPS[0];
    const i = cuts.findIndex((cut) => value <= cut);
    return VIZ_STEPS[i === -1 ? steps : Math.max(1, i + 1)];
  };
}

/** 1,284 → "1,284"; 41203 → "41,203". Grouping only; charts show real numbers. */
export function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

/** Minutes → "28d 14h" / "14h 3m" / "47m". */
export function formatRuntime(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = Math.round(minutes % 60);
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
