"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SUBSCRIBE_ENDPOINT, WAITLIST_FORM } from "@/lib/site";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type State = "idle" | "loading" | "handoff" | "done" | "error" | "blocked";

/**
 * Email-updates dialog (replaces the standalone /waitlist page, which now redirects to /#email-updates).
 * Opened by any link to "#email-updates".
 *
 * Honest by design: vectoros.one/api/waitlist does not accept cross-origin posts, so unless
 * NEXT_PUBLIC_SUBSCRIBE_ENDPOINT is configured this dialog never claims a subscription. It validates the
 * address, copies it, and opens Vector's own sign-up form in a new tab, then says exactly that.
 */
export default function SubscribeDialog() {
  const dlg = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [state, setState] = useState<State>("idle");
  const [copied, setCopied] = useState(false);
  const invalid = !EMAIL.test(email.trim());

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a") as HTMLAnchorElement | null;
      const href = a?.getAttribute("href") || "";
      if (href === "#email-updates" || href === "/#email-updates") {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener("click", onClick);
    if (window.location.hash === "#email-updates") {
      setOpen(true);
      history.replaceState(null, "", window.location.pathname + window.location.search);
    }
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    const d = dlg.current;
    if (!d) return;
    const root = document.documentElement;
    if (open) {
      if (!d.open) d.showModal();
      root.dataset.modal = "email-updates";
      requestAnimationFrame(() => field.current?.focus());
    } else {
      if (d.open) d.close();
      if (root.dataset.modal === "email-updates") delete root.dataset.modal;
      setState((s) => (s === "loading" ? s : "idle"));
      setTouched(false);
      setCopied(false);
    }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (invalid) {
      field.current?.focus();
      return;
    }
    const value = email.trim();
    if (SUBSCRIBE_ENDPOINT) {
      setState("loading");
      try {
        const r = await fetch(SUBSCRIBE_ENDPOINT, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: value }) });
        setState(r.ok ? "done" : "error");
      } catch {
        setState("error");
      }
      return;
    }
    // Hand-off: must open synchronously inside the submit gesture so the browser allows the new tab.
    setState("loading");
    // no "noopener" feature here: with it, window.open always returns null and a blocked tab can't be detected
    const w = window.open(WAITLIST_FORM, "_blank");
    if (w) w.opener = null;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
    setTimeout(() => setState(w ? "handoff" : "blocked"), 350);
  };

  const showError = touched && invalid;

  return (
    <dialog
      ref={dlg}
      onClose={() => setOpen(false)}
      onClick={(e) => e.target === dlg.current && setOpen(false)}
      aria-labelledby="subscribe-title"
      className="dlg m-auto w-[min(460px,92vw)] max-w-none overflow-hidden rounded-3xl border border-line bg-card p-0 text-fg"
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Follow the build</p>
            <h2 id="subscribe-title" className="mt-2 text-2xl font-semibold tracking-tight">Get email updates</h2>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="-mr-2 -mt-1 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fg/5 hover:text-fg" aria-label="Close email updates">
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <p className="mt-2 text-sm text-muted">One weekly email about Vector OS, new recordings and release news. Unsubscribe at any time.</p>

        {state === "handoff" || state === "done" ? (
          <div className="mt-6 rounded-2xl border border-line bg-inset p-4" role="status">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span className="flex size-5 items-center justify-center rounded-full bg-fg text-on-fg">
                <svg viewBox="0 0 12 12" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M2.5 6.2 5 8.5 9.5 3.5" /></svg>
              </span>
              {state === "done" ? "You're on the list." : "Vector's sign-up form is open in a new tab."}
            </p>
            {state === "handoff" && (
              <p className="mt-2 text-sm text-muted">
                Finish there to join: {copied ? <>your email <span className="text-fg">{email.trim()}</span> is copied, so just paste it in.</> : <>enter <span className="text-fg">{email.trim()}</span> in the form.</>} Nothing has been submitted from this page yet.
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {state === "handoff" && <a href={WAITLIST_FORM} target="_blank" rel="noopener noreferrer" className="btn-ghost">Open the form again</a>}
              <button type="button" onClick={() => setOpen(false)} className="btn-primary">Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="mt-6">
            <label htmlFor="subscribe-email" className="text-sm font-medium">Email address</label>
            <input
              ref={field}
              id="subscribe-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (state === "error" || state === "blocked") setState("idle");
              }}
              onBlur={() => email && setTouched(true)}
              aria-invalid={showError}
              aria-describedby="subscribe-help"
              placeholder="you@company.com"
              className="field mt-2 h-11"
            />
            <p id="subscribe-help" className={`mt-2 min-h-5 text-xs ${showError ? "text-[#ef4444]" : "text-muted"}`} aria-live="polite">
              {showError ? (email.trim() ? "Enter a valid email address, like name@company.com." : "Enter your email address.") : SUBSCRIBE_ENDPOINT ? "We only use this for Vector OS updates." : "Opens Vector's sign-up form on vectoros.one in a new tab to confirm."}
            </p>
            {state === "error" && (
              <p className="mt-1 rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 px-3 py-2 text-xs text-fg" role="alert">
                Something went wrong and you weren&apos;t subscribed. Try again, or use <a href={WAITLIST_FORM} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">the form on vectoros.one</a>.
              </p>
            )}
            {state === "blocked" && (
              <p className="mt-1 rounded-xl border border-line bg-inset px-3 py-2 text-xs text-fg" role="alert">
                Your browser blocked the new tab. <a href={WAITLIST_FORM} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Open Vector&apos;s sign-up form</a>.
              </p>
            )}
            <button type="submit" disabled={state === "loading"} className="btn-primary btn-lg mt-4 w-full justify-center disabled:opacity-60">
              {state === "loading" ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-on-fg/30 border-t-on-fg" aria-hidden="true" />
                  {SUBSCRIBE_ENDPOINT ? "Subscribing…" : "Opening the form…"}
                </>
              ) : SUBSCRIBE_ENDPOINT ? "Subscribe" : "Continue"}
            </button>
            <p className="mt-4 text-[11px] leading-relaxed text-muted">
              No product account is created. Joining does not guarantee early access. Every newsletter includes an unsubscribe option. See the <Link href="/privacy" onClick={() => setOpen(false)} className="underline underline-offset-4 hover:text-fg">privacy notice</Link>.
            </p>
          </form>
        )}
      </div>
    </dialog>
  );
}
