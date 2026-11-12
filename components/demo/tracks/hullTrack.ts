import * as THREE from "three";
import { ease, lin } from "../timeline";
import { M, contactShadow, dimension, polyPairs, reveal, segments, setOpacity, v3, withEdges, type Track } from "./common";

/**
 * Hull → frame geometry (after Vector's "Hull to structure" recording): a forward ship block with
 * three decks, dense transverse frames, web frames, deck beams and longitudinals. Sample data.
 * x = length (bow at +x), y = up, z = beam. 1 unit = 1 m.
 */
const LEN = 12;
const X0 = -LEN / 2;
const DECKS = [1.2, 2.4, 3.6];
const FRAMES = 48;
const GAP = [21, 22, 23, 24]; // top-deck beams flagged as missing, added by the self-check

const hb = (u: number) => Math.max(0.02, 3.0 * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.4))));
const keel = (u: number) => (u > 0.6 ? 2.4 * ((u - 0.6) / 0.4) ** 2 : 0);
const top = (u: number) => 4.0 + 0.4 * u * u;
const half = (u: number, s: number) => {
  const p = 0.35 + 1.2 * Math.pow(u, 1.5);
  const fl = 0.5 * u;
  return (hb(u) * Math.pow(Math.max(0, s), p) * (1 + fl * s * s)) / (1 + fl);
};
const xAt = (u: number) => X0 + u * LEN;
const pt = (u: number, s: number, side: number) => {
  const k = keel(u);
  return v3(xAt(u), k + (top(u) - k) * s, side * half(u, s));
};
const widthAtHeight = (u: number, y: number) => {
  const k = keel(u);
  if (y <= k) return -1;
  const s = Math.min(1, (y - k) / (top(u) - k));
  return half(u, s);
};


