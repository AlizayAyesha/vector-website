import Link from "next/link";
import { Logo } from "./Logo";
import { ctas, footer } from "@/lib/content";
import { CONTACT_EMAIL } from "@/lib/site";

/** Internal paths use next/link; hashes (dialogs) and external URLs use a plain anchor. */
function FLink({ href, children, className }: { href: string; children: React.ReactNode; className: string }) {
  return href.startsWith("/") ? (
    <Link href={href} className={className}>{children}</Link>
  ) : (
    <a href={href} className={className}>{children}</a>
  );
}

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5" aria-label="Vector OS home">
            <span className="flex size-9 items-center justify-center rounded-xl bg-fg text-on-fg">
              <Logo className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-semibold tracking-tight">Vector OS</span>
              <span className="block text-xs text-muted">{footer.tagline}</span>
            </span>
          </Link>
          <p className="mt-5 max-w-xs text-sm text-muted">{footer.about}</p>
          <p className="mt-2 text-xs text-muted">{footer.platform}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <a href={ctas.bookDemo} className="btn-primary">Book a demo</a>
            <a href={ctas.emailUpdates} className="btn-ghost">Get email updates</a>
          </div>
        </div>
        {footer.cols.map((c) => (
          <div key={c.h}>
            <p className="text-sm font-medium">{c.h}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <FLink href={href} className="text-sm text-muted transition-colors hover:text-fg">{label}</FLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-4 border-t border-line px-6 py-6 text-xs text-muted md:flex-row md:items-start md:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="flex items-center gap-1.5 text-fg">
            <Logo className="size-3.5" /> © 2026 Vector OS
          </span>
          {footer.legal.map(([label, href]) => (
            <Link key={href} href={href} className="transition-colors hover:text-fg">{label}</Link>
          ))}
          <a href={`mailto:${CONTACT_EMAIL}`} className="transition-colors hover:text-fg">{CONTACT_EMAIL}</a>
        </div>
        <span className="max-w-xl md:text-right">Rhino, Grasshopper, Blender, Revit, Autodesk Dynamo, Maxsurf and SOLIDWORKS are trademarks of their respective owners. Logos and names indicate compatibility only and do not imply endorsement.</span>
      </div>
      <div className="pointer-events-none select-none overflow-hidden px-6" aria-hidden="true">
        <p className="mx-auto flex max-w-6xl translate-y-[18%] items-center gap-[0.12em] whitespace-nowrap text-[15vw] font-semibold leading-none tracking-[-0.06em] text-fg/[0.06] md:text-[13vw]">
          <Logo className="size-[0.72em] shrink-0" />
          Vector OS
        </p>
      </div>
    </footer>
  );
}
