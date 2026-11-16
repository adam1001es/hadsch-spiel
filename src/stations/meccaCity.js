import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MECCA_CITY as T } from '../content/hajj.js';
import { BUILDYARD, CITY as C } from '../content/life.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { sign, lamps, palms, bus, mosque } from '../world/props.js';
import { pbr } from '../world/assets.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { createCrowd } from '../world/crowd.js';
import { createAgents } from '../world/agents.js';
import { createLife } from '../world/life.js';
import { createPlayer } from '../core/player.js';
import { viewLine, clearView } from '../core/kit.js';
import { city, nabawi } from './balloon.js';
import { buildHaram } from '../world/haram.js';
import { createTowers, abrajAlBait, umbrellas, walkable, createTraffic, benches, bollards, cityNight } from '../world/cityscape.js';
import { PRAYER_UI as U } from '../content/life.js';
import { clock } from '../life/clock.js';
import { createPrayer } from '../life/prayer.js';
import { showMinimap } from '../life/minimap.js';
import { createInteract } from '../life/interact.js';
import { createBorrow } from '../life/borrow.js';
import { BORROW } from '../content/life.js';
import * as sfx from '../core/sfx.js';

// Mekka und Medina nach dem Hadsch – angelehnt an den echten Stadtplan (vereinfachte Lerndarstellung).
// Koordinaten wie in den Hadsch-Stationen: Mitte der Moschee bei (0, 0), Süden = +z.
// Mekka: Masjid al-Haram im Norden, davor der große Marmorplatz, östlich davon der Uhrturm-Komplex Abraj al-Bait (601 m),
//        nach Süden die Hotel-Boulevardstraße (Läden im Erdgeschoss), eine Querstraße mit Verkehr und Ampel, Bus und Ballonplatz.
// Medina: Masjid an-Nabawi mit Grüner Kuppel, Vorplatz mit großen Schirmen, helle Hotels ringsum, Boulevard, Straße, Platz.
// Erlebnis-Orte (Datteln, Zamzam, Tauben, Ballon, Bus, Bauhof) leuchten in der Nähe (src/life/interact.js), keine Pfeile.
let balloonLoad = null;
const dm = new THREE.Object3D();

const LAYOUT = {
  mecca: {
    bx: -55, plaza: { x0: -150, x1: 230, z0: 205, z1: 263 }, roadZ: 470, endZ: 600, square: { x0: -150, x1: 40 },
    hotelH: [90, 170], style: 'mecca', alt: 'glass',
    dates: [-66, 330], zamzam: [20, 232], pigeons: [-100, 234], balloon: [-100, 565], bus: [0, 495], bauhof: [22, 494], haramInfo: [-20, 212],
    gate: [-35, 209], mats: [10, 236], bounds: { x0: -420, x1: 420, z0: -240, z1: 680 },
    mosques: [{ x: -128, z: 578, ry: Math.PI / 2, spot: [-114, 578] }, { x: 85, z: 448, ry: 0, spot: [85, 460], court: { x0: 74, x1: 96, z0: 456, z1: 466 } }],
  },
  medina: {
    bx: 0, plaza: { x0: -225, x1: 225, z0: 113, z1: 190 }, roadZ: 430, endZ: 560, square: { x0: -120, x1: 120 },
    hotelH: [45, 90], style: 'medina', alt: 'medina',
    dates: [-11, 300], zamzam: [40, 160], pigeons: [-70, 160], balloon: [-70, 525], bus: [40, 455], bauhof: [62, 454], haramInfo: [24, 118],
    gate: [40, 115], mats: [-30, 128], bounds: { x0: -320, x1: 320, z0: -260, z1: 600 },
    mosques: [{ x: 100, z: 530, ry: -Math.PI / 2, spot: [86, 530] }, { x: 100, z: 408, ry: 0, spot: [100, 420], court: { x0: 89, x1: 111, z0: 416, z1: 426 } }],
  },
};

// Stand mit Tisch und Markise
function stand(world, x, z, ry, color) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
  const wood = new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.7 });
  const t = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.4), wood); t.position.y = 0.45; t.castShadow = true; g.add(t);
  for (const sx of [-1.7, 1.7]) for (const sz of [-0.6, 0.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.6), wood); p.position.set(sx, 1.3, sz); g.add(p); }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(4, 0.1, 1.9), new THREE.MeshStandardMaterial({ color, roughness: 0.7 })); roof.position.y = 2.6; roof.rotation.x = 0.12; g.add(roof);
  return g;
}

// Infotafel (Pult mit Schrift), leuchtet in der Nähe
function plaque(world, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
  const m = new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.6, metalness: 0.3 });
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), m); post.position.y = 0.55; g.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.06), m); board.position.set(0, 1.25, 0); board.rotation.x = -0.5; g.add(board);
  const gold = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.6), new THREE.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.8, roughness: 0.35 })); gold.position.set(0, 1.27, 0.035); gold.rotation.x = -0.5; g.add(gold);
  return g;
}

