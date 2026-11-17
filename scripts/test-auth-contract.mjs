#!/usr/bin/env node
/**
 * DEV-ONLY contract test for the vector-api login (components/auth/VectorApiLogin.tsx).
 *
 * The mock Vector session API below lives ONLY in this file. It is never imported by the app and never shipped.
 * It sits in front of a real Next server built with NEXT_PUBLIC_VECTOR_AUTH_MODE=vector-api, serving
 * /api/vector/v1/session/* and /api/auth/logout itself and proxying everything else, so the browser sees one origin.
 *
 *   NEXT_PUBLIC_VECTOR_AUTH_MODE=vector-api pnpm build && npx next start -p 3202
 *   TARGET=http://127.0.0.1:3202 node scripts/test-auth-contract.mjs
 *
 * Env: TARGET (Next server), PORT (mock proxy, default 3299), PLAYWRIGHT (path to playwright's index.mjs),
 *      SHOTS (screenshot dir; empty to skip), CHROME (optional browser executable).
 */
import http from "node:http";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";

const TARGET = new URL(process.env.TARGET || "http://127.0.0.1:3202");
const PORT = Number(process.env.PORT || 3299);
const BASE = `http://127.0.0.1:${PORT}`;
const PW = process.env.PLAYWRIGHT || "/home/box/.local/lib/python3.13/site-packages/playwright/driver/package/index.mjs";
const SHOTS = process.env.SHOTS ?? "/workspace/vector-3d-site-screens/phase3";
const GOOGLE = "https://accounts.google.com/o/oauth2/v2/auth?client_id=mock&redirect_uri=https%3A%2F%2Fmock.supabase.co%2Fauth%2Fv1%2Fcallback&response_type=code&code_challenge=mock&code_challenge_method=S256&prompt=select_account";

// ---------------------------------------------------------------- mock API (test only)
const sessions = new Map(); // sid -> state
const mode = { configured: true };
const tok = () => randomBytes(12).toString("hex");
const err = (code, message, recovery, extra = {}) => ({ request_id: tok(), state: code, error: { code, message, retryable: true, recovery }, ...extra });

