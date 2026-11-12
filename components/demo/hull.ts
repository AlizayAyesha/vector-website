import * as THREE from "three";

/** Original parametric 12 m workboat hull (sample data). Units: metres. x = length, y = up, z = beam. */
export const L = 12;
export const B = 4.2;
export const D = 1.8;
export const STATIONS = 19; // 0..18
export const GAP_STATION = 9; // deliberately missing until the self-check adds it

export const tAt = (i: number) => (i / (STATIONS - 1)) * 0.97;
export const xAt = (t: number) => t * L - L / 2;

const halfBeam = (t: number) => {
  const f = t < 0.65 ? 1 - 0.12 * ((0.65 - t) / 0.65) ** 2 : Math.sqrt(Math.max(0, 1 - ((t - 0.65) / 0.35) ** 2.2));
  return Math.max(0.015, f) * (B / 2);
};
const keelZ = (t: number) => (t > 0.75 ? D * 0.75 * ((t - 0.75) / 0.25) ** 2 : 0);
const sheer = (t: number) => D + 0.35 * t * t;
const fullness = (t: number) => 0.3 + 0.9 * Math.max(0, (t - 0.5) / 0.5) ** 1.5;

/** Point on the hull surface. s: 0 at keel → 1 at sheer. side: -1 port, +1 starboard. */
export function hullPoint(t: number, s: number, side: number, out = new THREE.Vector3()) {
  const k = keelZ(t);
  const y = k + (sheer(t) - k) * s;
  const z = side * halfBeam(t) * Math.pow(Math.max(s, 0), fullness(t));
  return out.set(xAt(t), y, z);
}

/** Section as 2D (u = beam, v = height), port sheer → keel → starboard sheer. */
export function section2D(t: number, n = 28) {
  const pts: THREE.Vector2[] = [];
  const v = new THREE.Vector3();
  for (let i = n; i >= 0; i--) {
    hullPoint(t, i / n, -1, v);
    pts.push(new THREE.Vector2(v.z, v.y));
  }
  for (let i = 1; i <= n; i++) {
    hullPoint(t, i / n, 1, v);
    pts.push(new THREE.Vector2(v.z, v.y));
  }
  return pts;
}

/** Offset a 2D section inward by d (towards the centreline / mid-depth). */
export function offsetInward(pts: THREE.Vector2[], d: number, centre: THREE.Vector2) {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const tx = b.x - a.x;
    const ty = b.y - a.y;
    const len = Math.hypot(tx, ty) || 1;
    let nx = -ty / len;
    let ny = tx / len;
    if (nx * (centre.x - p.x) + ny * (centre.y - p.y) < 0) {
      nx = -nx;
      ny = -ny;
    }
    return new THREE.Vector2(p.x + nx * d, p.y + ny * d);
  });
}

export function frameCurve(t: number) {
  const pts: THREE.Vector3[] = [];
  const n = 14;
  for (let i = n; i >= 0; i--) pts.push(hullPoint(t, i / n, -1));
  for (let i = 1; i <= n; i++) pts.push(hullPoint(t, i / n, 1));
  // deck beam back to port
  const a = hullPoint(t, 1, 1);
  const b = hullPoint(t, 1, -1);
  for (let i = 1; i <= 6; i++) pts.push(a.clone().lerp(b, i / 6));
  return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.2);
}

export function longCurve(s: number, side: number) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 40; i++) pts.push(hullPoint((i / 40) * 0.97, s, side));
  return new THREE.CatmullRomCurve3(pts);
}

/** Shell surface; indices are ordered stern → bow so drawRange reveals it progressively. */
export function shellGeometry(nx = 64, ns = 22) {
  const pos: number[] = [];
  const v = new THREE.Vector3();
  const cols = ns * 2 + 1;
  for (let i = 0; i <= nx; i++) {
    const t = (i / nx) * 0.97;
    for (let j = 0; j < cols; j++) {
      const u = j / ns - 1; // -1..1
      hullPoint(t, Math.abs(u), Math.sign(u) || 1, v);
      pos.push(v.x, v.y, v.z);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < nx; i++)
    for (let j = 0; j < cols - 1; j++) {
      const a = i * cols + j;
      const b = a + cols;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return { geo: g, perColumn: (cols - 1) * 6, columns: nx };
}
