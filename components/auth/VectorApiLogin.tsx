"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { NOT_CONFIGURED } from "@/lib/auth";
import { call, num, safeReturnTo, SIGN_IN_ERRORS, str, type ApiError, type ApiResult } from "@/lib/vector-session";
import { ProviderIcon } from "./ProviderIcons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Step = "email" | "code" | "name";
type Msg = { text: string; recovery?: string; tone?: "error" | "info" } | null;
type Busy = null | "email" | "google" | "verify" | "resend";

const Spinner = () => <span className="size-3.5 shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" />;
const dataOf = (r: ApiResult): Record<string, unknown> => ("data" in r && r.data ? (r.data as Record<string, unknown>) : {});

/**
 * Login against Vector 2.0's same-origin session API (NEXT_PUBLIC_VECTOR_AUTH_MODE=vector-api):
 * Google (server-built PKCE redirect) + email one-time code, all on one card with no page reloads.
 */
export default function VectorApiLogin() {
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const returnTo = safeReturnTo(params.get("returnTo") ?? params.get("next"));
  const urlError = params.get("error");

  const csrf = useRef<string | null>(null);
  const ctxPromise = useRef<Promise<boolean> | null>(null);
  const ctxMessage = useRef<string | null>(null);

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState<Busy>(null);
  const [msg, setMsg] = useState<Msg>(urlError ? { text: SIGN_IN_ERRORS[urlError] || SIGN_IN_ERRORS.unavailable } : null);
  const [digits, setDigits] = useState<string[]>(() => Array(6).fill(""));
  const [remaining, setRemaining] = useState<number | null>(null);
  const [expired, setExpired] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [beginAt, setBeginAt] = useState(0); // login-begin rate limit

  const [now, setNow] = useState(0);
  const boxes = useRef<(HTMLInputElement | null)[]>([]);

  const adoptCsrf = (r: ApiResult) => {
    const t = str(dataOf(r).csrf);
    if (t) csrf.current = t;
  };
  const startCountdown = (seconds: number | null) => {
    if (seconds == null) return;
    setNow(Date.now());
    setResendAt(Date.now() + seconds * 1000);
  };
  const focusFirst = () => requestAnimationFrame(() => boxes.current[0]?.focus());

  /** Background context: POST issues the CSRF token; GET restores an email step after a reload. */
  const loadContext = useCallback(() => {
    ctxPromise.current = (async () => {
      const r = await call("context", { body: { return_path: returnTo } });
      if (!r.ok) {
        ctxMessage.current = r.kind === "error" ? r.error.message : null;
        return false;
      }
      adoptCsrf(r);
      const g = await call("context", { method: "GET" });
      if (g.ok && g.data.channel === "email" && g.data.email_started) {
        if (typeof g.data.email_started === "string" && g.data.email_started.includes("@")) setEmail(g.data.email_started);
        startCountdown(num(g.data.resend_in_seconds));
        setStep("code");
        focusFirst();
      }
      return Boolean(csrf.current);
    })();
    return ctxPromise.current;
  }, [returnTo]);

  useEffect(() => {
    void loadContext();
  }, [loadContext]);

  // One ticking clock for every countdown.
  useEffect(() => {
    const until = Math.max(resendAt, beginAt);
    if (!until) return;
    const t = setInterval(() => {
      setNow(Date.now());
      if (Date.now() >= until) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [resendAt, beginAt]);
  const secs = (at: number) => (at && now ? Math.max(0, Math.ceil((at - now) / 1000)) : 0);
  const wait = secs(resendAt);
  const beginWait = secs(beginAt);

  /** Resolves once the CSRF context is ready; retries once, then explains why it isn't. */
  async function ready(): Promise<boolean> {
    if (csrf.current) return true;
    let ok = await (ctxPromise.current ?? loadContext());
    if (!ok) ok = await loadContext();
    if (!ok) setMsg({ text: ctxMessage.current || NOT_CONFIGURED });
    return ok;
  }

  const show = (e: ApiError) => setMsg({ text: e.message, recovery: e.recovery });
  const fail = (r: ApiResult) => {
    if (r.ok) return;
    if (r.kind !== "error") return setMsg({ text: r.kind === "network" ? "You appear to be offline. Check your connection and try again." : NOT_CONFIGURED });
    show(r.error);
  };

  async function google() {
    setMsg(null);
    setBusy("google");
    if (!(await ready())) return setBusy(null);
    const r = await call("google-start", { body: {}, csrf: csrf.current });
    adoptCsrf(r);
    const loc = r.ok ? str(r.data.location) : null;
    let valid = false;
    try {
      valid = !!loc && ((loc.startsWith("/") && !loc.startsWith("//")) || new URL(loc).protocol === "https:");
    } catch {}
    if (valid) return window.location.assign(loc!); // keep "Redirecting…" until the browser leaves
    setBusy(null);
    if (r.ok) setMsg({ text: "Google sign-in could not be started. Try again." });
    else fail(r);
  }

  function toCode() {
    setDigits(Array(6).fill(""));
    setRemaining(null);
    setExpired(false);
    setStep("code");
    focusFirst();
  }

  async function begin(e?: React.FormEvent) {
    e?.preventDefault();
    setTouched(true);
    const address = email.trim();
    if (!EMAIL_RE.test(address)) return;
    if (step === "name" && !name.trim()) return setMsg({ text: "Enter your name to create your account." });
    setMsg(null);
    setBusy("email");
    if (!(await ready())) return setBusy(null);
    const r = await call("login-begin", { body: { method: "email_otp", email: address, ...(name.trim() ? { name: name.trim() } : {}) }, csrf: csrf.current });
    setBusy(null);
    adoptCsrf(r);
    if (r.status === 202) {
      // send_unconfirmed: the provider accepted the request but could not confirm delivery.
      startCountdown(num(dataOf(r).resend_in_seconds) ?? 60);
      toCode();
      return setMsg({ text: "We couldn't confirm the email was sent.", recovery: "Check your inbox and spam folder, or resend the code in a moment.", tone: "info" });
    }
    if (r.ok) {
      startCountdown(num(r.data.resend_in_seconds) ?? 60);
      return toCode();
    }
    if (r.kind === "error" && r.status === 429) {
      const after = num(r.data.retry_after_seconds);
      if (after != null) {
        setNow(Date.now());
        setBeginAt(Date.now() + after * 1000);
      }
    }
    fail(r);
  }

  async function verify(code: string) {
    if (busy) return;
    setMsg(null);
    setBusy("verify");
    if (!(await ready())) return setBusy(null);
    const r = await call("verify-email", { body: { code }, csrf: csrf.current });
    adoptCsrf(r);
    if (r.ok) {
      const dest = r.data.state === "consent_required" ? safeReturnTo(str(r.data.next), "/dashboard/onboarding") : safeReturnTo(str(r.data.return_path) ?? returnTo);
      return window.location.assign(dest); // keep the spinner while the browser navigates
    }
    setBusy(null);
    if (r.kind === "error") {
      const c = r.error.code;
      if (c === "name_required" || r.status === 409) {
        setStep("name");
        return setMsg({ text: r.error.message || "Enter your name to finish creating your account.", recovery: r.error.recovery, tone: "info" });
      }
      if (c === "code_expired" || r.status === 410) setExpired(true);
      setRemaining(c === "invalid_code" ? num(r.data.remaining_attempts) : null);
      if (r.status === 429) startCountdown(num(r.data.retry_after_seconds));
      setDigits(Array(6).fill(""));
      focusFirst();
    }
    fail(r);
  }

  async function resend() {
    if (wait > 0 || busy) return;
    setMsg(null);
    setBusy("resend");
    if (!(await ready())) return setBusy(null);
    const r = await call("resend-email", { body: {}, csrf: csrf.current });
    setBusy(null);
    adoptCsrf(r);
    if (r.ok) {
      setExpired(false);
      setRemaining(null);
      setDigits(Array(6).fill(""));
      startCountdown(num(r.data.resend_in_seconds) ?? 60);
      setMsg({ text: "A new code is on its way.", tone: "info" });
      return focusFirst();
    }
    if (r.kind === "error" && r.status === 429) {
      const after = num(r.data.retry_after_seconds);
      const at = str(r.data.resend_after);
      if (after != null) startCountdown(after);
      else if (at && Number.isFinite(Date.parse(at))) startCountdown(Math.ceil((Date.parse(at) - Date.now()) / 1000));
    }
    fail(r);
  }

  function fillFrom(i: number, v: string) {
    const next = [...digits];
    for (let k = 0; k < v.length && i + k < 6; k++) next[i + k] = v[k];
    setDigits(next);
    boxes.current[Math.min(5, i + v.length)]?.focus();
    if (next.every((d) => d)) void verify(next.join(""));
  }
  function setDigit(i: number, raw: string) {
    const v = raw.replace(/\D/g, "");
    if (v.length > 1) return fillFrom(i, v.slice(0, 6 - i));
    const next = [...digits];
    next[i] = v;
    setDigits(next);
    if (v && i < 5) boxes.current[i + 1]?.focus();
    if (next.every((d) => d)) void verify(next.join(""));
  }
  function onKey(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[i] && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowLeft" && i > 0) boxes.current[i - 1]?.focus();
    if (e.key === "ArrowRight" && i < 5) boxes.current[i + 1]?.focus();
  }

  const invalidEmail = touched && !EMAIL_RE.test(email.trim());
  const switchHref = `/login?${new URLSearchParams({ ...(signup ? {} : { mode: "signup" }), ...(returnTo !== "/dashboard" ? { returnTo } : {}) }).toString()}`;
  const notice = msg && (
    <div role={msg.tone === "info" ? "status" : "alert"} className={`mt-6 rounded-lg border px-3.5 py-2.5 text-sm text-fg ${msg.tone === "info" ? "border-line bg-card" : "border-red-500/40 bg-red-500/10"}`}>
      <p>{msg.text}</p>
      {msg.recovery && <p className="mt-1 text-xs text-muted">{msg.recovery}</p>}
    </div>
  );
  const link = "text-fg underline decoration-line underline-offset-4 hover:decoration-fg";

  if (step === "code")
    return (
      <div>
        <div className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            Sent to <span className="break-all text-fg">{email.trim() || "your email"}</span>
          </p>
          <button type="button" className={`mt-1 text-sm ${link}`} onClick={() => { setStep("email"); setMsg(null); }}>
            Use a different email
          </button>
        </div>
        {notice}
        {expired ? (
          <div className="mt-8 rounded-xl border border-line bg-card p-4 text-center text-sm">
            <p className="font-medium">This code has expired.</p>
            <button type="button" onClick={resend} disabled={wait > 0 || !!busy} className="btn-ghost mt-3 h-11 w-full justify-center rounded-lg! disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "resend" ? <><Spinner /> Sending…</> : wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (digits.every((d) => d)) void verify(digits.join("")); }} className="mt-8">
            <fieldset disabled={busy === "verify"}>
              <legend className="sr-only">Enter the 6-digit code</legend>
              <div className="flex justify-between gap-2">
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={(el) => { boxes.current[i] = el; }}
                    value={d}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => onKey(i, e)}
                    onPaste={(e) => { e.preventDefault(); fillFrom(i, e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6 - i)); }}
                    onFocus={(e) => e.target.select()}
                    inputMode="numeric"
                    autoComplete={i === 0 ? "one-time-code" : "off"}
                    pattern="[0-9]*"
                    maxLength={6}
                    aria-label={`Digit ${i + 1}`}
                    aria-invalid={remaining != null || undefined}
                    className="h-12 w-full min-w-0 rounded-lg border border-line bg-inset text-center text-lg font-semibold tabular-nums text-fg outline-none transition-colors focus:border-fg/60 aria-invalid:border-red-500/70"
                  />
                ))}
              </div>
            </fieldset>
            <button type="submit" disabled={busy === "verify" || !digits.every((d) => d)} className="btn-ghost mt-4 h-11 w-full justify-center rounded-lg! disabled:cursor-not-allowed disabled:opacity-50">
              {busy === "verify" ? <><Spinner /> Verifying…</> : "Continue"}
            </button>
            {remaining != null && <p className="mt-2 text-center text-xs text-muted">{remaining} {remaining === 1 ? "attempt" : "attempts"} remaining</p>}
          </form>
        )}
        <p className="mt-6 text-center text-sm text-muted">
          Didn&apos;t get it?{" "}
          <button type="button" onClick={resend} disabled={wait > 0 || !!busy} className={`${link} disabled:cursor-not-allowed disabled:text-muted disabled:no-underline`}>
            {busy === "resend" ? "Sending…" : wait > 0 ? `Resend code in ${wait}s` : "Resend code"}
          </button>
        </p>
      </div>
    );

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{step === "name" ? "One more step" : signup ? "Create your Vector account" : "Welcome to Vector"}</h1>
        <p className="mt-2 text-sm text-muted">{step === "name" ? "Tell us your name to finish creating your account." : signup ? "Sign up to choose a plan and manage your subscription." : "Sign in to manage your plan, usage and billing."}</p>
      </div>
      {notice}
      {step === "email" && (
        <>
          <button type="button" onClick={google} disabled={!!busy} className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-card-2 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60">
            {busy === "google" ? <Spinner /> : <ProviderIcon id="google" />}
            {busy === "google" ? "Redirecting…" : "Continue with Google"}
          </button>
          <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}
      <form onSubmit={begin} noValidate className={step === "name" ? "mt-8 space-y-3" : "space-y-3"}>
        {step === "name" && (
          <div>
            <label htmlFor="name" className="sr-only">Your name</label>
            <input id="name" autoComplete="name" maxLength={120} placeholder="Your name" className="field h-11! rounded-lg!" value={name} onChange={(e) => setName(e.target.value)} disabled={!!busy} autoFocus />
          </div>
        )}
        <div>
          <label htmlFor="email" className="sr-only">Your email address</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="Your email address" className="field h-11! rounded-lg!" value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => email && setTouched(true)} aria-invalid={invalidEmail || undefined} aria-describedby={invalidEmail ? "email-err" : undefined} disabled={!!busy || step === "name"} />
          {invalidEmail && <p id="email-err" className="mt-1.5 text-xs text-red-400">Enter a valid email address.</p>}
        </div>
        <button type="submit" disabled={!!busy || beginWait > 0} className="btn-ghost h-11 w-full justify-center rounded-lg! disabled:cursor-not-allowed disabled:opacity-50">
          {busy === "email" ? <><Spinner /> Sending code…</> : beginWait > 0 ? `Try again in ${beginWait}s` : step === "name" ? "Continue" : "Continue with email"}
        </button>
      </form>
      {step === "email" && (
        <>
          <p className="mt-8 text-center text-sm text-muted">
            {signup ? "Already have an account? " : "Don't have an account? "}
            <Link href={switchHref} className={link}>{signup ? "Sign in" : "Sign up"}</Link>
          </p>
          <p className="mt-3 text-center text-xs text-muted">
            <Link href="/terms" className="hover:text-fg">Terms of Service</Link>
            <span className="mx-2" aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-fg">Privacy Policy</Link>
          </p>
        </>
      )}
    </div>
  );
}
