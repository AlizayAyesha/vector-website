import type { Metadata } from "next";
import { Suspense } from "react";
import PageShell from "@/components/PageShell";
import UpgradeView from "@/components/checkout/UpgradeView";

export const metadata: Metadata = { title: "Upgrade", robots: { index: false, follow: false } };

export default function UpgradePage() {
  return (
    <PageShell>
      <Suspense fallback={<div className="h-96" aria-busy="true" />}>
        <UpgradeView />
      </Suspense>
    </PageShell>
  );
}
