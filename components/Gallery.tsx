"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import data from "@/content/gallery.json";

type Rec = (typeof data.recordings)[number];
type Study = (typeof data.studies)[number];
type Sel = { kind: "recording"; item: Rec } | { kind: "study"; item: Study } | null;

const colName = (id: string) => data.collections.find((c) => c.id === id)?.name ?? id;

export default function Gallery() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "recordings" | "studies">("");
  const [col, setCol] = useState("");
  const [more, setMore] = useState(false);
  const [sel, setSel] = useState<Sel>(null);

  // deep links used across vectoros.one: /gallery?recording=<id> or ?episode=<id>
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const r = sp.get("recording");
    const e = sp.get("episode");
    if (r) {
      const item = data.recordings.find((x) => x.id === r);
      if (item) setSel({ kind: "recording", item });
    } else if (e) {
      const item = data.studies.find((x) => x.id === e);
      if (item) setSel({ kind: "study", item });
    }
  }, []);

  const s = q.trim().toLowerCase();
  const recs = useMemo(() => (type === "studies" || col ? [] : data.recordings.filter((r) => !s || `${r.title} ${r.tools} ${r.summary}`.toLowerCase().includes(s))), [s, type, col]);
  const studies = useMemo(() => (type === "recordings" ? [] : data.studies.filter((x) => (!col || x.collection === col) && (!s || `${x.title} ${x.task}`.toLowerCase().includes(s)))), [s, type, col]);
  const filtered = Boolean(s || type || col);
  const shown = more || filtered ? studies : studies.slice(0, 12);

  return (
    <div className="mt-12">
      <div role="search" aria-label="Examples library" className="grid gap-2 rounded-2xl border border-line bg-card p-2 md:grid-cols-[2fr_1fr_1fr]">
        <label className="sr-only" htmlFor="g-q">Find an example</label>
        <input id="g-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an example" className="h-10 rounded-xl border border-line bg-black px-3.5 text-sm text-fg outline-none placeholder:text-muted focus:border-fg/50" />
        <Pick label="Type" value={type} onChange={(v) => setType(v as typeof type)} options={[["", "All examples"], ["recordings", "Recorded projects"], ["studies", "Concept studies"]]} />
        <Pick label="Collection" value={col} onChange={setCol} options={[["", "All collections"], ...data.collections.map((c) => [c.id, c.name] as [string, string])]} />
      </div>
      <div className="mt-3 flex items-center gap-3 text-xs text-muted" aria-live="polite">
        {filtered ? `${recs.length} recordings · ${studies.length} concept studies` : `${data.recordings.length} recordings · ${data.studies.length} concept studies`}
        {filtered && (
          <button type="button" className="underline underline-offset-4 hover:text-fg" onClick={() => { setQ(""); setType(""); setCol(""); }}>
            Clear filters
          </button>
        )}
      </div>

      {recs.length > 0 && (
        <section className="mt-12" aria-labelledby="rec-h">
          <h2 id="rec-h" className="text-3xl font-semibold tracking-tight">Recorded projects</h2>
          <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {recs.map((r) => (
              <li key={r.id}>
                <button type="button" onClick={() => setSel({ kind: "recording", item: r })} className="group block w-full overflow-hidden rounded-3xl border border-line bg-card text-left transition-colors hover:border-[#4a4a4f]">
                  <span className="relative block aspect-[16/10] overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.poster} alt="" loading="lazy" className="size-full object-cover opacity-85 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100" />
                    <span className="glass absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition group-hover:scale-110">
                      <svg viewBox="0 0 24 24" className="ml-1 size-5" fill="currentColor" aria-hidden="true"><path d="M7 4.5v15l12-7.5-12-7.5Z" /></svg>
                    </span>
                    <span className="absolute bottom-3 right-3 rounded-full border border-line bg-black/70 px-2.5 py-0.5 font-mono text-xs text-muted">{r.duration}</span>
                  </span>
                  <span className="block p-5">
                    <span className="block text-lg font-semibold tracking-tight">{r.title}</span>
                    <span className="mt-1 block text-sm text-muted">{r.tools}</span>
                    <span className="mt-3 inline-flex items-center gap-1.5 text-sm text-fg">View recording <span aria-hidden="true">→</span></span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {studies.length > 0 && (
        <section className="mt-16" aria-labelledby="st-h">
          <h2 id="st-h" className="text-3xl font-semibold tracking-tight">Concept studies</h2>
          <p className="mt-2 text-muted">Illustrated ideas, separate from recorded project work.</p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((x) => (
              <li key={x.id}>
                <button type="button" onClick={() => setSel({ kind: "study", item: x })} className="group block w-full overflow-hidden rounded-3xl border border-line bg-card text-left transition-colors hover:border-[#4a4a4f]">
                  <span className="block aspect-video overflow-hidden bg-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={x.panels[1]?.url ?? x.panels[0].url} alt={x.panels[1]?.alt ?? ""} loading="lazy" referrerPolicy="no-referrer" className="size-full object-cover opacity-90 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100" />
                  </span>
                  <span className="block p-5">
                    <span className="flex justify-between font-mono text-[11px] uppercase tracking-[0.12em] text-muted"><span>{colName(x.collection)}</span><span>{x.id}</span></span>
                    <span className="mt-2 block text-base font-semibold tracking-tight">{x.title}</span>
                    <span className="mt-1 block text-sm text-muted">{x.task}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {!more && !filtered && studies.length > 12 && (
            <button type="button" onClick={() => setMore(true)} className="btn-ghost mt-8">Show {studies.length - 12} more studies</button>
          )}
        </section>
      )}
      {!recs.length && !studies.length && <p className="mt-12 text-muted">No examples match these filters.</p>}

      <Viewer sel={sel} close={() => setSel(null)} />
    </div>
  );
}

function Pick({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-line bg-black px-3.5 pr-8 text-sm text-fg outline-none focus:border-fg/50">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 6 4 4 4-4" /></svg>
    </label>
  );
}

function Viewer({ sel, close }: { sel: Sel; close: () => void }) {
  const d = useRef<HTMLDialogElement>(null);
  const [panel, setPanel] = useState("video");
  useEffect(() => {
    setPanel("video");
    const el = d.current;
    if (!el) return;
    if (sel && !el.open) el.showModal();
    if (!sel && el.open) el.close();
  }, [sel]);
  const title = sel?.item.title ?? "";
  return (
    <dialog ref={d} onClose={close} onClick={(e) => e.target === d.current && close()} aria-label={title} className="m-auto w-[min(1100px,94vw)] max-w-none overflow-hidden rounded-3xl border border-line bg-card p-0 text-fg backdrop:bg-black/80 backdrop:backdrop-blur-sm">
      {sel && (
        <div>
          <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{sel.kind === "recording" ? "Recorded project" : `${colName(sel.item.collection)} · ${sel.item.id}`}</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">{title}</p>
              <p className="text-sm text-muted">{sel.kind === "recording" ? sel.item.tools : sel.item.task}</p>
            </div>
            <button type="button" onClick={close} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg" aria-label="Close">
              <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="bg-black">
            {sel.kind === "recording" || panel === "video" ? (
              <video key={sel.item.video} src={sel.item.video} poster={sel.kind === "recording" ? sel.item.poster : sel.item.panels[1]?.url} controls autoPlay playsInline className="aspect-video w-full bg-black" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={sel.item.panels.find((p) => p.label === panel)?.url} alt={sel.item.panels.find((p) => p.label === panel)?.alt} referrerPolicy="no-referrer" className="aspect-video w-full object-contain" />
            )}
          </div>
          <div className="px-5 py-4 text-sm text-muted">
            {sel.kind === "recording" ? (
              <p>{sel.item.summary}</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {["video", ...sel.item.panels.map((p) => p.label)].map((p) => (
                    <button key={p} type="button" onClick={() => setPanel(p)} className={`rounded-full px-3 py-1 text-xs ${panel === p ? "bg-fg text-black" : "border border-line text-muted hover:text-fg"}`}>
                      {p === "video" ? "Video" : `Panel ${p}`}
                    </button>
                  ))}
                </div>
                <p className="mt-3">{panel === "video" ? sel.item.videoDescription : sel.item.panels.find((p) => p.label === panel)?.alt}</p>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
