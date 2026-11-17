"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { KIND_LABEL, SEARCH_FILTERS, searchItems, type SearchItem, type SearchKind } from "@/lib/search";

const QUICK = [
  { t: "Rhino", h: "/software/rhino" },
  { t: "Revit", h: "/software/revit" },
  { t: "Pricing", h: "/pricing" },
  { t: "Windows beta", h: "/download" },
  { t: "Guides", h: "/tutorials" },
  { t: "Examples", h: "/gallery" },
];
const STATUSES = ["Available", "In development", "Upcoming"];

let cache: SearchItem[] | null = null;

/** Opens the site search dialog from anywhere (nav button, ⌘K / Ctrl+K, "/"). */
export const openSearch = () => window.dispatchEvent(new Event("vector:search"));

/**
 * Site search over the real pages of this site. The index is built at compile time
 * (app/search-index.json) and loaded on first open; nothing is sent to a server.
 */
export default function SiteSearch() {
  const router = useRouter();
  const dlg = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<SearchItem[] | null>(cache);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"" | SearchKind>("");
  const [status, setStatus] = useState("");
  const [active, setActive] = useState(0);

  const load = useCallback(async () => {
    if (cache) return setItems(cache);
    setState("loading");
    try {
      const r = await fetch("/search-index.json");
      if (!r.ok) throw new Error(String(r.status));
      cache = (await r.json()) as SearchItem[];
      setItems(cache);
      setState("idle");
    } catch {
      setState("error");
    }
  }, []);

  useEffect(() => {
    const show = () => setOpen(true);
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "/" && !typing && !document.querySelector("dialog[open]")) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("vector:search", show);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("vector:search", show);
      window.removeEventListener("keydown", key);
    };
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      document.documentElement.dataset.modal = "search";
      load();
      requestAnimationFrame(() => input.current?.focus());
    }
    if (!open && d.open) d.close();
    if (!open && document.documentElement.dataset.modal === "search") delete document.documentElement.dataset.modal;
  }, [open, load]);

  const results = useMemo(() => (items && (q.trim() || kind || status) ? searchItems(items, q.trim(), kind, status).slice(0, 40) : []), [items, q, kind, status]);
  useEffect(() => setActive(0), [q, kind, status]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter" && results[active]) {
      e.preventDefault();
      go(results[active].h);
    }
  };

  useEffect(() => {
    document.getElementById(`sr-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const showStatus = kind === "" || kind === "software";

  return (
    <dialog
      ref={dlg}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dlg.current && setOpen(false)}
      aria-label="Search Vector OS"
      className="dlg mx-auto mt-[8vh] w-[min(680px,94vw)] max-w-none overflow-hidden rounded-2xl border border-line bg-card p-0 text-fg shadow-2xl"
    >
      <div onKeyDown={onKey}>
        <div className="flex items-center gap-3 border-b border-line px-4">
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
          <label htmlFor="site-q" className="sr-only">Search pages, software and guides</label>
          <input
            ref={input}
            id="site-q"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search pages, software and guides"
            autoComplete="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="site-results"
            aria-activedescendant={results[active] ? `sr-${active}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <kbd className="hidden rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-muted sm:inline">Esc</kbd>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex size-8 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-fg sm:hidden" aria-label="Close search">
            <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* dropdown filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <FilterSelect label="Type" value={kind} onChange={(v) => setKind(v as "" | SearchKind)} options={SEARCH_FILTERS.map((f) => [f.id, f.label])} />
          {showStatus && <FilterSelect label="Connector status" value={status} onChange={setStatus} options={[["", "Any status"], ...STATUSES.map((s) => [s, s] as [string, string])]} />}
          {(kind || status) && (
            <button type="button" onClick={() => { setKind(""); setStatus(""); }} className="text-xs text-muted underline underline-offset-4 hover:text-fg">Clear</button>
          )}
          <span className="ml-auto text-[11px] text-muted" aria-live="polite">
            {state === "loading" ? "Loading index…" : q.trim() || kind || status ? `${results.length}${results.length === 40 ? "+" : ""} results` : ""}
          </span>
        </div>

        <div className="max-h-[min(60vh,480px)] overflow-y-auto p-2">
          {state === "error" ? (
            <div className="px-3 py-8 text-center text-sm text-muted" role="alert">
              Search could not load.{" "}
              <button type="button" onClick={load} className="text-fg underline underline-offset-4">Try again</button>
            </div>
          ) : state === "loading" && !items ? (
            <ul className="space-y-2 p-2" aria-hidden="true">
              {[0, 1, 2].map((i) => <li key={i} className="h-12 animate-pulse rounded-xl bg-card-2" />)}
            </ul>
          ) : !(q.trim() || kind || status) ? (
            <div className="p-2">
              <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">Quick links</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK.map((l) => (
                  <button key={l.h} type="button" onClick={() => go(l.h)} className="rounded-full border border-line px-3 py-1.5 text-sm text-fg transition-colors hover:bg-fg/5">{l.t}</button>
                ))}
              </div>
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted">No pages match “{q.trim() || "these filters"}”. Try another word or clear the filters.</p>
          ) : (
            <ul id="site-results" role="listbox" aria-label="Search results">
              {results.map((r, i) => (
                <li key={r.h} id={`sr-${i}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseMove={() => setActive(i)}
                    onClick={() => go(r.h)}
                    className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${i === active ? "bg-card-2" : ""}`}
                  >
                    <span className="mt-0.5 w-[5.75rem] shrink-0 rounded-md border border-line px-1.5 py-0.5 text-center font-mono text-[10px] uppercase tracking-[0.08em] text-muted">{KIND_LABEL[r.k]}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-fg">{r.t}</span>
                        {r.s && <span className={`shrink-0 rounded-full px-2 py-px text-[10px] ${r.s === "Available" ? "bg-fg text-on-fg" : "border border-dashed border-line text-muted"}`}>{r.s}</span>}
                      </span>
                      <span className="mt-0.5 line-clamp-1 text-xs text-muted">{r.d}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <p className="hidden border-t border-line px-4 py-2 text-[11px] text-muted sm:block">
          <kbd className="font-mono">↑</kbd> <kbd className="font-mono">↓</kbd> to move · <kbd className="font-mono">Enter</kbd> to open · <kbd className="font-mono">Ctrl K</kbd> anywhere
        </p>
      </div>
    </dialog>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-8 appearance-none rounded-lg border border-line bg-inset pl-3 pr-8 text-xs text-fg outline-none focus:border-fg/50">
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-2.5 top-1/2 size-3 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
    </label>
  );
}
