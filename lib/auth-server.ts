import "server-only";
import { AUTH_CONFIGURED } from "./auth-config";
import { createClient } from "./supabase/server";

export interface VerifiedUser {
  id: string;
  email: string | null;
  role: "admin" | "user";
}

/**
 * The signed-in user for this request, verified with Supabase (`auth.getUser()` asks the Auth server; it does not
 * trust cookie contents locally). Returns null when signed out, expired or not configured.
 */
export async function currentUser(): Promise<VerifiedUser | null> {
  if (!AUTH_CONFIGURED) return null;
  try {
    const sb = await createClient();
    const { data, error } = await sb.auth.getUser();
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? null, role: data.user.app_metadata?.role === "admin" ? "admin" : "user" };
  } catch {
    return null;
  }
}
