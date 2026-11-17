import software from "@/content/software.json";
import gallery from "@/content/gallery.json";
import { allRoutes } from "@/lib/pages";
import type { SearchItem } from "@/lib/search";

/**
 * Client-side site search index, built at compile time from the real pages in content/routes.json
 * (plus software status and recorded projects). Fetched by components/SiteSearch.tsx when search opens.
 */
export const dynamic = "force-static";


const REMOVED = new Set(["/", "/waitlist"]);

export function GET() {
  const bySlug = new Map(software.entries.map((e) => [e.slug, e]));
  const items: SearchItem[] = allRoutes()
    .filter((r) => !REMOVED.has(r.path))
    .map((r) => {
      const sw = r.kind === "software" ? bySlug.get(r.path.split("/")[2]) : undefined;
      return { t: r.h1 || r.title, d: r.description, h: r.path, k: r.kind, ...(sw ? { s: sw.status, c: sw.company } : {}) };
    });
  for (const rec of gallery.recordings) {
    items.push({ t: rec.title, d: rec.summary, h: `/gallery?recording=${encodeURIComponent(rec.id)}`, k: "example", c: rec.tools });
  }
  return Response.json(items, { headers: { "Cache-Control": "public, max-age=3600" } });
}
