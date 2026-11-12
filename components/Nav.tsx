"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ctas, nav } from "@/lib/content";
import { Logo } from "./Logo";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const path = usePathname() || "/";
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [path]);
  const active = (href: string) => path === href || path.startsWith(href + "/");

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        aria-label="Main"
        className={`glass flex w-full max-w-5xl items-center justify-between rounded-full py-2 pl-5 pr-2 transition-[background,box-shadow] duration-300 ${scrolled || path !== "/" ? "glass-strong" : ""}`}
      >
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="size-5" />
          Vector OS
        </Link>
        <ul className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <li key={n.label}>
              <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm transition-colors hover:text-fg ${active(n.href) ? "text-fg" : "text-muted"}`}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-1.5">
          <a href={ctas.signIn} className="hidden rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg lg:inline-flex">
            Sign in
          </a>
          <a href={ctas.bookDemo} className="btn-primary hidden sm:inline-flex">
            Book a demo
          </a>
          <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-full text-fg md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </nav>
      {open && (
        <div className="glass-strong absolute inset-x-4 top-16 rounded-3xl p-3 md:hidden">
          {nav.map((n) => (
            <Link key={n.label} href={n.href} className="block rounded-2xl px-4 py-3 text-base text-fg hover:bg-white/5">
              {n.label}
            </Link>
          ))}
          <a href={ctas.signIn} className="block rounded-2xl px-4 py-3 text-base text-muted hover:bg-white/5">Sign in</a>
          <a href={ctas.bookDemo} className="btn-primary mt-2 w-full justify-center">
            Book a demo
          </a>
        </div>
      )}
    </header>
  );
}
