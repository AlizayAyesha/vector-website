import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import BookDemoDialog from "@/components/BookDemo";
import SubscribeDialog from "@/components/SubscribeDialog";
import SiteSearch from "@/components/SiteSearch";
import { CANONICAL_ORIGIN, INDEXABLE, SITE_URL, THEME_COLOR } from "@/lib/site";
import { OG_IMAGE } from "@/lib/seo";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-Variable.woff2",
  variable: "--font-inter",
  weight: "100 900",
  display: "swap",
});

const DESCRIPTION = "Vector OS is an AI workspace for CAD and engineering. Explore Design and Project modes, recorded workflows and beta connector availability.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "AI workspace for CAD and engineering · Vector OS", template: "%s · Vector OS" },
  description: DESCRIPTION,
  applicationName: "Vector OS",
  alternates: { canonical: CANONICAL_ORIGIN },
  icons: {
    icon: [
      { url: "/icons/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
      { url: "/icons/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/icons/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/icons/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    shortcut: "/icons/favicon.ico",
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  openGraph: {
    type: "website",
    siteName: "Vector OS",
    title: "AI workspace for CAD and engineering · Vector OS",
    description: DESCRIPTION,
    url: SITE_URL,
    images: [OG_IMAGE],
  },
  twitter: { card: "summary_large_image", title: "AI workspace for CAD and engineering · Vector OS", description: DESCRIPTION, images: [OG_IMAGE.url] },
  // Preview: keep out of search engines until launch (flip NEXT_PUBLIC_SITE_INDEXABLE=true, see lib/site.ts).
  robots: INDEXABLE ? { index: true, follow: true } : { index: false, follow: false, googleBot: { index: false, follow: false } },
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR,
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": `${CANONICAL_ORIGIN}/#publisher`, name: "Vector OS", url: `${CANONICAL_ORIGIN}/`, logo: `${SITE_URL}/icons/android-chrome-512x512.png` },
    {
      "@type": "WebSite",
      "@id": `${CANONICAL_ORIGIN}/#website`,
      name: "Vector OS",
      url: `${CANONICAL_ORIGIN}/`,
      description: DESCRIPTION,
      publisher: { "@id": `${CANONICAL_ORIGIN}/#publisher` },
      inLanguage: "en",
    },
    {
      "@type": "SoftwareApplication",
      name: "Vector OS",
      applicationCategory: "DesignApplication",
      operatingSystem: "Windows 10, Windows 11 (64-bit)",
      description: "An AI workspace for CAD and engineering. Plan, build and review in your tools.",
      url: `${CANONICAL_ORIGIN}/`,
      publisher: { "@id": `${CANONICAL_ORIGIN}/#publisher` },
    },
  ],
};

/** Applies the saved theme before first paint (dark by default, as in the desktop app). */
const themeScript = `try{var t=localStorage.getItem("vector-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;else document.documentElement.dataset.theme="dark"}catch(e){document.documentElement.dataset.theme="dark"}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} data-theme="dark" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
        {children}
        <BookDemoDialog />
        <SubscribeDialog />
        <SiteSearch />
      </body>
    </html>
  );
}
