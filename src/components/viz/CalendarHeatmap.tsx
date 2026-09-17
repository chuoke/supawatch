"use client";

import { useMemo } from "react";
import MatrixHeatmap, { type MatrixCell } from "@/components/viz/MatrixHeatmap";
import { addDays, dayKey, daysBetween, startOfWeek, MONTH_LABELS, WEEKDAY_LABELS } from "@/lib/dates";

/* ── Calendar heatmap ──────────────────────────────────────────────────────
   A year of days as week-columns × weekday-rows. An adapter, not a second
   renderer — it works out the grid and hands it to MatrixHeatmap.

   All dates are local: a play at 11pm belongs to that evening in the
   viewer's calendar, and running the bucketing through UTC would move it to
   tomorrow for most of the world. See src/lib/dates.ts. */

type Props = {
  /* One entry per event; several on the same day are summed. */
  days: { ts: number; value?: number }[];
  year: number;
  cellSize?: number;
  armed: boolean;
  valueLabel?: (value: number) => string;
};

export default function CalendarHeatmap({
  days,
  year,
  cellSize = 12,
  armed,
  valueLabel = (v) => `${v} watched`,
}: Props) {
  const { cells, cols, monthAt } = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of days) {
      const key = dayKey(entry.ts);
      totals.set(key, (totals.get(key) ?? 0) + (entry.value ?? 1));
    }

    const first = new Date(year, 0, 1);
    const last = new Date(year, 11, 31);
    const gridStart = startOfWeek(first);
    const span = daysBetween(gridStart.getTime(), last.getTime()) + 1;
    const columns = Math.ceil(span / 7);

    let peak = 0;
    for (const [, value] of totals) peak = Math.max(peak, value);

    const out: MatrixCell[] = [];
    const months = new Map<number, string>();
    let peakClaimed = false;

    for (let i = 0; i < span; i++) {
      const date = addDays(gridStart, i);
      const col = Math.floor(i / 7);
      const row = date.getDay();

      /* The grid starts on the Sunday before Jan 1, so the first few cells
         belong to last year — drop them rather than shading them. */
      if (date.getFullYear() !== year) continue;

      /* Label the column that holds the 1st, once per month. Keying on
         "any day in the first week" put January on two adjacent columns
         whenever the month straddled a week boundary. */
      if (date.getDate() === 1) months.set(col, MONTH_LABELS[date.getMonth()]);

      const value = totals.get(dayKey(date)) ?? 0;
      const isPeak = peak > 0 && value === peak && !peakClaimed;
      if (isPeak) peakClaimed = true;

      out.push({
        row,
        col,
        value: value > 0 ? value : null,
        peak: isPeak,
        label:
          value > 0
            ? `${date.toDateString()} — ${valueLabel(value)}`
            : `${date.toDateString()} — nothing watched`,
      });
    }

    return { cells: out, cols: columns, monthAt: months };
  }, [days, year, valueLabel]);

  return (
    <MatrixHeatmap
      cells={cells}
      rows={7}
      cols={cols}
      cellSize={cellSize}
      /* Only Mon/Wed/Fri, or the labels collide at this cell size. */
      rowLabel={(r) => (r % 2 === 1 ? WEEKDAY_LABELS[r] : "")}
      colLabel={(c) => monthAt.get(c) ?? ""}
      armed={armed}
    />
  );
}
