import * as THREE from 'three';
import { texture } from './assets.js';

// Islamische Muster („Islamic patterns“ von GhalebR, CC BY 4.0): als Bilder gebacken (Form mit Transparenz + Relief-Normalen).
// 1 = Medaillon (rund, mit Blattwerk), 2 = Sternquadrat mit Rahmen, 3 = 16-zackiger Stern, 5 = Netz (endlos wiederholbar).
// So kosten die Verzierungen kaum Leistung: eine Fläche statt tausender Dreiecke.
const mats = new Map();
export function patternMat(i, { color = 0xe9dfcb, repeat = [1, 1], metal = 0, emissive = null, rough = 0.6 } = {}) {
  const key = [i, color, repeat, metal, emissive, rough].join('|');
  if (!mats.has(key)) {
    const m = new THREE.MeshStandardMaterial({
      map: texture(`patterns/pattern_${i}.png`, { repeat }), normalMap: texture(`patterns/pattern_${i}_nor.jpg`, { repeat, color: false }),
      color, metalness: metal, roughness: rough, alphaTest: 0.5, side: THREE.DoubleSide, normalScale: new THREE.Vector2(1.2, 1.2),
    });
    if (emissive != null) { m.emissive = new THREE.Color(emissive); m.emissiveMap = m.map; m.emissiveIntensity = 1; }
    mats.set(key, m);
  }
  return mats.get(key);
}

// Gitterfenster (Mashrabiya): Muster vor einer leuchtenden oder dunklen Nische, mit schmalem Rahmen.
// Position = Mitte der Fläche, ry = Blickrichtung der Vorderseite (0 → +z).
export function ornamentPanel(world, { x, y, z, ry = 0, w = 2.6, h = 2.6, i = 2, color = 0xe9dfcb, back = 0xffe2a8, backGlow = 0.9, frame = 0xd8cbb2 }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; world.add(g);
  const bk = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: back, emissive: back, emissiveIntensity: backGlow, roughness: 1 }));
  bk.position.z = -0.12; g.add(bk);
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), patternMat(i, { color })); g.add(p);
  const fm = new THREE.MeshStandardMaterial({ color: frame, roughness: 0.7 });
  for (const [fw, fh, fx, fy] of [[w + 0.3, 0.15, 0, h / 2 + 0.075], [w + 0.3, 0.15, 0, -h / 2 - 0.075], [0.15, h, -w / 2 - 0.075, 0], [0.15, h, w / 2 + 0.075, 0]]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(fw, fh, 0.18), fm); f.position.set(fx, fy, -0.03); f.castShadow = true; g.add(f);
  }
  return g;
}

// Fries: endlos wiederholtes Muster als Band (Länge len, Höhe h) auf einer Wand.
export function ornamentBand(world, { x, y, z, ry = 0, len, h = 0.8, i = 5, color = 0xc9a45a, metal = 0.5 }) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), patternMat(i, { color, repeat: [len / h, 1], metal, rough: 0.4 }));
  m.position.set(x, y, z); m.rotation.y = ry; world.add(m);
  return m;
}

// Bogen-Fassade („Arabic Traditional Doors“ von medbunz, CC BY 4.0, als Bild gebacken): Spitzbogen mit Sternen-Gitter
// in hellem Stein vor einer dunkleren Nische. door: true → Holztür in der Bogenöffnung, sonst eine flache Blendnische.
// Mehrere Module nebeneinander ergeben eine durchgehende verzierte Wand. Position = Mitte unten (Boden), ry = Vorderseite.
export function archFacade(world, { x, y = 0, z, ry = 0, w = 4.6, h = 4.8, door = false, stone = 0xefe7d8, recess = 0xa89a84, wood = 0x6a4428, niche = 0xd9cfbe }) {
  const g = new THREE.Group(); g.position.set(x, y + h / 2, z); g.rotation.y = ry; world.add(g);
  const plane = () => new THREE.PlaneGeometry(w, h);
  const back = new THREE.Mesh(plane(), new THREE.MeshStandardMaterial({ color: recess, roughness: 0.95 })); back.position.z = -0.2; g.add(back);
  const open = door
    ? new THREE.MeshStandardMaterial({ map: texture('patterns/door_open.png'), alphaTest: 0.5, color: wood, roughness: 0.7, normalMap: texture('patterns/pattern_2_nor.jpg', { repeat: [3, 3], color: false }) })
    : new THREE.MeshStandardMaterial({ map: texture('patterns/door_open.png'), alphaTest: 0.5, color: niche, roughness: 0.9 });
  const op = new THREE.Mesh(plane(), open); op.position.z = -0.12; g.add(op);
  const lat = new THREE.Mesh(plane(), new THREE.MeshStandardMaterial({
    map: texture('patterns/door_arch.png'), normalMap: texture('patterns/door_arch_nor.jpg', { color: false }), normalScale: new THREE.Vector2(1.4, 1.4),
    alphaTest: 0.5, color: stone, roughness: 0.75, side: THREE.DoubleSide,
  }));
  lat.castShadow = true; g.add(lat);
  return g;
}

// Musterwand: ganze Wandfläche mit einem islamischen Muster (Gitter in hellem Stein vor dunklerer Nische), nahtlos gekachelt.
// Für Wände ohne Tür. Position = Mitte unten (Boden), ry = Vorderseite, tile = Kachelgröße in Metern.
export function patternWall(world, { x, y = 0, z, ry = 0, w, h, i = 3, tile = 1.4, stone = 0xefe7d8, recess = 0xa89a84 }) {
  const g = new THREE.Group(); g.position.set(x, y + h / 2, z); g.rotation.y = ry; world.add(g);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ color: recess, roughness: 0.95 })); back.position.z = -0.12; g.add(back);
  const lat = new THREE.Mesh(new THREE.PlaneGeometry(w, h), patternMat(i, { color: stone, repeat: [w / tile, h / tile], rough: 0.75 })); lat.castShadow = true; g.add(lat);
  return g;
}
