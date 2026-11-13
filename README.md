# Vector OS — website

Marketing site for Vector OS with real-time Three.js scenes. Built by ZarLabs (zarlabs.online).

Live preview: https://vector-website-five.vercel.app

## Run it

Requires Node 20+.

```bash
pnpm install && pnpm dev      # http://localhost:3200
pnpm build && pnpm start      # production check on http://localhost:3200
pnpm lint                     # TypeScript check
```

No secrets are needed. Optional environment variables (all public, see `lib/site.ts`):

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_INDEXABLE` | unset (= preview) | `true` removes noindex/nofollow, opens robots.txt and advertises the sitemap |
| `NEXT_PUBLIC_SITE_URL` | `https://vector-website-five.vercel.app` | Public origin used in the sitemap and OG URLs |
| `NEXT_PUBLIC_CANONICAL_ORIGIN` | `https://vectoros.one` | Origin used for canonical links |
| `NEXT_PUBLIC_SUBSCRIBE_ENDPOINT` | unset | Only a Vector-owned URL that accepts `POST {"email"}` from this origin. Unset = the email dialog hands off to vectoros.one/waitlist |

## Where things live

- `app/` — routes (home, pricing, gallery, software directory and tool pages, and a catch-all for ported content pages), SEO files (`robots.ts`, `sitemap.ts`, `manifest.ts`), `layout.tsx` (metadata, JSON-LD).
- `content/` — all copy and data: `routes.json` (page index), `pages/*.json` (one file per content page), `pricing.json`, `software.json`, `gallery.json`.
- `lib/site.ts` — links (Calendly, sign-in, waitlist), contact email, indexing switch, optional `NEXT_PUBLIC_SUBSCRIBE_ENDPOINT`.
- `components/Nav.tsx`, `SiteSearch.tsx` (+ `app/search-index.json`, `lib/search.ts`), `ThemeToggle.tsx`, `SubscribeDialog.tsx`, `BookDemo.tsx` — navigation, site search, dark/light theme, email updates and booking dialogs.
- `content/release.json` — download page data; `verification` (SHA-256 etc.) is kept for integrity but not shown publicly.
- `docs/PHASE-1-AUDIT.md` — architecture audit and what needs the Vector app/backend repos.
- `components/Intro.tsx` + `components/three/coreScene.ts` — pinned scroll intro.
- `components/demo/` — pinned product demo: `timeline.ts` (timings), `tracks/meta.ts` (recording-matched steps and captions), `tracks/*Track.ts` (3D geometry + camera keys per recording), `demoScene.ts` (renderer, lighting, labels), `copy.ts` (demo text), `Demo.tsx` (UI).
- `components/three/stage.tsx` — shared WebGL stage (DPR cap, pauses off-screen / hidden tab, reduced-motion support, disposal).
- `public/logos/SOURCES.md` — tool logo sources and trademark note.

See the "Vector Website — Build & Animation Guide" for the full explanation.
