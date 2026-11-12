/** Static, DOM-safe metadata shared by the scene (positions) and the React overlay (text). No three.js here.
 *  Step titles, sub-lines, chips and view labels are transcribed from the burned-in captions of Vector's three
 *  recordings on vectoros.one (Hull to structure · Façade component workflow · SOLIDWORKS component assembly).
 *  q = local track progress; each track's q runs linearly along its recording's timeline (see video-match/*.md). */
import type { TrackId } from "../timeline";

export type Step = { q: readonly [number, number]; title: string; body: string; chip: string; view?: string };

export const GRID: Record<TrackId, { size: number; div: number; labels: [number, number, string][] }> = {
  hull: { size: 60, div: 60, labels: [] },
  facade: { size: 80, div: 40, labels: [] },
  mech: { size: 8, div: 40, labels: [] },
};

/** HTML text for every 3D anchor, keyed by anchor id (dark caption cards, as in the recordings). */
export const ANCHOR_TEXT: Record<string, { text: string; sub?: string; strong?: boolean; below?: boolean; plain?: boolean }> = {
  // Maxsurf plan / profile labels
  ap: { text: "AP", plain: true, below: true },
  ms: { text: "MS", plain: true, below: true },
  fp: { text: "FP", plain: true, below: true },
  zpt: { text: "Zero pt", plain: true },
  stbd: { text: "Stbd", plain: true },
  // façade callouts
  fglz: { text: "Glazing representation", sub: "Modelled panel layer" },
  fjoint: { text: "Joint construction pending", sub: "Original notes flag the joint", strong: true },
  fhor: { text: "Horizontal section", sub: "Transom and attached profiles" },
  fver: { text: "Vertical profile", sub: "Local mullion geometry" },
  falu: { text: "Aluminium add-on", sub: "Section-based geometry" },
  fiso: { text: "Isolator profile", sub: "Represented separately" },
  fgask: { text: "Nominal gasket profiles", sub: "Separate accessory geometry", below: true },
  fenv: { text: "Connection envelope", sub: "Detailing stage", below: true },
  fsteel: { text: "Steel section", sub: "Inspect before connection engineering" },
  figu: { text: "Nominal 39.52 mm build-up", sub: "Glass plies + PVB + air cavity", strong: true },
  // mechanical callouts
  m232: { text: "232 imported solid bodies reported", sub: "These are not newly created components", strong: true },
  mbore: { text: "Internal bore", below: true },
  mhole: { text: "Aligned holes" },
  mtab: { text: "Single-tab profile", sub: "Opening at its end" },
  mdisc: { text: "Disc · hub · connection pieces", below: true },
};

export const gridKey = (t: TrackId, i: number) => `grid:${t}:${i}`;

/** Build steps from [startSeconds, title, body, chip, view?] rows and a track duration in seconds. */
const build = (rows: [number, string, string, string, string?][], t0: number, t1: number): Step[] =>
  rows.map(([t, title, body, chip, view], i) => ({
    q: [(t - t0) / (t1 - t0), ((rows[i + 1]?.[0] ?? t1) - t0) / (t1 - t0)] as const,
    title,
    body,
    chip,
    view,
  }));

