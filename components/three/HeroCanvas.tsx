"use client";

import { useCallback, useMemo, useRef } from "react";
import Stage from "./stage";
import { createHeroScene } from "./heroScene";
import type { BracketParams } from "./parts";

export default function HeroCanvas() {
  const readout = useRef<HTMLSpanElement>(null);
  const onParams = useCallback((p: BracketParams) => {
    if (!readout.current) return;
    readout.current.textContent = `Base ${p.length} mm · ${p.holes} holes · ${p.ribs} ribs`;
  }, []);
  const setup = useMemo(() => createHeroScene(onParams), [onParams]);
  return (
    <>
      <Stage setup={setup} className="absolute inset-0" label="Wireframe engineering bracket changing length and gaining holes and ribs" />
      <div className="pointer-events-none absolute bottom-6 right-6 hidden items-center gap-2 rounded-full border border-line bg-black/60 px-3 py-1.5 font-mono text-[11px] text-muted backdrop-blur md:flex">
        <span className="size-1.5 rounded-full bg-fg/80 animate-pulse" />
        <span ref={readout}>Base 80 mm · 0 holes · 0 ribs</span>
        <span className="text-muted/60">· sample geometry</span>
      </div>
    </>
  );
}
