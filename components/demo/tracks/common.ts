import * as THREE from "three";
import { ease, lerp } from "../timeline";

export type Key = { q: number; target: [number, number, number]; r: number; th: number; el: number };

/** Anchors are world points with an HTML label; vis is computed per frame by the track. */
export type Anchor = { pos: THREE.Vector3; vis: number };

export type Track = {
  group: THREE.Group;
  keys: Key[];
  anchors: Record<string, Anchor>;
  /** world-units per metre used for the HUD scale bar */
  unit: number;
  fog: [number, number];
  update: (q: number, time: number) => void;
  /** live numbers for the HUD (e.g. counts) */
  stats?: () => Record<string, string | number>;
  /** viewport look at q (background, fog, grid), matched to the recording's application viewport */
  theme: (q: number) => Theme;
};

/** Viewport look. bg = CSS gradient stops (top, bottom); light = dark overlay text needed. */
export type Theme = { top: THREE.Color; bottom: THREE.Color; grid: number; light: boolean };
export type ThemeStop = { q: number; top: string; bottom: string; grid?: number; light?: boolean };

/** Piecewise viewport themes with a short colour blend into each stop. */
export function themes(stops: ThemeStop[], blend = 0.012) {
  const cs = stops.map((s) => ({ ...s, t: new THREE.Color(s.top), b: new THREE.Color(s.bottom) }));
  const out: Theme = { top: new THREE.Color(), bottom: new THREE.Color(), grid: 0, light: false };
  return (q: number): Theme => {
    let i = 0;
    for (let k = 0; k < cs.length; k++) if (q >= cs[k].q) i = k;
    const cur = cs[i];
    const prev = cs[Math.max(0, i - 1)];
    const k = i === 0 ? 1 : Math.min(1, (q - cur.q) / blend);
    const e = k * k * (3 - 2 * k);
    out.top.copy(prev.t).lerp(cur.t, e);
    out.bottom.copy(prev.b).lerp(cur.b, e);
    out.grid = (prev.grid ?? 0) + ((cur.grid ?? 0) - (prev.grid ?? 0)) * e;
    out.light = e > 0.5 ? !!cur.light : !!prev.light;
    return out;
  };
}

/** Flat, CAD-viewport style shaded material (Rhino / SOLIDWORKS shaded display). */
export const flat = (color: number, o: Partial<THREE.MeshStandardMaterialParameters> = {}) =>
  new THREE.MeshStandardMaterial({ color, metalness: 0.05, roughness: 0.72, ...o });

/** Merge many cylinders a→b into one mesh (fast space frames, rings, ticks). */
export function tubes(pairs: [THREE.Vector3, THREE.Vector3][], r: number, mat: THREE.Material, seg = 8) {
  const geos: THREE.BufferGeometry[] = [];
  const up = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  const m = new THREE.Matrix4();
  for (const [a, b] of pairs) {
    const d = b.clone().sub(a);
    const len = d.length();
    if (len < 1e-6) continue;
    const g = new THREE.CylinderGeometry(r, r, len, seg, 1, false);
    q.setFromUnitVectors(up, d.normalize());
    m.compose(a.clone().lerp(b, 0.5), q, new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m);
    geos.push(g.index ? g.toNonIndexed() : g);
  }
  return new THREE.Mesh(mergeNonIndexed(geos), mat);
}

/** Concatenate non-indexed geometries (position + normal); order preserved so reveal() builds in sequence. */
export function mergeNonIndexed(geos: THREE.BufferGeometry[]) {
  let n = 0;
  for (const g of geos) n += g.getAttribute("position").count;
  const pos = new Float32Array(n * 3);
  const nor = new Float32Array(n * 3);
  let o = 0;
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    if (!g.getAttribute("normal")) g.computeVertexNormals();
    pos.set(g.getAttribute("position").array as Float32Array, o * 3);
    nor.set(g.getAttribute("normal").array as Float32Array, o * 3);
    o += g.getAttribute("position").count;
    g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  return out;
}

/** Box mesh geometry spanning min→max (axis aligned), for merging. */
export function boxGeo(min: THREE.Vector3, max: THREE.Vector3) {
  const g = new THREE.BoxGeometry(max.x - min.x, max.y - min.y, max.z - min.z);
  g.translate((min.x + max.x) / 2, (min.y + max.y) / 2, (min.z + max.z) / 2);
  return g.toNonIndexed();
}

/** Lerp a material colour between two hex values. */
export function tint(mat: THREE.Material, a: number, b: number, k: number) {
  const m = mat as THREE.MeshStandardMaterial | THREE.LineBasicMaterial;
  const ud = m.userData as { ca?: THREE.Color; cb?: THREE.Color };
  if (!ud.ca) {
    ud.ca = new THREE.Color();
    ud.cb = new THREE.Color();
  }
  ud.ca.setHex(a);
  ud.cb!.setHex(b);
  m.color.copy(ud.ca).lerp(ud.cb!, Math.max(0, Math.min(1, k)));
}

