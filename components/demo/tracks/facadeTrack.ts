import * as THREE from "three";
import { ease, lin } from "../timeline";
import { M, contactShadow, dimension, reveal, segments, setOpacity, v3, withEdges, type Track } from "./common";

/**
 * Façade: concept → component model (after Vector's "Façade review · Rhino 8" recording).
 * Curved, faceted curtain wall: glazing, spandrels, mullions, transoms, slab edges, then a
 * selected bay exploded into its layered assembly. Sample data. 1 unit = 1 m.
 */
const BAYS = 12;
const BAY_W = 1.5;
const FLOORS = 5;
const FH = 3.6;
const SPANDREL = 1.0;
const SEL = { bay: 6, floor: 2 };

const zOf = (x: number) => 1.4 * Math.sin(0.32 * x) + 0.5 * Math.sin(0.8 * x + 1);
const X0 = (-BAYS * BAY_W) / 2;
const xs = Array.from({ length: BAYS + 1 }, (_, i) => X0 + i * BAY_W);
const P = (x: number, y: number) => v3(x, y, zOf(x));


export function createFacadeTrack(): Track {
  const group = new THREE.Group();
  const H = FLOORS * FH;

  /* concept wireframe on the continuous surface */
  const wire: THREE.Vector3[] = [];
  for (let x = X0; x <= -X0 + 1e-6; x += 0.75) wire.push(P(x, 0), P(x, H));
  for (let y = 0; y <= H + 1e-6; y += 1.2) for (let x = X0; x < -X0 - 1e-6; x += 0.25) wire.push(P(x, y), P(x + 0.25, y));
  const concept = segments(wire, M.line(0.6, 0xd4d4d8));
  group.add(concept);

  /* slabs behind the façade (context) */
  const slabMat = new THREE.MeshStandardMaterial({ color: 0x1d1d20, metalness: 0.2, roughness: 0.8 });
  const slabs: THREE.Mesh[] = [];
  for (let f = 0; f <= FLOORS; f++) {
    const front: THREE.Vector2[] = [];
    for (let x = X0; x <= -X0 + 1e-6; x += 0.5) front.push(new THREE.Vector2(x, -(zOf(x) - 0.35)));
    const sh = new THREE.Shape([...front, new THREE.Vector2(-X0, 7), new THREE.Vector2(X0, 7)]);
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.28, bevelEnabled: false });
    g.rotateX(-Math.PI / 2);
    g.translate(0, f * FH - 0.28, 0);
    const m = new THREE.Mesh(g, slabMat.clone());
    withEdges(m, 30, 0.35);
    slabs.push(m);
    group.add(m);
  }

  /* panels (instanced) */
  const unit = new THREE.BoxGeometry(1, 1, 1);
  const glassMat = M.glass();
  const spMat = new THREE.MeshStandardMaterial({ color: 0x2c2c31, metalness: 0.45, roughness: 0.4, transparent: true });
  const glass = new THREE.InstancedMesh(unit, glassMat, BAYS * FLOORS);
  const span = new THREE.InstancedMesh(unit, spMat, BAYS * FLOORS);
  const m4 = new THREE.Matrix4();
  const q4 = new THREE.Quaternion();
  const s3 = new THREE.Vector3();
  const frameOf = (bay: number) => {
    const a = P(xs[bay], 0);
    const b = P(xs[bay + 1], 0);
    const t = b.clone().sub(a);
    const w = t.length();
    t.normalize();
    const n = new THREE.Vector3(t.z, 0, -t.x); // outward (+z side)
    if (n.z < 0) n.negate();
    const c = a.clone().lerp(b, 0.5);
    const rot = new THREE.Matrix4().makeBasis(t, v3(0, 1, 0), n);
    return { c, t, n, w, q: new THREE.Quaternion().setFromRotationMatrix(rot) };
  };
  const frames = Array.from({ length: BAYS }, (_, i) => frameOf(i));
  let gi = 0;
  for (let f = 0; f < FLOORS; f++)
    for (let b = 0; b < BAYS; b++) {
      const fr = frames[b];
      const y0 = f * FH;
      m4.compose(fr.c.clone().setY(y0 + SPANDREL + (FH - SPANDREL) / 2), fr.q, s3.set(fr.w - 0.08, FH - SPANDREL - 0.08, 0.03));
      glass.setMatrixAt(gi, m4);
      m4.compose(fr.c.clone().setY(y0 + SPANDREL / 2).addScaledVector(fr.n, -0.02), fr.q, s3.set(fr.w - 0.08, SPANDREL - 0.08, 0.05));
      span.setMatrixAt(gi, m4);
      gi++;
    }
  glass.count = span.count = 0;
  glass.frustumCulled = span.frustumCulled = false;
  group.add(span, glass);

  /* mullions (grow from ground) and transoms */
  const profMat = new THREE.MeshStandardMaterial({ color: 0x9c9ca3, metalness: 0.6, roughness: 0.38, transparent: true });
  const mull = new THREE.InstancedMesh(unit, profMat, BAYS + 1);
  const mullBase: { p: THREE.Vector3; q: THREE.Quaternion }[] = [];
  for (let i = 0; i <= BAYS; i++) {
    const a = frames[Math.min(i, BAYS - 1)];
    const b = frames[Math.max(i - 1, 0)];
    const n = a.n.clone().add(b.n).normalize();
    const t = new THREE.Vector3(-n.z, 0, n.x);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(t, v3(0, 1, 0), n));
    mullBase.push({ p: P(xs[i], 0).addScaledVector(n, 0.06), q });
  }
  mull.frustumCulled = false;
  group.add(mull);
  const tran = new THREE.InstancedMesh(unit, profMat, BAYS * (FLOORS * 2 + 1));
  let ti = 0;
  for (let f = 0; f <= FLOORS; f++)
    for (const yy of f < FLOORS ? [f * FH, f * FH + SPANDREL] : [f * FH])
      for (let b = 0; b < BAYS; b++) {
        const fr = frames[b];
        m4.compose(fr.c.clone().setY(yy).addScaledVector(fr.n, 0.06), fr.q, s3.set(fr.w, 0.06, 0.13));
        tran.setMatrixAt(ti++, m4);
      }
  tran.count = 0;
  tran.frustumCulled = false;
  const tranTotal = ti;
  group.add(tran);

  /* selected bay + exploded layered assembly */
  const fr = frames[SEL.bay];
  const by = SEL.floor * FH;
  const selBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(fr.w + 0.3, FH + 0.3, 1.2)), M.dashed(0, 0xffffff));
  selBox.computeLineDistances();
  selBox.position.copy(fr.c).setY(by + FH / 2);
  selBox.quaternion.copy(fr.q);
  group.add(selBox);

  const detail = new THREE.Group();
  detail.position.copy(fr.c).setY(by);
  detail.quaternion.copy(fr.q);
  group.add(detail);
  type Part = { obj: THREE.Object3D; dir: THREE.Vector3 };
  const parts: Part[] = [];
  const addPart = (mesh: THREE.Mesh, dir: THREE.Vector3, edges = true) => {
    if (edges) withEdges(mesh, 25, 0.7);
    detail.add(mesh);
    parts.push({ obj: mesh, dir });
  };
  const gw = fr.w - 0.12;
  // IGU: two panes + spacer
  for (const [z, d] of [
    [0.05, 1.5],
    [0.02, 1.1],
  ] as const) {
    const pane = new THREE.Mesh(new THREE.BoxGeometry(gw, FH - SPANDREL - 0.12, 0.012), M.glass());
    pane.position.set(0, SPANDREL + (FH - SPANDREL) / 2, z);
    addPart(pane, v3(0, 0, d));
  }
  const spacer = new THREE.Mesh(new THREE.BoxGeometry(gw - 0.04, FH - SPANDREL - 0.16, 0.02), M.dark());
  spacer.position.set(0, SPANDREL + (FH - SPANDREL) / 2, 0.035);
  (spacer.geometry as THREE.BoxGeometry).computeBoundingBox();
  addPart(spacer, v3(0, 0, 1.3));
  const spandrel = new THREE.Mesh(new THREE.BoxGeometry(gw, SPANDREL - 0.12, 0.04), spMat.clone());
  spandrel.position.set(0, SPANDREL / 2, 0.03);
  addPart(spandrel, v3(0, 0, 1.0));
  // mullion profile: hollow box + isolator + pressure plate + cap
  const mullShape = () => {
    const s = new THREE.Shape([new THREE.Vector2(-0.04, 0.02), new THREE.Vector2(0.04, 0.02), new THREE.Vector2(0.04, 0.22), new THREE.Vector2(-0.04, 0.22)]);
    s.holes.push(new THREE.Path([new THREE.Vector2(-0.028, 0.035), new THREE.Vector2(0.028, 0.035), new THREE.Vector2(0.028, 0.205), new THREE.Vector2(-0.028, 0.205)]));
    return s;
  };
  for (const side of [-1, 1]) {
    const x = (side * fr.w) / 2;
    const body = new THREE.Mesh(new THREE.ExtrudeGeometry(mullShape(), { depth: FH, bevelEnabled: false }), M.steel());
    body.geometry.rotateX(-Math.PI / 2);
    body.position.set(x, 0, -0.02);
    addPart(body, v3(side * 0.35, 0, -0.35));
    const iso = new THREE.Mesh(new THREE.BoxGeometry(0.03, FH, 0.02), M.rubber());
    iso.position.set(x, FH / 2, 0.02);
    addPart(iso, v3(side * 0.35, 0, 0.45), false);
    const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, FH, 0.015), M.steel());
    plate.position.set(x, FH / 2, 0.075);
    addPart(plate, v3(side * 0.35, 0, 0.8));
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.06, FH, 0.035), M.white());
    cap.position.set(x, FH / 2, 0.105);
    addPart(cap, v3(side * 0.35, 0, 1.0));
    // connection brackets at the slab
    for (const yy of [0.15, FH - 0.15]) {
      const L = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(0.18, 0), new THREE.Vector2(0.18, 0.012), new THREE.Vector2(0.012, 0.012), new THREE.Vector2(0.012, 0.12), new THREE.Vector2(0, 0.12)]);
      const br = new THREE.Mesh(new THREE.ExtrudeGeometry(L, { depth: 0.1, bevelEnabled: false }), M.satin());
      br.geometry.rotateY(Math.PI / 2);
      br.position.set(x - 0.05, yy, -0.4);
      addPart(br, v3(side * 0.2, 0, -0.9));
    }
  }
  // transoms
  for (const yy of [0, SPANDREL, FH]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(fr.w - 0.08, 0.08, 0.18), M.steel());
    t.position.set(0, yy, 0.08);
    addPart(t, v3(0, 0, 0.55));
  }
  // slab edge
  const slabEdge = new THREE.Mesh(new THREE.BoxGeometry(fr.w + 0.6, 0.28, 0.8), slabMat.clone());
  slabEdge.position.set(0, -0.14, -0.7);
  addPart(slabEdge, v3(0, 0, -1.4));

  const dimBay = dimension(v3(-fr.w / 2, 0, 0.3), v3(fr.w / 2, 0, 0.3), v3(0, -0.45, 0), 10, 0.1);
  const dimFloor = dimension(v3(fr.w / 2, 0, 0.3), v3(fr.w / 2, FH, 0.3), v3(0.55, 0, 0), 12, 0.1);
  detail.add(dimBay.line, dimFloor.line);

  const fullH = dimension(P(X0, 0), P(X0, H), v3(-1.4, 0, 0), 15, 0.35);
  group.add(fullH.line);

  const shadow = contactShadow(30, 16, 0.6);
  shadow.position.set(0, 0.005, 2);
  group.add(shadow);

  const toWorld = (p: THREE.Vector3) => p.clone().applyQuaternion(fr.q).add(v3(fr.c.x, by, fr.c.z));
  const anchors = {
    fbay: { pos: v3(fr.c.x, by + FH + 0.6, fr.c.z), vis: 0 },
    fprof: { pos: toWorld(v3(-fr.w / 2 - 0.35, FH * 0.75, -0.2)), vis: 0 },
    fiso: { pos: toWorld(v3(fr.w / 2 + 0.35, FH * 0.55, 0.47)), vis: 0 },
    fenv: { pos: toWorld(v3(-fr.w / 2 - 0.25, 0.2, -1.3)), vis: 0 },
    figu: { pos: toWorld(v3(0.3, SPANDREL + 1.6, 1.55)), vis: 0 },
    fdimw: { pos: toWorld(dimBay.mid), vis: 0 },
    fdimh: { pos: toWorld(dimFloor.mid), vis: 0 },
    fh: { pos: fullH.mid.clone(), vis: 0 },
  };

  const sel = fr.c;
  const keys = [
    { q: 0, target: [0, 9, 0], r: 48, th: 0.25, el: 0.12 },
    { q: 0.15, target: [0, 9, 0], r: 45, th: 0.45, el: 0.14 },
    { q: 0.32, target: [0, 9, 0], r: 43, th: 0.75, el: 0.12 },
    { q: 0.48, target: [0, 8.5, 0], r: 38, th: 1.0, el: 0.1 },
    { q: 0.58, target: [sel.x, by + FH / 2, sel.z], r: 9.5, th: 0.55, el: 0.12 },
    { q: 0.68, target: [sel.x, by + FH / 2, sel.z], r: 10.5, th: 1.0, el: 0.18 },
    { q: 0.8, target: [sel.x, by + FH / 2, sel.z], r: 10.5, th: 0.45, el: 0.14 },
    { q: 0.9, target: [0, 9, 0], r: 46, th: -0.2, el: 0.14 },
    { q: 1, target: [0, 9, 0], r: 49, th: -0.45, el: 0.16 },
  ] as Track["keys"];

  const update = (q: number, time: number) => {
    const c = ease(0, 0.08, q) * (1 - 0.75 * ease(0.2, 0.34, q));
    reveal(concept.geometry, lin(0, 0.12, q), 2);
    setOpacity(concept, c);
    slabs.forEach((s, i) => setOpacity(s, ease(0.04 + i * 0.012, 0.09 + i * 0.012, q)));

    const isolate = ease(0.5, 0.58, q) * (1 - ease(0.82, 0.9, q));
    const gk = lin(0.16, 0.31, q);
    glass.count = Math.floor(gk * BAYS * FLOORS);
    span.count = glass.count;
    glassMat.opacity = 0.38 * (1 - 0.92 * isolate);
    spMat.opacity = 1 - 0.92 * isolate;
    spMat.depthWrite = isolate < 0.5;

    const mk = lin(0.33, 0.42, q);
    for (let i = 0; i <= BAYS; i++) {
      const k = Math.max(0.0001, Math.min(1, mk * 1.6 - i * 0.05));
      const b = mullBase[i];
      m4.compose(b.p.clone().setY((H * k) / 2), b.q, s3.set(0.06, H * k, 0.18));
      mull.setMatrixAt(i, m4);
    }
    mull.instanceMatrix.needsUpdate = true;
    mull.visible = q > 0.33;
    tran.count = Math.floor(lin(0.4, 0.48, q) * tranTotal);
    profMat.opacity = 1 - 0.93 * isolate;
    profMat.depthWrite = isolate < 0.5;

    const sb = ease(0.49, 0.53, q) * (1 - ease(0.6, 0.63, q));
    const sm = selBox.material as THREE.LineDashedMaterial;
    sm.opacity = sb * (0.6 + 0.4 * Math.sin(time * 5));

    const dk = ease(0.56, 0.6, q) * (1 - ease(0.88, 0.93, q));
    const ex = ease(0.62, 0.72, q) * (1 - ease(0.8, 0.88, q));
    setOpacity(detail, dk);
    parts.forEach((p) => {
      const base = (p.obj.userData.base ??= p.obj.position.clone()) as THREE.Vector3;
      p.obj.position.copy(base).addScaledVector(p.dir, ex);
    });
    setOpacity(dimBay.line, dk * ease(0.57, 0.6, q) * (1 - ex));
    setOpacity(dimFloor.line, dk * ease(0.57, 0.6, q) * (1 - ex));
    const fh = ease(0.9, 0.95, q);
    setOpacity(fullH.line, fh);

    anchors.fbay.vis = sb;
    anchors.fprof.vis = ex * ease(0.68, 0.7, q);
    anchors.fiso.vis = ex * ease(0.7, 0.72, q);
    anchors.fenv.vis = ex * ease(0.72, 0.74, q);
    anchors.figu.vis = ex * ease(0.74, 0.76, q);
    anchors.fdimw.vis = anchors.fdimh.vis = dk * ease(0.57, 0.6, q) * (1 - ex);
    anchors.fh.vis = fh;
  };

  return {
    group,
    keys,
    anchors,
    unit: 1,
    fog: [40, 90],
    update,
    stats: () => ({ glass: BAYS * FLOORS, spandrels: BAYS * FLOORS, mullions: BAYS + 1, transoms: tranTotal }),
  };
}
