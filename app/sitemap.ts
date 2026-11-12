import type { MetadataRoute } from "next";
import { allRoutes } from "@/lib/pages";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date("2026-11-13");
  return allRoutes().map((r) => ({
    url: SITE_URL + (r.path === "/" ? "" : r.path),
    lastModified: now,
    changeFrequency: r.kind === "software" ? "monthly" : "weekly",
    priority: r.path === "/" ? 1 : r.kind === "page" || r.kind === "ai" ? 0.8 : 0.5,
  }));
}
