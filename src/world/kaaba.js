import * as THREE from 'three';
import { goldDoor, hizam } from './textures.js';
import { pbr } from './assets.js';

// Ausrichtung im Spiel: Schwarzer Stein an Ecke (-x,+z), Tür auf der +z-Seite, Hijr Ismail an der +x-Seite.
export const KAABA = { w: 12, d: 10.5, h: 13.1, blackStoneAngle: (5 * Math.PI) / 4 };

export function buildKaaba(world) {
  const { w, d, h } = KAABA;
  const y0 = 0.4; // Höhe des Marmorsockels (Shadharwan)

  // Kiswa: schwarzer, gemusterter Webstoff (echte Stofftextur, eingefärbt). Eine Kachel = 3 m, Ornamente ca. 0,75 m.
  const kiswaMat = (len) => new THREE.MeshStandardMaterial({ ...pbr('kiswa', [len / 3, h / 4.5]), roughness: 1, normalScale: new THREE.Vector2(0.9, 0.9) });
  const sideX = kiswaMat(d), sideZ = kiswaMat(w);
  const top = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideX, sideX, top, top, sideZ, sideZ]);
  k.position.y = h / 2 + y0; k.castShadow = k.receiveShadow = true; world.add(k);

  // Sockel aus Marmor, leicht abgeschrägt
  const marbleMat = new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [3, 0.3]), roughness: 1 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.06, y0, 4, 1).rotateY(Math.PI / 4).scale(w * 0.72, 1, d * 0.72), marbleMat);
  base.position.y = y0 / 2; base.receiveShadow = true; world.add(base);

  // Hizam: goldbesticktes Band auf ca. 2/3 Höhe (Kalligrafie nur stilisiert)
  const bandH = 0.95, bandY = y0 + h * 0.68;
  const goldThread = { metalness: 1, roughness: 1 };
  for (const [len, rot, px, pz] of [[w, 0, 0, d / 2], [w, Math.PI, 0, -d / 2], [d, Math.PI / 2, w / 2, 0], [d, -Math.PI / 2, -w / 2, 0]]) {
    const t = hizam(len);
    const band = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.04, bandH), new THREE.MeshStandardMaterial({ map: t.map, metalnessMap: t.metal, roughnessMap: t.metal, ...goldThread }));
    band.position.set(px * 1.004, bandY, pz * 1.004); band.rotation.y = rot;
    world.add(band);
  }

  // Tür (Bab al-Kaaba): massives Gold, ca. 2 m über dem Boden
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8c068, metalness: 1, roughness: 0.3 });
  const dt = goldDoor();
  const doorMat = new THREE.MeshStandardMaterial({ map: dt.map, bumpMap: dt.bump, bumpScale: 2.5, metalness: 1, roughness: 0.3 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.0, 0.18), [goldMat, goldMat, goldMat, goldMat, doorMat, goldMat]);
  door.position.set(-w / 2 + 3.2, y0 + 2.2 + 2.0, d / 2 + 0.07); world.add(door);

  // Schwarzer Stein in silberner Fassung, ca. 1,5 m hoch an der Ostecke
  const silver = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.2 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.09, 16, 40), silver);
  frame.position.set(-w / 2 - 0.05, 1.9, d / 2 + 0.05); frame.rotation.y = -Math.PI / 4; world.add(frame);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.35 }));
  stone.scale.z = 0.4; stone.position.copy(frame.position); stone.rotation.y = -Math.PI / 4; world.add(stone);

  // Hijr Ismail: halbrunde Marmormauer
  const shape = new THREE.Shape();
  const a1 = -Math.PI / 3, a2 = Math.PI / 3;
  shape.absarc(0, 0, 7.4, a1, a2, false);
  shape.absarc(0, 0, 6.6, a2, a1, true);
  const hg = new THREE.ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.04, bevelSegments: 2, curveSegments: 48 });
  hg.rotateX(-Math.PI / 2);
  const hijr = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [0.4, 0.4]), roughness: 1 }));
  hijr.position.set(w / 2, 0, 0); hijr.castShadow = hijr.receiveShadow = true; world.add(hijr);

  // Maqam Ibrahim: goldene Glocke vor der Türseite
  const pts = [[0, 0], [0.75, 0], [0.75, 1.6], [0.6, 2.1], [0.25, 2.5], [0.05, 2.9], [0, 2.9]].map(([x, y]) => new THREE.Vector2(x, y));
  const maqam = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), goldMat);
  maqam.position.set(-1.5, 0, d / 2 + 9); maqam.castShadow = true; world.add(maqam);

  return { kaaba: k };
}
