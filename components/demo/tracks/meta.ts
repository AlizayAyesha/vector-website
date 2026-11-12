/** Static, DOM-safe metadata shared by the scene (positions) and the React overlay (text). No three.js here. */
import type { TrackId } from "../timeline";

export type Step = { q: readonly [number, number] | readonly number[]; title: string; body: string };

export const GRID: Record<TrackId, { size: number; div: number; labels: [number, number, string][] }> = {
  hull: { size: 40, div: 40, labels: [[-6, 5.2, "x 0 m"], [0, 5.2, "x 6 m"], [6, 5.2, "x 12 m"]] },
  facade: { size: 60, div: 30, labels: [[-9, 7.6, "0 m"], [0, 7.6, "9 m"], [9, 7.6, "18 m"]] },
  mech: { size: 6, div: 60, labels: [[-0.75, -1.1, "rear axle"], [0.8, -1.1, "front axle"]] },
};

/** HTML text for every 3D anchor, keyed by anchor id. */
export const ANCHOR_TEXT: Record<string, { text: string; strong?: boolean; below?: boolean }> = {
  ap: { text: "FR 0 · aft block end", below: true },
  ms: { text: "Stations · 12 equal", below: true },
  fp: { text: "FP · stem", below: true },
  wl: { text: "DWL 1.80 m" },
  flag: { text: "Top deck · FR 21–24 · deck beams missing", strong: true },
  loa: { text: "Block length 12.00 m", below: true },
  dk1: { text: "DK1 +1.20" },
  dk2: { text: "DK2 +2.40" },
  dk3: { text: "DK3 +3.60" },
  fbay: { text: "Bay 07 · level 3 selected", strong: true },
  fprof: { text: "Vertical profile · 80 × 200" },
  fiso: { text: "Isolator profile" },
  fenv: { text: "Connection envelope", below: true },
  figu: { text: "Nominal 28 mm build-up · 8 / 12 / 8", strong: true },
  fdimw: { text: "1.50 m bay", below: true },
  fdimh: { text: "3.60 m floor" },
  fh: { text: "18.00 m" },
  mframe: { text: "Chassis reference · imported" },
  m40: { text: "40" },
  md22: { text: "Ø 22", below: true },
  mbush: { text: "Bushing · seated in clevis", strong: true },
  mup: { text: "Upright + bearing ring" },
  mdamp: { text: "Spring and damper" },
  mtire: { text: "Tyre" },
  mrim: { text: "Rim · 5 spoke", below: true },
  mdisc: { text: "Brake disc · drilled", below: true },
  mcal: { text: "Caliper" },
  mtrack: { text: "Track 1.20 m" },
  mwb: { text: "Wheelbase 1.55 m", below: true },
};

export const gridKey = (t: TrackId, i: number) => `grid:${t}:${i}`;

export const HULL_STEPS = [
  { q: [0, 0.16], title: "Hull in Maxsurf.", body: "The faired hull is read from Maxsurf: profile, stations and waterlines, with the block extents agreed first." },
  { q: [0.16, 0.3], title: "Transfer to Rhino.", body: "The hull surface comes across to Rhino as the reference for every member that follows." },
  { q: [0.3, 0.45], title: "Deck geometry appears.", body: "Three decks are cut to the shell at their heights, with hatch openings where the plan needs them." },
  { q: [0.45, 0.68], title: "Frames and members are built.", body: "Transverse frames, web frames, deck beams and longitudinals are generated station by station." },
  { q: [0.68, 0.82], title: "Vector requests a review.", body: "Four deck beams on the top deck are missing. The gap is flagged and nothing changes until you approve the fix." },
  { q: [0.82, 1], title: "Inspect the assembled geometry.", body: "Orbit the block to read the frame arrangement. Engineering checks stay with you." },
] as const;

export const FACADE_STEPS = [
  { q: [0, 0.15], title: "Start with the supplied concept.", body: "The architectural surface arrives as a concept. Bays and floor lines are set out across it first." },
  { q: [0.15, 0.32], title: "Model the glazing across the façade.", body: "Vision and spandrel panels are placed bay by bay, floor by floor, following the curve as flat facets." },
  { q: [0.32, 0.48], title: "Develop the framing system.", body: "Mullions and transoms are added to carry the glazing back to the slab edges." },
  { q: [0.48, 0.6], title: "Select a local bay.", body: "One typical bay is isolated to resolve how the components meet." },
  { q: [0.6, 0.8], title: "Review the layered assembly.", body: "Glass build-up, profiles, isolators and connection envelopes are separated for inspection." },
  { q: [0.8, 1], title: "Concept to component model.", body: "The bay goes back together and the counts roll up across the whole façade." },
] as const;

export const MECH_STEPS = [
  { q: [0, 0.14], title: "Start from the chassis reference.", body: "The tube space frame is checked as imported geometry before anything is attached to it." },
  { q: [0.14, 0.3], title: "Sketch the mounting profile.", body: "A rounded tab with a Ø22 bore is sketched on the frame node, fully dimensioned." },
  { q: [0.3, 0.44], title: "Clevis and bushing.", body: "The profile is extruded into a clevis pair and the bushing is placed through the bore." },
  { q: [0.44, 0.58], title: "Mounting component and damper.", body: "Upright, bearing ring, wishbones and the spring-damper unit are placed against their interfaces." },
  { q: [0.58, 0.8], title: "Inside the wheel assembly.", body: "Tyre, rim, hub, brake disc and caliper are separated to follow the component stack." },
  { q: [0.8, 1], title: "Components in the complete model.", body: "The wheel returns to assembly and the corner is read in the context of the whole car." },
] as const;

export const STEPS = { hull: HULL_STEPS, facade: FACADE_STEPS, mech: MECH_STEPS } as const;
