"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { NOT_CONFIGURED, useSession } from "@/lib/auth";
import { getPaidPlan, INTERVAL_LABEL, INTERVAL_MONTHS, INTERVAL_SAVING, isInterval, loginPath, upgradePath, usd, type Interval } from "@/lib/billing";
import CheckoutModal from "./CheckoutModal";

/** Plan review page (/upgrade?plan=…): what you are buying, then "Get <Plan>" opens the checkout modal. */
export default function UpgradeView() {
  const params = useSearchParams();
  const router = useRouter();
  const plan = getPaidPlan(params.get("plan"));
  const asked = params.get("interval");
  const [interval, setInterval_] = useState<Interval>(() => (plan && isInterval(asked) && plan.intervals.includes(asked) ? asked : "monthly"));
  const [open, setOpen] = useState(params.get("checkout") === "1");
  const session = useSession();

  // Signed out (with sign-in configured): go through /login and come back here.
  useEffect(() => {
    if (plan && session.status === "signed-out") router.replace(loginPath(upgradePath(plan.id, interval)));
  }, [session.status, plan, interval, router]);

  const setInterval = useCallback(
    (i: Interval) => {
      setInterval_(i);
      if (plan) window.history.replaceState(null, "", upgradePath(plan.id, i) + (open ? "&checkout=1" : ""));
    },
    [plan, open],
  );
  const close = useCallback(() => setOpen(false), []);

  if (!plan)
    return (
      <div className="mx-auto max-w-lg text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Choose a plan first</h1>
        <p className="mt-3 text-muted">That plan isn&apos;t available for online checkout. Free needs no subscription, and On-Premises Deployment is arranged with sales.</p>
        <Link href="/pricing" className="btn-ghost mt-8">See pricing</Link>
      </div>
    );

  const amount = plan.amountCents[interval]!;
  const perMonth = Math.round(amount / INTERVAL_MONTHS[interval]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/pricing" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
        All plans
      </Link>
      <h1 className="mt-5 text-3xl font-semibold tracking-tight md:text-4xl">Upgrade to {plan.name}</h1>
      <p className="mt-2 text-fg-2">{plan.tagline}</p>

      {session.status === "unconfigured" && (
        <p role="status" className="mt-6 rounded-xl border border-line bg-card px-4 py-3 text-sm text-muted">
          {NOT_CONFIGURED} You can still review the plan and its prices here.
        </p>
      )}
      {session.status === "signed-in" && <p className="mt-6 text-sm text-muted">Signed in as <span className="text-fg">{session.session.user.email}</span></p>}

      <section className="mt-8 rounded-2xl border border-line bg-card p-6" aria-labelledby="plan-h">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="plan-h" className="text-xl font-semibold">{plan.name}</h2>
            <p className="mt-1 text-sm text-muted">{plan.edits}</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-semibold tabular-nums">{usd(perMonth)}<span className="text-sm font-normal text-muted"> / month</span></p>
            <p className="text-xs text-muted">{interval === "monthly" ? "Billed monthly" : `${usd(amount)} billed ${interval} · save ${INTERVAL_SAVING[interval]}%`}</p>
          </div>
        </div>
        {plan.intervals.length > 1 && (
          <div role="radiogroup" aria-label="Billing period" className="seg mt-5">
            {plan.intervals.map((i) => (
              <button key={i} type="button" role="radio" aria-checked={i === interval} aria-pressed={i === interval} onClick={() => setInterval(i)}>
                {INTERVAL_LABEL[i]}
              </button>
            ))}
          </div>
        )}
        <ul className="mt-6 grid gap-2.5 border-t border-line pt-5 text-sm sm:grid-cols-2">
          {plan.features.map((f) => (
            <li key={f} className="flex gap-2.5 text-fg-2">
              <svg viewBox="0 0 16 16" className="mt-0.5 size-4 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 8.5 6.5 12 13 4.5" /></svg>
              {f}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setOpen(true)}
          disabled={session.status === "loading"}
          className="mt-7 inline-flex h-11 w-full items-center justify-center rounded-lg bg-fg text-sm font-semibold text-on-fg transition-opacity hover:opacity-90 disabled:opacity-50 sm:w-auto sm:px-8"
        >
          Get {plan.name}
        </button>
      </section>

      {open && <CheckoutModal plan={plan} interval={interval} onInterval={setInterval} onClose={close} />}
    </div>
  );
}
