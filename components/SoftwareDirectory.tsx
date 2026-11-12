"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Entry = { name: string; slug: string; company: string; groups: string[]; status: string; logo: string; description: string };

const STATUS_ORDER = ["Available", "In development", "Upcoming"];

export default function SoftwareDirectory({ entries, groups }: { entries: Entry[]; groups: string[] }) {
  const [q, setQ] = useState("");
  const [company, setCompany] = useState("");
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("");
  const companies = useMemo(() => [...new Set(entries.map((e) => e.company).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [entries]);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (!s || e.name.toLowerCase().includes(s) || e.company.toLowerCase().includes(s)) &&
        (!company || e.company === company) &&
        (!group || e.groups.includes(group)) &&
        (!status || e.status === status),
    );
  }, [entries, q, company, group, status]);

  const counts = STATUS_ORDER.map((s) => [s, entries.filter((e) => e.status === s).length] as const);
  const sections = STATUS_ORDER.map((s) => [s, list.filter((e) => e.status === s)] as const).filter(([, l]) => l.length);
  const dirty = q || company || group || status;

  return (
    <div className="mt-12">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span className="text-fg">{entries.length} software entries</span>
        {counts.map(([s, n]) => (
          <span key={s} className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 text-xs">
            <span className={`size-1.5 rounded-full ${s === "Available" ? "bg-fg" : s === "In development" ? "bg-muted" : "bg-line"}`} />
            {n} {s}
          </span>
        ))}
        <span className="ml-auto text-xs">Connection capabilities vary by Vector OS build.</span>
      </div>

      <div role="search" className="mt-5 grid gap-2 rounded-2xl border border-line bg-card p-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="sr-only" htmlFor="sw-q">Find your software</label>
        <input id="sw-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find your software" className="h-10 rounded-xl border border-line bg-black px-3.5 text-sm text-fg outline-none placeholder:text-muted focus:border-fg/50" />
        <Select label="Company" value={company} onChange={setCompany} all="All companies" options={companies} />
        <Select label="Discipline" value={group} onChange={setGroup} all="All disciplines" options={groups} />
        <Select label="Status" value={status} onChange={setStatus} all="All statuses" options={STATUS_ORDER} />
      </div>
      <div className="mt-3 flex min-h-6 items-center gap-3 text-xs text-muted" aria-live="polite">
        {list.length} shown
        {dirty && (
          <button type="button" onClick={() => { setQ(""); setCompany(""); setGroup(""); setStatus(""); }} className="underline underline-offset-4 hover:text-fg">
            Clear filters
          </button>
        )}
      </div>

      {sections.map(([s, l]) => (
        <section key={s} aria-label={s} className="mt-10">
          <h2 className="text-2xl font-semibold tracking-tight">{s === "Upcoming" ? "Other software" : s}</h2>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {l.map((e) => (
              <li key={e.name}>
                <Link href={`/software/${e.slug}`} className="group flex h-full items-center gap-3.5 rounded-2xl border border-line bg-card px-4 py-3.5 transition-colors hover:border-[#4a4a4f] hover:bg-card-2">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-line bg-[#e9e9eb]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={e.logo} alt="" width={24} height={24} loading="lazy" className="size-6 object-contain" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{e.name}</span>
                    <span className="block truncate text-xs text-muted">{[e.company, e.groups[0]].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${e.status === "Available" ? "bg-fg text-black" : "border border-dashed border-line text-muted"}`}>{e.status}</span>
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
      <select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-full appearance-none rounded-xl border border-line bg-black px-3.5 pr-8 text-sm text-fg outline-none focus:border-fg/50">
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
      <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 6 4 4 4-4" /></svg>
    </label>
  );
}
