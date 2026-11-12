"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ctas, recordings } from "@/lib/content";
import { Logo } from "../Logo";
import { DemoCanvas } from "../Lazy3D";
import { TRACK_UI, demo } from "./copy";
import { CHAPTERS, OUTRO, TRACKS, WIN, cardClock, chapterAt, ease, lerp, lin, localQ, pageAt, trackAt, type TrackId } from "./timeline";
import { ANCHOR_TEXT, GRID, STEPS, gridKey, qAt } from "./tracks/meta";
import { ToolLogo } from "../ToolLogo";
import type { DemoLabels } from "./demoScene";

/* ---------- helpers ---------- */
const vis = (a: number, b: number, p: number, f = 0.012) => ease(a, a + f, p) * (1 - ease(b - f, b, p));
const tw = (text: string, a: number, b: number, p: number) => text.slice(0, Math.round(text.length * lin(a, b, p)));
const fade = (k: number, y = 10): CSSProperties => ({ opacity: k, transform: `translateY(${(1 - k) * y}px)` });

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

/* ---------- reduced-motion fallback: static track cards ---------- */
function DemoStatic() {
  return (
    <section id="demo" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-28" aria-label="Product demo">
      <p className="eyebrow">Illustrative demo · sample data</p>
      <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">Three projects, step by step.</h2>
      <p className="mt-4 max-w-2xl text-muted">Ask, plan, check your references and connect your tools. Then each job is built in place, checked and reviewed.</p>
      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {TRACKS.map((t) => (
          <div key={t.id} className="rounded-3xl border border-line bg-card p-6">
            <div className="flex items-center justify-between">
              <p className="text-lg font-semibold">{t.label}</p>
              <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                {t.id === "mech" ? "SOLIDWORKS · recorded" : <><ToolLogo name="Rhino" className="size-3.5" /> Rhino</>}
              </span>
            </div>
            <p className="mt-1 font-mono text-[11px] text-muted">{TRACK_UI[t.id].file}</p>
            <ol className="mt-5 space-y-3">
              {STEPS[t.id].map((s, i) => (
                <li key={`${s.title}-${i}`} className="flex gap-3 text-sm">
                  <span className="font-mono text-[11px] text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-fg/90">{s.title}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
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
        acc += (total / 175) * dt; // whole demo ≈ 175 s (each recording-matched track ≈ 39 s)
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
  useEffect(() => {
    const pause = () => {
      userPaused.current = true;
      setPlaying(false);
    };
    window.addEventListener("vector:demo-pause", pause);
    return () => window.removeEventListener("vector:demo-pause", pause);
  }, []);

  const isActive = useCallback(() => progress.current > WIN.in[0] - 0.01 && progress.current < 0.985, [progress]);

  const pc = cardClock(p);
  const seek = useCallback((i: number) => {
    const el = section.current;
    if (!el) return;
    const total = el.offsetHeight - window.innerHeight;
    const top = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: top + total * pageAt(i, 0.004), behavior: "instant" as ScrollBehavior });
  }, []);

  const ch = chapterAt(p);
  const chapter = CHAPTERS[ch];
  const winK = ease(WIN.in[0], WIN.in[1], p);
  const outro = ease(OUTRO, OUTRO + 0.03, p);

  return (
    <section ref={section} id="demo" className="relative h-[2000vh]" aria-label="Illustrative product demo: hull, façade and mechanical assembly">
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
          <div className="relative h-full w-[min(560px,94vw)]" style={{ opacity: 1 - ease(0.285, 0.305, pc), transform: `scale(${1 + ease(0.285, 0.31, pc) * 0.15})`, visibility: pc > 0.32 ? "hidden" : "visible" }}>
            <ChatCard p={pc} />
            <ResearchCard p={pc} />
            <GraphCard p={pc} />
          </div>

          {/* workspace window */}
          <div
            className="absolute inset-y-0 left-1/2 w-[min(1240px,96vw)]"
            style={{ opacity: winK * (1 - outro), transform: `translateX(-50%) scale(${lerp(0.6, 1, winK)})`, pointerEvents: winK > 0.5 ? "auto" : "none" }}
          >
            <Workspace p={p} labels={labels} seek={seek}>
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
        {/* small screens: the same routing as a vertical flow with readable type */}
        <div className="md:hidden" aria-hidden="true">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 items-center gap-1.5 rounded-xl bg-fg px-3 text-[13px] font-bold text-black"><Logo className="size-3.5" />Vector OS</span>
            <span className="relative h-px flex-1 bg-[#303033]"><span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${e1 * 100}%` }} /></span>
            <span className={`rounded-xl border px-3 py-1.5 text-center transition-colors ${e1 >= 1 ? "border-fg" : "border-[#303033] opacity-50"}`}>
              <span className="block text-[13px] font-semibold">{approved ? "Approved ✓" : "Your approval"}</span>
              <span className="block font-mono text-[11px] text-muted">before native work</span>
            </span>
          </div>
          <ul className="mt-3 space-y-2 border-l border-[#303033] pl-4">
            {([["Maxsurf", "hull", "Available", e2], ["Rhino", "façade", "Available", e2], ["SOLIDWORKS", "assembly", "Recorded project", e3]] as [string, string, string, number][]).map(([n, job, st, t]) => (
              <li key={n} className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-opacity ${t > 0 ? "border-line opacity-100" : "border-[#303033] opacity-40"}`}>
                <span>
                  <span className="block text-[13px] font-semibold">{n}</span>
                  <span className="block font-mono text-[11px] text-muted">{job}</span>
                </span>
                <span className={`font-mono text-[11px] uppercase ${st === "Available" ? "text-fg" : "text-muted"}`}>{st}</span>
              </li>
            ))}
          </ul>
        </div>
        <svg viewBox="0 0 560 300" className="hidden h-auto w-full md:block" role="img" aria-label="Vector OS routes the approved plan to Maxsurf and Rhino; the SOLIDWORKS job is a recorded project">
          {edge("M142 150 H218", 76, e1)}
          {edge("M342 150 C 372 150, 372 56, 398 56", 130, e2)}
          {edge("M342 150 H398", 56, e2)}
          {edge("M342 150 C 372 150, 372 244, 398 244", 130, e3, true)}
          <text x="180" y="138" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">plan</text>
          <text x="366" y="92" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">hull</text>
          <text x="372" y="143" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">façade</text>
          <text x="364" y="216" textAnchor="middle" fill="#a1a1aa" fontSize="10" fontFamily="ui-monospace, monospace">assembly</text>
          <g transform="translate(80 150)">
            <rect x="-62" y="-30" width="124" height="60" rx="16" fill="#f4f4f5" />
            <path transform="translate(-52 -10) scale(0.026)" d="M 252 338 L 453 338 C 472 338 488 349 498 367 L 706 796 C 718 819 721 835 716 855 C 713 875 706 891 693 911 L 656 968 C 650 977 647 981 640 981 C 612 981 585 961 568 929 L 252 338 Z M 999 409 L 839 409 C 823 409 815 420 807 436 L 667 666 C 662 676 662 683 667 694 L 715 789 C 726 811 733 836 721 863 L 999 409 Z" fill="#000" />
            <text x="14" y="5" textAnchor="middle" fill="#000" fontSize="13" fontWeight="700">Vector OS</text>
          </g>
          {node(280, 150, approved ? "Approved ✓" : "Your approval", "BEFORE NATIVE WORK", e1 >= 1)}
          {node(460, 56, "Maxsurf", "AVAILABLE", e2 > 0, <text x="-44" y="5" textAnchor="middle" fill="#f4f4f5" fontSize="10" fontWeight="700">MS</text>)}
          {node(460, 150, "Rhino", "AVAILABLE", e2 > 0, <image href="/logos/rhino.svg" x="-54" y="-10" width="20" height="20" style={{ filter: "brightness(0) invert(1)" }} />)}
          {node(460, 244, "SOLIDWORKS", "RECORDED PROJECT", e3 > 0)}
        </svg>
        <p className="mt-3 text-center text-[12px] text-muted md:mt-2 md:text-xs">Connector status from the Vector OS software directory. SOLIDWORKS appears as a recorded project, not a listed connector.</p>
      </div>
    </div>
  );
}

/* ---------- 05–08: workspace window with three tracks ---------- */
function Badge({ on, children }: { on: boolean; children: ReactNode }) {
  return (
    <span className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 transition-colors duration-300 ${on ? "border-fg text-fg" : "border-line text-muted"}`}>{children}</span>
  );
}

function Workspace({ p, labels, seek, children }: { p: number; labels: DemoLabels; seek: (i: number) => void; children: ReactNode }) {
  const ti = trackAt(p);
  const t = TRACKS[ti];
  const q = localQ(p, ti);
  const ui = TRACK_UI[t.id];
  const steps = STEPS[t.id];
  let si = 0;
  steps.forEach((s, i) => {
    if (q >= s.q[0]) si = i;
  });
  const step = steps[si];
  const [rec, setRecState] = useState<TrackId | null>(null);
  const setRec = (id: TrackId | null) => {
    setRecState(id);
    if (id) window.dispatchEvent(new Event("vector:demo-pause"));
  };
  const recording = rec ? recordings[TRACKS.findIndex((x) => x.id === rec)] : null;
  // step list window: keep the current step in view (façade and mechanical have 19 and 25 steps)
  const W0 = Math.max(0, Math.min(steps.length - 7, si - 3));
  const ready = ease(0.9, 0.91, p);
  const setLabel = (k: string) => (el: HTMLElement | SVGElement | null) => {
    labels.current[k] = el;
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-[#070707] shadow-[0_50px_160px_-40px_rgba(0,0,0,1)]">
      {/* title bar */}
      <div className="flex items-center gap-3 border-b border-line bg-[#0c0c0d] px-3 py-2 md:px-4">
        <div className="hidden gap-1.5 sm:flex" aria-hidden="true">
          <span className="size-2.5 rounded-full bg-[#2a2a2d]" /><span className="size-2.5 rounded-full bg-[#2a2a2d]" /><span className="size-2.5 rounded-full bg-[#2a2a2d]" />
        </div>
        <div className="hidden min-w-0 items-center gap-2 text-[13px] lg:flex">
          <Logo className="size-3.5 shrink-0" />
          <span className="truncate font-medium">Vector workspace</span>
        </div>
        <div role="tablist" aria-label="Demo track" className="flex items-center gap-0.5 rounded-lg border border-line bg-black/60 p-0.5 md:mx-auto">
          {TRACKS.map((tr, i) => (
            <button
              key={tr.id}
              type="button"
              role="tab"
              aria-selected={i === ti}
              onClick={() => seek(i)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors duration-300 md:px-3.5 md:text-xs ${i === ti ? "bg-fg text-black" : "text-muted hover:text-fg"}`}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] md:ml-0">
          {/* recording label, as shown top-right in each recording */}
          <Badge on>
            {t.id === "mech" ? (
              <ToolLogo name="SOLIDWORKS" className="size-3.5" wordSize="5px" />
            ) : step.chip.startsWith("Maxsurf") ? (
              <ToolLogo name="Maxsurf" className="size-3.5" wordSize="6.5px" />
            ) : step.chip.startsWith("Vector") ? (
              <Logo className="size-3" />
            ) : (
              <ToolLogo name="Rhino" className="size-3.5" />
            )}
            <span key={step.chip} className="chapter-swap hidden normal-case tracking-normal sm:inline">{step.chip}</span>
          </Badge>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {/* step sidebar */}
        <aside className="relative shrink-0 border-b border-line bg-[#0a0a0b] px-4 py-3 md:w-64 md:border-b-0 md:border-r md:px-6 md:py-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted md:text-[10px] md:tracking-[0.14em]">{ui.file}</p>
          <div className="relative mt-1.5 h-[86px] md:mt-4 md:h-[176px]">
            {steps.map((s, i) => {
              const on = i === si;
              return (
                <div key={`${s.title}-${i}`} className="absolute inset-0 transition-all duration-500" style={{ opacity: on ? 1 : 0, transform: `translateY(${on ? 0 : i < si ? -10 : 10}px)` }} aria-hidden={!on}>
                  <p className="font-mono text-[11px] text-muted">
                    STEP {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
                  </p>
                  <h3 className="mt-1 text-base font-semibold leading-tight tracking-tight md:mt-2.5 md:text-xl">{s.title}.</h3>
                  <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted md:mt-2.5 md:line-clamp-none md:text-[13px] md:leading-relaxed">{s.body}</p>
                </div>
              );
            })}
          </div>
          <ol className="mt-4 hidden space-y-2 md:block">
            {steps.slice(W0, W0 + 7).map((s, j) => {
              const i = W0 + j;
              return (
              <li key={`${s.title}-${i}`} className={`flex items-center gap-3 text-[12.5px] leading-tight transition-colors ${i === si ? "text-fg" : i < si ? "text-muted" : "text-muted/45"}`}>
                <span className="relative h-px w-5 shrink-0 overflow-hidden bg-line">
                  <span className="absolute inset-y-0 left-0 bg-fg" style={{ width: `${lin(s.q[0], s.q[1], q) * 100}%` }} />
                </span>
                <span className="truncate">{s.title}</span>
              </li>
              );
            })}
          </ol>
          <button type="button" onClick={() => setRec(t.id)} className="mt-4 hidden items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-fg transition-colors hover:bg-white/5 md:inline-flex">
            <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
            Watch the real recording
          </button>
        </aside>

        {/* viewport */}
        <div ref={setLabel("vp")} data-light="0" className="demo-vp relative min-h-0 flex-1 overflow-hidden" style={{ background: "linear-gradient(180deg,#3f6464 0%,#3b5f5f 100%)" }}>
          {children}
          <div ref={setLabel("fade")} className="pointer-events-none absolute inset-0 bg-[#5a656f] opacity-0" />

          {/* anchored labels + grid labels (positioned by the scene) */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
            {Object.entries(ANCHOR_TEXT).map(([k, a]) => (
              <Anchor key={k} refFn={setLabel(k)} text={a.text} sub={a.sub} strong={a.strong} below={a.below} plain={a.plain} />
            ))}
            {(Object.keys(GRID) as TrackId[]).flatMap((id) =>
              GRID[id].labels.map((l, i) => (
                <div key={gridKey(id, i)} ref={setLabel(gridKey(id, i))} className="absolute left-0 top-0 opacity-0">
                  <span className="absolute -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] tracking-[0.08em] text-muted/80">{l[2]}</span>
                </div>
              )),
            )}
          </div>

          {/* view label (SOLIDWORKS recording shows one per shot) */}
          {step.view && ready < 0.5 && (
            <span key={step.view} className="chapter-swap absolute left-2 top-2 z-[1] rounded-md bg-white px-2.5 py-1 text-[12px] font-medium md:left-3 md:top-3 md:text-[11px] text-[#1f2328] shadow-sm">{step.view}</span>
          )}

          {/* model tree */}
          <div className="absolute left-3 top-12 hidden w-48 overflow-hidden rounded-xl border border-line bg-black/70 text-xs backdrop-blur md:block">
            <p className="flex items-center justify-between border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
              Model tree <span className="tabular-nums">{ui.tree.filter(([, a]) => q >= a).length}/{ui.tree.length}</span>
            </p>
            <ul className="space-y-1.5 px-3 py-2.5">
              {ui.tree.map(([l, a]) => {
                const on = q >= a;
                return (
                  <li key={l} className={`flex items-center gap-2 transition-colors duration-300 ${on ? "text-fg" : "text-muted/45"}`}>
                    <span className={`size-1.5 rounded-full transition-colors duration-300 ${on ? "bg-fg" : "bg-line"}`} />
                    {l}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* gizmo + view */}
          <div className="absolute right-3 top-3 hidden items-start gap-2 md:flex" aria-hidden="true">
            <span className="mt-1 hidden rounded-md border border-line bg-black/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted sm:inline">{t.id === "mech" ? "Shaded with edges" : t.id === "hull" && q < qAt("hull", 29.3) ? "Maxsurf · plan / profile" : "Perspective · rendered"}</span>
            <svg viewBox="0 0 48 48" className="size-12 rounded-full border border-line bg-black/60">
              <circle cx="24" cy="24" r="2" fill="#f4f4f5" />
              {(["x", "y", "z"] as const).map((a) => (
                <g key={a}>
                  <line ref={setLabel(`g${a}`)} x1="24" y1="24" x2="24" y2="24" stroke={a === "x" ? "#f4f4f5" : a === "y" ? "#a1a1aa" : "#71717a"} strokeWidth="1.6" strokeLinecap="round" />
                  <text ref={setLabel(`g${a}t`)} x="24" y="24" textAnchor="middle" fill="#a1a1aa" fontSize="7" fontFamily="ui-monospace, monospace">
                    {a === "y" ? "Z" : a === "z" ? "Y" : "X"}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          {/* stats card at the end of each track */}
          <div className="absolute bottom-12 right-3 hidden w-[200px] overflow-hidden md:block rounded-xl border border-line bg-black/75 text-xs backdrop-blur transition-all duration-500 md:bottom-14" style={{ opacity: q > 0.84 && ready < 0.5 ? 1 : 0, transform: `translateY(${q > 0.84 ? 0 : 10}px)` }}>
            <p className="border-b border-line px-3 py-2 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">{ui.summary}</p>
            <dl className="grid grid-cols-2 gap-x-3 gap-y-2 px-3 py-2.5">
              {ui.stats.map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] text-muted">{k}</dt>
                  <dd className="font-mono text-base tabular-nums text-fg">{v}</dd>
                </div>
              ))}
            </dl>
            {ui.note && <p className="border-t border-line px-3 py-2 text-[10px] leading-snug text-muted">{ui.note}</p>}
          </div>

          {/* 08 ready: summary across the three tracks */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" style={{ opacity: ready, pointerEvents: "none" }}>
            <div className="w-full max-w-xl rounded-2xl border border-line bg-[#0b0b0c] p-5 md:p-6" style={fade(ready, 14)}>
              <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted md:text-[10px]">Recorded project work · illustrative 3D</p>
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
                {TRACKS.map((tr) => (
                  <div key={tr.id} className="rounded-xl border border-line bg-card p-3">
                    <p className="text-sm font-semibold">{tr.label}</p>
                    <p className="mt-0.5 text-[12px] text-muted sm:hidden">{TRACK_UI[tr.id].summary}</p>
                    <ul className="mt-2 hidden space-y-1 font-mono text-[10.5px] text-muted sm:block">
                      {TRACK_UI[tr.id].stats.slice(0, 3).map(([k, v]) => (
                        <li key={k} className="flex justify-between gap-1"><span className="truncate">{k}</span><span className="text-fg">{v}</span></li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-[13px] text-muted">Three recorded workflows, rebuilt shot by shot in 3D. Engineering checks remain separate; you decide what happens next.</p>
            </div>
          </div>

          {/* small-screen caption panel (mirrors the active 3D callout) */}
          <div ref={setLabel("cap")} className="pointer-events-none absolute inset-x-2 bottom-2 flex gap-2 rounded-lg bg-[#1d1e22]/95 px-3 py-2 opacity-0 shadow-lg md:hidden" aria-hidden="true">
            <span className="w-0.5 shrink-0 rounded-full bg-white/80" />
            <span className="min-w-0">
              <span data-t className="block truncate text-[13px] font-semibold leading-tight text-white" />
              <span data-s className="mt-0.5 block truncate text-[12px] leading-tight text-[#b4b6bd]" />
            </span>
          </div>

          {/* the real recording, on demand */}
          {recording && (
            <div className="absolute inset-0 z-20 flex flex-col bg-black/95" role="dialog" aria-label={`Recording: ${recording.title}`}>
              <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2 text-xs">
                <span className="truncate"><span className="font-medium text-fg">{recording.title}</span> <span className="text-muted">· {recording.meta} · {recording.duration}</span></span>
                <button type="button" onClick={() => setRec(null)} className="rounded-full border border-line px-3 py-1 text-fg hover:bg-white/5">Back to the 3D rebuild</button>
              </div>
              <video key={recording.video} src={recording.video} poster={recording.poster} controls autoPlay playsInline className="min-h-0 w-full flex-1 bg-black object-contain" />
            </div>
          )}

          {/* status line: coordinates + scale bar */}
          <div className="vp-ink pointer-events-none absolute bottom-3 left-3 hidden items-end gap-4 md:flex font-mono text-[10px] text-muted/85" aria-hidden="true">
            <div>
              <div className="flex items-end gap-1.5">
                <span ref={setLabel("scale")} className="block h-1.5 border-x border-b border-current" style={{ width: 60 }} />
                <span ref={setLabel("scaleText")}>1 m</span>
              </div>
            </div>
            <span ref={setLabel("coord")} className="hidden tabular-nums md:inline" />
          </div>
          <button type="button" onClick={() => setRec(t.id)} aria-label="Watch the real recording" style={{ display: ready > 0.5 ? "none" : undefined }} className="absolute right-2 top-2 z-[2] flex items-center gap-1.5 rounded-full bg-black/75 px-2.5 py-1.5 text-[12px] text-fg md:hidden">
            <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" /></svg>
            Recording
          </button>
          <div className="absolute bottom-3 right-3 hidden gap-1 rounded-lg border border-line bg-black/60 p-1 md:flex" aria-hidden="true">
            {["M3 8h10M8 3v10", "M2 12 8 4l6 8", "M3 3h10v10H3z", "M8 2v12M2 8h12M4 4l8 8"].map((d) => (
              <span key={d} className="flex size-6 items-center justify-center rounded-md text-muted">
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d={d} /></svg>
              </span>
            ))}
          </div>
        </div>

        {/* assistant panel */}
        <aside className="hidden w-72 shrink-0 flex-col border-l border-line bg-[#0a0a0b] xl:flex">
          <p className="flex items-center gap-2 border-b border-line px-4 py-3 text-xs font-medium">
            <Logo className="size-3.5" /> Assistant
            <span className="ml-auto flex items-center gap-1.5 font-mono text-[10px] text-muted"><span className="live-dot !size-1.5" />{p > 0.9 ? "done" : "working"}</span>
          </p>
          <div className="flex min-h-0 flex-1 flex-col justify-end gap-2.5 overflow-hidden p-3 text-[13px] leading-snug">
            <Msg at={0.234} until={0.455} p={p}>Build running. Opening the hull in Maxsurf Modeler to review the profile and plan view.</Msg>
            <Msg at={pageAt(0, qAt("hull", 29.5))} until={0.455} p={p}>Transferred to Rhino. The hull becomes the reference for the next stage.</Msg>
            <Msg at={pageAt(0, qAt("hull", 37))} until={0.455} p={p} flag>
              <p className="font-medium">Vector requests a review</p>
              <p className="mt-1 text-muted">Review the working model before continuing.</p>
              <div className="mt-2 flex gap-1.5">
                <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${q > qAt("hull", 39) || ti > 0 ? "bg-fg text-black" : "border border-line"}`}>Continue</span>
                <span className="rounded-full border border-line px-2.5 py-1 text-[11px] text-muted">Stop</span>
              </div>
            </Msg>
            <Msg at={pageAt(0, qAt("hull", 39))} until={0.455} p={p} user>Continue</Msg>
            <Msg at={pageAt(0, qAt("hull", 45))} until={0.455} p={p}>
              Reference curves set the shape and deck levels. Building decks, frames and members…
              <div className="mt-2 h-1 overflow-hidden rounded-full bg-line"><div className="h-full bg-fg" style={{ width: `${lin(qAt("hull", 45), qAt("hull", 64), q) * 100 * (ti === 0 ? 1 : 0) + (ti > 0 ? 100 : 0)}%` }} /></div>
            </Msg>
            <Msg at={pageAt(0, qAt("hull", 90))} until={0.455} p={p}>Model ready for review. Engineering checks remain separate.</Msg>

            <Msg at={pageAt(1, qAt("facade", 5))} until={0.69} p={p}>Starting with the supplied architectural concept: curved façade runs and setting-out.</Msg>
            <Msg at={pageAt(1, qAt("facade", 15))} until={0.69} p={p}>Glazing modelled across the façade. Framing next: segmented mullions, between-mullion transoms.</Msg>
            <Msg at={pageAt(1, qAt("facade", 25))} until={0.69} p={p} flag>
              <p className="font-medium">Joint construction still pending</p>
              <p className="mt-1 text-muted">The original notes flag it, so it stays visible in the model.</p>
            </Msg>
            <Msg at={pageAt(1, qAt("facade", 82))} until={0.69} p={p}>Nominal build-up: 6 + 1.52 PVB + 6 + 16 air + 10 = 39.52 mm overall.</Msg>
            <Msg at={pageAt(1, qAt("facade", 103))} until={0.69} p={p}>Layers, stable physical IDs and quantity registers prepared. Connection detailing continues.</Msg>

            <Msg at={pageAt(2, qAt("mech", 6))} until={0.905} p={p}>Reading the license and displaying the verified source frame in SOLIDWORKS.</Msg>
            <Msg at={pageAt(2, qAt("mech", 22))} until={0.905} p={p} flag>
              <p className="font-medium">232 imported solid bodies reported</p>
              <p className="mt-1 text-muted">These are not newly created components.</p>
            </Msg>
            <Msg at={pageAt(2, qAt("mech", 56))} until={0.905} p={p}>Wheel assembly: separating wheel and brake components along the assembly direction.</Msg>
            <Msg at={pageAt(2, qAt("mech", 94))} until={0.905} p={p}>Back in the complete model: frame, body and rear-wing packaging in context.</Msg>

            <Msg at={0.905} p={p}>
              <p className="font-medium">Review report</p>
              <ul className="mt-1.5 space-y-1 font-mono text-[11px] text-muted">
                <li className="flex justify-between"><span>Hull · frame geometry</span><span className="text-fg">ready for review</span></li>
                <li className="flex justify-between"><span>Façade · component model</span><span className="text-fg">documented</span></li>
                <li className="flex justify-between"><span>Mechanical · assembly</span><span className="text-fg">reviewed</span></li>
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

function Msg({ at, until = 2, p, children, user, flag }: { at: number; until?: number; p: number; children: ReactNode; user?: boolean; flag?: boolean }) {
  const k = ease(at, at + 0.006, p);
  if (k <= 0 || p >= until) return null;
  return (
    <div className={`rounded-xl px-3 py-2.5 ${user ? "self-end bg-card-2" : flag ? "border border-fg/60 bg-[#121213]" : "border border-line bg-[#101011]"}`} style={fade(k, 8)}>
      {flag && <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-fg">Needs your attention</p>}
      {children}
    </div>
  );
}

function Anchor({ refFn, text, sub, strong, below, plain }: { refFn: (el: HTMLDivElement | null) => void; text: string; sub?: string; strong?: boolean; below?: boolean; plain?: boolean }) {
  if (plain)
    return (
      <div ref={refFn} className="absolute left-0 top-0 opacity-0">
        <span className={`absolute -translate-x-1/2 whitespace-nowrap font-mono text-[10px] font-semibold ${below ? "top-1" : "-top-5"} ${text === "Zero pt" ? "text-[#ff5a4f]" : text === "Stbd" ? "text-[#4ade80]" : "text-white"}`}>{text}</span>
      </div>
    );
  // recording-style callout: leader line to a dark card with a white bar, title and sub-line
  return (
    <div ref={refFn} className="absolute left-0 top-0 opacity-0">
      <div className="relative">
        <span className="absolute -left-[3px] -top-[3px] size-1.5 rounded-full bg-white ring-1 ring-black/40" />
        <span className={`anchor-line absolute left-0 top-0 h-px w-10 origin-left bg-white/80 ${below ? "rotate-[25deg]" : "-rotate-[25deg]"}`} />
        <span className={`anchor-label absolute left-9 ${below ? "top-[14px]" : "top-[-44px]"} flex gap-2 whitespace-nowrap rounded-md bg-[#1d1e22]/95 px-2.5 py-1.5 shadow-lg ${strong ? "ring-1 ring-white/50" : ""}`}>
          <span className="w-0.5 shrink-0 rounded-full bg-white/80" />
          <span>
            <span className="block text-[11.5px] font-semibold leading-tight text-white">{text}</span>
            {sub && <span className="mt-0.5 block text-[10px] leading-tight text-[#b4b6bd]">{sub}</span>}
          </span>
        </span>
      </div>
    </div>
  );
}