/** Hull to structure (2:02). The Vector UI segment (5–21 s) is played by the workspace + assistant instead. */
export const HULL_T: [number, number] = [21, 122];
export const HULL_STEPS = build(
  [
    [21, "Hull in Maxsurf", "Review the profile before transfer", "Maxsurf Modeler"],
    [25, "Hull in Maxsurf", "Check the hull in plan view", "Maxsurf Modeler"],
    [29, "Transfer to Rhino", "The hull becomes the reference for the next stage", "Rhino workspace"],
    [37, "Vector requests a review", "Review the working model before continuing", "Vector workspace"],
    [40, "Reference geometry", "Curves establish the shape and deck levels", "Rhino workspace"],
    [45, "Deck geometry appears", "Keep the visible build close to its recorded pace", "Rhino workspace"],
    [51, "Frames and members are built", "Watch the geometry grow in the Rhino workspace", "Construction · 1.1×"],
    [65, "Inspect the assembled geometry", "Orbit the model to read the frame arrangement", "Rhino workspace"],
    [72, "Change the viewing angle", "See the relationship between curves and members", "Rhino workspace"],
    [78, "Review the side view", "Read the deck levels and framing in elevation", "Rhino workspace"],
    [84, "Review the reference geometry", "Keep the construction references visible", "Rhino workspace"],
    [90, "Inspect the selected geometry", "The recorded build progresses to model review", "Rhino workspace"],
    [103, "Model orbit", "Review the complete recorded orbit · engineering checks remain separate", "Rhino · model orbit"],
  ],
  ...HULL_T,
);

/** 5,000 m² Façade Work (1:57). */
export const FACADE_T: [number, number] = [0, 115];
export const FACADE_STEPS = build(
  [
    [0, "5,000 m² Façade Work", "From supplied concept design to a coordinated façade component model.", "Project work · Rhino"],
    [5, "Starting with the supplied architectural concept", "Curved façade runs, setting-out and existing framing establish the design reference.", "01 · Architectural input"],
    [9, "Develop the component model", "Organise the façade into framing, glazing and separate accessory geometry.", "02 · Recorded review"],
    [15, "Model the glazing across the façade", "The reports document glass plies and PVB, with a 16 mm air cavity between the panes.", "03 · Report image"],
    [19, "Develop the framing system", "The documented approach uses segmented mullions and individual between-mullion transoms.", "04 · Recorded review"],
    [25, "Keep unfinished joint work visible", "Modelled glazing is reviewed against framing; the original notes flag joint construction still pending.", "05 · Report detail"],
    [32, "Select a local bay", "Inspect individual components and their surrounding geometry.", "06 · Recorded review"],
    [35, "Review the layered assembly", "Glazing, framing and accessory profiles can be examined separately.", "07 · Recorded review"],
    [40, "Coordinate the mullion and transom interfaces", "Move from the façade arrangement to the local section and profile relationships.", "08 · Recorded review"],
    [48, "Explain how the components meet", "Vertical mullions, horizontal transoms and attached profiles form the local assembly.", "09 · Junction review"],
    [53, "Add section-based accessory profiles", "Aluminium add-ons, isolator profiles and nominal gaskets are represented as separate geometry.", "10 · Report detail"],
    [62, "Organise parts for component review", "Reusable assemblies and separately classified components support inspection and coordination.", "11 · Recorded review"],
    [70, "Develop the connection envelopes", "Brown connector geometry remains a detailing stage; final holes, fixings and attachment details are still to be completed.", "12 · Report detail"],
    [77, "Review the steel section and its interfaces", "Inspect the section geometry before completing the connection engineering.", "13 · Recorded review"],
    [82, "Define the nominal glazing build-up", "6 mm glass + 1.52 mm PVB + 6 mm glass + 16 mm air + 10 mm glass = 39.52 mm overall.", "14 · Report detail"],
    [90, "Check the detail in the surrounding façade", "Review how the local framing, glazing and accessory geometry relate to the wider model.", "15 · Recorded review"],
    [97, "Separate components for closer inspection", "Isolated views make the section arrangement and adjacent glazing easier to examine.", "16 · Recorded review"],
    [103, "Prepare traceable model information", "Component layers, stable physical IDs and quantity registers accompany the documented model.", "17 · Recorded review"],
    [107, "5,000 m² Façade Work · concept to component model", "Framing · glazing · profiles · model coordination. Connection detailing continues.", "Vector · Project work"],
  ],
  ...FACADE_T,
);

