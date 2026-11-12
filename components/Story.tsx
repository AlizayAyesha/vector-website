"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { story } from "@/lib/content";
import { StoryCanvas } from "./Lazy3D";

export default function Story() {
  const section = useRef<HTMLElement>(null);
  const progress = useMemo(() => ({ current: 0 }), []);
  const [beat, setBeat] = useState(0);

  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const total = r.height - window.innerHeight;
      const p = total > 0 ? Math.min(1, Math.max(0, -r.top / total)) : 0;
      progress.current = p;
      setBeat(p < 0.34 ? 0 : p < 0.67 ? 1 : 2);
    };
    const on = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
      cancelAnimationFrame(raf);
    };
  }, [progress]);

  return (
    <section ref={section} id="story" className="relative h-[320vh]" aria-label="How Vector OS approaches a part">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden">
        <div className="absolute inset-0">
          <StoryCanvas progress={progress} />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#000_85%)]" />
        </div>

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 px-6 md:grid-cols-2">
          <div className="pointer-events-none flex flex-col justify-end pb-10 pt-[46vh] md:justify-center md:p-0">
            <p className="eyebrow mb-5">{story.eyebrow}</p>
            <div className="relative min-h-[11rem] md:min-h-[14rem]">
              {story.beats.map((b, i) => (
                <div
                  key={b.k}
                  className={`absolute inset-0 transition-all duration-700 ${i === beat ? "translate-y-0 opacity-100" : i < beat ? "-translate-y-6 opacity-0" : "translate-y-6 opacity-0"}`}
                  aria-hidden={i !== beat}
                >
                  <p className="mb-3 font-mono text-xs text-muted">{b.k} / 03</p>
                  <h2 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">{b.title}</h2>
                  <p className="mt-4 max-w-md text-pretty text-base text-muted md:text-lg">{b.body}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex gap-2" aria-hidden="true">
              {story.beats.map((b, i) => (
                <span key={b.k} className={`h-0.5 rounded-full transition-all duration-500 ${i === beat ? "w-10 bg-fg" : "w-4 bg-line"}`} />
              ))}
            </div>
          </div>
        </div>

        <p className="absolute bottom-5 left-1/2 -translate-x-1/2 font-mono text-[11px] text-muted/70">
          Original illustration · not a CAD operation
        </p>
      </div>
    </section>
  );
}
