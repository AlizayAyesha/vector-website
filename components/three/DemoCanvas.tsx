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
      label="Illustrative 3D viewport: a workboat hull is built station by station, checked, and cut to show a structural section"
    />
  );
}

export default memo(DemoCanvas);
