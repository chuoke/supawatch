"use client";

import { cn } from "@/lib/utils";
import { rampScale, VIZ_PEAK } from "@/lib/viz";

/* ── Matrix heatmap ────────────────────────────────────────────────────────
   A grid of cells shaded by value. Season × episode, weekday × hour,
   decade × genre — all the same picture.

   Cells are hard-edged rects with a gap of page background between them, so
   the grid reads as separated marks rather than a continuous wash. Edges
   carry more of the reading than fill does on a dark ground, which is what
   makes a seven-step achromatic ramp legible at all.

   Every cell carries a <title>, so the shade is never the only channel —
   required, because adjacent ramp steps are close by design. */

export type MatrixCell = {
  row: number;
  col: number;
  /* null means "no data here" — rendered as the empty step, distinct from a
     genuine zero. */
  value: number | null;
  label: string;
  peak?: boolean;
};

type Props = {
  cells: MatrixCell[];
  rows: number;
  cols: number;
  rowLabel?: (row: number) => string;
  colLabel?: (col: number) => string;
  /* Label every Nth column — 53 calendar weeks can't each carry a label. */
  colLabelEvery?: number;
  cellSize?: number;
  gap?: number;
  scale?: "quantile" | "linear";
  domain?: [number, number];
  showValue?: boolean;
  valueFormat?: (value: number) => string;
  armed: boolean;
  className?: string;
};

const ROW_LABEL_W = 34;
const COL_LABEL_H = 16;

export default function MatrixHeatmap({
  cells,
  rows,
  cols,
  rowLabel,
  colLabel,
  colLabelEvery = 1,
  cellSize = 14,
  gap = 3,
  scale = "quantile",
  domain,
  showValue = false,
  valueFormat = (v) => `${v}`,
  armed,
  className,
}: Props) {
  const step = cellSize + gap;
  const padLeft = rowLabel ? ROW_LABEL_W : 0;
  const padTop = colLabel ? COL_LABEL_H : 0;
  const width = padLeft + cols * step;
  const height = padTop + rows * step;

  /* Row-major stagger, but budgeted: a fixed per-cell delay turns a
     53-week calendar into a three-second reveal, by which point the reader
     has scrolled past. Spend a fixed window instead, however many cells. */
  const stagger = cells.length > 0 ? Math.min(8, 900 / cells.length) : 0;

  const shade = rampScale(
    cells.map((c) => c.value ?? 0),
    { mode: domain ? "linear" : scale, domain },
  );

  return (
    <div data-viz className={cn("overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width={width}
        height={height}
        role="img"
        className="max-w-full"
        style={{ maxWidth: "100%", height: "auto" }}
      >
        {colLabel &&
          Array.from({ length: cols }, (_, c) =>
            c % colLabelEvery === 0 ? (
              <text
                key={`c-${c}`}
                x={padLeft + c * step}
                y={COL_LABEL_H - 6}
                className="fill-neutral-600 font-space"
                style={{ fontSize: 9, letterSpacing: "0.1em" }}
              >
                {colLabel(c)}
              </text>
            ) : null,
          )}

        {rowLabel &&
          Array.from({ length: rows }, (_, r) => (
            <text
              key={`r-${r}`}
              x={0}
              y={padTop + r * step + cellSize / 2 + 3}
              className="fill-neutral-600 font-space"
              style={{ fontSize: 9, letterSpacing: "0.1em" }}
            >
              {rowLabel(r)}
            </text>
          ))}

        {cells.map((cell) => {
          const x = padLeft + cell.col * step;
          const y = padTop + cell.row * step;
          const fill = cell.peak ? VIZ_PEAK : shade(cell.value ?? 0);
          const delay = (cell.row * cols + cell.col) * stagger;

          return (
            <g key={`${cell.row}-${cell.col}`}>
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={fill}
                opacity={armed ? 1 : 0}
                style={{
                  transition: "opacity 420ms ease-out",
                  transitionDelay: `${delay}ms`,
                }}
              >
                <title>{cell.label}</title>
              </rect>

              {showValue && cell.value !== null && cellSize >= 20 && (
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 3.5}
                  textAnchor="middle"
                  className="font-space pointer-events-none"
                  fill={cell.peak ? "#fff" : "#010101"}
                  opacity={armed ? 1 : 0}
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    transition: "opacity 420ms ease-out",
                    transitionDelay: `${delay + 120}ms`,
                  }}
                >
                  {valueFormat(cell.value)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
