import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ── Chart frame ───────────────────────────────────────────────────────────
   The header every chart on the site shares: the red accent bar, the
   uppercase eyebrow, the title, and an optional controls slot on the right.
   Extracted from TopSix so a chart added next year still looks like one
   added today.

   `note` is the methodology line. It exists because several figures here are
   honest only if they're qualified — "runtime opened" is not "hours watched"
   — and a chart that quietly overstates what it knows is worse than no
   chart. Use it whenever the number needs a caveat. */

type Props = {
  title: string;
  eyebrow?: string;
  controls?: ReactNode;
  note?: string;
  /* Wrap in a .snap-section so the chart participates in the home page's
     reels scroll-snap. Off by default — inside a detail page it would trap
     the scroll. */
  snap?: boolean;
  className?: string;
  children: ReactNode;
};

export default function ChartFrame({
  title,
  eyebrow,
  controls,
  note,
  snap = false,
  className,
  children,
}: Props) {
  return (
    <section className={cn(snap && "snap-section", "py-12 lg:py-16", className)}>
      <div className="px-6 md:px-12">
        <div className="mb-7 flex items-end justify-between gap-6">
          <div className="flex min-w-0 items-center gap-4">
            <div className="h-9 w-1 shrink-0 bg-[#e50914]" aria-hidden />
            <div className="min-w-0">
              {eyebrow && (
                <p className="font-space text-[10px] uppercase tracking-[0.2em] text-neutral-500">
                  {eyebrow}
                </p>
              )}
              <h2 className="truncate font-manrope text-[20px] font-semibold tracking-tight text-white/95">
                {title}
              </h2>
            </div>
          </div>
          {controls && <div className="shrink-0">{controls}</div>}
        </div>

        {children}

        {note && (
          <p className="mt-5 max-w-prose font-space text-[10px] uppercase leading-relaxed tracking-[0.1em] text-neutral-600">
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
