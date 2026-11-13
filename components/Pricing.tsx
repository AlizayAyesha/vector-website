"use client";

import Link from "next/link";
import { useState } from "react";
import data from "@/content/pricing.json";
import { CALENDLY } from "@/lib/site";

type Plan = (typeof data.plans)[number] & { capacity?: string; recommended?: boolean; checkout?: string; for?: string };
type Billing = "monthly" | "quarterly" | "yearly";
type Audience = "personal" | "business";
const plans = data.plans as Plan[];
const byId = (id: string) => plans.find((p) => p.id === id)!;
const MONTHS: Record<Billing, number> = { monthly: 1, quarterly: 3, yearly: 12 };
const usd = (n: number, cents = false) => "$" + n.toLocaleString("en-US", { minimumFractionDigits: cents || n % 1 ? 2 : 0, maximumFractionDigits: 2 });
const BILLING_LABEL: Record<Billing, string> = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };
const SAVE: Partial<Record<Billing, string>> = { quarterly: "−5%", yearly: "−10%" };

/** Personal = Vector's "individuals" group; Business = its "professionals" group plus Enterprise (shown as On-Premises Deployment). */
const CARDS: Record<Audience, string[]> = { personal: ["free", "go", "plus"], business: ["pro", "ultra", "enterprise"] };
const HIGHLIGHT: Record<Audience, string> = { personal: "plus", business: "pro" };

const Icon = ({ i }: { i: number }) => {
  const d = ["M3 8.5 6.5 12 13 4.5", "M8 2.5v11M2.5 8h11", "M3 4h10M3 8h10M3 12h6", "M8 2 13.5 5v6L8 14 2.5 11V5z", "M5 3.5h6l2.5 4.5-2.5 4.5H5L2.5 8z", "M2.5 12.5 6 9l2.5 2.5 5-5.5"][i % 6];
  return (
    <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
  );
};

/**
 * Pricing, laid out like a subscription upgrade screen: centred title, Personal / Business switch,
 * three equal cards (name, headline, subtitle, CTA, price, features), fine print underneath.
 * Every price, interval, allowance, feature and Stripe link comes from vectoros.one's plan catalogue
 * (content/pricing.json). Quarterly / yearly prices appear only where the catalogue has them.
 */
