import Nav from "@/components/Nav";
import Story from "@/components/Story";
import Faq from "@/components/Faq";
import Media from "@/components/Media";
import Reveal from "@/components/Reveal";
import Intro from "@/components/Intro";
import Demo from "@/components/demo/Demo";
import { Logo } from "@/components/Logo";
import { ctas, footer, tools } from "@/lib/content";
import { ToolLogo } from "@/components/ToolLogo";

const Arrow = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function Home() {
  const loop = [...tools, ...tools];
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Nav />

      <main id="main">
        {/* INTRO: pinned hero + scroll-scrubbed 3D */}
        <Intro />

        {/* PRODUCT DEMO: pinned, scroll-scrubbed workspace story */}
        <Demo />

        {/* STORY (scroll-driven 3D) */}
        <Story />

        {/* MEDIA */}
        <section id="work" className="scroll-mt-24 relative mx-auto max-w-6xl px-6 pb-28 md:pb-40">
          <Reveal className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="eyebrow">Recorded projects</p>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">See the work.</h2>
            </div>
            <a href={ctas.gallery} className="btn-ghost">
              All examples <Arrow />
            </a>
          </Reveal>
          <Reveal className="mt-12" delay={100}>
            <Media />
          </Reveal>
          <p className="mt-5 text-sm text-muted">Recorded projects. Check the available build for current capabilities.</p>
        </section>

        {/* TOOLS */}
        <section id="tools" className="scroll-mt-24 relative border-y border-line bg-[#050505] py-24 md:py-32">
          <div className="mx-auto max-w-6xl px-6">
            <Reveal className="flex flex-wrap items-end justify-between gap-6">
              <div>
                <p className="eyebrow">Built around your tools</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-6xl">Keep your workflow.</h2>
                <p className="mt-4 max-w-md text-muted">Explore software and check connection status.</p>
              </div>
              <a href={ctas.software} className="btn-ghost">
                Browse all software <Arrow />
              </a>
            </Reveal>
          </div>

          <div className="relative mt-14 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
            <ul className="marquee flex w-max gap-4 px-2">
              {loop.map((t, i) => (
                <li key={`${t.name}-${i}`} aria-hidden={i >= tools.length}>
                  <a
                    href={t.href}
                    tabIndex={i >= tools.length ? -1 : undefined}
                    className="flex min-w-[16rem] items-center justify-between gap-6 rounded-2xl border border-line bg-card px-6 py-5 transition-colors hover:bg-card-2"
                  >
                    <span className="flex items-center gap-3.5">
                      <span className="flex size-10 items-center justify-center rounded-xl border border-line bg-black">
                        <ToolLogo name={t.name} className="size-6" wordSize="10px" />
                      </span>
                      <span className="text-lg font-medium tracking-tight">{t.name}</span>
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${
                        t.status === "Available" ? "bg-fg text-black" : "border border-dashed border-line text-muted"
                      }`}
                    >
                      <span className={`size-1.5 rounded-full ${t.status === "Available" ? "bg-black" : "bg-muted"}`} />
                      {t.status}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
          <p className="mx-auto mt-8 max-w-6xl px-6 text-sm text-muted">
            Status from the Vector OS software directory. Beta availability is not a guarantee of every feature, host version or module. Grasshopper and Dynamo do not inherit Rhino or Revit availability.
          </p>
        </section>

        {/* CTA */}
        <section id="start" className="scroll-mt-24 relative overflow-hidden px-6 py-32 md:py-44">
          <div className="hairline-grid pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,#000_20%,transparent_70%)]" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.04] blur-3xl" />
          <Reveal className="relative mx-auto max-w-3xl text-center">
            <p className="eyebrow">Step inside</p>
            <h2 className="mt-5 text-balance text-5xl font-semibold tracking-[-0.03em] md:text-7xl">Make yourself at home.</h2>
            <p className="mx-auto mt-5 max-w-md text-lg text-muted">Explore Design, Projects and connections.</p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a href={ctas.bookDemo} className="btn-primary btn-lg">
                Book a demo <Arrow />
              </a>
              <a href={ctas.joinBeta} className="btn-ghost btn-lg">
                Join the beta
              </a>
            </div>
            <p className="mt-6 text-sm text-muted">
              Windows 10/11 · 64-bit beta. macOS is not available.{" "}
              <a href={ctas.emailUpdates} className="underline decoration-line underline-offset-4 hover:text-fg">
                Get email updates
              </a>
            </p>
          </Reveal>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-24 mx-auto grid max-w-6xl gap-12 px-6 pb-32 md:grid-cols-[1fr_2fr] md:pb-44">
          <Reveal>
            <p className="eyebrow">FAQ</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">A few useful answers.</h2>
          </Reveal>
          <Reveal delay={100}>
            <Faq />
          </Reveal>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
          <div>
            <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
              <Logo className="size-5" /> Vector OS
            </a>
            <p className="mt-3 text-muted">{footer.tagline}</p>
          </div>
          {footer.cols.map((c) => (
            <div key={c.h}>
              <p className="text-sm font-medium">{c.h}</p>
              <ul className="mt-4 space-y-2.5">
                {c.links.map(([label, href]) => (
                  <li key={label}>
                    <a href={href} className="text-sm text-muted transition-colors hover:text-fg">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-6 text-xs text-muted">
          <span>© 2026 Vector OS</span>
          <span className="max-w-xl">Rhino, Grasshopper, Blender, Revit, Autodesk Dynamo, Maxsurf and SOLIDWORKS are trademarks of their respective owners. Logos and names indicate compatibility only and do not imply endorsement.</span>
        </div>
        <div className="pointer-events-none select-none overflow-hidden px-6" aria-hidden="true">
          <p className="mx-auto max-w-6xl translate-y-[18%] bg-gradient-to-b from-white/[0.09] to-transparent bg-clip-text text-[22vw] font-semibold leading-none tracking-[-0.06em] text-transparent">
            Vector
          </p>
        </div>
      </footer>
    </>
  );
}
