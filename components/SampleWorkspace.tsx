"use client";

import { useEffect, useRef, useState } from "react";
import { Logo } from "./Logo";
import { ToolLogo } from "./ToolLogo";

/* Scripted website sample, ported from the interactive workspace on vectoros.one (copy and behaviour).
   Illustrations: frame + workboat line art from Vector's sample; bracket drawn for this site. No live AI or CAD. */

const PROJECTS = [
  { id: "frame", name: "Frame study", chat: "Refine the structure", host: "Rhino", request: "Add roof bracing. Keep the columns in place.", answer: "Roof bracing added to the sample. The columns and overall dimensions stay in place.", file: "frame-study.3dm", type: "Structural frame" },
  { id: "vessel", name: "Utility workboat", chat: "Review the deck", host: "Rhino", request: "Move the deck crane aft. Keep the hulls and wheelhouse.", answer: "The sample crane moves aft. The hulls, wheelhouse and working deck stay in place.", file: "deck-arrangement.3dm", type: "Marine design" },
  { id: "bracket", name: "Support bracket", chat: "Develop the detail", host: "Blender", request: "Add four mounting holes and two support ribs.", answer: "Four mounting holes and two support ribs are shown in the sample model.", file: "support-bracket.blend", type: "Component design" },
] as const;
type Pid = (typeof PROJECTS)[number]["id"];
type Mode = "Ask" | "Plan" | "Build";

