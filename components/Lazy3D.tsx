"use client";

import dynamic from "next/dynamic";

const Glow = () => <div className="stage-fallback absolute inset-0" />;

export const CoreCanvas = dynamic(() => import("./three/CoreCanvas"), { ssr: false, loading: Glow });
export const StoryCanvas = dynamic(() => import("./three/StoryCanvas"), { ssr: false, loading: Glow });
