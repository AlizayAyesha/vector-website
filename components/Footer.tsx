import Link from "next/link";
import { Logo } from "./Logo";
import { footer } from "@/lib/content";
import { SIGN_IN } from "@/lib/site";

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <Logo className="size-5" /> Vector OS
          </Link>
          <p className="mt-3 text-muted">{footer.tagline}</p>
        </div>
        {footer.cols.map((c) => (
          <div key={c.h}>
            <p className="text-sm font-medium">{c.h}</p>
            <ul className="mt-4 space-y-2.5">
              {c.links.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-sm text-muted transition-colors hover:text-fg">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-line px-6 py-6 text-xs text-muted">
        <span className="flex items-center gap-4">
          © 2026 Vector OS
          <a href={SIGN_IN} className="transition-colors hover:text-fg">Sign in</a>
        </span>
        <span className="max-w-xl">Rhino, Grasshopper, Blender, Revit, Autodesk Dynamo, Maxsurf and SOLIDWORKS are trademarks of their respective owners. Logos and names indicate compatibility only and do not imply endorsement.</span>
      </div>
      <div className="pointer-events-none select-none overflow-hidden px-6" aria-hidden="true">
        <p className="mx-auto max-w-6xl translate-y-[18%] bg-gradient-to-b from-white/[0.09] to-transparent bg-clip-text text-[22vw] font-semibold leading-none tracking-[-0.06em] text-transparent">
          Vector
        </p>
      </div>
    </footer>
  );
}
