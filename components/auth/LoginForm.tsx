"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getAuth, NOT_CONFIGURED, safeNext, useSession, type OAuthProvider } from "@/lib/auth";
import { ProviderIcon, PROVIDER_LABEL } from "./ProviderIcons";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
type Phase = "idle" | "sending" | "sent" | "redirecting";
type Providers = { oauth: OAuthProvider[]; sso: boolean; email: boolean };

/**
 * Sign-in / sign-up, modelled on the client's reference flow: heading, provider icon row (only providers the
 * identity project has enabled), "or", one email field, outlined "Continue with email".
 */
export default function LoginForm() {
  const params = useSearchParams();
  const signup = params.get("mode") === "signup";
  const next = safeNext(params.get("next"));
  const callbackError = params.get("error");
  const auth = getAuth();
  const session = useSession();

  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(
    !auth ? NOT_CONFIGURED : callbackError ? "That sign-in link could not be verified. Request a new one and open it in this browser." : null,
  );
  const [providers, setProviders] = useState<Providers | null>(null);
  const [ssoOpen, setSsoOpen] = useState(false);
  const [ssoDomain, setSsoDomain] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth) return;
    let alive = true;
    auth
      .enabledProviders()
      .then((p) => alive && setProviders(p))
      .catch(() => alive && setProviders({ oauth: [], sso: false, email: true }));
    return () => {
      alive = false;
    };
  }, [auth]);

  // Already signed in: continue to the destination.
  useEffect(() => {
    if (session.status === "signed-in") window.location.replace(next);
  }, [session.status, next]);

  const invalid = touched && !EMAIL_RE.test(email.trim());
  const disabled = !auth || phase === "sending" || phase === "redirecting";

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

  async function sso(e: React.FormEvent) {
    e.preventDefault();
    if (!auth) return setError(NOT_CONFIGURED);
    const d = ssoDomain.trim().toLowerCase();
    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(d)) return setError("Enter your company's email domain, for example company.com.");
    setPhase("redirecting");
    setError(null);
    try {
      await auth.signInWithSSO(d, next);
    } catch {
      setPhase("idle");
      setError("Single sign-on is not set up for that domain.");
    }
  }

  const switchHref = `/login?${new URLSearchParams({ ...(signup ? {} : { mode: "signup" }), ...(next !== "/dashboard" ? { next } : {}) }).toString()}`;
  const tiles: (OAuthProvider | "sso")[] = providers ? [...providers.oauth, ...(providers.sso ? (["sso"] as const) : [])] : [];

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

      {auth && providers === null && (
        <div className="mt-8 flex justify-center gap-2" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className="size-11 animate-pulse rounded-lg bg-card-2" />
          ))}
        </div>
      )}

      {tiles.length > 0 && (
        <>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            {tiles.map((t) => (
              <button
                key={t}
                type="button"
                disabled={disabled}
                onClick={() => (t === "sso" ? setSsoOpen((v) => !v) : oauth(t))}
                aria-label={`Continue with ${PROVIDER_LABEL[t]}`}
                title={`Continue with ${PROVIDER_LABEL[t]}`}
                aria-expanded={t === "sso" ? ssoOpen : undefined}
                className="grid size-11 place-items-center rounded-lg border border-line bg-card-2 text-fg transition-colors hover:border-line-strong hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ProviderIcon id={t} />
              </button>
            ))}
          </div>
          {ssoOpen && (
            <form onSubmit={sso} className="mt-3 flex gap-2">
              <label htmlFor="sso-domain" className="sr-only">Company domain</label>
              <input id="sso-domain" className="field rounded-lg!" placeholder="company.com" value={ssoDomain} onChange={(e) => setSsoDomain(e.target.value)} disabled={disabled} />
              <button type="submit" className="btn-ghost shrink-0 rounded-lg!" disabled={disabled}>Continue</button>
            </form>
          )}
          <div className="my-6 flex items-center gap-3 text-xs text-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={submitEmail} noValidate className={tiles.length ? "" : "mt-8"}>
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
