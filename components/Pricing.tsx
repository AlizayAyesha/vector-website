"use client";

import Link from "next/link";
import { useState } from "react";
import data from "@/content/pricing.json";

type Plan = (typeof data.plans)[number] & { capacity?: string; recommended?: boolean; checkout?: string };
type Billing = "monthly" | "quarterly" | "yearly";
const plans = data.plans as Plan[];
const MONTHS: Record<Billing, number> = { monthly: 1, quarterly: 3, yearly: 12 };
const usd = (n: number, cents = false) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: cents || n % 1 ? 2 : 0, maximumFractionDigits: 2 });

export default function Pricing() {
  const [aud, setAud] = useState<"individuals" | "professionals">("individuals");
  const [billing, setBilling] = useState<Billing>("monthly");
  const [cap, setCap] = useState("pro");
  const [open, setOpen] = useState<string | null>(null);
  const options: Billing[] = aud === "individuals" ? ["monthly", "quarterly", "yearly"] : ["monthly", "quarterly"];
  const bill: Billing = options.includes(billing) ? billing : "monthly";
  const h = data.header;

  const cards = aud === "individuals" ? ["free", "go", "plus"] : ["pro", "ultra", "enterprise"];

  return (
    <div>
      <header className="max-w-3xl">
        <p className="eyebrow">{h.eyebrow}</p>
        <h1 className="mt-4 text-balance text-5xl font-semibold tracking-[-0.035em] md:text-7xl">{h.title}</h1>
        <p className="mt-5 text-lg text-[#d4d4d8]">{h.sub}</p>
        <p className="mt-2 text-sm text-muted">{h.note}</p>
      </header>

      <div className="mt-10 flex flex-wrap items-end justify-between gap-4">
        <div role="tablist" aria-label="Audience" className="flex gap-1 rounded-full border border-line bg-card p-1">
          {(["individuals", "professionals"] as const).map((a) => (
            <button key={a} role="tab" type="button" aria-selected={aud === a} onClick={() => setAud(a)} className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${aud === a ? "bg-fg text-black" : "text-muted hover:text-fg"}`}>
              {a}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-sm">
          <span className="text-muted">Billing</span>
          <span className="relative">
            <select value={bill} onChange={(e) => setBilling(e.target.value as Billing)} className="h-9 appearance-none rounded-full border border-line bg-card pl-4 pr-9 text-sm text-fg outline-none focus:border-fg/50">
              {options.map((o) => (
                <option key={o} value={o}>{o === "monthly" ? "Monthly" : o === "quarterly" ? "Quarterly · save 5%" : "Yearly · save 10%"}</option>
              ))}
            </select>
            <svg viewBox="0 0 16 16" className="pointer-events-none absolute right-3 top-1/2 size-3.5 -translate-y-1/2 text-muted" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="m4 6 4 4 4-4" /></svg>
          </span>
        </label>
      </div>
      <p className="mt-4 text-xs text-muted">{h.unit} · {data.billingNotes[bill]}</p>
      {aud === "professionals" && <p className="mt-1 text-xs text-muted">{data.professionalsNote}</p>}

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {cards.map((card) => {
          const plan = card === "pro" ? plans.find((p) => p.id === cap)! : plans.find((p) => p.id === card)!;
          return <Card key={card} plan={plan} bill={bill} setBilling={setBilling} cap={cap} setCap={setCap} open={open === card} toggle={() => setOpen(open === card ? null : card)} />;
        })}
      </div>

      {aud === "professionals" && (
        <section className="mt-12 rounded-3xl border border-line bg-card p-6 md:p-8" aria-labelledby="ent">
          <h2 id="ent" className="text-2xl font-semibold tracking-tight">{data.enterprise.title}</h2>
          <p className="mt-3 max-w-2xl text-muted">{data.enterprise.body}</p>
          <dl className="mt-6 grid gap-3 sm:grid-cols-3">
            {data.enterprise.contracts.map((c) => (
              <div key={c} className="rounded-2xl border border-line bg-black p-4">
                <dt className="text-sm text-muted">{c}</dt>
                <dd className="mt-1 text-lg font-semibold">Custom Quote</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-sm text-muted">{data.enterprise.terms}</p>
          <a href={`mailto:${data.enterprise.email}`} className="btn-ghost mt-6">Open sales email</a>
          <p className="mt-3 max-w-2xl text-xs text-muted">{data.enterprise.emailNote}</p>
        </section>
      )}

      <section className="mt-20 grid gap-10 md:grid-cols-[1fr_2fr]" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-3xl font-semibold tracking-tight md:text-4xl">Usage, billing and frequently asked questions</h2>
        <div className="divide-y divide-line border-y border-line">
          {data.faq.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-base font-medium text-fg">
                {f.q}
                <span className="mt-1 text-muted transition-transform group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function Card({ plan, bill, setBilling, cap, setCap, open, toggle }: { plan: Plan; bill: Billing; setBilling: (b: Billing) => void; cap: string; setCap: (c: string) => void; open: boolean; toggle: () => void }) {
  const isPro = plan.card === "pro";
  const available = plan.monthly === 0 || plan.monthly === null || (plan.intervals as string[]).includes(bill);
  const upfront = bill === "monthly" ? plan.monthly : (plan.upfront as Record<string, number>)[bill];
  const perMonth = plan.monthly && upfront ? upfront / MONTHS[bill] : plan.monthly;
  const free = plan.monthly === 0;
  const ent = plan.monthly === null;

  return (
    <article className={`relative flex flex-col rounded-3xl border p-6 ${plan.recommended ? "border-fg/60 bg-card-2" : "border-line bg-card"}`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">{plan.recommended ? "Recommended" : plan.label}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight">{isPro ? "Pro" : plan.name}</h2>
      <p className="mt-1 text-sm text-muted">{plan.tagline}</p>

      {isPro && (
        <div className="mt-4">
          <p className="text-xs text-muted">Choose your Pro capacity</p>
          <div role="radiogroup" aria-label="Pro capacity" className="mt-2 flex gap-1 rounded-full border border-line bg-black p-1">
            {plans.filter((p) => p.card === "pro").map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={cap === p.id} onClick={() => setCap(p.id)} className={`flex-1 rounded-full px-3 py-1 text-xs font-medium transition-colors ${cap === p.id ? "bg-fg text-black" : "text-muted hover:text-fg"}`}>
                {p.capacity}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-6 min-h-[5.5rem]">
        {ent ? (
          <>
            <p className="text-4xl font-semibold tracking-tight">Custom Pricing</p>
            <p className="mt-2 text-sm text-muted">Contract terms by agreement.</p>
          </>
        ) : !available ? (
          <>
            <p className="text-4xl font-semibold tracking-tight">Not available</p>
            <p className="mt-2 text-sm text-muted">{bill === "quarterly" ? "Quarterly" : "Yearly"} billing is not available for {plan.name}. Choose Monthly billing.</p>
          </>
        ) : (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className="text-5xl font-semibold tracking-tight tabular-nums">{usd(perMonth ?? 0)}</span>
              <span className="text-sm text-muted">/ month</span>
            </p>
            <p className="mt-2 text-sm text-muted">
              {free ? "No subscription required." : bill === "monthly" ? `Billed ${usd(upfront!, true)} monthly.` : `Billed ${usd(upfront!, true)} ${bill}. Save ${bill === "quarterly" ? 5 : 10}%.`}
            </p>
          </>
        )}
      </div>
      <p className="mt-2 border-t border-line pt-4 text-sm font-medium text-fg">{plan.edits}</p>

      <div className="mt-6">
        {free ? (
          <>
            <Link href={data.freeCta.href} className="btn-ghost w-full justify-center">{data.freeCta.label}</Link>
            <p className="mt-2 text-xs text-muted">{data.freeCta.note}</p>
          </>
        ) : ent ? (
          <>
            <a href={`mailto:${data.enterprise.email}`} className="btn-ghost w-full justify-center">Contact sales</a>
            <p className="mt-2 text-xs text-muted">Opens your email app. No enquiry is submitted here.</p>
          </>
        ) : bill === "monthly" && plan.checkout ? (
          <>
            <a href={plan.checkout} className={`${plan.recommended ? "btn-primary" : "btn-ghost"} w-full justify-center`} rel="noopener">Subscribe monthly</a>
            <p className="mt-2 text-xs text-muted">Renews monthly until canceled. Use your checkout email for subscription support.</p>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setBilling("monthly")} className="btn-ghost w-full justify-center">Choose monthly billing</button>
            <p className="mt-2 text-xs text-muted">Online checkout is available for monthly plans.</p>
          </>
        )}
      </div>

      <button type="button" onClick={toggle} aria-expanded={open} className="mt-5 flex items-center gap-1.5 self-start text-sm text-muted underline-offset-4 hover:text-fg hover:underline">
        Explore {isPro ? "Pro" : plan.name} details
        <span className={`transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">↓</span>
      </button>
      {open && (
        <div className="mt-4 border-t border-line pt-4 text-sm">
          <p className="text-muted">{plan.description}</p>
          {"for" in plan && plan.for ? <p className="mt-2 text-muted">{plan.for as string}</p> : null}
          <ul className="mt-3 space-y-1.5">
            {plan.features.map((f) => (
              <li key={f} className="flex gap-2 text-fg/90"><span className="text-muted">—</span>{f}</li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">{plan.supporting}</p>
        </div>
      )}
    </article>
  );
}
