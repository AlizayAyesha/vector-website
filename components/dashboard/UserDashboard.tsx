"use client";

import Link from "next/link";
import software from "@/content/software.json";
import type { SessionState } from "@/lib/auth";
import { CHECKOUT_UI_ENABLED, PAID_PLANS, upgradePath, usd } from "@/lib/billing";
import Shell, { Empty, EmptyTable, Group, Heading, Row, StatusPill, type Section } from "./Shell";

const SECTIONS: Section[] = [
  { id: "account", label: "Account", icon: "M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM2.5 14c.6-2.6 2.8-4 5.5-4s4.9 1.4 5.5 4" },
  { id: "usage", label: "Usage", icon: "M2.5 13.5h11M4 11V7M8 11V3.5M12 11V6" },
  { id: "billing", label: "Billing & invoices", icon: "M2 4.5h12v7H2zM2 7h12M4.5 9.5h2" },
  { id: "upgrade", label: "Upgrade plan", icon: "M8 13V3M4 7l4-4 4 4" },
  { id: "connectors", label: "Connectors", icon: "M6 3v3M10 3v3M4.5 6h7v2.5a3.5 3.5 0 0 1-7 0zM8 12v2" },
  { id: "teams", label: "Teams", icon: "M6 7.5a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5ZM1.5 13c.4-2 2.2-3.2 4.5-3.2s4.1 1.2 4.5 3.2M11 3.2a2.2 2.2 0 0 1 0 4.2M12.5 9.9c1 .5 1.8 1.6 2 3.1" },
];

const fmt = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—");
type Sw = { name: string; slug: string; company: string; status: string; logo: string };
const AVAILABLE = ((software as { entries: Sw[] }).entries || []).filter((e) => e.status === "Available");

export default function UserDashboard() {
  return <Shell base="/dashboard" title="Dashboard" sections={SECTIONS} render={(tab, s) => <Panel tab={tab} s={s} />} />;
}

function Panel({ tab, s }: { tab: string; s: SessionState }) {
  const user = s.status === "signed-in" ? s.session.user : null;
  switch (tab) {
    case "account":
      return (
        <>
          <Heading title="Account" sub="Your Vector sign-in identity." />
          <Group title="Profile">
            <Row label="Email">{user?.email ?? "Not signed in"}</Row>
            <Row label="Account created">{fmt(user?.createdAt)}</Row>
            <Row label="Last sign-in">{fmt(user?.lastSignInAt)}</Row>
          </Group>
          <Group title="Desktop app">
            <Row label="Vector OS for Windows" hint="Sign in inside the desktop app with the same account.">
              <Link href="/download" className="btn-ghost rounded-lg! px-3! py-1.5! text-xs!">Download</Link>
            </Row>
          </Group>
        </>
      );
    case "usage":
      return (
        <>
          <Heading title="Usage" sub="Monthly AI edits used and remaining for your plan." />
          <Empty title="Usage records not connected" body="Usage is read from the Vector account service. It is not connected in this environment, so no numbers are shown." />
        </>
      );
    case "billing":
      return (
        <>
          <Heading title="Billing & invoices" sub="Your subscription, payment method and invoices." />
          <Group title="Subscription">
            <Row label="Current plan" hint="Read from Vector's billing records, not from this browser.">
              <StatusPill>Not connected</StatusPill>
            </Row>
            <Row label="Manage subscription" hint="Change plan, payment method or cancel in Stripe's customer portal.">
              <button type="button" disabled className="btn-ghost rounded-lg! px-3! py-1.5! text-xs! opacity-50">Billing portal not connected</button>
            </Row>
          </Group>
          <h2 className="mb-2.5 text-sm font-medium text-fg-2">Invoices</h2>
          <EmptyTable columns={["Date", "Description", "Amount", "Status", "Invoice"]} message="Invoices are not connected in this environment." />
        </>
      );
    case "upgrade":
      return (
        <>
          <Heading title="Upgrade plan" sub="Prices from Vector's published plan catalogue (USD before tax)." />
          <Group>
            {PAID_PLANS.map((p) => (
              <Row key={p.id} label={p.name} hint={p.edits}>
                <span className="flex items-center justify-end gap-3">
                  <span className="tabular-nums">{usd(p.amountCents.monthly!)} / month</span>
                  {CHECKOUT_UI_ENABLED ? (
                    <Link href={upgradePath(p.id)} className="btn-ghost rounded-lg! px-3! py-1.5! text-xs!">Choose</Link>
                  ) : p.paymentLink ? (
                    <a href={p.paymentLink} rel="noopener" className="btn-ghost rounded-lg! px-3! py-1.5! text-xs!">Choose</a>
                  ) : null}
                </span>
              </Row>
            ))}
          </Group>
          <p className="text-xs text-muted">
            Teams and organizations: <Link href="/pricing" className="text-fg underline decoration-line underline-offset-4">On-Premises Deployment</Link> is arranged with sales.
          </p>
        </>
      );
    case "connectors":
      return (
        <>
          <Heading title="Connectors" sub="Engineering software linked to your Vector account." />
          <Group title="Available connectors" action={<Link href="/software" className="text-xs text-muted hover:text-fg">Browse all software</Link>}>
            {AVAILABLE.map((e) => (
              <Row key={e.slug} label={e.name} hint={e.company}>
                <StatusPill>Not connected</StatusPill>
              </Row>
            ))}
          </Group>
          <p className="text-xs text-muted">Connectors are linked from the Vector desktop app. Link status from your account is not connected in this environment.</p>
        </>
      );
    case "teams":
      return (
        <>
          <Heading title="Teams" />
          <Empty title="Coming soon" body="Shared team workspaces, seats and roles are planned. For organizations today, contact sales about On-Premises Deployment.">
            <Link href="/pricing" className="btn-ghost rounded-lg!">See pricing</Link>
          </Empty>
        </>
      );
  }
  return null;
}
