/** Shape of one entry in /search-index.json (see app/search-index.json/route.ts). */
export type SearchKind = "page" | "software" | "guide" | "ai" | "example";
export type SearchItem = { t: string; d: string; h: string; k: SearchKind; s?: string; c?: string };

export const SEARCH_FILTERS: { id: "" | SearchKind; label: string }[] = [
  { id: "", label: "All results" },
  { id: "page", label: "Product & company" },
  { id: "software", label: "Software" },
  { id: "ai", label: "AI workflows" },
  { id: "guide", label: "Guides" },
  { id: "example", label: "Recorded projects" },
];

export const KIND_LABEL: Record<SearchKind, string> = {
  page: "Page",
  software: "Software",
  ai: "AI workflow",
  guide: "Guide",
  example: "Recording",
};

/** Simple ranked match: every query word must appear; title hits rank above description hits. */
export function searchItems(items: SearchItem[], q: string, kind: "" | SearchKind, status: string): SearchItem[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const scored: [number, SearchItem][] = [];
  for (const it of items) {
    if (kind && it.k !== kind) continue;
    if (status && it.s !== status) continue;
    const title = it.t.toLowerCase();
    const hay = `${title} ${it.d.toLowerCase()} ${(it.c || "").toLowerCase()} ${it.h}`;
    if (!words.every((w) => hay.includes(w))) continue;
    let score = 0;
    for (const w of words) {
      if (title === w) score += 12;
      else if (title.startsWith(w)) score += 8;
      else if (title.includes(w)) score += 5;
      else score += 1;
    }
    if (it.s === "Available") score += 1;
    if (it.k === "page") score += 0.5;
    scored.push([score, it]);
  }
  return scored.sort((a, b) => b[0] - a[0] || a[1].t.localeCompare(b[1].t)).map(([, it]) => it);
}
