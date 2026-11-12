"use client";

import { useRef, useState } from "react";
import { recordings } from "@/lib/content";

type Rec = (typeof recordings)[number];

function Card({ r, big }: { r: Rec; big?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [broken, setBroken] = useState(false);
  const v = useRef<HTMLVideoElement>(null);

  const play = () => {
    setPlaying(true);
    requestAnimationFrame(() => v.current?.play().catch(() => setBroken(true)));
  };

  return (
    <figure className={`group relative overflow-hidden rounded-3xl border border-line bg-card ${big ? "md:col-span-2 md:row-span-2" : ""}`}>
      <div className={`relative w-full ${big ? "aspect-[16/10] md:aspect-auto md:h-full md:min-h-[30rem]" : "aspect-[16/10]"}`}>
        {playing && !broken ? (
          <video
            ref={v}
            className="absolute inset-0 size-full bg-black object-cover"
            src={r.video}
            poster={r.poster}
            controls
            playsInline
            preload="none"
            onError={() => setBroken(true)}
          />
        ) : (
          <button type="button" onClick={play} className="absolute inset-0 size-full text-left" aria-label={`Play recording: ${r.title}, ${r.duration}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={r.poster}
              alt=""
              loading="lazy"
              className="absolute inset-0 size-full object-cover opacity-80 transition duration-700 group-hover:scale-[1.03] group-hover:opacity-100"
              onError={(e) => (e.currentTarget.style.display = "none")}
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
            <span className="glass absolute left-1/2 top-1/2 flex size-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full transition group-hover:scale-110">
              <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor" aria-hidden="true">
                <path d="M7 4.5v15l12-7.5-12-7.5Z" />
              </svg>
            </span>
            {broken && (
              <span className="absolute inset-x-0 top-4 text-center text-xs text-muted">Video unavailable here — open it on vectoros.one/gallery</span>
            )}
          </button>
        )}
      </div>
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
        {!playing && (
          <>
            <div>
              <p className={`font-semibold tracking-tight ${big ? "text-2xl" : "text-lg"}`}>{r.title}</p>
              <p className="mt-1 text-sm text-muted">{r.meta}</p>
            </div>
            <span className="rounded-full border border-line bg-black/60 px-2.5 py-1 font-mono text-xs text-muted">{r.duration}</span>
          </>
        )}
      </figcaption>
    </figure>
  );
}

export default function Media() {
  return (
    <div className="grid gap-4 md:grid-cols-3 md:grid-rows-2">
      {recordings.map((r, i) => (
        <Card key={r.title} r={r} big={i === 0} />
      ))}
    </div>
  );
}