export function create(ctx, { from, where = 'mecca' } = {}) {
  const medina = where === 'medina';
  const L = LAYOUT[where] || LAYOUT.mecca;
  const { engine, sky, ui } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  sky.state.shadowSize = 70;
  ui.el.day.textContent = T.day;
  ui.el.title.textContent = medina ? T.titleMedina : T.title;
  const { bx, plaza: PZ, roadZ: RZ, endZ: EZ } = L;
  const BW = 15; // halbe Breite der Boulevardstraße
  const rr = (a, b) => a + Math.random() * (b - a);
  let s = medina ? 7 : 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; // feste Zufallsfolge → Stadt sieht immer gleich aus

  // ---------- Gelände, Böden ----------
  const h = heightFn({ r0: 900, r1: 1500, amp: 260 });
  { const tg = new THREE.Group(); tg.position.y = -0.08; world.add(tg); buildTerrain(tg, h, 3400); }
  const floorMat = (w, d, col = 0xf2eee6) => new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [w / 1.5, d / 1.5]), color: col, roughness: 0.7 });
  const pave = (x0, x1, z0, z1, col, y = 0.03) => { const w = x1 - x0, d = z1 - z0, f = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), floorMat(w, d, col)); f.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); f.receiveShadow = true; world.add(f); };

  // ---------- Wahrzeichen ----------
  const towers = createTowers(world, { podiumStyle: medina ? 'medinaPodium' : 'podium' });
  let glow = [], abraj = null, umbrellaPoles = [];
  if (medina) {
    const g = new THREE.Group(); world.add(g); nabawi(g, { umbrellas: false });
    // große Schirme auf dem Vorplatz (Reihen rund um die Moschee)
    const U = [];
    for (let x = -210; x <= 210; x += 26) for (const z of [128, 154, 180]) if (Math.abs(x - bx) > 18 || z < 140) U.push([x, z]);
    for (let x = -210; x <= 210; x += 26) for (const z of [-128, -154, -180]) U.push([x, z]);
    for (let z = -100; z <= 100; z += 26) for (const x of [-170, -200, 170, 200]) U.push([x, z]);
    umbrellas(world, U);
    umbrellaPoles = U;
  } else {
    ({ glow } = buildHaram(world, { tower: false }));
    abraj = abrajAlBait(world, towers, { x: 65, z: 338, sky });
  }

  // ---------- begehbare Flächen ----------
  const blvd = { x0: bx - BW, x1: bx + BW, z0: PZ.z1 - 2, z1: EZ };
  const walkN = { x0: -150, x1: 150, z0: RZ - 5, z1: RZ + 0.5 };       // Gehweg nördlich der Straße
  const square = { x0: L.square.x0, x1: L.square.x1, z0: RZ + 19.5, z1: EZ }; // Platz südlich der Straße
  const rects = [PZ, blvd, walkN, square, ...L.mosques.filter((m) => m.court).map((m) => m.court)];
  pave(blvd.x0, blvd.x1, PZ.z1 - 1, RZ, 0xeeeae2);
  pave(walkN.x0, walkN.x1, walkN.z0, RZ, 0xe2ddd3);
  pave(square.x0, square.x1, RZ + 20, EZ + 10, 0xeeeae2);
  if (medina) pave(PZ.x0, PZ.x1, PZ.z0 - 3, PZ.z1, 0xf4f1ea, 0.07);

  // ---------- Hotels entlang Platz, Boulevard und Straße ----------
  const [h0, h1] = L.hotelH;
  const hotel = (x0, x1, z0, z1, opt = {}) => { const w = x1 - x0, d = z1 - z0; if (w < 12 || d < 12) return; towers.add((x0 + x1) / 2, (z0 + z1) / 2, w, d, opt.h ?? h0 + rnd() * (h1 - h0), { style: rnd() < 0.25 ? L.alt : L.style, tint: 0.9 + rnd() * 0.12, ...opt }); };
  const row = (fixed0, fixed1, a0, a1, alongX, opt) => { // Häuserzeile mit Gassen
    let a = a0; while (a < a1 - 14) { const len = Math.min(a1 - a, 36 + rnd() * 22); alongX ? hotel(a, a + len, fixed0, fixed1, opt) : hotel(fixed0, fixed1, a, a + len, opt); a += len + 7; }
  };
  const shopFronts = []; // [x, z, ry] für Ladenschilder
  // West- und Ostseite des Boulevards (Mekka: Ostseite bis zum Uhrturm-Sockel frei)
  row(bx - BW - 44, bx - BW, PZ.z1, RZ - 5, false); for (let z = PZ.z1 + 20; z < RZ - 20; z += 46) shopFronts.push([bx - BW + 0.05, z, Math.PI / 2]);
  if (medina) { row(bx + BW, bx + BW + 44, PZ.z1, RZ - 5, false); for (let z = PZ.z1 + 20; z < RZ - 20; z += 46) shopFronts.push([bx + BW - 0.05, z + 20, -Math.PI / 2]); }
  else { hotel(bx + BW, bx + BW + 50, 423, RZ - 5); for (let z = 280; z < 400; z += 40) shopFronts.push([bx + BW - 0.05, z, -Math.PI / 2]); }
  // Hotels am Platz
  if (medina) {
    row(PZ.z1 + 0.1, PZ.z1 + 50, PZ.x0, bx - BW - 50, true); row(PZ.z1 + 0.1, PZ.z1 + 50, bx + BW + 50, PZ.x1, true);
    row(PZ.x0 - 60, PZ.x0, -200, PZ.z1, false); row(PZ.x1, PZ.x1 + 60, -200, PZ.z1, false);
    row(-260, -200, -230, 230, true);
  } else {
    row(PZ.x0 - 60, PZ.x0, 150, 330, false, { style: 'glass', h: undefined }); // Jabal-Omar-Seite (westlich)
    for (const [x, z, w, hh] of [[-260, 130, 46, 190], [-300, 230, 50, 160], [-330, 330, 44, 200], [-240, 365, 50, 150]]) towers.add(x, z, w, w, hh, { style: 'glass', podium: 10 });
    row(PZ.x1, PZ.x1 + 55, 210, 330, false);
  }
  // Straße: Häuser auf der Nordseite (außerhalb des Boulevards) und rund um den südlichen Platz
  row(RZ - 50, RZ - 5, 160, 400, true); row(RZ - 50, RZ - 5, -400, -160, true);
  row(RZ + 20, RZ + 70, square.x1 + 0.1, 400, true); row(RZ + 20, RZ + 70, -400, square.x0 - 0.1, true);
  row(EZ + 10, EZ + 60, square.x0 - 20, square.x1 + 20, true);
  for (const [x, z, ry] of shopFronts) { const k = (shopFronts.length + Math.round(x * 3 + z)) % C.shops.length; sign(world, x, z, ry, C.shops[(k + 10) % C.shops.length], { w: 5.2, h: 1.3, y: 6.6, wall: true }); }
  towers.build();
  // Häuser auf den Hügeln (Wohnviertel)
  city(world, { h, rIn: 300, rOut: 1300, n: mobile ? 350 : 650, seed: medina ? 5 : 2,
    avoid: (x, z) => Math.hypot(x, z) < (medina ? 300 : 260) || (x > -420 && x < 420 && z > 100 && z < EZ + 80) });

  // ---------- Straße mit Verkehr ----------
  let agents = null;
  const traffic = createTraffic(world, { z0: RZ, crossX: bx, crossW: BW * 2, mobile, taxis: medina ? 0.35 : 0.5,
    people: () => { const out = [player.pos]; for (const o of ctx.multi?.status?.().others || []) if (o.x != null && o.s === ctx.stationIndex) out.push(o); if (agents) for (const a of agents.list) if (Math.abs(a.z - RZ - 10) < 14) out.push(a); return out; } });
  const B = []; for (let x = -150; x <= 150; x += 3) if (Math.abs(x - bx) > BW + 1) B.push([x, RZ - 0.5], [x, RZ + 20.5]);
  bollards(world, B);

  // ---------- Straßenmöbel ----------
  const glowLamps = [];
  const ll = [];
  for (let z = PZ.z1 + 6; z < EZ; z += 18) { if (Math.abs(z - RZ - 10) < 14) continue; ll.push([bx - BW + 1.2, 0, z, Math.PI / 2], [bx + BW - 1.2, 0, z + 9, -Math.PI / 2]); }
  for (let x = PZ.x0 + 15; x < PZ.x1 - 10; x += 30) ll.push([x, 0, PZ.z1 - 4, Math.PI]);
  lamps(world, ll, glowLamps);
  const sq = square;
  palms(world, [[sq.x0 + 12, 0, sq.z0 + 18, 1, 0.8], [sq.x1 - 12, 0, sq.z0 + 18, 2, 0.8], [sq.x0 + 12, 0, EZ - 8, 3, 0.75], [sq.x1 - 12, 0, EZ - 8, 1, 0.8], ...(medina ? [[bx - 9, 0, PZ.z1 + 40, 2, 0.75], [bx + 9, 0, PZ.z1 + 90, 3, 0.75], [bx - 9, 0, PZ.z1 + 140, 1, 0.75], [bx + 9, 0, PZ.z1 + 190, 2, 0.75]] : [])]);
  benches(world, [[sq.x0 + 20, sq.z0 + 30, 0], [sq.x0 + 26, sq.z0 + 30, 0], [sq.x1 - 20, sq.z0 + 40, Math.PI], [bx - BW + 1.5, PZ.z1 + 60, Math.PI / 2], [bx - BW + 1.5, PZ.z1 + 120, Math.PI / 2], [bx + BW - 1.5, PZ.z1 + 150, -Math.PI / 2]]);
  sign(world, bx + BW - 2, PZ.z1 + 4, -Math.PI / 2, C.street(medina), { w: 3.6, h: 1.1, y: 2.8 });

  // ---------- Erlebnis-Orte ----------
  const SPOTS = [];
  // Dattelstand
  { const [x, z] = L.dates; const st = stand(world, x, z, Math.PI / 2, 0x2f6b55);
    const dg = new THREE.SphereGeometry(0.035, 6, 4); dg.scale(1, 1.6, 1);
    const dates = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ color: 0x4a2414, roughness: 0.4 }), 300);
    for (let i = 0; i < 300; i++) { const k = i % 3; dm.position.set(x + (Math.random() - 0.5) * 0.9, 0.93 + Math.random() * 0.06, z - 1.2 + k * 1.2 + (Math.random() - 0.5) * 0.7); dm.rotation.set(Math.random() * 3, Math.random() * 3, 0); dm.scale.setScalar(1); dm.updateMatrix(); dates.setMatrixAt(i, dm.matrix); }
    world.add(dates);
    const sg = sign(world, x - 1.6, z, Math.PI / 2, ['تمور', 'Datteln'], { w: 2.6, h: 0.9, y: 3.3 });
    SPOTS.push({ objs: [st, sg], color: 'gold', key: 'dates', x: x + 2.2, z, label: T.datesDo, run() { ui.info(`<p>${medina ? T.datesInfoMedina : T.datesInfo}</p>`); ui.toast('Bismillah – lecker!', 1800); } }); }
  // Zamzam-Spender
  { const [x, z] = L.zamzam; const st = stand(world, x, z, 0, 0x2b4f8a);
    const can = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.16, 0.45, 10), new THREE.MeshStandardMaterial({ color: 0x3f7fd0, roughness: 0.4 }), 12);
    for (let i = 0; i < 12; i++) { dm.position.set(x - 1.4 + Math.floor(i / 2) * 0.55, 1.13, z + 0.2 * ((i % 2) * 2 - 1)); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); can.setMatrixAt(i, dm.matrix); }
    world.add(can);
    const sg = sign(world, x, z - 1.6, 0, ['زمزم', 'Zamzam'], { w: 2.6, h: 0.9, y: 3.3 });
    SPOTS.push({ objs: [st, can, sg], color: 'gold', key: 'zamzam', x, z: z + 2.2, label: T.zamzamDo, run() { sfx.drink(); ui.info(`<p>${T.zamzamInfo}</p>`); } }); }
  // Tauben am Platz
  const [PX, PZc] = L.pigeons, PN = mobile ? 40 : 70;
  const pgB = new THREE.SphereGeometry(0.15, 8, 6); pgB.scale(0.8, 0.75, 1.3); pgB.translate(0, 0.13, 0);
  const pgH = new THREE.SphereGeometry(0.075, 8, 6); pgH.translate(0, 0.27, 0.15);
  const pgT = new THREE.ConeGeometry(0.07, 0.2, 5); pgT.rotateX(-Math.PI / 2 - 0.3); pgT.translate(0, 0.14, -0.24);
  const pigeons = new THREE.InstancedMesh(mergeGeometries([pgB.toNonIndexed(), pgH.toNonIndexed(), pgT.toNonIndexed()]), new THREE.MeshStandardMaterial({ color: 0x8c8c90, roughness: 0.8 }), PN);
  const P = Array.from({ length: PN }, () => { const a = Math.random() * 6.28, r = 1 + Math.random() * 7; return { x: PX + Math.cos(a) * r, z: PZc + Math.sin(a) * r, ry: Math.random() * 6.28, t: Math.random() * 6, fly: 0 }; });
  const col = new THREE.Color(); for (let i = 0; i < PN; i++) pigeons.setColorAt(i, col.setHSL(0.62, 0.06, 0.55 + Math.random() * 0.25));
  pigeons.castShadow = true; world.add(pigeons);
  let feed = 0;
  SPOTS.push({ obj: pigeons, color: 'gold', radius: 12, near: 4, push: 0.012, key: 'pigeons', x: PX, z: PZc + 9, label: T.pigeonsDo, run() { feed = 12; ui.info(`<p>${T.pigeonsInfo}</p>`); } });
  // Heißluftballon auf dem Platz südlich der Straße
  const [BXb, BZb] = L.balloon, balloon = new THREE.Group(); balloon.position.set(BXb, 0, BZb); world.add(balloon);
  balloonLoad ||= new GLTFLoader().loadAsync('./assets/models/balloon.glb').then((g) => g.scene).catch(() => null);
  balloonLoad.then((sc) => { if (sc && balloon.parent) { const m = sc.clone(true); m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); balloon.add(m); } });
  SPOTS.push({ obj: balloon, color: 'blue', radius: 12, near: 3.2, push: 0.04, key: 'balloon', x: BXb + 2.5, z: BZb + 4, label: T.balloonDo, run() { ctx.balloon?.(where); } });
  // Bus in die andere Stadt (Haltestelle am Platz, längs der Straße)
  const other = medina ? 'mecca' : 'medina';
  const [BUx, BUz] = L.bus, coach = bus(world, BUx, BUz, Math.PI / 2);
  SPOTS.push({ obj: coach.group, color: 'blue', radius: 10, near: 3, push: 0.04, key: 'bus', x: BUx, z: BUz + 2.6, label: medina ? T.busToMecca : T.busToMedina, run() { sfx.bus(); ctx.drive?.(where, other); } });
  sign(world, BUx - 8, BUz + 2.2, 0, ['موقف الحافلات', 'Bushaltestelle'], { w: 2.8, h: 0.9, y: 2.6 });
  // Wegweiser zu den Bereichen des Lebensspiels (erscheinen in der Welt, nicht im Startmenü)
  { const [x, z] = L.bauhof; const sg = sign(world, x, z, 0, BUILDYARD.sign, { w: 3.4, h: 1.1, y: 2.6 });
    SPOTS.push({ obj: sg, color: 'blue', radius: 8, near: 2.6, push: 0.03, key: 'bauhof', x, z: z + 1.8, label: BUILDYARD.go, run() { sfx.bus(); ctx.bauhof?.(where); } }); }
  // Infotafeln an den Wahrzeichen
  { const [x, z] = L.haramInfo; const pq = plaque(world, x, z, 0);
    SPOTS.push({ obj: pq, color: 'gold', radius: 6, near: 2, key: 'info-main', x, z: z + 1.2, label: medina ? C.nabawiDo : C.haramDo, run() { ui.info(`<p>${medina ? C.nabawi : C.haram}</p>`); ui.el.panel.classList.remove('collapsed'); } }); }
  if (!medina) { const pq = plaque(world, 30, 257, Math.PI);
    SPOTS.push({ obj: pq, color: 'gold', radius: 6, near: 2, key: 'info-clock', x: 30, z: 255.6, label: C.clockDo, run() { ui.info(`<p>${C.clock}</p>`); ui.el.panel.classList.remove('collapsed'); } }); }

  // ---------- Moscheen, Eingang der großen Moschee, Gebetsplatz ----------
  const glowMosque = [], mosqueCols = [], mosqueFoot = [];
  L.mosques.forEach((m, i) => {
    const g = mosque(world, { x: m.x, z: m.z, ry: m.ry, w: 22, d: 18, h: 7, minarets: 1, glow: glowMosque });
    const c = Math.cos(m.ry), sn = Math.sin(m.ry), mx = m.x + 14 * c + 6 * sn, mz = m.z - 14 * sn + 6 * c; // Minarett (lokal 14 | 6)
    mosqueCols.push({ type: 'box', x: m.x, z: m.z, hw: 11, hd: 9, rot: m.ry }, { type: 'circle', x: mx, z: mz, r: 1.8 });
    mosqueFoot.push({ x: m.x, z: m.z, w: 22, d: 18, ry: m.ry });
    m.obj = g; m.name = U.mosqueNames[i] || 'Moschee';
  });
  { const [x, z] = L.gate; const sg = sign(world, x, z, 0, medina ? ['المسجد النبوي', 'Eingang zur Moschee'] : ['المسجد الحرام', 'Eingang zur Haram'], { w: 3.4, h: 1.1, y: 2.8 });
    SPOTS.push({ obj: sg, color: 'gold', radius: 9, near: 3, push: 0.03, key: 'gate', x, z: z + 2, label: medina ? U.enterNabawi : U.enterHaram, run() { medina ? ctx.nabawiVisit?.() : ctx.haramVisit?.(); } }); }
  // Gebetsteppiche auf dem Platz (hier kann man auch beten – in Mekka mit Blick zur Kaaba)
  const mats = new THREE.Group(); world.add(mats);
  { const [x, z] = L.mats, cols = [0x7e2a22, 0x22405f, 0x2e5a4a, 0x5a1f3a], q = medina ? { x: x - 170, z: z + 1000 } : { x: 0, z: 0 }, a = Math.atan2(q.x - x, q.z - z);
    for (let i = 0; i < 6; i++) { const mm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 2), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.9 })); const o = (i - 2.5) * 1.3; mm.position.set(x + Math.cos(a) * o, 0.05, z - Math.sin(a) * o); mm.rotation.y = a; mats.add(mm); } }

  // ---------- Menschen ----------
  const N = mobile ? 90 : 150, crowd = createCrowd(world, N, { ihram: false, men: 0.55 });
  const zones = [PZ, { ...blvd, z1: RZ - 1 }, square];
  const inZone = (q, m = 3) => ({ x: rr(q.x0 + m, q.x1 - m), z: rr(q.z0 + m, q.z1 - m) });
  const zoneOf = (p) => (p.z < PZ.z1 - 1 ? 0 : p.z < RZ ? 1 : 2);
  const via = (a, b) => { // Übergänge: Platz ↔ Boulevard über die Einmündung, Boulevard ↔ Südplatz über den Zebrastreifen
    const za = zoneOf(a), zb = zoneOf(b), out = [];
    if (za === zb) return out;
    const up = za < zb, J1 = { x: bx + rr(-6, 6), z: PZ.z1 - 3 }, X1 = { x: bx + rr(-8, 8), z: RZ - 2 }, X2 = { x: bx + rr(-8, 8), z: RZ + 22 };
    if (up) { if (za === 0) out.push(J1); if (zb === 2) out.push(X1, X2); } else { if (za === 2) out.push(X2, X1); if (zb === 0) out.push(J1); }
    return out;
  };
  agents = createAgents(crowd, N, (i) => {
    const pts = []; let prev = inZone(zones[i % 3 === 2 ? 2 : i % 3]);
    pts.push(prev);
    for (let k = 0; k < 3; k++) {
      const q = zones[Math.random() < 0.5 ? zoneOf(prev) : (Math.random() * 3) | 0], nx = inZone(q);
      if (Math.random() < 0.35) nx.wait = rr(3, 9), nx.act = 'stand';
      pts.push(...via(prev, nx), nx); prev = nx;
    }
    return pts;
  }, { speed: 1.1, clear: clearView });

  // ---------- Spielfigur ----------
  const groundH = (x, z) => Math.max(0, h(x, z) - 0.08); // Wüste und Berge sind begehbar und befahrbar
  for (const c of mosqueCols) c.h = 35;
  const colliders = [
    // keine unsichtbaren Wände: nur Gebäude halten auf (Hotels, Uhrturm, Moscheen, Haram/Nabawi); h = Höhe für den Helikopter
    ...towers.footprints.map((f) => ({ type: 'box', x: f.x, z: f.z, hw: f.w / 2, hd: f.d / 2, rot: f.ry || 0, h: f.h })),
    ...(medina ? [{ type: 'box', x: 0, z: 0, hw: 150, hd: 110, h: 40 }] : [{ type: 'box', x: 115, z: -7, hw: 225, hd: 207, h: 110 }]),
    { type: 'box', x: L.dates[0], z: L.dates[1], hw: 0.9, hd: 2 }, { type: 'box', x: L.zamzam[0], z: L.zamzam[1], hw: 2, hd: 0.9 },
    { type: 'circle', x: BXb + 0.3, z: BZb - 0.9, r: 1.2 }, coach.collider,
    ...umbrellaPoles.map(([x, z]) => ({ type: 'circle', x, z, r: 0.5 })), ...mosqueCols,
    ...(medina ? [-150, 0, 150].map((x) => ({ type: 'circle', x, z: 110, r: 5 })) : []), // Minarette an der Südseite der Nabawi
  ];
  const start = from === 'haram' || from === 'nabawi' ? { x: L.gate[0], z: L.gate[1] + 7, h: 0 } : from === 'bauhof' ? { x: L.bauhof[0], z: L.bauhof[1] + 4, h: Math.PI } : from === 'balloon' ? { x: BXb + 4, z: BZb + 8, h: Math.PI } : from === 'bus' ? { x: BUx - 2, z: BUz + 5, h: Math.PI } : { x: bx + 22, z: PZ.z1 - 14, h: Math.PI };
  const player = createPlayer(ctx, { x: start.x, z: start.z, heading: start.h, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, speed: 2.2, fastSpeed: 4, colliders, ground: groundH, surface: 'stone' });
  const life = createLife(ctx, { kind: 'haram' });
  const interact = createInteract(ctx, player);
  for (const sp of SPOTS) interact.add(sp);
  ctx.interact = interact; // für Tests
  // Beten: Spieluhr, Adhan, Moscheen und Gebetsteppiche leuchten zur Gebetszeit
  const qibla = (x, z) => (medina ? { x: x - 170, z: z + 1000 } : { x: 0, z: 0 }); // Mekka: zur Kaaba; Medina: Richtung Mekka (Süd-Südwest)
  const prayer = createPrayer(ctx, { city: where, player, qibla });
  prayer.interact = interact;
  for (const m of L.mosques) interact.add(prayer.spot({ obj: m.obj, x: m.spot[0], z: m.spot[1], key: 'pray-' + m.name, radius: 14 }));
  interact.add(prayer.spot({ obj: mats, x: L.mats[0], z: L.mats[1], key: 'pray-mats', radius: 8, near: 3.5 }));
  prayer.update(0);
  // Gemeinschaftsgebet: Menschen stellen sich in Reihen auf (Mekka: Bögen um die Kaaba auf dem Platz), in Medina gehen sie zur Moschee
  const slots = [];
  if (!medina) { for (let r = 212; r < 258 && slots.length < N; r += 1.4) for (let a = -Math.PI / 2 - 0.5; a < -Math.PI / 2 + 0.5; a += 0.9 / r) { const sx = Math.cos(a) * r, sz = -Math.sin(a) * r; if (sx > PZ.x0 + 3 && sx < PZ.x1 - 3 && sz > PZ.z0 + 4 && sz < PZ.z1 - 3) slots.push({ x: sx, z: sz }); } }
  let wasJamaah = false; // auch wer mitten in die Gebetszeit kommt, sieht die Reihen
  function gather() {
    const left = prayer.gathering + 2; // Sekunden bis zum Ende des Gemeinschaftsgebets
    const list = agents.list.map((a, i) => ({ a, i })).filter(({ a }) => (medina ? a.z < RZ : a.z < RZ)).slice(0, Math.floor(N * 0.75));
    list.forEach(({ a }, k) => {
      let p;
      if (!medina && slots[k]) { const sl = slots[k]; p = { x: sl.x, z: sl.z, wait: left, act: 'pray', face: Math.atan2(-sl.x, -sl.z) }; }
      else p = { x: L.gate[0] + rr(-25, 25), z: L.gate[1] + rr(2, 8), wait: left, act: 'stand', face: Math.PI };
      if (Math.hypot(a.x - p.x, a.z - p.z) > 30) { a.x = p.x; a.z = p.z; } // weit weg (außer Sicht): gleich in der Reihe
      const from = { x: a.x, z: a.z };
      a.pts = [...via(from, p), p, ...via(p, inZone(zones[1])), inZone(zones[1])]; a.k = 0; a.wait = 0; a.act = null;
    });
  }
  // Karte
  const poiIcon = { dates: '🌴', zamzam: '💧', pigeons: '🕊️', balloon: '🎈', bus: '🚌', bauhof: '🧱', 'info-main': '📜', 'info-clock': '📜', gate: medina ? '🕌' : '🕋' };
  const poiName = { dates: 'Datteln', zamzam: 'Zamzam', pigeons: 'Tauben', balloon: 'Ballon', bus: medina ? 'Bus nach Mekka' : 'Bus nach Medina', bauhof: 'Sandstein-Bauhof', 'info-main': 'Infotafel', 'info-clock': 'Uhrturm', gate: medina ? 'Prophetenmoschee' : 'Haram (Kaaba)' };
  const map = showMinimap(ctx, {
    title: medina ? 'Karte · Medina' : 'Karte · Mekka', city: where, bounds: L.bounds,
    areas: [...rects, ...(medina ? [{ x0: -230, x1: 230, z0: -190, z1: 190 }] : [])],
    roads: [{ x0: -420, x1: 1200, z0: RZ, z1: RZ + 20 }], // Querstraße + Autobahn nach Osten
    blocks: [...towers.footprints, ...mosqueFoot],
    shapes: medina ? [{ t: 'rect', x0: -150, x1: 150, z0: -110, z1: 110, c: '#efe8da', label: 'Masjid an-Nabawi' }, { t: 'circle', x: -20, z: 80, r: 9, c: '#2f8a4e' }]
      : [{ t: 'circle', x: 0, z: 0, r: 200, c: '#ece8e0', label: 'Masjid al-Haram' }, { t: 'rect', x0: -6, x1: 6, z0: -5.25, z1: 5.25, c: '#111' }, { t: 'rect', x0: -40, x1: 170, z0: 263, z1: 413, c: '#d8ccb2', label: 'Abraj al-Bait' }],
    pois: [...SPOTS.filter((sp) => poiIcon[sp.key]).map((sp) => ({ x: sp.x, z: sp.z, icon: poiIcon[sp.key], label: poiName[sp.key] })),
      ...L.mosques.map((m) => ({ x: m.spot[0], z: m.spot[1], icon: '🕌', label: m.name })), { x: L.mats[0], z: L.mats[1], icon: '🧎', label: 'Gebetsplatz' },
      { x: (medina ? 75 : 30) + 3, z: (medina ? 461 : 501) - 3, icon: '🚕', label: 'Taxi & Verleih' },
      { x: 520, z: RZ + 10, icon: '🛣️', label: medina ? 'Autobahn nach Mekka' : 'Autobahn nach Medina' }],
  });

  // ---------- Fahrzeuge ausleihen (Amanah): im Verkehr anhalten oder am Taxistand den Fahrer fragen ----------
  const ST = medina ? [75, 461] : [30, 501];
  sign(world, ST[0] + 10, ST[1] - 3.5, 0, BORROW.stand, { w: 3, h: 1, y: 2.6 });
  const stands = [{ kind: medina ? 'suv' : 'sedan', x: ST[0], z: ST[1], ry: Math.PI }, { kind: medina ? 'minivan' : 'compact', x: ST[0] + 4.2, z: ST[1], ry: Math.PI }, { kind: 'motorbike', x: ST[0] + 8, z: ST[1], ry: Math.PI }];
  for (const s of stands) player.colliders.push({ type: 'box', x: s.x, z: s.z, hw: s.kind === 'motorbike' ? 0.5 : 1, hd: s.kind === 'motorbike' ? 1.1 : 2.3 });
  const roadRect = { x0: -420, x1: 420, z0: RZ, z1: RZ + 20 };
  const sideWay = (p) => p.z < RZ && p.z > RZ - 14 && Math.abs(p.x - bx) > BW; // Moschee-Vorplatz am Gehweg der Straße
  const vroute = (a, b) => { // Wegpunkte für das automatische Fahren (über Einmündung, Straße, Gehweg)
    const J = { x: bx, z: RZ - 2.5 }, A = sideWay(a) ? J : a, Bp = sideWay(b) ? J : b;
    const pts = [...(sideWay(a) ? [{ x: a.x, z: RZ - 2.5 }, J] : []), ...via(A, Bp)];
    if (sideWay(b)) pts.push(J, { x: b.x, z: RZ - 2.5 });
    pts.push(b); return pts;
  };
  const destinations = [
    { label: medina ? 'Prophetenmoschee' : 'Haram-Platz', x: L.gate[0], z: L.gate[1] + 14 },
    { label: 'Südplatz', x: BUx - 15, z: BUz + 14 },
    ...L.mosques.map((m) => ({ label: m.name, x: m.spot[0], z: m.spot[1] })),
    { label: medina ? 'Nach Mekka (Autobahn)' : 'Nach Medina (Autobahn)', intercity: other },
  ];
  const baseActions = [{ label: T.cert, onClick: () => ctx.backToEnding?.() }];
  // Helikopter-Landeplatz auf dem Südplatz
  const HP = medina ? [-100, 480] : [-122, 522];
  { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    g.fillStyle = '#3d4247'; g.beginPath(); g.arc(128, 128, 126, 0, 7); g.fill(); g.strokeStyle = '#f2c94c'; g.lineWidth = 10; g.beginPath(); g.arc(128, 128, 108, 0, 7); g.stroke();
    g.fillStyle = '#f4f1ea'; g.font = 'bold 150px Figtree, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('H', 128, 136);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const pad = new THREE.Mesh(new THREE.CircleGeometry(9, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 })); pad.position.set(HP[0], 0.06, HP[1]); pad.receiveShadow = true; world.add(pad); }
  sign(world, HP[0] + 11, HP[1], -Math.PI / 2, ['مهبط', 'Helikopter'], { w: 2.6, h: 0.9, y: 2.4 });
  stands.push({ kind: 'helicopter', x: HP[0], z: HP[1], ry: 0 });
  player.colliders.push({ type: 'box', x: HP[0], z: HP[1], hw: 1.6, hd: 4.5 });
  const inBox = (x, z, cx, cz, hw, hd) => Math.abs(x - cx) < hw && Math.abs(z - cz) < hd;
  const noLand = (x, z) => (medina ? (inBox(x, z, 0, 0, 155, 115) ? BORROW.noLandNabawi : null) : (inBox(x, z, 115, -7, 228, 210) ? BORROW.noLandKaaba : null))
    || (L.mosques.some((m) => Math.hypot(x - m.x, z - m.z) < 14) ? BORROW.noLandMosque : null);
  const borrow = createBorrow(ctx, { player, interact, traffic, stands, colliders, ground: groundH, noLand, destinations, route: vroute, map, where, baseActions,
    avoid: (x, z) => (z > RZ - 1 && z < RZ + 21) || Math.hypot(x - HP[0], z - HP[1]) < 16 || Math.hypot(x - ST[0] - 4, z - ST[1]) < 12,
    people: () => { const out = agents ? agents.list.slice() : []; for (const o of ctx.multi?.status?.().others || []) if (o.x != null && o.s === ctx.stationIndex) out.push(o); return out; } });
  ctx.debugLife = { borrow, traffic }; // für automatische Tests
  // ---------- Autobahn nach Medina bzw. Mekka: die Querstraße führt nach Osten aus der Stadt (vereinfachte Lage) ----------
  const HW0 = 420, HW1 = 1200, HWZ = RZ + 10;
  { const asph = new THREE.Mesh(new THREE.PlaneGeometry(HW1 - HW0, 20).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x55565a, roughness: 0.95 }));
    asph.position.set((HW0 + HW1) / 2, 0.05, HWZ); asph.receiveShadow = true; world.add(asph);
    const dash = new THREE.InstancedMesh(new THREE.PlaneGeometry(4, 0.2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xeeeeea }), 80);
    for (let i = 0; i < 80; i++) { dm.position.set(HW0 + i * 10 + 2, 0.06, HWZ); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); dash.setMatrixAt(i, dm.matrix); } world.add(dash);
    // blaue Autobahn-Schilderbrücke (wie in Saudi-Arabien: Arabisch + Englisch, hier Arabisch + Deutsch)
    const gantry = (x, lines) => {
      const g = new THREE.Group(); g.position.set(x, 0, HWZ); world.add(g);
      const metal = new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.6, roughness: 0.4 });
      for (const z of [-11, 11]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 7.5, 8), metal); p.position.set(0, 3.75, z); g.add(p); }
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 22.5), metal); beam.position.y = 7.3; g.add(beam);
      const sg = sign(g, -0.3, 0, -Math.PI / 2, lines, { w: 12, h: 3, y: 5.8, bg: '#1f4f9a', fg: '#ffffff', accent: '#ffffff', wall: true }); void sg;
      return g;
    };
    gantry(HW0 + 25, medina ? ['مكة المكرمة', 'Mekka · Autobahn →'] : ['المدينة المنورة', 'Medina · Autobahn →']);
    gantry(HW0 - 330, medina ? ['طريق مكة', '→ Autobahn nach Mekka'] : ['طريق المدينة', '→ Autobahn nach Medina']); }
  let hwBusy = false;
  if (from === 'car' && ctx.borrowed) borrow.arriveWith(ctx.borrowed.kind, BUx - 18, RZ + 26, Math.PI / 2); // mit dem ausgeliehenen Fahrzeug angekommen

  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${medina ? T.introMedina : T.intro}</p><p class="small">🗺️ Karte oben rechts antippen. ${U.note}</p>`);
  ui.actions([{ label: T.cert, onClick: () => ctx.backToEnding?.() }]);

  return {
    update(dt) {
      prayer.update(dt);
      player.update(dt);
      const night = clock.night; cityNight.value = night;
      for (const m of glowLamps) m.emissiveIntensity = 0.4 + night * 2.2;
      for (const m of glowMosque) m.emissiveIntensity = night * 1.6;
      const jm = prayer.gathering > 0; if (jm && !wasJamaah) gather(); wasJamaah = jm;
      for (const m of glow) m.emissiveIntensity = sky.art * 0.55;
      agents.update(dt, viewLine(ctx));
      traffic.update(dt);
      abraj?.update(night);
      life.update(dt);
      interact.update(dt); // Randleuchten + Aktionsknopf in der Nähe
      borrow.update(dt);
      // mit dem eigenen Fahrzeug über die Autobahn hinausgefahren → Fahrt in die andere Stadt
      { const D = borrow.drive; if (D && !hwBusy && !D.spec.air && D.x > HW0 + 60 && Math.abs(D.z - HWZ) < 40) { hwBusy = true; ui.toast(medina ? 'Auf der Autobahn nach Mekka …' : 'Auf der Autobahn nach Medina …', 2500); borrow.intercity(other); } }
      map.update();
      // Tauben: picken, weichen dem Spieler aus, kommen beim Füttern zusammen
      feed = Math.max(0, feed - dt);
      const px = player.pos.x, pz = player.pos.z;
      for (let i = 0; i < PN; i++) {
        const b = P[i]; b.t += dt;
        const dx = b.x - px, dz = b.z - pz, d = Math.hypot(dx, dz);
        if (d < 1.4 && !b.fly) b.fly = 1.2;
        if (b.fly > 0) { b.fly -= dt; b.x += (dx / (d || 1)) * dt * 3; b.z += (dz / (d || 1)) * dt * 3; }
        else if (feed > 0) { const tx = PX - b.x, tz = PZc + 2 - b.z, td = Math.hypot(tx, tz); if (td > 0.8 + (i % 5) * 0.25) { b.x += (tx / td) * dt * 0.9; b.z += (tz / td) * dt * 0.9; b.ry = Math.atan2(tx, tz); } }
        else if (Math.sin(b.t * 0.7 + i) > 0.98) b.ry += (Math.random() - 0.5) * 2;
        const peck = Math.max(0, Math.sin(b.t * (feed > 0 ? 9 : 3) + i)) * 0.5;
        const y = b.fly > 0 ? Math.sin((1.2 - b.fly) / 1.2 * Math.PI) * 1.2 : 0.03;
        dm.position.set(b.x, y, b.z); dm.rotation.set(peck, b.ry, 0); dm.scale.setScalar(1); dm.updateMatrix(); pigeons.setMatrixAt(i, dm.matrix);
      }
      pigeons.instanceMatrix.needsUpdate = true;
    },
    dispose() { borrow.dispose(); prayer.dispose(); map.dispose(); interact.dispose(); cityNight.value = 0; ui.prompt(null); ui.goal(null); },
  };
}
