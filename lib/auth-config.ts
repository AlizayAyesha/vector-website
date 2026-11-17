/**
 * Server- and client-safe check: is an identity provider configured for this build?
 * Same variable names as the Vector 2.0 web app (apps/web/lib/supabase/client.ts):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (sb_publishable_…).
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const AUTH_CONFIGURED = Boolean(/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(SUPABASE_URL) && SUPABASE_PUBLISHABLE_KEY);
