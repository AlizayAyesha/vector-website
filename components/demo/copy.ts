import { qAt } from "./tracks/meta";

// Illustrative demo copy, original, written for this prototype in Vector OS's voice.
// The three tracks follow the steps of the live recordings on vectoros.one:
// "Hull to structure" (Maxsurf → Rhino), "Façade review" (Rhino 8) and the recorded SOLIDWORKS
// component-assembly project. All numbers are sample data.

export const demo = {
  project: "Three recorded projects",
  prompt: "Take three jobs from brief to model: the ship block from our Maxsurf hull, the curved façade in Rhino, and the race-car assembly review in SOLIDWORKS.",
  reply: "Here's the plan. I'll read your rules first and ask before anything changes in your files.",
  plan: [
    "Hull · review the hull in Maxsurf, transfer to Rhino, build decks and frames",
    "Façade · concept to component model in Rhino 8",
    "Mechanical · components, wheel assembly and model review in SOLIDWORKS",
    "Ask for your review before continuing",
    "Summarise what was built",
  ],
  research: {
    query: "deck levels · glazing build-up · imported reference",
    sources: [
      { name: "Hull reference", meta: "Maxsurf model", hit: "Profile and plan view" },
      { name: "Façade reports", meta: "Project documents", hit: "39.52 mm build-up" },
      { name: "Chassis reference", meta: "SOLIDWORKS", hit: "232 imported bodies" },
    ],
  },
  outro: "From an idea to the next step.", // live (How it works heading)
};

// Model tree items switch on at the recording time they first appear (seconds → local q via qAt).
const h = (t: number) => qAt("hull", t);
const f = (t: number) => qAt("facade", t);
const m = (t: number) => qAt("mech", t);

export const TRACK_UI = {
  hull: {
    file: "Ship block · Maxsurf → Rhino",
    tree: [
      ["Maxsurf hull", h(21)],
      ["Hull surface", h(29)],
      ["Reference curves", h(40)],
      ["Decks", h(45)],
      ["Bulkhead", h(51)],
      ["Frames", h(53)],
      ["Deck beams", h(55)],
    ] as [string, number][],
    summary: "Hull · sample model",
    stats: [
      ["Decks", "3"],
      ["Frames", "16"],
      ["Reference curves", "5"],
      ["Bulkheads", "1"],
    ],
    note: "Counts describe this illustrative rebuild, not the recorded project.",
  },
  facade: {
    file: "5,000 m² façade · Rhino 8",
    tree: [
      ["Concept runs", f(5)],
      ["Glazing", f(15)],
      ["Mullions", f(19)],
      ["Transoms", f(19)],
      ["Accessory profiles", f(53)],
      ["Connection envelopes", f(70)],
      ["Steel section", f(77)],
    ] as [string, number][],
    summary: "Documented model · Rev 117",
    stats: [
      ["Mullion segment bodies", "493"],
      ["Formal transom bodies", "1,276"],
      ["Formal model IGUs", "1,144"],
    ],
    note: "Separate saved-model register, as shown in the recording; not a count inferred from the footage.",
  },
  mech: {
    file: "Racecar assembly · SOLIDWORKS",
    tree: [
      ["Chassis reference", m(11)],
      ["Bushing", m(26)],
      ["Clevis", m(30)],
      ["Mounting profile", m(34)],
      ["Suspension + damper", m(46)],
      ["Wheel assembly", m(56)],
      ["Complete model", m(94)],
    ] as [string, number][],
    summary: "Model review",
    stats: [
      ["Imported solid bodies", "232"],
      ["Review sections", "5"],
      ["Wheel parts shown", "6"],
    ],
    note: "232 imported solid bodies reported in the recording; these are not newly created components.",
  },
} as const;