export default function SampleWorkspace() {
  const [surface, setSurface] = useState<"design" | "project">("project");
  const [pid, setPid] = useState<Pid>("bracket");
  const [phase, setPhase] = useState(3);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<Mode>("Build");
  const [typed, setTyped] = useState<{ request: string; answer: string } | null>(null);
  const [bracket, setBracket] = useState<{ present: boolean; length: 80 | 120; details: boolean } | null>(null);
  const [reduced, setReduced] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const inView = useRef(false);
  const idleUntil = useRef(0);
  const tick = useRef(0);
  const p = PROJECTS.find((x) => x.id === pid)!;

  const touch = () => (idleUntil.current = Date.now() + 18000);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const on = () => setReduced(mq.matches);
    on();
    mq.addEventListener("change", on);
    const io = new IntersectionObserver((e) => (inView.current = e.some((x) => x.isIntersecting)), { threshold: 0.12 });
    if (root.current) io.observe(root.current);
    return () => {
      io.disconnect();
      mq.removeEventListener("change", on);
    };
  }, []);

  // idle auto-play: cycles phases and sample projects while visible and untouched
  useEffect(() => {
    if (reduced) return;
    const t = setInterval(() => {
      if (!inView.current || document.hidden || Date.now() < idleUntil.current || draft || typed || bracket) return;
      tick.current++;
      const a = tick.current % 8;
      setPhase(a > 3 ? 3 : a);
      if (a === 0) setPid(PROJECTS[Math.floor(tick.current / 8) % PROJECTS.length].id);
    }, 2200);
    return () => clearInterval(t);
  }, [reduced, draft, typed, bracket]);

  const open = (id: Pid) => {
    touch();
    setPid(id);
    setPhase(3);
    setTyped(null);
    setBracket(null);
  };
  const newAgent = () => {
    touch();
    setTyped(null);
    setDraft("");
    setPhase(0);
  };
  const submit = () => {
    const r = draft.trim();
    if (!r) return;
    touch();
    const answer =
      mode === "Ask"
        ? `This ${p.type.toLowerCase()} sample keeps its project, conversation and chosen connector together. Try Plan to preview the next change.`
        : mode === "Plan"
          ? "Inspect the sample, identify the selected detail, prepare the change, then compare the result with the original."
          : r === p.request
            ? p.answer
            : "Here is a sample design change. Explore the suggested request to see the prepared result; free-form AI execution is not connected in this website demo.";
    setTyped({ request: r.slice(0, 600), answer });
    setDraft("");
    setPhase(3);
  };

  const request = typed?.request || p.request;
  const answer = typed?.answer || p.answer;
  const changed = phase >= 2 && (!typed || mode === "Build");
  const b = bracket ?? { present: true, length: phase >= 2 ? 120 : 80, details: phase >= 3 };
  const setB = (patch: Partial<typeof b>) => {
    touch();
    setBracket({ ...b, ...patch });
  };

  return (
    <div ref={root} onPointerDownCapture={touch} onKeyDownCapture={touch} className="overflow-hidden rounded-3xl border border-line bg-[#070707] shadow-[0_50px_160px_-40px_rgba(0,0,0,1)]">
      <div className="flex min-h-[560px] flex-col md:flex-row">
        {surface === "project" && (
          <nav aria-label="Sample workspace navigation" className="flex shrink-0 flex-col border-b border-line bg-[#0a0a0b] p-3 md:w-60 md:border-b-0 md:border-r">
            <p className="flex items-center gap-2 px-2 py-1.5 text-sm font-medium"><Logo className="size-4" /> Workspace</p>
            <p className="mt-2 rounded-lg border border-line px-3 py-2 text-xs text-muted">Project workspace</p>
            <div className="mt-2 flex gap-1 text-[11px] text-muted">
              <span className="rounded-md bg-card-2 px-2 py-0.5 text-fg">All</span><span className="px-2 py-0.5">Unread</span><span className="px-2 py-0.5">Working</span>
            </div>
            <p className="mt-4 px-2 text-[11px] text-muted">Projects</p>
            <ul className="mt-1 space-y-0.5 text-[13px]">
              {PROJECTS.map((x) => (
                <li key={x.id}>
                  <button type="button" onClick={() => open(x.id)} className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left ${x.id === pid ? "bg-card-2 text-fg" : "text-muted hover:text-fg"}`}>
                    <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 4.5h4l1.5 1.5H14v6.5H2z" /></svg>
                    {x.name}
                  </button>
                  <button type="button" onClick={() => open(x.id)} className={`ml-6 block rounded-lg px-2 py-1 text-left text-[12px] ${x.id === pid && phase !== 0 ? "text-fg" : "text-muted hover:text-fg"}`}>{x.chat}</button>
                  {x.id === pid && (
                    <button type="button" onClick={newAgent} className={`ml-6 block rounded-lg px-2 py-1 text-left text-[12px] ${phase === 0 ? "text-fg" : "text-muted hover:text-fg"}`}>New agent</button>
                  )}
                </li>
              ))}
            </ul>
            <p className="mt-auto flex items-center gap-2 px-2 pt-4 text-[11px] text-muted"><span className="size-1.5 rounded-full bg-[#4ade80]" />Sample workspace</p>
          </nav>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-3 border-b border-line px-4 py-2.5">
            <svg viewBox="0 0 16 16" className="size-3.5 text-muted" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 4.5h4l1.5 1.5H14v6.5H2z" /></svg>
            <span className="truncate text-sm font-medium">{phase === 0 ? "New agent" : p.chat}</span>
            <div role="tablist" aria-label="Workspace layout" className="ml-auto flex gap-0.5 rounded-lg border border-line bg-black p-0.5">
              {(["design", "project"] as const).map((s) => (
                <button key={s} role="tab" type="button" aria-selected={surface === s} onClick={() => { touch(); setSurface(s); }} className={`rounded-md px-2.5 py-1 text-xs capitalize ${surface === s ? "bg-card-2 text-fg" : "text-muted hover:text-fg"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
            {phase === 0 && !typed ? (
              <div className="m-auto text-center">
                <h3 className="text-2xl font-semibold tracking-tight">Ready to build?</h3>
                <p className="mt-2 text-sm text-muted">Describe your task. Selected software opens when needed.</p>
              </div>
            ) : (
              <>
                <p className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-card-2 px-4 py-2.5 text-sm">{request}</p>
                <p className="flex items-center gap-2 text-xs text-muted">
                  <span className={`size-1.5 rounded-full ${phase === 1 ? "animate-pulse bg-fg" : "bg-muted"}`} />
                  {phase === 1 ? "Working on the sample…" : "Worked for 12s"}
                </p>
                <p className="text-sm text-fg/90">{phase === 1 ? "I’ll inspect the selected detail and prepare the change." : answer}</p>
                <details className="text-xs text-muted">
                  <summary className="cursor-pointer">Model review · {phase === 1 ? "in progress" : "3 steps complete"}</summary>
                  <ol className="ml-5 mt-2 list-decimal space-y-1">
                    <li>Read the sample model</li><li>Prepare the selected detail</li><li>Review the illustrated result</li>
                  </ol>
                </details>
                {phase >= 2 && (
                  <div className="text-xs text-muted">
                    <p>Files (1)</p>
                    <p className="mt-1.5 flex items-center gap-2 rounded-xl border border-line bg-card px-3 py-2 text-[13px] text-fg">
                      <ToolLogo name={p.host} className="size-4" wordSize="7px" /> {p.file}
                    </p>
                  </div>
                )}
                {surface === "project" && (
                  <div className="mt-1 flex flex-1 flex-col rounded-2xl border border-line bg-[#0b0b0c] p-3">
                    <div className="flex justify-between text-[11px] text-muted">
                      <span>Design canvas</span>
                      {pid === "bracket" && <span>Click the bracket to remove it</span>}
                    </div>
                    <div className="flex min-h-[200px] flex-1 items-center justify-center py-2 text-fg/80">
                      {pid === "bracket" ? <Bracket {...b} onRemove={() => setB({ present: false })} /> : pid === "vessel" ? <Workboat changed={changed} /> : <Frame changed={changed} />}
                    </div>
                    {pid === "bracket" && (
                      <>
                        <div className="flex flex-wrap justify-center gap-1.5">
                          <button type="button" disabled={!b.present} onClick={() => setB({ length: b.length === 80 ? 120 : 80 })} className="rounded-lg border border-line px-2.5 py-1 text-xs text-fg disabled:opacity-40">{b.length === 80 ? "Pull to 120 mm" : "Push to 80 mm"}</button>
                          <button type="button" disabled={!b.present} onClick={() => setB({ details: !b.details })} className="rounded-lg px-2.5 py-1 text-xs text-muted hover:text-fg disabled:opacity-40">{b.details ? "Remove details" : "Add holes + ribs"}</button>
                          <button type="button" onClick={() => setB({ present: !b.present })} className="rounded-lg px-2.5 py-1 text-xs text-muted hover:text-fg">{b.present ? "Remove bracket" : "Restore bracket"}</button>
                        </div>
                        <p role="status" className="mt-2 text-center text-[11px] text-muted">
                          {b.present ? `${b.length} mm base${b.details ? " · 4 holes · 2 ribs" : " · plain bracket"}` : "Bracket removed. Restore it to continue."}
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="m-3 mt-0 rounded-2xl border border-line bg-[#0c0c0d] p-2.5">
            <label htmlFor="ws-draft" className="sr-only">Describe what to build</label>
            <input id="ws-draft" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe what to build…" maxLength={600} className="w-full bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-muted" />
            <div className="mt-1 flex items-center gap-2 text-xs text-muted">
              <span className="px-1.5 text-base leading-none" aria-hidden="true">+</span>
              <span className="flex items-center gap-1.5"><svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M3 3h4.5a1.5 1.5 0 0 1 1.5 1.5V13a1.2 1.2 0 0 0-1.2-1.2H3zM13 3H8.5" /></svg>Knowledge</span>
              <span className="flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5"><ToolLogo name={p.host} className="size-3" wordSize="6px" />{p.host}</span>
              <label className="ml-auto">
                <span className="sr-only">Task mode</span>
                <select value={mode} onChange={(e) => setMode(e.target.value as Mode)} className="appearance-none bg-transparent pr-1 text-right text-xs text-fg outline-none">
                  <option>Ask</option><option>Plan</option><option>Build</option>
                </select>
              </label>
              <button type="submit" aria-label="Send" className="flex size-7 items-center justify-center rounded-full bg-fg text-black disabled:opacity-40" disabled={!draft.trim()}>
                <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
              </button>
            </div>
          </form>
          <p className="pb-3 text-center text-[11px] text-muted">Interactive demo · sample data · no live AI or CAD connection</p>
        </div>
      </div>
    </div>
  );
}

/* line art from Vector's sample workspace */
function Frame({ changed }: { changed: boolean }) {
  return (
    <svg viewBox="0 0 420 280" role="img" aria-label={changed ? "Sample frame with roof bracing" : "Sample structural frame"} className="h-auto w-full max-w-[420px]">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path opacity=".15" d="M20 215l200-90 180 65-200 90Z M65 235l200-90M110 252l200-90M160 269l200-90M65 195l180 65M110 175l180 65M155 155l180 65" />
        <path d="M80 210V100l140-65 120 50v125M150 238V128l140-65v119M220 265V155l120-70M80 100l140 55M150 128l140 54M220 35V155M80 210l140 55 120-55M80 100l70-32 70-33M150 68l140 49M220 155l70-38 50-32" />
        {changed && <path className="draw-in" stroke="#4ade80" strokeWidth="3" d="M80 100L220 35M80 100L220 155M150 68L290 117M150 128L290 63M220 35L340 85M220 155L340 85" />}
      </g>
    </svg>
  );
}
function Workboat({ changed }: { changed: boolean }) {
  return (
    <svg viewBox="0 0 420 280" role="img" aria-label="Sample workboat deck arrangement" className="h-auto w-full max-w-[420px]">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M45 155l235-90 90 35-235 110Z M45 155v28l90 47 235-110v-20M135 210v20M78 141l220-82 55 28M118 132l70-28 44 19-72 30Z M118 132v-45l70-26 44 19v43M118 87l42 20 72-27M160 107v46" />
        <path stroke="#4ade80" style={{ transition: "d 0.8s" }} d={changed ? "M290 131v-55l-36-10-26 20M277 138l25-11M290 76l-36 38" : "M225 160v-55l-36-10-26 20M212 167l25-11M225 105l-36 38"} />
      </g>
    </svg>
  );
}
/** Original isometric bracket: base plate (80/120 mm), upright with window, optional 4 holes + 2 ribs. */
function Bracket({ present, length, details, onRemove }: { present: boolean; length: 80 | 120; details: boolean; onRemove: () => void }) {
  const L = length === 120 ? 150 : 100; // drawn length
  const iso = (x: number, y: number, z: number) => `${210 + (x - y) * 0.866},${150 + (x + y) * 0.5 - z}`;
  const poly = (pts: [number, number, number][]) => pts.map((p) => iso(...p)).join(" ");
  const x0 = -L / 2;
  return (
    <svg viewBox="0 0 420 280" role="img" aria-label={present ? `Support bracket: ${length} mm base${details ? ", 4 holes, 2 ribs" : ""}` : "Bracket removed"} className="h-auto w-full max-w-[420px]">
      {/* bench */}
      <g fill="#141416" stroke="#3f3f46" strokeWidth="1">
        <polygon points={poly([[-120, -70, 0], [120, -70, 0], [120, 70, 0], [-120, 70, 0]])} />
        <polygon points={poly([[-120, 70, 0], [120, 70, 0], [120, 70, -10], [-120, 70, -10]])} fill="#0d0d0f" />
        <polygon points={poly([[120, -70, 0], [120, 70, 0], [120, 70, -10], [120, -70, -10]])} fill="#0a0a0b" />
      </g>
      {present && (
        <g onClick={onRemove} style={{ cursor: "pointer", transition: "opacity .3s" }}>
          {/* base plate */}
          <polygon points={poly([[x0, -30, 8], [x0 + L, -30, 8], [x0 + L, 30, 8], [x0, 30, 8]])} fill="#d4d4d8" stroke="#fafafa" strokeWidth="1" />
          <polygon points={poly([[x0, 30, 8], [x0 + L, 30, 8], [x0 + L, 30, 0], [x0, 30, 0]])} fill="#8b8b93" />
          <polygon points={poly([[x0 + L, -30, 8], [x0 + L, 30, 8], [x0 + L, 30, 0], [x0 + L, -30, 0]])} fill="#6b6b73" />
          {details && [[x0 + 14, -18], [x0 + 14, 18], [x0 + L - 14, -18], [x0 + L - 14, 18]].map(([x, y]) => (
            <ellipse key={`${x}${y}`} cx={210 + (x - y) * 0.866} cy={150 + (x + y) * 0.5 - 8} rx="5.5" ry="3.2" fill="#1c1c1f" />
          ))}
          {/* upright with window */}
          <polygon points={poly([[x0 + 4, -28, 8], [x0 + 4, 28, 8], [x0 + 4, 28, 70], [x0 + 4, -28, 70]])} fill="#e4e4e7" stroke="#fafafa" strokeWidth="1" />
          <polygon points={poly([[x0 + 4, -15, 26], [x0 + 4, 15, 26], [x0 + 4, 15, 56], [x0 + 4, -15, 56]])} fill="#141416" />
          <polygon points={poly([[x0 + 4, 28, 8], [x0 + 12, 28, 8], [x0 + 12, 28, 70], [x0 + 4, 28, 70]])} fill="#9a9aa2" />
          <polygon points={poly([[x0 + 4, -28, 70], [x0 + 12, -28, 70], [x0 + 12, 28, 70], [x0 + 4, 28, 70]])} fill="#f4f4f5" />
          {details && [-22, 22].map((y) => (
            <polygon key={y} points={poly([[x0 + 12, y, 8], [x0 + 40, y, 8], [x0 + 12, y, 40]])} fill="#c4c4ca" stroke="#fafafa" strokeWidth="0.8" />
          ))}
        </g>
      )}
      {/* probe */}
      <g stroke="#71717a" strokeWidth="2" fill="none">
        <path d={`M${iso(110, -50, 0)} L${iso(110, -50, 60)} L${iso(110, -10, 60)}`} />
        <circle cx={210 + (110 + 10) * 0.866} cy={150 + (110 - 10) * 0.5 - 62} r="9" fill="#18181b" />
      </g>
    </svg>
  );
}