function mock(req, res, body) {
  const url = new URL(req.url, BASE);
  const send = (status, json, headers = {}) => {
    res.writeHead(status, { "content-type": "application/json", "cache-control": "no-store", ...headers });
    res.end(JSON.stringify(json));
  };
  if (!mode.configured) {
    res.writeHead(404, { "content-type": "text/html" });
    return res.end("<!doctype html><title>404</title>");
  }
  if (url.pathname === "/api/auth/logout") return send(200, { request_id: tok(), state: "signed_out" }, { "set-cookie": "mock_sid=; Path=/; Max-Age=0" });
  const action = url.pathname.replace("/api/vector/v1/session/", "");
  const sid = /mock_sid=([a-f0-9]+)/.exec(req.headers.cookie || "")?.[1];
  let s = sid && sessions.get(sid);

  if (action === "context" && req.method === "POST") {
    const id = sid && s ? sid : tok();
    s = s || { csrf: tok(), returnPath: "/dashboard", email: null, nameGiven: false, attempts: 5 };
    s.csrf = tok();
    s.returnPath = typeof body.return_path === "string" ? body.return_path : "/dashboard";
    sessions.set(id, s);
    return send(200, { request_id: tok(), state: "ready", csrf: s.csrf }, { "set-cookie": `mock_sid=${id}; Path=/; HttpOnly; SameSite=Lax` });
  }
  if (!s) return send(401, err("session_missing", "Your sign-in session is missing.", "Reload the page and try again."));
  if (action === "context" && req.method === "GET")
    return send(200, { request_id: tok(), channel: s.email ? "email" : null, email_started: s.email, resend_in_seconds: s.email ? Math.max(0, Math.ceil((s.resendAt - Date.now()) / 1000)) : 0, return_path: s.returnPath });
  if (action === "current") return s.user ? send(200, { request_id: tok(), contract_version: "1", data: { session_id: "mock", user_id: s.user, expires_at: new Date(Date.now() + 3600e3).toISOString(), mfa: false } }) : send(401, err("UNAUTHENTICATED", "Not signed in."));
  if (req.headers["x-vector-csrf"] !== s.csrf) return send(403, err("csrf_invalid", "Your session expired.", "Reload the page and try again."));

  if (action === "login-begin") {
    const email = String(body.email || "");
    if (body.method !== "email_otp") return send(400, err("invalid_request", "Unsupported method."));
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return send(400, err("invalid_email", "Enter a valid email address.", "Check the address and try again."));
    if (email.startsWith("limited")) return send(429, err("rate_limited", "Too many codes requested.", "Wait a moment, then try again.", { retry_after_seconds: 5 }));
    s.email = email;
    s.nameGiven = s.nameGiven || Boolean(body.name);
    s.attempts = 5;
    s.resendAt = Date.now() + 3000;
    s.csrf = tok();
    return send(200, { state: "code_sent", csrf: s.csrf, attempt_id: tok(), expires_at: new Date(Date.now() + 600e3).toISOString(), resend_after: new Date(s.resendAt).toISOString(), resend_in_seconds: 3, return_path: s.returnPath });
  }
  if (action === "verify-email") {
    const code = String(body.code || "");
    if (!/^\d{6}$/.test(code)) return send(400, err("invalid_code", "Enter the 6-digit code.", undefined, { remaining_attempts: s.attempts }));
    if (code === "111111") return send(410, err("code_expired", "This code has expired.", "Send a new code to continue."));
    if (s.email?.startsWith("newuser") && !s.nameGiven) return send(409, err("name_required", "Enter your name to finish creating your account.", undefined));
    if (code !== "123456") {
      s.attempts -= 1;
      if (s.attempts <= 0) return send(429, err("too_many_attempts", "Too many incorrect codes.", "Request a new code.", { retry_after_seconds: 30 }));
      return send(400, err("invalid_code", "That code is incorrect.", "Check the latest email and try again.", { remaining_attempts: s.attempts }));
    }
    s.user = "00000000-0000-4000-8000-000000000001";
    if (s.email?.startsWith("consent")) return send(200, { state: "consent_required", next: "/dashboard/onboarding" });
    return send(200, { state: "completed", return_path: s.returnPath });
  }
  if (action === "resend-email") {
    const left = Math.ceil((s.resendAt - Date.now()) / 1000);
    if (left > 0) return send(429, err("rate_limited", "Please wait before requesting another code.", undefined, { retry_after_seconds: left, resend_after: new Date(s.resendAt).toISOString() }));
    s.resendAt = Date.now() + 3000;
    s.attempts = 5;
    return send(200, { state: "code_sent", resend_in_seconds: 3, resend_after: new Date(s.resendAt).toISOString() });
  }
  if (action === "google-start") return send(200, { state: "redirect", location: GOOGLE });
  return send(404, err("not_found", "Unknown endpoint."));
}

const server = http.createServer((req, res) => {
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const raw = Buffer.concat(chunks);
    if (req.url.startsWith("/api/vector/v1/session/") || req.url.startsWith("/api/auth/logout")) {
      let body = {};
      try {
        body = raw.length ? JSON.parse(raw.toString()) : {};
      } catch {}
      return mock(req, res, body);
    }
    const up = http.request({ host: TARGET.hostname, port: TARGET.port, path: req.url, method: req.method, headers: { ...req.headers, host: TARGET.host } }, (r) => {
      res.writeHead(r.statusCode, r.headers);
      r.pipe(res);
    });
    up.on("error", () => {
      res.writeHead(502);
      res.end("upstream down");
    });
    up.end(raw);
  });
});

// ---------------------------------------------------------------- browser tests
const results = [];
async function test(name, fn) {
  try {
    await fn();
    results.push([name, true]);
    console.log(`  ok   ${name}`);
  } catch (e) {
    results.push([name, false]);
    console.log(`  FAIL ${name}\n       ${String(e?.message || e).split("\n")[0]}`);
  }
}
const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

await new Promise((r) => server.listen(PORT, "127.0.0.1", r));
const { chromium } = await import(PW);
const CHROME = process.env.CHROME ?? (existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : "");
const browser = await chromium.launch(CHROME ? { executablePath: CHROME } : {});
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