/** SOLIDWORKS component assembly review (1:59). */
export const MECH_T: [number, number] = [0, 120];
export const MECH_STEPS = build(
  [
    [0, "Inside the assembly", "SOLIDWORKS project work · components, interfaces and model review", "Result preview", "Racecar assembly"],
    [6, "Direct the next project step", "During the active Build: read the license and display the verified source frame.", "Vector / active project", "Racecar assembly"],
    [11, "Start with the chassis reference", "Review the tubular structure before moving into the component details.", "01 / Reference", "Tubular chassis reference"],
    [18, "Check the imported geometry", "Vector reports the imported reference frame and checks its measurable geometry.", "Vector / active project", "Tubular chassis reference"],
    [22, "Save and verify the reference", "232 imported solid bodies reported - these are not newly created components.", "Vector / active project", "Tubular chassis reference"],
    [26, "Bushing geometry", "A close look at the cylindrical component and its internal bore.", "02 / Components", "Bore and outer profile"],
    [30, "Clevis connection detail", "Forked geometry and aligned holes, shown in the recorded close-up.", "02 / Components", "Clevis detail"],
    [34, "Mounting profile", "Inspect the single-tab profile and the opening at its end.", "02 / Components", "Profile and hole"],
    [39, "The frame in isolation", "Switch from the overall assembly to its tubular frame.", "03 / Assembly detail", "Frame structure"],
    [42, "Mounting component", "A separate component view makes the mounting features easier to see.", "03 / Assembly detail", "Mounting interfaces"],
    [46, "Suspension arm assembly", "Follow the links and their attachment points.", "03 / Assembly detail", "Links and attachment points"],
    [50, "Spring and damper", "The recorded component view reveals the spring and end connections.", "03 / Assembly detail", "Spring / damper assembly"],
    [53, "Connection hardware", "Inspect the separated hardware and its assembly order.", "03 / Assembly detail", "Separated connection hardware"],
    [56, "Inside the wheel assembly", "Move from individual parts to the wheel and adjacent mechanisms.", "04 / Wheel assembly", "Wheel and internal components"],
    [59, "Exploded assembly · transparent view", "Separate the wheel and brake components to expose their relationships.", "04 / Wheel assembly", "Recorded exploded view"],
    [67, "Follow the component stack", "The inner pieces separate along the same assembly direction.", "04 / Wheel assembly", "Component order and interfaces"],
    [73, "Return to the assembled wheel", "The recorded view returns to the complete unit and changes orientation.", "04 / Wheel assembly", "Assembled wheel review"],
    [78, "Exploded assembly · shaded view", "A second display mode makes the internal components easier to distinguish.", "04 / Wheel assembly", "Shaded component review"],
    [81, "Inspect the internal interfaces", "Disc, hub and smaller pieces are visible as the assembly separates.", "04 / Wheel assembly", "Disc · hub · connection pieces"],
    [89, "Back to the complete wheel", "Inspect the assembled unit from another direction.", "04 / Wheel assembly", "Wheel assembly"],
    [94, "Components in the complete model", "The transparent body reveals the frame and cockpit relationships.", "05 / Model review", "Frame and body interfaces"],
    [103, "Rear assembly review", "Follow the frame, wheel and rear-wing packaging in the actual orbit.", "05 / Model review", "Rear packaging"],
    [108, "Mechanical interfaces in context", "Review the visible links and frame around the selected component.", "05 / Model review", "Links and frame"],
    [115, "From detail to the assembly", "A change of camera scale restores the overall context.", "05 / Model review"],
    [118, "Components in context", "Vector · SOLIDWORKS project work", "Recorded project work", "Racecar assembly"],
  ],
  ...MECH_T,
);

export const STEPS = { hull: HULL_STEPS, facade: FACADE_STEPS, mech: MECH_STEPS } as const;

/** local q for a time (s) in a recording */
export const qAt = (id: TrackId, t: number) => {
  const [a, b] = id === "hull" ? HULL_T : id === "facade" ? FACADE_T : MECH_T;
  return (t - a) / (b - a);
};
