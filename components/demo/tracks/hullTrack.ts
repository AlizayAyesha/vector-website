import * as THREE from "three";
import { ease, lin } from "../timeline";
import { M, boxGeo, flat, mergeNonIndexed, polyPairs, reveal, segments, setOpacity, themes, tint, tubes, v3, type Track } from "./common";
import { qAt } from "./meta";

/**
 * Hull → frame geometry, rebuilt shot by shot from Vector's "From hull to frame geometry" recording:
 * Maxsurf Modeler profile + plan (teal viewport, yellow outline, AP/MS/FP, red zero point, green Stbd axis) →
 * dark shaded hull transferred to Rhino (light blue-grey viewport) → cyan reference curves + keel floor ticks
 * (Rhino grey #56616b) → black deck plates with white edges + purple keel plate → bulkhead, purple-blue frames,
 * deck beams → front / angled / side views → selected geometry (yellow top deck) → orange beams and stiffeners
 * in the closing model orbit. Illustrative geometry; 1 unit = 1 m.
 */
const Q = (t: number) => qAt("hull", t);

const BOW = -26;
const STERN = 12;
const LOA = STERN - BOW;
const B = 6.4;
const D = 4.4;
const BX0 = 0; // block (structure) extent
const BX1 = 10;
const DECKS = [1.5, 2.75, 4.0];
const SP = 0.625; // frame spacing

const u = (x: number) => (x - BOW) / LOA;
const breadth = (x: number) => {
  const t = u(x);
  if (t < 0.48) return Math.pow(Math.sin(((t / 0.48) * Math.PI) / 2), 0.85);
  if (t > 0.9) return 1 - 0.3 * Math.pow((t - 0.9) / 0.1, 2);
  return 1;
};
const keelRise = (x: number) => {
  const t = u(x);
  return t < 0.14 ? Math.pow((0.14 - t) / 0.14, 1.6) * 2.6 : 0;
};
const fullness = (x: number) => 1.15 + 4.2 * Math.min(1, Math.max(0, (u(x) - 0.08) / 0.4));
/** half breadth at (x, y) */
const hb = (x: number, y: number) => {
  const y0 = keelRise(x);
  if (y <= y0) return 0;
  const t = Math.min(1, (y - y0) / (D - y0));
  return (B / 2) * breadth(x) * (1 - Math.pow(1 - t, fullness(x)));
};
/** section points port-deck → keel → stbd-deck (optionally extended above deck with flare) */
function section(x: number, n = 28, ext = 0) {
  const y0 = keelRise(x);
  const pts: THREE.Vector3[] = [];
  const top = D + ext;
  for (let i = n; i >= 0; i--) {
    const y = y0 + (top - y0) * Math.pow(i / n, 1.4);
    const z = y > D ? hb(x, D) + (y - D) * 0.35 : hb(x, y);
    pts.push(v3(x, y, -z));
  }
  for (let i = 1; i <= n; i++) {
    const y = y0 + (top - y0) * Math.pow(i / n, 1.4);
    const z = y > D ? hb(x, D) + (y - D) * 0.35 : hb(x, y);
    pts.push(v3(x, y, z));
  }
  return pts;
}

