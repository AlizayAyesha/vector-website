"use client";

import { useMemo } from "react";
import Stage from "./stage";
import { createStoryScene } from "./storyScene";

export default function StoryCanvas({ progress }: { progress: { current: number } }) {
  const setup = useMemo(() => createStoryScene(progress), [progress]);
  return <Stage setup={setup} className="absolute inset-0" label="Engineering assembly separating into parts and reassembling as you scroll" />;
}
