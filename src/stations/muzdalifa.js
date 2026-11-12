import * as THREE from 'three';
import { TEXT } from '../content/hajj.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { lamps, carpets, gravelBasin, mosqueModel, pebbleGeometry } from '../world/props.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import * as sfx from '../core/sfx.js';
import { createFlow, createMarker, goTo, pray, holdAction, duaFacing, pointGoal, sunnah, createAutopilot, autoAfter } from '../core/kit.js';

const T = TEXT.muzdalifa;
const MASHAR = { x: -20, z: -150 };
const QIBLA = { x: -3000, z: 300 };

export function create(ctx, st) {
  const { engine, sky, ui, input } = ctx;
  const world = engine.world;
  sky.setHour(20.5);
  sky.state.artificial = 1;
  sky.state.shadowSize = 40;

  const h = heightFn({ r0: 260, r1: 620, amp: 150 });
  buildTerrain(world, h);
  const glow = [];
  const mosq = mosqueModel(world, { x: MASHAR.x, z: MASHAR.z - 25, glow, variant: 2 }); // zwei Minarette wie die Moschee al-Mash'ar al-Haram
  // Geordnetes Lager: Blöcke aus Teppichen (je 4 Reihen × 8), dazwischen Wege mit Laternen.
  // Teppich: lange Seite entlang x (Blick zur Qibla nach Westen), Kissen am Ostende.
  // Kiesfelder („Becken“) liegen frei zwischen den Blöcken; nur dort gibt es Steine.
  const BASINS = [
    { x: 11, z: 2, rx: 5, rz: 3.6, ry: 0.3 }, { x: -12, z: -8, rx: 4.6, rz: 3.4, ry: -0.4 }, { x: 13, z: -34, rx: 5.2, rz: 3.8, ry: 0.1 },
    { x: -14, z: 34, rx: 4.8, rz: 3.5, ry: 0.5 }, { x: 40, z: 60, rx: 5, rz: 4, ry: 0 }, { x: -42, z: -70, rx: 5, rz: 4, ry: 0.2 },
  ];
  const RW = 3, RD = 2, GAPX = 1.2, GAPZ = 0.35, ROWS = 4, PER = 8; // Teppich 3 × 2 m (x × z)
  const BW = ROWS * RW + (ROWS - 1) * GAPX, BD = PER * RD + (PER - 1) * GAPZ, ROAD = 8;
  const clearAt = (x, z, m) => Math.hypot(x, z - 6) < 9 + m || Math.abs(x) < 4 + m // Startplatz, Hauptweg
    || BASINS.some((q) => Math.hypot((x - q.x) / (q.rx + 2.5 + m), (z - q.z) / (q.rz + 2.5 + m)) < 1)
    || (z < -128 + m && Math.abs(x - MASHAR.x) < 40);
  const rugs = [], ll = [];
  for (let bx = -118; bx + BW < 118; bx += BW + ROAD) for (let bz = -130; bz + BD < 118; bz += BD + ROAD) {
    ll.push([bx - ROAD / 2, 0, bz - ROAD / 2, Math.PI / 4]);
    for (let r = 0; r < ROWS; r++) for (let k = 0; k < PER; k++) {
      const x = bx + RW / 2 + r * (RW + GAPX), z = bz + RD / 2 + k * (RD + GAPZ);
      if (Math.hypot(x, z) > 160 || clearAt(x, z, 0)) continue;
      rugs.push([x, z, Math.PI / 2]); // lange Seite entlang x, Kissen nach +x (Osten)
    }
  }
  lamps(world, ll, glow);
  // Warmes Laternenlicht nahe dem Spieler
  const warm = new THREE.PointLight(0xffc27a, 40, 34, 1.5); warm.position.set(3, 8.5, 8); world.add(warm);
  // eigener Schlafplatz: freier Teppich nahe dem Start
  let fi = 0; rugs.forEach((r, i) => { if (Math.hypot(r[0] - 8, r[1] + 14) < Math.hypot(rugs[fi][0] - 8, rugs[fi][1] + 14)) fi = i; });
  const free = { x: rugs[fi][0], z: rugs[fi][1] };
  carpets(world, rugs);
  // Pilger auf den Teppichen: schlafen (Kopf auf dem Kissen), sitzen oder beten Richtung Qibla (Westen)
  // belegte Teppiche: in der Nähe des Starts fast alle, weiter weg nur jeder zweite bis dritte
  const spots = rugs.filter((r, i) => i !== fi && (Math.hypot(r[0], r[1]) < 45 || (i * 7) % 5 < 2)).sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
  const N = Math.min(spots.length, engine.isMobile ? 260 : 380);
  const crowd = createCrowd(world, N, { ihram: true });
  for (let i = 0; i < N; i++) {
    const [x, z] = spots[i], kind = (i * 37) % 10;
    if (kind < 5) crowd.set(i, x + 0.9, 0.24, z, -Math.PI / 2, 1, Math.PI / 2);          // liegt, Kopf am Kissen (Osten)
    else if (kind < 8) crowd.set(i, x + 0.6, 0.03, z, -Math.PI / 2, 0.62);             // sitzt auf den Fersen, Blick zur Qibla
    else crowd.set(i, x + 0.8, 0.03, z, -Math.PI / 2, 1);                              // steht im Gebet
  }
  crowd.commit();

  // Kiesel nur in den Kiesfeldern (dicht), dunkelgrau wie die Steine von Muzdalifa
  const pp = [], dm = new THREE.Object3D(), col = new THREE.Color();
  for (const q of BASINS) for (const [x, z] of gravelBasin(world, { ...q, n: 170 })) pp.push({ x, z, taken: false, fly: -1 });
  const PN = pp.length;
  const pebbles = new THREE.InstancedMesh(pebbleGeometry(), new THREE.MeshStandardMaterial({ color: 0x8c8274, roughness: 0.9 }), PN);
  for (let i = 0; i < PN; i++) {
    dm.position.set(pp[i].x, 0.05, pp[i].z); dm.rotation.set(0, Math.random() * 6, 0); dm.scale.setScalar(0.8 + Math.random() * 0.5); dm.updateMatrix();
    pebbles.setMatrixAt(i, dm.matrix); pebbles.setColorAt(i, col.setHSL(0.08, 0.07, 0.38 + Math.random() * 0.22));
  }
  pebbles.castShadow = true; world.add(pebbles);
  // Leuchtring um nahe Kiesel, damit man sie findet
  const glint = new THREE.InstancedMesh(new THREE.RingGeometry(0.12, 0.17, 16).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe6a0, transparent: true, opacity: 0.8, depthWrite: false }), PN);
  glint.count = 0; world.add(glint);

  const colliders = [{ type: 'inside', x: 0, z: -30, r: 170 }, mosq.collider];
  const player = createPlayer(ctx, { x: 0, z: 10, heading: Math.PI, color: 0xf6f4ee, speed: 3.2, fastSpeed: 5, colliders, surface: (x, z) => (BASINS.some((q) => Math.hypot((x - q.x) / q.rx, (z - q.z) / q.rz) < 1) ? 'stone' : rugs.some((r) => Math.abs(x - r[0]) < 1.5 && Math.abs(z - r[1]) < 1) ? 'carpet' : 'sand') });
  player.fig.skinM.color.setHex(0xb07a4f);

  const flow = createFlow();
  const marker = createMarker(world, { r: 1.6 });
  const mExit = createMarker(world, { color: 0x35d07f, r: 2 });
  let stones = 0, collecting = false;

  ctx.debug = { pebbles: pp }; // für automatische Tests
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  input.onTap = (x, y) => {
    if (!collecting) return;
    ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, engine.camera);
    // Großzügig: nächster freier Kiesel nahe dem Strahl
    let best = -1, bd = 1e9;
    const o = ray.ray.origin, dir = ray.ray.direction;
    for (let i = 0; i < PN; i++) {
      const s = pp[i]; if (s.taken) continue;
      const v = new THREE.Vector3(s.x - o.x, 0.04 - o.y, s.z - o.z);
      const t = v.dot(dir); if (t < 0) continue;
      const dist = v.addScaledVector(dir, -t).length();
      if (dist < 0.45 + t * 0.02 && t < bd) { bd = t; best = i; }
    }
    if (best < 0) return;
    if (player.distTo(pp[best].x, pp[best].z) > 3.2) { ui.hint(T.tooFar, 1800); return; }
    take(best);
  };
  function take(i) {
    pp[i].taken = true; pp[i].fly = 0;
    player.fig.pose('bend'); setTimeout(() => !flow.dead && player.fig.pose('stand'), 500);
  }
  // Autopilot (optional, ab dem 3. Stein): geht zum nächsten Kiesel und hebt ihn auf
  const nearest = () => { let b = -1, bd = 1e9; for (let i = 0; i < PN; i++) { if (pp[i].taken) continue; const d = player.distTo(pp[i].x, pp[i].z); if (d < bd) { bd = d; b = i; } } return b; };
  let pickWait = 0;
  const auto = createAutopilot(ctx, {
    available: () => collecting && stones >= autoAfter(ctx, 2) && stones < 7,
    steer() { const i = nearest(); if (i < 0 || player.distTo(pp[i].x, pp[i].z) < 0.9) return null; return { x: pp[i].x - player.pos.x, z: pp[i].z - player.pos.z, fast: false }; },
    tick(dt) {
      pickWait -= dt;
      const i = nearest(); if (i < 0 || pickWait > 0) return;
      if (player.distTo(pp[i].x, pp[i].z) < 1) { take(i); pickWait = 0.8; }
    },
  });

  async function run() {
    ui.info(`<p>${T.start}</p>`);
    await ui.choice(T.prayQ, T.pray);
    player.heading = Math.atan2(QIBLA.x, QIBLA.z);
    await pray(ctx, flow, 3, 'Halten: Maghrib');
    ui.toast('Maghrib ✓');
    await pray(ctx, flow, 2, 'Halten: Isha');
    ui.toast('Isha ✓'); ctx.mission?.done(0);

    ui.info(`<p>${T.stones}</p><p class="tr">${T.stonesInfo}</p>`);
    collecting = true;
    ui.goal('Zu einem Kiesfeld gehen und Kiesel antippen');
    await flow.until(() => {
      // Weg zum nächsten Kiesfeld zeigen, solange man nicht in einem steht
      let bq = BASINS[0], bd = 1e9; for (const q of BASINS) { const d = player.distTo(q.x, q.z); if (d < bd) { bd = d; bq = q; } }
      if (bd > Math.max(bq.rx, bq.rz) + 0.5) pointGoal(ui, player, 'Kiesfeld', bq.x, bq.z); else ui.goal('Kiesel antippen (leuchtende Ringe)');
      return stones >= 7;
    });
    collecting = false; glint.count = 0; auto.finish();
    ui.toast('7 Steine im Beutel ✓', 2200); ctx.mission?.done(1);
    ui.counter('');
    await goTo(ctx, flow, marker, T.matGoal, free.x, free.z);
    marker.hide();
    const from = sky.hour;
    await flow.run(holdAction(ctx, player, { label: T.sleep, steps: [{ pose: 'sleep', sec: 5 }], onTick: (k) => sky.setHour(from + (29 - from) * k) }));
    ctx.mission?.done(2);
    await new Promise((r) => sky.animateTo(29.33, 1.5, r));
    ui.info('<p>Morgendämmerung. Fajr beten.</p>');
    player.heading = Math.atan2(QIBLA.x - player.pos.x, QIBLA.z - player.pos.z);
    await pray(ctx, flow, 2, 'Halten: Fajr');
    ui.toast('Fajr ✓'); ctx.mission?.done(3);

    // Sunnah: Dhikr am al-Mash'ar al-Haram – oder direkt aufbrechen
    ui.info(`<p>Sunnah: Dhikr und Dua am al-Mash'ar al-Haram bis zur Dämmerung. Dann ${T.leave}.</p>`);
    marker.show(MASHAR.x, MASHAR.z);
    mExit.show(60, 120);
    let done = false, dhikr = false;
    while (!done) {
      await flow.until(() => {
        const near = marker.visible ? (player.distTo(MASHAR.x, MASHAR.z) < player.distTo(60, 120)) : false;
        pointGoal(ui, player, near ? T.masharGoal : T.busGoal, near ? MASHAR.x : 60, near ? MASHAR.z : 120);
        return (marker.visible && marker.inside(player.pos, 0.5)) || mExit.inside(player.pos);
      });
      if (mExit.inside(player.pos)) { done = true; sfx.bus(); break; }
      if (!dhikr) {
        dhikr = true;
        await duaFacing(ctx, flow, { label: T.dhikr, sec: 5, tx: QIBLA.x, tz: QIBLA.z, onTick: (k) => sky.setHour(29.33 + k * 0.4) });
        sunnah(ctx, 'mashar'); marker.hide(); ui.toast('Dhikr ✓'); ctx.mission?.done(4);
      }
    }
    ctx.next();
  }
  run();

  let time = 0;
  const tmp = new THREE.Vector3();
  return {
    update(dt) {
      time += dt;
      flow.update(dt);
      crowd.commit(); // Detailstufen der Pilgerinnen mit der Kamera mitführen
      auto.update(dt);
      player.update(dt);
      marker.update(dt); mExit.update(dt);
      for (const m of glow) m.emissiveIntensity = sky.art * 1.6 + 0.4;
      warm.position.set(player.pos.x + 3, 8.5, player.pos.z + 3);
      // Kiesel fliegen in den Beutel; nahe Kiesel bekommen einen Leuchtring
      let gi = 0, changed = false;
      for (let i = 0; i < PN; i++) {
        const s = pp[i];
        if (s.fly >= 0) {
          s.fly += dt * 2.5; changed = true;
          const k = Math.min(1, s.fly);
          tmp.set(s.x + (player.pos.x - s.x) * k, 0.04 + Math.sin(k * Math.PI) * 1.2 + k * 1, s.z + (player.pos.z - s.z) * k);
          dm.position.copy(tmp); dm.scale.setScalar(1.6 * (1 - k * 0.6)); dm.updateMatrix(); pebbles.setMatrixAt(i, dm.matrix);
          if (k >= 1) { s.fly = -1; dm.scale.setScalar(0); dm.updateMatrix(); pebbles.setMatrixAt(i, dm.matrix); stones++; if (collecting) ui.counter(`Steine ${Math.min(7, stones)} / 7`); }
        } else if (collecting && !s.taken && gi < 14 && player.distTo(s.x, s.z) < 3.2) {
          dm.position.set(s.x, 0.03, s.z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1 + Math.sin(time * 4 + i) * 0.15); dm.updateMatrix(); glint.setMatrixAt(gi++, dm.matrix);
        }
      }
      if (collecting) { glint.count = gi; glint.instanceMatrix.needsUpdate = true; if (stones < 7) ui.counter(`Steine ${stones} / 7`); }
      if (changed) pebbles.instanceMatrix.needsUpdate = true;
    },
    dispose() { flow.dispose(); },
  };
}