export default function Pricing() {
  const [aud, setAud] = useState<Audience>("personal");
  const [billing, setBilling] = useState<Billing>("monthly");
  const [cap, setCap] = useState("pro");
  const options: Billing[] = aud === "personal" ? ["monthly", "quarterly", "yearly"] : ["monthly", "quarterly"];
  const bill: Billing = options.includes(billing) ? billing : "monthly";
  const h = data.header;

  return (
    <div>
      <header className="mx-auto max-w-3xl text-center">
        <p className="eyebrow">{h.eyebrow}</p>
        <h1 className="mt-4 text-balance text-4xl font-semibold tracking-[-0.035em] md:text-6xl">{h.title}</h1>
        <p className="mt-4 text-lg text-fg-2">{h.sub}</p>
      </header>

      <div className="mt-8 flex flex-col items-center gap-3">
        <div role="tablist" aria-label="Plan group" className="seg rounded-full! p-1">
          {data.audiences.map((a) => (
            <button key={a.id} role="tab" type="button" id={`tab-${a.id}`} aria-controls="plans" aria-selected={aud === a.id} onClick={() => setAud(a.id as Audience)} className="rounded-full! px-5!">
              {a.label}
            </button>
          ))}
        </div>
        <div role="radiogroup" aria-label="Billing period" className="flex items-center gap-1 text-xs">
          {options.map((o) => (
            <button key={o} type="button" role="radio" aria-checked={bill === o} onClick={() => setBilling(o)} className={`flex items-center gap-1.5 rounded-full px-3 py-1 transition-colors ${bill === o ? "bg-card-2 text-fg" : "text-muted hover:text-fg"}`}>
              {BILLING_LABEL[o]}
              {SAVE[o] && <span className="text-[10px] font-semibold text-muted">{SAVE[o]}</span>}
            </button>
          ))}
        </div>
      </div>

      <div id="plans" role="tabpanel" aria-labelledby={`tab-${aud}`} className="mx-auto mt-10 grid max-w-6xl gap-4 lg:grid-cols-3">
        {CARDS[aud].map((id) =>
          id === "enterprise" ? (
            <EnterpriseCard key={id} />
          ) : (
            <Card key={id} plan={id === "pro" ? byId(cap) : byId(id)} bill={bill} setBilling={setBilling} cap={cap} setCap={setCap} highlight={HIGHLIGHT[aud] === id} />
          ),
        )}
      </div>

      {/* fine print */}
      <div className="mx-auto mt-6 max-w-6xl space-y-1.5 text-center text-xs text-muted">
        <p>{h.unit} · {data.billingNotes[bill]}</p>
        <p>{aud === "personal" ? "Online checkout through Stripe is available for monthly plans. No sign-in required." : `${data.professionalsNote} ${data.enterprise.terms}`}</p>
        {aud === "business" && (
          <p>
            {byId("enterprise").for}{" "}
            <a href={CALENDLY} className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">Book a demo</a>
          </p>
        )}
      </div>

      <section className="mt-24 grid gap-10 md:grid-cols-[1fr_2fr]" aria-labelledby="faq-h">
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

function Shell({ highlight, children }: { highlight?: boolean; children: React.ReactNode }) {
  return (
    <article className={`relative flex flex-col rounded-3xl border p-6 md:p-7 ${highlight ? "border-tint-line bg-tint" : "border-line bg-card"}`}>
      {children}
    </article>
  );
}

function Card({ plan, bill, setBilling, cap, setCap, highlight }: { plan: Plan; bill: Billing; setBilling: (b: Billing) => void; cap: string; setCap: (c: string) => void; highlight: boolean }) {
  const isPro = plan.card === "pro";
  const free = plan.monthly === 0;
  const available = free || (plan.intervals as string[]).includes(bill);
  const upfront = bill === "monthly" ? plan.monthly : (plan.upfront as Record<string, number>)[bill];
  const perMonth = plan.monthly && upfront ? upfront / MONTHS[bill] : plan.monthly;
  const name = isPro ? "Pro" : plan.name;

  return (
    <Shell highlight={highlight}>
      <div className="flex min-h-8 items-start justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{name}</h2>
        {isPro ? (
          <div role="radiogroup" aria-label="Pro capacity" className="flex gap-0.5 rounded-full border border-line bg-inset p-0.5">
            {plans.filter((p) => p.card === "pro").map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={cap === p.id} onClick={() => setCap(p.id)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-colors ${cap === p.id ? "bg-fg text-on-fg" : "text-muted hover:text-fg"}`}>
                {p.capacity}
              </button>
            ))}
          </div>
        ) : plan.recommended ? (
          <span className="rounded-full border border-tint-line px-2.5 py-0.5 text-[11px] font-medium text-fg">Recommended</span>
        ) : null}
      </div>
      <p className="mt-3 text-lg font-semibold leading-snug tracking-tight text-fg">{plan.tagline}</p>
      <p className="mt-1.5 min-h-10 text-sm text-muted">{plan.supporting}</p>

      <div className="mt-5">
        {free ? (
          <Link href={data.freeCta.href} className="btn-ghost w-full justify-center">{data.freeCta.label}</Link>
        ) : available && bill === "monthly" && plan.checkout ? (
          <a href={plan.checkout} className={`${highlight ? "btn-primary" : "btn-ghost"} w-full justify-center`} rel="noopener">Get {plan.name}</a>
        ) : (
          <button type="button" onClick={() => setBilling("monthly")} className="btn-ghost w-full justify-center">{available ? "Subscribe monthly" : "Show monthly price"}</button>
        )}
      </div>

      <div className="mt-6">
        {!available ? (
          <>
            <p className="text-3xl font-semibold tracking-tight">Monthly only</p>
            <p className="mt-1 text-xs text-muted">{BILLING_LABEL[bill]} billing is not offered for {plan.name}.</p>
          </>
        ) : (
          <>
            <p className="flex items-baseline gap-1.5">
              <span className="text-4xl font-semibold tracking-tight tabular-nums">{usd(perMonth ?? 0)}</span>
              <span className="text-sm text-muted">USD / month</span>
            </p>
            <p className="mt-1 text-xs text-muted">
              {free ? "\u00a0" : bill === "monthly" ? `Billed ${usd(upfront!, true)} monthly.` : `Billed ${usd(upfront!, true)} ${bill}. Save ${bill === "quarterly" ? 5 : 10}%.`}
            </p>
          </>
        )}
      </div>

      <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
        <li className="flex gap-2.5 font-medium text-fg"><Icon i={5} />{plan.edits}</li>
        {plan.features.map((f, i) => (
          <li key={f} className="flex gap-2.5 text-fg-2"><Icon i={i} />{f}</li>
        ))}
      </ul>
    </Shell>
  );
}

function EnterpriseCard() {
  const ent = byId("enterprise");
  const e = data.enterprise;
  return (
    <Shell>
      <div className="flex min-h-8 items-start justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight">{e.offerTitle}</h2>
        <span className="shrink-0 whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-[11px] font-medium text-muted">{ent.label}</span>
      </div>
      <p className="mt-3 text-lg font-semibold leading-snug tracking-tight text-fg">{ent.tagline}</p>
      <p className="mt-1.5 min-h-10 text-sm text-muted">{ent.supporting}</p>
      <div className="mt-5">
        <a href={`mailto:${e.email}`} className="btn-ghost w-full justify-center">Contact sales</a>
      </div>
      <div className="mt-6">
        <p className="text-4xl font-semibold tracking-tight">Contact sales</p>
        <p className="mt-1 text-xs text-muted">Pricing by agreement · {e.contracts.join(", ").replace(/ contract/g, "").toLowerCase()} contracts</p>
      </div>
      <ul className="mt-6 space-y-2.5 border-t border-line pt-5 text-sm">
        <li className="flex gap-2.5 font-medium text-fg"><Icon i={5} />{ent.edits}</li>
        {ent.features.slice(1).map((f, i) => (
          <li key={f} className="flex gap-2.5 text-fg-2"><Icon i={i} />{f}</li>
        ))}
      </ul>
      <p className="mt-auto pt-5 text-[11px] text-muted">Opens your email app. No enquiry is submitted or saved on this website.</p>
    </Shell>
  );
}
