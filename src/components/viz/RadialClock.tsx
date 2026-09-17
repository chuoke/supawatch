"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";
import { rampScale, VIZ_PEAK } from "@/lib/viz";

/* ── Radial clock ──────────────────────────────────────────────────────────
   Counts around a dial: hour-of-day, weekday, month-of-year. Wedges are
   annulus sectors — hard radial edges, no curves beyond the arc itself.

   Animation note: an SVG path's `d` can't be transitioned, and per-wedge
   transforms drag in `transform-box`, which browsers disagree about. So the
   whole dial is revealed through one growing mask circle, with a per-wedge
   opacity stagger on top. One property, no layout maths, works everywhere. */

type Props = {
  values: number[];
  labelAt?: (index: number) => string;
  labelEvery?: number;
  size?: number;
  innerRadius?: number;
  armed: boolean;
  centerSlot?: React.ReactNode;
  segmentLabel?: (index: number, value: number) => string;
  className?: string;
};

function sector(cx: number, cy: number, r0: number, r1: number, a0: number, a1: number) {
  const p = (r: number, a: number) => [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  const [x0, y0] = p(r1, a0);
  const [x1, y1] = p(r1, a1);
  const [x2, y2] = p(r0, a1);
  const [x3, y3] = p(r0, a0);
  const large = a1 - a0 > Math.PI ? 1 : 0;
  return `M${x0} ${y0}A${r1} ${r1} 0 ${large} 1 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 ${large} 0 ${x3} ${y3}Z`;
}

export default function RadialClock({
  values,
  labelAt,
  labelEvery = 6,
  size = 300,
  innerRadius = 0.34,
  armed,
  centerSlot,
  segmentLabel = (i, v) => `${i}: ${v}`,
  className,
}: Props) {
  const maskId = useId();
  const n = values.length;
  const cx = size / 2;
  const cy = size / 2;
  /* Leave room for the axis labels, which are centre-anchored and so
     overhang the dial by half their width on the left and right. */
  const rOuterMax = size / 2 - 34;
  const r0 = rOuterMax * innerRadius;
  const peak = Math.max(...values, 0);
  const shade = rampScale(values);

  return (
    <div data-viz className={cn("relative inline-block", className)}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} role="img" className="max-w-full">
        <defs>
          <mask id={maskId}>
            <circle
              cx={cx}
              cy={cy}
              r={armed ? size : 0}
              fill="#fff"
              style={{ transition: "r 700ms cubic-bezier(0.22,1,0.36,1)" }}
            />
          </mask>
        </defs>

        <g mask={`url(#${maskId})`}>
          {values.map((value, i) => {
            /* -90° so index 0 sits at the top, like a clock face. */
            const a0 = (i / n) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / n) * Math.PI * 2 - Math.PI / 2;
            /* Length carries the value; shade reinforces it. */
            const t = peak > 0 ? value / peak : 0;
            const r1 = r0 + (rOuterMax - r0) * (0.12 + t * 0.88);
            const isPeak = peak > 0 && value === peak;

            return (
              <path
                key={i}
                d={sector(cx, cy, r0, r1, a0 + 0.012, a1 - 0.012)}
                fill={isPeak ? VIZ_PEAK : shade(value)}
                opacity={armed ? 1 : 0}
                style={{ transition: "opacity 400ms ease-out", transitionDelay: `${i * 22}ms` }}
              >
                <title>{segmentLabel(i, value)}</title>
              </path>
            );
          })}
        </g>

        {labelAt &&
          values.map((_, i) => {
            if (i % labelEvery !== 0) return null;
            const a = ((i + 0.5) / n) * Math.PI * 2 - Math.PI / 2;
            const r = rOuterMax + 15;
            return (
              <text
                key={`l-${i}`}
                x={cx + r * Math.cos(a)}
                y={cy + r * Math.sin(a) + 3}
                textAnchor="middle"
                className="fill-neutral-600 font-space"
                style={{ fontSize: 9, letterSpacing: "0.12em" }}
              >
                {labelAt(i)}
              </text>
            );
          })}
      </svg>

      {centerSlot && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {centerSlot}
        </div>
      )}
    </div>
  );
}
