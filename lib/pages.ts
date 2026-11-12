import fs from "node:fs";
import path from "node:path";

export type PageRecord = { path: string; kind: "page" | "software" | "guide" | "ai"; title: string; h1: string; description: string; canonical: string; html: string };
export type RouteEntry = Omit<PageRecord, "html" | "canonical">;

const DIR = path.join(process.cwd(), "content", "pages");

/** Pages ported from vectoros.one (see scripts/port-content.md). One JSON file per route. */
export function getPage(route: string): PageRecord | null {
  const slug = route.replace(/^\/|\/$/g, "").replace(/\//g, "__") || "index";
  const f = path.join(DIR, `${slug}.json`);
  if (!fs.existsSync(f)) return null;
  return JSON.parse(fs.readFileSync(f, "utf8")) as PageRecord;
}

export function allRoutes(): RouteEntry[] {
  return JSON.parse(fs.readFileSync(path.join(process.cwd(), "content", "routes.json"), "utf8")) as RouteEntry[];
}