async function page(path = "/login", width = 1280) {
  const ctx = await browser.newContext({ viewport: { width, height: 800 }, colorScheme: "dark" });
  const p = await ctx.newPage();
  p.errors = [];
  p.on("pageerror", (e) => p.errors.push(String(e)));
  p.on("console", (m) => m.type() === "error" && !/status of (40[0-9]|41[0-9]|429)/.test(m.text()) && p.errors.push(m.text()));
  await p.goto(BASE + path, { waitUntil: "networkidle" });
  return p;
}
const enterEmail = async (p, email) => {
  await p.fill("#email", email);
  await p.click("button:has-text('Continue with email')");
};
const typeCode = async (p, code) => {
  await p.locator("input[aria-label='Digit 1']").click();
  await p.keyboard.type(code, { delay: 30 });
};
const shot = async (p, name) => SHOTS && p.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false });

console.log(`vector-api contract test via ${BASE} -> ${TARGET.origin}`);

await test("login renders Google + email with csrf fetched in background, no console errors", async () => {
  const p = await page();
  await p.getByRole("button", { name: "Continue with Google" }).waitFor();
  await p.locator("#email").waitFor();
  assert(p.errors.length === 0, `console errors: ${p.errors.join(" | ")}`);
  await shot(p, "login-1280-dark");
  await p.context().close();
});

await test("login at 360px fits without horizontal overflow", async () => {
  const p = await page("/login", 360);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth);
  assert(sw <= 360, `scrollWidth ${sw}`);
  await shot(p, "login-360-dark");
  await p.context().close();
});

await test("code_sent: same card switches to 'Check your email' with 6 boxes, otp autocomplete, numeric", async () => {
  const p = await page();
  const url = p.url();
  await enterEmail(p, "person@example.com");
  await p.getByRole("heading", { name: "Check your email" }).waitFor();
  assert(p.url() === url, "page navigated");
  assert((await p.locator("input[aria-label^='Digit']").count()) === 6, "not 6 boxes");
  assert((await p.locator("input[aria-label='Digit 1']").getAttribute("autocomplete")) === "one-time-code", "autocomplete");
  assert((await p.locator("input[aria-label='Digit 1']").getAttribute("inputmode")) === "numeric", "inputmode");
  assert(await p.getByText("person@example.com").isVisible(), "email not shown");
  assert(await p.getByRole("button", { name: "Use a different email" }).isVisible(), "no change-email link");
  assert(/Resend code in \d+s/.test(await p.getByRole("button", { name: /Resend code/ }).innerText()), "no countdown");
  await shot(p, "login-code-step-1280-dark");
  await p.context().close();
});

await test("invalid_code: shows message, recovery and remaining attempts; boxes cleared", async () => {
  const p = await page();
  await enterEmail(p, "person@example.com");
  await typeCode(p, "999999");
  await p.getByText("That code is incorrect.").waitFor();
  await p.getByText("4 attempts remaining").waitFor();
  assert(await p.getByText("Check the latest email and try again.").isVisible(), "recovery not shown");
  assert((await p.locator("input[aria-label='Digit 1']").inputValue()) === "", "boxes not cleared");
  await shot(p, "login-code-error-1280-dark");
  await p.context().close();
});

await test("paste fills all boxes and auto-submits -> completed redirect to return_path", async () => {
  const p = await page("/login?returnTo=/pricing?plan=pro%26period=yearly");
  await enterEmail(p, "person@example.com");
  await p.locator("input[aria-label='Digit 1']").waitFor();
  await p.evaluate(() => {
    const el = document.querySelector("input[aria-label='Digit 1']");
    const dt = new DataTransfer();
    dt.setData("text", "123 456");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
  });
  await p.waitForURL((u) => u.pathname === "/pricing", { timeout: 10000 });
  assert(new URL(p.url()).search === "?plan=pro&period=yearly", `query ${new URL(p.url()).search}`);
  await p.context().close();
});

await test("unsafe returnTo (//evil) falls back to /dashboard on completed", async () => {
  const p = await page("/login?returnTo=//evil.example");
  await enterEmail(p, "person@example.com");
  await typeCode(p, "123456");
  await p.waitForURL((u) => u.pathname === "/dashboard" && u.host === new URL(BASE).host, { timeout: 10000 });
  await p.context().close();
});

