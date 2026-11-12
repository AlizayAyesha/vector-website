import * as THREE from "three";
import { ease } from "../timeline";
import { M, flat, segments, setOpacity, themes, tint, tubes, v3, type Track } from "./common";
import { qAt } from "./meta";

/**
 * SOLIDWORKS component assembly review, rebuilt shot by shot from Vector's recording:
 * race car with a transparent body (white viewport) → wood-tone tubular chassis reference → bushing → clevis →
 * mounting-profile sketch → frame in isolation (lavender-grey viewport) → mounting component → suspension arm →
 * red spring/damper → separated hardware → wheel assembly, exploded transparent and shaded → back to the car:
 * frame/body interfaces, rear packaging, links with the magenta disc, full car with the green rear wing.
 * Illustrative geometry; 1 unit = 1 m.
 */
const Q = (t: number) => qAt("mech", t);

const WOOD = 0xa5774c;

function latheX(pts: [number, number][], seg = 48) {
  // profile (radius, axial) revolved around the X axis
  const g = new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(r, a)), seg);
  g.rotateZ(-Math.PI / 2);
  return g;
}
function latheZ(pts: [number, number][], seg = 64) {
  const g = new THREE.LatheGeometry(pts.map(([r, a]) => new THREE.Vector2(r, a)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}
const edges = (m: THREE.Mesh, color = 0x1a1a1a, op = 0.55, th = 30) => {
  m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, th), M.line(op, color)));
  return m;
};

/* ---------------- car ---------------- */
function buildFrame(mat: THREE.Material) {
  const st = [
    { x: -1.3, yl: 0.12, yh: 0.42, wl: 0.16, wh: 0.14 },
    { x: -0.75, yl: 0.1, yh: 0.5, wl: 0.22, wh: 0.2 },
    { x: -0.2, yl: 0.1, yh: 0.55, wl: 0.26, wh: 0.24 },
    { x: 0.35, yl: 0.12, yh: 0.5, wl: 0.25, wh: 0.22 },
    { x: 0.85, yl: 0.14, yh: 0.42, wl: 0.2, wh: 0.16 },
    { x: 1.2, yl: 0.16, yh: 0.36, wl: 0.12, wh: 0.1 },
  ];
  const P: [THREE.Vector3, THREE.Vector3][] = [];
  const N = (i: number, hi: boolean, s: number) => v3(st[i].x, hi ? st[i].yh : st[i].yl, s * (hi ? st[i].wh : st[i].wl));
  for (let i = 0; i < st.length; i++) {
    for (const s of [-1, 1]) P.push([N(i, false, s), N(i, true, s)]);
    P.push([N(i, false, -1), N(i, false, 1)], [N(i, true, -1), N(i, true, 1)]);
    P.push(i % 2 ? [N(i, false, -1), N(i, true, 1)] : [N(i, false, 1), N(i, true, -1)]);
    if (i < st.length - 1)
      for (const s of [-1, 1]) {
        P.push([N(i, false, s), N(i + 1, false, s)], [N(i, true, s), N(i + 1, true, s)]);
        P.push(i % 2 ? [N(i, false, s), N(i + 1, true, s)] : [N(i, true, s), N(i + 1, false, s)]);
        P.push([N(i, false, s), N(i + 1, false, -s)]);
      }
  }
  // main hoop + front hoop + braces
  const hoop = (x: number, y0: number, top: number, w: number) => {
    const pts = Array.from({ length: 9 }, (_, k) => {
      const a = (k / 8) * Math.PI;
      return v3(x, y0 + Math.sin(a) * (top - y0), Math.cos(a) * w);
    });
    for (let k = 0; k < 8; k++) P.push([pts[k], pts[k + 1]]);
    return pts[4];
  };
  const mainTop = hoop(-0.2, 0.55, 1.0, 0.24);
  const frontTop = hoop(-0.75, 0.5, 0.72, 0.2);
  for (const s of [-1, 1]) P.push([mainTop, v3(0.6, 0.47, s * 0.22)], [frontTop.clone().setZ(s * 0.06), v3(-0.2, 0.92, s * 0.06)]);
  return tubes(P, 0.0125, mat, 7);
}

