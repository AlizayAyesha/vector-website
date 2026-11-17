import type { Metadata } from "next";
import { Suspense } from "react";
import UserDashboard from "@/components/dashboard/UserDashboard";

export const metadata: Metadata = { title: "Dashboard", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy="true" />}>
      <UserDashboard />
    </Suspense>
  );
}
