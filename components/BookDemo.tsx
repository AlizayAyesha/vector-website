"use client";

import { useEffect, useRef, useState } from "react";
import { CALENDLY } from "@/lib/site";

/**
 * Vector's real Calendly scheduler in a dialog. Mounted once in the root layout.
 * Any link pointing at the Calendly URL (or href="#book-demo") opens it; without JS the link
 * simply opens Calendly in a new tab.
 *
 * While open: page scroll is locked (html[data-modal]) so the pinned demo's autoplay and the
 * auto tour cannot move the page underneath; on phones the dialog is a full-screen sheet.
 */
export default function BookDemoDialog() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "slow">("loading");
  const [src, setSrc] = useState("");
  const dlg = useRef<HTMLDialogElement>(null);

  useEffect(() => {
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
    if (window.location.hash === "#book-demo") setOpen(true);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const root = document.documentElement;
    if (open) {
      // colours follow the active site theme
      const light = root.dataset.theme === "light";
      const u = new URL(CALENDLY);
      u.searchParams.set("embed_type", "Inline");
      u.searchParams.set("embed_domain", window.location.host);
      u.searchParams.set("hide_gdpr_banner", "1");
      u.searchParams.set("background_color", light ? "ffffff" : "101010");
      u.searchParams.set("text_color", light ? "0b0b0d" : "f4f4f5");
      u.searchParams.set("primary_color", light ? "0b0b0d" : "f4f4f5");
      setSrc(u.toString());
      setState("loading");
      if (!d.open) d.showModal();
      root.dataset.modal = "book-demo";
      const slow = setTimeout(() => setState((s) => (s === "loading" ? "slow" : s)), 12000);
      return () => clearTimeout(slow);
    }
    if (d.open) d.close();
    if (root.dataset.modal === "book-demo") delete root.dataset.modal;
    setSrc("");
  }, [open]);

  return (
    <dialog
      ref={dlg}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dlg.current && setOpen(false)}
      aria-labelledby="book-demo-title"
      className="dlg m-0 h-[100dvh] max-h-none w-screen max-w-none overflow-hidden border-line bg-card p-0 text-fg sm:m-auto sm:h-auto sm:w-[min(1000px,94vw)] sm:rounded-3xl sm:border"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <p id="book-demo-title" className="text-sm font-semibold">Book a Vector OS demo</p>
            <p className="truncate text-xs text-muted">Choose a date and time, then add your details to confirm.</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-fg" aria-label="Close booking dialog">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="relative min-h-0 flex-1 bg-card sm:h-[min(720px,76vh)] sm:flex-none">
          {state !== "ready" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-muted" role="status">
              <span className="size-5 animate-spin rounded-full border-2 border-line border-t-fg" aria-hidden="true" />
              {state === "loading" ? "Loading available times…" : (
                <span>
                  The scheduler is taking longer than usual.{" "}
                  <a href={CALENDLY} target="_blank" rel="noopener noreferrer" data-no-dialog className="text-fg underline underline-offset-4">Open it in a new tab</a>
                </span>
              )}
            </div>
          )}
          {open && src && (
            <iframe
              key={src}
              title="Book a Vector OS demo: date, time and details"
              src={src}
              className={`relative size-full transition-opacity duration-300 ${state === "ready" ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setState("ready")}
            />
          )}
        </div>
        <p className="border-t border-line px-5 py-2.5 text-[11px] text-muted">
          Scheduling is provided by Calendly.{" "}
          <a href={CALENDLY} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-fg" data-no-dialog>
            Open in a new tab
          </a>
        </p>
      </div>
    </dialog>
  );
}
