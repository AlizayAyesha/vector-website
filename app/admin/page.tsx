import type { Metadata } from "next";
import { Suspense } from "react";
import AdminDashboard from "@/components/dashboard/AdminDashboard";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

export default function Page() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-bg" aria-busy="true" />}>
      <AdminDashboard />
    </Suspense>
  );
}
