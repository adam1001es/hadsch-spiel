import * as THREE from 'three';
import { kiswa, gold, marble } from './textures.js';

// Ausrichtung im Spiel: Schwarzer Stein an Ecke (-x,+z), Tür auf der +z-Seite, Hijr Ismail an der +x-Seite.
export const KAABA = { w: 12, d: 10.5, h: 13.1, blackStoneAngle: (5 * Math.PI) / 4 };

export function buildKaaba(world) {
  const { w, d, h } = KAABA;
  const side = new THREE.MeshStandardMaterial({ map: kiswa(), roughness: 0.85 });
  const top = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  const k = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [side, side, top, top, side, side]);
  k.position.y = h / 2 + 0.4; k.castShadow = k.receiveShadow = true; world.add(k);

  const base = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.4, d + 0.8), new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.4 }));
  base.position.y = 0.2; base.receiveShadow = true; world.add(base);

  const goldMat = new THREE.MeshStandardMaterial({ map: gold(), metalness: 0.7, roughness: 0.3, emissive: 0x3a2a08 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.4, 0.2), goldMat);
  door.position.set(-w / 2 + 3.2, 0.4 + 2.2 + 2.2, d / 2 + 0.06); world.add(door);

  const silver = new THREE.MeshStandardMaterial({ color: 0xd9dce0, metalness: 0.9, roughness: 0.25 });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.08, 10, 24), silver);
  frame.position.set(-w / 2 - 0.05, 1.9, d / 2 + 0.05); frame.rotation.y = -Math.PI / 4; world.add(frame);
  const stone = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 12), new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.6 }));
  stone.scale.z = 0.4; stone.position.copy(frame.position); stone.rotation.y = -Math.PI / 4; world.add(stone);

  // Hijr Ismail: halbrunde Marmormauer
  const shape = new THREE.Shape();
  const a1 = -Math.PI / 3, a2 = Math.PI / 3;
  shape.absarc(0, 0, 7.4, a1, a2, false);
  shape.absarc(0, 0, 6.6, a2, a1, true);
  const hg = new THREE.ExtrudeGeometry(shape, { depth: 1.3, bevelEnabled: false, curveSegments: 32 });
  hg.rotateX(-Math.PI / 2);
  const hijr = new THREE.Mesh(hg, new THREE.MeshStandardMaterial({ map: marble([0.3, 0.3]), roughness: 0.35 }));
  hijr.position.set(w / 2, 0, 0); hijr.castShadow = hijr.receiveShadow = true; world.add(hijr);

  // Maqam Ibrahim: goldene Glocke vor der Türseite
  const pts = [[0, 0], [0.75, 0], [0.75, 1.6], [0.6, 2.1], [0.25, 2.5], [0.05, 2.9], [0, 2.9]].map(([x, y]) => new THREE.Vector2(x, y));
  const maqam = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), goldMat);
  maqam.position.set(-1.5, 0, d / 2 + 9); maqam.castShadow = true; world.add(maqam);

  return { kaaba: k };
}
