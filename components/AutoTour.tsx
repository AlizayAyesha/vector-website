"use client";

import { useEffect, useRef, useState } from "react";

/** "Auto tour" pill (from vectoros.one): plays the page by scrolling it slowly; any scroll, tap or key hands control back. */
export default function AutoTour() {
  const [state, setState] = useState<"idle" | "playing">("idle");
  const raf = useRef(0);

  useEffect(() => {
    if (state !== "playing") return;
    const stop = (e: Event) => {
      if (e.target instanceof Element && e.target.closest("[data-tour-control]")) return;
      setState("idle");
    };
    const evs = ["wheel", "touchstart", "pointerdown", "keydown"] as const;
    evs.forEach((e) => window.addEventListener(e, stop, { capture: true, passive: true }));
    let last = performance.now();
    let y = window.scrollY;
    const step = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      // ~0.9 viewport heights per second: the pinned demo plays in about two minutes
      y = Math.min(max, y + window.innerHeight * 0.9 * dt);
      window.scrollTo(0, y);
      if (y >= max - 1) return setState("idle");
      raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    const vis = () => document.hidden && setState("idle");
    document.addEventListener("visibilitychange", vis);
    return () => {
      cancelAnimationFrame(raf.current);
      evs.forEach((e) => window.removeEventListener(e, stop, { capture: true }));
      document.removeEventListener("visibilitychange", vis);
    };
  }, [state]);

  const start = () => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.scrollY > document.documentElement.scrollHeight - window.innerHeight * 1.5) window.scrollTo(0, 0);
    setState("playing");
  };

  return (
    <div data-tour-control className="fixed bottom-5 left-5 z-40 flex items-center gap-3 motion-reduce:hidden">
      <button
        type="button"
        onClick={() => (state === "playing" ? setState("idle") : start())}
        aria-label={state === "playing" ? "Stop automatic page tour" : "Start automatic page tour"}
        className="glass-strong inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium text-fg"
      >
        {state === "playing" ? (
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true"><rect x="2.5" y="2" width="2.4" height="8" rx=".6" /><rect x="7.1" y="2" width="2.4" height="8" rx=".6" /></svg>
        ) : (
          <svg viewBox="0 0 12 12" className="size-3" fill="currentColor" aria-hidden="true"><path d="M3 1.8v8.4L10 6z" /></svg>
        )}
        Auto tour
      </button>
      {state === "playing" && <span className="hidden text-xs text-muted sm:inline">Scroll or interact to take over</span>}
    </div>
  );
}
