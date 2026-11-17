import { AUTH_CONFIGURED } from "@/lib/auth-config";
import { currentUser } from "@/lib/auth-server";
import { getPaidPlan, isInterval, STRIPE_RECURRING } from "@/lib/billing";
import { configuredOffers, getStripe, paymentsConfigured, priceIdFor } from "@/lib/stripe-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: NO_STORE });

/** Status only: whether embedded checkout can run here, and which plan:interval offers have a Stripe price id. */
export async function GET() {
  return json({ configured: paymentsConfigured() && AUTH_CONFIGURED, auth: AUTH_CONFIGURED, offers: paymentsConfigured() ? configuredOffers() : [] });
}

/**
 * Starts a subscription for the signed-in user and returns the client secret of its first payment, which the
 * browser confirms with the Stripe Payment Element. Access is NOT granted here: the subscription stays
 * `incomplete` until Stripe confirms payment, and the signed webhook (app/api/stripe/webhook) is the source of truth.
 */
export async function POST(req: Request) {
  const stripe = getStripe();
  if (!stripe || !paymentsConfigured()) return json({ error: "Payments not configured", code: "PAYMENTS_NOT_CONFIGURED" }, 503);
  if (!AUTH_CONFIGURED) return json({ error: "Sign-in is not configured in this environment", code: "AUTH_NOT_CONFIGURED" }, 503);

  // Cookie-authenticated POST: accept it only from this site's own pages (CSRF guard).
  const origin = req.headers.get("origin");
  if (!origin || origin !== new URL(req.url).origin) return json({ error: "Please start checkout from this website", code: "SAME_ORIGIN_REQUIRED" }, 403);

  const user = await currentUser(req);
  if (!user) return json({ error: "Sign in to continue", code: "UNAUTHENTICATED" }, 401);
  if (!user.email) return json({ error: "Your account has no verified email address", code: "NO_EMAIL" }, 400);

  let body: { plan?: unknown; interval?: unknown; requestId?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid request", code: "BAD_REQUEST" }, 400);
  }
  const plan = getPaidPlan(typeof body.plan === "string" ? body.plan : null);
  const interval = isInterval(body.interval) ? body.interval : null;
  const requestId = typeof body.requestId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(body.requestId) ? body.requestId : null;
  if (!plan || !interval || !requestId || !plan.intervals.includes(interval)) return json({ error: "That plan and billing period are not offered", code: "UNSUPPORTED_OFFER" }, 400);

  const priceId = priceIdFor(plan.id, interval);
  if (!priceId) return json({ error: "Payments not configured for this plan", code: "PAYMENTS_NOT_CONFIGURED" }, 503);

  try {
    // The configured Stripe price must match the published catalogue exactly; refuse to charge anything else.
    const price = await stripe.prices.retrieve(priceId);
    const want = STRIPE_RECURRING[interval];
    if (
      !price.active ||
      price.currency !== "usd" ||
      price.unit_amount !== plan.amountCents[interval] ||
      price.recurring?.interval !== want.interval ||
      (price.recurring?.interval_count ?? 1) !== want.interval_count
    ) {
      console.error("[checkout] price mismatch", { plan: plan.id, interval, priceId });
      return json({ error: "This plan's price is being updated. Try again later.", code: "PRICE_MISMATCH" }, 409);
    }

    const existing = await stripe.customers.list({ email: user.email, limit: 10 });
    const customer =
      existing.data.find((c) => c.metadata?.vector_user_id === user.id) ??
      (await stripe.customers.create(
        { email: user.email, metadata: { vector_user_id: user.id } },
        { idempotencyKey: `vector-customer:${user.id}` },
      ));

    const meta = { vector_user_id: user.id, vector_plan_id: plan.id, vector_period: interval };
    const sub = await stripe.subscriptions.create(
      {
        customer: customer.id,
        items: [{ price: priceId }],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        metadata: meta,
        expand: ["latest_invoice.confirmation_secret"],
      },
      // One subscription per checkout attempt, even if the request is retried.
      { idempotencyKey: `vector-sub:${user.id}:${plan.id}:${interval}:${requestId}` },
    );
    const invoice = sub.latest_invoice;
    const clientSecret = invoice && typeof invoice !== "string" ? invoice.confirmation_secret?.client_secret : null;
    if (!clientSecret) return json({ error: "Stripe did not return a payment to confirm", code: "NO_PAYMENT" }, 502);
    return json({ clientSecret, subscriptionId: sub.id });
  } catch (e) {
    console.error("[checkout] stripe error", e instanceof Error ? e.message : e);
    return json({ error: "Checkout could not be started. Try again.", code: "STRIPE_ERROR" }, 502);
  }
}
