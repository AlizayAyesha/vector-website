// Copy sourced from Vector OS public pages (vectoros.one, /software, /download,
// /waitlist, /llms.txt) on 12 Nov 2026. Lines marked "new" are original
// supporting copy written for this redesign in Vector's voice — review before launch.

import { CALENDLY, LIVE, SIGN_IN } from "./site";
export { LIVE };

export type NavLink = { label: string; href: string; note?: string; status?: string };
export type NavGroup = { label: string; href: string; columns: { h: string; links: NavLink[] }[] };

/** Main navigation. Every link points at a real page in this site (see content/routes.json). */
export const nav: NavGroup[] = [
  {
    label: "Product",
    href: "/product",
    columns: [
      {
        h: "Vector OS",
        links: [
          { label: "What is Vector OS?", href: "/product", note: "Task modes, workspaces and beta access" },
          { label: "Design and Project modes", href: "/product/workspace-modes", note: "Compare the workspace layouts" },
          { label: "Windows beta", href: "/download", note: "Windows 10/11 · 64-bit" },
          { label: "Release notes", href: "/releases", note: "Changes and build information" },
        ],
      },
    ],
  },
  {
    label: "Software",
    href: "/software",
    columns: [
      {
        h: "Connectors",
        links: [
          { label: "Rhino", href: "/software/rhino", status: "Available" },
          { label: "Revit", href: "/software/revit", status: "Available" },
          { label: "Blender", href: "/software/blender", status: "Available" },
          { label: "Maxsurf", href: "/software/maxsurf", status: "Available" },
          { label: "Grasshopper", href: "/ai/grasshopper", status: "In development" },
          { label: "Autodesk Dynamo", href: "/ai/dynamo", status: "In development" },
        ],
      },
      {
        h: "Explore",
        links: [
          { label: "Software directory", href: "/software", note: "Every listed tool and its status" },
          { label: "AI workflows", href: "/ai", note: "Workflow planning by host" },
          { label: "Connect AI to CAD", href: "/ai/connect-ai-to-cad", note: "Availability, builds and approval" },
        ],
      },
    ],
  },
  {
    label: "Resources",
    href: "/tutorials",
    columns: [
      {
        h: "Learn",
        links: [
          { label: "Examples", href: "/gallery", note: "Recorded projects and concept studies" },
          { label: "Guides", href: "/tutorials", note: "Install, connect and first results" },
          { label: "Support", href: "/support", note: "Diagnostics and help" },
        ],
      },
    ],
  },
];

/** Plain links shown after the dropdowns. */
export const navLinks: NavLink[] = [{ label: "Pricing", href: "/pricing" }];

export const ctas = {
  // Opens Vector's real Calendly scheduler in a dialog (see components/BookDemo.tsx); the href is the no-JS fallback.
  bookDemo: CALENDLY,
  joinBeta: "/download",
  // Opens the email-updates dialog (components/SubscribeDialog.tsx). The old /waitlist page redirects here.
  emailUpdates: "#email-updates",
  gallery: "/gallery",
  software: "/software",
  signIn: SIGN_IN,
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
  { name: "Rhino", status: "Available", href: "/software/rhino" },
  { name: "Blender", status: "Available", href: "/ai/blender" },
  { name: "Revit", status: "Available", href: "/software/revit" },
  { name: "Maxsurf", status: "Available", href: "/ai/maxsurf" },
  { name: "Grasshopper", status: "In development", href: "/ai/grasshopper" },
  { name: "Autodesk Dynamo", status: "In development", href: "/ai/dynamo" },
] as const;

export const faq = [
  {
    q: "Can I try it on this website?",
    a: "The demo on this page is illustrative and uses sample data; the recordings show real project work. Work in an engineering application requires the installed Vector OS app and an available connector.",
  }, // live, adjusted: the scripted website sample is no longer on this page
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
  about: "An AI workspace for CAD and engineering. Plan, build and review in your tools.", // live (hero)
  platform: "Windows 10/11 · 64-bit beta. macOS is not available.", // live (/download)
  legal: [
    ["Privacy", "/privacy"],
    ["Terms", "/terms"],
  ] as [string, string][],
  cols: [
    {
      h: "Product",
      links: [
        ["What is Vector OS?", "/product"],
        ["Design and Project modes", "/product/workspace-modes"],
        ["Software directory", "/software"],
        ["AI workflows", "/ai"],
      ],
    },
    {
      h: "Resources",
      links: [
        ["Examples", "/gallery"],
        ["Pricing", "/pricing"],
        ["Guides", "/tutorials"],
        ["Support", "/support"],
        ["Release notes", "/releases"],
      ],
    },
    {
      h: "Vector OS",
      links: [
        ["Join the beta", "/download"],
        ["Email updates", "#email-updates"],
        ["Book a demo", CALENDLY],
        ["Sign in", SIGN_IN],
      ],
    },
  ],
};
