"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Entry = { name: string; slug: string; company: string; groups: string[]; status: string; logo: string; description: string };

const STATUS_ORDER = ["Available", "In development", "Upcoming"];

const STATUS_LABEL: Record<string, string> = { Available: "Available", "In development": "In development", Upcoming: "Upcoming" };

function Pill({ status }: { status: string }) {
  return (
    <span className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] ${status === "Available" ? "bg-fg text-on-fg" : status === "In development" ? "border border-line-strong text-fg" : "border border-dashed border-line text-muted"}`}>
      {STATUS_LABEL[status] || status}
    </span>
  );
}

function Mark({ e, size = "sm" }: { e: Entry; size?: "sm" | "lg" }) {
  const box = size === "lg" ? "size-11 rounded-xl" : "size-8 rounded-lg";
  return (
    <span className={`flex ${box} shrink-0 items-center justify-center border border-line bg-[#e9e9eb]`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={e.logo} alt="" width={24} height={24} loading="lazy" className={size === "lg" ? "size-6 object-contain" : "size-5 object-contain"} />
    </span>
  );
}

/* Laid out like the desktop app's Connections screen: search + status filter, category tabs,
   the connectors that work today, then the catalogue grouped by vendor. */
export default function SoftwareDirectory({ entries, groups }: { entries: Entry[]; groups: string[] }) {
  const [q, setQ] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!s || e.name.toLowerCase().includes(s) || e.company.toLowerCase().includes(s)) &&
        (!group || e.groups.includes(group)) &&
        (!status || e.status === status),
    );
  }, [entries, q, group, status]);

  const groupCount = (g: string) => entries.filter((e) => !g || e.groups.includes(g)).length;
  const available = list.filter((e) => e.status === "Available");
  const vendors = useMemo(() => {
    const m = new Map<string, Entry[]>();
    for (const e of list) {
      const k = e.company || "Other";
      m.set(k, [...(m.get(k) || []), e]);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [list]);
  const dirty = q || group || status;

  return (
    <div className="mt-12">
      <div role="search" className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search software</span>
          <svg viewBox="0 0 16 16" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
          <input id="sw-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search software or companies" className="field pl-10" />
        </label>
        <div className="sm:w-52">
          <Select label="Status" value={status} onChange={setStatus} all="All statuses" options={STATUS_ORDER} />
        </div>
      </div>

      {/* category tabs, as in the desktop Connections screen */}
      <div className="no-scrollbar -mx-6 mt-4 overflow-x-auto px-6 lg:mx-0 lg:px-0">
        <div role="tablist" aria-label="Category" className="flex w-max gap-1 border-b border-line">
          {(["", ...groups] as string[]).map((g) => (
            <button
              key={g || "all"}
              type="button"
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
              className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm transition-colors ${group === g ? "border-fg text-fg" : "border-transparent text-muted hover:text-fg"}`}
            >
              {g || "All"}
              <span className="font-mono text-[10px] text-muted">{groupCount(g)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 flex min-h-6 items-center gap-3 text-xs text-muted" aria-live="polite">
        {list.length} of {entries.length} shown · connection capabilities vary by Vector OS build
        {dirty && (
          <button type="button" onClick={() => { setQ(""); setGroup(""); setStatus(""); }} className="underline underline-offset-4 hover:text-fg">
            Clear filters
          </button>
        )}
      </div>

      {available.length > 0 && (
        <section aria-label="Available connectors" className="mt-8 rounded-3xl border border-line bg-card p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">Available connectors</h2>
            <p className="text-xs text-muted">Work with Vector OS today</p>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {available.map((e) => (
              <li key={e.name}>
                <Link href={`/software/${e.slug}`} className="flex h-full items-center gap-3 rounded-2xl border border-line bg-bg px-3.5 py-3 transition-colors hover:border-line-strong">
                  <Mark e={e} size="lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{e.name}</span>
                    <span className="block truncate text-xs text-muted">{e.company}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {list.length > 0 && <h2 className="mt-12 text-2xl font-semibold tracking-tight">Software catalogue</h2>}
      {vendors.map(([v, l]) => (
        <section key={v} aria-label={v} className="mt-7">
          <h3 className="flex items-baseline gap-2 text-sm font-medium text-fg">
            {v}
            <span className="font-mono text-[10px] text-muted">{l.length}</span>
          </h3>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {l.map((e) => (
              <li key={e.name}>
                <Link href={`/software/${e.slug}`} className="flex h-full items-center gap-3 rounded-xl border border-line bg-card px-3 py-2.5 transition-colors hover:border-line-strong hover:bg-card-2">
                  <Mark e={e} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">{e.name}</span>
                    <span className="block truncate text-[11px] text-muted">{e.groups[0]}</span>
                  </span>
                  <Pill status={e.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!list.length && <p className="mt-10 text-muted">No software matches these filters.</p>}

      <p className="mt-14 max-w-3xl text-sm text-muted">
        Upcoming tools are discovery entries; a listing does not announce connector development or a release date. Grasshopper and Dynamo do not inherit Rhino or Revit availability.
      </p>
    </div>
  );
}

function Select({ label, value, onChange, all, options }: { label: string; value: string; onChange: (v: string) => void; all: string; options: string[] }) {
  return (
    <label className="relative">
      <span className="sr-only">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="field appearance-none pr-8">
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 6 4 4 4-4" /></svg>
    </label>
  );
}
