import * as THREE from "three";
import type { SceneContext, SceneHandle } from "../three/stage";
import { makeLook, solid } from "../three/parts";
import { BUILD, CHECK, DETAIL, WIN, ease, lerp, lin } from "./timeline";
import { D, GAP_STATION, STATIONS, frameCurve, hullPoint, longCurve, offsetInward, section2D, shellGeometry, tAt, xAt } from "./hull";

export type DemoLabels = { current: Record<string, HTMLElement | null> };

type Key = { p: number; target: [number, number, number]; r: number; th: number; el: number };

const DETAIL_STATION = 6;

export function createDemoScene(progress: { current: number }, labels: DemoLabels) {
  return ({ scene, camera, renderer, reducedMotion }: SceneContext): SceneHandle => {
    renderer.localClippingEnabled = true;
    scene.fog = new THREE.Fog(0x050505, 28, 56);
    scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const key = new THREE.DirectionalLight(0xffffff, 1.8);
    key.position.set(-6, 10, 8);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0xffffff, 0.9);
    rim.position.set(8, 3, -6);
    scene.add(rim);

    const clip = new THREE.Plane(new THREE.Vector3(1, 0, 0), 100); // keeps x > -constant
    const clips = [clip];

    /* grid */
    const grid = new THREE.GridHelper(40, 40, 0x3f3f46, 0x1f1f23);
    const gridMat = grid.material as THREE.LineBasicMaterial;
    gridMat.transparent = true;
    scene.add(grid);

    const hull = new THREE.Group();
    scene.add(hull);

    /* frames */
    const frameMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.5, metalness: 0.2, clippingPlanes: clips, transparent: true });
    const fixMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.4, clippingPlanes: clips, transparent: true });
    const frames: { mesh: THREE.Mesh; count: number; i: number }[] = [];
    for (let i = 0; i < STATIONS; i++) {
      const g = new THREE.TubeGeometry(frameCurve(tAt(i)), 90, 0.035, 6, false);
      const mesh = new THREE.Mesh(g, i === GAP_STATION ? fixMat : frameMat);
      hull.add(mesh);
      frames.push({ mesh, count: g.index!.count, i });
    }

    /* keel + longitudinals */
    const longMat = new THREE.MeshStandardMaterial({ color: 0xa1a1aa, roughness: 0.6, metalness: 0.2, clippingPlanes: clips, transparent: true });
    const keel = new THREE.Mesh(new THREE.TubeGeometry(longCurve(0, 1), 120, 0.06, 8, false), frameMat);
    hull.add(keel);
    const longs: THREE.Mesh[] = [];
    for (const s of [0.22, 0.45, 0.7, 1]) {
      for (const side of [-1, 1]) {
        const m = new THREE.Mesh(new THREE.TubeGeometry(longCurve(s, side), 120, s === 1 ? 0.04 : 0.025, 6, false), longMat);
        hull.add(m);
        longs.push(m);
      }
    }

    /* shell */
    const shell = shellGeometry();
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0xe4e4e7,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
      clippingPlanes: clips,
    });
    const shellMesh = new THREE.Mesh(shell.geo, shellMat);
    hull.add(shellMesh);

    /* self-check highlight around the missing station */
    const gx = xAt(tAt(GAP_STATION));
    const boxMat = new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0 });
    const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.5, 2.6, 4.9)), boxMat);
    box.computeLineDistances();
    box.position.set(gx, 1.15, 0);
    scene.add(box);

    /* detail: section at station 6 with shell plate, frame web + flange, stiffeners, keel bar, deck beam */
    const tD = tAt(DETAIL_STATION);
    const xD = xAt(tD);
    const sec = section2D(tD);
    const centre = new THREE.Vector2(0, D * 0.55);
    const detail = new THREE.Group();
    const toWorld = (g: THREE.BufferGeometry, depth: number, x: number) => {
      g.rotateY(-Math.PI / 2);
      g.translate(x + depth / 2, 0, 0);
      return g;
    };
    const ring = (outer: THREE.Vector2[], inner: THREE.Vector2[]) => {
      const sh = new THREE.Shape([...outer, ...inner.slice().reverse()]);
      return sh;
    };
    const plateIn = offsetInward(sec, 0.07, centre);
    const webIn = offsetInward(sec, 0.34, centre);
    const flIn = offsetInward(sec, 0.39, centre);
    const parts: THREE.Object3D[] = [];
    const addPart = (g: THREE.BufferGeometry, plate = false) => {
      const lk = makeLook(0.95); // own materials so each part can fade independently
      if (plate) (lk.face as THREE.MeshStandardMaterial).color.set(0x3f3f46);
      const s = solid(g, lk, 30);
      detail.add(s);
      parts.push(s);
    };
    addPart(toWorld(new THREE.ExtrudeGeometry(ring(sec, plateIn), { depth: 0.9, bevelEnabled: false }), 0.9, xD - 0.45), true);
    addPart(toWorld(new THREE.ExtrudeGeometry(ring(plateIn, webIn), { depth: 0.06, bevelEnabled: false }), 0.06, xD - 0.03));
    addPart(toWorld(new THREE.ExtrudeGeometry(ring(webIn, flIn), { depth: 0.22, bevelEnabled: false }), 0.22, xD - 0.11));
    // stiffeners (L-profiles) at a few points each side
    const stiffAnchors: THREE.Vector3[] = [];
    for (const idx of [5, 10, 16, 22, 34, 40, 46, 51]) {
      const p0 = plateIn[idx];
      const a = plateIn[idx - 1];
      const b = plateIn[idx + 1];
      const tx = b.x - a.x;
      const ty = b.y - a.y;
      const len = Math.hypot(tx, ty);
      const t = new THREE.Vector2(tx / len, ty / len);
      let n = new THREE.Vector2(-t.y, t.x);
      if (n.dot(centre.clone().sub(p0)) < 0) n = n.negate();
      const h = 0.2;
      const f = 0.12;
      const w = 0.03;
      const P = (u: number, v: number) => p0.clone().addScaledVector(t, u).addScaledVector(n, v);
      const shape = new THREE.Shape([P(-w / 2, 0), P(w / 2, 0), P(w / 2, h - w), P(f, h - w), P(f, h), P(-w / 2, h)]);
      addPart(toWorld(new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false }), 0.9, xD - 0.45));
      if (idx === 40) stiffAnchors.push(new THREE.Vector3(xD, P(0, h).y, P(0, h).x));
    }
    // keel bar + deck beam
    const keelShape = new THREE.Shape([new THREE.Vector2(-0.07, -0.18), new THREE.Vector2(0.07, -0.18), new THREE.Vector2(0.07, 0.25), new THREE.Vector2(-0.07, 0.25)]);
    addPart(toWorld(new THREE.ExtrudeGeometry(keelShape, { depth: 0.9, bevelEnabled: false }), 0.9, xD - 0.45));
    const top = sec[0].y;
    const half = Math.abs(sec[0].x) - 0.08;
    const beam = new THREE.Shape([new THREE.Vector2(-half, top - 0.2), new THREE.Vector2(half, top - 0.2), new THREE.Vector2(half, top - 0.06), new THREE.Vector2(-half, top - 0.06)]);
    addPart(toWorld(new THREE.ExtrudeGeometry(beam, { depth: 0.08, bevelEnabled: false }), 0.08, xD - 0.04));
    scene.add(detail);

    const anchors: Record<string, THREE.Vector3> = {
      flag: new THREE.Vector3(gx, 2.6, 0),
      shell: (() => {
        const q = sec[44];
        return new THREE.Vector3(xD, q.y, q.x);
      })(),
      web: (() => {
        const q = offsetInward(sec, 0.2, centre)[48];
        return new THREE.Vector3(xD, q.y, q.x);
      })(),
      stiff: stiffAnchors[0] ?? new THREE.Vector3(xD, 0.6, 1),
      keel: new THREE.Vector3(xD, 0.0, 0),
    };

    /* camera keyframes */
    const focus = hullPoint(tD, 0.35, 1);
    const K: Key[] = [
      { p: 0.3, target: [0, 1.0, 0], r: 25, th: -2.35, el: 0.36 },
      { p: 0.44, target: [0, 1.0, 0], r: 22, th: -1.7, el: 0.42 },
      { p: 0.57, target: [0, 1.0, 0], r: 20, th: -0.95, el: 0.36 },
      { p: 0.6, target: [gx, 1.1, 0], r: 11.5, th: -0.5, el: 0.32 },
      { p: 0.675, target: [gx, 1.1, 0], r: 11, th: -0.3, el: 0.3 },
      { p: 0.71, target: [xD, 1.0, 0], r: 9, th: -1.25, el: 0.24 },
      { p: 0.76, target: [xD, focus.y + 0.05, focus.z - 0.35], r: 4.4, th: -1.12, el: 0.16 },
      { p: 0.795, target: [xD, focus.y + 0.05, focus.z - 0.35], r: 4.6, th: -1.0, el: 0.18 },
      { p: 0.845, target: [0, 1.0, 0], r: 21, th: -0.65, el: 0.4 },
      { p: 0.95, target: [0, 1.0, 0], r: 23, th: -0.2, el: 0.44 },
    ];
    const tgt = new THREE.Vector3();
    const cam = (p: number, time: number) => {
      let i = 0;
      while (i < K.length - 2 && p > K[i + 1].p) i++;
      const a = K[i];
      const b = K[i + 1];
      const k = ease(a.p, b.p, p);
      tgt.set(lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k));
      const r = lerp(a.r, b.r, k) * (camera.aspect < 0.9 ? 1.55 : camera.aspect < 1.3 ? 1.2 : 1);
      const th = lerp(a.th, b.th, k) + (reducedMotion ? 0 : Math.sin(time * 0.15) * 0.03);
      const el = lerp(a.el, b.el, k);
      camera.position.set(tgt.x + r * Math.cos(el) * Math.sin(th), tgt.y + r * Math.sin(el), tgt.z + r * Math.cos(el) * Math.cos(th));
      camera.lookAt(tgt);
    };

    const v = new THREE.Vector3();
    let shown = 0;

    return {
      update: (time) => {
        const target = progress.current;
        shown += (target - shown) * (reducedMotion ? 1 : 0.14);
        const p = shown;

        const winK = ease(WIN.in[0], WIN.in[1], p);
        gridMat.opacity = ease(...BUILD.grid, p) * 0.9;

        // keel sweeps in
        keel.geometry.setDrawRange(0, Math.floor(keel.geometry.index!.count * lin(...BUILD.keel, p) / 3) * 3);

        // frames, one station at a time (stern → bow), each sweeping keel-out
        const fp = lin(...BUILD.frames, p) * (STATIONS - 1 + 1.5);
        for (const f of frames) {
          if (f.i === GAP_STATION) {
            const k = lin(...CHECK.fix, p);
            f.mesh.geometry.setDrawRange(0, Math.floor((f.count * k) / 3) * 3);
            fixMat.emissiveIntensity = 0.9 * (1 - ease(CHECK.clear[0], CHECK.clear[1] + 0.05, p));
            continue;
          }
          const k = clamp01(fp - f.i);
          f.mesh.geometry.setDrawRange(0, Math.floor((f.count * k) / 3) * 3);
        }
        const lk = lin(...BUILD.longs, p);
        for (const m of longs) m.geometry.setDrawRange(0, Math.floor((m.geometry.index!.count * lk) / 3) * 3);
        shell.geo.setDrawRange(0, Math.floor(lin(...BUILD.shell, p) * shell.columns) * shell.perColumn);

        // detail: cut the hull at the station and bring in the section parts
        const cut = ease(...DETAIL.cut, p) * (1 - ease(...DETAIL.out, p));
        clip.constant = cut > 0.001 ? lerp(40, -(xD - 0.02), cut) : 100;
        const dk = ease(...DETAIL.parts, p) * (1 - ease(...DETAIL.out, p));
        detail.visible = dk > 0.001;
        parts.forEach((o, i) => {
          const kk = clamp01(dk * (parts.length + 2) - i);
          o.scale.setScalar(1);
          o.position.x = (1 - kk) * -1.2;
          o.traverse((c) => {
            const m = (c as THREE.Mesh).material as THREE.Material & { opacity: number };
            if (m) {
              m.transparent = true;
              m.opacity = kk;
            }
          });
        });
        shellMat.opacity = 0.2 * (1 - 0.6 * cut);
        frameMat.opacity = 1 - 0.55 * cut;
        longMat.opacity = 1 - 0.55 * cut;

        // self-check highlight
        const flag = ease(...CHECK.flag, p) * (1 - ease(...CHECK.clear, p));
        boxMat.opacity = flag * (p < CHECK.fix[0] ? 0.55 + 0.45 * Math.sin(time * 6) : 0.9);
        boxMat.dashSize = p < CHECK.fix[1] ? 0.18 : 10;

        hull.visible = winK > 0.01;
        cam(p, time);

        // HTML labels
        const w = renderer.domElement.clientWidth;
        const h = renderer.domElement.clientHeight;
        const vis: Record<string, number> = {
          flag,
          shell: dk * ease(0.735, 0.75, p),
          web: dk * ease(0.745, 0.76, p),
          stiff: dk * ease(0.755, 0.77, p),
          keel: dk * ease(0.765, 0.78, p),
        };
        for (const k of Object.keys(anchors)) {
          const el = labels.current[k];
          if (!el) continue;
          v.copy(anchors[k]).project(camera);
          const onScreen = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05;
          el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
          el.style.opacity = String(onScreen ? vis[k] : 0);
          el.dataset.side = v.x > 0.25 ? "left" : "right";
        }
      },
      dispose: () => {},
    };
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
