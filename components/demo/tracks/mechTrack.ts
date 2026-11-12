import * as THREE from "three";
import { ease, lin } from "../timeline";
import { M, contactShadow, dimension, polyPairs, reveal, segments, setOpacity, v3, withEdges, type Track } from "./common";

/**
 * Mechanical: component assembly review (after Vector's recorded SOLIDWORKS project).
 * Space-frame chassis → mounting profile sketch → clevis + bushing → upright, wishbones,
 * spring/damper → exploded wheel stack → complete model. Sample data. 1 unit = 1 m.
 */
const WC = v3(0.8, 0.26, 0.6); // front-left wheel centre
const CLEVIS = v3(0.5, 0.12, 0.2);


function tubeBetween(a: THREE.Vector3, b: THREE.Vector3, r: number, mat: THREE.Material) {
  const d = b.clone().sub(a);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 10, 1), mat);
  m.position.copy(a).addScaledVector(d, 0.5);
  m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize());
  return m;
}

/** lathe around z (wheel axis) from (radius, z) profile */
function latheZ(pts: [number, number][], seg = 64) {
  const g = new THREE.LatheGeometry(pts.map(([r, z]) => new THREE.Vector2(r, z)), seg);
  g.rotateX(Math.PI / 2);
  return g;
}

function wheelParts(detail: boolean) {
  const parts: { obj: THREE.Object3D; off: THREE.Vector3; name: string }[] = [];
  const tireProfile: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI;
    tireProfile.push([0.215 + Math.cos(a) * 0.045, Math.sin(a) * 0.1]);
  }
  tireProfile.unshift([0.17, -0.1]);
  tireProfile.push([0.17, 0.1]);
  const tire = new THREE.Mesh(latheZ(tireProfile.reverse(), detail ? 72 : 40), M.rubber());
  if (detail) {
    const tread: THREE.Vector3[] = [];
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      tread.push(v3(Math.cos(a) * 0.261, Math.sin(a) * 0.261, -0.07), v3(Math.cos(a) * 0.261, Math.sin(a) * 0.261, 0.07));
    }
    tire.add(segments(tread, M.line(0.25, 0xa1a1aa)));
  }
  parts.push({ obj: tire, off: v3(0, 0, 0.5), name: "tire" });

  const rim = new THREE.Group();
  const barrel = new THREE.Mesh(latheZ([[0.168, -0.095], [0.172, -0.09], [0.16, -0.06], [0.16, 0.06], [0.172, 0.09], [0.168, 0.095]], 64), M.steel());
  rim.add(barrel);
  const face = new THREE.Shape();
  face.absarc(0, 0, 0.162, 0, Math.PI * 2, false);
  for (let s = 0; s < 5; s++) {
    const a0 = (s / 5) * Math.PI * 2 + 0.22;
    const a1 = ((s + 1) / 5) * Math.PI * 2 - 0.22;
    const h = new THREE.Path();
    h.absarc(0, 0, 0.145, a0, a1, false);
    h.absarc(0, 0, 0.065, a1, a0, true);
    face.holes.push(h);
  }
  const hubHole = new THREE.Path();
  hubHole.absarc(0, 0, 0.03, 0, Math.PI * 2, true);
  face.holes.push(hubHole);
  const faceM = new THREE.Mesh(new THREE.ExtrudeGeometry(face, { depth: 0.016, bevelEnabled: false, curveSegments: 40 }), M.steel());
  faceM.position.z = 0.04;
  if (detail) withEdges(faceM, 30, 0.5);
  rim.add(faceM);
  parts.push({ obj: rim, off: v3(0, 0, 0.33), name: "rim" });

  if (!detail) return parts;

  const hub = new THREE.Group();
  const hb = new THREE.Mesh(latheZ([[0.0, -0.04], [0.05, -0.04], [0.05, 0.0], [0.07, 0.0], [0.07, 0.012], [0.03, 0.03], [0.0, 0.03]], 40), M.satin());
  hub.add(hb);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 8), M.white());
    st.rotation.x = Math.PI / 2;
    st.position.set(Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0.03);
    hub.add(st);
  }
  hub.position.z = 0;
  parts.push({ obj: hub, off: v3(0, 0, 0.18), name: "hub" });

  const disc = new THREE.Shape();
  disc.absarc(0, 0, 0.125, 0, Math.PI * 2, false);
  const inner = new THREE.Path();
  inner.absarc(0, 0, 0.06, 0, Math.PI * 2, true);
  disc.holes.push(inner);
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const r = i % 2 ? 0.1 : 0.088;
    const h = new THREE.Path();
    h.absarc(Math.cos(a) * r, Math.sin(a) * r, 0.0045, 0, Math.PI * 2, true);
    disc.holes.push(h);
  }
  const discM = new THREE.Mesh(new THREE.ExtrudeGeometry(disc, { depth: 0.012, bevelEnabled: false, curveSegments: 48 }), M.steel());
  discM.position.z = -0.05;
  withEdges(discM, 30, 0.45);
  parts.push({ obj: discM, off: v3(0, 0, 0.02), name: "disc" });

  const cal = new THREE.Shape();
  cal.absarc(0, 0, 0.14, Math.PI * 0.32, Math.PI * 0.68, false);
  cal.absarc(0, 0, 0.085, Math.PI * 0.68, Math.PI * 0.32, true);
  const calM = new THREE.Mesh(new THREE.ExtrudeGeometry(cal, { depth: 0.05, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 }), M.white());
  calM.position.z = -0.069;
  withEdges(calM, 30, 0.5);
  parts.push({ obj: calM, off: v3(0, 0.16, -0.05), name: "caliper" });
  return parts;
}

