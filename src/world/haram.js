import * as THREE from 'three';
import { arches } from './textures.js';
import { pbr } from './assets.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 3D-Modell der Moschee (Arkaden, Stockwerke, Minarette), einmal geladen und pro Station geklont.
// Bis es geladen ist (oder falls es fehlt), stehen die einfachen Arkaden-Ringe und Minarette da.
let haramLoad = null;
// Freier Radius des Mataf je Richtung (alle 5°, Winkel = atan2(z, x)): bis zu den ersten Säulen der Arkaden (aus haram.glb gemessen)
const MATAF = [39,39,40,41,42,44,48,50,50,49,48,48,49,49,51,52,57,57,55,54,54,54,54,54,57,57,57,55,53,52,52,48,48,47,47,47,47,49,49,53,53,49,48,47,47,47,48,48,50,51,51,50,50,50,50,51,52,53,53,53,52,51,51,51,46,44,41,40,39,39,38,38];
export function matafRadius(x, z) {
  const a = ((Math.atan2(z, x) * 180 / Math.PI) + 360) % 360 / 5, i = Math.floor(a), f = a - i;
  return MATAF[i % 72] * (1 - f) + MATAF[(i + 1) % 72] * f;
}
export const haramStatus = { state: 'nicht geladen' };
function loadHaram() {
  haramLoad ||= new GLTFLoader().loadAsync('./assets/models/haram.glb').then((g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false; o.receiveShadow = true; // Schatten werfen wäre auf dem Handy zu teuer
      const m = o.material; m.flatShading = !m.map; m.side = THREE.DoubleSide;
      // nachts leicht beleuchtet (wie die angestrahlten Arkaden)
      if (m.name !== '4_Material_Emas' && m.name !== 'material_0') { m.emissive = m.color.clone().multiplyScalar(0.38); m.emissiveIntensity = 0; m.userData.glow = true; }
      m.needsUpdate = true;
    });
    haramStatus.state = 'geladen'; return g.scene;
  }).catch((e) => { haramStatus.state = 'Fehler'; console.warn('haram.glb', e); return null; });
  return haramLoad;
}

// Masjid al-Haram stark vereinfacht: Marmorboden, drei Arkaden-Ringe, Minarette, Uhrturm.
// glow: Liste von Materialien, deren Leuchten nachts hochgeregelt wird.
export function buildHaram(world) {
  const glow = [], simple = [];
  const track = (o) => { simple.push(o); return o; };
  const floor = new THREE.Mesh(new THREE.CircleGeometry(420, 96), new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [840 / 1.5, 840 / 1.5]), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  for (const [r, h, rows, reps] of [[57, 15, 2, 26], [92, 32, 3, 36], [150, 50, 4, 52]]) {
    const map = arches(rows, false); map.repeat.set(reps, 1);
    const em = arches(rows, true); em.repeat.set(reps, 1);
    const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, side: THREE.BackSide, roughness: 0.8 });
    glow.push(mat);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 128, 1, true), mat);
    ring.position.y = h / 2; world.add(track(ring));
  }

  const stone = new THREE.MeshStandardMaterial({ color: 0xddd3c0, roughness: 0.7 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xd8b04f, metalness: 0.8, roughness: 0.3 });
  const band = new THREE.MeshBasicMaterial({ color: 0xbdf5d0 });
  [20, 70, 115, 160, 200, 250, 295, 340].forEach((deg, i) => {
    const a = (deg * Math.PI) / 180, H = 88 + (i % 3) * 6;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * 97, 0, Math.sin(a) * 97); world.add(track(g));
    const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); return o; };
    add(new THREE.CylinderGeometry(2.3, 2.8, H * 0.45, 12), stone, H * 0.225);
    add(new THREE.CylinderGeometry(1.9, 2.3, H * 0.3, 12), stone, H * 0.6);
    add(new THREE.CylinderGeometry(1.5, 1.9, H * 0.15, 12), stone, H * 0.825);
    for (const f of [0.45, 0.75, 0.9]) { add(new THREE.CylinderGeometry(3.4, 3, 1.2, 16), stone, H * f); add(new THREE.CylinderGeometry(3.45, 3.45, 0.35, 16), band, H * f + 0.8); }
    add(new THREE.ConeGeometry(1.7, 7, 12), goldM, H * 0.9 + 4.5);
  });

  const tower = new THREE.Group(); tower.position.set(80, 0, 330); world.add(tower);
  const tm = new THREE.MeshStandardMaterial({ color: 0xd2c8b4, roughness: 0.8 });
  const tw = (geo, y, m = tm) => { const o = new THREE.Mesh(geo, m); o.position.y = y; tower.add(o); };
  tw(new THREE.BoxGeometry(170, 55, 110), 27.5);
  tw(new THREE.BoxGeometry(40, 230, 40), 115);
  tw(new THREE.BoxGeometry(46, 50, 46), 255);
  const face = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.6 });
  glow.push(face);
  const clock = new THREE.Mesh(new THREE.CircleGeometry(18, 48), face); clock.position.set(0, 255, -23.2); clock.rotation.y = Math.PI; tower.add(clock);
  tw(new THREE.CylinderGeometry(1.5, 8, 90, 8), 325, goldM);

  // Echte Arkaden laden und die einfachen Ringe/Minarette ersetzen
  loadHaram().then((sc) => {
    if (!sc || !floor.parent) return;
    const m = sc.clone(true); world.add(m);
    m.traverse((o) => { if (o.isMesh && o.material.userData.glow && !glow.includes(o.material)) glow.push(o.material); });
    for (const o of simple) o.removeFromParent();
  });
  return { glow };
}
