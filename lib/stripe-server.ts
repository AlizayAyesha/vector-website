import "server-only";
import Stripe from "stripe";
import { PAID_PLANS, type Interval } from "./billing";

/**
 * Server-only Stripe access. Keys and price ids are read from the environment at request time and never sent to
 * the browser. Price id variables follow STRIPE_PRICE_<PLAN>_<INTERVAL>, e.g. STRIPE_PRICE_GO_MONTHLY,
 * STRIPE_PRICE_PLUS_YEARLY, STRIPE_PRICE_PRO_ADVANCED_QUARTERLY (plan id upper-cased).
 */
export const priceEnvName = (planId: string, interval: Interval) => `STRIPE_PRICE_${planId.toUpperCase()}_${interval.toUpperCase()}`;

export function priceIdFor(planId: string, interval: Interval): string | null {
  const v = process.env[priceEnvName(planId, interval)];
  return v && /^price_[A-Za-z0-9]+$/.test(v) ? v : null;
}

let client: Stripe | null = null;
export function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || !/^(sk|rk)_(test|live)_/.test(key)) return null;
  client ??= new Stripe(key, { appInfo: { name: "vector-website" } });
  return client;
}

/** Plan/interval pairs that have both a catalogue price and a configured Stripe price id. */
export function configuredOffers(): string[] {
  const out: string[] = [];
  for (const p of PAID_PLANS) for (const i of p.intervals) if (priceIdFor(p.id, i)) out.push(`${p.id}:${i}`);
  return out;
}

/**
 * Embedded checkout runs only when explicitly switched on (same flag name as Vector 2.0
 * apps/web/lib/billing/live-config.mjs) AND a secret key and at least one price id are present.
 */
export const checkoutEnabled = () => process.env.VECTOR_BILLING_CHECKOUT_ENABLED === "true";
export const paymentsConfigured = () => checkoutEnabled() && Boolean(getStripe()) && configuredOffers().length > 0;