export function createMechTrack(): Track {
  const group = new THREE.Group();

  /* chassis space frame */
  const st = [
    { x: -0.85, yl: 0.12, yh: 0.46, wl: 0.22, wh: 0.2 },
    { x: -0.4, yl: 0.1, yh: 0.5, wl: 0.24, wh: 0.22 },
    { x: 0.1, yl: 0.1, yh: 0.5, wl: 0.22, wh: 0.2 },
    { x: 0.5, yl: 0.12, yh: 0.42, wl: 0.2, wh: 0.18 },
    { x: 0.95, yl: 0.12, yh: 0.32, wl: 0.12, wh: 0.1 },
  ];
  const tubeMat = M.steel();
  tubeMat.transparent = true;
  const members: [THREE.Vector3, THREE.Vector3][] = [];
  const N = (i: number, hi: boolean, s: number) => v3(st[i].x, hi ? st[i].yh : st[i].yl, s * (hi ? st[i].wh : st[i].wl));
  for (let i = 0; i < st.length; i++) {
    for (const s of [-1, 1]) members.push([N(i, false, s), N(i, true, s)]);
    members.push([N(i, false, -1), N(i, false, 1)], [N(i, true, -1), N(i, true, 1)]);
    if (i % 2 === 0) members.push([N(i, false, -1), N(i, true, 1)]);
    if (i < st.length - 1)
      for (const s of [-1, 1]) {
        members.push([N(i, false, s), N(i + 1, false, s)], [N(i, true, s), N(i + 1, true, s)]);
        members.push(i % 2 ? [N(i, false, s), N(i + 1, true, s)] : [N(i, true, s), N(i + 1, false, s)]);
        members.push([N(i, false, s), N(i + 1, false, -s)].map((p, k) => (k ? p.clone().setZ(0) : p)) as [THREE.Vector3, THREE.Vector3]);
      }
  }
  // roll hoop
  const hoop = [v3(-0.4, 0.5, -0.22), v3(-0.4, 0.86, -0.15), v3(-0.4, 0.92, 0), v3(-0.4, 0.86, 0.15), v3(-0.4, 0.5, 0.22)];
  for (let i = 0; i < hoop.length - 1; i++) members.push([hoop[i], hoop[i + 1]]);
  members.push([v3(-0.4, 0.92, 0), v3(-0.85, 0.46, 0.0)]);
  const chassis = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 10, 1), tubeMat, members.length);
  const m4 = new THREE.Matrix4();
  members.forEach(([a, b], i) => {
    const d = b.clone().sub(a);
    m4.compose(a.clone().addScaledVector(d, 0.5), new THREE.Quaternion().setFromUnitVectors(v3(0, 1, 0), d.clone().normalize()), v3(0.0125, d.length(), 0.0125));
    chassis.setMatrixAt(i, m4);
  });
  chassis.count = 0;
  chassis.frustumCulled = false;
  group.add(chassis);
  const nodes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 10, 8), M.white(), st.length * 4);
  let ni = 0;
  st.forEach((_, i) => [false, true].forEach((hi) => [-1, 1].forEach((s) => nodes.setMatrixAt(ni++, m4.makeTranslation(N(i, hi, s))))));
  nodes.frustumCulled = false;
  group.add(nodes);

  /* mounting-profile sketch (u → +z outward, v → y), drawn on plane x = CLEVIS.x */
  const W = (u: number, v: number, dx = 0) => v3(CLEVIS.x + dx, CLEVIS.y + v, CLEVIS.z + u);
  const sk: THREE.Vector3[] = [W(0, -0.02), W(0.03, -0.02)];
  const arc: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = -Math.PI / 2 + (i / 24) * Math.PI;
    arc.push(W(0.03 + Math.cos(a) * 0.02, Math.sin(a) * 0.02));
  }
  sk.push(...polyPairs(arc), W(0.03, 0.02), W(0, 0.02), W(0, 0.02), W(0, -0.02));
  const hole: THREE.Vector3[] = [];
  for (let i = 0; i <= 32; i++) {
    const a = (i / 32) * Math.PI * 2;
    hole.push(W(0.03 + Math.cos(a) * 0.011, Math.sin(a) * 0.011));
  }
  sk.push(...polyPairs(hole));
  const sketch = segments(sk, M.line(1));
  const centre = segments([W(0.03, -0.032), W(0.03, 0.032), W(0.004, 0), W(0.058, 0)], M.dashed(0.8));
  (centre.material as THREE.LineDashedMaterial).dashSize = 0.004;
  (centre.material as THREE.LineDashedMaterial).gapSize = 0.002;
  const dH = dimension(W(0, -0.02), W(0, 0.02), v3(0, 0, -0.012), 8, 0.004);
  const dD = dimension(W(0.019, -0.011), W(0.041, -0.011), v3(0, -0.02, 0), 4, 0.004);
  group.add(sketch, centre, dH.line, dD.line);

  /* clevis pair + bushing + bolt */
  const tabShape = new THREE.Shape();
  tabShape.moveTo(0, -0.02);
  tabShape.lineTo(0.03, -0.02);
  tabShape.absarc(0.03, 0, 0.02, -Math.PI / 2, Math.PI / 2, false);
  tabShape.lineTo(0, 0.02);
  tabShape.lineTo(0, -0.02);
  const th = new THREE.Path();
  th.absarc(0.03, 0, 0.011, 0, Math.PI * 2, true);
  tabShape.holes.push(th);
  const clevis = new THREE.Group();
  const tabs: THREE.Mesh[] = [];
  for (const dx of [0.018, -0.012]) {
    const g = new THREE.ExtrudeGeometry(tabShape, { depth: 0.006, bevelEnabled: false, curveSegments: 24 });
    g.rotateY(-Math.PI / 2);
    const t = new THREE.Mesh(g, M.satin());
    withEdges(t, 30, 0.7);
    t.position.copy(W(0, 0, dx));
    tabs.push(t);
    clevis.add(t);
  }
  const bush = new THREE.Mesh(latheZ([[0.006, -0.018], [0.011, -0.018], [0.011, 0.018], [0.006, 0.018]], 32), M.white());
  bush.geometry.rotateY(Math.PI / 2);
  bush.position.copy(W(0.03, 0, 0));
  withEdges(bush, 30, 0.6);
  const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.0055, 0.0055, 0.06, 16), M.steel());
  bolt.rotation.z = Math.PI / 2;
  bolt.position.copy(W(0.03, 0, 0));
  clevis.add(bush, bolt);
  group.add(clevis);

  /* upright + bearing ring + wishbones + spring/damper */
  const corner = new THREE.Group();
  const up = new THREE.Shape();
  up.moveTo(-0.03, -0.16);
  up.lineTo(0.03, -0.16);
  up.lineTo(0.05, -0.06);
  up.absarc(0, 0, 0.07, -0.9, 0.9, false);
  up.lineTo(0.03, 0.16);
  up.lineTo(-0.03, 0.16);
  up.lineTo(-0.05, 0.06);
  up.absarc(0, 0, 0.07, Math.PI - 0.9, Math.PI + 0.9, false);
  up.lineTo(-0.03, -0.16);
  const uh = new THREE.Path();
  uh.absarc(0, 0, 0.045, 0, Math.PI * 2, true);
  up.holes.push(uh);
  const upright = new THREE.Mesh(new THREE.ExtrudeGeometry(up, { depth: 0.03, bevelEnabled: true, bevelSize: 0.004, bevelThickness: 0.004, bevelSegments: 2, curveSegments: 24 }), M.satin());
  upright.position.copy(WC).add(v3(0, 0, -0.13));
  withEdges(upright, 30, 0.6);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.008, 12, 48), M.white());
  ring.position.copy(WC).add(v3(0, 0, -0.1));
  corner.add(upright, ring);
  const lowA = v3(0.8, 0.11, 0.47);
  const upA = v3(0.8, 0.41, 0.47);
  corner.add(tubeBetween(W(0.03, 0), lowA, 0.009, M.steel()), tubeBetween(v3(0.95, 0.12, 0.12), lowA, 0.009, M.steel()));
  corner.add(tubeBetween(v3(0.5, 0.42, 0.18), upA, 0.008, M.steel()), tubeBetween(v3(0.95, 0.32, 0.1), upA, 0.008, M.steel()));
  corner.add(tubeBetween(v3(0.84, 0.3, 0.47), v3(0.98, 0.28, 0.12), 0.006, M.steel())); // tie rod
  const dA = v3(0.74, 0.14, 0.42);
  const dB = v3(0.55, 0.5, 0.16);
  corner.add(tubeBetween(dA, dA.clone().lerp(dB, 0.55), 0.012, M.white()), tubeBetween(dA.clone().lerp(dB, 0.4), dB, 0.017, M.dark()));
  const ax = dB.clone().sub(dA);
  const len = ax.length();
  ax.normalize();
  const perp = new THREE.Vector3(0, 0, 1).cross(ax).normalize();
  const perp2 = ax.clone().cross(perp);
  const hel: THREE.Vector3[] = [];
  for (let i = 0; i <= 260; i++) {
    const t = i / 260;
    const a = t * Math.PI * 2 * 9;
    hel.push(dA.clone().addScaledVector(ax, 0.08 * len + t * 0.62 * len).addScaledVector(perp, Math.cos(a) * 0.03).addScaledVector(perp2, Math.sin(a) * 0.03));
  }
  const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hel), 520, 0.0045, 6), M.white());
  corner.add(spring);
  group.add(corner);

  /* wheel (detailed, explodable) */
  const wheel = new THREE.Group();
  wheel.position.copy(WC);
  const wparts = wheelParts(true);
  wparts.forEach((p) => {
    p.obj.userData.base = p.obj.position.clone();
    wheel.add(p.obj);
  });
  group.add(wheel);
  const axisLine = segments([v3(0, 0, -0.25), v3(0, 0, 0.9)], M.dashed(0.7));
  wheel.add(axisLine);

  /* context: other three corners */
  const ctx = new THREE.Group();
  for (const [x, z] of [
    [0.8, -0.6],
    [-0.75, 0.62],
    [-0.75, -0.62],
  ]) {
    const w = new THREE.Group();
    wheelParts(false).forEach((p) => w.add(p.obj));
    w.position.set(x, 0.26, z);
    if (z < 0) w.rotation.y = Math.PI;
    ctx.add(w);
    const s = Math.sign(z);
    const cx = x > 0 ? 0.5 : -0.85;
    ctx.add(tubeBetween(v3(cx, 0.12, s * 0.2), v3(x, 0.11, s * 0.47), 0.009, M.steel()), tubeBetween(v3(cx, 0.44, s * 0.18), v3(x, 0.41, s * 0.47), 0.008, M.steel()));
  }
  group.add(ctx);
  const trackDim = dimension(v3(0.8, 0, -0.6), v3(0.8, 0, 0.6), v3(0.55, 0, 0), 12, 0.05);
  const wbDim = dimension(v3(-0.75, 0, 0.75), v3(0.8, 0, 0.75), v3(0, 0, 0.18), 15, 0.05);
  group.add(trackDim.line, wbDim.line);

  const shadow = contactShadow(3.6, 2.2, 0.85);
  shadow.position.y = 0.002;
  group.add(shadow);

  const anchors = {
    mframe: { pos: v3(-0.4, 0.95, 0), vis: 0 },
    m40: { pos: dH.mid.clone(), vis: 0 },
    md22: { pos: dD.mid.clone(), vis: 0 },
    mbush: { pos: W(0.03, 0.03, 0), vis: 0 },
    mup: { pos: WC.clone().add(v3(0, 0.2, -0.12)), vis: 0 },
    mdamp: { pos: dA.clone().lerp(dB, 0.7), vis: 0 },
    mtire: { pos: WC.clone().add(v3(0, 0.3, 0.5)), vis: 0 },
    mrim: { pos: WC.clone().add(v3(0, -0.2, 0.33)), vis: 0 },
    mdisc: { pos: WC.clone().add(v3(0.13, -0.08, 0.0)), vis: 0 },
    mcal: { pos: WC.clone().add(v3(0, 0.32, -0.1)), vis: 0 },
    mtrack: { pos: trackDim.mid.clone(), vis: 0 },
    mwb: { pos: wbDim.mid.clone(), vis: 0 },
  };

  const C = [CLEVIS.x, CLEVIS.y, CLEVIS.z + 0.03] as [number, number, number];
  const keys = [
    { q: 0, target: [0.05, 0.4, 0], r: 3.6, th: 0.9, el: 0.42 },
    { q: 0.13, target: [0.05, 0.35, 0], r: 3.0, th: 0.6, el: 0.32 },
    { q: 0.2, target: C, r: 0.26, th: 1.5, el: 0.08 },
    { q: 0.3, target: C, r: 0.24, th: 1.42, el: 0.12 },
    { q: 0.42, target: C, r: 0.3, th: 0.75, el: 0.35 },
    { q: 0.5, target: [0.72, 0.3, 0.38], r: 1.7, th: 0.75, el: 0.3 },
    { q: 0.58, target: [0.75, 0.28, 0.48], r: 1.9, th: 0.9, el: 0.24 },
    { q: 0.68, target: [0.8, 0.27, 0.78], r: 1.75, th: 1.05, el: 0.2 },
    { q: 0.8, target: [0.8, 0.27, 0.78], r: 1.7, th: 0.6, el: 0.25 },
    { q: 0.9, target: [0.05, 0.3, 0], r: 3.4, th: 0.35, el: 0.38 },
    { q: 1, target: [0.05, 0.3, 0], r: 3.7, th: -0.45, el: 0.42 },
  ] as Track["keys"];

  const update = (q: number, time: number) => {
    chassis.count = Math.floor(lin(0.0, 0.11, q) * members.length);
    nodes.count = Math.floor(lin(0.04, 0.12, q) * st.length * 4);
    const focus = ease(0.14, 0.19, q) * (1 - ease(0.42, 0.48, q));
    const wheelFocus = ease(0.58, 0.64, q) * (1 - ease(0.8, 0.86, q));
    const upFocus = ease(0.44, 0.48, q) * (1 - ease(0.56, 0.6, q));
    tubeMat.opacity = Math.max(0, 1 - 1.0 * focus - 0.55 * upFocus - 0.82 * wheelFocus);
    chassis.visible = tubeMat.opacity > 0.03;
    nodes.visible = focus < 0.3;
    tubeMat.depthWrite = tubeMat.opacity > 0.6;

    const sk = ease(0.17, 0.2, q) * (1 - ease(0.33, 0.37, q));
    reveal(sketch.geometry, lin(0.18, 0.24, q), 2);
    setOpacity(sketch, sk);
    setOpacity(centre, sk * 0.9);
    const dimK = ease(0.24, 0.27, q) * (1 - ease(0.32, 0.35, q));
    setOpacity(dH.line, dimK);
    setOpacity(dD.line, dimK);

    const ex = ease(0.3, 0.37, q);
    tabs.forEach((t, i) => {
      t.scale.x = Math.max(0.001, ex);
      setOpacity(t, ease(0.3 + i * 0.02, 0.33 + i * 0.02, q));
    });
    const bk = ease(0.36, 0.42, q);
    setOpacity(bush, bk);
    bush.position.x = CLEVIS.x + (1 - bk) * 0.06;
    setOpacity(bolt, ease(0.39, 0.43, q));

    corner.children.forEach((c, i) => setOpacity(c, ease(0.44 + i * 0.012, 0.47 + i * 0.012, q)));

    const wk = ease(0.56, 0.6, q);
    setOpacity(wheel, wk);
    const explode = ease(0.62, 0.7, q) * (1 - ease(0.8, 0.86, q));
    wparts.forEach((p) => {
      p.obj.position.copy(p.obj.userData.base as THREE.Vector3).addScaledVector(p.off, explode);
    });
    wparts.forEach((p) => {
      if (p.name === "tire" || p.name === "rim") setOpacity(p.obj, wk * (1 - 0.65 * explode));
    });
    setOpacity(axisLine, explode);

    const ck = ease(0.84, 0.9, q);
    setOpacity(ctx, ck);
    const dk = ease(0.9, 0.95, q);
    setOpacity(trackDim.line, dk);
    setOpacity(wbDim.line, dk);

    anchors.mframe.vis = ease(0.06, 0.1, q) * (1 - ease(0.14, 0.17, q));
    anchors.m40.vis = anchors.md22.vis = dimK;
    anchors.mbush.vis = ease(0.4, 0.43, q) * (1 - ease(0.45, 0.48, q));
    anchors.mup.vis = ease(0.48, 0.51, q) * (1 - ease(0.57, 0.6, q));
    anchors.mdamp.vis = ease(0.52, 0.55, q) * (1 - ease(0.57, 0.6, q));
    anchors.mtire.vis = explode * ease(0.68, 0.7, q);
    anchors.mrim.vis = explode * ease(0.7, 0.72, q);
    anchors.mdisc.vis = explode * ease(0.72, 0.74, q);
    anchors.mcal.vis = explode * ease(0.74, 0.76, q);
    anchors.mtrack.vis = anchors.mwb.vis = dk;
  };

  return {
    group,
    keys,
    anchors,
    unit: 1,
    fog: [5, 14],
    update,
    stats: () => ({ members: members.length, parts: 5, corners: 4 }),
  };
}