function buildBody(mat: THREE.Material) {
  // loft of super-ellipse sections along x
  const sec = [
    [-1.85, 0.03, 0.03, 0.2],
    [-1.6, 0.12, 0.1, 0.22],
    [-1.2, 0.2, 0.17, 0.3],
    [-0.75, 0.27, 0.24, 0.36],
    [-0.4, 0.42, 0.25, 0.38],
    [-0.1, 0.48, 0.3, 0.36],
    [0.3, 0.46, 0.3, 0.34],
    [0.75, 0.36, 0.22, 0.36],
    [1.15, 0.22, 0.13, 0.36],
    [1.35, 0.1, 0.06, 0.34],
  ];
  const NS = 28;
  const ring = (x: number, w: number, h: number, yc: number) =>
    Array.from({ length: NS }, (_, k) => {
      const a = (k / NS) * Math.PI * 2;
      const c = Math.cos(a), s = Math.sin(a);
      return v3(x, yc + Math.sign(s) * Math.pow(Math.abs(s), 0.6) * h, Math.sign(c) * Math.pow(Math.abs(c), 0.6) * w);
    });
  const rings = sec.map(([x, w, h, yc]) => ring(x, w, h, yc));
  const pos: number[] = [];
  for (let i = 0; i < rings.length - 1; i++)
    for (let k = 0; k < NS; k++) {
      const a = rings[i][k], b = rings[i + 1][k], c = rings[i + 1][(k + 1) % NS], d = rings[i][(k + 1) % NS];
      pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, d.x, d.y, d.z);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals();
  return new THREE.Mesh(g, mat);
}

type WheelMats = { tyre: THREE.MeshStandardMaterial; rim: THREE.MeshStandardMaterial; metal: THREE.MeshStandardMaterial; disc: THREE.MeshStandardMaterial; cal: THREE.MeshStandardMaterial };
function buildWheel(r: number, w: number, mats: WheelMats, detail: boolean) {
  const parts: Record<string, THREE.Object3D> = {};
  const tp: [number, number][] = [[r * 0.66, -w / 2]];
  for (let i = 0; i <= 16; i++) {
    const a = -Math.PI / 2 + (i / 16) * Math.PI;
    tp.push([r - 0.04 + Math.cos(a) * 0.04, (Math.sin(a) * w) / 2]);
  }
  tp.push([r * 0.66, w / 2]);
  parts.tyre = new THREE.Mesh(latheZ(tp.reverse(), detail ? 64 : 36), mats.tyre);
  const rim = new THREE.Group();
  rim.add(new THREE.Mesh(latheZ([[r * 0.64, -w / 2 + 0.005], [r * 0.66, -w / 2], [r * 0.6, -w / 4], [r * 0.6, w / 4], [r * 0.66, w / 2], [r * 0.64, w / 2 - 0.005]], 48), mats.rim));
  const face = new THREE.Shape();
  face.absarc(0, 0, r * 0.62, 0, Math.PI * 2, false);
  const n = 10;
  for (let s = 0; s < n; s++) {
    const a0 = (s / n) * Math.PI * 2 + 0.1, a1 = ((s + 1) / n) * Math.PI * 2 - 0.1;
    const h = new THREE.Path();
    h.absarc(0, 0, r * 0.56, a0, a1, false);
    h.absarc(0, 0, r * 0.2, a1, a0, true);
    face.holes.push(h);
  }
  const hh = new THREE.Path();
  hh.absarc(0, 0, r * 0.07, 0, Math.PI * 2, true);
  face.holes.push(hh);
  const fm = new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: 0.012, bevelEnabled: false, curveSegments: 32 }), mats.rim);
  fm.position.z = w * 0.18;
  rim.add(fm);
  parts.rim = rim;
  if (detail) {
    parts.hub = new THREE.Mesh(latheZ([[0.001, -0.05], [0.045, -0.05], [0.045, -0.005], [0.07, -0.005], [0.07, 0.008], [0.03, 0.03], [0.001, 0.03]], 32), mats.metal);
    const d = new THREE.Shape();
    d.absarc(0, 0, r * 0.5, 0, Math.PI * 2, false);
    const di = new THREE.Path();
    di.absarc(0, 0, r * 0.22, 0, Math.PI * 2, true);
    d.holes.push(di);
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, rr = r * (i % 2 ? 0.42 : 0.36);
      const h = new THREE.Path();
      h.absarc(Math.cos(a) * rr, Math.sin(a) * rr, 0.004, 0, Math.PI * 2, true);
      d.holes.push(h);
    }
    parts.disc = new THREE.Mesh(new THREE.ExtrudeGeometry(d, { depth: 0.01, bevelEnabled: false, curveSegments: 40 }), mats.disc);
    parts.disc.position.z = -0.04;
    const c = new THREE.Shape();
    c.absarc(0, 0, r * 0.56, Math.PI * 0.3, Math.PI * 0.62, false);
    c.absarc(0, 0, r * 0.34, Math.PI * 0.62, Math.PI * 0.3, true);
    parts.caliper = new THREE.Mesh(new THREE.ExtrudeGeometry(c, { depth: 0.045, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 1 }), mats.cal);
    parts.caliper.position.z = -0.06;
    // upright behind (grey triangle)
    const u = new THREE.Shape();
    u.moveTo(-0.05, -0.16);
    u.lineTo(0.05, -0.16);
    u.lineTo(0.03, 0.17);
    u.lineTo(-0.03, 0.17);
    u.closePath();
    const uh = new THREE.Path();
    uh.absarc(0, 0, 0.035, 0, Math.PI * 2, true);
    u.holes.push(uh);
    parts.upright = new THREE.Mesh(new THREE.ExtrudeGeometry(u, { depth: 0.02, bevelEnabled: false }), mats.metal);
    parts.upright.position.z = -0.1;
  }
  const g = new THREE.Group();
  Object.values(parts).forEach((p) => g.add(p));
  return { group: g, parts };
}

