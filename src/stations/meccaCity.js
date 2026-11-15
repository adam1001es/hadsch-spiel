import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MECCA_CITY as T } from '../content/hajj.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { sign, lamps, palms } from '../world/props.js';
import { pbr } from '../world/assets.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createCrowd } from '../world/crowd.js';
import { createAgents } from '../world/agents.js';
import { createLife } from '../world/life.js';
import { createPlayer } from '../core/player.js';
import { viewLine, clearView } from '../core/kit.js';
import { city, clockTower, nabawi } from './balloon.js';
import { bus } from '../world/props.js';
import * as sfx from '../core/sfx.js';
import { createInteract } from '../life/interact.js';
import { BUILDYARD } from '../content/life.js';

// Die Straßen von Mekka: Fußgängerzone vor der Masjid al-Haram (Blick auf den Uhrturm), mit Läden und Dingen zum Erleben:
// Dattelmarkt, Zamzam-Brunnen, Tauben füttern, Heißluftballon. Leicht gebaut (Instanzen, einfache Läden), Pilger gehen umher.
// Weitere Erlebnisse: neuer Eintrag in SPOTS mit obj/objs (leuchtet in der Nähe) und color (gold/green/blue).
let balloonLoad = null;
const dm = new THREE.Object3D();
const ZMIN = -100, ZMAX = 60, HALF = 15; // begehbare Straße

// Ladenzeile: Häuser mit Erdgeschoss-Läden, bunten Markisen und Schildern
function shops(world, side) {
  const wall = new THREE.MeshStandardMaterial({ color: 0xe9e1d2, roughness: 0.85 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x3a4650, roughness: 0.2, metalness: 0.3, emissive: 0x2a2010, emissiveIntensity: 0.6 });
  const awnCols = [0x2f6b55, 0x8a2b2b, 0xc9a24e, 0x2b4f8a, 0xe8e2d4];
  for (let z = ZMIN; z < ZMAX; z += 14) {
    const hgt = 14 + ((z * 7919) % 5 + 5) % 5 * 4, x = side * (HALF + 7);
    const b = new THREE.Mesh(new THREE.BoxGeometry(14, hgt, 13.4), wall); b.position.set(x, hgt / 2, z + 7); b.receiveShadow = true; world.add(b);
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(11, 3.4), glass); shop.position.set(side * (HALF - 0.01), 1.9, z + 7); shop.rotation.y = -side * Math.PI / 2; world.add(shop);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 12), new THREE.MeshStandardMaterial({ color: awnCols[((z / 14) % 5 + 5 | 0) % 5], roughness: 0.7 }));
    aw.position.set(side * (HALF - 1.0), 3.9, z + 7); aw.rotation.z = side * 0.25; world.add(aw);
    for (let k = 0; k < 3; k++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 1.6), glass); w.position.set(side * (HALF - 0.01), 7 + k * 0, z + 3 + k * 4); w.rotation.y = -side * Math.PI / 2; if (hgt > 9) world.add(w); }
  }
}

// Stand mit Tisch und Markise
function stand(world, x, z, ry, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.7 });
  const t = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.4), wood); t.position.y = 0.45; t.castShadow = true; g.add(t);
  for (const sx of [-1.7, 1.7]) for (const sz of [-0.6, 0.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6), wood); p.position.set(sx, 1.3, sz); g.add(p); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.9), new THREE.MeshStandardMaterial({ color, roughness: 0.7 })); roof.position.y = 2.6; roof.rotation.x = 0.12; g.add(roof);
  return g;
}

