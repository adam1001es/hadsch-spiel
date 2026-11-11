import * as THREE from 'three';
import { arches } from './textures.js';
import { pbr } from './assets.js';

// Masjid al-Haram stark vereinfacht: Marmorboden, drei Arkaden-Ringe, Minarette, Uhrturm.
// glow: Liste von Materialien, deren Leuchten nachts hochgeregelt wird.
export function buildHaram(world) {
  const glow = [];
  const floor = new THREE.Mesh(new THREE.CircleGeometry(420, 96), new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [840 / 1.5, 840 / 1.5]), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  for (const [r, h, rows, reps] of [[57, 15, 2, 26], [92, 32, 3, 36], [150, 50, 4, 52]]) {
    const map = arches(rows, false); map.repeat.set(reps, 1);
    const em = arches(rows, true); em.repeat.set(reps, 1);
    const mat = new THREE.MeshStandardMaterial({ map, emissiveMap: em, emissive: 0xffffff, side: THREE.BackSide, roughness: 0.8 });
    glow.push(mat);
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 128, 1, true), mat);
    ring.position.y = h / 2; world.add(ring);
  }

  const stone = new THREE.MeshStandardMaterial({ color: 0xddd3c0, roughness: 0.7 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xd8b04f, metalness: 0.8, roughness: 0.3 });
  const band = new THREE.MeshBasicMaterial({ color: 0xbdf5d0 });
  [20, 70, 115, 160, 200, 250, 295, 340].forEach((deg, i) => {
    const a = (deg * Math.PI) / 180, H = 88 + (i % 3) * 6;
    const g = new THREE.Group(); g.position.set(Math.cos(a) * 97, 0, Math.sin(a) * 97); world.add(g);
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

  return { glow };
}
