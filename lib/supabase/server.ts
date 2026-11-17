import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AUTH_CONFIGURED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../auth-config";

/** Server client bound to the request cookies. Mirrors Vector 2.0 apps/web/lib/supabase/server.ts. Create one per request. */
export async function createClient() {
  if (!AUTH_CONFIGURED) throw new Error("Authentication unavailable");
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component; the session is refreshed on the next route-handler request.
        }
      },
    },
  });
}
