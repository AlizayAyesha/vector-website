// Illustrative demo copy — original, written for this prototype in Vector OS's voice.
// Use case mirrors the live "Hull to structure · Vector OS · Maxsurf Modeler · Rhino" recording.
// All numbers are sample data.

export const demo = {
  project: "Utility workboat",
  prompt: "Develop the hull for a 12 m utility workboat in Maxsurf, then build the structure in Rhino.",
  reply: "Here's the plan. I'll check your rules first and ask before anything changes in your files.",
  plan: [
    "Read hull parameters · LOA 12 m · beam 4.2 m",
    "Fair stations in Maxsurf",
    "Generate frames and longitudinals in Rhino",
    "Check spacing and scantlings against your rule set",
    "Write a review report",
  ],
  research: {
    query: "frame spacing · plate minimums · 12 m workboat",
    sources: [
      { name: "Project rule set", meta: "Uploaded by you · 42 pages", hit: "Max frame spacing 0.70 m" },
      { name: "Owner requirements", meta: "requirements.pdf", hit: "Deck load 5 kN/m²" },
      { name: "Previous vessel", meta: "Frame schedule · 2025", hit: "Shell 6 mm, L 75×50×6" },
    ],
  },
  steps: {
    "05": { title: "Build in your tools.", body: "Stations are faired in Maxsurf, then frames, longitudinals and shell are generated in Rhino, one station at a time." },
    "06": { title: "Catch it before you do.", body: "The result is checked against the rules you provided. One gap is flagged, a fix is proposed, and nothing changes until you approve." },
    "07": { title: "Look closer.", body: "Cut any station to inspect plate, frame and stiffener details in place." },
    "08": { title: "Ready for review.", body: "Properties and a short report are written back to the project. You decide what happens next." },
  } as Record<string, { title: string; body: string }>,
  props: [
    ["LOA", "12.00 m"],
    ["Beam", "4.20 m"],
    ["Depth", "1.80 m"],
    ["Frames", "19"],
    ["Longitudinals", "8"],
    ["Status", "Ready for review"],
  ],
  layers: ["Grid", "Keel", "Frames", "Longitudinals", "Shell"],
  outro: "From an idea to the next step.", // live (How it works heading)
};
