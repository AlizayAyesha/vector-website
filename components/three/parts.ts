import * as THREE from "three";

/** Scene units: 1 unit = 40 mm. */
export const MM = 1 / 40;

export type BracketParams = {
  length: number; // mm, base length
  holes: number; // 0..4 base holes
  ribs: number; // 0..2 gussets
};

const W = 60 * MM; // base width
const T = 8 * MM; // plate thickness
const H = 70 * MM; // flange height

function circle(path: THREE.Path, x: number, y: number, r: number) {
  path.absarc(x, y, r, 0, Math.PI * 2, true);
  return path;
}

/** Original L-bracket generator: base plate + upright flange + optional holes and ribs. */
export function bracketGeometries(p: BracketParams): THREE.BufferGeometry[] {
  const L = p.length * MM;
  const out: THREE.BufferGeometry[] = [];

  // Base plate, drawn in XY then rotated so it lies in XZ.
  const base = new THREE.Shape();
  base.moveTo(0, -W / 2);
  base.lineTo(L, -W / 2);
  base.lineTo(L, W / 2);
  base.lineTo(0, W / 2);
  base.lineTo(0, -W / 2);
  const holeR = 4.5 * MM;
  const xs = [L - 14 * MM, L * 0.55 + 4 * MM];
  const zs = [-W / 2 + 14 * MM, W / 2 - 14 * MM];
  let n = 0;
  for (const x of xs)
    for (const z of zs) {
      if (n++ < p.holes) base.holes.push(circle(new THREE.Path(), x, z, holeR));
    }
  const baseGeo = new THREE.ExtrudeGeometry(base, { depth: T, bevelEnabled: false, curveSegments: 20 });
  baseGeo.rotateX(Math.PI / 2);
  baseGeo.translate(0, T, 0);
  out.push(baseGeo);

  // Upright flange with a bore.
  const fl = new THREE.Shape();
  fl.moveTo(-W / 2, 0);
  fl.lineTo(W / 2, 0);
  fl.lineTo(W / 2, H - 10 * MM);
  fl.quadraticCurveTo(W / 2, H, W / 2 - 10 * MM, H);
  fl.lineTo(-W / 2 + 10 * MM, H);
  fl.quadraticCurveTo(-W / 2, H, -W / 2, H - 10 * MM);
  fl.lineTo(-W / 2, 0);
  fl.holes.push(circle(new THREE.Path(), 0, H * 0.62, 11 * MM));
  const flGeo = new THREE.ExtrudeGeometry(fl, { depth: T, bevelEnabled: false, curveSegments: 24 });
  flGeo.rotateY(-Math.PI / 2);
  flGeo.translate(T, 0, 0);
  out.push(flGeo);

  // Gussets.
  const R = Math.min(34 * MM, L * 0.35);
  const ribT = 5 * MM;
  const ribZ = p.ribs >= 2 ? [-W / 2 + 6 * MM, W / 2 - 6 * MM - ribT] : p.ribs === 1 ? [-ribT / 2] : [];
  for (const z of ribZ) {
    const s = new THREE.Shape();
    s.moveTo(T, T);
    s.lineTo(T + R, T);
    s.lineTo(T, T + R);
    s.lineTo(T, T);
    const g = new THREE.ExtrudeGeometry(s, { depth: ribT, bevelEnabled: false });
    g.translate(0, 0, z);
    out.push(g);
  }

  // Centre on the origin.
  for (const g of out) g.translate(-L / 2, -H / 2, 0);
  return out;
}

export const BRACKET = { W, T, H };

export type Look = { face: THREE.Material; edge: THREE.LineBasicMaterial };

export function makeLook(edgeOpacity = 0.9): Look {
  return {
    face: new THREE.MeshStandardMaterial({
      color: 0x0c0c0d,
      roughness: 0.55,
      metalness: 0.2,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    }),
    edge: new THREE.LineBasicMaterial({ color: 0xf4f4f5, transparent: true, opacity: edgeOpacity }),
  };
}

/** Solid dark faces + crisp white feature edges (hidden-line look). */
export function solid(geo: THREE.BufferGeometry, look: Look, threshold = 24) {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(geo, look.face));
  g.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), look.edge));
  return g;
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    m.geometry?.dispose?.();
  });
  g.clear();
}

/** Faint dotted floor that fades into fog. */
export function dotFloor(size = 18, step = 0.35, y = -1.4) {
  const pts: number[] = [];
  for (let x = -size / 2; x <= size / 2; x += step)
    for (let z = -size / 2; z <= size / 2; z += step) pts.push(x, y, z);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const mat = new THREE.PointsMaterial({ color: 0x8a8a92, size: 0.025, sizeAttenuation: true, transparent: true, opacity: 0.55 });
  return new THREE.Points(geo, mat);
}

export function lights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 1.2);
  rim.position.set(-6, 2, -4);
  scene.add(rim);
}
