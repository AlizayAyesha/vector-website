import Nav from "@/components/Nav";
import Story from "@/components/Story";
import Faq from "@/components/Faq";
import Media from "@/components/Media";
import Reveal from "@/components/Reveal";
import { HeroCanvas } from "@/components/Lazy3D";
import { Logo } from "@/components/Logo";
import { ctas, footer, hero, steps, tools } from "@/lib/content";

const Arrow = () => (
  <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
    <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function StepIcon({ i }: { i: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 48 48" className="size-10 text-fg" aria-hidden="true">
      {i === 0 && (
        <g {...common}>
          <path d="M8 12h32v20H22l-8 7v-7H8z" />
          <path d="M15 20h18M15 25h11" />
        </g>
      )}
      {i === 1 && (
        <g {...common}>
          <rect x="8" y="8" width="32" height="32" rx="3" />
          <path d="M8 18h32M18 18v22" />
          <path d="M24 28h10M24 33h6" />
        </g>
      )}
      {i === 2 && (
        <g {...common}>
          <path d="M24 6l15 8.5v17L24 40 9 31.5v-17z" />
          <path d="M9 14.5 24 23l15-8.5M24 23v17" />
        </g>
      )}
    </svg>
  );
}

export default function Home() {
  const loop = [...tools, ...tools];
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-full focus:bg-fg focus:px-4 focus:py-2 focus:text-black">
        Skip to content
      </a>
      <Nav />

      <main id="main">
        {/* HERO */}
        <section id="top" className="relative flex min-h-svh flex-col justify-end overflow-hidden pb-16 pt-32 md:justify-center md:pb-0">
          <div className="absolute inset-0">
            <div className="absolute inset-0 md:left-[30%]">
              <HeroCanvas />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black via-black/40 to-transparent md:via-black/10" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />
          </div>

          <div className="relative mx-auto w-full max-w-6xl px-6">
            <p className="eyebrow mb-6">{hero.eyebrow}</p>
            <h1 className="text-[clamp(3rem,9.5vw,8.5rem)] font-semibold leading-[0.92] tracking-[-0.045em]">
              {hero.title[0]}
              <br />
              <span className="bg-gradient-to-b from-fg to-fg/45 bg-clip-text text-transparent">{hero.title[1]}</span>
            </h1>
            <p className="mt-7 max-w-md text-pretty text-lg text-muted md:text-xl">{hero.sub}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <a href={ctas.bookDemo} className="btn-primary btn-lg">
                Book a demo <Arrow />
              </a>
              <a href="#work" className="btn-ghost btn-lg glass">
                See the work
              </a>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-2 text-muted md:flex" aria-hidden="true">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Scroll</span>
            <span className="h-8 w-px bg-gradient-to-b from-muted to-transparent" />
          </div>
        </section>

        {/* STORY (scroll-driven 3D) */}
        <Story />

        {/* ASK → PLAN → BUILD */}
        <section id="how" className="scroll-mt-24 relative mx-auto max-w-6xl px-6 py-28 md:py-40">
          <Reveal>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 max-w-2xl text-balance text-4xl font-semibold tracking-tight md:text-6xl">From an idea to the next step.</h2>
          </Reveal>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.k} delay={i * 120}>
                <article className="group relative h-full overflow-hidden rounded-3xl border border-line bg-card p-8 transition-colors hover:border-[#4a4a4f]">
                  <div className="hairline-grid pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  <div className="relative flex items-start justify-between">
                    <StepIcon i={i} />
                    <span className="font-mono text-xs text-muted">{s.k}</span>
                  </div>
                  <h3 className="relative mt-16 text-3xl font-semibold tracking-tight">{s.title}</h3>
                  <p className="relative mt-2 text-muted">{s.body}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

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
                    <span className="text-lg font-medium tracking-tight">{t.name}</span>
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
          <span>Software and vendor names identify the tools discussed; they do not imply endorsement.</span>
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
