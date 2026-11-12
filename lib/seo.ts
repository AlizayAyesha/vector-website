import type { Metadata } from "next";
import { CANONICAL_ORIGIN, INDEXABLE, SITE_URL } from "./site";

export const OG_IMAGE = { url: "/og/vector-og-1200x630.png", width: 1200, height: 630, alt: "Vector OS · AI workspace for CAD and engineering" };

/** Per-page metadata. Canonical points at the official vectoros.one page (CANONICAL_ORIGIN). */
export function pageMeta({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const canonical = CANONICAL_ORIGIN + (path === "/" ? "" : path);
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { type: "website", siteName: "Vector OS", title: `${title} · Vector OS`, description, url: SITE_URL + path, images: [OG_IMAGE] },
    twitter: { card: "summary_large_image", title: `${title} · Vector OS`, description, images: [OG_IMAGE.url] },
    robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false, googleBot: { index: false, follow: false } },
  };
}