export function camAt(keys: Key[], q: number, out: { target: THREE.Vector3; r: number; th: number; el: number }) {
  let i = 0;
  while (i < keys.length - 2 && q > keys[i + 1].q) i++;
  const a = keys[i];
  const b = keys[i + 1] ?? a;
  const k = b === a ? 0 : ease(a.q, b.q, q);
  out.target.set(lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k));
  out.r = lerp(a.r, b.r, k);
  out.th = lerp(a.th, b.th, k);
  out.el = lerp(a.el, b.el, k);
  return out;
}

/* ---------- materials (monochrome, env-lit) ---------- */
export const M = {
  steel: () => new THREE.MeshStandardMaterial({ color: 0xc8c8cc, metalness: 0.55, roughness: 0.38 }),
  dark: () => new THREE.MeshStandardMaterial({ color: 0x2a2a2e, metalness: 0.35, roughness: 0.5 }),
  satin: () => new THREE.MeshStandardMaterial({ color: 0x8c8c92, metalness: 0.5, roughness: 0.42 }),
  white: () => new THREE.MeshStandardMaterial({ color: 0xf1f1f3, metalness: 0.1, roughness: 0.55 }),
  rubber: () => new THREE.MeshStandardMaterial({ color: 0x18181a, metalness: 0.0, roughness: 0.85 }),
  glass: () =>
    new THREE.MeshStandardMaterial({
      color: 0xb9bcc2,
      metalness: 0.85,
      roughness: 0.08,
      transparent: true,
      opacity: 0.38,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  line: (opacity = 0.9, color = 0xf4f4f5) => new THREE.LineBasicMaterial({ color, transparent: true, opacity }),
  dashed: (opacity = 0.7, color = 0xa1a1aa) => new THREE.LineDashedMaterial({ color, dashSize: 0.12, gapSize: 0.08, transparent: true, opacity }),
};

/** Edge overlay for crisp CAD-style feature lines. */
export function withEdges(mesh: THREE.Mesh, threshold = 28, opacity = 0.55) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), M.line(opacity));
  mesh.add(e);
  return e;
}

/** Fake contact shadow / AO pool under a model. */
export function contactShadow(w: number, d: number, strength = 0.75) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d")!;
  const grd = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  grd.addColorStop(0, `rgba(0,0,0,${strength})`);
  grd.addColorStop(0.55, `rgba(0,0,0,${strength * 0.45})`);
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.renderOrder = -1;
  return m;
}

/** Dimension line between a and b with end ticks, extension lines and intermediate measurement ticks. */
export function dimension(a: THREE.Vector3, b: THREE.Vector3, offset: THREE.Vector3, ticks = 10, tick = 0.12) {
  const pa = a.clone().add(offset);
  const pb = b.clone().add(offset);
  const dir = pb.clone().sub(pa).normalize();
  const n = offset.clone().normalize();
  const pts: THREE.Vector3[] = [pa, pb, a.clone(), pa.clone().addScaledVector(n, tick), b.clone(), pb.clone().addScaledVector(n, tick)];
  for (let i = 0; i <= ticks; i++) {
    const p = pa.clone().lerp(pb, i / ticks);
    const s = i % 5 === 0 ? tick : tick * 0.45;
    pts.push(p.clone().addScaledVector(n, -s * 0.5), p.clone().addScaledVector(n, s * 0.5));
  }
  // arrow heads
  const side = new THREE.Vector3().crossVectors(dir, n).normalize().multiplyScalar(tick * 0.35);
  pts.push(pa, pa.clone().addScaledVector(dir, tick).add(side), pa, pa.clone().addScaledVector(dir, tick).sub(side));
  pts.push(pb, pb.clone().addScaledVector(dir, -tick).add(side), pb, pb.clone().addScaledVector(dir, -tick).sub(side));
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const line = new THREE.LineSegments(geo, M.line(0.75, 0xd4d4d8));
  return { line, mid: pa.clone().lerp(pb, 0.5) };
}

/** Reveal helper for index-ordered geometry. */
export function reveal(geo: THREE.BufferGeometry, k: number, stride = 3) {
  const count = geo.index ? geo.index.count : geo.getAttribute("position").count;
  geo.setDrawRange(0, Math.floor((count * Math.max(0, Math.min(1, k))) / stride) * stride);
}

export function setOpacity(obj: THREE.Object3D, k: number) {
  obj.visible = k > 0.002;
  obj.traverse((o) => {
    const m = (o as THREE.Mesh).material as (THREE.Material & { opacity: number; userData: { base?: number } }) | undefined;
    if (!m || Array.isArray(m)) return;
    if (m.userData.base === undefined) m.userData.base = m.opacity;
    m.transparent = true;
    m.opacity = m.userData.base * k;
  });
}

export const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

/** Merge line point pairs into one LineSegments (reveal-friendly: order preserved). */
export function segments(pairs: THREE.Vector3[], mat: THREE.LineBasicMaterial | THREE.LineDashedMaterial) {
  const g = new THREE.BufferGeometry().setFromPoints(pairs);
  const l = new THREE.LineSegments(g, mat);
  if (mat instanceof THREE.LineDashedMaterial) l.computeLineDistances();
  return l;
}

/** Polyline → segment pairs. */
export function polyPairs(pts: THREE.Vector3[], close = false) {
  const out: THREE.Vector3[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(pts[i], pts[i + 1]);
  if (close && pts.length > 2) out.push(pts[pts.length - 1], pts[0]);
  return out;
}
