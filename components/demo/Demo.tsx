"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ctas } from "@/lib/content";
import { Logo } from "../Logo";
import { DemoCanvas } from "../Lazy3D";
import { demo } from "./copy";
import { BUILD, CHAPTERS, CHECK, OUTRO, WIN, chapterAt, ease, lerp, lin } from "./timeline";
import type { DemoLabels } from "./demoScene";

/* ---------- helpers ---------- */
const vis = (a: number, b: number, p: number, f = 0.012) => ease(a, a + f, p) * (1 - ease(b - f, b, p));
const tw = (text: string, a: number, b: number, p: number) => text.slice(0, Math.round(text.length * lin(a, b, p)));
const fade = (k: number, y = 10): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * y}px)` });

const STATIC_LINES = [
  "Describe the job in plain words.",
  "Review a step-by-step plan before anything runs.",
  "Your own rules and references are read first.",
  "Work is routed to the right tool, with your approval.",
  "The model is built in your software, station by station.",
  "Results are checked; issues are flagged and fixed with you.",
  "Inspect sections and details in place.",
  "Properties and a report are ready for review.",
];

export default function Demo() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced ? <DemoStatic /> : <DemoPinned />;
}

/* ---------- reduced-motion fallback: static chapter cards ---------- */
function DemoStatic() {
  return (
    <section id="demo" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28" aria-label="Product demo">
      <p className="eyebrow">Illustrative demo · sample data</p>
      <h2 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight md:text-6xl">Hull to structure, step by step.</h2>
      <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {CHAPTERS.map((c, i) => (
          <li key={c.n} className="rounded-3xl border border-line bg-card p-6">
            <p className="font-mono text-xs text-muted">
              {c.n} · {c.k.toUpperCase()}
            </p>
            <p className="mt-6 text-lg font-medium leading-snug tracking-tight">{STATIC_LINES[i]}</p>
          </li>
        ))}
      </ol>
      <div className="mt-12 flex flex-wrap items-center gap-3">
        <p className="mr-4 text-2xl font-semibold tracking-tight">{demo.outro}</p>
        <a href={ctas.bookDemo} className="btn-primary">Book a demo</a>
        <a href="#work" className="btn-ghost">Keep watching</a>
      </div>
    </section>
  );
}

/* ---------- pinned, scroll-scrubbed demo ---------- */
function DemoPinned() {
  const section = useRef<HTMLElement>(null);
  const progress = useMemo(() => ({ current: 0 }), []);
  const labels: DemoLabels = useMemo(() => ({ current: {} }), []);
  const [p, setP] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [playing, setPlaying] = useState(true);
  const userPaused = useRef(false);

  // scroll → progress
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const v = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      progress.current = v;
      setP(Math.round(v * 4000) / 4000);
      setPinned(r.top <= 1 && r.bottom >= window.innerHeight - 1);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [progress]);

  // autoplay: advances the page scroll while pinned, so scroll stays the single source of truth
  useEffect(() => {
    if (!playing || !pinned) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const tick = (now: number) => {
      const el = section.current;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (el && !document.hidden) {
        const total = el.offsetHeight - window.innerHeight;
        acc += (total / 75) * dt; // whole demo ≈ 75 s
        if (acc >= 1) {
          const step = Math.floor(acc);
          acc -= step;
          window.scrollTo({ top: window.scrollY + step, behavior: "instant" as ScrollBehavior });
        }
        if (progress.current >= 0.999) {
          setPlaying(false);
          return;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, pinned, progress]);

  // replay from the top if the user comes back after it finished (unless they paused it)
  useEffect(() => {
    if (p < 0.02 && !playing && !userPaused.current) setPlaying(true);
  }, [p, playing]);

  const toggle = () => {
    userPaused.current = playing;
    setPlaying((v) => !v);
  };

  const isActive = useCallback(() => progress.current > WIN.in[0] - 0.01 && progress.current < 0.985, [progress]);

  const ch = chapterAt(p);
  const chapter = CHAPTERS[ch];
  const winK = ease(WIN.in[0], WIN.in[1], p);
  const outro = ease(OUTRO, OUTRO + 0.03, p);

  return (
    <section ref={section} id="demo" className="relative h-[1000vh]" aria-label="Illustrative product demo: hull to structure">
      <div className="sticky top-0 h-svh overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,#0d0d0e_0%,#000_70%)]" />

        {/* chapter header */}
        <div className="absolute left-5 top-[86px] z-10 flex items-baseline gap-3 md:left-10 md:top-[96px]" style={{ opacity: 1 - outro }}>
          <span className="font-mono text-2xl font-medium tabular-nums text-fg md:text-3xl">{chapter.n}</span>
          <span key={chapter.k} className="chapter-swap font-mono text-xs uppercase tracking-[0.2em] text-muted">
            {chapter.k}
          </span>
        </div>
        <p className="absolute right-5 top-[92px] z-10 hidden font-mono text-[11px] uppercase tracking-[0.14em] text-muted/80 md:right-10 md:top-[102px] md:block" style={{ opacity: 1 - outro }}>
          Illustrative demo · sample data
        </p>

        {/* stage */}
        <div className="absolute inset-x-0 bottom-[78px] top-[128px] flex items-center justify-center px-3 md:bottom-[84px] md:top-[140px]">
          {/* card phase */}
          <div className="relative h-full w-[min(560px,94vw)]" style={{ opacity: 1 - ease(0.285, 0.305, p), transform: `scale(${1 + ease(0.285, 0.31, p) * 0.15})` }}>
            <ChatCard p={p} />
            <ResearchCard p={p} />
            <GraphCard p={p} />
          </div>

          {/* workspace window */}
          <div
            className="absolute inset-y-0 left-1/2 w-[min(1240px,96vw)]"
            style={{ opacity: winK * (1 - outro), transform: `translateX(-50%) scale(${lerp(0.6, 1, winK)})`, pointerEvents: winK > 0.5 ? "auto" : "none" }}
          >
            <Workspace p={p} labels={labels}>
              <DemoCanvas progress={progress} labels={labels} isActive={isActive} />
            </Workspace>
          </div>
        </div>

        {/* outro */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black px-6 text-center" style={{ opacity: outro, pointerEvents: outro > 0.6 ? "auto" : "none" }}>
          <p className="text-balance text-[clamp(2.2rem,5vw,4.5rem)] font-semibold tracking-[-0.04em]" style={fade(ease(0.94, 0.965, p), 20)}>
            {demo.outro}
          </p>
          <p className="mt-4 text-muted" style={fade(ease(0.95, 0.975, p), 14)}>
            That was an illustrative demo with sample data. The recordings below show real project work.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3" style={fade(ease(0.955, 0.98, p), 14)}>
            <a href={ctas.bookDemo} className="btn-primary btn-lg">Book a demo</a>
            <a href="#work" className="btn-ghost btn-lg">Keep watching ↓</a>
          </div>
        </div>

        {/* bottom control */}
        <div
          className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-2 transition-opacity duration-300"
          style={{ opacity: pinned && p < 0.995 ? 1 : 0, pointerEvents: pinned ? "auto" : "none" }}
        >
          <button type="button" onClick={toggle} className="flex items-center gap-2.5 rounded-full bg-fg py-1.5 pl-1.5 pr-4 text-sm font-semibold text-black shadow-[0_10px_40px_rgba(0,0,0,0.6)]" aria-label={playing ? "Pause demo" : "Play demo"}>
            <span className="flex size-7 items-center justify-center rounded-full bg-black text-fg">
              {playing ? (
                <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true"><path d="M4 3h3v10H4zM9 3h3v10H9z" /></svg>
              ) : (
                <svg viewBox="0 0 16 16" className="ml-0.5 size-3" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
              )}
            </span>
            {playing ? "Pause" : "Play"}
          </button>
          <div className="glass hidden items-center gap-1 rounded-full px-3 py-2.5 sm:flex" aria-hidden="true">
            {CHAPTERS.map((c, i) => (
              <span key={c.n} className="relative h-0.5 w-5 overflow-hidden rounded-full bg-line">
                <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${lin(c.a, c.b, p) * 100}%` }} />
                {i === ch && <span className="sr-only">{c.k}</span>}
              </span>
            ))}
          </div>
          <span className="glass whitespace-nowrap rounded-full px-3.5 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Scroll <span className="inline-block animate-bounce">↓</span>
          </span>
        </div>
      </div>
    </section>
  );
}

