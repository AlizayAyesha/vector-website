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
  { n: "01", k: "Ask", a: 0.0, b: 0.06 },
  { n: "02", k: "Plan", a: 0.06, b: 0.11 },
  { n: "03", k: "Standards", a: 0.11, b: 0.16 },
  { n: "04", k: "Connect", a: 0.16, b: 0.215 },
  { n: "05", k: "Hull", a: 0.215, b: 0.455 },
  { n: "06", k: "Façade", a: 0.455, b: 0.69 },
  { n: "07", k: "Mechanical", a: 0.69, b: 0.9 },
  { n: "08", k: "Ready", a: 0.9, b: 0.93 },
];

export const OUTRO = 0.93;

/** The card phase (01–04) was authored on a 0..0.31 clock; this maps the page clock onto it. */
export const CARD_SCALE = 0.31 / 0.215;
export const cardClock = (p: number) => p * CARD_SCALE;

/** Window (workspace) phase. */
export const WIN = { in: [0.198, 0.232] as const };

export type TrackId = "hull" | "facade" | "mech";
export const TRACKS: { id: TrackId; label: string; a: number; b: number }[] = [
  { id: "hull", label: "Hull", a: 0.232, b: 0.45 },
  { id: "facade", label: "Façade", a: 0.46, b: 0.685 },
  { id: "mech", label: "Mechanical", a: 0.695, b: 0.9 },
];
/** midpoints between tracks, where the viewport cross-fades */
export const SWITCH = [0.455, 0.69];

export const trackAt = (p: number) => (p < SWITCH[0] ? 0 : p < SWITCH[1] ? 1 : 2);
export const localQ = (p: number, i = trackAt(p)) => lin(TRACKS[i].a, TRACKS[i].b, p);
/** page progress for a local q inside track i */
export const pageAt = (i: number, q: number) => lerp(TRACKS[i].a, TRACKS[i].b, q);

export const chapterAt = (p: number) => {
  let i = 0;
  for (let k = 0; k < CHAPTERS.length; k++) if (p >= CHAPTERS[k].a) i = k;
  return i;
};
