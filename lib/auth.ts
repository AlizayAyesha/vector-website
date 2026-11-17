"use client";

/**
 * Authentication adapter.
 *
 * The website never runs its own user database. It talks to ONE identity provider through this interface so the
 * real Vector app (Vector 2.0 monorepo, `apps/web/lib/supabase/*`) can drop in its own implementation when ported.
 *
 * Implementation shipped here: Supabase Auth via @supabase/ssr (cookie session, PKCE), the same provider, package
 * and variable names as the Vector 2.0 web app. It is enabled ONLY when both public env vars are present:
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 * Without them `getAuth()` returns null and every caller must show "Sign-in is not configured in this environment".
 * Nothing here ever pretends a sign-in succeeded.
 */
import { useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { AUTH_CONFIGURED, AUTH_MODE, SUPABASE_CONFIGURED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./auth-config";
import { call, str } from "./vector-session";

export type OAuthProvider = "google" | "github" | "apple" | "azure";

export interface AuthUser {
  id: string;
  email: string | null;
  /** Server-assigned role (Supabase `app_metadata.role`); users cannot set it themselves. */
  role: "admin" | "user";
  createdAt: string | null;
  lastSignInAt: string | null;
}

export interface AuthSession {
  user: AuthUser;
  /** Short-lived access token (the API routes read the session cookie instead; kept for adapters that need it). */
  accessToken: string;
}

export interface AuthAdapter {
  readonly name: string;
  getSession(): Promise<AuthSession | null>;
  onChange(cb: (s: AuthSession | null) => void): () => void;
  /** Providers the identity project actually has enabled (read from the provider, never assumed). */
  enabledProviders(): Promise<{ oauth: OAuthProvider[]; sso: boolean; email: boolean }>;
  /** Sends a one-time sign-in link. `create` = false refuses to create a new account (sign-in mode). */
  signInWithEmail(email: string, next: string, opts?: { create?: boolean }): Promise<void>;
  signInWithOAuth(provider: OAuthProvider, next: string): Promise<void>;
  signInWithSSO(domain: string, next: string): Promise<void>;
  signOut(): Promise<void>;
}

export const NOT_CONFIGURED = "Sign-in is not configured in this environment.";

const URL_ = SUPABASE_URL;
const KEY = SUPABASE_PUBLISHABLE_KEY;

export { AUTH_CONFIGURED };

/** Only same-site relative paths are accepted as a post-login destination (prevents open redirects). */
export function safeNext(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value || typeof value !== "string" || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

function callbackUrl(next: string) {
  const u = new URL("/auth/callback", window.location.origin);
  u.searchParams.set("next", safeNext(next));
  return u.toString();
}

function toUser(u: { id: string; email?: string | null; app_metadata?: Record<string, unknown>; created_at?: string; last_sign_in_at?: string | null }): AuthUser {
  return {
    id: u.id,
    email: u.email ?? null,
    role: u.app_metadata?.role === "admin" ? "admin" : "user",
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

class SupabaseAuth implements AuthAdapter {
  readonly name = "supabase";
  private clientP: Promise<SupabaseClient> | null = null;
  private client() {
    // Loaded lazily so pages that never touch auth do not ship the SDK.
    this.clientP ??= import("./supabase/client").then(({ createClient }) => createClient() as unknown as SupabaseClient);
    return this.clientP;
  }
  async getSession() {
    const c = await this.client();
    const { data, error } = await c.auth.getSession();
    if (error || !data.session) return null;
    return { user: toUser(data.session.user), accessToken: data.session.access_token };
  }
  onChange(cb: (s: AuthSession | null) => void) {
    let unsub = () => {};
    let alive = true;
    void this.client().then((c) => {
      if (!alive) return;
      const { data } = c.auth.onAuthStateChange((_e, s) => cb(s ? { user: toUser(s.user), accessToken: s.access_token } : null));
      unsub = () => data.subscription.unsubscribe();
    });
    return () => {
      alive = false;
      unsub();
    };
  }
  async enabledProviders() {
    // Supabase publishes which providers are switched on at GET /auth/v1/settings (public, needs only the publishable key).
    const res = await fetch(`${URL_.replace(/\/$/, "")}/auth/v1/settings`, { headers: { apikey: KEY } });
    if (!res.ok) throw new Error("Could not read the sign-in providers.");
    const s = (await res.json()) as { external?: Record<string, boolean>; saml_enabled?: boolean; disable_signup?: boolean };
    const ext = s.external || {};
    const oauth = (["google", "github", "apple", "azure"] as OAuthProvider[]).filter((p) => ext[p] === true);
    return { oauth, sso: s.saml_enabled === true, email: ext.email !== false };
  }
  async signInWithEmail(email: string, next: string, opts?: { create?: boolean }) {
    const c = await this.client();
    const { error } = await c.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl(next), shouldCreateUser: opts?.create ?? true } });
    if (error) throw new Error(error.message);
  }
  async signInWithOAuth(provider: OAuthProvider, next: string) {
    const c = await this.client();
    // Google: same Supabase authorize request the Vector 2.0 server builds (services/api/src/identity/
    // supabase-google-pkce.mjs, validated in apps/web/components/auth/SignIn.jsx): provider=google, redirect_to=
    // <origin>/auth/callback, PKCE code_challenge_method=s256, optional prompt=select_account, no extra scopes.
    const { error } = await c.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callbackUrl(next), ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}) },
    });
    if (error) throw new Error(error.message);
  }
  async signInWithSSO(domain: string, next: string) {
    const c = await this.client();
    const { data, error } = await c.auth.signInWithSSO({ domain, options: { redirectTo: callbackUrl(next) } });
    if (error) throw new Error(error.message);
    if (data?.url) window.location.assign(data.url);
  }
  async signOut() {
    const c = await this.client();
    await c.auth.signOut();
  }
}