export function createMechTrack(): Track {
  const group = new THREE.Group();

  /* car: frame, transparent body, wheels, wings, suspension */
  const car = new THREE.Group();
  const carFrameMat = flat(WOOD, { transparent: true, roughness: 0.6 });
  const carFrame = buildFrame(carFrameMat);
  car.add(carFrame);
  const bodyMat = flat(0xc4c8d0, { transparent: true, opacity: 0.32, depthWrite: false, side: THREE.DoubleSide, roughness: 0.3 });
  const body = buildBody(bodyMat);
  car.add(body);
  const carWheelMats: WheelMats = { tyre: flat(0x9b9ea6, { transparent: true }), rim: flat(0x1d1f24, { transparent: true }), metal: flat(0x8d9096, { transparent: true }), disc: flat(0x6d7077, { transparent: true }), cal: flat(0x6d7077, { transparent: true }) };
  const rearDiscMat = flat(0xc93bd0, { emissive: 0x4a0b50, transparent: true });
  const wheels: THREE.Group[] = [];
  for (const [x, rr, ww] of [[-1.05, 0.25, 0.2], [0.95, 0.26, 0.24]] as [number, number, number][])
    for (const s of [-1, 1]) {
      const w = buildWheel(rr, ww, carWheelMats, false).group;
      w.position.set(x, rr, s * 0.62);
      if (s < 0) w.rotation.y = Math.PI;
      car.add(w);
      wheels.push(w);
      if (x > 0) {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 32), rearDiscMat);
        disc.rotation.x = Math.PI / 2;
        disc.position.set(x, rr, s * 0.46);
        car.add(disc);
      }
    }
  const wingMat = flat(0x7f8f48, { transparent: true });
  const wing = new THREE.Group();
  for (const s of [-1, 1]) wing.add(edges(new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.42, 0.012).translate(0, 0, s * 0.36), wingMat), 0x2a3315, 0.6));
  for (const [y, a] of [[0.86, 0.15], [1.0, 0.45]]) {
    const e = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.012, 0.72), wingMat);
    e.position.y = y - 0.82;
    e.rotation.z = a;
    wing.add(e);
  }
  wing.position.set(1.42, 0.82, 0);
  car.add(wing);
  const fw = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 1.25), flat(0x2a2c31, { transparent: true }));
  fw.position.set(-1.72, 0.08, 0);
  car.add(fw);
  const linkMat = flat(0x141518, { transparent: true });
  const links: [THREE.Vector3, THREE.Vector3][] = [];
  for (const [x, wx] of [[-0.75, -1.05], [0.85, 0.95]])
    for (const s of [-1, 1]) {
      const hub = v3(wx, 0.25, s * 0.5);
      links.push([v3(x - 0.18, 0.13, s * 0.2), hub], [v3(x + 0.18, 0.13, s * 0.2), hub], [v3(x - 0.18, 0.4, s * 0.2), hub.clone().setY(0.36)], [v3(x + 0.18, 0.4, s * 0.2), hub.clone().setY(0.36)], [v3(x, 0.5, s * 0.18), hub.clone().setY(0.18)]);
    }
  car.add(tubes(links, 0.009, linkMat, 6));
  group.add(car);

  /* frame isolation extras: grey floor / side panels */
  const panelMat = flat(0x9fa2aa, { transparent: true, side: THREE.DoubleSide });
  const panels = new THREE.Group();
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.42), panelMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(-0.05, 0.1, 0);
  panels.add(floor);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.3), panelMat);
    side.position.set(-0.45, 0.28, s * 0.25);
    panels.add(side);
  }
  car.add(panels);

  /* isolated components (opened as separate parts in the recording) */
  const parts: Record<string, THREE.Group> = {};
  const mk = (name: string) => {
    const g = new THREE.Group();
    g.visible = false;
    group.add(g);
    parts[name] = g;
    return g;
  };
  // bushing: tube with internal bore + flange
  {
    const g = mk("bushing");
    const m = edges(new THREE.Mesh(latheX([[0.011, -0.03], [0.022, -0.03], [0.022, -0.026], [0.018, -0.022], [0.018, 0.03], [0.011, 0.03], [0.011, -0.03]], 64), flat(0x8e9db3, { side: THREE.DoubleSide, transparent: true })), 0x1b2433, 0.5, 20);
    g.add(m);
  }
  // clevis: forked part with aligned holes
  {
    const g = mk("clevis");
    const mat = flat(0xa7a9ae, { transparent: true });
    const ear = new THREE.Shape();
    ear.moveTo(-0.018, 0);
    ear.lineTo(-0.018, 0.04);
    ear.absarc(0, 0.04, 0.018, Math.PI, 0, true);
    ear.lineTo(0.018, 0);
    ear.closePath();
    const h = new THREE.Path();
    h.absarc(0, 0.04, 0.0075, 0, Math.PI * 2, true);
    ear.holes.push(h);
    for (const z of [-0.016, 0.01]) {
      const e = edges(new THREE.Mesh(new THREE.ExtrudeGeometry(ear, { depth: 0.006, bevelEnabled: false, curveSegments: 24 }), mat));
      e.position.z = z;
      g.add(e);
    }
    const base = edges(new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.016, 0.034).translate(0, -0.008, -0.001), mat));
    g.add(base);
    const stem = edges(new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.04, 24).translate(0, -0.036, -0.001), mat));
    g.add(stem);
    g.position.y = -0.01;
  }
  // mounting profile sketch: single tab with a hole (sketch lines on the front plane)
  {
    const g = mk("sketch");
    const pts: THREE.Vector3[] = [];
    const tab = new THREE.Shape();
    tab.moveTo(-0.03, -0.03);
    tab.lineTo(0.03, -0.03);
    tab.lineTo(0.03, 0.02);
    tab.absarc(0, 0.02, 0.03, 0, Math.PI, false);
    tab.lineTo(-0.03, -0.03);
    tab.getPoints(40).forEach((p, i, a) => i && pts.push(v3(a[i - 1].x, a[i - 1].y, 0), v3(p.x, p.y, 0)));
    const circ = new THREE.Path();
    circ.absarc(0, 0.02, 0.011, 0, Math.PI * 2, false);
    circ.getPoints(40).forEach((p, i, a) => i && pts.push(v3(a[i - 1].x, a[i - 1].y, 0), v3(p.x, p.y, 0)));
    // centre marks
    pts.push(v3(-0.016, 0.02, 0), v3(0.016, 0.02, 0), v3(0, 0.004, 0), v3(0, 0.036, 0));
    g.add(segments(pts, M.line(1, 0x1f3fbf)));
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.11), flat(0xd8dae6, { transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false }));
    plane.position.set(0, 0.005, -0.001);
    g.add(plane);
    g.add(segments([v3(-0.055, -0.05, 0), v3(0.055, -0.05, 0), v3(0.055, -0.05, 0), v3(0.055, 0.06, 0), v3(0.055, 0.06, 0), v3(-0.055, 0.06, 0), v3(-0.055, 0.06, 0), v3(-0.055, -0.05, 0)], M.line(0.6, 0x6b7280)));
  }
  // mounting component: triangular upright with holes
  {
    const g = mk("upright");
    const s = new THREE.Shape();
    s.moveTo(-0.07, -0.08);
    s.lineTo(0.07, -0.08);
    s.lineTo(0.015, 0.11);
    s.lineTo(-0.015, 0.11);
    s.closePath();
    for (const [x, y, r] of [[0, -0.03, 0.028], [-0.045, -0.065, 0.006], [0.045, -0.065, 0.006], [0, 0.09, 0.007]]) {
      const h = new THREE.Path();
      h.absarc(x, y, r, 0, Math.PI * 2, true);
      s.holes.push(h);
    }
    g.add(edges(new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: 0.018, bevelEnabled: true, bevelSize: 0.002, bevelThickness: 0.002, bevelSegments: 1, curveSegments: 24 }), flat(0xa3a6ad, { transparent: true }))));
  }
  // suspension arm assembly: wishbone rods, rod ends, rocker plate
  {
    const g = mk("arm");
    const rodMat = flat(0x2a2c31, { transparent: true });
    g.add(tubes([[v3(-0.25, 0, -0.12), v3(0.18, 0.02, 0)], [v3(-0.25, 0, 0.12), v3(0.18, 0.02, 0)], [v3(0.18, 0.02, 0), v3(0.24, 0.02, 0)]], 0.007, rodMat, 10));
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.004, 0.09), flat(0xa7a9ae, { transparent: true }));
    plate.position.set(-0.08, 0.06, 0);
    plate.rotation.z = 0.25;
    g.add(edges(plate));
    for (const p of [v3(-0.25, 0, -0.12), v3(-0.25, 0, 0.12), v3(0.24, 0.02, 0)]) {
      const e = new THREE.Mesh(new THREE.TorusGeometry(0.011, 0.004, 8, 20), flat(0x6b6e75, { transparent: true }));
      e.position.copy(p);
      g.add(e);
    }
  }
  // spring and damper
  {
    const g = mk("damper");
    const red = flat(0x8e1820, { transparent: true, roughness: 0.4, metalness: 0.3 });
    const helix: THREE.Vector3[] = [];
    for (let i = 0; i <= 260; i++) {
      const t = i / 260;
      const a = t * Math.PI * 2 * 7;
      helix.push(v3(-0.07 + t * 0.15, Math.cos(a) * 0.026, Math.sin(a) * 0.026));
    }
    g.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix), 400, 0.0045, 8), red));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.12, 24).rotateZ(Math.PI / 2).translate(0.03, 0, 0), flat(0x151618, { transparent: true })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.07, 24).rotateZ(Math.PI / 2).translate(0.04, 0.042, 0), flat(0x151618, { transparent: true })));
    g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 12).rotateZ(Math.PI / 2).translate(-0.08, 0, 0), flat(0xb8bbc2, { transparent: true })));
    for (const x of [-0.14, 0.11]) {
      const eye = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.006, 10, 24), red);
      eye.position.set(x, 0, 0);
      g.add(eye);
    }
  }
  // connection hardware: hub with lobes + separated nuts
  {
    const g = mk("hardware");
    const mat = flat(0x9a9da4, { transparent: true });
    g.add(edges(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 32).translate(0, 0.05, 0), mat)));
    for (let k = 0; k < 3; k++) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.06, 20), mat);
      const a = (k / 3) * Math.PI * 2;
      l.position.set(Math.cos(a) * 0.028, 0.055, Math.sin(a) * 0.028);
      g.add(edges(l));
    }
    g.add(edges(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.006, 40).translate(0, 0.012, 0), mat)));
    g.add(edges(new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 24).translate(0, -0.02, 0), mat)));
    for (const [x, y] of [[-0.02, -0.08], [0.025, -0.085]]) {
      const nut = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.012, 6), mat);
      nut.position.set(x, y, 0);
      g.add(edges(nut));
    }
  }
  // wheel showcase (exploded, transparent / shaded)
  const wsMats: WheelMats = { tyre: flat(0x9a9da6, { transparent: true }), rim: flat(0x3d4048, { transparent: true }), metal: flat(0x9a9da4, { transparent: true }), disc: flat(0x80838a, { transparent: true }), cal: flat(0xc0a060, { transparent: true }) };
  const ws = mk("wheel");
  const wheel = buildWheel(0.26, 0.24, wsMats, true);
  ws.add(wheel.group);
  const wsEdges: THREE.LineSegments[] = [];
  wheel.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 25), M.line(0, 0x2a2c33));
      m.add(e);
      wsEdges.push(e);
    }
  });
  const axis = segments([v3(0, 0, -0.6), v3(0, 0, 0.6), v3(-0.25, -0.3, 0), v3(0.25, -0.3, 0)], M.line(0.5, 0x4b5563));
  ws.add(axis);
  const offsets: Record<string, number> = { tyre: 0.42, rim: 0.2, hub: 0.02, disc: -0.14, caliper: -0.22, upright: -0.34 };

  const anchors = {
    m232: { pos: v3(-0.2, 1.0, 0), vis: 0 },
    mbore: { pos: v3(0.03, 0, 0.011), vis: 0 },
    mhole: { pos: v3(0, 0.03, 0.016), vis: 0 },
    mtab: { pos: v3(0.03, -0.01, 0), vis: 0 },
    mdisc: { pos: v3(0, -0.12, -0.14), vis: 0 },
  };

  /* camera path */
  const C = [0, 0.35, 0] as [number, number, number];
  const keys = [
    { q: 0, target: C, r: 5.2, th: 0.95, el: 0.32 }, // inside the assembly
    { q: Q(10), target: C, r: 5.0, th: 1.35, el: 0.3 },
    { q: Q(12), target: [0, 0.4, 0], r: 4.3, th: 0.75, el: 0.42 }, // chassis reference
    { q: Q(25.5), target: [0, 0.45, 0], r: 4.0, th: 1.25, el: 0.38 },
    { q: Q(26.5), target: [0, 0, 0], r: 0.2, th: 0.7, el: 0.35 }, // bushing
    { q: Q(29.5), target: [0, 0, 0], r: 0.19, th: 1.1, el: 0.3 },
    { q: Q(30.5), target: [0, 0.01, 0], r: 0.24, th: 0.5, el: 0.3 }, // clevis
    { q: Q(33.5), target: [0, 0.01, 0], r: 0.22, th: 0.85, el: 0.25 },
    { q: Q(34.5), target: [0, 0.005, 0], r: 0.22, th: 0.02, el: 0.02 }, // sketch (normal to plane)
    { q: Q(38.5), target: [0, 0.005, 0], r: 0.21, th: 0.02, el: 0.02 },
    { q: Q(39.5), target: [-0.1, 0.35, 0], r: 3.6, th: 2.2, el: 0.5 }, // frame in isolation
    { q: Q(41.5), target: [-0.1, 0.35, 0], r: 3.4, th: 2.5, el: 0.45 },
    { q: Q(42.5), target: [0, 0.01, 0.01], r: 0.42, th: 0.35, el: 0.15 }, // mounting component
    { q: Q(45.5), target: [0, 0.01, 0.01], r: 0.4, th: 0.65, el: 0.15 },
    { q: Q(46.5), target: [0, 0.02, 0], r: 0.75, th: 0.55, el: 0.5 }, // arm
    { q: Q(49.5), target: [0, 0.02, 0], r: 0.7, th: 0.8, el: 0.45 },
    { q: Q(50.5), target: [0, 0.01, 0], r: 0.38, th: 0.45, el: 0.35 }, // damper
    { q: Q(52.5), target: [0, 0.01, 0], r: 0.36, th: 0.6, el: 0.3 },
    { q: Q(53.5), target: [0, 0, 0], r: 0.32, th: 0.4, el: 0.12 }, // hardware
    { q: Q(55.5), target: [0, 0, 0], r: 0.3, th: 0.55, el: 0.12 },
    { q: Q(56.5), target: [0, 0, 0], r: 0.95, th: 0.5, el: 0.1 }, // wheel + internals
    { q: Q(59.5), target: [0, 0, 0.02], r: 1.9, th: -0.75, el: 0.22 }, // exploded transparent
    { q: Q(66), target: [0, 0, 0.02], r: 1.85, th: -0.85, el: 0.24 },
    { q: Q(68), target: [0, 0, -0.08], r: 1.5, th: -1.05, el: 0.2 }, // component stack
    { q: Q(72), target: [0, 0, -0.08], r: 1.45, th: -1.15, el: 0.2 },
    { q: Q(74), target: [0, 0, 0], r: 1.15, th: 0.15, el: 0.08 }, // assembled, new orientation
    { q: Q(77), target: [0, 0, 0], r: 1.1, th: 0.35, el: 0.85 },
    { q: Q(79), target: [0, 0, 0.02], r: 1.6, th: -0.55, el: 0.18 }, // exploded shaded
    { q: Q(82), target: [0, -0.02, -0.1], r: 0.95, th: -0.8, el: 0.15 }, // internal interfaces
    { q: Q(88), target: [0, -0.02, -0.1], r: 0.9, th: -0.95, el: 0.15 },
    { q: Q(90), target: [0, 0, 0], r: 1.1, th: 2.4, el: 0.18 }, // complete wheel, other side
    { q: Q(93.5), target: [0, 0, 0], r: 1.1, th: 2.6, el: 0.2 },
    { q: Q(95), target: [-0.3, 0.42, 0], r: 2.9, th: 1.15, el: 0.2 }, // frame and body interfaces
    { q: Q(102), target: [-0.1, 0.42, 0], r: 2.8, th: 1.4, el: 0.18 },
    { q: Q(104), target: [0.75, 0.4, 0.15], r: 2.5, th: 1.1, el: 0.16 }, // rear packaging
    { q: Q(107.5), target: [0.8, 0.4, 0.15], r: 2.4, th: 1.2, el: 0.16 },
    { q: Q(109), target: [0.9, 0.3, 0.3], r: 1.35, th: 1.2, el: 0.14 }, // links + magenta disc
    { q: Q(114.5), target: [0.9, 0.3, 0.3], r: 1.3, th: 1.35, el: 0.14 },
    { q: Q(117.5), target: C, r: 4.6, th: 0.85, el: 0.3 }, // back to the assembly
    { q: 1, target: C, r: 5.0, th: 0.7, el: 0.3 },
  ] as Track["keys"];

  const theme = themes([
    { q: 0, top: "#ffffff", bottom: "#dedfea", light: true }, // SOLIDWORKS white → lavender
    { q: Q(39), top: "#c9cbd6", bottom: "#b5b8c6", light: true }, // assembly detail: lavender grey
    { q: Q(94), top: "#ffffff", bottom: "#e2e3ec", light: true },
  ]);

  const vis = (q: number, a: number, b: number, f = 0.5) => (a <= 0 ? 1 : ease(Q(a - f / 2), Q(a + f / 2), q)) * (b >= 120 ? 1 : 1 - ease(Q(b - f / 2), Q(b + f / 2), q));

  const update = (q: number) => {
    const carK = Math.max(vis(q, 0, 11), vis(q, 94, 120));
    const frameK = Math.max(carK, vis(q, 11, 26), vis(q, 39, 42));
    car.visible = frameK > 0.01;
    setOpacity(carFrame, frameK);
    bodyMat.opacity = 0.32 * carK;
    body.visible = carK > 0.01;
    wheels.forEach((w) => setOpacity(w, carK));
    setOpacity(wing, carK);
    setOpacity(fw, carK);
    setOpacity(panels, vis(q, 39, 42));
    tint(rearDiscMat, 0x6d7077, 0xc93bd0, ease(Q(107.5), Q(108.5), q));
    car.children.forEach((c) => {
      if (c === carFrame || c === body || c === panels) return;
      if (wheels.includes(c as THREE.Group) || c === wing || c === fw) return;
      setOpacity(c, carK);
    });

    const show = (n: string, a: number, b: number) => {
      const k = vis(q, a, b);
      parts[n].visible = k > 0.01;
      if (parts[n].visible) setOpacity(parts[n], k);
    };
    show("bushing", 26, 30);
    show("clevis", 30, 34);
    show("sketch", 34, 39);
    show("upright", 42, 46);
    show("arm", 46, 50);
    show("damper", 50, 53);
    show("hardware", 53, 56);
    show("wheel", 56, 94);

    if (parts.wheel.visible) {
      // explode amount along the wheel axis, and display mode (transparent ↔ shaded)
      const ex = ease(Q(59), Q(61.5), q) * (1 - ease(Q(72.5), Q(74), q)) + ease(Q(78), Q(79.5), q) * (1 - ease(Q(88.5), Q(90), q));
      const stack = ease(Q(67), Q(69), q) * (1 - ease(Q(72.5), Q(74), q)) + ease(Q(81), Q(83), q) * (1 - ease(Q(88.5), Q(90), q));
      for (const [n, p] of Object.entries(wheel.parts)) p.position.z = (n === "disc" ? -0.04 : n === "caliper" ? -0.06 : n === "upright" ? -0.1 : 0) + ex * (offsets[n] ?? 0) * (1 + stack * 0.6);
      const transparent = ease(Q(59), Q(60.5), q) * (1 - ease(Q(72.5), Q(74), q));
      const k = vis(q, 56, 94);
      for (const m of Object.values(wsMats)) m.opacity = k * (1 - 0.82 * transparent);
      wsEdges.forEach((e) => ((e.material as THREE.LineBasicMaterial).opacity = k * (0.15 + 0.7 * transparent)));
      const shaded = ease(Q(78), Q(79), q) * (1 - ease(Q(88.5), Q(90), q));
      tint(wsMats.rim, 0x3d4048, 0x2f55c8, shaded);
      setOpacity(axis, ex * k);
    }

    const on = (a: number, b: number) => ease(Q(a), Q(a + 0.6), q) * (1 - ease(Q(b - 0.6), Q(b), q));
    anchors.m232.vis = on(22.5, 26);
    anchors.mbore.vis = on(27, 30);
    anchors.mhole.vis = on(31, 34);
    anchors.mtab.vis = on(35, 39);
    anchors.mdisc.vis = on(82, 89);
  };

  return {
    group,
    keys,
    anchors,
    unit: 1,
    fog: [20, 40],
    update,
    theme,
    stats: () => ({}),
  };
}
