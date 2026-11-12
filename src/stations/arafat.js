import * as THREE from 'three';
import { TEXT, ARAFAT_DHIKR, RABBANA } from '../content/hajj.js';
import { heightFn, buildTerrain, fbm } from '../world/terrain.js';
import { tents, trees, sign, rock, bus } from '../world/props.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, goTo, promptAt, pray, duaFacing, pointGoal } from '../core/kit.js';

const T = TEXT.arafat;
const BOUND = 96;              // Grenze von Arafat bei z = 96 (südlich davon = Arafat)
const HILL = { x: 30, z: -190 }; // Jabal ar-Rahma
const QIBLA = { x: -3000, z: 400 }; // Richtung Mekka (Westen)

export function create(ctx, st) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(11.75);
  sky.state.shadowSize = 60;

  const base = heightFn({ r0: 330, r1: 700, amp: 160, sx: 1.3, sz: 1 });
  // Jabal ar-Rahma: felsiger Hügel (ca. 30 m) mit weißer Säule auf der Spitze
  const hill = (x, z) => { const d = Math.hypot(x - HILL.x, z - HILL.z); return d < 60 ? Math.pow(Math.cos((d / 60) * Math.PI / 2), 1.6) * 30 + Math.sin((d / 60) * Math.PI) * (fbm(x * 0.12, z * 0.12) - 0.5) * 3 : 0; }; // felsige Unebenheiten, Gipfel und Fuß bleiben glatt
  const h = (x, z) => base(x, z) + hill(x, z);
  buildTerrain(world, h, 1800, 200);
  // Felsbrocken am Hang; ein Weg von Norden (zur Ebene hin) bleibt frei, damit man bis zur Säule hinaufgehen kann
  const hillRocks = [];
  for (let i = 0; i < 14; i++) {
    const a = i * 2.4, r = 10 + (i % 4) * 9, x = HILL.x + Math.cos(a) * r, z = HILL.z + Math.sin(a) * r;
    if (Math.abs(x - HILL.x) < 9 && z > HILL.z) continue; // Aufstieg frei halten
    const rr = 3 + (i % 3) * 1.5;
    rock(world, { r: rr, x, y: h(x, z) - 0.5, z, sy: 0.6, seed: i, rep: 1.5 });
    hillRocks.push({ type: 'circle', x, z, r: rr * 0.8 });
  }
  const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 8, 1.8), new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.6 }));
  pillar.position.set(HILL.x, 30 + 4, HILL.z); pillar.castShadow = true; world.add(pillar);

  // Grenzschilder (gelb wie in echt), alle 24 m
  for (let x = -120; x <= 120; x += 40) sign(world, x, BOUND, 0, ['حدود عرفات', 'Grenze von Arafat · Beginn'], { w: 5, h: 1.5, y: 4, bg: '#e2b93b', fg: '#1b1b1b' });

  // Zelte, Neem-Bäume, Schirme
  const tl = [];
  for (let i = 0; i < 60; i++) { const x = -150 + (i % 15) * 20, z = 20 + Math.floor(i / 15) * 18; if (Math.abs(x) > 14) tl.push([x, 0, z]); }
  tents(world, tl);
  const tr = [];
  for (let i = 0; i < 140; i++) { const x = (Math.random() - 0.5) * 360, z = -150 + Math.random() * 240; if (Math.abs(x) > 8 && Math.hypot(x - HILL.x, z - HILL.z) > 65) tr.push([x, h(x, z), z, Math.random() * 6, 0.8 + Math.random() * 0.6]); }
  trees(world, tr);
  const umb = new THREE.InstancedMesh(new THREE.ConeGeometry(1.1, 0.4, 10, 1, true).translate(0, 2.1, 0), new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.7, side: THREE.DoubleSide }), 120);
  const dm = new THREE.Object3D();

  // Pilger: viele sitzend, einige stehend in Dua
  const N = engine.isMobile ? 700 : 1300;
  const crowd = createCrowd(world, N, { ihram: true });
  for (let i = 0; i < N; i++) {
    let x, z; do { x = (Math.random() - 0.5) * 380; z = -170 + Math.random() * 260; } while (Math.abs(x) < 5 || Math.hypot(x - HILL.x, z - HILL.z) < 25);
    const sit = Math.random() < 0.6;
    crowd.set(i, x, h(x, z), z, Math.PI / 2 + (Math.random() - 0.5) * 0.6, sit ? 0.62 : 1);
    if (i < 120) { dm.position.set(x, h(x, z), z); dm.updateMatrix(); umb.setMatrixAt(i, dm.matrix); }
  }
  crowd.commit(); world.add(umb);

  const coach = bus(world, 6.2, BOUND + 16, 0); // Reisebus hinter der Grenze
  let boundActive = true, boundHint = 0;
  const colliders = [
    { type: 'inside', x: 0, z: -40, r: 240 },
    ...hillRocks, { type: 'circle', x: HILL.x, z: HILL.z, r: 1.4 }, coach.collider, // Säule auf dem Gipfel; der Berg selbst ist begehbar
    { type: 'fn', fn(p) { if (boundActive && insideArafat && p.z > BOUND - 1) { p.z = BOUND - 1; if (boundHint <= 0) { ui.hint(T.stay); boundHint = 3; } } } },
  ];
  let insideArafat = false;
  const player = createPlayer(ctx, { x: 0, z: 128, heading: Math.PI, color: 0xf6f4ee, speed: 3.4, fastSpeed: 5.4, colliders, ground: h });
  player.fig.skinM.color.setHex(0xb07a4f);

  const flow = createFlow();
  const marker = createMarker(world, { r: 2 });
  let textIdx = -1;

  async function run() {
    ui.info(`<p>${T.start}</p>`);
    await flow.until(() => { pointGoal(ui, player, T.boundary, 0, BOUND - 6); return player.pos.z < BOUND - 2; });
    insideArafat = true;
    ui.toast(T.inside, 2400); ctx.mission?.done(0);
    await goTo(ctx, flow, marker, 'Predigt-Platz', 0, 70);
    await promptAt(ctx, flow, T.sermon, () => marker.inside(player.pos, 1));
    marker.hide();
    await ui.choice(T.prayQ, T.pray);
    player.heading = Math.atan2(QIBLA.x - player.pos.x, QIBLA.z - player.pos.z);
    await pray(ctx, flow, 2, 'Halten: Dhuhr');
    ui.toast('Dhuhr ✓');
    await pray(ctx, flow, 2, 'Halten: Asr');
    ui.toast('Asr ✓'); ctx.mission?.done(1);
    await new Promise((r) => sky.animateTo(13.25, 2, r));

    await goTo(ctx, flow, marker, T.duaGoal, HILL.x - 20, HILL.z + 62);
    marker.hide(); ctx.mission?.done(2);
    ui.info(`<p>Wuquf: Bitte Allah – stehend oder sitzend, zur Qibla gewandt. Halte „Dua“; die Zeit läuft bis Sonnenuntergang.</p>`);
    await duaFacing(ctx, flow, {
      label: T.dua, sec: 30, tx: QIBLA.x, tz: QIBLA.z,
      onTick(k) {
        sky.setHour(13.25 + (18.5 - 13.25) * k);
        const i = Math.min(T.duaTexts.length - 1, Math.floor(k * T.duaTexts.length));
        if (i !== textIdx) {
          textIdx = i;
          const t = T.duaTexts[i];
          ui.info(t === 'ARAFAT' ? ui.prayer(ARAFAT_DHIKR) : t === 'RABBANA' ? ui.prayer(RABBANA) : `<p>${t}</p>`);
        }
        const hh = sky.hour; ui.el.counter.dataset.t = `${Math.floor(hh)}:${String(Math.floor((hh % 1) * 60)).padStart(2, '0')} Uhr`;
      },
    });
    boundActive = false; ctx.mission?.done(3);
    ui.info(`<p>Die Sonne ist untergegangen.</p><p class="tr">${T.leave}.</p>`);
    await goTo(ctx, flow, marker, T.busGoal, 0, BOUND + 16);
    ctx.next();
  }
  run();

  return {
    update(dt) {
      boundHint -= dt;
      flow.update(dt);
      crowd.commit(); // Detailstufen der Pilgerinnen mit der Kamera mitführen
      player.update(dt);
      marker.update(dt);
      marker.group.position.y = h(marker.group.position.x, marker.group.position.z);
      if (ui.el.counter.dataset.t) { ui.el.counter.textContent = ui.el.counter.dataset.t; }
    },
    dispose() { flow.dispose(); delete ui.el.counter.dataset.t; },
  };
}
