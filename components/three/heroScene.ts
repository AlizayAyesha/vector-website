import * as THREE from "three";
import type { SceneContext, SceneHandle } from "./stage";
import { BRACKET, MM, bracketGeometries, disposeGroup, dotFloor, lights, makeLook, solid, type BracketParams } from "./parts";

const ease = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x * x * (3 - 2 * x));
const CYCLE = 15;

/** Parameter timeline: plain 80 mm bracket → pull to 120 mm → add holes → add ribs → hold → reset. */
export function paramsAt(t: number): BracketParams {
  const c = t % CYCLE;
  let length = 80;
  if (c < 2) length = 80;
  else if (c < 5) length = 80 + 40 * ease((c - 2) / 3);
  else if (c < 12.5) length = 120;
  else length = 120 - 40 * ease((c - 12.5) / 2);
  const holes = c < 5 || c >= 12.5 ? 0 : Math.min(4, Math.floor((c - 5) / 0.45) + 1);
  const ribs = c < 7.4 || c >= 12.5 ? 0 : Math.min(2, Math.floor((c - 7.4) / 0.6) + 1);
  return { length: Math.round(length), holes, ribs };
}

export function createHeroScene(onParams?: (p: BracketParams) => void) {
  return ({ scene, camera, pointer, reducedMotion }: SceneContext): SceneHandle => {
    scene.fog = new THREE.Fog(0x000000, 11, 24);
    lights(scene);

    const look = makeLook(0.92);
    const ghostLook = makeLook(0.12);

    const rig = new THREE.Group();
    scene.add(rig);

    const part = new THREE.Group();
    rig.add(part);

    // Faint ghost of the original 80 mm part, so the change reads as an edit.
    const ghost = new THREE.Group();
    for (const g of bracketGeometries({ length: 80, holes: 0, ribs: 0 })) {
      const s = solid(g, ghostLook);
      s.children[0].visible = false;
      ghost.add(s);
    }
    rig.add(ghost);

    const floor = dotFloor(20, 0.32, -BRACKET.H / 2 - 0.02);
    scene.add(floor);

    // Dimension line along the front edge.
    const dimMat = new THREE.LineBasicMaterial({ color: 0xa1a1aa, transparent: true, opacity: 0.8 });
    const dim = new THREE.LineSegments(new THREE.BufferGeometry(), dimMat);
    rig.add(dim);

    // Sweeping inspection plane.
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.035,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(BRACKET.W * 1.5, BRACKET.H * 1.3), scanMat);
    scan.rotation.y = Math.PI / 2;
    const scanEdge = new THREE.LineSegments(
      new THREE.EdgesGeometry(scan.geometry),
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 }),
    );
    scan.add(scanEdge);
    rig.add(scan);

    let key = "";
    let curLen = 80;
    const rebuild = (p: BracketParams) => {
      const k = `${p.length}|${p.holes}|${p.ribs}`;
      if (k === key) return;
      key = k;
      curLen = p.length;
      disposeGroup(part);
      for (const g of bracketGeometries(p)) part.add(solid(g, look));
      ghost.position.x = -(p.length - 80) * MM * 0.5; // keep the ghost anchored at the flange

      const L = p.length * MM;
      const z = BRACKET.W / 2 + 0.32;
      const y = -BRACKET.H / 2;
      const x0 = -L / 2;
      const x1 = L / 2;
      const tk = 0.09;
      dim.geometry.dispose();
      dim.geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x0, y, z), new THREE.Vector3(x1, y, z),
        new THREE.Vector3(x0, y, z - tk), new THREE.Vector3(x0, y, z + tk),
        new THREE.Vector3(x1, y, z - tk), new THREE.Vector3(x1, y, z + tk),
        new THREE.Vector3(x0, y, z - 0.3), new THREE.Vector3(x0, y, z - 0.02),
        new THREE.Vector3(x1, y, z - 0.3), new THREE.Vector3(x1, y, z - 0.02),
      ]);
      onParams?.(p);
    };

    const smooth = { x: 0, y: 0 };
    const baseCam = new THREE.Vector3(4.6, 2.5, 5.4);

    const update = (t: number) => {
      const time = reducedMotion ? 10 : t;
      rebuild(paramsAt(time));

      smooth.x += (pointer.x - smooth.x) * 0.05;
      smooth.y += (pointer.y - smooth.y) * 0.05;
      camera.position.set(baseCam.x + smooth.x * 0.9, baseCam.y - smooth.y * 0.6, baseCam.z);
      camera.lookAt(0, -0.15, 0);

      rig.rotation.y = -0.35 + Math.sin(time * 0.18) * 0.35;
      rig.position.y = Math.sin(time * 0.6) * 0.04;

      const L = curLen * MM;
      const s = (time * 0.22) % 1;
      scan.position.x = -L / 2 - 0.4 + s * (L + 0.8);
      scanMat.opacity = 0.035 * Math.sin(s * Math.PI);
      (scanEdge.material as THREE.LineBasicMaterial).opacity = 0.14 * Math.sin(s * Math.PI);
    };

    return {
      update,
      resize: (w, h) => {
        // Pull back on narrow screens; shift the frame (no camera rotation) so the
        // part sits clear of the headline: right on desktop, above the copy on phones.
        const mobile = w < 768;
        const k = mobile ? 2.0 : w < 1100 ? 1.4 : 1.3;
        baseCam.set(4.6 * k, 2.5 * k, 5.4 * k);
        if (mobile) camera.setViewOffset(w, h, 0, h * 0.24, w, h);
        else camera.setViewOffset(w, h, -w * 0.14, h * 0.03, w, h);
      },
      dispose: () => {
        disposeGroup(part);
        look.face.dispose();
        look.edge.dispose();
        ghostLook.face.dispose();
        ghostLook.edge.dispose();
      },
    };
  };
}
