import * as THREE from 'three';
import { REST as T, PRAYER_UI as U } from '../content/life.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { pbr } from '../world/assets.js';
import { bus, sign, palms, lamps } from '../world/props.js';
import { createCrowd, separateSlots } from '../world/crowd.js';
import { createAgents } from '../world/agents.js';
import { createLife } from '../world/life.js';
import { createPlayer } from '../core/player.js';
import { holdAction } from '../core/kit.js';
import { oasisMosque } from '../world/oasis.js';
import { walkable, createTraffic, cityNight } from '../world/cityscape.js';
import { createInteract } from '../life/interact.js';
import { createPrayer } from '../life/prayer.js';
import { showMinimap } from '../life/minimap.js';
import { clock } from '../life/clock.js';
import * as sfx from '../core/sfx.js';

// Rastplatz an der Autobahn Mekka–Medina mit der Oasen-Moschee (erfundener Ort, Lerndarstellung).
// Norden = −z: Autobahn, Parkplatz mit Bus, Palmenallee, Tor; im Hof die Moschee (Eingang nach Norden, Qibla nach Süden = Mekka),
// Waschplatz für den Wudu an der Westmauer, Gebetsplatz vor dem Eingang. Weiterfahren mit dem Bus.
const dm = new THREE.Object3D();

