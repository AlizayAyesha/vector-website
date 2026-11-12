import * as THREE from "three";
import { ease, lin } from "../timeline";
import { M, boxGeo, flat, mergeNonIndexed, reveal, segments, setOpacity, themes, tint, v3, type Track } from "./common";
import { qAt } from "./meta";

/**
 * 5,000 m² Façade Work, rebuilt shot by shot from Vector's recording (Rhino 8, rendered display):
 * white wire concept of curved façade runs (lavender-grey viewport) → cyan glazing across the runs →
 * close-up of segmented mullions and between-mullion transoms → blue glass with orange "joint pending" tags →
 * yellow bay selection → layered orange/blue profiles at the junction → brown connection envelopes and
 * accessory profiles → steel section → nominal glazing build-up → surrounding façade → separated components →
 * documented model wide shot. Illustrative geometry; 1 unit = 1 m.
 */
const Q = (t: number) => qAt("facade", t);

const COL = 1.2;
const ROW = 1.2;
const X0 = 4; // straight run x ∈ [4, 10] at z = 3 carries the detail bay
const planZ = (x: number) => (x < X0 ? 3 - 3.4 * (1 - Math.cos(((X0 - x) / 18) * Math.PI)) : x > 10 ? 3 - 2.2 * (1 - Math.cos(((x - 10) / 8) * (Math.PI / 2))) : 3);
const height = (x: number) => 10.8 - 4.8 * ((x + 14) / 30);
const NODES = Array.from({ length: 26 }, (_, k) => X0 + COL * (k - 15)); // x = -14 … 16
const DET_COLS = [1, 2, 3].map((k) => 15 + k); // node index of column start: x 5.2 … 8.8
const DET_ROWS = [2, 3, 4]; // y 2.4 … 6.0
const DX = X0 + COL; // detail origin x (5.2)
const DZ = 3;