await test("code_expired: expired state with one-click resend after countdown", async () => {
  const p = await page();
  await enterEmail(p, "person@example.com");
  await typeCode(p, "111111");
  await p.getByText("This code has expired.").first().waitFor();
  const btn = p.getByRole("button", { name: /Send a new code/ });
  await p.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Send a new code" && !b.disabled), null, { timeout: 8000 });
  await btn.click();
  await p.getByText("A new code is on its way.").waitFor();
  await p.locator("input[aria-label='Digit 1']").waitFor();
  await p.context().close();
});

await test("rate_limited: live countdown from retry_after_seconds", async () => {
  const p = await page();
  await enterEmail(p, "limited@example.com");
  await p.getByText("Too many codes requested.").waitFor();
  const a = await p.locator("form:has(#email) button[type=submit]").innerText();
  await p.waitForTimeout(1600);
  const b = await p.locator("form:has(#email) button[type=submit]").innerText();
  const n = (t) => Number(/(\d+)s/.exec(t)?.[1]);
  assert(/Try again in \d+s/.test(a) && n(b) < n(a), `countdown did not tick: "${a}" -> "${b}"`);
  await p.context().close();
});

await test("resend: countdown, then resend returns code_sent", async () => {
  const p = await page();
  await enterEmail(p, "person@example.com");
  await p.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => b.textContent === "Resend code" && !b.disabled), null, { timeout: 8000 });
  await p.getByRole("button", { name: "Resend code" }).click();
  await p.getByText("A new code is on its way.").waitFor();
  await p.context().close();
});

await test("name_required: shows name field, login-begin again with name, then completes", async () => {
  const p = await page();
  await enterEmail(p, "newuser@example.com");
  await typeCode(p, "123456");
  await p.locator("#name").waitFor();
  await p.fill("#name", "Ada Lovelace");
  await p.getByRole("button", { name: "Continue", exact: true }).click();
  await p.getByRole("heading", { name: "Check your email" }).waitFor();
  await typeCode(p, "123456");
  await p.waitForURL((u) => u.pathname === "/dashboard", { timeout: 10000 });
  await p.context().close();
});

await test("consent_required: goes to /dashboard/onboarding", async () => {
  const p = await page();
  await enterEmail(p, "consent@example.com");
  await typeCode(p, "123456");
  await p.waitForURL((u) => u.pathname === "/dashboard/onboarding", { timeout: 10000 });
  await p.context().close();
});

await test("Google: button shows 'Redirecting…' and the browser goes to the returned location", async () => {
  const p = await page();
  await p.route("https://accounts.google.com/**", (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<title>google stub</title>" }));
  let seen = false;
  p.on("request", (r) => r.url().includes("/session/google-start") && (seen = true));
  const nav = p.waitForURL((u) => u.host === "accounts.google.com", { timeout: 10000 });
  let label = "";
  await p.getByRole("button", { name: "Continue with Google" }).click();
  label = await p.locator("button:has-text('Redirecting')").innerText({ timeout: 2000 }).catch(() => "");
  await nav;
  assert(label.includes("Redirecting…"), "button did not show Redirecting…");
  assert(seen, "google-start not called");
  assert(new URL(p.url()).searchParams.get("code_challenge_method") === "S256", "location not followed exactly");
  await p.context().close();
});

await test("reload on the code step restores 'Check your email' from GET context", async () => {
  const p = await page();
  await enterEmail(p, "person@example.com");
  await p.getByRole("heading", { name: "Check your email" }).waitFor();
  await p.reload({ waitUntil: "networkidle" });
  await p.getByRole("heading", { name: "Check your email" }).waitFor({ timeout: 8000 });
  await p.context().close();
});

await test("/login?error=link_expired shows a friendly message", async () => {
  const p = await page("/login?error=link_expired");
  const t = await p.locator("[role=alert]:has(p)").innerText();
  assert(t.length > 10 && !t.includes("link_expired"), `got "${t}"`);
  await p.context().close();
});

await test("no backend: 'Sign-in is not configured in this environment'", async () => {
  mode.configured = false;
  const p = await page();
  await enterEmail(p, "person@example.com");
  await p.getByText("Sign-in is not configured in this environment").waitFor();
  await p.getByRole("button", { name: "Continue with Google" }).click();
  await p.getByText("Sign-in is not configured in this environment").waitFor();
  mode.configured = true;
  await p.context().close();
});

await browser.close();
server.close();
const failed = results.filter(([, ok]) => !ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
