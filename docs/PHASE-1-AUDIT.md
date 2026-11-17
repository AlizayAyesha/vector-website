# Phase 1 — Repository audit (vector-website)

Audited 14 Nov 2026 on `main` @ 061aa64. Scope: this repository only. The brief also asks for the Vector desktop
application, SDK and backend; **those repositories are not available to this project**, so anything that depends on
them is listed under "Blocked" below instead of being simulated.

## 1. What this repository is

The public marketing website for Vector OS (vectoros.one), built by ZarLabs for the client. It is a static Next.js site:

| Area | Implementation |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, pnpm |
| 3D | three.js (`components/three/*`, `components/demo/*`), pinned scroll-scrubbed sections |
| Content | JSON in `content/` ported from vectoros.one (`routes.json`, `pages/*.json`, `pricing.json`, `software.json`, `gallery.json`) |
| Rendering | Fully static (SSG): 166 sitemap pages, 130 software detail pages via `generateStaticParams` |
| Hosting | Vercel project `vector-website`, auto-deploys `main` to vector-website-five.vercel.app |
| SEO | `noindex` everywhere unless `NEXT_PUBLIC_SITE_INDEXABLE=true`; canonicals point at vectoros.one |
| Lint | `pnpm lint` = `tsc --noEmit` (no ESLint config in repo) |
| Tests | None in repo before Phase 2; QA is a crawl + headless-browser script (see PR) |

### Routes
`/` (custom), `/pricing`, `/gallery`, `/software`, `/software/[slug]` (130), `/download` (custom since Phase 2),
and a catch-all `app/[...slug]` rendering ported HTML for `/product`, `/product/workspace-modes`, `/ai/*` (8),
`/tutorials/*` (16), `/releases`, `/support`, `/privacy`, `/terms`. SEO files: `robots.ts`, `sitemap.ts`, `manifest.ts`.

