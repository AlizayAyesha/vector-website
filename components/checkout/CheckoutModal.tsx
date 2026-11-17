"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { AddressElement, Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { INTERVAL_LABEL, INTERVAL_MONTHS, INTERVAL_SAVING, STRIPE_PUBLISHABLE_KEY, usd, type Interval, type PaidPlan } from "@/lib/billing";

let stripeP: Promise<Stripe | null> | null = null;
const getStripeJs = () => (stripeP ??= STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : Promise.resolve(null));

type Status = { state: "loading" } | { state: "ready"; offers: string[] } | { state: "unconfigured" } | { state: "error" };

const PERIOD_WORD: Record<Interval, string> = { monthly: "month", quarterly: "quarter", yearly: "year" };

/**
 * Embedded checkout, laid out like the client's reference: billing-period selector, Stripe Payment Element
 * (Apple Pay / Google Pay / card / Link are rendered by Stripe itself) and billing information on the left;
 * order summary with "Due today" and "Subscribe & Pay" on the right.
 */
export default function CheckoutModal({ plan, interval, onInterval, onClose }: { plan: PaidPlan; interval: Interval; onInterval: (i: Interval) => void; onClose: () => void }) {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/checkout", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { configured: boolean; offers: string[] }) => alive && setStatus(d.configured && STRIPE_PUBLISHABLE_KEY ? { state: "ready", offers: d.offers } : { state: "unconfigured" }))
      .catch(() => alive && setStatus({ state: "error" }));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  const amount = plan.amountCents[interval]!;
  const offerReady = status.state === "ready" && status.offers.includes(`${plan.id}:${interval}`);

  return (
    <div className="theme-dark fixed inset-0 z-[80] overflow-y-auto bg-black/75 backdrop-blur-sm animate-[vfade_.22s_ease-out]" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="flex min-h-full items-start justify-center p-3 sm:p-6 md:items-center">
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-title"
          className="w-full max-w-[920px] rounded-2xl border border-line bg-[#0b0b0c] text-fg shadow-2xl outline-none animate-[vrise_.28s_ease-out]"
        >
          <header className="flex items-center gap-3 border-b border-line px-5 py-4">
            <button type="button" onClick={onClose} aria-label="Back" className="grid size-8 place-items-center rounded-md text-muted hover:bg-card-2 hover:text-fg">
              <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
            </button>
            <h2 id="checkout-title" className="text-base font-semibold">Checkout</h2>
          </header>

          {offerReady ? (
            <Elements
              key={interval}
              stripe={getStripeJs()}
              options={{
                mode: "subscription",
                amount,
                currency: "usd",
                appearance: {
                  theme: "night",
                  variables: { colorPrimary: "#3b82f6", colorBackground: "#121214", colorText: "#f4f4f5", colorTextSecondary: "#a1a1aa", borderRadius: "8px", fontFamily: "Inter, Segoe UI, system-ui, sans-serif" },
                },
              }}
            >
              <Body plan={plan} interval={interval} onInterval={onInterval} live />
            </Elements>
          ) : (
            <Body plan={plan} interval={interval} onInterval={onInterval} status={status} />
          )}
        </div>
      </div>
    </div>
  );
}

function Body({ plan, interval, onInterval, live = false, status }: { plan: PaidPlan; interval: Interval; onInterval: (i: Interval) => void; live?: boolean; status?: Status }) {
  return live ? <LiveBody plan={plan} interval={interval} onInterval={onInterval} /> : <Layout plan={plan} interval={interval} onInterval={onInterval} payment={<Unavailable plan={plan} interval={interval} status={status!} />} action={null} />;
}