export function create(ctx, { from = 'mecca', to = 'medina' } = {}) {
  const { engine, sky, ui } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  ui.el.day.textContent = T.day; ui.el.title.textContent = T.title;
  sky.state.shadowSize = 60;
  const h = heightFn({ r0: 260, r1: 700, amp: 160 });
  { const tg = new THREE.Group(); tg.position.y = -0.06; world.add(tg); buildTerrain(tg, h, 2400); }
  // Anlage (gedreht: Tor nach Norden bei z = −26,7)
  oasisMosque(world, { x: 0, z: 0, ry: Math.PI });
  const pave = (x0, x1, z0, z1, col) => { const w = x1 - x0, d = z1 - z0, f = new THREE.Mesh(new THREE.PlaneGeometry(w, d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [w / 2, d / 2]), color: col, roughness: 0.8 })); f.position.set((x0 + x1) / 2, 0.02, (z0 + z1) / 2); f.receiveShadow = true; world.add(f); };
  const asphalt = new THREE.Mesh(new THREE.PlaneGeometry(90, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x5d5e62, roughness: 0.95 })); asphalt.position.set(0, 0.03, -94); asphalt.receiveShadow = true; world.add(asphalt);
  pave(-6, 6, -78, -26, 0xe9e2d4); pave(-43, 43, -26, 61, 0xefe9de);
  // Parkplatz-Markierungen
  { const white = new THREE.MeshBasicMaterial({ color: 0xeeeeea }); const im = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.15, 5).rotateX(-Math.PI / 2), white, 16); for (let i = 0; i < 16; i++) { dm.position.set(-40 + i * 3.2 + (i > 7 ? 26 : 0), 0.04, -84); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } world.add(im); }
  const traffic = createTraffic(world, { z0: -140, x0: -500, x1: 500, crossX: 3000, crossW: 10, mobile, taxis: 0.25, people: () => [player.pos] });
  const coach = bus(world, 0, -96, Math.PI / 2);
  sign(world, 9, -77, 0, ['استراحة', 'Rastplatz · Oasen-Moschee'], { w: 3.6, h: 1.1, y: 2.6 });
  palms(world, [[-38, 0, -80, 1, 0.8], [38, 0, -80, 2, 0.8], [-30, 0, -108, 3, 0.75], [30, 0, -108, 1, 0.75]]);
  // Laternen entlang der Allee, im Hof und am Parkplatz (leuchten nachts)
  const glowL = [], LL = [];
  for (let z = -72; z < -30; z += 10) LL.push([-4.8, 0, z, Math.PI / 2], [4.8, 0, z + 5, -Math.PI / 2]);
  for (const [x, z] of [[-20, -18], [20, -18], [-30, 6], [30, 6], [-20, 58], [20, 58]]) LL.push([x, 0, z, 0]);
  for (let x = -36; x <= 36; x += 18) LL.push([x, 0, -77, Math.PI]);
  lamps(world, LL, glowL);
  // Waschplatz (Wudu) an der Westmauer: Steinbank mit Wasserhähnen
  const wudu = new THREE.Group(); wudu.position.set(-41.3, 0, 6); world.add(wudu);
  { const st = new THREE.MeshStandardMaterial({ color: 0xd9cfbd, roughness: 0.7 }), met = new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.9, roughness: 0.25 });
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 14), st); wall.position.y = 0.6; wudu.add(wall);
    const basin = new THREE.Mesh(new THREE.BoxGeometry(1, 0.15, 14), st); basin.position.set(0.6, 0.35, 0); wudu.add(basin);
    for (let i = 0; i < 8; i++) { const tap = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.25).rotateZ(Math.PI / 2), met); tap.position.set(0.4, 0.95, -6 + i * 1.7); wudu.add(tap); const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.35, 10), st); seat.position.set(1.4, 0.18, -6 + i * 1.7); wudu.add(seat); } }
  // Kiosk am Parkplatz
  const kiosk = new THREE.Group(); kiosk.position.set(32, 0, -82); world.add(kiosk);
  { const w = new THREE.MeshStandardMaterial({ color: 0xece4d2, roughness: 0.8 }); const b = new THREE.Mesh(new THREE.BoxGeometry(6, 3, 4), w); b.position.y = 1.5; b.castShadow = true; kiosk.add(b);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.12, 1.6), new THREE.MeshStandardMaterial({ color: 0x2f6b55 })); aw.position.set(0, 2.6, -2.6); aw.rotation.x = 0.2; kiosk.add(aw);
    const win = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.4), new THREE.MeshStandardMaterial({ color: 0xf6dcaa, emissive: 0xf0c070, emissiveIntensity: 0.4 })); win.position.set(0, 1.6, -2.01); win.rotation.y = Math.PI; kiosk.add(win); }
  sign(world, 32, -84.6, Math.PI, ['بقالة', 'Kiosk'], { w: 2.2, h: 0.8, y: 3.4, wall: true });
  const info = new THREE.Group(); info.position.set(-12, 0, -77); world.add(info);
  { const m = new THREE.MeshStandardMaterial({ color: 0x2c3034 }); const p = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.1, 0.16), m); p.position.y = 0.55; info.add(p); const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.06), m); b.position.y = 1.25; b.rotation.x = -0.5; info.add(b); }
  // Gebetsteppiche vor dem Eingang (Blick nach Süden = Qibla)
  const mats = new THREE.Group(); world.add(mats);
  { const cols = [0x7e2a22, 0x22405f, 0x2e5a4a, 0x5a1f3a]; for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.03, 2), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.9 })); m.position.set(-4.55 + i * 1.3, 0.05, -0.5); mats.add(m); } } // vor dem Podest des Eingangs

  // begehbare Flächen und Hindernisse
  const park = { x0: -45, x1: 45, z0: -108, z1: -76 }, avenue = { x0: -5.5, x1: 5.5, z0: -77, z1: -24 }, court = { x0: -43, x1: 43, z0: -25, z1: 61 };
  const rects = [park, avenue, court];
  const colliders = [walkable(rects),
    { type: 'box', x: 0, z: 29.7, hw: 19, hd: 13.3 }, { type: 'box', x: 0, z: 29, hw: 31, hd: 9 }, { type: 'box', x: 0, z: 48.5, hw: 10, hd: 6.5 }, { type: 'box', x: 0, z: 9.5, hw: 10, hd: 6.5 }, // Podest mit Stufen vor dem Eingang
    ...[-4, -10, -16].flatMap((z) => [{ type: 'circle', x: -7.3, z, r: 0.7 }, { type: 'circle', x: 7.3, z, r: 0.7 }]),
    { type: 'box', x: -41, z: 6, hw: 1.2, hd: 7 }, { type: 'box', x: 32, z: -82, hw: 3, hd: 2 }, coach.collider];
  const player = createPlayer(ctx, { x: 6, z: -80, heading: 0, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, speed: 2.2, fastSpeed: 3.8, colliders, surface: 'stone' });
  const life = createLife(ctx, { kind: 'desert' });

  // Reisende: zwischen Parkplatz und Hof unterwegs; zum Gemeinschaftsgebet Reihen vor dem Eingang (Blick nach Süden)
  const N = mobile ? 40 : 70, crowd = createCrowd(world, N, { ihram: false, men: 0.6 });
  const rr = (a, b) => a + Math.random() * (b - a);
  const inR = (q, m = 2) => ({ x: rr(q.x0 + m, q.x1 - m), z: rr(q.z0 + m, q.z1 - m) });
  const toCourt = () => [{ x: rr(-3, 3), z: -70 }, { x: rr(-3, 3), z: -28 }], toPark = () => [{ x: rr(-3, 3), z: -28 }, { x: rr(-3, 3), z: -74 }];
  const yard = { x0: -40, x1: 40, z0: -22, z1: 1 }; // freier Hof vor der Moschee (ohne Gebäude und Podest)
  const agents = createAgents(crowd, N, (i) => (i % 2 ? [inR(park), ...toCourt(), { ...inR(yard), wait: rr(4, 12), act: 'stand' }, ...toPark()] : [inR(yard), { ...inR(yard), wait: rr(3, 8), act: 'stand' }, ...toPark(), inR(park), ...toCourt()]), { speed: 1.1 });
  const slots = []; for (let z = 1.5; slots.length < N * 2; z -= 1.3) for (let x = -14; x <= 14 && slots.length < N * 2; x += 0.9) slots.push({ x, z }); // Reihen vor dem Podest
  const seat = separateSlots(slots, N, (i) => crowd.male(i)); // Männer vorne, Frauen hinten mit Abstand
  for (let i = 0; i < N; i++) seat[i] ||= { x: rr(-14, 14), z: -16 }; // kein Platz frei: wartet hinten

  // Orte mit Randleuchten
  const qibla = (x, z) => ({ x, z: z + 1000 }); // Mekka liegt im Süden
  const prayer = createPrayer(ctx, { city: 'mecca', player, qibla });
  const interact = createInteract(ctx, player); prayer.interact = interact;
  let wuduAct = null;
  interact.add({ obj: coach.group, color: 'blue', radius: 10, near: 3, push: 0.04, x: 0, z: -92.4, key: 'bus', label: T.go(to), run() { sfx.bus(); (ctx.borrowed?.kind && ctx.roadtrip ? ctx.roadtrip(from, to, { vehicle: ctx.borrowed.kind, at: 'rest' }) : ctx.drive?.(from, to, { resume: 0.52 })); } });
  interact.add({ obj: wudu, color: 'gold', radius: 7, near: 2.6, x: -39.3, z: 6, key: 'wudu', label: T.wuduDo, run() {
    ui.info(`<p>${T.wudu}</p>`); ui.el.panel.classList.remove('collapsed'); interact.enabled = false; ui.prompt(null);
    player.heading = -Math.PI / 2;
    wuduAct = holdAction(ctx, player, { label: T.wuduHold, steps: [{ pose: 'stand', sec: 1 }, { pose: 'sit', sec: 5 }, { pose: 'stand', sec: 1 }] });
  } });
  interact.add({ obj: kiosk, color: 'gold', radius: 7, near: 3, x: 32, z: -85.5, key: 'kiosk', label: T.kioskDo, run() { sfx.drink(); ui.toast(T.kiosk, 2600); } });
  interact.add({ obj: info, color: 'gold', radius: 6, near: 2, x: -12, z: -75.8, key: 'info', label: T.infoDo, run() { ui.info(`<p>${T.info}</p>`); ui.el.panel.classList.remove('collapsed'); } });
  interact.add(prayer.spot({ obj: mats, x: 0, z: -2.5, key: 'pray', radius: 12, near: 4 }));
  ctx.interact = interact;
  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${T.intro}</p>`);
  ui.actions([{ label: T.go(to), onClick: () => (ctx.borrowed?.kind && ctx.roadtrip ? ctx.roadtrip(from, to, { vehicle: ctx.borrowed.kind, at: 'rest' }) : ctx.drive?.(from, to, { resume: 0.52 })) }]);
  const map = showMinimap(ctx, {
    title: 'Karte · ' + T.title, city: 'mecca', bounds: { x0: -110, x1: 110, z0: -150, z1: 75 },
    areas: rects, roads: [{ x0: -500, x1: 500, z0: -140, z1: -120 }],
    blocks: [{ x: 0, z: 29.7, w: 37, d: 26 }, { x: 0, z: 29, w: 62, d: 18 }, { x: 0, z: 48.5, w: 20, d: 13 }, { x: 0, z: -26.7, w: 89, d: 1.5 }, { x: 0, z: 62.8, w: 89, d: 1.5 }, { x: -44.7, z: 18, w: 1.5, d: 89 }, { x: 44.7, z: 18, w: 1.5, d: 89 }, { x: 32, z: -82, w: 6, d: 4 }],
    shapes: [{ t: 'circle', x: 0, z: 29.7, r: 7, c: '#d8d0bf', label: 'Oasen-Moschee' }],
    pois: [{ x: 0, z: -92, icon: '🚌', label: 'Bus' }, { x: -39, z: 6, icon: '💧', label: 'Wudu' }, { x: 0, z: -1, icon: '🧎', label: 'Gebetsplatz' }, { x: 32, z: -86, icon: '🥤', label: 'Kiosk' }, { x: -12, z: -76, icon: '📜', label: 'Infotafel' }],
  });
  let wasG = false;

  return {
    update(dt) {
      prayer.update(dt);
      player.update(dt);
      cityNight.value = clock.night; for (const m of glowL) m.emissiveIntensity = 0.3 + clock.night * 2.2;
      if (wuduAct) { wuduAct.update(dt); if (sky && ctx.input.holding) sfx.waterKeep(); if (wuduAct.done) { if (wuduAct.progress >= 1) ui.toast(T.wuduDone, 2500); wuduAct = null; interact.enabled = true; } }
      // Gemeinschaftsgebet: Reisende stellen sich in Reihen vor dem Eingang auf
      const g = prayer.gathering > 0;
      if (g && !wasG) agents.list.forEach((a, i) => { const sl = seat[i]; if (Math.hypot(a.x - sl.x, a.z - sl.z) > 40) { a.x = sl.x; a.z = sl.z; } a.pts = [...(a.z < -24 ? [{ x: rr(-3, 3), z: -70 }, { x: rr(-3, 3), z: -28 }] : []), { x: sl.x, z: sl.z, wait: prayer.gathering + 2, act: 'pray', face: 0 }, ...toPark(), inR(park)]; a.k = 0; a.wait = 0; a.act = null; });
      wasG = g;
      agents.update(dt);
      traffic.update(dt);
      life.update(dt);
      interact.update(dt);
      map.update();
    },
    dispose() { wuduAct?.cancel(); prayer.dispose(); map.dispose(); interact.dispose(); cityNight.value = 0; },
  };
}
