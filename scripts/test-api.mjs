// API checks for the checkout + webhook routes against a running server (no network calls to Stripe).
// Usage: BASE=http://localhost:3202 STRIPE_WEBHOOK_SECRET=<same as server> node scripts/test-api.mjs
// Run the server with dummy test-mode values (never real keys), e.g.
//   STRIPE_SECRET_KEY=sk_test_dummy STRIPE_WEBHOOK_SECRET=whsec_dummy VECTOR_BILLING_CHECKOUT_ENABLED=true \
//   STRIPE_PRICE_PLUS_MONTHLY=price_dummy next start -p 3202
import Stripe from "stripe";
const BASE = process.env.BASE || "http://localhost:3202";
const SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new Stripe("sk_test_dummy");
let fail = 0;
const ok = (name, cond, extra = "") => { console.log(`${cond ? "PASS" : "FAIL"} ${name} ${extra}`); if (!cond) fail++; };

const status = await (await fetch(`${BASE}/api/checkout`)).json();
ok("GET /api/checkout reports status only", typeof status.configured === "boolean" && Array.isArray(status.offers), JSON.stringify(status));

const post = (body, headers = {}) => fetch(`${BASE}/api/checkout`, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });
let r = await post({ plan: "plus", interval: "monthly", requestId: "test-req-0001" }, { origin: BASE });
ok("POST checkout without sign-in never succeeds", r.status === 503 || r.status === 401, String(r.status));
r = await post({ plan: "plus", interval: "monthly", requestId: "test-req-0001" }, { origin: "https://evil.example" });
ok("POST checkout from another origin is refused", [403, 503].includes(r.status), String(r.status));

const event = JSON.stringify({ id: "evt_test_dedupe_1", object: "event", type: "customer.subscription.updated", livemode: false, data: { object: { id: "sub_test", status: "active", metadata: { vector_plan_id: "plus" } } } });
r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", body: event });
ok("webhook without signature → 400/503", [400, 503].includes(r.status), String(r.status));
r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": "t=1,v1=deadbeef" }, body: event });
ok("webhook with forged signature → 400/503", [400, 503].includes(r.status), String(r.status));
if (SECRET) {
  const sig = () => stripe.webhooks.generateTestHeaderString({ payload: event, secret: SECRET });
  r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": sig() }, body: event });
  const first = await r.json();
  ok("webhook with valid signature → 200", r.status === 200 && first.received === true && !first.duplicate, JSON.stringify(first));
  r = await fetch(`${BASE}/api/stripe/webhook`, { method: "POST", headers: { "stripe-signature": sig() }, body: event });
  const second = await r.json();
  ok("same event id delivered twice is handled once", r.status === 200 && second.duplicate === true, JSON.stringify(second));
} else console.log("SKIP signed-webhook tests (STRIPE_WEBHOOK_SECRET not set for this run)");
process.exit(fail ? 1 : 0);
