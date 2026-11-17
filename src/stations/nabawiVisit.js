import * as THREE from 'three';
import { createCrowd, separateSlots } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import { sign } from '../world/props.js';
import { PRAYER_UI as U } from '../content/life.js';
import { createPrayer } from '../life/prayer.js';
import { showMinimap } from '../life/minimap.js';
import { createInteract } from '../life/interact.js';

// Lebensspiel: in der Masjid an-Nabawi (vereinfachte Gebetshalle, ohne die Grabkammer darzustellen).
// Säulenhalle mit Teppichen, Qibla-Wand im Süden (+z) mit Gebetsnische, Minbar und Rawda (grüner Teppich).
// Menschen sitzen und stehen verteilt; zum Gemeinschaftsgebet stellen sich alle in Reihen zur Qibla. Beten jederzeit zur Gebetszeit.
const HX = 60, HZ = 40, CH = 9; // halbe Hallenmaße, Deckenhöhe
const dm = new THREE.Object3D();

function carpetTex(base, line) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.fillStyle = line; g.fillRect(0, 0, 128, 6); // Reihenlinie (quer zur Qibla)
  g.globalAlpha = 0.25; for (let x = 8; x < 128; x += 16) { g.beginPath(); g.moveTo(x, 20); g.lineTo(x + 6, 64); g.lineTo(x, 108); g.lineTo(x - 6, 64); g.closePath(); g.fill(); } g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export function create(ctx) {
  const { engine, sky, ui } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  ui.el.day.textContent = 'Lebensspiel'; ui.el.title.textContent = U.nabawiTitle;
  sky.state.indoor = true; sky.state.shadowSize = 40;

  // Boden: rote Teppiche, Rawda grün
  const red = carpetTex('#8a2a24', '#c9a24e'); red.repeat.set(HX * 2 / 1.2, HZ * 2 / 1.2);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: red, roughness: 0.95 })); floor.receiveShadow = true; world.add(floor);
  const RW = { x0: -34, x1: -10, z0: 24, z1: 38 };
  const green = carpetTex('#2f6b45', '#e6d6a8'); green.repeat.set((RW.x1 - RW.x0) / 1.2, (RW.z1 - RW.z0) / 1.2);
  const rawda = new THREE.Mesh(new THREE.PlaneGeometry(RW.x1 - RW.x0, RW.z1 - RW.z0).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: green, roughness: 0.95 })); rawda.position.set((RW.x0 + RW.x1) / 2, 0.01, (RW.z0 + RW.z1) / 2); world.add(rawda);
  // Wände, Decke
  const cream = new THREE.MeshStandardMaterial({ color: 0xefe7d6, roughness: 0.8 });
  const goldM = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 0.9, roughness: 0.3, emissive: 0x5a3e10, emissiveIntensity: 0.3 });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HX * 2, HZ * 2).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf3ecdc, roughness: 0.9, emissive: 0xfff2d8, emissiveIntensity: 0.12 })); ceil.position.y = CH; world.add(ceil);
  for (const [x, z, ww, dd] of [[0, -HZ, HX * 2, 0.6], [0, HZ, HX * 2, 0.6], [-HX, 0, 0.6, HZ * 2], [HX, 0, 0.6, HZ * 2]]) { const m = new THREE.Mesh(new THREE.BoxGeometry(ww, CH, dd), cream); m.position.set(x, CH / 2, z); world.add(m); }
  // Fensterreihe (hell) an den Seitenwänden, goldenes Band an der Qibla-Wand
  const winM = new THREE.MeshStandardMaterial({ color: 0xfff6e2, emissive: 0xfff1d0, emissiveIntensity: 0.8 });
  for (let z = -HZ + 6; z < HZ - 4; z += 8) for (const sx of [-1, 1]) { const wn = new THREE.Mesh(new THREE.PlaneGeometry(2, 3.4), winM); wn.position.set(sx * (HX - 0.32), 5.2, z); wn.rotation.y = -sx * Math.PI / 2; world.add(wn); }
  const band = new THREE.Mesh(new THREE.BoxGeometry(HX * 2 - 2, 0.5, 0.1), goldM); band.position.set(0, 6.8, HZ - 0.32); world.add(band);
  // Gebetsnischen (Mihrab): Hauptnische in der Mitte, Nische des Propheten ﷺ in der Rawda
  for (const [x, s] of [[0, 1.2], [-22, 1]]) {
    const g = new THREE.Group(); g.position.set(x, 0, HZ - 0.32); world.add(g);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(3.2 * s, 5 * s, 0.2), goldM); frame.position.y = 2.5 * s; g.add(frame);
    const niche = new THREE.Mesh(new THREE.BoxGeometry(2.2 * s, 3.8 * s, 0.25), new THREE.MeshStandardMaterial({ color: 0x2f6b55, roughness: 0.6 })); niche.position.set(0, 1.9 * s, -0.03); g.add(niche);
    const arch = new THREE.Mesh(new THREE.CircleGeometry(1.1 * s, 20, 0, Math.PI), niche.material); arch.position.set(0, 3.8 * s, -0.17); arch.rotation.y = Math.PI; g.add(arch);
  }
  // Minbar (weißer Marmor, Treppe)
  { const g = new THREE.Group(); g.position.set(-31, 0, 35); world.add(g); const wM = new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.4 });
    for (let i = 0; i < 8; i++) { const st = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3 * (i + 1), 0.4), wM); st.position.set(0, 0.15 * (i + 1), -i * 0.4); g.add(st); }
    const top = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), goldM); top.position.set(0, 4.2, -3); g.add(top); }
  // Säulen (weiß mit goldenem Ring) im Raster, Kollision
  const cols = []; for (let x = -HX + 6; x <= HX - 6; x += 7) for (let z = -HZ + 6; z <= HZ - 6; z += 7) if (!(z > RW.z0 - 1 && x > RW.x0 && x < RW.x1 && z < RW.z1)) cols.push([x, z]);
  const colG = new THREE.CylinderGeometry(0.42, 0.48, CH, 12).translate(0, CH / 2, 0), capG = new THREE.CylinderGeometry(0.62, 0.5, 0.5, 12).translate(0, CH - 0.8, 0);
  for (const [geo, mat] of [[colG, new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.45 })], [capG, goldM]]) {
    const im = new THREE.InstancedMesh(geo, mat, cols.length); cols.forEach(([x, z], i) => { dm.position.set(x, 0, z); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); world.add(im);
  }
  // Kronleuchter (warmes Licht)
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd590, emissiveIntensity: 1.6 });
  const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 8), lampM, 40); let n = 0;
  for (let x = -HX + 9.5; x < HX - 6 && n < 40; x += 14) for (let z = -HZ + 9.5; z < HZ - 6 && n < 40; z += 14) { dm.position.set(x, CH - 1.6, z); dm.updateMatrix(); lamps.setMatrixAt(n++, dm.matrix); }
  lamps.count = n; world.add(lamps);
  const light = new THREE.PointLight(0xffe2b0, 30, 80, 1.2); light.position.set(0, CH - 1, 0); world.add(light);
  const rawdaSign = sign(world, (RW.x0 + RW.x1) / 2, RW.z0 - 1.2, Math.PI, ['الروضة الشريفة', 'Die Rawda'], { w: 3, h: 1, y: 2.4 });

  // Menschen: verteilt sitzend/stehend; zum Gemeinschaftsgebet Reihen zur Qibla (Süden)
  const N = mobile ? 90 : 160, crowd = createCrowd(world, N, { ihram: false, men: 0.7 });
  const free = (x, z) => !cols.some(([cx, cz]) => Math.abs(cx - x) < 0.9 && Math.abs(cz - z) < 0.9);
  const home = [], rows = [];
  // Sitzen/Beten verteilt: Männer im vorderen Teil, Frauen im hinteren Teil der Moschee, dazwischen ein freier Streifen
  const ZW = -HZ * 0.35;
  while (home.length < N) { const m = crowd.male(home.length), x = -HX + 3 + Math.random() * (HX * 2 - 6), z = m ? ZW + 2.5 + Math.random() * (HZ - 5 - ZW) : -HZ + 3 + Math.random() * (ZW - 2.5 + HZ - 3); if (free(x, z)) home.push({ x, z, ry: Math.PI * (Math.random() < 0.7 ? 0 : 1) + (Math.random() - 0.5) }); }
  for (let z = HZ - 3; rows.length < N * 2 && z > -HZ + 2; z -= 1.2) for (let x = -HX + 2; x < HX - 2 && rows.length < N * 2; x += 0.85) if (free(x, z) && !(x > RW.x0 - 1 && x < RW.x1 + 1 && z > RW.z1 - 3)) rows.push({ x, z });
  const seat = separateSlots(rows, N, (i) => crowd.male(i)).map((s, i) => s || home[i]); // Gemeinschaftsgebet: Männer vorne, Frauen hinten
  const P = home.map((h) => ({ ...h })), mode = Array.from({ length: N }, () => (Math.random() < 0.45 ? 'pray' : 'stand'));

  const colliders = [{ type: 'rect', x0: -HX + 0.6, x1: HX - 0.6, z0: -HZ + 0.6, z1: HZ - 0.6 }, ...cols.map(([x, z]) => ({ type: 'circle', x, z, r: 0.5 })), { type: 'box', x: -31, z: 33.6, hw: 0.7, hd: 1.8 }];
  const player = createPlayer(ctx, { x: 48, z: 32, heading: -Math.PI / 2, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, speed: 2.2, fastSpeed: 3.4, colliders, surface: 'carpet' });
  const qibla = (x, z) => ({ x: x - 170, z: z + 1000 });
  const prayer = createPrayer(ctx, { city: 'medina', player, qibla });
  const interact = createInteract(ctx, player);
  interact.add({ obj: rawdaSign, color: 'gold', radius: 10, near: 4, x: (RW.x0 + RW.x1) / 2, z: RW.z0 - 2.5, key: 'rawda', label: U.rawdaDo, run() { ui.info(`<p>${U.rawda}</p>`); ui.el.panel.classList.remove('collapsed'); } });
  prayer.interact = interact;
  let lastKey = '';
  const actions = () => {
    const p = prayer.due, key = (p ? p.id : '-') + (prayer.busy ? 'b' : '');
    if (key === lastKey) return; lastKey = key;
    ui.actions([...(p && !prayer.busy ? [{ label: U.pray(p), kind: 'primary', onClick: () => prayer.start(prayer.due) }] : []), { label: U.leaveNabawi, onClick: () => ctx.city?.('nabawi', 'medina') }]);
  };
  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${U.nabawiIntro}</p><p class="small">${U.note}</p>`);
  const map = showMinimap(ctx, {
    title: 'Karte · Masjid an-Nabawi', city: 'medina', bounds: { x0: -HX - 4, x1: HX + 4, z0: -HZ - 4, z1: HZ + 4 },
    areas: [{ x0: -HX, x1: HX, z0: -HZ, z1: HZ, c: '#c9786c' }, { ...RW, c: '#6fa27f' }], blocks: cols.map(([x, z]) => ({ x, z, w: 1, d: 1 })),
    pois: [{ x: 0, z: HZ - 2, icon: '🕌', label: 'Gebetsnische (Qibla)' }, { x: -22, z: RW.z0 + 2, icon: '🟩', label: 'Rawda' }, { x: -31, z: 31, icon: '🪜', label: 'Minbar' }, { x: 48, z: 32, icon: '🚪', label: 'Ausgang' }],
  });
  let wasJ = false;
  return {
    update(dt) {
      prayer.update(dt);
      sky.state.indoor = true;
      player.update(dt);
      actions();
      const jm = !!prayer.jamaah;
      if (jm !== wasJ) { wasJ = jm; if (jm) ui.toast('Alle stellen sich in Reihen zur Qibla auf.', 3500); }
      const k = Math.min(1, dt * 1.2), cyc = (performance.now() / 1000) % 8 / 8;
      for (let i = 0; i < N; i++) {
        const t = jm ? seat[i] : home[i], p = P[i];
        p.x += (t.x - p.x) * k; p.z += (t.z - p.z) * k;
        const there = Math.hypot(t.x - p.x, t.z - p.z) < 0.4;
        const ry = jm ? 0 : home[i].ry;
        const sy = there && (jm || mode[i] === 'pray') ? (((cyc + i * 0.13) % 1) > 0.45 && ((cyc + i * 0.13) % 1) < 0.85 ? 0.62 : 1) : 1;
        crowd.set(i, p.x, 0, p.z, ry, sy);
      }
      crowd.commit();
      interact.update(dt);
      map.update();
    },
    dispose() { prayer.dispose(); map.dispose(); interact.dispose(); sky.state.indoor = false; },
  };
}
