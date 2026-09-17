"use client";

import { useEffect, useRef } from "react";

/** Low-resolution monochrome TV snow, with constant luminance and no flashing. */
export default function StaticNoise({ paused = false }: { paused?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    const context = element?.getContext("2d");
    if (!element || !context) return;
    const width = element.width;
    const height = element.height;
    const frames = Array.from({ length: 8 }, () => {
      const frame = context.createImageData(width, height);
      for (let index = 0; index < frame.data.length; index += 4) {
        const shade = Math.floor(Math.random() * 160) + 35;
        frame.data[index] = frame.data[index + 1] = frame.data[index + 2] = shade;
        frame.data[index + 3] = 255;
      }
      return frame;
    });
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setInterval> | undefined;
    let index = 0;
    const configure = () => {
      clearInterval(timer);
      context.putImageData(frames[0], 0, 0);
      if (paused || motion.matches || document.hidden) return;
      timer = setInterval(() => { index = (index + 1) % frames.length; context.putImageData(frames[index], 0, 0); }, 85);
    };
    configure();
    motion.addEventListener("change", configure);
    document.addEventListener("visibilitychange", configure);
    return () => { clearInterval(timer); motion.removeEventListener("change", configure); document.removeEventListener("visibilitychange", configure); };
  }, [paused]);
  return <div className="signal-noise" aria-hidden="true"><canvas ref={canvas} width={768} height={432} /><div className="signal-scanlines" /><div className="signal-roll" /><div className="signal-vignette" /></div>;
}
