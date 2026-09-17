"use client";

import { useEffect, useState } from "react";
import { useInView } from "@/lib/useInView";

/* ── Arm-on-approach ───────────────────────────────────────────────────────
   Charts animate from zero when the reader reaches them, which only works if
   the zero state paints first: set the final width in the same frame as the
   mount and the browser has nothing to transition from. `inView` fires early
   (700px out) so the data can load; `armed` flips one frame later, which is
   the signal to move.

   Reduced motion is handled in CSS rather than here: the [data-viz] block
   at the end of globals.css zeroes transition durations, so an armed chart
   appears at its final state. The chart is the content, so it must always
   arrive — it just arrives without the sweep. */
export function useArmedInView<T extends HTMLElement = HTMLDivElement>(
  rootMargin?: string,
) {
  const { ref, inView } = useInView<T>(rootMargin);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!inView || armed) return;

    /* Arming always happens in a frame callback, never in the effect body:
       setting it synchronously would paint the final state and the armed
       state in the same commit, leaving nothing to transition from. */
    const frame = requestAnimationFrame(() => setArmed(true));
    return () => cancelAnimationFrame(frame);
  }, [inView, armed]);

  return { ref, inView, armed };
}
