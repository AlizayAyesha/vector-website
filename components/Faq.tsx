"use client";

import { useId, useState } from "react";
import { faq } from "@/lib/content";

export default function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();
  return (
    <div className="divide-y divide-line border-y border-line">
      {faq.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={f.q}>
            <h3>
              <button
                type="button"
                id={`${base}-q${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-a${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="flex w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium tracking-tight transition-colors hover:text-white md:text-xl"
              >
                {f.q}
                <span className={`relative size-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-45" : ""}`} aria-hidden="true">
                  <span className="absolute left-0 top-1/2 h-px w-4 bg-current" />
                  <span className="absolute left-1/2 top-0 h-4 w-px bg-current" />
                </span>
              </button>
            </h3>
            <div
              id={`${base}-a${i}`}
              role="region"
              aria-labelledby={`${base}-q${i}`}
              className={`grid transition-[grid-template-rows] duration-300 ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
            >
              <div className="overflow-hidden">
                <p className="max-w-2xl pb-6 text-pretty text-muted">{f.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
