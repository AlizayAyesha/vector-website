"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAuth, NOT_CONFIGURED, useSession, type OAuthProvider } from "@/lib/auth";
import { ProviderIcon, PROVIDER_LABEL } from "./ProviderIcons";
import { safeReturnTo, SIGN_IN_ERRORS } from "@/lib/vector-session";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Phase = "idle" | "sending" | "sent" | "redirecting";

/**
 * Sign-in / sign-up, modelled on the client's reference flow: heading, "Continue with Google" (Vector's provider),
 * "or", one email field, outlined "Continue with email".
 */
export default function LoginForm() {
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const next = safeReturnTo(params.get("returnTo") ?? params.get("next"));
  const callbackError = params.get("error");
  const auth = getAuth();
  const session = useSession();

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(
    callbackError ? SIGN_IN_ERRORS[callbackError] || SIGN_IN_ERRORS.unavailable : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Already signed in: continue to the destination.
  useEffect(() => {
    if (session.status === "signed-in") window.location.replace(next);
  }, [session.status, next]);

  const invalid = touched && !EMAIL_RE.test(email.trim());
  const disabled = phase === "sending" || phase === "redirecting";

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!auth) return setError(NOT_CONFIGURED);
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      inputRef.current?.focus();
      return;
    }
    setPhase("sending");
    setError(null);
    try {
      await auth.signInWithEmail(value, next, { create: signup });
      setPhase("sent");
    } catch (err) {
      setPhase("idle");
      const msg = err instanceof Error ? err.message : "";
      setError(
        /signups? not allowed|user not found/i.test(msg)
          ? "There is no Vector account for that email yet. Sign up instead."
          : /rate limit|too many/i.test(msg)
            ? "Too many attempts. Wait a minute, then try again."
            : "We could not send a sign-in link. Check the address and try again.",
      );
    }
  }

  async function oauth(p: OAuthProvider) {
    if (!auth) return setError(NOT_CONFIGURED);
    setPhase("redirecting");
    setError(null);
    try {
      await auth.signInWithOAuth(p, next);
    } catch {
      setPhase("idle");
      setError(`Sign-in with ${PROVIDER_LABEL[p]} could not be started. Try again.`);
    }
  }

  const switchHref = `/login?${new URLSearchParams({ ...(signup ? {} : { mode: "signup" }), ...(next !== "/dashboard" ? { next } : {}) }).toString()}`;

  if (phase === "sent") {
    return (
      <div className="text-center" role="status" aria-live="polite">
        <h1 className="text-2xl font-semibold tracking-tight">Check your email</h1>
        <p className="mt-2 text-sm text-muted">
          We sent a sign-in link to <span className="text-fg">{email.trim()}</span>. Open it in this browser to continue.
        </p>
        <button type="button" onClick={() => setPhase("idle")} className="btn-ghost mt-8 w-full justify-center rounded-lg!">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight">{signup ? "Create your Vector account" : "Welcome to Vector"}</h1>
        <p className="mt-2 text-sm text-muted">{signup ? "Sign up to choose a plan and manage your subscription." : "Sign in to manage your plan, usage and billing."}</p>
      </div>

      {error && (
        <p role="alert" className="mt-6 rounded-lg border border-red-500/40 bg-red-500/10 px-3.5 py-2.5 text-sm text-fg">
          {error}
        </p>
      )}

      {/* Google is Vector's sign-in provider (Vector 2.0 SignIn.jsx); always shown. Without Supabase config the click reports it honestly. */}
      <button
        type="button"
        onClick={() => oauth("google")}
        disabled={phase === "sending" || phase === "redirecting"}
        className="mt-8 inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-lg border border-line bg-card-2 text-sm font-medium text-fg transition-colors hover:border-line-strong hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
      >
        {phase === "redirecting" ? <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> : <ProviderIcon id="google" />}
        {phase === "redirecting" ? "Opening Google…" : "Continue with Google"}
      </button>
      <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submitEmail} noValidate>
        <label htmlFor="email" className="sr-only">Your email address</label>
        <input
          ref={inputRef}
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="Your email address"
          className="field h-11! rounded-lg!"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setTouched(true)}
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? "email-err" : undefined}
          disabled={disabled}
        />
        {invalid && (
          <p id="email-err" className="mt-1.5 text-xs text-red-400">
            Enter a valid email address.
          </p>
        )}
        <button type="submit" disabled={disabled} className="btn-ghost mt-3 h-11 w-full justify-center rounded-lg! disabled:cursor-not-allowed disabled:opacity-50">
          {phase === "sending" ? (
            <>
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden="true" /> Sending link…
            </>
          ) : phase === "redirecting" ? (
            "Redirecting…"
          ) : (
            "Continue with email"
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        {signup ? "Already have an account? " : "Don't have an account? "}
        <Link href={switchHref} className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
          {signup ? "Sign in" : "Sign up"}
        </Link>
      </p>
      <p className="mt-3 text-center text-xs text-muted">
        <Link href="/terms" className="hover:text-fg">Terms of Service</Link>
        <span className="mx-2" aria-hidden="true">·</span>
        <Link href="/privacy" className="hover:text-fg">Privacy Policy</Link>
      </p>
    </div>
  );
}
