"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minimize, X } from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/** One accessible screening room for trailers, films and episodes. */
export default function PlayerDialog({ title, eyebrow, description, children, onClose }: {
  title: string; eyebrow: string; description: string; children: ReactNode; onClose: () => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const [returnFocus] = useState(() => typeof document !== "undefined" && document.activeElement instanceof HTMLElement && document.activeElement !== document.body ? document.activeElement : null);
  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState(false);
  useEffect(() => {
    // These players are conditionally mounted, so restore after the portal and
    // its focus trap have both been removed, including on an Escape dismissal.
    return () => { requestAnimationFrame(() => { if (returnFocus?.isConnected) returnFocus.focus({ preventScroll: true }); }); };
  }, [returnFocus]);
  useEffect(() => {
    const update = () => setFullscreen(Boolean(document.fullscreenElement && root.current?.contains(document.fullscreenElement)));
    document.addEventListener("fullscreenchange", update);
    return () => { document.removeEventListener("fullscreenchange", update); };
  }, []);
  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (root.current?.querySelector<HTMLElement>(".screening-stage")?.requestFullscreen) await root.current.querySelector<HTMLElement>(".screening-stage")!.requestFullscreen();
      else { setFullscreenError(true); return; }
      setFullscreenError(false);
    } catch { setFullscreenError(true); }
  }
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent ref={root} className="screening-room" overlayClassName="screening-overlay" showCloseButton={false}
      onOpenAutoFocus={event => { event.preventDefault(); heading.current?.focus(); }}
      onCloseAutoFocus={event => { event.preventDefault(); returnFocus?.focus(); }}
      onEscapeKeyDown={event => { if (document.fullscreenElement) event.preventDefault(); }}>
      <header className="screening-header"><div><p className="eyebrow"><span className="screening-indicator" />{eyebrow}</p><DialogTitle ref={heading} tabIndex={-1}>{title}</DialogTitle><DialogDescription className="sr-only">{description}</DialogDescription></div><div className="screening-window-actions"><Button variant="ghost" size="icon" onClick={toggleFullscreen} aria-label={fullscreen ? "Exit full screen" : "Full screen"}>{fullscreen ? <Minimize /> : <Maximize />}</Button><DialogClose asChild><Button variant="ghost" size="icon" aria-label="Close player"><X /></Button></DialogClose></div></header>
      {children}
      {fullscreenError && <p className="screening-notice" role="status">Full screen isn’t available here. You can use the video’s own full-screen control.</p>}
    </DialogContent>
  </Dialog>;
}
