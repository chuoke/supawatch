"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import gsap from "gsap";

/* A quiet fallback for browsers without native view transitions. Never run
   both systems together: animating the live page inside its snapshot causes
   a second fade and makes navigation feel sluggish. */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

export default function Template({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if ("startViewTransition" in document) return;

    const ctx = gsap.context(() => {
      gsap.from(el, {
        autoAlpha: 0,
        duration: 0.2,
        ease: "power3.out",
        clearProps: "all", // leave no inline transform/filter (keeps fixed/sticky children correct)
      });
    }, el);

    return () => ctx.revert();
  }, []);

  return <div ref={ref}>{children}</div>;
}
