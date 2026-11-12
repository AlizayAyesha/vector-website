/** Shared timeline for the pinned product demo. p = scroll progress through the section (0..1). */

export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lin = (a: number, b: number, x: number) => clamp((x - a) / (b - a));
export const ease = (a: number, b: number, x: number) => {
  const t = lin(a, b, x);
  return t * t * (3 - 2 * t);
};
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export type Chapter = { n: string; k: string; a: number; b: number };

export const CHAPTERS: Chapter[] = [
  { n: "01", k: "Ask", a: 0.0, b: 0.09 },
  { n: "02", k: "Plan", a: 0.09, b: 0.16 },
  { n: "03", k: "Standards", a: 0.16, b: 0.23 },
  { n: "04", k: "Connect", a: 0.23, b: 0.31 },
  { n: "05", k: "Build", a: 0.31, b: 0.57 },
  { n: "06", k: "Self-check", a: 0.57, b: 0.68 },
  { n: "07", k: "Detail", a: 0.68, b: 0.81 },
  { n: "08", k: "Ready", a: 0.81, b: 0.92 },
];

export const OUTRO = 0.92;

/** Window (workspace) phase. */
export const WIN = { in: [0.285, 0.335] as const };

/** Build sub-steps (inside chapter 05). */
export const BUILD = {
  grid: [0.31, 0.33] as const,
  keel: [0.325, 0.35] as const,
  frames: [0.345, 0.48] as const,
  longs: [0.47, 0.52] as const,
  shell: [0.51, 0.565] as const,
};

export const CHECK = { flag: [0.585, 0.6] as const, fix: [0.635, 0.655] as const, clear: [0.66, 0.68] as const };
export const DETAIL = { cut: [0.69, 0.72] as const, parts: [0.71, 0.75] as const, out: [0.8, 0.83] as const };

export const chapterAt = (p: number) => {
  let i = 0;
  for (let k = 0; k < CHAPTERS.length; k++) if (p >= CHAPTERS[k].a) i = k;
  return i;
};
