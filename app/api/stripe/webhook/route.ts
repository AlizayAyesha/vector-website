import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stripe webhook. Verifies the signature with STRIPE_WEBHOOK_SECRET on the raw body, then handles each event once.
 *
 * This website has no database, so de-duplication is an in-memory set of event ids (per server instance) and the
 * handler only logs. When ported to Vector 2.0, replace `seen` with a unique insert on the event id in the billing
 * journal (see docs/PORTING.md) and update the subscription record there.
 */
const g = globalThis as typeof globalThis & { __vectorStripeSeen?: Map<string, number> };
const seen = (g.__vectorStripeSeen ??= new Map<string, number>());
const MAX_SEEN = 5000;

const HANDLED = new Set([
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.paid",
  "invoice.payment_failed",
]);

export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return Response.json({ error: "Payments not configured" }, { status: 503 });

  const signature = req.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (seen.has(event.id)) return Response.json({ received: true, duplicate: true });
  seen.set(event.id, Date.now());
  if (seen.size > MAX_SEEN) seen.delete(seen.keys().next().value!);

  if (HANDLED.has(event.type)) {
    const obj = event.data.object as unknown as { id?: string; status?: string; metadata?: Record<string, string> };
    console.info("[stripe-webhook]", event.type, event.id, {
      object: obj.id,
      status: obj.status,
      vector_user_id: obj.metadata?.vector_user_id,
      vector_plan_id: obj.metadata?.vector_plan_id,
      vector_period: obj.metadata?.vector_period,
      livemode: event.livemode,
    });
  } else {
    console.info("[stripe-webhook] ignored", event.type, event.id);
  }
  return Response.json({ received: true });
}
