"use client";

import { useEffect, useRef, useState } from "react";
import Shell, { EmptyTable, Heading, Notice, type Section } from "./Shell";

const SECTIONS: Section[] = [
  { id: "users", label: "Users", icon: "M6 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM1.5 13c.4-2 2.2-3.2 4.5-3.2s4.1 1.2 4.5 3.2M11 3.2a2.2 2.2 0 0 1 0 4.2M12.5 9.9c1 .5 1.8 1.6 2 3.1" },
  { id: "subscriptions", label: "Subscriptions", icon: "M2 4.5h12v7H2zM2 7h12" },
  { id: "usage", label: "Usage", icon: "M2.5 13.5h11M4 11V7M8 11V3.5M12 11V6" },
  { id: "audit", label: "Audit log", icon: "M4 2.5h6l2.5 2.5v8.5H4zM6 7h4M6 9.5h4" },
];

type Action = { id: "revoke" | "reset"; title: string; body: string; confirm: string };
const ACTIONS: Action[] = [
  { id: "revoke", title: "Revoke access", body: "Signs the user out everywhere and blocks new sign-ins until access is restored.", confirm: "Revoke access" },
  { id: "reset", title: "Reset usage limits", body: "Restores the user's monthly AI edit allowance for the current period.", confirm: "Reset limits" },
];

export default function AdminDashboard() {
  return <Shell base="/admin" title="Admin" sections={SECTIONS} requireAdmin render={(tab) => <Panel tab={tab} />} />;
}

function Panel({ tab }: { tab: string }) {
  const [action, setAction] = useState<Action | null>(null);
  switch (tab) {
    case "users":
      return (
        <>
          <Heading title="Users" sub="Find an account, then revoke access or reset its limits. Every action is written to the audit log." />
          <div className="mb-4 flex flex-col gap-2 lg:flex-row">
            <label htmlFor="user-q" className="sr-only">Search users by email</label>
            <input id="user-q" className="field min-w-0 rounded-lg! lg:flex-1" placeholder="Search by email" disabled />
            <div className="flex flex-wrap gap-2">
              {ACTIONS.map((a) => (
                <button key={a.id} type="button" className="btn-ghost shrink-0 rounded-lg!" onClick={() => setAction(a)}>{a.title}…</button>
              ))}
            </div>
          </div>
          <EmptyTable columns={["Email", "Plan", "Status", "Created", "Last sign-in", ""]} message="The admin API is not connected in this environment. No user records are shown." />
          {action && <ConfirmDialog action={action} onClose={() => setAction(null)} />}
        </>
      );
    case "subscriptions":
      return (
        <>
          <Heading title="Subscriptions" sub="Stripe subscriptions reconciled from signed webhooks." />
          <EmptyTable columns={["Customer", "Plan", "Period", "Status", "Renews", "Stripe"]} message="Subscription records are not connected in this environment." />
        </>
      );
    case "usage":
      return (
        <>
          <Heading title="Usage" sub="AI edits by account and period." />
          <EmptyTable columns={["Account", "Plan", "Used", "Allowance", "Period"]} message="Usage records are not connected in this environment." />
        </>
      );
    case "audit":
      return (
        <>
          <Heading title="Audit log" sub="Every administrative action, who took it and when." />
          <EmptyTable columns={["Time", "Admin", "Action", "Target", "Result"]} message="The audit log is not connected in this environment." />
        </>
      );
  }
  return null;
}

/** Destructive-action confirmation: the target email must be typed exactly before the action can be sent. */
function ConfirmDialog({ action, onClose }: { action: Action; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [email, setEmail] = useState("");
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<string | null>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) && typed.trim() === email.trim();
  return (
    <dialog ref={ref} onClose={onClose} className="m-auto w-[min(440px,calc(100vw-2rem))] rounded-2xl border border-line bg-card p-0 text-fg backdrop:bg-black/70">
      <form
        method="dialog"
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          // No admin API exists in this website; never pretend the action happened.
          setResult("The admin API is not connected in this environment. Nothing was changed.");
        }}
      >
        <h2 className="text-lg font-semibold">{action.title}</h2>
        <p className="mt-1 text-sm text-muted">{action.body}</p>
        <label htmlFor="c-email" className="mt-5 block text-xs text-muted">User email</label>
        <input id="c-email" type="email" className="field mt-1.5 rounded-lg!" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" />
        <label htmlFor="c-typed" className="mt-3 block text-xs text-muted">Type the email again to confirm</label>
        <input id="c-typed" type="email" className="field mt-1.5 rounded-lg!" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" aria-invalid={typed.length > 0 && !valid ? true : undefined} />
        {result && <div className="mt-4"><Notice>{result}</Notice></div>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="btn-ghost rounded-lg!" onClick={() => ref.current?.close()}>Cancel</button>
          <button type="submit" disabled={!valid} className="inline-flex items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40">{action.confirm}</button>
        </div>
      </form>
    </dialog>
  );
}
