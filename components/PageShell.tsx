import Nav from "./Nav";
import Footer from "./Footer";

export default function PageShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-on-fg">
        Skip to content
      </a>
      <Nav />
      <main id="main" className={`relative mx-auto px-6 pb-28 pt-32 md:pb-36 md:pt-40 ${wide ? "max-w-6xl" : "max-w-6xl"}`}>
        <div className="hairline-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] [mask-image:radial-gradient(ellipse_at_top,#000_10%,transparent_70%)]" />
        {children}
      </main>
      <Footer />
    </>
  );
}

/** Ported page body (sanitised HTML from vectoros.one, restyled by .prose-v). */
export function Prose({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`prose-v ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}
