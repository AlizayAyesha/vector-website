"use client";

import { useEffect, useRef, useState } from "react";
import { CALENDLY } from "@/lib/site";

/**
 * Vector's real Calendly scheduler in a dialog. Mounted once in the root layout.
 * Any link pointing at the Calendly URL (or href="#book-demo") opens it; without JS the link
 * simply opens Calendly in a new tab.
 */
export default function BookDemoDialog() {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const dlg = useRef<HTMLDialogElement>(null);
  const [src, setSrc] = useState("");

  useEffect(() => {
    const u = new URL(CALENDLY);
    u.searchParams.set("embed_type", "Inline");
    u.searchParams.set("embed_domain", window.location.host);
    u.searchParams.set("hide_gdpr_banner", "1");
    u.searchParams.set("background_color", "101010");
    u.searchParams.set("text_color", "f4f4f5");
    u.searchParams.set("primary_color", "f4f4f5");
    setSrc(u.toString());

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("data-no-dialog")) return;
      const href = a.getAttribute("href") || "";
      if (href === "#book-demo" || href.startsWith(CALENDLY)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={dlg}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dlg.current && setOpen(false)}
      aria-labelledby="book-demo-title"
      className="m-auto w-[min(1000px,94vw)] max-w-none overflow-hidden rounded-3xl border border-line bg-card p-0 text-fg backdrop:bg-black/75 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <p id="book-demo-title" className="text-sm font-semibold">Book a Vector OS demo</p>
          <p className="text-xs text-muted">Choose a date and time, then add your details to confirm.</p>
        </div>
        <button type="button" onClick={() => setOpen(false)} className="inline-flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg" aria-label="Close">
          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="relative h-[min(720px,78vh)] bg-[#101010]">
        {!loaded && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted" role="status">Loading available times…</p>}
        {open && src && (
          <iframe title="Book a Vector OS demo — date, time and details" src={src} className="relative size-full" onLoad={() => setLoaded(true)} />
        )}
      </div>
      <p className="border-t border-line px-5 py-2.5 text-[11px] text-muted">
        Scheduling is provided by Calendly.{" "}
        <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-fg" data-no-dialog>
          Open in a new tab
        </a>
      </p>
    </dialog>
  );
}
