import { NextResponse, type NextRequest } from "next/server";
import { AUTH_CONFIGURED } from "@/lib/auth-config";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const safe = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") && !v.startsWith("/\\") && v.length <= 512 ? v : "/dashboard");
const HEADERS = { "cache-control": "no-store", "referrer-policy": "no-referrer" };

/** Email-link / OAuth return (PKCE). Same shape as Vector 2.0 apps/web/app/auth/callback/route.js. */
export async function GET(request: NextRequest) {
  const next = safe(request.nextUrl.searchParams.get("next"));
  const fail = () => {
    const to = new URL("/login", request.nextUrl.origin);
    to.searchParams.set("error", "callback");
    if (next !== "/dashboard") to.searchParams.set("next", next);
    return NextResponse.redirect(to, { headers: HEADERS });
  };
  if (!AUTH_CONFIGURED) return fail();
  const code = request.nextUrl.searchParams.get("code");
  if (!code || code.length > 2048) return fail();
  try {
    const sb = await createClient();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (error) return fail();
    return NextResponse.redirect(new URL(next, request.nextUrl.origin), { headers: HEADERS });
  } catch {
    return fail();
  }
}