function Layout({ plan, interval, onInterval, payment, action, error }: { plan: PaidPlan; interval: Interval; onInterval: (i: Interval) => void; payment: React.ReactNode; action: React.ReactNode; error?: string | null }) {
  const amount = plan.amountCents[interval]!;
  return (
    <div className="grid md:grid-cols-[1.35fr_1fr]">
      <div className="space-y-6 p-5 md:border-r md:border-line md:p-6">
        <fieldset>
          <legend className="mb-2.5 text-sm font-medium">Billing period</legend>
          <div className={`grid gap-2 ${plan.intervals.length > 2 ? "sm:grid-cols-3" : plan.intervals.length === 2 ? "sm:grid-cols-2" : ""}`}>
            {plan.intervals.map((i) => {
              const a = plan.amountCents[i]!;
              const on = i === interval;
              return (
                <label key={i} className={`relative cursor-pointer rounded-xl border p-3.5 transition-colors ${on ? "border-[#3b82f6] bg-[#3b82f6]/[0.06] ring-1 ring-[#3b82f6]" : "border-line hover:border-line-strong"}`}>
                  <input type="radio" name="interval" value={i} checked={on} onChange={() => onInterval(i)} className="sr-only" />
                  <span className="flex items-center justify-between gap-2 text-sm font-medium">
                    {INTERVAL_LABEL[i]}
                    {INTERVAL_SAVING[i] && <span className="rounded-full bg-card-2 px-1.5 py-0.5 text-[10px] font-semibold text-fg-2">Save {INTERVAL_SAVING[i]}%</span>}
                  </span>
                  <span className="mt-1.5 block text-lg font-semibold tabular-nums">{usd(a)}<span className="text-xs font-normal text-muted"> / {PERIOD_WORD[i]}</span></span>
                  <span className="block text-xs text-muted tabular-nums">{i === "monthly" ? "Billed monthly" : `${usd(Math.round(a / INTERVAL_MONTHS[i]))} / month, billed upfront`}</span>
                </label>
              );
            })}
          </div>
          {plan.intervals.length === 1 && <p className="mt-2 text-xs text-muted">{plan.name} is billed monthly only.</p>}
        </fieldset>
        {payment}
      </div>

      <aside className="flex flex-col p-5 md:p-6" aria-label="Order summary">
        <p className="text-sm text-muted">Vector OS</p>
        <p className="mt-1 text-xl font-semibold">{plan.name}</p>
        <p className="mt-0.5 text-sm text-fg-2">{plan.edits}</p>
        <dl className="mt-6 space-y-3 border-t border-line pt-5 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">{plan.name} · {INTERVAL_LABEL[interval].toLowerCase()}</dt><dd className="tabular-nums">{usd(amount)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Tax</dt><dd className="text-muted">Calculated by Stripe if applicable</dd></div>
          <div className="flex justify-between gap-4 border-t border-line pt-3 text-base font-semibold"><dt>Due today</dt><dd className="tabular-nums">{usd(amount)}</dd></div>
        </dl>
        {error && <p role="alert" className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{error}</p>}
        <div className="mt-6">{action ?? <button type="button" disabled className="h-11 w-full cursor-not-allowed rounded-lg bg-white/30 text-sm font-semibold text-black">Subscribe &amp; Pay</button>}</div>
        <p className="mt-3 text-xs leading-relaxed text-muted">
          Renews at {usd(amount)} every {PERIOD_WORD[interval]} until you cancel. Your plan is activated after Stripe confirms the payment. USD before applicable tax.
        </p>
      </aside>
    </div>
  );
}

function Unavailable({ plan, interval, status }: { plan: PaidPlan; interval: Interval; status: Status }) {
  if (status.state === "loading")
    return (
      <div aria-busy="true" className="space-y-3">
        <p className="text-sm font-medium">Payment</p>
        <div className="h-11 animate-pulse rounded-lg bg-card-2" />
        <div className="h-11 animate-pulse rounded-lg bg-card-2" />
      </div>
    );
  const fallback = interval === "monthly" && plan.paymentLink;
  return (
    <div>
      <p className="text-sm font-medium">Payment</p>
      <div role="status" className="mt-2.5 rounded-xl border border-line bg-card p-4 text-sm">
        <p className="font-medium">{status.state === "error" ? "Checkout could not be reached." : "Payments not configured in this environment."}</p>
        <p className="mt-1 text-muted">
          {status.state === "error" ? "Check your connection and try again." : "Card, Apple Pay, Google Pay and Link appear here once Stripe is connected. Nothing will be charged from this page."}
        </p>
        {fallback && (
          <a href={plan.paymentLink} rel="noopener" className="btn-ghost mt-4 rounded-lg!">
            Pay monthly on Stripe&apos;s secure page ↗
          </a>
        )}
      </div>
    </div>
  );
}

function requestIdFor(plan: string, interval: Interval) {
  const key = `vector-checkout-request:${plan}:${interval}`;
  try {
    let id = sessionStorage.getItem(key);
    if (!id) sessionStorage.setItem(key, (id = crypto.randomUUID()));
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

function LiveBody({ plan, interval, onInterval }: { plan: PaidPlan; interval: Interval; onInterval: (i: Interval) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState({ payment: false, address: false });
  const can = Boolean(stripe && elements) && complete.payment && complete.address && !busy;

  const returnUrl = useMemo(() => (typeof window === "undefined" ? "" : `${window.location.origin}/upgrade/complete?plan=${encodeURIComponent(plan.id)}&interval=${interval}`), [plan.id, interval]);

  async function pay() {
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: submitError } = await elements.submit();
    if (submitError) {
      setBusy(false);
      return setError(submitError.message || "Check your payment details.");
    }
    let clientSecret: string;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: plan.id, interval, requestId: requestIdFor(plan.id, interval) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || typeof data.clientSecret !== "string") throw new Error(data.error || "Checkout could not be started.");
      clientSecret = data.clientSecret;
    } catch (e) {
      setBusy(false);
      return setError(e instanceof Error ? e.message : "Checkout could not be started.");
    }
    const { error: confirmError } = await stripe.confirmPayment({ elements, clientSecret, confirmParams: { return_url: returnUrl } });
    // Only reached when confirmation fails; on success Stripe redirects to return_url.
    setBusy(false);
    setError(confirmError?.message || "The payment was not completed.");
  }

  return (
    <Layout
      plan={plan}
      interval={interval}
      onInterval={onInterval}
      error={error}
      payment={
        <>
          <div>
            <p className="mb-2.5 text-sm font-medium">Pay with</p>
            <PaymentElement options={{ layout: { type: "tabs" }, wallets: { applePay: "auto", googlePay: "auto" } }} onChange={(e) => setComplete((c) => ({ ...c, payment: e.complete }))} />
          </div>
          <div>
            <p className="mb-2.5 text-sm font-medium">Billing information</p>
            <AddressElement options={{ mode: "billing" }} onChange={(e) => setComplete((c) => ({ ...c, address: e.complete }))} />
          </div>
        </>
      }
      action={
        <button type="button" onClick={pay} disabled={!can} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40">
          {busy && <span className="size-3.5 animate-spin rounded-full border-2 border-black border-r-transparent" aria-hidden="true" />}
          {busy ? "Processing…" : "Subscribe & Pay"}
        </button>
      }
    />
  );
}
