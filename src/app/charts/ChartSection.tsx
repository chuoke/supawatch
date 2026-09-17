"use client";

import ChartFrame from "@/components/viz/ChartFrame";
import RankedBars from "@/components/viz/RankedBars";
import SplitBar from "@/components/viz/SplitBar";
import { useArmedInView } from "@/lib/useArmedInView";
import { formatCount, type VizDatum } from "@/lib/viz";
import type { Facet } from "@/lib/facets";

/* A server-rendered facet chart that arms itself on approach. The data
   arrives with the HTML — only the animation is client-side. */

type Props = {
  title: string;
  eyebrow: string;
  facets: Facet[];
  note?: string;
  variant?: "bars" | "split";
};

export default function ChartSection({
  title,
  eyebrow,
  facets,
  note,
  variant = "bars",
}: Props) {
  const { ref, armed } = useArmedInView<HTMLDivElement>();
  const known = facets.map((f) => f.count).filter((c): c is number => c !== null);
  const peak = known.length ? Math.max(...known) : 0;

  const data: VizDatum[] = facets.map((facet) => ({
    key: facet.key,
    label: facet.label,
    value: facet.count,
    peak: facet.count === peak && peak > 0,
    href: facet.href,
  }));

  return (
    <div ref={ref}>
      <ChartFrame title={title} eyebrow={eyebrow} note={note}>
        {variant === "split" ? (
          <SplitBar data={data} armed={armed} />
        ) : (
          <RankedBars data={data} armed={armed} valueFormat={formatCount} />
        )}
      </ChartFrame>
    </div>
  );
}