export function create(ctx, { from, where = 'mecca' } = {}) {
  const medina = where === 'medina';
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(15.5);
  sky.state.shadowSize = 60;
  ui.el.day.textContent = T.day;
  ui.el.title.textContent = medina ? T.titleMedina : T.title;

  const h = heightFn({ r0: 420, r1: 800, amp: 200 });
  buildTerrain(world, h);
  { // heller Marmorboden wie rund um die Haram
    const L = ZMAX - ZMIN + 80, f = new THREE.Mesh(new THREE.PlaneGeometry(HALF * 2 + 2, L).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [(HALF * 2 + 2) / 1.5, L / 1.5]), color: 0xf2eee6, roughness: 0.7 }));
    f.position.set(0, 0.03, (ZMIN + ZMAX) / 2 - 20); f.receiveShadow = true; world.add(f); }
  shops(world, -1); shops(world, 1);
  if (medina) { const g = new THREE.Group(); g.position.set(0, 0, -340); world.add(g); nabawi(g); } // Masjid an-Nabawi am Ende der Straße
  else clockTower(world, 0, -330); // Uhrturm an der Masjid al-Haram
  city(world, { h, rIn: 60, rOut: 600, n: engine.isMobile ? 350 : 600, avoid: (x, z) => (Math.abs(x) < 45 && z > -260) || (medina ? Math.abs(x) < 250 && Math.abs(z + 340) < 200 : Math.hypot(x, z + 330) < 130) });
  const glow = [];
  const ll = []; for (let z = ZMIN; z <= ZMAX; z += 16) ll.push([-HALF + 1.2, 0, z, Math.PI / 2], [HALF - 1.2, 0, z + 8, -Math.PI / 2]);
  lamps(world, ll, glow);
  palms(world, [[-6, 0, ZMIN + 10, 1, 0.8], [6, 0, ZMIN + 10, 2, 0.8], [-6, 0, 35, 3, 0.75], [6, 0, 35, 1, 0.75]]);

  // Erlebnis-Orte (ohne Pfeile und Aufgaben): in der Nähe leuchtet der Rand, ganz nah erscheint der Knopf (src/life/interact.js)
  const SPOTS = [];
  // Dattelmarkt
  { const x = -11, z = 22; const st = stand(world, x, z, Math.PI / 2, 0x2f6b55);
    const dg = new THREE.SphereGeometry(0.035, 6, 4); dg.scale(1, 1.6, 1);
    const dates = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 0.4 }), 300);
    for (let i = 0; i < 300; i++) { const k = i % 3; dm.position.set(x + (Math.random() - 0.5) * 0.9, 0.93 + Math.random() * 0.06, z - 1.2 + k * 1.2 + (Math.random() - 0.5) * 0.7); dm.rotation.set(Math.random() * 3, Math.random() * 3, 0); dm.scale.setScalar(1); dm.updateMatrix(); dates.setMatrixAt(i, dm.matrix); }
    world.add(dates);
    const sg = sign(world, x - 1.6, z, Math.PI / 2, ['تمور', 'Datteln'], { w: 2.6, h: 0.9, y: 3.3 });
    SPOTS.push({ objs: [st, sg], color: 'gold', key: 'dates', name: T.dates, x: x + 2.2, z, label: T.datesDo, run() { ui.info(`<p>${medina ? T.datesInfoMedina : T.datesInfo}</p>`); ui.toast('Bismillah – lecker!', 1800); } }); }
  // Zamzam-Brunnen: Reihe blauer Kanister und Spender
  { const x = 11, z = 2; const st = stand(world, x, z, -Math.PI / 2, 0x2b4f8a);
    const can = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0x3f7fd0, roughness: 0.4 }), 12);
    for (let i = 0; i < 12; i++) { dm.position.set(x + 0.2 * ((i % 2) * 2 - 1), 1.13, z - 1.4 + Math.floor(i / 2) * 0.55); dm.rotation.set(0, 0, 0); dm.updateMatrix(); can.setMatrixAt(i, dm.matrix); }
    world.add(can);
    const sg = sign(world, x + 1.6, z, -Math.PI / 2, ['زمزم', 'Zamzam'], { w: 2.6, h: 0.9, y: 3.3 });
    SPOTS.push({ objs: [st, can, sg], color: 'gold', key: 'zamzam', name: T.zamzam, x: x - 2.2, z, label: T.zamzamDo, run() { sfx.drink(); ui.info(`<p>${T.zamzamInfo}</p>`); } }); }
  // Tauben am Platz
  const PZ = -38, PN = engine.isMobile ? 40 : 70;
  // Taube: Körper, Kopf, Schwanz (eine Form)
  const pgB = new THREE.SphereGeometry(0.15, 8, 6); pgB.scale(0.8, 0.75, 1.3); pgB.translate(0, 0.13, 0);
  const pgH = new THREE.SphereGeometry(0.075, 8, 6); pgH.translate(0, 0.27, 0.15);
  const pgT = new THREE.ConeGeometry(0.07, 0.2, 5); pgT.rotateX(-Math.PI / 2 - 0.3); pgT.translate(0, 0.14, -0.24);
  const pg = mergeGeometries([pgB.toNonIndexed(), pgH.toNonIndexed(), pgT.toNonIndexed()]);
  const pigeons = new THREE.InstancedMesh(pg, new THREE.MeshStandardMaterial({ color: 0x8c8c90, roughness: 0.8 }), PN);
  const P = Array.from({ length: PN }, () => { const a = Math.random() * 6.28, r = 1 + Math.random() * 7; return { x: Math.cos(a) * r, z: PZ + Math.sin(a) * r, ry: Math.random() * 6.28, t: Math.random() * 6, fly: 0 }; });
  const col = new THREE.Color(); for (let i = 0; i < PN; i++) pigeons.setColorAt(i, col.setHSL(0.62, 0.06, 0.55 + Math.random() * 0.25));
  pigeons.castShadow = true; world.add(pigeons);
  let feed = 0;
  SPOTS.push({ obj: pigeons, color: 'gold', radius: 12, near: 4, push: 0.012, key: 'pigeons', name: T.pigeons, x: 0, z: PZ + 9, label: T.pigeonsDo, run() { feed = 12; ui.info(`<p>${T.pigeonsInfo}</p>`); } });
  // Heißluftballon auf dem Platz am Ende der Straße
  const BZ = -82, balloon = new THREE.Group(); balloon.position.set(0, 0, BZ); world.add(balloon);
  balloonLoad ||= new GLTFLoader().loadAsync('./assets/models/balloon.glb').then((g) => g.scene).catch(() => null);
  balloonLoad.then((sc) => { if (sc && balloon.parent) { const m = sc.clone(true); m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); balloon.add(m); } });
  SPOTS.push({ obj: balloon, color: 'blue', radius: 12, near: 3.2, push: 0.04, key: 'balloon', name: T.balloon, x: 2.5, z: BZ + 4, label: T.balloonDo, run() { ctx.balloon?.(where); } });
  // Bus in die andere Stadt (Haltestelle am Anfang der Straße)
  const other = medina ? 'mecca' : 'medina';
  const coach = bus(world, -10, 40, 0).group;
  SPOTS.push({ obj: coach, color: 'blue', radius: 10, near: 2.8, push: 0.04, key: 'bus', name: T.bus, x: -6.3, z: 38, label: medina ? T.busToMecca : T.busToMedina, run() { sfx.bus(); ctx.drive?.(where, other); } });

  // Pilger in der Fußgängerzone
  const N = engine.isMobile ? 70 : 120, crowd = createCrowd(world, N, { ihram: false, men: 0.55 });
  const rr = (a, b) => a + Math.random() * (b - a);
  const agents = createAgents(crowd, N, () => {
    const side = Math.random() < 0.5 ? -1 : 1, x = side * rr(3, HALF - 2.5);
    const stop = Math.random() < 0.4 ? [{ x: side * (HALF - 2), z: rr(ZMIN, ZMAX), wait: rr(4, 10), act: 'stand', face: side * Math.PI / 2 }] : [];
    return Math.random() < 0.5 ? [{ x, z: ZMAX + 10 }, ...stop, { x: x + rr(-2, 2), z: ZMIN - 10 }] : [{ x, z: ZMIN - 10 }, ...stop, { x: x + rr(-2, 2), z: ZMAX + 10 }];
  }, { speed: 1.1, clear: clearView });

  const colliders = [
    { type: 'rect', x0: -HALF + 0.6, x1: HALF - 0.6, z0: ZMIN - 15, z1: ZMAX },
    { type: 'box', x: -11, z: 22, hw: 0.9, hd: 2 }, { type: 'box', x: 11, z: 2, hw: 0.9, hd: 2 },
    { type: 'circle', x: 0.3, z: BZ - 0.9, r: 1.2 }, { type: 'box', x: -10, z: 40, hw: 1.6, hd: 6 },
  ];
  // Wegweiser zu den Bereichen des Lebensspiels (erscheinen hier in der Welt, nicht im Startmenü): Sandstein-Bauhof in der Wüste
  { const sg = sign(world, 10.5, 44, -Math.PI / 2, BUILDYARD.sign, { w: 3.4, h: 1.1, y: 2.6 });
    SPOTS.push({ obj: sg, color: 'blue', radius: 8, near: 2.6, push: 0.03, key: 'bauhof', x: 8.8, z: 44, label: BUILDYARD.go, run() { sfx.bus(); ctx.bauhof?.(where); } }); }
  const start = from === 'bauhof' ? { x: 8, z: 41 } : from === 'balloon' ? { x: 4, z: BZ + 8 } : from === 'bus' ? { x: -5.5, z: 33 } : { x: 0, z: ZMAX - 6 };
  const player = createPlayer(ctx, { x: start.x, z: start.z, heading: Math.PI, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0xf6f4ee, speed: 2.2, fastSpeed: 3.6, colliders, surface: 'stone' });
  const life = createLife(ctx, { kind: 'haram' });
  const interact = createInteract(ctx, player);
  for (const s of SPOTS) interact.add(s);
  ctx.interact = interact; // für Tests

  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${medina ? T.introMedina : T.intro}</p><p class="tr">${T.more}</p>`);
  ui.actions([{ label: T.cert, onClick: () => ctx.backToEnding?.() }]);

  let t = 0;
  return {
    update(dt) {
      t += dt;
      player.update(dt);
      for (const m of glow) m.emissiveIntensity = 0.4;
      agents.update(dt, viewLine(ctx));
      life.update(dt);
      interact.update(dt); // Randleuchten + Aktionsknopf in der Nähe
      // Tauben: picken, weichen dem Spieler aus, kommen beim Füttern zusammen
      feed = Math.max(0, feed - dt);
      const px = player.pos.x, pz = player.pos.z;
      for (let i = 0; i < PN; i++) {
        const b = P[i]; b.t += dt;
        const dx = b.x - px, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < 1.4 && !b.fly) b.fly = 1.2;
        if (b.fly > 0) { b.fly -= dt; b.x += (dx / (d || 1)) * dt * 3; b.z += (dz / (d || 1)) * dt * 3; }
        else if (feed > 0) { const tx = 0 - b.x, tz = PZ + 2 - b.z, td = Math.hypot(tx, tz); if (td > 0.8 + (i % 5) * 0.25) { b.x += (tx / td) * dt * 0.9; b.z += (tz / td) * dt * 0.9; b.ry = Math.atan2(tx, tz); } }
        else if (Math.sin(b.t * 0.7 + i) > 0.98) b.ry += (Math.random() - 0.5) * 2;
        const peck = Math.max(0, Math.sin(b.t * (feed > 0 ? 9 : 3) + i)) * 0.5;
        const y = b.fly > 0 ? Math.sin((1.2 - b.fly) / 1.2 * Math.PI) * 1.2 : 0.03;
        dm.position.set(b.x, y, b.z); dm.rotation.set(peck, b.ry, 0); dm.scale.setScalar(1); dm.updateMatrix(); pigeons.setMatrixAt(i, dm.matrix);
      }
      pigeons.instanceMatrix.needsUpdate = true;
    },
    dispose() { interact.dispose(); ui.prompt(null); ui.goal(null); },
  };
}
