"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { VIZ_STEPS, type VizDatum } from "@/lib/viz";

/* ── Split bar ─────────────────────────────────────────────────────────────
   Composition: one bar, cut into shares. This is the donut, and it isn't
   round — a segmented rule holds its edges, reads at any width, and puts the
   labels on a straight line where they can be compared.

   Slices are separated by a 2px stroke of page background so they read as
   physically distinct pieces, and are shaded down the luminance ramp in rank
   order, so shade and position agree. The legend always carries the names:
   colour never has to be decoded. */

type Props = {
  data: VizDatum[];
  maxSlices?: number;
  otherLabel?: string;
  height?: number;
  valueFormat?: (value: number, share: number) => string;
  armed: boolean;
  className?: string;
};

export default function SplitBar({
  data,
  maxSlices = 6,
  otherLabel = "Other",
  height = 10,
  valueFormat = (value, share) => `${value.toLocaleString("en-US")} · ${Math.round(share * 100)}%`,
  armed,
  className,
}: Props) {
  const slices = useMemo(() => {
    /* Unknowns can't take a share of a whole, so they sit this chart out
       entirely rather than distorting everyone else's percentage. */
    const known = data.filter((d): d is VizDatum & { value: number } => d.value !== null);
    const sorted = [...known].sort((a, b) => b.value - a.value);
    const head = sorted.slice(0, maxSlices);
    const tail = sorted.slice(maxSlices);
    if (tail.length) {
      head.push({
        key: "__other",
        label: otherLabel,
        value: tail.reduce((sum, d) => sum + d.value, 0),
      });
    }
    return head;
  }, [data, maxSlices, otherLabel]);

  const total = slices.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return (
      <p className="font-space text-[11px] uppercase tracking-[0.14em] text-neutral-600">
        No composition to show.
      </p>
    );
  }

  /* Walk the ramp from bright to dark so the biggest slice is the brightest. */
  const shadeOf = (i: number) =>
    slices[i].peak ? "var(--viz-peak)" : VIZ_STEPS[Math.max(1, VIZ_STEPS.length - 1 - i)];

  return (
    <div data-viz className={cn("w-full", className)}>
      <div className="flex w-full" style={{ height }} role="img" aria-label="Composition">
        {slices.map((slice, i) => (
          <div
            key={slice.key}
            title={`${slice.label} — ${valueFormat(slice.value, slice.value / total)}`}
            className="h-full transition-[flex-grow] duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              flexGrow: armed ? slice.value : 0,
              flexBasis: 0,
              background: shadeOf(i),
              /* A gap of page background, not a border — borders round with
                 the box, gaps don't. */
              marginRight: i === slices.length - 1 ? 0 : 2,
              transitionDelay: `${i * 60}ms`,
            }}
          />
        ))}
      </div>

      <ul className="mt-5 flex flex-col">
        {slices.map((slice, i) => (
          <li
            key={slice.key}
            className="flex items-center gap-3 border-b border-white/[0.06] py-2 last:border-b-0"
          >
            <span
              className="h-2.5 w-2.5 shrink-0"
              style={{ background: shadeOf(i) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate font-manrope text-[13px] text-white/85">
              {slice.label}
            </span>
            <span className="shrink-0 font-space text-[12px] font-bold tabular-nums text-neutral-400">
              {valueFormat(slice.value, slice.value / total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
