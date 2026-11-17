import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_CONFIGURED, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "../auth-config";

/** Browser client (cookie session, PKCE). Mirrors Vector 2.0 apps/web/lib/supabase/client.ts. */
export function createClient() {
  if (!SUPABASE_CONFIGURED) throw new Error("Authentication unavailable");
  return createBrowserClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
}
