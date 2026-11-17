import "server-only";
import { AUTH_MODE, SUPABASE_CONFIGURED } from "./auth-config";
import { createClient } from "./supabase/server";

export interface VerifiedUser {
  id: string;
  email: string | null;
  role: "admin" | "user";
}

/**
 * The signed-in user for this request, verified by the identity backend (never trusted from the browser):
 * - vector-api: asks the host app's own GET /api/vector/v1/session/current with the request cookies.
 * - supabase: `auth.getUser()` (asks the Supabase Auth server, does not trust cookie contents locally).
 * Returns null when signed out, expired or not configured.
 */
export async function currentUser(req?: Request): Promise<VerifiedUser | null> {
  if (AUTH_MODE === "vector-api") {
    if (!req) return null;
    try {
      const res = await fetch(new URL("/api/vector/v1/session/current", req.url), {
        headers: { cookie: req.headers.get("cookie") || "", accept: "application/json" },
        cache: "no-store",
        redirect: "manual",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as { data?: Record<string, unknown> } & Record<string, unknown>;
      const d = (body.data ?? body) as Record<string, unknown>;
      if (typeof d.user_id !== "string" || !d.user_id) return null;
      // /current carries no email; the Vector 2.0 billing BFF resolves the customer from user_id server-side.
      return { id: d.user_id, email: typeof d.email === "string" ? d.email : null, role: d.role === "admin" ? "admin" : "user" };
    } catch {
      return null;
    }
  }
  if (!SUPABASE_CONFIGURED) return null;
  try {
    const sb = await createClient();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null, role: data.user.app_metadata?.role === "admin" ? "admin" : "user" };
  } catch {
    return null;
  }
}
