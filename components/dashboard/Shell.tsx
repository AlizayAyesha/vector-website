"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { Logo } from "@/components/Logo";
import ThemeToggle from "@/components/ThemeToggle";
import { getAuth, NOT_CONFIGURED, useSession, type SessionState } from "@/lib/auth";

export type Section = { id: string; label: string; icon: string };

/**
 * Settings-style account shell (left navigation, content grouped into bordered rows), shared by /dashboard and
 * /admin. Gated by the AuthAdapter: signed-out users go to /login; when sign-in is not configured it renders the
 * shell with an honest notice and every data panel in its "not connected" state.
 */
export default function Shell({
  base,
  title,
  sections,
  requireAdmin = false,
  render,
}: {
  base: "/dashboard" | "/admin";
  title: string;
  sections: Section[];
  requireAdmin?: boolean;
  render: (tab: string, session: SessionState) => React.ReactNode;
}) {
  const params = useSearchParams();
  const router = useRouter();
  const session = useSession();
  const tab = sections.some((s) => s.id === params.get("tab")) ? params.get("tab")! : sections[0].id;

  useEffect(() => {
    if (session.status === "signed-out") router.replace(`/login?next=${encodeURIComponent(`${base}${tab !== sections[0].id ? `?tab=${tab}` : ""}`)}`);
  }, [session.status, router, base, tab, sections]);

  const email = session.status === "signed-in" ? session.session.user.email : null;
  const denied = requireAdmin && session.status === "signed-in" && session.session.user.role !== "admin";

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold" aria-label="Vector OS home">
            <Logo className="size-5" /> Vector
          </Link>
          <span className="text-line-strong" aria-hidden="true">/</span>
          <span className="text-sm text-fg-2">{title}</span>
          <div className="ml-auto flex items-center gap-2">
            {email && <span className="hidden max-w-[220px] truncate text-xs text-muted sm:block">{email}</span>}
            <ThemeToggle />
            {session.status === "signed-in" && (
              <button type="button" className="btn-ghost rounded-lg! px-3! py-1.5! text-xs!" onClick={() => getAuth()?.signOut().then(() => window.location.assign("/login"))}>
                Sign out
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[200px_1fr] md:gap-10 md:px-6 md:py-10">
        <nav aria-label={`${title} sections`} className="-mx-4 overflow-x-auto px-4 md:mx-0 md:overflow-visible md:px-0">
          <ul className="flex gap-1 md:flex-col">
            {sections.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.id === sections[0].id ? base : `${base}?tab=${s.id}`}
                  aria-current={tab === s.id ? "page" : undefined}
                  className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors ${tab === s.id ? "bg-card-2 text-fg" : "text-muted hover:bg-card hover:text-fg"}`}
                >
                  <svg viewBox="0 0 16 16" className="size-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.icon} /></svg>
                  {s.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <main id="main" className="min-w-0">
          {session.status === "unconfigured" && <Notice tone="info">{NOT_CONFIGURED} Account data is shown as not connected.</Notice>}
          {session.status === "error" && <Notice tone="error">{session.message}</Notice>}
          {session.status === "loading" || session.status === "signed-out" ? (
            <div aria-busy="true" className="space-y-3">
              <div className="h-7 w-40 animate-pulse rounded bg-card-2" />
              <div className="h-40 animate-pulse rounded-xl bg-card" />
            </div>
          ) : denied ? (
            <Empty title="No admin access" body="This area is for Vector staff. Your account does not have the administrator role." />
          ) : (
            render(tab, session)
          )}
        </main>
      </div>
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "error"; children: React.ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tone === "error" ? "border-red-500/40 bg-red-500/10" : "border-line bg-card text-fg-2"}`}>
      {children}
    </p>
  );
}

export function Heading({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
    </div>
  );
}

/** Bordered group of rows (label + value/action), as in a settings page. */
export function Group({ title, children, action }: { title?: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section className="mb-8">
      {(title || action) && (
        <div className="mb-2.5 flex items-center justify-between gap-3">
          {title && <h2 className="text-sm font-medium text-fg-2">{title}</h2>}
          {action}
        </div>
      )}
      <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">{children}</div>
    </section>
  );
}

export function Row({ label, hint, children }: { label: string; hint?: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <p className="text-sm text-fg">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
      </div>
      <div className="min-w-0 text-sm text-fg-2 sm:text-right">{children}</div>
    </div>
  );
}

export function Empty({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
      <p className="text-sm font-medium text-fg">{title}</p>
      <p className="mx-auto mt-1.5 max-w-md text-sm text-muted">{body}</p>
      {children && <div className="mt-5 flex justify-center gap-2">{children}</div>}
    </div>
  );
}

export function StatusPill({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "ok" }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] ${tone === "ok" ? "border-line-strong text-fg" : "border-dashed border-line text-muted"}`}>{children}</span>;
}

/** Empty data table with real column headings and an explicit "not connected" body. */
export function EmptyTable({ columns, message }: { columns: string[]; message: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-card">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="border-b border-line text-xs text-muted">
          <tr>{columns.map((c) => <th key={c} scope="col" className="px-4 py-2.5 font-medium">{c}</th>)}</tr>
        </thead>
        <tbody>
          <tr><td colSpan={columns.length} className="px-4 py-10 text-center text-muted">{message}</td></tr>
        </tbody>
      </table>
    </div>
  );
}
