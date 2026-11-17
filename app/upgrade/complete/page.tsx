"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import PageShell from "@/components/PageShell";
import { getPaidPlan } from "@/lib/billing";

/**
 * Stripe return page. The query string is NOT proof of payment: access is granted only after the signed webhook
 * (or server-side reconciliation) confirms the subscription, so this page only reports what to expect.
 */
function Complete() {
  const p = useSearchParams();
  const plan = getPaidPlan(p.get("plan"));
  const s = p.get("redirect_status");
  const failed = s === "failed";
  return (
    <div className="mx-auto max-w-lg text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{failed ? "Payment not completed" : "Payment submitted"}</h1>
      <p className="mt-3 text-muted">
        {failed
          ? "Stripe could not complete the payment. Nothing was activated. You can try again with another method."
          : `We're confirming your ${plan ? plan.name + " " : ""}subscription with Stripe. Your plan is activated as soon as Stripe confirms the payment; this can take a moment.`}
      </p>
      <div className="mt-8 flex justify-center gap-3">
        {failed && plan ? <Link href={`/upgrade?plan=${plan.id}`} className="btn-primary">Try again</Link> : <Link href="/dashboard?tab=billing" className="btn-primary">Go to billing</Link>}
        <Link href="/pricing" className="btn-ghost">Pricing</Link>
      </div>
    </div>
  );
}

export default function CompletePage() {
  return (
    <PageShell>
      <Suspense fallback={null}>
        <Complete />
      </Suspense>
    </PageShell>
  );
}
