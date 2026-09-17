"use client";

import { useEffect } from "react";
import Lenis from "lenis";

export default function SmoothScroll() {
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let lenis: Lenis | undefined;
    const configure = () => {
      lenis?.destroy();
      lenis = undefined;
      if (motion.matches) return;
      lenis = new Lenis({
        autoRaf: true,
        lerp: 0.12,
        anchors: true,
        stopInertiaOnNavigate: true,
        // Keep touch momentum and scrolling inside menus/dialogs native.
        syncTouch: false,
        prevent: node => node.matches('[data-slot="select-content"], [data-slot="popover-content"], [role="dialog"], [data-lenis-prevent]'),
      });
      syncLock();
    };
    const syncLock = () => {
      if (!lenis) return;
      const locked = ["hidden", "clip"].includes(getComputedStyle(document.body).overflowY) || ["hidden", "clip"].includes(document.documentElement.style.overflowY) || document.body.hasAttribute("data-scroll-locked");
      if (locked && !lenis.isStopped) lenis.stop();
      else if (!locked && lenis.isStopped) lenis.start();
    };
    const observer = new MutationObserver(syncLock);
    observer.observe(document.body, { attributes: true, attributeFilter: ["style", "data-scroll-locked"] });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["style"] });
    configure();
    motion.addEventListener("change", configure);
    return () => { motion.removeEventListener("change", configure); observer.disconnect(); lenis?.destroy(); };
  }, []);
  return null;
}