/** Thrown by getSession() when the identity backend does not exist in this environment. */
export class AuthUnavailable extends Error {}

/**
 * Vector 2.0 session API adapter (NEXT_PUBLIC_VECTOR_AUTH_MODE=vector-api). The login page talks to the email-code
 * and Google endpoints directly (components/auth/VectorApiLogin.tsx); this adapter covers session reads and logout.
 * `/current` returns {session_id, user_id, expires_at, mfa}; it carries no email, so `email` stays null.
 */
class VectorApiAuth implements AuthAdapter {
  readonly name = "vector-api";
  async getSession() {
    const r = await call("current", { method: "GET" });
    if (r.ok) {
      const id = str(r.data.user_id);
      if (!id) return null;
      return { user: { id, email: str(r.data.email), role: r.data.role === "admin" ? ("admin" as const) : ("user" as const), createdAt: null, lastSignInAt: null }, accessToken: "" };
    }
    if (r.status === 401 || r.status === 403) return null;
    throw new AuthUnavailable();
  }
  onChange() {
    return () => {};
  }
  async enabledProviders() {
    return { oauth: ["google" as OAuthProvider], sso: false, email: true };
  }
  async signInWithEmail(): Promise<void> {
    throw new Error("Use the email-code flow on /login.");
  }
  async signInWithOAuth(): Promise<void> {
    throw new Error("Use Google on /login.");
  }
  async signInWithSSO(): Promise<void> {
    throw new Error("Single sign-on is not offered.");
  }
  async signOut() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
  }
}

let instance: AuthAdapter | null = null;
/** The configured adapter, or null when this environment has no identity provider. */
export function getAuth(): AuthAdapter | null {
  if (!AUTH_CONFIGURED) return null;
  instance ??= AUTH_MODE === "vector-api" ? new VectorApiAuth() : SUPABASE_CONFIGURED ? new SupabaseAuth() : null;
  return instance;
}

export type SessionState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "signed-in"; session: AuthSession }
  | { status: "error"; message: string };

/** React hook: current session through the adapter. */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>(() => (AUTH_CONFIGURED ? { status: "loading" } : { status: "unconfigured" }));
  useEffect(() => {
    const auth = getAuth();
    if (!auth) return;
    let alive = true;
    auth
      .getSession()
      .then((s) => alive && setState(s ? { status: "signed-in", session: s } : { status: "signed-out" }))
      .catch((e) => alive && setState(e instanceof AuthUnavailable ? { status: "unconfigured" } : { status: "error", message: "Your session could not be checked. Try again." }));
    const off = auth.onChange((s) => alive && setState(s ? { status: "signed-in", session: s } : { status: "signed-out" }));
    return () => {
      alive = false;
      off();
    };
  }, []);
  return state;
}
