import * as THREE from "three";
import { MeshSurfaceSampler } from "three/examples/jsm/math/MeshSurfaceSampler.js";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { SceneContext, SceneHandle } from "./stage";
import { bracketGeometries, dotFloor, lights, makeLook, solid } from "./parts";

/* ---------- timeline helpers (p = scroll progress through the pinned intro, 0..1) ---------- */
const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ramp = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const T = {
  heroOut: [0.07, 0.17] as const,
  morph: [0.12, 0.38] as const,
  nodesStart: 0.42,
  nodeStep: 0.035,
  fadeOut: [0.92, 1] as const,
};

/* ---------- Vector mark (glyph from vectoros.one favicon-dark.svg) ---------- */
const MARK =
  "M 252 338 L 453 338 C 472 338 488 349 498 367 L 706 796 C 718 819 721 835 716 855 C 713 875 706 891 693 911 L 656 968 C 650 977 647 981 640 981 C 612 981 585 961 568 929 L 252 338 Z M 999 409 L 839 409 C 823 409 815 420 807 436 L 667 666 C 662 676 662 683 667 694 L 715 789 C 726 811 733 836 721 863 L 999 409 Z";

function markShapes(): THREE.Shape[] {
  const tok = MARK.split(/\s+/);
  const shapes: THREE.Shape[] = [];
  let s: THREE.Shape | null = null;
  const n = (i: number) => parseFloat(tok[i]);
  const P = (x: number, y: number): [number, number] => [x, -y]; // SVG y is down
  for (let i = 0; i < tok.length; ) {
    const c = tok[i++];
    if (c === "M") {
      s = new THREE.Shape();
      s.moveTo(...P(n(i), n(i + 1)));
      i += 2;
    } else if (c === "L") {
      s!.lineTo(...P(n(i), n(i + 1)));
      i += 2;
    } else if (c === "C") {
      s!.bezierCurveTo(...P(n(i), n(i + 1)), ...P(n(i + 2), n(i + 3)), ...P(n(i + 4), n(i + 5)));
      i += 6;
    } else if (c === "Z") {
      shapes.push(s!);
      s = null;
    }
  }
  return shapes;
}

function markGeometry(height = 2.5) {
  const g = new THREE.ExtrudeGeometry(markShapes(), { depth: 60, bevelEnabled: false, curveSegments: 10 });
  g.computeBoundingBox();
  const b = g.boundingBox!;
  const k = height / (b.max.y - b.min.y);
  g.translate(-(b.min.x + b.max.x) / 2, -(b.min.y + b.max.y) / 2, -(b.min.z + b.max.z) / 2);
  g.scale(k, k, k);
  return g;
}

function sample(geo: THREE.BufferGeometry, count: number) {
  const sampler = new MeshSurfaceSampler(new THREE.Mesh(geo)).build();
  const out = new Float32Array(count * 3);
  const v = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(v);
    out.set([v.x, v.y, v.z], i * 3);
  }
  return out;
}

function stripToPosition(g: THREE.BufferGeometry) {
  const n = new THREE.BufferGeometry();
  n.setAttribute("position", g.getAttribute("position"));
  if (g.index) n.setIndex(g.index);
  return n.index ? n.toNonIndexed() : n;
}

/* ---------- points shader: one cloud morphing bracket → mark, with a scroll-driven burst ---------- */
const vert = /* glsl */ `
  attribute vec3 aA;
  attribute vec3 aB;
  attribute vec4 aR;
  uniform float uMix, uBurst, uTime, uSize, uDpr;
  varying float vA;
  void main() {
    float m = clamp(uMix * 1.25 - aR.w * 0.25, 0.0, 1.0);   // stagger points a little
    m = m * m * (3.0 - 2.0 * m);
    vec3 p = mix(aA, aB, m);
    p += aR.xyz * uBurst * (0.6 + aR.w);
    p += aR.xyz * 0.018 * sin(uTime * 1.3 + aR.w * 40.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = uSize * uDpr * (0.55 + 0.9 * fract(aR.w * 13.7)) / -mv.z;
    vA = 0.62 + 0.38 * sin(uTime * 1.7 + aR.w * 90.0);
  }
`;
const frag = /* glsl */ `
  uniform float uOpacity;
  varying float vA;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(vec3(0.957, 0.957, 0.965), a * vA * uOpacity);
  }
`;

