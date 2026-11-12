"use client";

import { useMemo } from "react";
import Stage from "./stage";
import { createCoreScene, type Tool } from "./coreScene";

type Props = {
  progress: { current: number };
  tools: readonly Tool[];
  labels: { current: (HTMLElement | null)[] };
  logos?: { current: (HTMLElement | null)[] };
};

export default function CoreCanvas({ progress, tools, labels, logos }: Props) {
  const setup = useMemo(() => createCoreScene({ progress, tools, labels, logos }), [progress, tools, labels, logos]);
  return (
    <Stage
      setup={setup}
      className="absolute inset-0"
      label="An engineering bracket dissolves into points that form the Vector OS mark, then connects to six engineering tools"
    />
  );
}
