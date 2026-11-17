"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ctas, nav, navLinks, type NavGroup } from "@/lib/content";
import { Logo } from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { openSearch } from "./SiteSearch";

const Chevron = ({ open }: { open?: boolean }) => (
  <svg viewBox="0 0 16 16" className={`size-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="m4 6 4 4 4-4" /></svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="7" cy="7" r="4.5" /><path d="m10.5 10.5 3 3" /></svg>
);

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);
  const closeT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const path = usePathname() || "/";

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    setOpen(false);
    setMenu(null);
  }, [path]);
  useEffect(() => {
    if (!menu) return;
    const out = (e: PointerEvent) => !navRef.current?.contains(e.target as Node) && setMenu(null);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setMenu(null);
    document.addEventListener("pointerdown", out);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", out);
      document.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const active = (href: string) => path === href || path.startsWith(href + "/");
  const groupActive = (g: NavGroup) => g.columns.some((c) => c.links.some((l) => active(l.href)));
  const hover = (label: string | null) => {
    if (closeT.current) clearTimeout(closeT.current);
    if (label) setMenu(label);
    else closeT.current = setTimeout(() => setMenu(null), 140);
  };

  return (
    <header className="fixed inset-x-0 top-4 z-50 flex justify-center px-4">
      <nav
        ref={navRef}
        aria-label="Main"
        className={`glass ${path === "/" && !scrolled && !menu ? "theme-dark" : ""} relative flex w-full max-w-6xl items-center justify-between gap-2 rounded-full py-1.5 pl-5 pr-1.5 transition-[background,box-shadow] duration-300 ${scrolled || path !== "/" || menu ? "glass-strong" : ""}`}
      >
        <Link href="/" className="flex shrink-0 items-center gap-2 text-sm font-semibold tracking-tight" aria-label="Vector OS home">
          <Logo className="size-5" />
          Vector OS
        </Link>

        <ul className="hidden items-center gap-0.5 md:flex">
          {nav.map((g) => (
            <li key={g.label} className="relative" onPointerEnter={(e) => e.pointerType === "mouse" && hover(g.label)} onPointerLeave={(e) => e.pointerType === "mouse" && hover(null)}>
              <button
                type="button"
                aria-expanded={menu === g.label}
                aria-controls={`menu-${g.label}`}
                onClick={() => setMenu(menu === g.label ? null : g.label)}
                className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors hover:text-fg ${groupActive(g) || menu === g.label ? "text-fg" : "text-muted"}`}
              >
                {g.label}
                <Chevron open={menu === g.label} />
              </button>
              {menu === g.label && (
                <div id={`menu-${g.label}`} className="absolute left-1/2 top-full -translate-x-1/2 pt-3">
                  <div className={`menu-in grid gap-6 rounded-2xl border border-line bg-bg/95 p-4 shadow-[var(--glass-shadow)] backdrop-blur-xl ${g.columns.length > 1 ? "w-[34rem] grid-cols-[1.1fr_1fr]" : "w-80"}`}>
                    {g.columns.map((c) => (
                      <div key={c.h}>
                        <p className="px-2 pb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-muted">{c.h}</p>
                        <ul>
                          {c.links.map((l) => (
                            <li key={l.href}>
                              <Link href={l.href} aria-current={path === l.href ? "page" : undefined} className="flex items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-fg/5">
                                <span className="min-w-0">
                                  <span className="block text-sm font-medium text-fg">{l.label}</span>
                                  {l.note && <span className="block truncate text-xs text-muted">{l.note}</span>}
                                </span>
                                {l.status && (
                                  <span className={`shrink-0 rounded-full px-2 py-px text-[10px] ${l.status === "Available" ? "bg-fg text-on-fg" : "border border-dashed border-line text-muted"}`}>{l.status}</span>
                                )}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
          {navLinks.map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={active(n.href) ? "page" : undefined} className={`rounded-full px-3 py-1.5 text-sm transition-colors hover:text-fg ${active(n.href) ? "text-fg" : "text-muted"}`}>
                {n.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-1">
          <button type="button" onClick={openSearch} aria-label="Search the site" className="hidden h-9 items-center gap-2 rounded-full border border-line pl-3 pr-2 text-sm text-muted transition-colors hover:border-line-strong hover:text-fg lg:inline-flex">
            <SearchIcon />
            Search
            <kbd className="rounded-md border border-line px-1.5 py-px font-mono text-[10px]">Ctrl K</kbd>
          </button>
          <button type="button" onClick={openSearch} aria-label="Search the site" className="inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-fg lg:hidden">
            <SearchIcon />
          </button>
          <ThemeToggle />
          <a href={ctas.signIn} className="hidden rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:text-fg xl:inline-flex">
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
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 8h16M4 16h16" />}
            </svg>
          </button>
        </div>
      </nav>

      {open && (
        <div id="mobile-menu" className="menu-in absolute inset-x-4 top-16 border border-line bg-bg shadow-[var(--glass-shadow)] max-h-[calc(100svh-6rem)] overflow-y-auto rounded-3xl p-3 md:hidden">
          {nav.map((g) => (
            <div key={g.label} className="border-b border-line last:border-0">
              <button type="button" aria-expanded={section === g.label} onClick={() => setSection(section === g.label ? null : g.label)} className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-base text-fg">
                {g.label}
                <Chevron open={section === g.label} />
              </button>
              {section === g.label && (
                <ul className="pb-2">
                  {g.columns.flatMap((c) => c.links).map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex items-center justify-between gap-3 rounded-xl px-4 py-2 text-sm text-muted hover:bg-fg/5 hover:text-fg">
                        {l.label}
                        {l.status && <span className="text-[10px] uppercase tracking-[0.08em]">{l.status}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {navLinks.map((n) => (
            <Link key={n.href} href={n.href} className="block rounded-2xl px-4 py-3 text-base text-fg hover:bg-fg/5">
              {n.label}
            </Link>
          ))}
          <a href={ctas.signIn} className="block rounded-2xl px-4 py-3 text-base text-muted hover:bg-fg/5">Sign in</a>
          <a href={ctas.bookDemo} className="btn-primary mt-2 w-full justify-center">
            Book a demo
          </a>
        </div>
      )}
    </header>
  );
}