export function createHullTrack(): Track {
  const group = new THREE.Group();

  /* ---------- Maxsurf lines (profile + plan) ---------- */
  const yellow: THREE.Vector3[] = [];
  const black: THREE.Vector3[] = [];
  const NX = 90;
  const xs = Array.from({ length: NX + 1 }, (_, i) => BOW + (LOA * i) / NX);
  // plan outline (deck edge both sides) + waterlines
  for (const s of [-1, 1]) {
    yellow.push(...polyPairs(xs.map((x) => v3(x, D, s * hb(x, D)))));
    for (const y of [0.6, 1.4, 2.4]) black.push(...polyPairs(xs.map((x) => v3(x, y, s * hb(x, y)))));
  }
  // profile: keel + stem + deck line in the centre plane
  yellow.push(...polyPairs(xs.map((x) => v3(x, keelRise(x), 0))), ...polyPairs([v3(BOW, D, 0), v3(STERN, D, 0)]), v3(STERN, 0, 0), v3(STERN, D, 0));
  // stations (sections) as thin black lines
  for (let i = 1; i < 20; i++) black.push(...polyPairs(section(BOW + (LOA * i) / 20, 14)));
  // AP / MS / FP posts + DWL
  for (const x of [STERN, (BOW + STERN) / 2, BOW + 0.4]) black.push(v3(x, -0.6, 0), v3(x, D + 0.8, 0));
  black.push(v3(BOW - 1, 1.8, 0), v3(STERN + 1, 1.8, 0));
  const maxYellow = segments(yellow, M.line(1, 0xf5e24a));
  const maxBlack = segments(black, M.line(0.9, 0x101010));
  const zero = new THREE.Mesh(new THREE.SphereGeometry(0.35, 16, 12), new THREE.MeshBasicMaterial({ color: 0xe0322a, transparent: true }));
  zero.position.set(STERN, 0, 0);
  const stbdAxis = segments([v3(STERN + 3, 0, 0), v3(STERN + 3, 0, 4)], M.line(1, 0x3bd16f));
  const maxsurf = new THREE.Group();
  maxsurf.add(maxYellow, maxBlack, zero, stbdAxis);
  group.add(maxsurf);

  /* ---------- shaded hull (transfer to Rhino) ---------- */
  const NS = 40;
  const hullPos: number[] = [];
  const rows = xs.map((x) => section(x, NS / 2));
  for (let i = 0; i < NX; i++)
    for (let j = 0; j < rows[i].length - 1; j++) {
      const a = rows[i][j], b = rows[i + 1][j], c = rows[i + 1][j + 1], d = rows[i][j + 1];
      hullPos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  const hullGeo = new THREE.BufferGeometry();
  hullGeo.setAttribute("position", new THREE.Float32BufferAttribute(hullPos, 3));
  hullGeo.computeVertexNormals();
  const hullMat = flat(0x3d4144, { side: THREE.DoubleSide, roughness: 0.55, metalness: 0.15, transparent: true });
  const hull = new THREE.Mesh(hullGeo, hullMat);
  group.add(hull);

  /* ---------- reference geometry: cyan curves + keel floor ticks ---------- */
  const cyan: THREE.Vector3[] = [];
  for (const x of [-15, BX0, BX1]) cyan.push(...polyPairs(section(x, 26, 2.2)));
  const ring = -21; // forward closed station ring
  cyan.push(...polyPairs(section(ring, 20, 1.6)));
  for (const s of [-1, 1]) cyan.push(...polyPairs(xs.filter((x) => x > -16 && x < BX1 + 0.01).map((x) => v3(x, D, s * hb(x, D)))));
  const refCurves = segments(cyan, M.line(1, 0x1ec8dc));
  group.add(refCurves);
  const tickGeos: THREE.BufferGeometry[] = [];
  for (let x = -17; x <= BX1 + 0.01; x += SP) tickGeos.push(boxGeo(v3(x - 0.09, -0.32, -0.3), v3(x + 0.09, 0.02, 0.3)));
  const keelTicks = new THREE.Mesh(mergeNonIndexed(tickGeos), flat(0x0d0d0d, { transparent: true }));
  group.add(keelTicks);

  /* ---------- decks (black plates, white edges, openings) ---------- */
  const deckMat = flat(0x0f1012, { transparent: true, side: THREE.DoubleSide });
  const decks = DECKS.map((y, i) => {
    const w = hb(BX0 + 5, y);
    const s = new THREE.Shape();
    s.moveTo(BX0, -w);
    s.lineTo(BX1, -w);
    s.lineTo(BX1, w);
    s.lineTo(BX0, w);
    s.closePath();
    const holes: [number, number, number, number][] = i === 0 ? [[2, -1.0, 3.2, 2.0]] : i === 1 ? [[1.2, -0.9, 2.2, 1.8], [6.2, -0.9, 2.2, 1.8]] : [[3.4, -0.6, 3.6, 1.2]];
    for (const [hx, hz, hw, hd] of holes) {
      const h = new THREE.Path();
      h.moveTo(hx, hz);
      h.lineTo(hx + hw, hz);
      h.lineTo(hx + hw, hz + hd);
      h.lineTo(hx, hz + hd);
      h.closePath();
      s.holes.push(h);
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false });
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, deckMat.clone());
    m.position.y = y + 0.08;
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(g, 30), M.line(0.95, 0xffffff));
    m.add(e);
    group.add(m);
    return m;
  });
  // top deck selection grid (yellow), "Inspect the selected geometry"
  const tg: THREE.Vector3[] = [];
  const wt = hb(5, DECKS[2]);
  for (let x = BX0; x <= BX1 + 0.01; x += SP / 2) tg.push(v3(x, DECKS[2] + 0.1, -wt), v3(x, DECKS[2] + 0.1, wt));
  for (let z = -wt; z <= wt + 0.01; z += 0.4) tg.push(v3(BX0, DECKS[2] + 0.1, z), v3(BX1, DECKS[2] + 0.1, z));
  const topGrid = segments(tg, M.line(0.95, 0xf2c41a));
  group.add(topGrid);

  // purple keel plate forward of the block
  const keelPlate = new THREE.Mesh(boxGeo(v3(-11, 0.02, -0.32), v3(-2.5, 0.16, 0.32)), flat(0xa43fe6, { transparent: true, emissive: 0x3a0f55 }));
  keelPlate.add(new THREE.LineSegments(new THREE.EdgesGeometry(keelPlate.geometry), M.line(0.9, 0xffffff)));
  group.add(keelPlate);

  /* ---------- structure: bulkhead, frames, longitudinals, deck beams, stiffeners ---------- */
  const bulkShape = new THREE.Shape();
  const bs = section(BX0, 24);
  bulkShape.moveTo(bs[0].z, bs[0].y);
  bs.forEach((p) => bulkShape.lineTo(p.z, p.y));
  bulkShape.closePath();
  const bulkGeo = new THREE.ShapeGeometry(bulkShape);
  bulkGeo.rotateY(Math.PI / 2);
  const bulkhead = new THREE.Mesh(bulkGeo, flat(0xc9cdd1, { side: THREE.DoubleSide, transparent: true }));
  bulkhead.position.x = BX0;
  bulkhead.add(new THREE.LineSegments(new THREE.EdgesGeometry(bulkGeo, 10), M.line(1, 0xffffff)));
  group.add(bulkhead);

  const framePairs: [THREE.Vector3, THREE.Vector3][] = [];
  for (let x = BX0 + SP; x <= BX1 + 0.01; x += SP) {
    const s = section(x, 18);
    for (let i = 0; i < s.length - 1; i++) framePairs.push([s[i], s[i + 1]]);
  }
  const frameMat = flat(0x6f62e8, { emissive: 0x1d1650, transparent: true });
  const frames = tubes(framePairs, 0.045, frameMat, 6);
  group.add(frames);

  const longPairs: [THREE.Vector3, THREE.Vector3][] = [];
  for (const t of [0.12, 0.28, 0.45, 0.62, 0.8]) {
    for (const s of [-1, 1]) {
      const y = D * t;
      longPairs.push([v3(BX0, y, s * hb(5, y)), v3(BX1, y, s * hb(5, y))]);
    }
  }
  for (const z of [-1.6, -0.8, 0, 0.8, 1.6]) longPairs.push([v3(BX0, 0.05, z * 0.6), v3(BX1, 0.05, z * 0.6)]);
  const longs = tubes(longPairs, 0.03, frameMat, 5);
  group.add(longs);

  const beamGeos: THREE.BufferGeometry[] = [];
  DECKS.forEach((y) => {
    const w = hb(5, y);
    for (let x = BX0 + SP; x <= BX1 + 0.01; x += SP) beamGeos.push(boxGeo(v3(x - 0.05, y - 0.16, -w), v3(x + 0.05, y, w)));
  });
  const beamMat = flat(0x1c1c1e, { transparent: true });
  const beams = new THREE.Mesh(mergeNonIndexed(beamGeos), beamMat);
  group.add(beams);

  const stiffGeos: THREE.BufferGeometry[] = [];
  for (let z = -2.6; z <= 2.61; z += 0.52) {
    const ylo = 0.15;
    const yhi = D - 0.05;
    if (hb(BX0, 0.6) < Math.abs(z) && Math.abs(z) > 2.4) continue;
    stiffGeos.push(boxGeo(v3(BX0 - 0.14, ylo, z - 0.04), v3(BX0 - 0.02, yhi, z + 0.04)));
  }
  const stiffMat = flat(0x1c1c1e, { transparent: true });
  const stiffeners = new THREE.Mesh(mergeNonIndexed(stiffGeos), stiffMat);
  group.add(stiffeners);

  const anchors = {
    ap: { pos: v3(STERN, -1.2, 0), vis: 0 },
    ms: { pos: v3((BOW + STERN) / 2, -1.2, 0), vis: 0 },
    fp: { pos: v3(BOW + 0.4, -1.2, 0), vis: 0 },
    zpt: { pos: v3(STERN + 1.2, 2.6, 0), vis: 0 },
    stbd: { pos: v3(STERN + 3, 0, 4.2), vis: 0 },
  };

  /* ---------- camera path (follows the recording) ---------- */
  const keys = [
    { q: Q(21), target: [-7, 1.6, 0], r: 62, th: 0, el: 0.02 }, // profile
    { q: Q(24), target: [-7, 1.6, 0], r: 60, th: 0, el: 0.02 },
    { q: Q(26), target: [-7, 1.0, 0], r: 62, th: 0, el: 1.5 }, // plan view
    { q: Q(28.6), target: [-7, 1.0, 0], r: 62, th: 0, el: 1.5 },
    { q: Q(30), target: [-7, 1.6, 0], r: 54, th: 0.62, el: -0.16 }, // low oblique from below: dark shaded hull
    { q: Q(39), target: [-7, 1.8, 0], r: 50, th: 0.8, el: -0.12 },
    { q: Q(42), target: [-3, 2.2, 0], r: 40, th: 2.3, el: 0.62 }, // reference curves from above
    { q: Q(51), target: [1, 2.4, 0], r: 32, th: 2.45, el: 0.58 },
    { q: Q(64), target: [3, 2.4, 0], r: 28, th: 2.7, el: 0.5 },
    { q: Q(68), target: [4, 2.6, 0], r: 24, th: 1.52, el: 0.16 }, // front view: frame rings
    { q: Q(71.5), target: [4, 2.6, 0], r: 24, th: 1.48, el: 0.2 },
    { q: Q(75), target: [3, 2.4, 0], r: 27, th: 0.7, el: 0.5 }, // change the viewing angle
    { q: Q(77.5), target: [3, 2.4, 0], r: 27, th: 0.55, el: 0.48 },
    { q: Q(80), target: [0, 2.3, 0], r: 34, th: 0, el: 0.02 }, // side view (elevation)
    { q: Q(83.5), target: [0, 2.3, 0], r: 34, th: 0, el: 0.02 },
    { q: Q(87), target: [-5, 2.4, 0], r: 44, th: 0.45, el: 0.3 }, // reference geometry
    { q: Q(90), target: [-5, 2.4, 0], r: 44, th: 0.5, el: 0.3 },
    { q: Q(94), target: [4, 2.6, 0], r: 24, th: 0.35, el: 0.22 }, // selected geometry
    { q: Q(102), target: [4.5, 2.6, 0], r: 23, th: 0.55, el: 0.26 },
    { q: Q(106), target: [2, 2.4, 0], r: 28, th: 0.85, el: 0.3 }, // model orbit
    { q: 1, target: [1, 2.4, 0], r: 30, th: 0.85 + 3.6, el: 0.32 },
  ] as Track["keys"];

  const theme = themes([
    { q: 0, top: "#3f6464", bottom: "#3b5f5f", grid: 0 }, // Maxsurf Modeler
    { q: Q(29.4), top: "#86929a", bottom: "#76838b", grid: 0, light: true }, // Rhino, light blue-grey
    { q: Q(40), top: "#5a656f", bottom: "#525d66", grid: 0.12 }, // Rhino viewport grey
  ]);

  const update = (q: number) => {
    // Maxsurf (21–29 s)
    const mx = ease(Q(21), Q(22.5), q) * (1 - ease(Q(29), Q(30.5), q));
    reveal(maxYellow.geometry, lin(Q(21), Q(23), q), 2);
    setOpacity(maxsurf, mx);
    // shaded hull (29–40 s)
    const sh = ease(Q(29.2), Q(30.6), q) * (1 - ease(Q(40), Q(42), q));
    hullMat.opacity = sh;
    hull.visible = sh > 0.01;
    // reference curves + floor ticks (40 s →)
    const ref = ease(Q(40), Q(42.5), q);
    reveal(refCurves.geometry, lin(Q(40), Q(44), q), 2);
    setOpacity(refCurves, ref);
    setOpacity(keelTicks, ref);
    keelTicks.scale.x = 1;
    // decks drop in (45–51 s)
    decks.forEach((d, i) => {
      const k = ease(Q(45 + i * 1.6), Q(46.6 + i * 1.6), q);
      setOpacity(d, k);
      d.position.y = DECKS[i] + 0.08 + (1 - k) * 1.2;
    });
    setOpacity(keelPlate, ease(Q(46), Q(48), q));
    // frames and members (51–65 s)
    setOpacity(bulkhead, ease(Q(51), Q(53), q));
    const fk = lin(Q(53), Q(61), q);
    reveal(frames.geometry, fk, 3);
    frames.visible = fk > 0;
    const lk = lin(Q(56), Q(63), q);
    reveal(longs.geometry, lk, 3);
    longs.visible = lk > 0;
    const bk = lin(Q(55), Q(64), q);
    reveal(beams.geometry, bk, 3);
    beams.visible = bk > 0;
    setOpacity(stiffeners, ease(Q(58), Q(62), q));
    // selected geometry (90 s): frames brighten, top deck in yellow
    const sel = ease(Q(90), Q(92), q);
    tint(frameMat, 0x6f62e8, 0x7c8cff, sel);
    setOpacity(topGrid, sel);
    // model orbit (103 s): orange deck beams + bulkhead stiffeners
    const orb = ease(Q(102), Q(105), q);
    tint(beamMat, 0x1c1c1e, 0xf09a1a, orb);
    tint(stiffMat, 0x1c1c1e, 0xf09a1a, orb);
    tint(frameMat, sel > 0.5 ? 0x7c8cff : 0x6f62e8, 0x8a5cf0, orb);

    const lab = ease(Q(22), Q(23.5), q) * (1 - ease(Q(28.5), Q(29.5), q));
    anchors.ap.vis = anchors.ms.vis = anchors.fp.vis = lab;
    anchors.zpt.vis = anchors.stbd.vis = lab;
  };

  return {
    group,
    keys,
    anchors,
    unit: 1,
    fog: [60, 140],
    update,
    theme,
    stats: () => ({ decks: DECKS.length }),
  };
}
