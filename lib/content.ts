// Copy sourced from Vector OS public pages (vectoros.one, /software, /download,
// /waitlist, /llms.txt) on 12 Nov 2026. Lines marked "new" are original
// supporting copy written for this redesign in Vector's voice — review before launch.

export const LIVE = "https://vectoros.one";

export const nav = [
  { label: "Software", href: `${LIVE}/software` },
  { label: "Examples", href: `${LIVE}/gallery` },
  { label: "Pricing", href: `${LIVE}/pricing` },
];

export const ctas = {
  // On the live site "Book a demo" opens a Calendly dialog on the homepage.
  bookDemo: `${LIVE}/`,
  joinBeta: `${LIVE}/download`,
  emailUpdates: `${LIVE}/waitlist`,
  openWorkspace: `${LIVE}/`,
  gallery: `${LIVE}/gallery`,
  software: `${LIVE}/software`,
};

export const hero = {
  eyebrow: "Vector OS / Engineering workspace", // live
  title: ["Your tools.", "One workspace."], // live
  sub: "An AI workspace for CAD and engineering. Plan, build and review in your tools.", // live
};

// Pinned intro statements (windows are scroll-progress ranges, 0..1).
export const intro = {
  phrases: [
    { text: "Design, projects and your tools. Together.", window: [0.2, 0.4] as const, note: "" }, // live (homepage heading)
    { text: "Connected to the software you already use.", window: [0.44, 0.64] as const, note: "Status from vectoros.one/software" }, // new
    { text: "Ask. Plan. Build. Then inspect the result in your tools.", window: [0.67, 0.9] as const, note: "" }, // live words (How it works)
  ],
};

export const story = {
  eyebrow: "Design, projects and your tools. Together.", // live (section heading)
  beats: [
    {
      k: "01",
      title: "Start from the part.", // new
      body: "Describe your task. Selected software opens when needed.", // live (workspace prompt)
    },
    {
      k: "02",
      title: "See every piece.", // new
      body: "Break the work into the parts that matter — geometry, features, relationships — before anything changes.", // new
    },
    {
      k: "03",
      title: "Put it back together.", // new
      body: "Inspect the result in your tools. Your files stay in the software you already use.", // live first sentence + new
    },
  ],
};

export const steps = [
  { k: "01", title: "Ask", body: "Understand your project." }, // live
  { k: "02", title: "Plan", body: "Review the proposed change." }, // live
  { k: "03", title: "Build", body: "Inspect the result in your tools." }, // live
];

export const recordings = [
  {
    title: "Hull to structure",
    meta: "Vector OS · Maxsurf Modeler · Rhino",
    duration: "2:02",
    poster: `${LIVE}/assets/recording-thumbnails/redesign-20261105/vector-recorded-project-hull-to-structural-geometry-20261007.webp`,
    video: `${LIVE}/assets/recorded-projects/20261007/01f0ee0c46cf-r02.mp4`,
  },
  {
    title: "Façade review",
    meta: "Rhino 8 · Architectural façade workflow",
    duration: "1:57",
    poster: `${LIVE}/assets/recording-thumbnails/redesign-20261105/facade-component-workflow.webp`,
    video: `${LIVE}/assets/recorded-projects/20261019/facade-component-workflow.mp4`,
  },
  {
    title: "Component to assembly",
    meta: "SOLIDWORKS · Recorded project work",
    duration: "1:59",
    poster: `${LIVE}/assets/recording-thumbnails/redesign-20261105/solidworks-component-assembly-review.webp`,
    video: `${LIVE}/assets/recorded-projects/20261022/solidworks-component-assembly-review.mp4`,
  },
];

// Authoritative status from vectoros.one/software and /llms.txt
export const tools = [
  { name: "Rhino", status: "Available", href: `${LIVE}/software/rhino` },
  { name: "Blender", status: "Available", href: `${LIVE}/ai/blender` },
  { name: "Revit", status: "Available", href: `${LIVE}/software/revit` },
  { name: "Maxsurf Complete", status: "Available", href: `${LIVE}/ai/maxsurf` },
  { name: "Grasshopper", status: "In development", href: `${LIVE}/ai/grasshopper` },
  { name: "Autodesk Dynamo", status: "In development", href: `${LIVE}/ai/dynamo` },
] as const;

export const faq = [
  {
    q: "Can I try it on this website?",
    a: "Yes. The interactive sample is scripted. Work in an engineering application requires the installed Vector OS app and an available connector.",
  }, // live
  {
    q: "Which software can I connect?",
    a: "Check the software directory and download page for the current build and supported hosts. A directory listing does not mean a connector is available.",
  }, // live
  {
    q: "How do I get access?",
    a: "Use Join the beta for Windows access information. Email updates are optional.",
  }, // live
  {
    q: "Is there a macOS version?",
    a: "Not yet. The beta is for Windows 10/11 (64-bit). A qualified public installer is not available yet, and macOS is not available.",
  }, // live (/download)
  {
    q: "Do Grasshopper and Dynamo work today?",
    a: "Both integrations are in development. Rhino and Revit availability does not establish Grasshopper or Dynamo feature support.",
  }, // live (/llms.txt)
];

export const footer = {
  tagline: "Engineering, connected.", // live
  cols: [
    {
      h: "Explore",
      links: [
        ["Product", `${LIVE}/product`],
        ["AI workflows", `${LIVE}/ai`],
        ["Software", `${LIVE}/software`],
        ["Examples", `${LIVE}/gallery`],
      ],
    },
    {
      h: "Resources",
      links: [
        ["Pricing", `${LIVE}/pricing`],
        ["Guides", `${LIVE}/tutorials`],
        ["Support", `${LIVE}/support`],
        ["Release notes", `${LIVE}/releases`],
      ],
    },
    {
      h: "Vector OS",
      links: [
        ["Join the beta", `${LIVE}/download`],
        ["Email updates", `${LIVE}/waitlist`],
        ["Privacy", `${LIVE}/privacy`],
        ["Terms", `${LIVE}/terms`],
      ],
    },
  ],
};
