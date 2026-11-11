import * as THREE from 'three';
import { goldDoor } from './textures.js';
import { pbr, texture } from './assets.js';

// Ausrichtung im Spiel: Schwarzer Stein an Ecke (-x,+z), Tür auf der +z-Seite, Hijr Ismail an der +x-Seite.
export const KAABA = { w: 12, d: 10.5, h: 13.1, blackStoneAngle: (5 * Math.PI) / 4 };

export function buildKaaba(world) {
  const { w, d, h } = KAABA;
  const y0 = 0.4; // Bezugshöhe für Band, Tür und Vorhang

  // Kiswa: schwarzer, gemusterter Webstoff (echte Stofftextur, eingefärbt). Eine Kachel = 3 m, Ornamente ca. 0,75 m.
  const kiswaMat = (len) => new THREE.MeshStandardMaterial({ ...pbr('kiswa', [len / 3, h / 4.5]), roughness: 1, normalScale: new THREE.Vector2(0.9, 0.9) });
  const sideX = kiswaMat(d), sideZ = kiswaMat(w);
  const top = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  // Kiswa beginnt erst über dem Steinsockel (wie im Modell); Oberkante bleibt bei h + y0
  const S = 2.0; // Höhe des sichtbaren Steinsockels
  const kh = h + y0 - S;
  for (const m of [sideX, sideZ]) for (const t of [m.map, m.normalMap, m.roughnessMap]) t.repeat.y = kh / 4.5;
  const k = new THREE.Mesh(new THREE.BoxGeometry(w, kh, d), [sideX, sideX, top, top, sideZ, sideZ]);
  k.position.y = S + kh / 2; k.castShadow = k.receiveShadow = true; world.add(k);

  // Steinsockel: graue Granitblöcke (Textur aus demselben CC-BY-Modell, siehe README)
  const stoneMat = (len) => new THREE.MeshStandardMaterial({
    map: texture('kaaba_stone.jpg', { repeat: [len / 2.4, S / 2.4] }), bumpMap: texture('kaaba_stone_bump.jpg', { repeat: [len / 2.4, S / 2.4], color: false }),
    bumpScale: 1.5, roughness: 0.85,
  });
  const stX = stoneMat(d), stZ = stoneMat(w);
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(w + 0.04, S, d + 0.04), [stX, stX, top, top, stZ, stZ]);
  plinth.position.y = S / 2; plinth.castShadow = plinth.receiveShadow = true; world.add(plinth);

  // Shadharwan: weiße, geschwungene Marmorleiste rund um den Fuß (an den Ecken offen, wie im Modell)
  const marbleMat = new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [2, 0.4]), roughness: 1, color: 0xf4f2ee });
  const prof = new THREE.Shape();
  prof.moveTo(0, 0); prof.lineTo(0.6, 0); prof.quadraticCurveTo(0.5, 0.42, 0, 0.55); prof.lineTo(0, 0);
  for (const [len, rot, px, pz] of [[w, -Math.PI / 2, 0, d / 2], [w, Math.PI / 2, 0, -d / 2], [d, 0, w / 2, 0], [d, Math.PI, -w / 2, 0]]) {
    const L = len - 0.6;
    const g = new THREE.ExtrudeGeometry(prof, { depth: L, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.03, bevelSegments: 2, curveSegments: 10 });
    g.translate(0, 0, -L / 2); g.rotateY(rot);
    const m = new THREE.Mesh(g, marbleMat); m.position.set(px * 1.002, 0, pz * 1.002); m.castShadow = m.receiveShadow = true; world.add(m);
  }

  // Hizam: goldbesticktes Band auf ca. 2/3 Höhe – echte Kalligrafie (Texturen aus dem CC-BY-Modell
  // „Holy Kaaba – Mecca – Low Poly“ von haidarzafermoayad, vergrößert und geschärft; Quellen: public/assets/textures/README.md).
  // *_mr.jpg = Maske: G = Rauheit, B = Metall → Goldfäden glänzen metallisch, der Stoff bleibt matt.
  const embroidered = (name, repeat = [1, 1], extra = {}) => new THREE.MeshStandardMaterial({
    map: texture(`${name}.${extra.png ? 'png' : 'jpg'}`, { repeat }),
    metalnessMap: texture(`${name}_mr.jpg`, { repeat, color: false }), roughnessMap: texture(`${name}_mr.jpg`, { repeat, color: false }),
    metalness: 1, roughness: 1, ...(extra.png ? { transparent: false, alphaTest: 0.45 } : {}),
  });
  const bandH = 1.0, bandY = y0 + h * 0.68;
  const hizamA = embroidered('hizam_a'), hizamB = embroidered('hizam_b'), panels = embroidered('kiswa_panels', [1, 1], { png: true });
  for (const [len, rot, px, pz, mat] of [[w, 0, 0, d / 2, hizamA], [w, Math.PI, 0, -d / 2, hizamA], [d, Math.PI / 2, w / 2, 0, hizamB], [d, -Math.PI / 2, -w / 2, 0, hizamB]]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(len + 0.04, bandH), mat);
    band.position.set(px * 1.004, bandY, pz * 1.004); band.rotation.y = rot;
    world.add(band);
    // Schriftfelder und Medaillons unter dem Band (Hintergrund durchsichtig → Webstoff bleibt sichtbar)
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(len * 0.92, len * 0.92 * (194 / 2006)), panels);
    pl.position.set(px * 1.005, bandY - bandH / 2 - 0.35 - len * 0.92 * (194 / 2006) / 2, pz * 1.005); pl.rotation.y = rot;
    world.add(pl);
  }

  // Tür (Bab al-Kaaba): massives Gold, ca. 2 m über dem Boden
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xe8c068, metalness: 1, roughness: 0.3 });
  const dt = goldDoor();
  const doorMat = new THREE.MeshStandardMaterial({ map: dt.map, bumpMap: dt.bump, bumpScale: 2.5, metalness: 1, roughness: 0.3 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.4, 4.0, 0.18), [goldMat, goldMat, goldMat, goldMat, doorMat, goldMat]);
  door.position.set(-w / 2 + 3.2, y0 + 2.2 + 2.0, d / 2 + 0.07); world.add(door);
  // Sitara: bestickter Vorhang vor der Tür (Textur aus demselben CC-BY-Modell)
  const sitara = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 3.3 * (1464 / 808)), embroidered('sitara'));
  sitara.position.set(-w / 2 + 3.2, y0 + 1.5 + 3.3 * (1464 / 808) / 2, d / 2 + 0.17); world.add(sitara);

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
