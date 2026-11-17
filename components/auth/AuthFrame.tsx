import Link from "next/link";
import { Logo } from "@/components/Logo";

/** Minimal full-screen frame used by /login and /auth/callback: solid background, small mark top-left, centred column. */
export default function AuthFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold tracking-tight" aria-label="Vector OS home">
          <Logo className="size-5" />
          <span>Vector</span>
        </Link>
      </header>
      <main id="main" className="flex flex-1 items-start justify-center px-5 pb-20 pt-[12vh]">
        <div className="w-full max-w-[360px]">{children}</div>
      </main>
    </div>
  );
}
