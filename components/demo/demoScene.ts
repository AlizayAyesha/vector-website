import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { SceneContext, SceneHandle } from "../three/stage";
import { SWITCH, TRACKS, WIN, ease, lin } from "./timeline";
import { camAt, type Track } from "./tracks/common";
import { createHullTrack } from "./tracks/hullTrack";
import { createFacadeTrack } from "./tracks/facadeTrack";
import { createMechTrack } from "./tracks/mechTrack";
import { GRID, gridKey } from "./tracks/meta";

export type DemoLabels = { current: Record<string, HTMLElement | SVGElement | null> };

const NICE = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20];
const fmtLen = (m: number) => (m < 1 ? `${Math.round(m * 1000)} mm` : `${m} m`);

export function createDemoScene(progress: { current: number }, labels: DemoLabels) {
  return ({ scene, camera, renderer, pointer, reducedMotion }: SceneContext): SceneHandle => {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = 0.55;
    scene.fog = new THREE.Fog(0x060606, 20, 60);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.5));
    const key = new THREE.DirectionalLight(0xffffff, 1.6);
    key.position.set(-6, 10, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 1.4);
    rim.position.set(8, 4, -9);
    scene.add(rim);

    const ids = ["hull", "facade", "mech"] as const;
    const tracks: Track[] = [createHullTrack(), createFacadeTrack(), createMechTrack()];
    const grids: THREE.GridHelper[] = [];
    const gridAnchors: Record<string, THREE.Vector3> = {};
    tracks.forEach((t, i) => {
      const g = GRID[ids[i]];
      const grid = new THREE.GridHelper(g.size, g.div, 0x3a3a40, 0x18181b);
      const gm = grid.material as THREE.LineBasicMaterial;
      gm.transparent = true;
      gm.opacity = 0.85;
      gm.depthWrite = false;
      t.group.add(grid);
      grids.push(grid);
      g.labels.forEach(([x, z], k) => (gridAnchors[gridKey(ids[i], k)] = new THREE.Vector3(x, 0, z)));
      t.group.visible = false;
      scene.add(t.group);
    });

    const cam = { target: new THREE.Vector3(), r: 10, th: 0, el: 0 };
    const v = new THREE.Vector3();
    const inv = new THREE.Quaternion();
    let shown = 0;
    let lastNear = 0;
    const px = { x: 0, y: 0 };

    const setAnchor = (k: string, pos: THREE.Vector3, vis: number, w: number, h: number) => {
      const el = labels.current[k] as HTMLElement | null | undefined;
      if (!el) return;
      v.copy(pos).project(camera);
      const on = v.z < 1 && Math.abs(v.x) < 1.02 && Math.abs(v.y) < 1.02;
      el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
      el.style.opacity = String(on ? Math.max(0, Math.min(1, vis)) : 0);
      el.dataset.side = v.x > 0.3 ? "left" : "right";
    };

    return {
      update: (time, dt) => {
        shown += (progress.current - shown) * (reducedMotion ? 1 : 1 - Math.exp(-Math.min(0.1, dt) * 7.5));
        const p = shown;
        const ti = p < SWITCH[0] ? 0 : p < SWITCH[1] ? 1 : 2;
        const tr = tracks[ti];
        const q = lin(TRACKS[ti].a, TRACKS[ti].b, p);
        tracks.forEach((t, i) => (t.group.visible = i === ti && p > WIN.in[0] - 0.01));
        tr.update(q, time);

        // camera
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        const aspect = w / Math.max(1, h);
        camAt(tr.keys, q, cam);
        const r = cam.r * (aspect < 0.9 ? 1.6 : aspect < 1.3 ? 1.22 : 1);
        px.x += (pointer.x - px.x) * 0.05;
        px.y += (pointer.y - px.y) * 0.05;
        const th = cam.th + px.x * 0.06 + (reducedMotion ? 0 : Math.sin(time * 0.15) * 0.015);
        const el = Math.max(0.01, cam.el + px.y * 0.03);
        camera.position.set(cam.target.x + r * Math.cos(el) * Math.sin(th), cam.target.y + r * Math.sin(el), cam.target.z + r * Math.cos(el) * Math.cos(th));
        camera.lookAt(cam.target);
        const near = Math.max(0.004, r * 0.01);
        if (Math.abs(near - lastNear) > near * 0.05) {
          camera.near = near;
          camera.far = r * 40 + 10;
          camera.updateProjectionMatrix();
          lastNear = near;
        }
        const fog = scene.fog as THREE.Fog;
        fog.near = r * 1.15;
        fog.far = r * 3.4;
        grids[ti].scale.setScalar(1);

        // anchors
        for (const k of Object.keys(tr.anchors)) setAnchor(k, tr.anchors[k].pos, tr.anchors[k].vis, w, h);
        tracks.forEach((t, i) => {
          if (i === ti) return;
          for (const k of Object.keys(t.anchors)) {
            const e = labels.current[k] as HTMLElement | null | undefined;
            if (e) e.style.opacity = "0";
          }
        });
        const gridVis = ease(0.0, 0.05, q) * 0.9;
        for (const k of Object.keys(gridAnchors)) {
          const mine = k.startsWith(`grid:${ids[ti]}:`);
          if (mine) setAnchor(k, gridAnchors[k], gridVis, w, h);
          else {
            const e = labels.current[k] as HTMLElement | null | undefined;
            if (e) e.style.opacity = "0";
          }
        }

        // cross-fade between tracks
        const fadeEl = labels.current.fade as HTMLElement | null | undefined;
        if (fadeEl) {
          let f = 0;
          for (const s of SWITCH) f = Math.max(f, 1 - Math.abs(p - s) / 0.006);
          fadeEl.style.opacity = String(Math.max(0, Math.min(1, f)));
        }

        // HUD: axis gizmo
        inv.copy(camera.quaternion).invert();
        (["x", "y", "z"] as const).forEach((a) => {
          v.set(a === "x" ? 1 : 0, a === "y" ? 1 : 0, a === "z" ? 1 : 0).applyQuaternion(inv);
          const line = labels.current[`g${a}`] as SVGLineElement | null | undefined;
          const txt = labels.current[`g${a}t`] as SVGTextElement | null | undefined;
          if (line) {
            line.setAttribute("x2", String(24 + v.x * 16));
            line.setAttribute("y2", String(24 - v.y * 16));
            line.style.opacity = String(0.45 + 0.55 * Math.max(0, v.z + 0.4));
          }
          if (txt) {
            txt.setAttribute("x", String(24 + v.x * 21));
            txt.setAttribute("y", String(27 - v.y * 21));
          }
        });
        // HUD: readout + scale bar
        const coord = labels.current.coord as HTMLElement | null | undefined;
        if (coord) coord.textContent = `X ${cam.target.x.toFixed(2)}  Y ${cam.target.z.toFixed(2)}  Z ${cam.target.y.toFixed(2)}  ·  R ${r.toFixed(2)} m`;
        const pxPerM = h / (2 * r * Math.tan((camera.fov * Math.PI) / 360));
        let L = NICE[0];
        for (const n of NICE) if (n * pxPerM <= 110) L = n;
        const bar = labels.current.scale as HTMLElement | null | undefined;
        const barT = labels.current.scaleText as HTMLElement | null | undefined;
        if (bar) bar.style.width = `${Math.max(24, L * pxPerM)}px`;
        if (barT) barT.textContent = fmtLen(L);
      },
      dispose: () => {
        env.dispose();
        pmrem.dispose();
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          m.geometry?.dispose?.();
          const mat = m.material as THREE.Material | THREE.Material[] | undefined;
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose?.();
        });
      },
    };
  };
}
