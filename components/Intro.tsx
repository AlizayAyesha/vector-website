"use client";

import { useEffect, useMemo, useRef } from "react";
import { ctas, hero, intro, tools } from "@/lib/content";
import { ToolLogo } from "./ToolLogo";
import { CoreCanvas } from "./Lazy3D";
import { T, ramp } from "./three/coreScene";

/**
 * Pinned intro: one sticky full-viewport WebGL canvas behind the hero and three
 * scroll-scrubbed statements. Every transform is a pure function of scroll
 * progress, so scrolling back plays it in reverse.
 */
export default function Intro() {
  const wrap = useRef<HTMLElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const phraseRefs = useRef<(HTMLDivElement | null)[]>([]);
  const pipRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const hintRef = useRef<HTMLDivElement>(null);
  const progress = useMemo(() => ({ current: 0 }), []);
  const labels = useMemo(() => ({ current: [] as (HTMLElement | null)[] }), []);
  const logos = useMemo(() => ({ current: [] as (HTMLElement | null)[] }), []);

  useEffect(() => {
    let raf = 0;
    const apply = () => {
      raf = 0;
      const el = wrap.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      progress.current = p;

      // Hero copy lifts, blurs and fades as the part starts to dissolve.
      const h = ramp(T.heroOut[0], T.heroOut[1], p);
      if (heroRef.current) {
        heroRef.current.style.opacity = String(1 - h);
        heroRef.current.style.transform = `translateY(${-h * 60}px) scale(${1 - h * 0.04})`;
        heroRef.current.style.filter = h > 0.01 ? `blur(${h * 10}px)` : "none";
        heroRef.current.style.pointerEvents = h > 0.5 ? "none" : "auto";
      }
      if (hintRef.current) hintRef.current.style.opacity = String(1 - ramp(0.01, 0.05, p));

      // Statements: fade in, reveal word by word with scroll, fade out.
      intro.phrases.forEach((ph, i) => {
        const node = phraseRefs.current[i];
        if (!node) return;
        const [a, b] = ph.window;
        const vis = ramp(a, a + 0.035, p) * (1 - ramp(b - 0.035, b, p));
        node.style.opacity = String(vis);
        node.style.transform = `translate(-50%, -50%) translateY(${(1 - ramp(a, a + 0.05, p)) * 24 - ramp(b - 0.035, b, p) * 24}px)`;
        const words = node.querySelectorAll<HTMLSpanElement>("[data-w]");
        const local = ramp(a + 0.01, b - 0.07, p) * (words.length + 1);
        words.forEach((w, k) => {
          w.style.opacity = String(0.14 + 0.86 * Math.min(1, Math.max(0, local - k)));
        });
        const pip = pipRefs.current[i];
        if (pip) pip.dataset.on = String(p >= a && p < b);
      });
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [progress]);

  return (
    <section ref={wrap} id="top" className="theme-dark relative h-[480vh]" aria-label="Introduction">
      <div className="sticky top-0 h-svh overflow-hidden">
        {/* 3D */}
        <div className="absolute inset-0">
          <CoreCanvas progress={progress} tools={tools} labels={labels} logos={logos} />
        </div>
        {/* vignette keeps type readable over the scene */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,transparent_30%,rgba(0,0,0,0.75)_100%)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

        {/* tool logos, centred in each hexagon by the scene */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {tools.map((t, i) => (
            <div
              key={t.name}
              ref={(el) => {
                logos.current[i] = el;
              }}
              className="absolute left-0 top-0 flex size-6 items-center justify-center opacity-0 [container-type:size]"
            >
              <ToolLogo name={t.name} className="size-full" wordSize="38cqw" />
            </div>
          ))}
        </div>

        {/* tool labels, positioned by the scene every frame */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {tools.map((t, i) => (
            <div
              key={t.name}
              ref={(el) => {
                labels.current[i] = el;
              }}
              className="absolute left-0 top-0 w-24 text-center opacity-0 md:w-auto md:whitespace-nowrap"
            >
              <p className="text-[12px] font-medium leading-tight tracking-tight text-fg md:text-sm">{t.name}</p>
              <p className={`mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] ${t.status === "Available" ? "text-fg/70" : "text-muted/70"}`}>
                {t.status}
              </p>
            </div>
          ))}
        </div>

        {/* HERO copy (a soft scrim keeps the headline and sub-line legible over the part) */}
        <div ref={heroRef} className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center will-change-transform">
          <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[34rem] w-[min(58rem,120vw)] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(closest-side,rgba(0,0,0,0.82),rgba(0,0,0,0.55)_55%,transparent)]" aria-hidden="true" />
          <p className="hero-in mb-7 flex items-center gap-2.5 text-sm font-medium text-muted" style={{ ["--d" as string]: "0ms" }}>
            <span className="live-dot" aria-hidden="true" />
            {hero.eyebrow}
          </p>
          <h1 className="text-[clamp(2.75rem,6.4vw,6rem)] font-semibold leading-[1.0] tracking-[-0.045em]">
            {hero.title.map((line, li) => (
              <span key={line} className="block">
                {line.split(" ").map((w, wi) => (
                  <span key={wi} className="word-in inline-block" style={{ ["--d" as string]: `${150 + (li * 2 + wi) * 110}ms` }}>
                    {w}
                    {wi < line.split(" ").length - 1 ? "\u00a0" : ""}
                  </span>
                ))}
              </span>
            ))}
          </h1>
          <p className="hero-in mt-6 max-w-xl text-pretty text-[clamp(1rem,1.5vw,1.3rem)] font-medium leading-snug text-fg/90" style={{ ["--d" as string]: "650ms" }}>
            {hero.sub}
          </p>
          <div className="hero-in mt-9 flex flex-wrap justify-center gap-3" style={{ ["--d" as string]: "850ms" }}>
            <a href={ctas.bookDemo} className="btn-primary btn-lg">
              Book a demo <span aria-hidden="true">↗</span>
            </a>
            <a href="#work" className="btn-ghost btn-lg glass">
              See the work
            </a>
          </div>
          <p className="hero-in mt-7 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted" style={{ ["--d" as string]: "1000ms" }}>
            <span>Windows 10/11 beta</span>
            <span aria-hidden="true" className="text-line">|</span>
            <span>{tools.filter((t) => t.status === "Available").map((t) => t.name).join(", ").replace(/, ([^,]*)$/, " and $1")} available</span>
          </p>
        </div>

        {/* scroll-scrubbed statements */}
        {intro.phrases.map((ph, i) => (
          <div
            key={ph.text}
            ref={(el) => {
              phraseRefs.current[i] = el;
            }}
            className="pointer-events-none absolute left-1/2 top-[21%] w-[min(90vw,40rem)] text-center opacity-0 md:top-1/2"
          >
            <p className="phrase text-balance text-[clamp(1.9rem,4vw,3.6rem)] font-semibold leading-[1.04] tracking-[-0.04em]">
              {ph.text.split(" ").map((w, k) => (
                <span key={k} data-w className="inline-block opacity-[0.14]">
                  {w}&nbsp;
                </span>
              ))}
            </p>
            {ph.note && <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{ph.note}</p>}
          </div>
        ))}

        {/* progress pips + scroll hint */}
        <div className="pointer-events-none absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-2 md:flex" aria-hidden="true">
          {intro.phrases.map((ph, i) => (
            <span
              key={ph.text}
              ref={(el) => {
                pipRefs.current[i] = el;
              }}
              className="pip"
            />
          ))}
        </div>
        <div ref={hintRef} className="pointer-events-none absolute bottom-7 left-1/2 -translate-x-1/2 font-mono text-[11px] uppercase tracking-[0.22em] text-muted">
          Scroll <span className="inline-block animate-bounce">↓</span>
        </div>
      </div>
    </section>
  );
}
