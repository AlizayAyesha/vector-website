"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

/** Dark / light switch. The choice is saved in localStorage and applied before paint by the script in app/layout.tsx. */
export default function ThemeToggle({ className = "" }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("dark");
  useEffect(() => setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"), []);
  const next: Theme = theme === "dark" ? "light" : "dark";
  const flip = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("vector-theme", next);
    } catch {}
    setTheme(next);
  };
  return (
    <button type="button" onClick={flip} aria-label={`Switch to ${next} theme`} title={`Switch to ${next} theme`} className={`inline-flex size-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-fg/5 hover:text-fg ${className}`}>
      {theme === "dark" ? (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></svg>
      ) : (
        <svg viewBox="0 0 24 24" className="size-[18px]" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
      )}
    </button>
  );
}
