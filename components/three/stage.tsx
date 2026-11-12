"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export type SceneHandle = {
  update: (time: number, delta: number) => void;
  resize?: (w: number, h: number) => void;
  dispose: () => void;
};

export type SceneContext = {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pointer: { x: number; y: number }; // -1..1, smoothed by the scene itself
  reducedMotion: boolean;
};

type Props = {
  setup: (ctx: SceneContext) => SceneHandle;
  className?: string;
  fov?: number;
  /** Max device pixel ratio. Keeps fill-rate sane on retina / phones. */
  maxDpr?: number;
  label: string;
  /** Optional gate: when it returns false the loop keeps ticking but skips rendering. */
  isActive?: () => boolean;
};

/**
 * Minimal WebGL stage: one renderer per canvas, rendering only while the canvas
 * is on screen and the tab is visible. Honours prefers-reduced-motion by
 * drawing a single still frame.
 */
export default function Stage({ setup, className, fov = 35, maxDpr = 1.75, label, isActive }: Props) {
  const activeRef = useRef(isActive);
  activeRef.current = isActive;
  const wrap = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.setAttribute("aria-hidden", "true");
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 200);
    const pointer = { x: 0, y: 0 };
    const handle = setup({ renderer, scene, camera, pointer, reducedMotion });

    const size = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      handle.resize?.(w, h);
      if (!running) renderOnce();
    };

    let last = 0;
    let raf = 0;
    let running = false;
    let inView = false;
    let elapsed = 0;

    const renderOnce = () => {
      handle.update(elapsed, 0);
      renderer.render(scene, camera);
    };

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - last) / 1000, 1 / 20);
      last = now;
      elapsed += dt;
      if (!activeRef.current || activeRef.current()) {
        handle.update(elapsed, dt);
        renderer.render(scene, camera);
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running || reducedMotion) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => (inView && !document.hidden ? start() : stop());

    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        sync();
      },
      { rootMargin: "120px 0px" },
    );
    io.observe(el);

    const ro = new ResizeObserver(size);
    ro.observe(el);
    document.addEventListener("visibilitychange", sync);

    const onPointer = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    if (!reducedMotion) window.addEventListener("pointermove", onPointer, { passive: true });

    size();
    renderOnce();

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointermove", onPointer);
      handle.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
        else mat?.dispose?.();
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [setup, fov, maxDpr]);

  return (
    <div ref={wrap} className={className} role="img" aria-label={label}>
      {failed && <div className="stage-fallback" />}
    </div>
  );
}
