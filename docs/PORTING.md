# Porting guide: login, checkout and dashboards → Vector 2.0

Branch `phase-2-website-revisions` of `AlizayAyesha/vector-website`. Written 17 Nov 2026 against the Vector 2.0 repo
(`nauticalinsightsai-boop/Vector-2.0`, GitHub `main` @ `3b8a65a`, 17 Nov 2026, plus the local checkout at `G:\Vector 2.0`
and its `codex/*` branches, all read only). Everything here is UI and server scaffolding that **never fakes success**:
without credentials every screen shows its "not configured / not connected" state.

## 1. What was added

| Area | Files | Behaviour |
| --- | --- | --- |
| Auth adapter | `lib/auth.ts`, `lib/auth-config.ts`, `lib/supabase/{client,server}.ts`, `lib/auth-server.ts` | `AuthAdapter` interface + Supabase implementation (`@supabase/ssr`, cookie session, PKCE). Enabled only when `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set; otherwise `getAuth()` is `null` |
| Login | `app/login/page.tsx`, `components/auth/*` | "Welcome to Vector", always-visible "Continue with Google" (Vector's only OAuth provider; `signInWithOAuth({ provider: "google", options: { redirectTo: <origin>/auth/callback?next=…, queryParams: { prompt: "select_account" } } })`, i.e. the same authorize request as Vector 2.0: provider=google, redirect_to=/auth/callback, PKCE s256, optional prompt=select_account, no extra scopes; without Supabase config the click shows "Sign-in is not configured in this environment"), "or", email field, "Continue with email" (magic link via `signInWithOtp`), sign-up mode, Terms/Privacy. Validation, loading, sent, error states. Dark + light |
| Callback | `app/auth/callback/route.ts` | Exchanges the PKCE `code`, redirects to a same-site `next` only (open-redirect safe); failures go to `/login?error=callback` |
| Plan review | `app/upgrade/page.tsx`, `components/checkout/UpgradeView.tsx` | `/upgrade?plan=<id>[&interval=]`; signed-out → `/login?next=/upgrade?plan=<id>`; "Get <Plan>" opens the modal |
| Checkout modal | `components/checkout/CheckoutModal.tsx` | Fade-in dark modal, back arrow, billing-period cards (selected = blue border; only periods the catalogue has), Stripe Payment Element (Stripe renders Apple Pay / Google Pay / card / Link) + Address Element (billing), summary with "Due today" and solid white "Subscribe & Pay". Not configured → honest notice + the plan's live Payment Link (monthly) |
| Return page | `app/upgrade/complete/page.tsx` | Says the plan activates once Stripe confirms; the query string is never treated as proof |
| Checkout API | `app/api/checkout/route.ts` | `GET` status only. `POST {plan, interval, requestId}`: same-origin check → verified Supabase user (`auth.getUser()`) → catalogue check → **Stripe price must match the catalogue amount and interval** → find/create customer (`metadata.vector_user_id`) → `subscriptions.create` with `payment_behavior: default_incomplete` and an idempotency key per attempt → returns the first invoice's `confirmation_secret.client_secret`. 503 `Payments not configured` when keys/flag/prices are missing |
| Webhook | `app/api/stripe/webhook/route.ts` | Verifies `stripe-signature` with `STRIPE_WEBHOOK_SECRET` on the raw body, de-duplicates on `event.id`, logs subscription/invoice events. No DB in this repo |
| Pricing buttons | `components/Pricing.tsx` | Checkout UI enabled → `Get <Plan>` goes to `/login?next=/upgrade?plan=<id>` (or `/upgrade` when signed in) for every period the plan offers. Not enabled → unchanged: the existing live `buy.stripe.com` links (monthly) |
| Dashboard | `app/dashboard`, `components/dashboard/{Shell,UserDashboard}.tsx` | Account, Usage, Billing & invoices, Upgrade plan, Connectors, Teams (Coming soon). Settings-style rows; real data only (session email/dates, plan catalogue, connector catalogue); everything else "Not connected" |
| Admin | `app/admin`, `components/dashboard/AdminDashboard.tsx` | Users, Subscriptions, Usage, Audit log. Requires `app_metadata.role === "admin"`. Revoke / reset actions open a typed-email confirm dialog that reports "admin API not connected, nothing was changed" |
| Privacy | `app/robots.ts`, page metadata | `/login`, `/upgrade*`, `/dashboard`, `/admin` are `noindex`, not in the sitemap or public nav |

## 2. Environment variables (names only; see `.env.example`)

| Name | Where | Purpose | Same name in Vector 2.0? |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | client+server | Supabase project URL | Yes (`apps/web/lib/supabase/client.ts`; Vector's project is pinned there) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | client+server | `sb_publishable_…` key | Yes |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | Stripe.js / Payment Element | New (Vector 2.0 uses hosted Checkout, no publishable key) |
| `VECTOR_BILLING_CHECKOUT_ENABLED` | server | Must be `true` to allow checkout | Yes (`apps/web/lib/billing/live-config.mjs`) |
| `STRIPE_SECRET_KEY` | server | Stripe API | Yes (`supabase/functions/billing-checkout` on `codex/stripe-live-closure`) |
| `STRIPE_WEBHOOK_SECRET` | server | Webhook signature | Standard Stripe name |
| `STRIPE_PRICE_<PLAN>_<INTERVAL>` | server | Recurring price id per offer, e.g. `STRIPE_PRICE_PLUS_YEARLY` | New. Vector 2.0 keeps price ids server-side in its pricebook (`VECTOR_BILLING_LIVE_PRICEBOOK_JSON`, database pricebook) |

Quarterly prices must be Stripe prices with `interval=month, interval_count=3`; yearly `interval=year` (same mapping as
`services/api/src/billing/live-pricebook.mjs`). The API refuses any price whose amount differs from `content/pricing.json`.

## 3. Findings from the real repo (evidence)

| Item | Finding | Source |
| --- | --- | --- |
| Auth provider | Supabase Auth via `@supabase/ssr`, `createBrowserClient` / `createServerClient` with the request cookies; callback `exchangeCodeForSession` | `apps/web/lib/supabase/client.ts`, `server.ts`, `apps/web/app/auth/callback/route.js` (GitHub `main`) |
| Supabase project | Pinned to `https://fyggbrtcujadrloidsbv.supabase.co`, key must match `sb_publishable_…` | `apps/web/lib/billing/live-config.mjs` |
| Website sign-in UI | Google ("Continue securely with Google") + email code, admin sign-in with password + MFA at `/admin/sign-in`, via the BFF `/api/vector/v1/session/*` | `apps/web/components/auth/SignIn.jsx`, `AdminPasswordSignIn.jsx` |
| Checkout today | Hosted Stripe Checkout redirect (`checkout.stripe.com/c|g/pay/cs_live_…`) through the BFF `/api/vector/v1/billing/*`; release gate `VECTOR_BILLING_CHECKOUT_ENABLED=true` + `VECTOR_LIVE_BILLING_RELEASE=supabase-stripe/1.0` | `apps/web/lib/billing/live-config.mjs`, `LIVE-INTEGRATION.md` |
| Prices | Go $20 / $57 quarterly / $216 yearly; Plus $50 / $142.50 / $540; Pro $100 / $285; Pro Advanced $200 / $570; Pro Max $500; Ultra $1,000 (monthly only for the last two). Identical to `content/pricing.json` | `packages/contracts/subscription-policy-v1/policy.json` |
| Payment Links | The six live monthly links in `content/pricing.json` are the same as the owner-authorized guest links (verified there 6 Nov 2026) | `apps/web/lib/billing/guest-payment-links.mjs` |
| Yearly / quarterly links | **None exist.** Only monthly guest links; longer periods only through the server pricebook | same |
| Waitlist | `/api/waitlist` is same-origin only (403 `SAME_ORIGIN_REQUIRED` for other hosts; admits `vectorproject.vercel.app` and localhost:3100); needs `WAITLIST_APPS_SCRIPT_URL` + `WAITLIST_INGEST_SECRET` server-side. No public endpoint for this site | `apps/web/lib/waitlist-origin.mjs`, `apps/web/auth/WAITLIST_BINDINGS.md` (`codex/stage02-web-qualification`) |
| Release info | Current release is read at runtime from the API `/v1/public/releases/current` (`DOWNLOAD_ORIGIN`, `VECTOR_RELEASE_PRODUCT_ID`, `VECTOR_RELEASE_CHANNEL`). The only static data is the legacy beta reference `2.0.0-beta.611bf918bfc6` (contact-only, no date); its download page shows "Not published yet" for the date, same as ours | `apps/web/lib/public-releases.server.mjs`, `apps/web/lib/public-beta.mjs`, `apps/web/app/download/page.tsx` |
| SDK | **No public SDK content.** Only internal pieces: `@vector/contracts` artifact qualification (`tooling/architecture/sdk-contracts.mjs`, "not an SDK implementation or publisher") and the Rhino `SdkGateway` bridge | listed paths |
| Design tokens | shadcn tokens: bg `#000`, fg `#fafafa`, card `#0a0a0a`, secondary `#1a1a1a`, muted-fg `#a3a3a3`, border `#303030`, radius `.5rem`; light fg `#171717`, secondary `#f5f5f5`, border `#858585`. Applied to `app/globals.css` | `packages/ui/styles/globals.css`, `packages/ui/design-policy.json` |

## 4. Screen → real module map

| This repo | Vector 2.0 (`apps/web`, GitHub `main`) |
| --- | --- |
| `/login` (`components/auth/LoginForm.tsx`) | `app/sign-in/page.jsx` → `components/auth/SignIn.jsx` (+ `sign-in.module.css`); admin: `app/admin/sign-in`, `AdminPasswordSignIn.jsx` |
| `app/auth/callback/route.ts` | `app/auth/callback/route.js`, `lib/auth/supabase-callback.mjs` |
| `lib/auth.ts` adapter | `lib/supabase/client.ts`, `lib/auth/server-session.mjs`, `lib/auth/supabase-request-runtime.mjs` |
| Pricing buttons | `components/Pricing.tsx`, `components/pricing/checkout-controls.jsx`, `plan-card.jsx` |
| `/upgrade` + checkout modal | new; would call `lib/billing/client-controller.mjs` → BFF `app/api/vector/v1/billing/[action]/route.js` → `lib/billing/server-billing.mjs` |
| `app/api/checkout` | replace with the BFF `checkout` action (`server-billing.mjs`, `services/api/src/billing/*`) returning a client secret instead of a redirect URL |
| `app/api/stripe/webhook` | `services/api/src/billing/stripe-webhook.mjs` + `reconcile-events.mjs` (durable event journal) |
| Dashboard › Account | `components/dashboard/profile-view.tsx`, `UserSettings.tsx`, `app/dashboard/settings` |
| Dashboard › Usage | `components/dashboard/usage-view.tsx`, `Usage.tsx`, `app/dashboard/usage` |
| Dashboard › Billing | `components/dashboard/Billing.tsx`, `customer/billing-view.tsx`, `use-live-billing.ts`, `app/dashboard/billing` |
| Dashboard › Upgrade | `StarterPlansDialog.tsx`, `CurrentSubscription.tsx` |
| Dashboard › Connectors | `components/dashboard/Connectors.tsx`, `app/dashboard/connectors` |
| Dashboard › Teams | `customer/team-view.tsx`, `app/dashboard/teams` |
| Admin › Users / Subscriptions / Usage | `app/dashboard/admin/[section]`, `admin/StaffConsole.tsx`, `staff/commercial-view.tsx`, `staff/operations-view.tsx`, `lib/admin/accounts-bff.mjs`, API `app/api/vector/v1/admin/*` |
| Admin › Audit log | `staff/audit-view.tsx` |
| Admin confirm dialog | `admin/StaffActionReview.tsx`, `lib/admin/commands-bff.mjs` |

## 5. How to port

1. Copy `components/auth/*`, `components/checkout/*`, `components/dashboard/Shell.tsx` (layout pieces) and the CSS tokens.
2. Keep Vector 2.0's own `lib/supabase/*` and BFF; implement `AuthAdapter` on top of them (the interface is small: session, providers, email/OAuth/SSO sign-in, sign-out).
3. For embedded checkout, change the BFF checkout action to create the subscription (or a Checkout Session with `ui_mode: "custom"`) and return a client secret; keep the server-side pricebook, duplicate-subscription fence and webhook reconciliation exactly as they are.
4. Replace every "Not connected" panel with the existing dashboard views' data hooks.
5. Admin role: Vector 2.0 has its own staff permission + MFA model; use it instead of `app_metadata.role`.

## 6. Tests run (17 Nov 2026)

- `pnpm lint` (tsc), `pnpm build` (175 routes) pass.
- Crawl: 166 sitemap pages 200, 178 internal link targets, 0 broken; new routes `/login`, `/upgrade`, `/upgrade/complete`, `/dashboard`, `/admin` 200; not in sitemap.
- Headless Chrome, 1280 and 360, dark + light: 0 console/page errors; no horizontal scroll at 360.
- `scripts/test-api.mjs`: status route, checkout refuses without sign-in / other origin, webhook rejects missing and forged signatures, accepts a correctly signed event (dummy `whsec_` secret) and reports the second delivery of the same event id as a duplicate.
- Configured-build check (dummy Supabase URL/key + dummy `pk_test_`): pricing buttons route to `/login?next=%2Fupgrade%3Fplan%3D…`, signed-out `/upgrade` redirects to login, email validation and the send-failure error state render.

**Not run (needs credentials):** real sign-in, Payment Element rendering, a test-mode subscription payment, a real Stripe webhook delivery. Needs Vector's Supabase publishable key + redirect URL allow-listed for this site's origin, a Stripe **test** secret + publishable key, test price ids, and a test webhook secret.

### Google sign-in note
Vector 2.0 does **not** call `supabase.auth.signInWithOAuth` in the browser. Its BFF (`POST /api/vector/v1/session/login-begin {method:"google"}` /
`google-start`) builds the Supabase authorize URL server-side (`services/api/src/identity/supabase-google-pkce.mjs`, receipt
`docs/delivery/identity/GOOGLE_SUPABASE_PKCE_20261114/RECEIPT.md`) and `components/auth/SignIn.jsx` only accepts a redirect to
`<project>.supabase.co/auth/v1/authorize` with exactly `provider=google`, `redirect_to=<site>/auth/callback?attempt_id&state`,
`code_challenge`, `code_challenge_method=s256` and optionally `prompt=select_account`. When porting, wire the button to that BFF action
instead of the browser SDK call used here.
