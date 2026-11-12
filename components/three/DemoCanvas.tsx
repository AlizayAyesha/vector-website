"use client";

import { memo, useMemo } from "react";
import Stage from "./stage";
import { createDemoScene, type DemoLabels } from "../demo/demoScene";

type Props = { progress: { current: number }; labels: DemoLabels; isActive: () => boolean };

function DemoCanvas({ progress, labels, isActive }: Props) {
  const setup = useMemo(() => createDemoScene(progress, labels), [progress, labels]);
  return (
    <Stage
      setup={setup}
      className="absolute inset-0"
      fov={32}
      isActive={isActive}
      label="Illustrative 3D viewport: a ship block, a curved façade and a wheel-corner assembly are built and reviewed step by step"
    />
  );
}

export default memo(DemoCanvas);
