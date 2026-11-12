# Vector OS — 3D site (local prototype)

A standalone, Atenea-*inspired* (layout, pacing and scroll behaviour only — all code, geometry and copy are original/Vector's own) marketing site for Vector OS with original Three.js scenes.
Nothing here is deployed or pushed. Local preview only.

## Run it

Requires Node 20+ (any recent LTS).

```bash
pnpm install && pnpm dev      # http://localhost:3200
# or
npm install && npm run dev    # http://localhost:3200
```

Production check:

```bash
pnpm build && pnpm start      # http://localhost:3200
```

No environment variables or secrets are needed.

## What's inside

- **Next.js 16 (App Router, TypeScript) + Tailwind CSS 4 + three.js** — no other runtime deps.
- `components/Intro.tsx` + `components/three/coreScene.ts` — the pinned intro (480vh tall, sticky full-viewport canvas). Scroll progress scrubs everything: the hero copy lifts/blurs away, the bracket dissolves into ~9k points that re-form the Vector mark, then six tool nodes and links draw in (available = solid with data pulses, in development = dashed). Three statements fade in over the scene and light up word by word as you scroll. Scrolling back plays it in reverse.
- `components/demo/` — pinned product demo (1000vh, sticky full viewport), scrubbed by scroll, with a bottom Pause/Play control. Autoplay works by advancing the page scroll, so scroll stays the single source of truth (≈75 s end to end; stops when paused, off-screen or finished). Chapters: 01 Ask (chat typewriter) · 02 Plan (checklist ticks, plan approved) · 03 Standards (reading the user's own references) · 04 Connect (Vector OS → approval → Maxsurf → Rhino routing graph) · 05 Build (real-time Three.js hull: grid, keel, frames station by station, longitudinals, shell, slow orbit) · 06 Self-check (missing station flagged, fix approved, frame added) · 07 Detail (hull clipped at station 6, deep zoom into shell plate / frame web + flange / L-stiffeners / keel bar with anchored labels) · 08 Ready (properties fill, review report, zoom out) → outro + Book a demo / Keep watching. Labelled “Illustrative demo · sample data”. Reduced motion shows static chapter cards instead.
  - `timeline.ts` (all timings), `hull.ts` (parametric 12 m workboat, sample data), `demoScene.ts` (Three.js), `copy.ts` (all demo text), `Demo.tsx` (UI).
- `app/page.tsx` — page sections: frosted pill nav, pinned intro, pinned product demo (replaces the old Ask → Plan → Build cards), exploded-assembly scroll story, Ask → Plan → Build, recorded projects, tools strip, CTA, FAQ, footer.
- `lib/content.ts` — all copy and links in one place. Each line is tagged `live` (taken from vectoros.one) or `new` (written for this prototype — review before launch).
- `components/three/stage.tsx` — tiny WebGL stage: DPR capped at 1.75, renders only while on screen (IntersectionObserver) and while the tab is visible, single still frame for `prefers-reduced-motion`, CSS glow fallback if WebGL is unavailable.
- `components/three/storyScene.ts` — original pillow-block assembly (plate, bracket, bearing ring, shaft, bolts) that explodes and reassembles as you scroll.
- 3D is code-split with `next/dynamic` (`ssr: false`), so the first paint is plain HTML/CSS.
- Inter is self-hosted (`app/fonts`, SIL OFL licence included) via `next/font/local`.

## Media

Recording posters and videos are hot-linked from vectoros.one (`/assets/...`). Videos use `preload="none"` and only load when you press play. If the live site moves them, the cards fall back to a “video unavailable” note. Copy the files into `public/` before any real launch.

## Not included (on purpose)

- No testimonials (none provided).
- “Book a demo” links to the vectoros.one homepage, where the Calendly dialog lives. Swap in the direct Calendly URL if you have it.
- Light theme, analytics, CSP headers and the in-page studio demo from the live site are not ported.
