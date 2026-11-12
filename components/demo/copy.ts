// Illustrative demo copy, original, written for this prototype in Vector OS's voice.
// The three tracks follow the steps of the live recordings on vectoros.one:
// "Hull to structure" (Maxsurf → Rhino), "Façade review" (Rhino 8) and the recorded SOLIDWORKS
// component-assembly project. All numbers are sample data.

export const demo = {
  project: "Three projects",
  prompt: "Take three jobs from brief to model: the ship block from our Maxsurf hull, the curved façade in Rhino, and the front corner of the car assembly.",
  reply: "Here's the plan. I'll read your rules first and ask before anything changes in your files.",
  plan: [
    "Hull · read the faired hull in Maxsurf, build decks and frames in Rhino",
    "Façade · glazing, framing and a typical bay in Rhino 8",
    "Mechanical · mounting, upright and wheel stack (recorded project)",
    "Self-check each result against your references",
    "Write one review report",
  ],
  research: {
    query: "frame spacing · glazing build-up · mounting interfaces",
    sources: [
      { name: "Project rule set", meta: "Uploaded by you · 42 pages", hit: "Max frame spacing 0.70 m" },
      { name: "Façade specification", meta: "facade-spec.pdf", hit: "IGU 8 / 12 / 8" },
      { name: "Assembly notes", meta: "Previous car · 2025", hit: "Bushing Ø 22" },
    ],
  },
  outro: "From an idea to the next step.", // live (How it works heading)
};

export const TRACK_UI = {
  hull: {
    file: "Workboat block · Rhino",
    tree: [
      ["Maxsurf profile", 0],
      ["Hull surface", 0.16],
      ["Decks", 0.3],
      ["Frames", 0.45],
      ["Deck beams", 0.5],
      ["Longitudinals", 0.56],
      ["Bulkhead", 0.6],
    ] as [string, number][],
    stats: [
      ["Frames", "48"],
      ["Web frames", "8"],
      ["Decks", "3"],
      ["Fixes", "1"],
    ],
  },
  facade: {
    file: "Curved façade · Rhino 8",
    tree: [
      ["Concept surface", 0],
      ["Slab edges", 0.04],
      ["Glazing", 0.16],
      ["Spandrels", 0.16],
      ["Mullions", 0.33],
      ["Transoms", 0.4],
      ["Bay 07 · L3", 0.5],
    ] as [string, number][],
    stats: [
      ["Glass", "60"],
      ["Spandrels", "60"],
      ["Mullions", "13"],
      ["Transoms", "132"],
    ],
  },
  mech: {
    file: "Car assembly · recorded project",
    tree: [
      ["Chassis reference", 0],
      ["Mounting sketch", 0.17],
      ["Clevis + bushing", 0.3],
      ["Upright", 0.44],
      ["Spring / damper", 0.5],
      ["Wheel stack", 0.56],
      ["Complete model", 0.84],
    ] as [string, number][],
    stats: [
      ["Frame members", "60"],
      ["Wheel parts", "5"],
      ["Corners", "4"],
      ["Interfaces", "✓"],
    ],
  },
} as const;
