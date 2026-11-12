"use client";

import dynamic from "next/dynamic";

const Glow = () => <div className="stage-fallback absolute inset-0" />;

export const HeroCanvas = dynamic(() => import("./three/HeroCanvas"), { ssr: false, loading: Glow });
export const StoryCanvas = dynamic(() => import("./three/StoryCanvas"), { ssr: false, loading: Glow });
