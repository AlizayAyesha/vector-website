"use client";

/**
 * Client for Vector 2.0's same-origin session API (contract from the Vector Auth branch auth/shared-login-fix,
 * commit cf0a0319). JSON + cookies; every mutating call carries the CSRF token from /context in `x-vector-csrf`.
 * Nothing here simulates a backend: if the endpoints are missing, callers get `kind: "unconfigured"`.
 */
const API = "/api/vector/v1/session/";

export type ApiError = { code: string; message: string; recovery?: string; retryable?: boolean };
export type ApiResult<T = Record<string, unknown>> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; kind: "error"; error: ApiError; data: Record<string, unknown> }
  | { ok: false; status: number; kind: "unconfigured" | "network" };

const FALLBACK: Record<string, string> = {
  unavailable: "Sign-in is temporarily unavailable.",
  rate_limited: "Please wait before trying again.",
};

function flat(body: Record<string, unknown>): Record<string, unknown> {
  // Accept both `{...fields}` and `{request_id, contract_version, data:{...fields}}` envelopes.
  const d = body.data;
  return d && typeof d === "object" && !Array.isArray(d) ? { ...body, ...(d as Record<string, unknown>) } : body;
}

export async function call<T = Record<string, unknown>>(action: string, init: { method?: "GET" | "POST"; body?: unknown; csrf?: string | null } = {}, path = API + action): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method || "POST",
      credentials: "same-origin",
      cache: "no-store",
      redirect: "manual",
      headers: { accept: "application/json", ...(init.method === "GET" ? {} : { "content-type": "application/json" }), ...(init.csrf ? { "x-vector-csrf": init.csrf } : {}) },
      body: init.method === "GET" ? undefined : JSON.stringify(init.body ?? {}),
    });
  } catch {
    return { ok: false, status: 0, kind: "network" };
  }
  const type = res.headers.get("content-type") || "";
  if (!type.includes("application/json")) return { ok: false, status: res.status, kind: "unconfigured" };
  let body: Record<string, unknown>;
  try {
    body = flat((await res.json()) as Record<string, unknown>);
  } catch {
    return { ok: false, status: res.status, kind: "unconfigured" };
  }
  const err = body.error as Partial<ApiError> | string | undefined;
  if (res.ok && !err) return { ok: true, status: res.status, data: body as T };
  const code = typeof err === "object" && err?.code ? String(err.code) : typeof body.state === "string" ? body.state : typeof err === "string" ? err : "unavailable";
  return {
    ok: false,
    status: res.status,
    kind: "error",
    data: body,
    error: {
      code,
      message: (typeof err === "object" && err?.message) || FALLBACK[code] || "Something went wrong. Try again.",
      recovery: typeof err === "object" && typeof err?.recovery === "string" ? err.recovery : undefined,
      retryable: typeof err === "object" ? err?.retryable : undefined,
    },
  };
}

export const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.round(v) : null);
export const str = (v: unknown) => (typeof v === "string" && v ? v : null);

/**
 * Same rule as the Vector 2.0 session API: a same-origin path of at most 120 characters, no `%`, `#` or `//`.
 * Only `/pricing` and `/upgrade` may carry a plain query (letters, digits, `_`, `-`, `=`, `&`).
 */
export function safeReturnTo(value: string | null | undefined, fallback = "/dashboard"): string {
  if (typeof value !== "string" || !value || value.length > 120) return fallback;
  if (!value.startsWith("/") || value.includes("//") || value.includes("%") || value.includes("#") || value.includes("\\")) return fallback;
  const [path, query, extra] = value.split("?");
  if (extra !== undefined || !/^\/[A-Za-z0-9/_-]*$/.test(path)) return fallback;
  if (query !== undefined && (!["/pricing", "/upgrade"].includes(path) || !/^[A-Za-z0-9_=&-]+$/.test(query))) return fallback;
  return value;
}

/** Friendly copy for /login?error= (codes the Vector 2.0 callback emits). */
export const SIGN_IN_ERRORS: Record<string, string> = {
  access_denied: "Google sign-in was cancelled. Try again when you're ready.",
  provider_error: "Google couldn't complete the sign-in. Try again or use your email.",
  link_expired: "That sign-in link has expired. Start again.",
  session_missing: "Your sign-in session was not found in this browser. Start again here.",
  session_expired: "Your sign-in took too long and expired. Start again.",
  session_mismatch: "This sign-in was started in a different browser or tab. Start again here.",
  exchange_failed: "We couldn't finish signing you in. Try again.",
  callback_invalid: "The sign-in response was not valid. Start again.",
  callback_failed: "We couldn't finish signing you in. Try again.",
  callback: "That sign-in link could not be verified. Request a new one and open it in this browser.",
  unavailable: "Sign-in is temporarily unavailable. Try again in a moment.",
  invalid_code: "That code isn't right. Request a new one and try again.",
  code_expired: "That code has expired. Request a new one.",
  rate_limited: "Too many attempts. Wait a minute, then try again.",
  too_many_attempts: "Too many incorrect codes. Request a new code to continue.",
};
