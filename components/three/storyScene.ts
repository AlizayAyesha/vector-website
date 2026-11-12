import * as THREE from "three";
import type { SceneContext, SceneHandle } from "./stage";
import { BRACKET, MM, bracketGeometries, dotFloor, lights, makeLook, solid } from "./parts";

const clamp = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a));
  return t * t * (3 - 2 * t);
};

type Piece = { obj: THREE.Object3D; home: THREE.Vector3; dir: THREE.Vector3; spin: number };

/**
 * Original pillow-block style assembly: base plate, bracket, bearing ring, shaft,
 * four bolts. Scroll progress (0..1) drives assembled → exploded → assembled.
 */
export function createStoryScene(progress: { current: number }) {
  return ({ scene, camera, pointer, reducedMotion }: SceneContext): SceneHandle => {
    scene.fog = new THREE.Fog(0x000000, 10, 24);
    lights(scene);
    const look = makeLook(0.9);
    const accent = makeLook(1);
    (accent.edge as THREE.LineBasicMaterial).color.set(0xffffff);

    const rig = new THREE.Group();
    scene.add(rig);
    const pieces: Piece[] = [];
    const add = (obj: THREE.Object3D, home: THREE.Vector3, dir: THREE.Vector3, spin = 0) => {
      obj.position.copy(home);
      rig.add(obj);
      pieces.push({ obj, home: home.clone(), dir, spin });
    };

    const L = 120 * MM;
    const W = BRACKET.W;
    const H = BRACKET.H;

    // Base plate (wider than the bracket) with four bolt holes.
    const pw = L + 0.7;
    const pd = W + 0.9;
    const pt = 10 * MM;
    const plate = new THREE.Shape();
    plate.moveTo(-pw / 2, -pd / 2);
    plate.lineTo(pw / 2, -pd / 2);
    plate.lineTo(pw / 2, pd / 2);
    plate.lineTo(-pw / 2, pd / 2);
    plate.lineTo(-pw / 2, -pd / 2);
    const boltPos: [number, number][] = [
      [-pw / 2 + 0.28, -pd / 2 + 0.28],
      [pw / 2 - 0.28, -pd / 2 + 0.28],
      [-pw / 2 + 0.28, pd / 2 - 0.28],
      [pw / 2 - 0.28, pd / 2 - 0.28],
    ];
    for (const [x, z] of boltPos) plate.holes.push(new THREE.Path().absarc(x, z, 0.1, 0, Math.PI * 2, true));
    const plateGeo = new THREE.ExtrudeGeometry(plate, { depth: pt, bevelEnabled: false, curveSegments: 18 });
    plateGeo.rotateX(Math.PI / 2);
    add(solid(plateGeo, look), new THREE.Vector3(0, -H / 2, 0), new THREE.Vector3(0, -1.5, 0));

    // Bracket.
    const bracket = new THREE.Group();
    for (const g of bracketGeometries({ length: 120, holes: 4, ribs: 2 })) bracket.add(solid(g, accent));
    add(bracket, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.15, 0));

    // Bearing ring in the flange bore (lathe profile).
    const boreY = -H / 2 + H * 0.62;
    const flangeX = -L / 2 + BRACKET.T / 2;
    const ringPts = [
      new THREE.Vector2(0.18, -0.2),
      new THREE.Vector2(0.36, -0.2),
      new THREE.Vector2(0.36, -0.12),
      new THREE.Vector2(0.3, -0.12),
      new THREE.Vector2(0.3, 0.12),
      new THREE.Vector2(0.36, 0.12),
      new THREE.Vector2(0.36, 0.2),
      new THREE.Vector2(0.18, 0.2),
      new THREE.Vector2(0.18, -0.2),
    ];
    const ringGeo = new THREE.LatheGeometry(ringPts, 40);
    ringGeo.rotateZ(Math.PI / 2);
    add(solid(ringGeo, look, 30), new THREE.Vector3(flangeX, boreY, 0), new THREE.Vector3(-1.0, 0.25, 0), 0.6);

    // Shaft through the bearing.
    const shaftGeo = new THREE.CylinderGeometry(0.17, 0.17, 1.8, 36, 1);
    shaftGeo.rotateZ(Math.PI / 2);
    add(solid(shaftGeo, look, 30), new THREE.Vector3(flangeX - 0.2, boreY, 0), new THREE.Vector3(-1.7, 0.6, 0), 1.2);

    // Bolts: hex head + shank.
    for (const [x, z] of boltPos) {
      const bolt = new THREE.Group();
      const head = new THREE.CylinderGeometry(0.17, 0.17, 0.12, 6);
      head.translate(0, 0.06, 0);
      const shank = new THREE.CylinderGeometry(0.085, 0.085, 0.55, 16);
      shank.translate(0, -0.27, 0);
      bolt.add(solid(head, look, 30));
      bolt.add(solid(shank, look, 30));
      add(bolt, new THREE.Vector3(x, -H / 2, z), new THREE.Vector3(x * 0.25, 1.9, z * 0.25), 2);
    }

    const floor = dotFloor(22, 0.36, -H / 2 - 1.6);
    scene.add(floor);

    const ptr = { x: 0, y: 0 };
    let shown = 0;

    return {
      update: (t) => {
        const p = clamp(progress.current);
        // Ease toward the scroll target so wheel steps feel continuous.
        shown += (p - shown) * (reducedMotion ? 1 : 0.12);
        const e = smooth(0.12, 0.42, shown) * (1 - smooth(0.62, 0.9, shown));
        for (const pc of pieces) {
          pc.obj.position.copy(pc.home).addScaledVector(pc.dir, e);
          pc.obj.rotation.y = pc.spin * e;
        }
        ptr.x += (pointer.x - ptr.x) * 0.05;
        ptr.y += (pointer.y - ptr.y) * 0.05;
        rig.rotation.y = -0.9 + shown * 1.4 + ptr.x * 0.15;
        rig.rotation.x = 0.08 + ptr.y * 0.05;
        const dist = 7.2 + e * 1.6;
        camera.position.set(0, 2.4 + e * 0.5, dist);
        camera.lookAt(0, -0.25 + e * 0.1, 0);
        rig.position.y = reducedMotion ? 0 : Math.sin(t * 0.7) * 0.03;
      },
      resize: (w, h) => {
        const mobile = w < 768;
        camera.fov = w / h < 0.8 ? 60 : 35;
        // Keep the assembly clear of the captions: right half on desktop, upper area on phones.
        if (mobile) camera.setViewOffset(w, h, 0, h * 0.22, w, h);
        else camera.setViewOffset(w, h, -w * 0.22, 0, w, h);
      },
      dispose: () => {
        look.face.dispose();
        look.edge.dispose();
        accent.face.dispose();
        accent.edge.dispose();
      },
    };
  };
}