### Integrations (all outbound links — nothing is posted from this site)
| Integration | How |
| --- | --- |
| Calendly | `components/BookDemo.tsx`: Vector's real scheduler in a `<dialog>` iframe; any link to the Calendly URL opens it |
| Sign-in | Link to `https://vectorproject.vercel.app/sign-in` (Vector's own app; vectoros.one/sign-in redirects there). The live vectoros.one uses Supabase Auth email OTP — observed in its public JS, not integrated here |
| Stripe | Vector's own Stripe Payment Links per monthly plan (`content/pricing.json` → `checkout`) |
| Waitlist | `vectoros.one/api/waitlist` rejects cross-origin requests (no `Access-Control-Allow-Origin`, re-checked 14 Nov 2026), so the site hands off to `vectoros.one/waitlist#join` |
| Contact | `office@sh3ikhmabz.com` (the project contact used on vectoros.one) via `mailto:` |
| Analytics | None |

### Home page structure (before Phase 2)
1. Intro — pinned hero + 3D part → V mark + connector hexagons
2. Demo — pinned, 2000vh, chapters **01 Ask ("Interface 1")**, 02 Plan, 03 Standards, **04 Connect ("Connector Screen 4")**, 05 Hull, 06 Façade, 07 Mechanical (rebuilt shot-by-shot from Vector's recordings), 08 Ready + outro
3. Sample workspace — scripted website mock (Frame study / Utility workboat / Support bracket)
4. How it works, 5. Story (3D), 6. Recorded projects (videos), 7. Tools marquee, 8. CTA, 9. FAQ, footer

## 2. Findings

### Placeholder / example / invented content
- **Sample workspace** (`components/SampleWorkspace.tsx`): scripted example projects "Frame study", "Utility workboat", "Support bracket" and an illustration drawn for this site; a second, different-looking app mock next to the demo. → removed in Phase 2.
- **Demo chat card ("Interface 1")**: generic chat bubble UI that did not match the real app. The real desktop UI (visible in Vector's recordings: `Workspace / <project>` title bar, `✦ Plan | ⌘ Build` switch, `Full access` toggle, "What are we working on? / Talk it through in Plan. Make it happen in Build.", "Ready to build? · Prepare my plan · Proceed to Build ↗", "Build running") → rebuilt in Phase 2.
- Demo numbers are sample data and are labelled "Illustrative demo · sample data" (kept, already honest).
- Story beat titles in `lib/content.ts` are marked `// new` (original supporting copy) — flagged for client review, not changed.
- Download page shows a "Historical beta reference" with SHA-256/bytes/revision publicly → hidden in Phase 2 (data kept in `content/release.json`).
- No release date exists anywhere in Vector's public data; Phase 2 shows "Not published yet" instead of inventing one.

### Duplicates / inconsistencies
- Enterprise appeared twice on pricing (a card plus a section with three identical "Custom Quote" boxes) → merged.
- Two waitlist entry points (`/waitlist` page and `WaitlistJoin` embed) → replaced by one dialog.
- Hard-coded colours (`bg-black`, `#050505`, `#d4d4d8`, `white/5` …) across components prevented a light theme → tokenised.
- Filter UIs (gallery, software directory) used generic dropdown bars rather than the app's segmented tabs; the desktop app's Connections screen uses a search bar, category tabs, a status filter and a vendor-grouped catalogue (see `docs/references/`).

### Broken / risky behaviour
- No broken routes or internal links (crawl: 166 pages, 178 link targets, all 200).
- Booking dialog: page kept scrolling underneath it (the pinned demo's autoplay scrolls the window) and on phones the iframe sat in a small centred box; no slow-load fallback. → fixed.
- `/#workspace` CTA would 404-in-page once the sample section is removed → retargeted.

### Not present in this repo (confirmed)
No authentication, session handling, database, ORM/schema, migrations, API routes (other than the static search index
added in Phase 2), Stripe SDK/webhooks, user or admin dashboard, node editor, agent runtime, or desktop/SDK code.

## 3. Blocked without the Vector app / SDK / backend repositories

| Brief item | Why it cannot be done here |
| --- | --- |
| User dashboard (account, usage, tokens, billing, connectors) | Needs Vector's real user, usage and connector records and its auth session. Building it here would mean a second auth system and fake data, which the brief forbids |
| Admin dashboard, RBAC, audit log, revoke/reset actions | Needs the backend's roles, user tables and server-side authorization |
| Shared auth / session sync | Vector's auth lives in its own app (sign-in at vectorproject.vercel.app; vectoros.one uses Supabase email OTP). Needs that project's config and the decision on how the website shares the session (same domain cookies or OAuth redirect) |
| Database / migrations | No schema access |
| Stripe subscriptions, webhooks, invoices, idempotent events | Needs Vector's Stripe account (test keys + webhook secret) and the backend that owns subscription records. Only public Payment Links exist today |
| Dynamic node customisation; Hull / Façade / Mechanical agent switching | Live in the desktop application, not the website |
| Desktop sync, SDK sections | No SDK repo, docs or public SDK content on vectoros.one to reuse |
| Email subscription to Vector's list from this site | `vectoros.one/api/waitlist` must add CORS for this origin, or provide an endpoint (`NEXT_PUBLIC_SUBSCRIBE_ENDPOINT` is wired and ready) |

### Design reference for the future user dashboard
The client's reference for the user dashboard is the Cursor dashboard *Settings* page: a left navigation (Overview,
Settings, Usage, Spending, Billing & Invoices) and content grouped into bordered rows. It is listed in
[`docs/references/`](references/README.md) as `dashboard-settings-cursor.png`. The dashboard itself belongs to the
Vector app/auth work, not this repository.

## 4. Prioritised plan

1. **Phase 2 (this PR)** — website-only revisions: Interface 1, remove section after the demo, keep Connector screen 4,
   Calendly fix, footer branding, product dropdowns + site search with filters, desktop-style tabs, "Collections" →
   "Use cases", pricing redesign (Personal / Business, On-Premises Deployment), download page without SHA, email dialog,
   dark/light theme, responsive at 360/768/1280.
2. **Unblock** — client provides: desktop app + backend repo access (or API contract), auth provider details, Stripe test
   account, SDK docs/content, release catalogue (version, date, notes), waitlist CORS or endpoint.
3. **Phase 3** — SDK pages and shared component tokens with the desktop app (needs SDK content + app design tokens).
4. **Phases 4–6** — user dashboard, admin dashboard and shared auth, built on the real auth/session (no second provider).
5. **Phases 7–8** — backend + Stripe (test mode first, signed webhooks, idempotent handlers, no live keys until verified).
6. **Phases 9–10** — desktop sync and production readiness (indexing switch, domain move to vectoros.one).
