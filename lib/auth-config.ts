/**
 * Server- and client-safe auth configuration.
 *
 * NEXT_PUBLIC_VECTOR_AUTH_MODE
 *   "vector-api" → Vector 2.0's same-origin session API (/api/vector/v1/session/*, cookies + CSRF). Use this when the
 *                  site runs inside the real apps/web (see docs/PORTING.md). Without that backend the login page says
 *                  "Sign-in is not configured in this environment".
 *   unset        → Supabase mode for this standalone site (NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
 *                  same names as Vector 2.0 apps/web/lib/supabase/client.ts).
 */
export type AuthMode = "vector-api" | "supabase";
export const AUTH_MODE: AuthMode = process.env.NEXT_PUBLIC_VECTOR_AUTH_MODE === "vector-api" ? "vector-api" : "supabase";

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const SUPABASE_CONFIGURED = Boolean(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY);

/** True when this build has an identity backend wired (vector-api assumes the host app serves the session API). */
export const AUTH_CONFIGURED = AUTH_MODE === "vector-api" || SUPABASE_CONFIGURED;