export function createHullTrack(): Track {
  const group = new THREE.Group();

  /* profile (Maxsurf step) */
  const prof: THREE.Vector3[] = [];
  const N = 80;
  const keelPts = Array.from({ length: N + 1 }, (_, i) => v3(xAt((i / N) * 0.99), keel((i / N) * 0.99), 0));
  const sheerPts = Array.from({ length: N + 1 }, (_, i) => v3(xAt((i / N) * 0.99), top((i / N) * 0.99), 0));
  prof.push(...polyPairs(keelPts), ...polyPairs(sheerPts), keelPts[N], sheerPts[N], keelPts[0], sheerPts[0]);
  for (let i = 0; i <= 12; i++) {
    const u = (i / 12) * 0.97;
    prof.push(v3(xAt(u), keel(u), 0), v3(xAt(u), top(u), 0));
  }
  for (const y of DECKS.slice(0, 2)) {
    let u1 = 0;
    for (let u = 0; u < 1; u += 0.005) if (keel(u) < y) u1 = u;
    prof.push(v3(X0, y, 0), v3(xAt(u1), y, 0));
  }
  const profile = segments(prof, M.line(0.95));
  const wl = segments([v3(X0 - 0.6, 1.8, 0), v3(X0 + LEN + 0.8, 1.8, 0)], M.dashed(0.8, 0xd4d4d8));
  group.add(profile, wl);

  /* shell surface + waterline contours */
  const nx = 60;
  const ns = 22;
  const cols = ns * 2 + 1;
  const pos: number[] = [];
  for (let i = 0; i <= nx; i++)
    for (let j = 0; j < cols; j++) {
      const u = (i / nx) * 0.985;
      const a = j / ns - 1;
      const p = pt(u, Math.abs(a), Math.sign(a) || 1);
      pos.push(p.x, p.y, p.z);
    }
  const idx: number[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      idx.push(a, a + cols, a + 1, a + cols, a + cols + 1, a + 1);
    }
  const shellGeo = new THREE.BufferGeometry();
  shellGeo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  shellGeo.setIndex(idx);
  shellGeo.computeVertexNormals();
  const shellMat = new THREE.MeshStandardMaterial({ color: 0x5a5a61, metalness: 0.55, roughness: 0.4, transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false });
  const shell = new THREE.Mesh(shellGeo, shellMat);
  group.add(shell);
  const contours: THREE.Vector3[] = [];
  for (let y = 0.4; y < 4.3; y += 0.4)
    for (const side of [-1, 1]) {
      let prev: THREE.Vector3 | null = null;
      for (let u = 0; u <= 0.985; u += 0.01) {
        const w = widthAtHeight(u, y);
        if (w < 0) {
          prev = null;
          continue;
        }
        const p = v3(xAt(u), y, side * w);
        if (prev) contours.push(prev, p);
        prev = p;
      }
    }
  const contourLines = segments(contours, M.line(0.35, 0xd4d4d8));
  group.add(contourLines);

  /* decks with openings */
  const decks: THREE.Mesh[] = [];
  DECKS.forEach((y, di) => {
    const port: THREE.Vector2[] = [];
    const star: THREE.Vector2[] = [];
    let uEnd = 0;
    for (let u = 0; u <= 0.985; u += 0.01) {
      const w = widthAtHeight(u, y);
      if (w < 0) break;
      uEnd = u;
      port.push(new THREE.Vector2(xAt(u), -w));
      star.push(new THREE.Vector2(xAt(u), w));
    }
    const sh = new THREE.Shape([...port, new THREE.Vector2(xAt(uEnd) + 0.05, 0), ...star.reverse()]);
    if (di === 2) sh.holes.push(new THREE.Path([new THREE.Vector2(-3.4, -1.1), new THREE.Vector2(-0.6, -1.1), new THREE.Vector2(-0.6, 1.1), new THREE.Vector2(-3.4, 1.1)]));
    if (di === 1) sh.holes.push(new THREE.Path([new THREE.Vector2(-1.2, -0.7), new THREE.Vector2(0.4, -0.7), new THREE.Vector2(0.4, 0.7), new THREE.Vector2(-1.2, 0.7)]));
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    g.translate(0, y, 0);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0xb4b4ba, metalness: 0.35, roughness: 0.45, transparent: true, opacity: 0.95 }));
    withEdges(m, 20, 0.8);
    decks.push(m);
    group.add(m);
  });

  /* frames (bow → aft), deck beams, longitudinals */
  const framePairs: THREE.Vector3[] = [];
  const beamPairs: THREE.Vector3[] = [];
  const gapPairs: THREE.Vector3[] = [];
  for (let f = FRAMES - 1; f >= 0; f--) {
    const u = (f / (FRAMES - 1)) * 0.975;
    const ring: THREE.Vector3[] = [];
    for (let i = 16; i >= 0; i--) ring.push(pt(u, i / 16, -1));
    for (let i = 1; i <= 16; i++) ring.push(pt(u, i / 16, 1));
    framePairs.push(...polyPairs(ring));
    DECKS.forEach((y, di) => {
      const w = widthAtHeight(u, y);
      if (w < 0.05) return;
      const pair = [v3(xAt(u), y + 0.04, -w), v3(xAt(u), y + 0.04, w)];
      if (di === 2 && GAP.includes(f)) gapPairs.push(...pair);
      else beamPairs.push(...pair);
    });
  }
  const frames = segments(framePairs, M.line(0.95));
  const beams = segments(beamPairs, M.line(0.7, 0xd4d4d8));
  const gapBeams = segments(gapPairs, M.line(1, 0xffffff));
  group.add(frames, beams, gapBeams);

  const longPairs: THREE.Vector3[] = [];
  DECKS.forEach((y) => {
    for (const zz of [-2.2, -1.4, -0.6, 0.6, 1.4, 2.2]) {
      let prev: THREE.Vector3 | null = null;
      for (let u = 0; u <= 0.985; u += 0.02) {
        const w = widthAtHeight(u, y);
        if (w < Math.abs(zz) + 0.05) break;
        const p = v3(xAt(u), y + 0.06, zz);
        if (prev) longPairs.push(prev, p);
        prev = p;
      }
    }
  });
  const longs = segments(longPairs, M.line(0.55, 0xa1a1aa));
  group.add(longs);

  /* web frames: flat bars every 6th frame */
  const webs: THREE.Mesh[] = [];
  for (let f = 0; f < FRAMES; f += 6) {
    const u = (f / (FRAMES - 1)) * 0.975;
    const outer: THREE.Vector2[] = [];
    for (let i = 16; i >= 0; i--) {
      const p = pt(u, i / 16, -1);
      outer.push(new THREE.Vector2(p.z, p.y));
    }
    for (let i = 1; i <= 16; i++) {
      const p = pt(u, i / 16, 1);
      outer.push(new THREE.Vector2(p.z, p.y));
    }
    const c = new THREE.Vector2(0, top(u) * 0.55);
    const inner = outer.map((p) => p.clone().lerp(c, 0.06));
    const sh = new THREE.Shape([...outer, ...inner.reverse()]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.07, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);
    g.translate(xAt(u) + 0.035, 0, 0);
    const m = new THREE.Mesh(g, M.satin());
    webs.push(m);
    group.add(m);
  }

  /* keel girder, highlighted */
  const keelCurve = new THREE.CatmullRomCurve3(Array.from({ length: 41 }, (_, i) => v3(xAt((i / 40) * 0.985), keel((i / 40) * 0.985) + 0.06, 0)));
  const keelMesh = new THREE.Mesh(new THREE.TubeGeometry(keelCurve, 160, 0.09, 8), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35, roughness: 0.4 }));
  group.add(keelMesh);

  /* aft bulkhead */
  const bh: THREE.Vector2[] = [];
  for (let i = 16; i >= 0; i--) {
    const p = pt(0, i / 16, -1);
    bh.push(new THREE.Vector2(p.z, p.y));
  }
  for (let i = 1; i <= 16; i++) {
    const p = pt(0, i / 16, 1);
    bh.push(new THREE.Vector2(p.z, p.y));
  }
  const bhGeo = new THREE.ShapeGeometry(new THREE.Shape(bh));
  bhGeo.rotateY(-Math.PI / 2);
  bhGeo.translate(X0, 0, 0);
  const bulkhead = new THREE.Mesh(bhGeo, new THREE.MeshStandardMaterial({ color: 0x232327, metalness: 0.3, roughness: 0.6, side: THREE.DoubleSide, transparent: true, opacity: 0.9 }));
  const stiff: THREE.Vector3[] = [];
  for (let z = -2.6; z <= 2.6; z += 0.4) {
    let y0 = -1;
    for (let s = 0; s <= 1; s += 0.01) if (half(0, s) >= Math.abs(z) && y0 < 0) y0 = keel(0) + (top(0) - keel(0)) * s;
    if (y0 >= 0) stiff.push(v3(X0 + 0.02, y0, z), v3(X0 + 0.02, top(0), z));
  }
  bulkhead.add(segments(stiff, M.line(0.5, 0xa1a1aa)));
  group.add(bulkhead);

  /* review box + dimensions */
  const gu0 = (GAP[0] / (FRAMES - 1)) * 0.975;
  const gu1 = (GAP[GAP.length - 1] / (FRAMES - 1)) * 0.975;
  const gx = (xAt(gu0) + xAt(gu1)) / 2;
  const box = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(Math.abs(xAt(gu1) - xAt(gu0)) + 0.6, 0.8, 4.4)), M.dashed(0, 0xffffff));
  box.computeLineDistances();
  box.position.set(gx, 3.7, 0);
  group.add(box);

  const loa = dimension(v3(X0, 0, 0), v3(X0 + LEN, 0, 0), v3(0, -0.05, 3.9), 12, 0.22);
  group.add(loa.line);
  const heightTicks: THREE.Vector3[] = [v3(X0 - 0.9, 0, 3.2), v3(X0 - 0.9, 4.0, 3.2)];
  for (let y = 0; y <= 4.0001; y += 0.4) heightTicks.push(v3(X0 - 0.9, y, 3.2), v3(X0 - (Math.abs((y / 1.2) % 1) < 0.01 ? 1.15 : 1.02), y, 3.2));
  const hDim = segments(heightTicks, M.line(0.7, 0xd4d4d8));
  group.add(hDim);

  const shadow = contactShadow(18, 10, 0.8);
  shadow.position.y = 0.01;
  group.add(shadow);

  const anchors = {
    ap: { pos: v3(X0, -0.5, 0), vis: 0 },
    ms: { pos: v3(0, -0.5, 0), vis: 0 },
    fp: { pos: v3(X0 + LEN * 0.985, keel(0.985) - 0.5, 0), vis: 0 },
    wl: { pos: v3(X0 + LEN + 0.6, 1.8, 0), vis: 0 },
    flag: { pos: v3(gx, 4.25, 0), vis: 0 },
    loa: { pos: loa.mid.clone(), vis: 0 },
    dk1: { pos: v3(X0 - 1.2, DECKS[0], 3.2), vis: 0 },
    dk2: { pos: v3(X0 - 1.2, DECKS[1], 3.2), vis: 0 },
    dk3: { pos: v3(X0 - 1.2, DECKS[2], 3.2), vis: 0 },
  };

  const keys = [
    { q: 0, target: [0.4, 2.0, 0], r: 18, th: 0.0, el: 0.02 },
    { q: 0.15, target: [0.4, 2.0, 0], r: 17, th: 0.05, el: 0.03 },
    { q: 0.3, target: [0, 1.8, 0], r: 19, th: 0.85, el: 0.34 },
    { q: 0.45, target: [0, 2.0, 0], r: 18, th: 1.35, el: 0.48 },
    { q: 0.68, target: [0, 2.0, 0], r: 17, th: 2.2, el: 0.42 },
    { q: 0.73, target: [gx, 3.4, 0], r: 12, th: 2.55, el: 0.62 },
    { q: 0.81, target: [gx, 3.4, 0], r: 12, th: 2.8, el: 0.6 },
    { q: 0.9, target: [0, 2.0, 0], r: 22, th: 3.6, el: 0.3 },
    { q: 1, target: [0, 2.0, 0], r: 23, th: 4.3, el: 0.34 },
  ] as Track["keys"];

  const update = (q: number, time: number) => {
    const s1 = ease(0, 0.12, q) * (1 - ease(0.2, 0.3, q));
    reveal(profile.geometry, lin(0.0, 0.12, q), 2);
    setOpacity(profile, s1);
    setOpacity(wl, s1);

    const sh = ease(0.16, 0.26, q);
    shellMat.opacity = 0.5 * sh * (1 - 0.6 * ease(0.28, 0.34, q)) * (1 - 0.7 * ease(0.45, 0.6, q));
    shell.visible = sh > 0.01;
    setOpacity(contourLines, sh * (1 - 0.7 * ease(0.45, 0.6, q)));

    decks.forEach((d, i) => {
      const k = ease(0.29 + i * 0.03, 0.34 + i * 0.03, q);
      setOpacity(d, k);
      d.position.y = (1 - k) * 0.8;
    });

    const fk = lin(0.45, 0.6, q);
    reveal(frames.geometry, fk, 2);
    frames.visible = fk > 0;
    reveal(beams.geometry, lin(0.5, 0.64, q), 2);
    beams.visible = q > 0.5;
    reveal(longs.geometry, lin(0.56, 0.67, q), 2);
    longs.visible = q > 0.56;
    webs.forEach((w, i) => setOpacity(w, ease(0.5 + i * 0.012, 0.53 + i * 0.012, q)));
    reveal(keelMesh.geometry, lin(0.46, 0.56, q), 3);
    keelMesh.visible = q > 0.46;
    setOpacity(bulkhead, ease(0.6, 0.66, q));

    const fix = ease(0.765, 0.79, q);
    reveal(gapBeams.geometry, fix, 2);
    gapBeams.visible = fix > 0;
    const flag = ease(0.69, 0.71, q) * (1 - ease(0.8, 0.83, q));
    const bm = box.material as THREE.LineDashedMaterial;
    bm.opacity = flag * (q < 0.765 ? 0.55 + 0.45 * Math.sin(time * 6) : 0.95);
    bm.dashSize = q < 0.79 ? 0.18 : 10;

    const dimK = ease(0.83, 0.88, q);
    setOpacity(loa.line, dimK);
    setOpacity(hDim, dimK);

    anchors.ap.vis = anchors.ms.vis = anchors.fp.vis = ease(0.06, 0.1, q) * (1 - ease(0.18, 0.24, q));
    anchors.wl.vis = anchors.ap.vis;
    anchors.flag.vis = flag;
    anchors.loa.vis = dimK;
    anchors.dk1.vis = anchors.dk2.vis = anchors.dk3.vis = dimK;
  };

  return {
    group,
    keys,
    anchors,
    unit: 1,
    fog: [26, 60],
    update,
    stats: () => ({ frames: FRAMES, decks: 3, webs: webs.length }),
  };
}
