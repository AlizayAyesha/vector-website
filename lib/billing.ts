/**
 * Plan catalogue helpers shared by the pricing page, /upgrade, the checkout modal and the checkout API.
 * Every amount comes from content/pricing.json (Vector's own plan catalogue; it matches
 * packages/contracts/subscription-policy-v1/policy.json in the Vector 2.0 repo). Nothing here invents a price.
 */
import data from "@/content/pricing.json";
import { AUTH_CONFIGURED } from "./auth-config";

export type Interval = "monthly" | "quarterly" | "yearly";
export const INTERVAL_LABEL: Record<Interval, string> = { monthly: "Monthly", quarterly: "Quarterly", yearly: "Yearly" };
export const INTERVAL_MONTHS: Record<Interval, number> = { monthly: 1, quarterly: 3, yearly: 12 };
export const INTERVAL_SAVING: Partial<Record<Interval, number>> = { quarterly: 5, yearly: 10 };
/** How each interval maps to a Stripe recurring price (same mapping as Vector 2.0 services/api/src/billing/live-pricebook.mjs). */
export const STRIPE_RECURRING: Record<Interval, { interval: "month" | "year"; interval_count: number }> = {
  monthly: { interval: "month", interval_count: 1 },
  quarterly: { interval: "month", interval_count: 3 },
  yearly: { interval: "year", interval_count: 1 },
};

type RawPlan = (typeof data.plans)[number] & { checkout?: string; capacity?: string; recommended?: boolean };
export interface PaidPlan {
  id: string;
  name: string;
  tagline: string;
  edits: string;
  features: string[];
  intervals: Interval[];
  /** Charge per billing period, in USD cents. */
  amountCents: Partial<Record<Interval, number>>;
  /** Vector's existing live Stripe Payment Link (monthly only). Used as the fallback until embedded checkout is configured. */
  paymentLink?: string;
}

const cents = (usd: number) => Math.round(usd * 100);

export const PAID_PLANS: PaidPlan[] = (data.plans as RawPlan[])
  .filter((p) => typeof p.monthly === "number" && p.monthly > 0)
  .map((p) => {
    const intervals = (p.intervals as string[]).filter((i): i is Interval => i === "monthly" || i === "quarterly" || i === "yearly");
    const amountCents: Partial<Record<Interval, number>> = {};
    for (const i of intervals) {
      const v = i === "monthly" ? p.monthly : (p.upfront as Record<string, number | undefined>)[i];
      if (typeof v === "number" && v > 0) amountCents[i] = cents(v);
    }
    return {
      id: p.id,
      name: p.name,
      tagline: p.tagline,
      edits: p.edits,
      features: p.features,
      intervals: intervals.filter((i) => amountCents[i] != null),
      amountCents,
      paymentLink: p.checkout,
    };
  });

export const getPaidPlan = (id: string | null | undefined) => PAID_PLANS.find((p) => p.id === id) ?? null;
export const isInterval = (v: unknown): v is Interval => v === "monthly" || v === "quarterly" || v === "yearly";

export const usd = (centsValue: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: centsValue % 100 ? 2 : 0 }).format(centsValue / 100);

/**
 * The embedded checkout UI is offered only when both sign-in and a Stripe publishable key are configured.
 * Otherwise plan buttons keep using Vector's existing live Payment Links so the public site never breaks.
 * (The server still re-checks its own secret key and price ids and answers 503 if they are missing.)
 */
export const STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
export const CHECKOUT_UI_ENABLED = AUTH_CONFIGURED && Boolean(STRIPE_PUBLISHABLE_KEY);

export const upgradePath = (planId: string, interval?: Interval) =>
  `/upgrade?plan=${encodeURIComponent(planId)}${interval && interval !== "monthly" ? `&interval=${interval}` : ""}`;
export const loginPath = (next: string) => `/login?next=${encodeURIComponent(next)}`;
