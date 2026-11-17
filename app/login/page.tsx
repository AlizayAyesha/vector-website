import type { Metadata } from "next";
import { Suspense } from "react";
import AuthFrame from "@/components/auth/AuthFrame";
import LoginForm from "@/components/auth/LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };

export default function LoginPage() {
  return (
    <AuthFrame>
      <Suspense fallback={<div className="h-80" aria-busy="true" />}>
        <LoginForm />
      </Suspense>
    </AuthFrame>
  );
}
