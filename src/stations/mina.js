import * as THREE from 'three';
import { TEXT } from '../content/hajj.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { tents, lamps, sign, bus } from '../world/props.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import * as sfx from '../core/sfx.js';
import { createFlow, createMarker, goTo, promptAt, holdAction, pray, viewLine, clearView, isFemale } from '../core/kit.js';

// Mina: Zeltstadt im Tal. phase 'd8' (8. Dhul-Hiddscha) oder 'd10' (Opfer & Rasur).
// Zelte im Raster 10 m, alle 5 Zelte eine Straße (8 m). Das eigene Zelt liegt an einer Straße.
const step = 10, street = 8;
const coord = (i) => Math.sign(i) * (Math.abs(i) * step + Math.floor((Math.abs(i) + 4) / 5) * street);
const OWN = { x: coord(1), z: coord(-4) }; // eigenes Zelt (Mittelpunkt), direkt an der Hauptstraße

export function create(ctx, st) {
  const d10 = st.phase === 'd10';
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(d10 ? 10.5 : 9);
  sky.state.artificial = 1;
  sky.state.shadowSize = 60;

  const h = heightFn({ r0: 150, r1: 420, amp: 190, sx: 1.6, sz: 1 });
  buildTerrain(world, h);
  const glow = [];

  // Zelt-Raster (Lücken = Straßen); die Hauptstraße liegt bei x ≈ 0
  const list = [], blocks = [];
  for (let ix = -14; ix <= 14; ix++) for (let iz = -14; iz <= 14; iz++) {
    if (ix === 0) continue; // Hauptstraße
    const x = coord(ix), z = coord(iz);
    if (Math.hypot(x / 1.6, z) > 150) continue;
    if (Math.abs(x - OWN.x) < 1 && Math.abs(z - OWN.z) < 1) continue;
    list.push([x, 0, z]); blocks.push({ type: 'box', x, z, hw: 4.2, hd: 4.2 });
  }
  // Eigenes Zelt
  const own = [OWN.x, 0, OWN.z]; list.push(own); blocks.push({ type: 'box', x: OWN.x, z: OWN.z, hw: 4.2, hd: 4.2 });
  const tentGlow = [];
  tents(world, list, { glow: tentGlow });
  sign(world, OWN.x - 4.6, OWN.z, -Math.PI / 2, ['خيمة ١٠٨', 'Dein Zelt · 108'], { w: 3.6, h: 1.1, y: 2.6 });
  // Laternen an der Hauptstraße und den Querstraßen
  const ll = [];
  for (let z = -140; z <= 140; z += 18) ll.push([4.5, 0, z, -Math.PI / 2], [-4.5, 0, z + 9, Math.PI / 2]); // Arm zur Straßenmitte, versetzt
  lamps(world, ll, glow);

  let booth = null, barber = null;
  if (d10) {
    // Hady-Schalter und Friseur-Zelt an der Hauptstraße
    booth = { x: -6, z: -12 }; barber = { x: 6, z: -66 };
    const bm = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 2), new THREE.MeshStandardMaterial({ color: 0x2b5d4a, roughness: 0.6 }));
    bm.position.set(booth.x - 1.5, 1.3, booth.z); bm.castShadow = true; world.add(bm);
    sign(world, booth.x - 1.4, booth.z + 1.2, Math.PI / 2, ['الهدي', 'Hady · Opfer'], { w: 2.6, h: 0.9, y: 3.2 });
    sign(world, barber.x + 1, barber.z, -Math.PI / 2, ['حلاق', 'Friseur'], { w: 2.6, h: 0.9, y: 3.2 });
  }

  // Pilger auf den Straßen
  const N = engine.isMobile ? 260 : 420;
  const crowd = createCrowd(world, N, { ihram: true });
  const px = new Float32Array(N), pz = new Float32Array(N), pv = new Float32Array(N);
  for (let i = 0; i < N; i++) { px[i] = (Math.random() - 0.5) * 6; pz[i] = (Math.random() - 0.5) * 280; pv[i] = (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random() * 0.6); }

  const coach = bus(world, 6.2, 121, 0); // Reisebus am Ende der Hauptstraße
  const colliders = [...blocks, coach.collider, { type: 'inside', x: 0, z: 0, r: 160 }];
  const player = createPlayer(ctx, { x: 0, z: 30, heading: Math.PI, color: d10 ? 0xf3f1ea : 0x3d6b9a, speed: 3.4, fastSpeed: 5.4, colliders });
  player.fig.skinM.color.setHex(0xb07a4f);

  const flow = createFlow();
  const marker = createMarker(world, { r: 1.8 });
  const front = { x: OWN.x - 6.5, z: OWN.z };

  async function prayerAt(p) {
    await ui.choice(TEXT.mina8.prayQ(p.name), p.opts.map((n) => ({ html: `${n} Rak'at`, ok: n === p.rakat, why: n === p.rakat ? `Richtig. ${p.why}` : p.why })));
    player.heading = Math.atan2(-1, 0.4); // grob Richtung Qibla (Westen)
    await pray(ctx, flow, p.rakat, `Halten: ${p.name}`);
    ui.toast(`${p.name} ✓`);
  }

  async function day8() {
    const T = TEXT.mina8;
    ui.info(`<p>${st.intro}</p>`);
    await ui.choice(T.ihramQ, T.ihram);
    player.fig.setColor(0xf6f4ee);
    ui.toast('Ihram für den Hadsch ✓'); ctx.mission?.done(0);
    ui.info(`<p>${T.note}</p>`);
    await goTo(ctx, flow, marker, T.tentGoal, front.x, front.z);
    marker.hide(); ctx.mission?.done(1);
    for (const p of T.prayers) {
      if (p.name === 'Fajr') {
        // Übernachten: Zeit läuft, solange gehalten wird
        ctx.mission?.done(2);
        ui.info(`<p>${T.sleep}: Nacht unter Sternen in Mina.</p>`);
        const from = sky.hour;
        await flow.run(holdAction(ctx, player, { label: T.sleepHold, steps: [{ pose: 'sleep', sec: 5 }], onTick: (k) => sky.setHour(from + (29 - from) * k) }));
        ctx.mission?.done(3);
      }
      // Zeit bis zum Gebet vorspulen
      await new Promise((r) => sky.animateTo(p.hour, 2.2, r));
      ui.info(`<p>${p.name} · ${String(Math.floor(p.hour % 24)).padStart(2, '0')}:${String(Math.round((p.hour % 1) * 60)).padStart(2, '0')} Uhr</p><p class="tr">${T.note}</p>`);
      await prayerAt(p);
    }
    ctx.mission?.done(4);
    ui.info(`<p>${T.leave}.</p>`);
    await new Promise((r) => sky.animateTo(30.3, 2, r));
    await goTo(ctx, flow, marker, T.busGoal, 0, 120);
    sfx.bus();
    ctx.next();
  }

  async function day10() {
    const T = TEXT.mina10;
    ui.info(`<p>${st.intro}</p>`);
    await goTo(ctx, flow, marker, T.hadyGoal, booth.x + 1.5, booth.z);
    ui.info(`<p>${T.hadyInfo}</p>`);
    await promptAt(ctx, flow, T.hady, () => marker.inside(player.pos, 1));
    marker.hide();
    ui.toast('Opfer bestätigt ✓'); ctx.mission?.done(0);
    await goTo(ctx, flow, marker, T.barberGoal, barber.x - 1.5, barber.z);
    marker.hide();
    const c = isFemale(ctx) ? await ui.choice(T.hairQF, T.hairF) : await ui.choice(T.hairQ, T.hair);
    await flow.run(holdAction(ctx, player, { label: c.html.startsWith('Halq') ? 'Halten: rasieren' : 'Halten: kürzen', steps: [{ pose: 'sit', sec: 2.5 }] }));
    ui.toast(c.html.startsWith('Halq') ? 'Halq ✓' : 'Taqsir ✓'); ctx.mission?.done(1);
    ui.info(`<p>${T.tahallul}</p><p class="tr">${T.order}</p>`);
    await goTo(ctx, flow, marker, T.clothesGoal, front.x, front.z);
    await promptAt(ctx, flow, T.clothes, () => marker.inside(player.pos, 1));
    marker.hide();
    player.fig.setColor(0x6f7f8e);
    ui.toast('Normale Kleidung ✓'); ctx.mission?.done(2);
    await goTo(ctx, flow, marker, T.busGoal, 0, 120);
    sfx.bus();
    ctx.next();
  }
  (d10 ? day10 : day8)();

  let time = 0;
  return {
    update(dt) {
      time += dt;
      flow.update(dt);
      player.update(dt);
      marker.update(dt);
      for (const m of glow) m.emissiveIntensity = sky.art * 1.4;
      for (const m of tentGlow) m.emissiveIntensity = sky.art * 0.3;
      const v = viewLine(ctx);
      for (let i = 0; i < N; i++) {
        pz[i] += pv[i] * dt;
        if (pz[i] > 140) pz[i] = -140; else if (pz[i] < -140) pz[i] = 140;
        const [x, z] = clearView(v, px[i], pz[i]);
        crowd.set(i, x, Math.abs(Math.sin(time * 5 + i)) * 0.04, z, pv[i] > 0 ? 0 : Math.PI);
      }
      crowd.commit();
    },
    dispose() { flow.dispose(); },
  };
}