export type Tool = { name: string; status: string };

export type CoreOpts = {
  progress: { current: number };
  tools: readonly Tool[];
  /** HTML labels, one per tool; the scene positions and fades them each frame. */
  labels: { current: (HTMLElement | null)[] };
  /** HTML logo marks, one per tool; centred inside each hexagon and sized to it. */
  logos?: { current: (HTMLElement | null)[] };
};

export function createCoreScene({ progress, tools, labels, logos }: CoreOpts) {
  return ({ scene, camera, pointer, reducedMotion, renderer }: SceneContext): SceneHandle => {
    scene.fog = new THREE.Fog(0x000000, 12, 32);
    lights(scene);

    const mobile = () => renderer.domElement.clientWidth < 768;
    const rig = new THREE.Group();
    scene.add(rig);

    /* bracket: dark solid + white edges, fades out as the cloud takes over */
    const bracketParts = bracketGeometries({ length: 120, holes: 4, ribs: 2 });
    const look = makeLook(0.85);
    const bracket = new THREE.Group();
    for (const g of bracketParts) bracket.add(solid(g, look));
    bracket.scale.setScalar(1.25);
    rig.add(bracket);

    /* cloud */
    const COUNT = 9000;
    const merged = mergeGeometries(bracketParts.map(stripToPosition));
    merged.scale(1.25, 1.25, 1.25);
    const A = sample(merged, COUNT);
    merged.dispose();
    const markGeo = markGeometry(2.4);
    const B = sample(markGeo, COUNT);
    const R = new Float32Array(COUNT * 4);
    const v = new THREE.Vector3();
    for (let i = 0; i < COUNT; i++) {
      v.randomDirection().multiplyScalar(0.4 + Math.random() * 1.1);
      R.set([v.x, v.y, v.z, Math.random()], i * 4);
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute("position", new THREE.BufferAttribute(A.slice(), 3));
    cloudGeo.setAttribute("aA", new THREE.BufferAttribute(A, 3));
    cloudGeo.setAttribute("aB", new THREE.BufferAttribute(B, 3));
    cloudGeo.setAttribute("aR", new THREE.BufferAttribute(R, 4));
    cloudGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 6);
    const uniforms = {
      uMix: { value: 0 },
      uBurst: { value: 0 },
      uTime: { value: 0 },
      uSize: { value: 34 },
      uDpr: { value: renderer.getPixelRatio() },
      uOpacity: { value: 0.55 },
    };
    const cloudMat = new THREE.ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const cloud = new THREE.Points(cloudGeo, cloudMat);
    rig.add(cloud);

    /* mark outline that sharpens once the cloud has settled */
    const markEdges = new THREE.LineSegments(
      new THREE.EdgesGeometry(markGeo, 30),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
    );
    rig.add(markEdges);

    /* orbit ring + tool nodes */
    const net = new THREE.Group();
    scene.add(net);
    const ringMat = new THREE.LineBasicMaterial({ color: 0x8a8a92, transparent: true, opacity: 0 });
    const ringR = 3.4;
    const ring = new THREE.LineLoop(
      new THREE.BufferGeometry().setFromPoints(
        Array.from({ length: 160 }, (_, i) => new THREE.Vector3(Math.cos((i / 160) * Math.PI * 2) * ringR, Math.sin((i / 160) * Math.PI * 2) * ringR, 0)),
      ),
      ringMat,
    );
    net.add(ring);

    type Node = {
      pos: THREE.Vector3;
      live: boolean;
      hex: THREE.LineLoop;
      fill: THREE.Mesh;
      line: THREE.Line;
      lineGeo: THREE.BufferGeometry;
      pulse: THREE.Mesh;
      phase: number;
    };
    const nodes: Node[] = tools.map((t, i) => {
      const a = Math.PI / 2 - (i / tools.length) * Math.PI * 2;
      const pos = new THREE.Vector3(Math.cos(a) * ringR, Math.sin(a) * ringR, 0);
      const live = t.status === "Available";
      const hexPts = Array.from({ length: 6 }, (_, k) => {
        const b = (k / 6) * Math.PI * 2 + Math.PI / 6;
        return new THREE.Vector3(Math.cos(b) * 0.26, Math.sin(b) * 0.26, 0);
      });
      const hexMat = live
        ? new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
        : new THREE.LineDashedMaterial({ color: 0xa1a1aa, dashSize: 0.06, gapSize: 0.05, transparent: true, opacity: 0 });
      const hex = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(hexPts), hexMat);
      hex.computeLineDistances();
      hex.position.copy(pos);
      const fill = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 6, Math.PI / 6),
        new THREE.MeshBasicMaterial({ color: live ? 0x1b1b1b : 0x0b0b0b, transparent: true, opacity: 0 }),
      );
      fill.position.copy(pos);
      const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const lineMat = live
        ? new THREE.LineBasicMaterial({ color: 0xd4d4d8, transparent: true, opacity: 0 })
        : new THREE.LineDashedMaterial({ color: 0x71717a, dashSize: 0.1, gapSize: 0.08, transparent: true, opacity: 0 });
      const line = new THREE.Line(lineGeo, lineMat);
      const pulse = new THREE.Mesh(
        new THREE.CircleGeometry(0.035, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }),
      );
      net.add(line, fill, hex, pulse);
      return { pos, live, hex, fill, line, lineGeo, pulse, phase: i * 0.37 };
    });

    const floor = dotFloor(34, 0.45, -3.2);
    (floor.material as THREE.PointsMaterial).opacity = 0.35;
    scene.add(floor);

    const ptr = { x: 0, y: 0 };
    let shown = 0;
    const tmp = new THREE.Vector3();
    const inner = new THREE.Vector3();

    return {
      update: (t) => {
        const target = clamp(progress.current);
        shown += (target - shown) * (reducedMotion ? 1 : 0.1);
        const p = shown;
        const time = reducedMotion ? 0 : t;
        const m = mobile();

        ptr.x += (pointer.x - ptr.x) * 0.05;
        ptr.y += (pointer.y - ptr.y) * 0.05;

        const mix = ramp(T.morph[0], T.morph[1], p);
        const out = 1 - ramp(T.fadeOut[0], T.fadeOut[1], p);
        const heroK = 1 - ramp(T.heroOut[0], T.heroOut[1], p);

        /* camera: low three-quarter hero view → straight-on core view, then a slow push in */
        const camZ = lerp(m ? 15 : 8.8, m ? 19.5 : 14, mix) - ramp(0.66, 0.92, p) * (m ? 1.4 : 1.1);
        const camY = lerp(1.9, 0.2, mix);
        camera.position.set(ptr.x * 0.6 * (1 - mix * 0.5), camY - ptr.y * 0.35, camZ);
        camera.lookAt(0, lerp(-0.55, 0, mix), 0);

        /* rig: idle spin in hero, settles to face camera for the mark */
        const idle = -0.6 + Math.sin(time * 0.2) * 0.35 + p * 2.2;
        rig.rotation.y = lerp(idle, Math.sin(time * 0.35) * 0.18, mix);
        rig.rotation.x = lerp(0, 0.05, mix);
        rig.scale.setScalar(lerp(1, m ? 0.62 : 1, mix));
        rig.position.y = lerp(-0.55, 0.05, mix) + Math.sin(time * 0.6) * 0.03;

        bracket.visible = mix < 0.98;
        look.edge.opacity = 0.7 * (1 - ramp(0.0, 0.4, mix)) * (0.6 + 0.4 * heroK);
        bracket.children.forEach((c) => (c.children[0].visible = mix < 0.2));
        (look.face as THREE.MeshStandardMaterial).opacity = 1 - ramp(0, 0.18, mix);
        (look.face as THREE.MeshStandardMaterial).transparent = mix > 0.001;

        uniforms.uMix.value = mix;
        uniforms.uBurst.value = Math.sin(mix * Math.PI) * 0.9;
        uniforms.uTime.value = time;
        uniforms.uOpacity.value = lerp(0.3, 0.85, ramp(0.05, 0.3, mix)) * out;
        (markEdges.material as THREE.LineBasicMaterial).opacity = ramp(0.85, 1, mix) * 0.5 * out;

        /* network */
        ringMat.opacity = ramp(T.nodesStart - 0.02, T.nodesStart + 0.08, p) * 0.22 * out;
        net.rotation.z = Math.sin(time * 0.1) * 0.02;
        const netScale = m ? 0.6 : 1;
        net.scale.setScalar(netScale * lerp(0.92, 1, ramp(T.nodesStart, 0.7, p)));
        net.position.y = rig.position.y;

        nodes.forEach((n, i) => {
          const a0 = T.nodesStart + i * T.nodeStep;
          const k = ramp(a0, a0 + 0.06, p) * out;
          const draw = ramp(a0, a0 + 0.08, p);
          (n.hex.material as THREE.LineBasicMaterial).opacity = k * (n.live ? 0.95 : 0.8);
          (n.fill.material as THREE.MeshBasicMaterial).opacity = k;
          n.hex.scale.setScalar(0.6 + 0.4 * k);
          n.fill.scale.setScalar(0.6 + 0.4 * k);
          inner.copy(n.pos).setLength(1.5);
          tmp.copy(n.pos).setLength(ringR - 0.3);
          const end = inner.clone().lerp(tmp, draw);
          const arr = n.lineGeo.getAttribute("position") as THREE.BufferAttribute;
          arr.setXYZ(0, inner.x, inner.y, inner.z);
          arr.setXYZ(1, end.x, end.y, end.z);
          arr.needsUpdate = true;
          n.line.computeLineDistances();
          (n.line.material as THREE.LineBasicMaterial).opacity = (n.live ? 0.5 : 0.4) * k;

          // data pulses travel along connected (available) links only
          const pk = n.live ? ramp(0.6, 0.68, p) * out : 0;
          const f = (time * 0.45 + n.phase) % 1;
          n.pulse.position.copy(inner).lerp(tmp, f);
          (n.pulse.material as THREE.MeshBasicMaterial).opacity = pk * Math.sin(f * Math.PI);

          const el = labels.current[i];
          if (el) {
            tmp.copy(n.pos).multiplyScalar(1.0).add(new THREE.Vector3(0, -0.5, 0));
            tmp.applyMatrix4(net.matrixWorld).project(camera);
            const w = renderer.domElement.clientWidth;
            const h = renderer.domElement.clientHeight;
            el.style.transform = `translate(-50%, 0) translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
            el.style.opacity = String(k);
          }
          const le = logos?.current[i];
          if (le) {
            const w = renderer.domElement.clientWidth;
            const h = renderer.domElement.clientHeight;
            tmp.copy(n.pos).applyMatrix4(net.matrixWorld).project(camera);
            const cx = ((tmp.x + 1) / 2) * w;
            const cy = ((1 - tmp.y) / 2) * h;
            tmp.copy(n.pos).add(new THREE.Vector3(0.15 * (0.6 + 0.4 * k), 0, 0)).applyMatrix4(net.matrixWorld).project(camera);
            const size = Math.abs(((tmp.x + 1) / 2) * w - cx) * 2;
            le.style.width = le.style.height = `${size.toFixed(1)}px`;
            le.style.transform = `translate(-50%, -50%) translate(${cx}px, ${cy}px)`;
            le.style.opacity = String(k * (n.live ? 1 : 0.75));
          }
        });
        net.updateMatrixWorld();
      },
      resize: () => {
        uniforms.uDpr.value = renderer.getPixelRatio();
      },
      dispose: () => {
        markGeo.dispose();
        look.face.dispose();
        look.edge.dispose();
      },
    };
  };
}
