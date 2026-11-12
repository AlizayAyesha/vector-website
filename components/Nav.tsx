"use client";

import { useEffect, useState } from "react";
import { ctas, nav } from "@/lib/content";
import { Logo } from "./Logo";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        aria-label="Main"
        className={`glass flex w-full max-w-5xl items-center justify-between rounded-full py-2 pl-5 pr-2 transition-[background,box-shadow] duration-300 ${scrolled ? "glass-strong" : ""}`}
      >
        <a href="#top" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <Logo className="size-5" />
          Vector OS
        </a>
        <ul className="hidden items-center gap-1 md:flex">
          {nav.map((n) => (
            <li key={n.label}>
              <a href={n.href} className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg">
                {n.label}
              </a>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
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
            <a key={n.label} href={n.href} className="block rounded-2xl px-4 py-3 text-base text-fg hover:bg-white/5">
              {n.label}
            </a>
          ))}
          <a href={ctas.bookDemo} className="btn-primary mt-2 w-full justify-center">
            Book a demo
          </a>
        </div>
      )}
    </header>
  );
}