/* ---------- 01 + 02: chat with typewriter + plan checklist ---------- */
function ChatCard({ p }: { p: number }) {
  const k = vis(0, 0.165, p);
  const typingUser = p > 0.004 && p < 0.04;
  const thinking = p >= 0.04 && p < 0.046;
  const reply = tw(demo.reply, 0.046, 0.072, p);
  return (
    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2" style={{ opacity: k }}>
      <div className="overflow-hidden rounded-3xl border border-line bg-[#0b0b0c]/95 shadow-[0_40px_120px_-30px_rgba(0,0,0,0.9)]">
        <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Logo className="size-4" /> Vector OS
            <span className="text-muted">/ {demo.project}</span>
          </div>
          <span className="rounded-full border border-line px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">Project</span>
        </div>
        <div className="space-y-4 px-5 py-5 text-[14px] leading-relaxed md:text-[15px]">
          <div className="flex justify-end">
            <p className="max-w-[85%] rounded-2xl rounded-br-md bg-card-2 px-4 py-2.5 text-fg">
              {tw(demo.prompt, 0.004, 0.04, p)}
              {typingUser && <span className="caret" />}
            </p>
          </div>
          <div className="flex gap-3" style={{ opacity: p > 0.04 ? 1 : 0 }}>
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-fg text-black"><Logo className="size-3" /></span>
            <div className="min-w-0 flex-1">
              {thinking ? (
                <span className="dots text-muted" aria-label="Thinking"><i /><i /><i /></span>
              ) : (
                <p className="text-fg/90">
                  {reply}
                  {p >= 0.046 && p < 0.072 && <span className="caret" />}
                </p>
              )}
              <ul className="mt-3 space-y-2">
                {demo.plan.map((item, i) => {
                  const show = ease(0.074 + i * 0.011, 0.082 + i * 0.011, p);
                  const done = p > 0.105 + i * 0.009;
                  if (show <= 0) return null;
                  return (
                    <li key={item} className="flex items-center gap-2.5" style={fade(show, 6)}>
                      <span className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors duration-300 ${done ? "border-fg bg-fg text-black" : "border-line"}`}>
                        {done && (
                          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2.5 6.2 5 8.5 9.5 3.5" /></svg>
                        )}
                      </span>
                      <span className={`transition-colors duration-300 ${done ? "text-fg" : "text-muted"}`}>{item}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-4 flex gap-2" style={{ ...fade(ease(0.14, 0.148, p), 6), display: p > 0.14 ? "flex" : "none" }}>
                <span className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors duration-300 ${p > 0.152 ? "bg-fg text-black" : "border border-line text-fg"}`}>
                  {p > 0.152 ? "Plan approved ✓" : "Approve plan"}
                </span>
                <span className="rounded-full border border-line px-3.5 py-1.5 text-xs text-muted">Edit</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- 03: standards / references ---------- */
function ResearchCard({ p }: { p: number }) {
  const k = vis(0.16, 0.235, p);
  const bar = lin(0.165, 0.222, p);
  return (
    <div className="absolute inset-x-0 top-1/2" style={{ opacity: k, transform: `translateY(-50%) scale(${lerp(0.96, 1, ease(0.16, 0.175, p))})` }}>
      <div className="overflow-hidden rounded-3xl border border-line bg-[#0b0b0c]/95">
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className={`size-4 rounded-full border-2 border-line ${bar < 1 ? "border-t-fg animate-spin" : "border-fg bg-fg"}`} aria-hidden="true" />
          <p className="text-sm font-medium">{bar < 1 ? "Reading project standards…" : "Standards checked"}</p>
          <span className="ml-auto font-mono text-[11px] text-muted">{Math.round(bar * 3)}/3</span>
        </div>
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2 rounded-xl border border-line bg-black px-3 py-2.5 font-mono text-[12px] text-fg/90">
            <svg viewBox="0 0 16 16" className="size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
            {tw(demo.research.query, 0.166, 0.182, p)}
            {p < 0.182 && <span className="caret" />}
          </div>
          <div className="mt-3 h-px w-full bg-line"><div className="h-px bg-fg" style={{ width: `${bar * 100}%` }} /></div>
        </div>
        <ul className="space-y-2 px-5 py-4">
          {demo.research.sources.map((s, i) => {
            const show = ease(0.184 + i * 0.012, 0.192 + i * 0.012, p);
            return (
              <li key={s.name} className="flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3" style={fade(show, 8)}>
                <svg viewBox="0 0 20 20" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true"><path d="M5 2.5h7l3.5 3.5v11.5H5z" /><path d="M12 2.5V6h3.5M7.5 10h5M7.5 13h5" /></svg>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p className="truncate text-xs text-muted">{s.meta}</p>
                </div>
                <span className="hidden shrink-0 rounded-full bg-fg/10 px-2.5 py-1 font-mono text-[11px] text-fg sm:inline">{s.hit}</span>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-line px-5 py-3 text-xs text-muted">Only the sources you provide. Nothing changes in your tools yet.</p>
      </div>
    </div>
  );
}

/* ---------- 04: connect / routing graph ---------- */
function GraphCard({ p }: { p: number }) {
  const k = vis(0.226, 0.31, p);
  const e1 = lin(0.236, 0.252, p);
  const e2 = lin(0.256, 0.272, p);
  const e3 = lin(0.274, 0.288, p);
  const approved = p > 0.254;
  const edge = (d: string, len: number, t: number, dashed = false) => (
    <>
      <path d={d} fill="none" stroke="#303033" strokeWidth="1.5" strokeDasharray={dashed ? "5 5" : undefined} />
      <path d={d} fill="none" stroke="#f4f4f5" strokeWidth="1.5" strokeDasharray={`${len}`} strokeDashoffset={len * (1 - t)} />
      {t >= 1 && (
        <circle r="3.5" fill="#fff">
          <animateMotion dur="1.4s" repeatCount="indefinite" path={d} />
        </circle>
      )}
    </>
  );
  const node = (x: number, y: number, title: string, sub: string, on: boolean, icon?: ReactNode) => (
    <g transform={`translate(${x} ${y})`} style={{ opacity: on ? 1 : 0.35, transition: "opacity .4s" }}>
      <rect x="-62" y="-30" width="124" height="60" rx="16" fill="#101010" stroke={on ? "#f4f4f5" : "#303033"} />
      {icon}
      <text x={icon ? 4 : 0} y="-3" textAnchor="middle" fill="#f4f4f5" fontSize="13" fontWeight="600">{title}</text>
      <text x={icon ? 4 : 0} y="14" textAnchor="middle" fill="#a1a1aa" fontSize="9.5" fontFamily="ui-monospace, monospace" letterSpacing="0.6">{sub}</text>
    </g>
  );
  return (
    <div className="absolute inset-x-0 top-1/2" style={{ opacity: k, transform: `translateY(-50%) scale(${lerp(0.96, 1, ease(0.226, 0.24, p))})` }}>
      <div className="rounded-3xl border border-line bg-[#0b0b0c]/95 p-4 md:p-6">
        <svg viewBox="0 0 560 300" className="h-auto w-full" role="img" aria-label="Vector OS routes the approved plan to Maxsurf, then the hull to Rhino">
          {edge("M142 150 H218", 76, e1)}
          {edge("M342 150 C 380 150, 380 80, 398 80", 110, e2)}
          {edge("M460 110 V190", 80, e3)}
          <text x="180" y="138" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">plan</text>
          <text x="352" y="104" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">stations</text>
          <text x="498" y="154" textAnchor="start" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">hull</text>
          <g transform="translate(80 150)">
            <rect x="-62" y="-30" width="124" height="60" rx="16" fill="#f4f4f5" />
            <path transform="translate(-52 -10) scale(0.026)" d="M 252 338 L 453 338 C 472 338 488 349 498 367 L 706 796 C 718 819 721 835 716 855 C 713 875 706 891 693 911 L 656 968 C 650 977 647 981 640 981 C 612 981 585 961 568 929 L 252 338 Z M 999 409 L 839 409 C 823 409 815 420 807 436 L 667 666 C 662 676 662 683 667 694 L 715 789 C 726 811 733 836 721 863 L 999 409 Z" fill="#000" />
            <text x="14" y="5" textAnchor="middle" fill="#000" fontSize="13" fontWeight="700">Vector OS</text>
          </g>
          {node(280, 150, approved ? "Approved ✓" : "Your approval", "BEFORE NATIVE WORK", e1 >= 1)}
          {node(460, 80, "Maxsurf", "AVAILABLE", e2 > 0)}
          {node(460, 220, "Rhino", "AVAILABLE", e3 > 0)}
        </svg>
        <p className="mt-2 text-center text-xs text-muted">Connector status from the Vector OS software directory. Availability depends on your build.</p>
      </div>
    </div>
  );
}

/* ---------- 05–08: workspace window ---------- */
function Workspace({ p, labels, children }: { p: number; labels: DemoLabels; children: ReactNode }) {
  const ch = chapterAt(p);
  const stepKeys = ["05", "06", "07", "08"];
  const activeStep = stepKeys[Math.max(0, ch - 4)];
  const framesBuilt = Math.min(18, Math.floor(lin(...BUILD.frames, p) * 19.5));
  const layersOn = [BUILD.grid[0], BUILD.keel[0], BUILD.frames[0], BUILD.longs[0], BUILD.shell[0]].map((a) => p > a);
  const setLabel = (k: string) => (el: HTMLDivElement | null) => {
    labels.current[k] = el;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-[#070707] shadow-[0_50px_160px_-40px_rgba(0,0,0,1)]">
      {/* title bar */}
      <div className="flex items-center gap-3 border-b border-line bg-[#0c0c0d] px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#2a2a2d]" /><span className="size-2.5 rounded-full bg-[#2a2a2d]" /><span className="size-2.5 rounded-full bg-[#2a2a2d]" />
        </div>
        <div className="flex min-w-0 items-center gap-2 text-xs md:text-[13px]">
          <Logo className="size-3.5 shrink-0" />
          <span className="truncate font-medium">Vector workspace</span>
          <span className="hidden truncate text-muted sm:inline">— {demo.project}</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em]">
          <span className={`rounded-md border px-2 py-0.5 ${p < BUILD.frames[0] ? "border-fg text-fg" : "border-line text-muted"}`}>Maxsurf</span>
          <span className="text-muted">→</span>
          <span className={`rounded-md border px-2 py-0.5 ${p >= BUILD.frames[0] ? "border-fg text-fg" : "border-line text-muted"}`}>Rhino</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* step sidebar */}
        <aside className="relative shrink-0 border-b border-line bg-[#0a0a0b] px-5 py-4 md:w-64 md:border-b-0 md:border-r md:px-6 md:py-7">
          <div className="relative h-[88px] md:h-[210px]">
            {stepKeys.map((k) => {
              const s = demo.steps[k];
              const on = k === activeStep;
              return (
                <div key={k} className="absolute inset-0 transition-all duration-500" style={{ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : 12}px)` }} aria-hidden={!on}>
                  <p className="font-mono text-[11px] text-muted">STEP {k}</p>
                  <h3 className="mt-1.5 text-lg font-semibold leading-tight tracking-tight md:mt-3 md:text-2xl">{s.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-snug text-muted md:mt-3 md:text-sm md:leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>
          <ol className="mt-6 hidden space-y-2.5 md:block">
            {stepKeys.map((k, i) => (
              <li key={k} className={`flex items-center gap-3 text-sm transition-colors ${k === activeStep ? "text-fg" : "text-muted/60"}`}>
                <span className="relative h-px w-6 overflow-hidden bg-line">
                  <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${lin(CHAPTERS[4 + i].a, CHAPTERS[4 + i].b, p) * 100}%` }} />
                </span>
                {CHAPTERS[4 + i].k}
              </li>
            ))}
          </ol>
        </aside>

        {/* viewport */}
        <div className="relative min-h-0 flex-1 bg-[radial-gradient(ellipse_at_50%_30%,#141416_0%,#060606_75%)]">
          {children}

          {/* anchored labels (positioned by the scene) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            <Anchor refFn={setLabel("flag")} text="Station 9 · spacing 1.29 m > 0.70 m" strong />
            <Anchor refFn={setLabel("shell")} text="Shell plate · 6 mm" />
            <Anchor refFn={setLabel("web")} text="Frame web · 150 × 8 + flange" />
            <Anchor refFn={setLabel("stiff")} text="Stiffener · L 75 × 50 × 6" below />
            <Anchor refFn={setLabel("keel")} text="Keel bar" below />
          </div>

          {/* layers + properties */}
          <div className="absolute left-3 top-3 hidden w-52 overflow-hidden rounded-xl border border-line bg-black/70 text-xs backdrop-blur md:block">
            <p className="border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Layers</p>
            <ul className="space-y-1.5 px-3 py-2.5">
              {demo.layers.map((l, i) => (
                <li key={l} className={`flex items-center justify-between transition-colors duration-300 ${layersOn[i] ? "text-fg" : "text-muted/50"}`}>
                  <span className="flex items-center gap-2">
                    <span className={`size-1.5 rounded-full ${layersOn[i] ? "bg-fg" : "bg-line"}`} />
                    {l}
                  </span>
                  {l === "Frames" && layersOn[i] && <span className="font-mono text-[10px] text-muted">{framesBuilt + (p > CHECK.fix[1] ? 1 : 0)}</span>}
                </li>
              ))}
            </ul>
            <div className={`grid transition-[grid-template-rows] duration-500 ${p > 0.815 ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
            <div className="overflow-hidden">
            <p className="border-y border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">Properties</p>
            <dl className="space-y-1.5 px-3 py-2.5">
              {demo.props.map(([k2, v], i) => {
                const filled = p > 0.83 + i * 0.012;
                return (
                  <div key={k2} className="flex items-center justify-between gap-2">
                    <dt className="text-muted">{k2}</dt>
                    <dd className={`truncate font-mono text-[11px] transition-all duration-500 ${filled ? "text-fg" : "text-muted/40"}`}>
                      {filled ? v : <span className="inline-block h-2 w-10 rounded bg-line/70 align-middle" />}
                    </dd>
                  </div>
                );
              })}
            </dl>
            </div>
            </div>
          </div>

          {/* status line + mobile chip */}
          <p className="absolute bottom-3 left-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted/80">
            Rhino · sample data · {p < CHECK.fix[1] ? `${framesBuilt}/19 frames` : "19/19 frames"}
          </p>
          <div className="absolute bottom-3 right-3 hidden gap-1 rounded-lg border border-line bg-black/60 p-1 md:flex" aria-hidden="true">
            {["M3 8h10M8 3v10", "M2 12 8 4l6 8", "M3 3h10v10H3z"].map((d) => (
              <span key={d} className="flex size-7 items-center justify-center rounded-md text-muted">
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d={d} /></svg>
              </span>
            ))}
          </div>
        </div>

        {/* assistant panel */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-line bg-[#0a0a0b] lg:flex">
          <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-xs font-medium">
            <Logo className="size-3.5" /> Assistant
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted"><span className="live-dot !size-1.5" />working</span>
          </p>
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden p-3 text-[13px] leading-snug">
            <Msg at={0.335} p={p}>
              Plan approved. Building in Rhino…
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-fg" style={{ width: `${(framesBuilt / 18) * 100}%` }} /></div>
              <p className="mt-1 font-mono text-[10px] text-muted">Frames {framesBuilt} / 18 · station 9 pending</p>
            </Msg>
            <Msg at={0.53} p={p}>Shell generated. Running checks against your rule set…</Msg>
            <Msg at={0.59} p={p} flag>
              <p className="font-medium">Station 9 · frame spacing 1.29 m exceeds your 0.70 m rule.</p>
              <p className="mt-1 text-muted">Proposed fix: add a frame at station 9.</p>
              <div className="mt-2 flex gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${p > 0.625 ? "bg-fg text-black" : "border border-line"}`}>Approve</span>
                <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">Skip</span>
              </div>
            </Msg>
            <Msg at={0.625} p={p} user>Approve</Msg>
            <Msg at={0.66} p={p}>Fixed. Spacing is 0.65 m at every station. ✓</Msg>
            <Msg at={0.725} p={p}>Section at station 6: shell 6 mm, frame web 150 × 8, L 75 × 50 × 6 stiffeners.</Msg>
            <Msg at={0.845} p={p}>
              <p className="font-medium">Review report</p>
              <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-muted">
                <li className="flex justify-between"><span>Frame spacing</span><span className="text-fg">✓</span></li>
                <li className="flex justify-between"><span>Plate minimums</span><span className="text-fg">✓</span></li>
                <li className="flex justify-between"><span>Fixes applied</span><span className="text-fg">1</span></li>
                <li className="flex justify-between"><span>Frames</span><span className="text-fg">19</span></li>
              </ul>
              <span className="mt-2 inline-block rounded-full bg-fg px-2.5 py-1 text-[11px] font-semibold text-black">Open report</span>
            </Msg>
          </div>
          <div className="m-3 mt-0 rounded-xl border border-line px-3 py-2.5 text-xs text-muted/70">Ask anything about this project…</div>
        </aside>
      </div>
    </div>
  );
}

function Msg({ at, p, children, user, flag }: { at: number; p: number; children: ReactNode; user?: boolean; flag?: boolean }) {
  const k = ease(at, at + 0.01, p);
  if (k <= 0) return null;
  return (
    <div className={`rounded-xl px-3 py-2.5 ${user ? "self-end bg-card-2" : flag ? "border border-fg/60 bg-[#121213]" : "border border-line bg-[#101011]"}`} style={fade(k, 8)}>
      {flag && <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg">⚠ Self-check</p>}
      {children}
    </div>
  );
}

function Anchor({ refFn, text, strong, below }: { refFn: (el: HTMLDivElement | null) => void; text: string; strong?: boolean; below?: boolean }) {
  return (
    <div ref={refFn} className="absolute left-0 top-0 opacity-0">
      <div className="relative">
        <span className="absolute -left-1 -top-1 size-2 rounded-full bg-fg shadow-[0_0_10px_#fff]" />
        <span className="absolute left-0 top-0 h-px w-8 origin-left -rotate-[30deg] bg-fg/70" />
        <span className={`anchor-label absolute left-7 whitespace-nowrap ${below ? "top-[10px]" : "top-[-26px]"} rounded-md px-2 py-1 font-mono text-[11px] ${strong ? "bg-fg text-black" : "border border-line bg-black/80 text-fg"}`}>{text}</span>
      </div>
    </div>
  );
}