export function createFacadeTrack(): Track {
  const group = new THREE.Group();

  /* ---------- concept: white wire grid over curved runs ---------- */
  const wire: THREE.Vector3[] = [];
  const glassPos: number[] = [];
  const isDetail = (c: number, r: number) => DET_COLS.includes(c) && DET_ROWS.includes(r);
  for (let c = 0; c < NODES.length - 1; c++) {
    const xa = NODES[c], xb = NODES[c + 1];
    const a = v3(xa, 0, planZ(xa)), b = v3(xb, 0, planZ(xb));
    const rows = Math.floor(Math.min(height(xa), height(xb)) / ROW);
    for (let r = 0; r < rows; r++) {
      const y0 = r * ROW, y1 = (r + 1) * ROW;
      if (!isDetail(c, r)) {
        wire.push(v3(a.x, y0, a.z), v3(b.x, y0, b.z), v3(a.x, y0, a.z), v3(a.x, y1, a.z));
        const i = 0.03; // inset so frames read between panes
        const pa = a.clone().lerp(b, i / COL), pb = b.clone().lerp(a, i / COL);
        glassPos.push(pa.x, y0 + i, pa.z, pb.x, y0 + i, pb.z, pb.x, y1 - i, pb.z, pa.x, y0 + i, pa.z, pb.x, y1 - i, pb.z, pa.x, y1 - i, pa.z);
      }
      if (r === rows - 1) wire.push(v3(a.x, y1, a.z), v3(b.x, y1, b.z));
    }
    if (c === NODES.length - 2) wire.push(v3(b.x, 0, b.z), v3(b.x, rows * ROW, b.z));
  }
  // smaller pieces: a low straight run and a curved low band (as in the concept view)
  for (let x = -24; x < -15.9; x += COL) for (let y = 0; y < 1.81; y += 0.9) wire.push(v3(x, y, -8), v3(x + COL, y, -8), v3(x, y, -8), v3(x, Math.min(1.8, y + 0.9), -8));
  for (let k = 0; k < 10; k++) {
    const t0 = k / 10, t1 = (k + 1) / 10;
    const p = (t: number) => v3(10 + 8 * t, 0, -5 - 4 * Math.sin(t * Math.PI));
    const a = p(t0), b = p(t1);
    for (const y of [0, 1.2]) wire.push(v3(a.x, y, a.z), v3(b.x, y, b.z));
    wire.push(v3(a.x, 0, a.z), v3(a.x, 1.2, a.z));
  }
  const wireLines = segments(wire, M.line(0.95, 0xffffff));
  group.add(wireLines);

  const glassGeo = new THREE.BufferGeometry();
  glassGeo.setAttribute("position", new THREE.Float32BufferAttribute(glassPos, 3));
  glassGeo.computeVertexNormals();
  const glassMat = flat(0x46cbea, { transparent: true, opacity: 0.92, side: THREE.DoubleSide, roughness: 0.25, metalness: 0.1, depthWrite: false });
  const glass = new THREE.Mesh(glassGeo, glassMat);
  group.add(glass);

  /* ---------- detail bay (3 × 3 panes on the straight run) ---------- */
  const det = new THREE.Group();
  det.position.set(DX, 0, DZ);
  group.add(det);
  const MW = 0.065, MD = 0.2, TH = 0.065, TD = 0.15;
  const frameMat = flat(0xdadcdf, { transparent: true });
  const mullionSegs: THREE.Mesh[] = [];
  for (let c = 0; c <= 3; c++)
    for (const r of DET_ROWS) {
      const m = new THREE.Mesh(boxGeo(v3(c * COL - MW / 2, r * ROW + 0.01, -MD), v3(c * COL + MW / 2, (r + 1) * ROW - 0.01, 0)), frameMat);
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), M.line(0.9, 0xffffff)));
      mullionSegs.push(m);
      det.add(m);
    }
  const transoms: THREE.Group[] = [];
  const transomPlain: THREE.Mesh[] = [];
  const layerMats = { dark: flat(0x2b2f33, { transparent: true }), orange: flat(0xe0953a, { transparent: true }), blue: flat(0x3d7fd8, { transparent: true }) };
  for (let c = 0; c < 3; c++)
    for (const r of [...DET_ROWS, DET_ROWS[2] + 1]) {
      const g = new THREE.Group();
      g.position.set(c * COL + MW / 2, r * ROW, 0);
      const L = COL - MW;
      const plain = new THREE.Mesh(boxGeo(v3(0, -TH / 2, -TD), v3(L, TH / 2, 0)), frameMat);
      plain.add(new THREE.LineSegments(new THREE.EdgesGeometry(plain.geometry), M.line(0.9, 0xffffff)));
      g.add(plain);
      transomPlain.push(plain);
      // layered profile (dark cap / orange / blue / orange / dark)
      const lay = new THREE.Group();
      const bands: [number, number, THREE.Material][] = [[-0.032, -0.022, layerMats.dark], [-0.022, -0.008, layerMats.orange], [-0.008, 0.008, layerMats.blue], [0.008, 0.022, layerMats.orange], [0.022, 0.032, layerMats.dark]];
      for (const [y0, y1, mat] of bands) lay.add(new THREE.Mesh(boxGeo(v3(0, y0, -TD), v3(L, y1, 0.012)), mat));
      lay.visible = false;
      g.add(lay);
      g.userData.lay = lay;
      det.add(g);
      transoms.push(g);
    }
  // mullion layered profile (vertical stripes) on the centre mullion pair
  const mLay = new THREE.Group();
  for (const c of [1, 2]) {
    for (const [x0, x1, mat] of [[-0.03, -0.012, layerMats.orange], [-0.012, 0.012, layerMats.blue], [0.012, 0.03, layerMats.orange]] as [number, number, THREE.Material][])
      mLay.add(new THREE.Mesh(boxGeo(v3(c * COL + x0, DET_ROWS[0] * ROW, -MD), v3(c * COL + x1, (DET_ROWS[2] + 1) * ROW, 0.014)), mat));
  }
  det.add(mLay);

  // detail panes
  const paneMat = flat(0x46cbea, { transparent: true, opacity: 0.92, side: THREE.DoubleSide, roughness: 0.2, metalness: 0.1, depthWrite: false });
  const panes: THREE.Mesh[] = [];
  for (let c = 0; c < 3; c++)
    for (const r of DET_ROWS) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(COL - MW - 0.02, ROW - TH - 0.02), paneMat);
      p.position.set(c * COL + COL / 2, r * ROW + ROW / 2, -0.06);
      det.add(p);
      panes.push(p);
    }
  // orange joint tags
  const tagGeos: THREE.BufferGeometry[] = [];
  for (let c = 0; c <= 3; c++) for (const r of [DET_ROWS[1], DET_ROWS[2]]) tagGeos.push(boxGeo(v3(c * COL - 0.09, r * ROW - 0.025, 0.0), v3(c * COL + 0.09, r * ROW + 0.025, 0.02)));
  const tags = new THREE.Mesh(mergeNonIndexed(tagGeos), flat(0xf08a24, { emissive: 0x6a2a00, transparent: true }));
  det.add(tags);
  // yellow selection: local bay outline + hatch
  const sel: THREE.Vector3[] = [];
  const bx0 = COL, bx1 = 2 * COL, by0 = DET_ROWS[1] * ROW, by1 = (DET_ROWS[1] + 1) * ROW;
  for (const z of [0.004, -0.2]) sel.push(v3(bx0, by0, z), v3(bx1, by0, z), v3(bx1, by0, z), v3(bx1, by1, z), v3(bx1, by1, z), v3(bx0, by1, z), v3(bx0, by1, z), v3(bx0, by0, z));
  for (let k = 0; k <= 8; k++) sel.push(v3(bx0, by0 + (k / 8) * ROW, 0.004), v3(bx1, by0 + (k / 8) * ROW, 0.004));
  const selBay = segments(sel, M.line(1, 0xfff200));
  det.add(selBay);
  // yellow transom highlight ("organise parts")
  const selT: THREE.Vector3[] = [];
  const ty = DET_ROWS[1] * ROW;
  for (let k = 0; k <= 10; k++) selT.push(v3(0, ty - 0.03 + k * 0.006, 0.016), v3(3 * COL, ty - 0.03 + k * 0.006, 0.016));
  const selTransom = segments(selT, M.line(1, 0xfff200));
  det.add(selTransom);
  // brown connection envelopes + accessory rods
  const envGeos: THREE.BufferGeometry[] = [];
  for (let c = 1; c <= 2; c++) for (const s of [-1, 1]) envGeos.push(boxGeo(v3(c * COL + s * 0.05 - (s < 0 ? 0.12 : 0), ty + 0.05, -0.34), v3(c * COL + s * 0.05 + (s > 0 ? 0.12 : 0), ty + 0.32, -0.2)));
  const envelopes = new THREE.Mesh(mergeNonIndexed(envGeos), flat(0x5b3a28, { transparent: true }));
  envelopes.add(new THREE.LineSegments(new THREE.EdgesGeometry(envelopes.geometry), M.line(0.6, 0x2a170c)));
  det.add(envelopes);
  const rodGeos: THREE.BufferGeometry[] = [];
  for (let k = 0; k < 14; k++) rodGeos.push(boxGeo(v3(0.2 + k * 0.24, ty + 0.62, -0.3), v3(0.215 + k * 0.24, ty + 0.9, -0.285)));
  const rods = new THREE.Mesh(mergeNonIndexed(rodGeos), flat(0xe39b3c, { transparent: true }));
  det.add(rods);
  // steel section (I-beam behind the transom line)
  const steelGeos = [
    boxGeo(v3(-0.4, ty - 0.12, -0.62), v3(3 * COL + 0.4, ty - 0.1, -0.42)),
    boxGeo(v3(-0.4, ty + 0.1, -0.62), v3(3 * COL + 0.4, ty + 0.12, -0.42)),
    boxGeo(v3(-0.4, ty - 0.1, -0.53), v3(3 * COL + 0.4, ty + 0.1, -0.51)),
  ];
  const steel = new THREE.Mesh(mergeNonIndexed(steelGeos), flat(0x4a4f55, { metalness: 0.4, roughness: 0.45, transparent: true }));
  det.add(steel);

  const anchors = {
    fglz: { pos: v3(DX + 2.6, 4.0, DZ + 0.02), vis: 0 },
    fjoint: { pos: v3(DX + COL, DET_ROWS[1] * ROW, DZ + 0.02), vis: 0 },
    fhor: { pos: v3(DX + 0.5, ty, DZ + 0.02), vis: 0 },
    fver: { pos: v3(DX + COL, ty + 0.5, DZ + 0.02), vis: 0 },
    falu: { pos: v3(DX + 0.7, ty + 0.03, DZ + 0.02), vis: 0 },
    fiso: { pos: v3(DX + 0.4, ty - 0.01, DZ + 0.02), vis: 0 },
    fgask: { pos: v3(DX + 1.7, ty - 0.03, DZ + 0.02), vis: 0 },
    fenv: { pos: v3(DX + COL + 0.12, ty + 0.2, DZ - 0.2), vis: 0 },
    fsteel: { pos: v3(DX + 0.2, ty + 0.12, DZ - 0.5), vis: 0 },
    figu: { pos: v3(DX + 1.9, DET_ROWS[1] * ROW + 0.5, DZ - 0.06), vis: 0 },
  };

  /* ---------- camera path ---------- */
  const J = [DX + COL, ty, DZ] as [number, number, number]; // junction
  const keys = [
    { q: 0, target: [DX + 1.2, ty + 0.2, DZ], r: 4.2, th: -0.35, el: 0.08 }, // opening close-up (finished bay)
    { q: Q(4.2), target: [DX + 1.4, ty + 0.4, DZ], r: 5.5, th: -0.2, el: 0.12 },
    { q: Q(5.5), target: [0, 4, -1], r: 40, th: 0.35, el: 0.42 }, // concept (wire)
    { q: Q(9), target: [0, 4, -1], r: 38, th: 0.25, el: 0.36 },
    { q: Q(15), target: [1, 4, -1], r: 36, th: 0.05, el: 0.3 }, // glazing
    { q: Q(18.5), target: [1, 4, -1], r: 35, th: -0.05, el: 0.28 },
    { q: Q(20), target: [DX + 1.8, 5.0, DZ], r: 4.4, th: -0.55, el: 0.42 }, // framing close-up, from above
    { q: Q(24.5), target: [DX + 1.6, 4.8, DZ], r: 4.0, th: -0.45, el: 0.36 },
    { q: Q(26), target: [DX + 1.8, 4.2, DZ], r: 3.6, th: 0.12, el: 0.04 }, // joint work, face-on
    { q: Q(31.5), target: [DX + 1.8, 4.2, DZ], r: 3.5, th: 0.18, el: 0.05 },
    { q: Q(33), target: [DX + 1.8, 4.1, DZ], r: 5.2, th: 0.32, el: 0.18 }, // select a bay
    { q: Q(38), target: [DX + 1.6, ty + 0.2, DZ], r: 2.6, th: 0.55, el: 0.2 }, // layered assembly
    { q: Q(42), target: J, r: 1.5, th: 0.75, el: 0.18 }, // interfaces
    { q: Q(48), target: J, r: 1.1, th: 0.95, el: 0.14 }, // how the components meet
    { q: Q(54), target: [DX + COL - 0.2, ty + 0.25, DZ - 0.1], r: 1.6, th: 0.5, el: 0.08 }, // accessory profiles
    { q: Q(61), target: [DX + COL - 0.2, ty + 0.25, DZ - 0.1], r: 1.5, th: 0.45, el: 0.08 },
    { q: Q(63), target: [DX + 1.2, ty, DZ], r: 2.0, th: -0.5, el: 0.25 }, // organise parts
    { q: Q(69), target: [DX + 1.3, ty, DZ], r: 1.9, th: -0.4, el: 0.24 },
    { q: Q(71), target: [DX + COL, ty + 0.18, DZ - 0.25], r: 1.3, th: 0.9, el: 0.22 }, // connection envelopes
    { q: Q(78), target: [DX + 0.8, ty, DZ - 0.45], r: 2.0, th: 1.25, el: 0.2 }, // steel section
    { q: Q(81), target: [DX + 0.8, ty, DZ - 0.45], r: 2.0, th: 1.3, el: 0.22 },
    { q: Q(83), target: [DX + 1.8, 4.0, DZ], r: 2.6, th: 0.02, el: 0.03 }, // glazing build-up face-on
    { q: Q(89), target: [DX + 1.8, 4.0, DZ], r: 2.4, th: 0.04, el: 0.03 },
    { q: Q(91.5), target: [DX + 1.5, 4.2, DZ], r: 9, th: -0.6, el: 0.2 }, // surrounding façade
    { q: Q(96), target: [DX + 1.5, 4.2, DZ], r: 8.5, th: -0.7, el: 0.22 },
    { q: Q(98), target: [DX + 1.8, ty, DZ], r: 2.4, th: -0.15, el: 0.6 }, // separated components from above
    { q: Q(106), target: [DX + 1.8, ty, DZ], r: 2.6, th: -0.05, el: 0.62 },
    { q: Q(108.5), target: [DX - 2, 4.5, DZ - 1], r: 13, th: -0.75, el: 0.22 }, // documented model wide
    { q: 1, target: [DX - 2, 4.5, DZ - 1], r: 14, th: -0.95, el: 0.24 },
  ] as Track["keys"];

  const theme = themes([
    { q: 0, top: "#a7adb2", bottom: "#9aa1a6", light: true },
    { q: Q(5), top: "#aeaebd", bottom: "#a2a3b2", light: true }, // concept: lavender grey
    { q: Q(9.5), top: "#a6aeae", bottom: "#99a2a2", light: true }, // component model: grey-teal
    { q: Q(19), top: "#adb2b6", bottom: "#a0a6aa", light: true }, // rendered view light grey
  ]);

  const update = (q: number) => {
    // wire concept + glazing across the façade
    const wireK = ease(Q(5), Q(6.5), q);
    reveal(wireLines.geometry, lin(Q(4.6), Q(8), q), 2);
    setOpacity(wireLines, Math.max(wireK * (1 - 0.65 * ease(Q(15), Q(17), q)), 1 - ease(Q(3.5), Q(5), q)));
    const glz = ease(Q(14.5), Q(17), q) + (1 - ease(Q(3.5), Q(5), q));
    reveal(glassGeo, lin(Q(14.5), Q(18), q) + (q < Q(5) ? 1 : 0), 3);
    glassMat.opacity = 0.92 * Math.min(1, glz);
    glass.visible = glassMat.opacity > 0.01;
    // glass colour: cyan (glazing) → dark teal grey (framing) → blue (joint review / build-up)
    const framing = ease(Q(19), Q(20.5), q) * (1 - ease(Q(89.5), Q(91), q));
    const blue = ease(Q(25), Q(26.5), q) * (1 - ease(Q(31.5), Q(33), q)) + ease(Q(82), Q(83.5), q) * (1 - ease(Q(89.5), Q(91), q));
    tint(paneMat, 0x46cbea, 0x52707a, framing);
    if (blue > 0) tint(paneMat, 0x52707a, 0x2f9cc4, blue);
    paneMat.opacity = Math.min(1, glz) * (0.92 - 0.25 * framing * (1 - blue));
    tint(glassMat, 0x46cbea, 0x52707a, framing);
    // detail framing visible from the framing step on (and in the opening close-up)
    const fr = Math.max(ease(Q(19), Q(20.5), q), 1 - ease(Q(4), Q(5), q));
    for (const m of mullionSegs) setOpacity(m, fr);
    // layered profiles replace plain covers from the layered-assembly step to the build-up step
    const layered = q > Q(35) && q < Q(82);
    transoms.forEach((t) => ((t.userData.lay as THREE.Group).visible = layered && fr > 0.5));
    transomPlain.forEach((m) => setOpacity(m, fr * (layered ? 0.25 : 1)));
    mLay.visible = layered && q > Q(40);
    panes.forEach((p) => (p.visible = (fr > 0.01 || glz > 0.01) && !(q > Q(53) && q < Q(82))));
    setOpacity(tags, ease(Q(25.5), Q(26.5), q) * (1 - ease(Q(31.5), Q(32.5), q)) + (q < Q(5) ? 1 - ease(Q(3.5), Q(5), q) : 0));
    setOpacity(selBay, ease(Q(32), Q(33), q) * (1 - ease(Q(34.6), Q(35.4), q)));
    setOpacity(selTransom, ease(Q(52.5), Q(53.2), q) * (1 - ease(Q(53.8), Q(54.4), q)) + ease(Q(62.5), Q(63.5), q) * (1 - ease(Q(69), Q(70), q)));
    setOpacity(envelopes, ease(Q(53.5), Q(55), q) * (1 - ease(Q(89.5), Q(91), q)));
    setOpacity(rods, ease(Q(54), Q(55.5), q) * (1 - ease(Q(76.5), Q(77.5), q)));
    setOpacity(steel, ease(Q(76.5), Q(78), q) * (1 - ease(Q(81.5), Q(82.5), q)));
    // separate components (97–107 s): transoms slide apart along their axis
    const sep = ease(Q(97), Q(100), q) * (1 - ease(Q(106.5), Q(108), q));
    transoms.forEach((t, i) => (t.position.x = (i % 3) * COL + MW / 2 + ((i % 3) - 1) * sep * 0.35));
    mullionSegs.forEach((m, i) => (m.position.z = sep * (i % 2 ? 0.12 : -0.12)));

    const on = (a: number, b: number) => ease(Q(a), Q(a + 0.8), q) * (1 - ease(Q(b - 0.8), Q(b), q));
    anchors.fglz.vis = on(26.5, 29);
    anchors.fjoint.vis = on(28.5, 32);
    anchors.fhor.vis = on(48.5, 51.5);
    anchors.fver.vis = on(51.5, 53);
    anchors.falu.vis = on(55, 57);
    anchors.fiso.vis = on(57, 59.5);
    anchors.fgask.vis = on(59.5, 62);
    anchors.fenv.vis = on(71.5, 77);
    anchors.fsteel.vis = on(78.5, 82);
    anchors.figu.vis = on(84, 90);
  };

  return {
    group,
    keys,
    anchors,
    unit: 1,
    fog: [80, 160],
    update,
    theme,
    stats: () => ({}),
  };
}
