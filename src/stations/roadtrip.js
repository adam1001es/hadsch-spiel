import * as THREE from 'three';
import { ROADTRIP as T } from '../content/life.js';
import { buildHejaz, roadX, mountainX, desertX, VILLAGES, D, REST_X, REST_Z } from '../world/hejaz.js';
import { sign, palms, mosque, lamps } from '../world/props.js';
import { createTowers, cityNight } from '../world/cityscape.js';
import { createLife } from '../world/life.js';
import { createPlayer } from '../core/player.js';
import { createInteract } from '../life/interact.js';
import { createBorrow } from '../life/borrow.js';
import { createPrayer } from '../life/prayer.js';
import { showMinimap } from '../life/minimap.js';
import { clock } from '../life/clock.js';

// Selbst fahren zwischen Mekka und Medina – eine offene Landschaft (eigene Spielidee): Autobahn, Bergstraße, Wüstenpiste mit Dünen,
// Sprungschanzen, Dörfer mit Moscheen, Rastplatz, Ring-Parkours mit Bestzeit. Jede Strecke endet in der anderen Stadt.
// Koordinaten wie die Hejaz-Welt: Mekka (0, 0), Medina (0, −D), Autobahn roadX(z). Anzeige in echten km (ca. 340 km).
const dm = new THREE.Object3D();
const MEC_END = -470, MED_END = -D + 690, LEN = MEC_END - MED_END; // Stadtgrenzen (in die Stadt hineinfahren = ankommen)
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const tangent = (path, z) => { const dx = path(z - 2) - path(z + 2); const l = Math.hypot(dx, -4); return { x: dx / l, z: -4 / l }; }; // Richtung nach Medina (−z)

function stripes(kind) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256; const g = c.getContext('2d');
  if (kind === 'highway') { // 4 Spuren: weiße Ränder, gestrichelte Spurlinien, gelbe Doppellinie in der Mitte (feine Linien, 256 px breit)
    c.width = 256; g.fillStyle = '#4f5054'; g.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.05)`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
    g.fillStyle = '#eeeeea'; g.fillRect(4, 0, 2.5, 256); g.fillRect(249.5, 0, 2.5, 256); g.fillRect(63, 0, 2, 110); g.fillRect(191, 0, 2, 110);
    g.fillStyle = '#e9c046'; g.fillRect(124.5, 0, 2, 256); g.fillRect(129.5, 0, 2, 256);
  } else if (kind === 'asphalt') {
    g.fillStyle = '#5a5b5f'; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},.06)`; g.fillRect(Math.random() * 64, Math.random() * 256, 2, 2); }
    g.fillStyle = '#eeeeea'; g.fillRect(2, 0, 2, 256); g.fillRect(60, 0, 2, 256); g.fillStyle = '#e9c046'; g.fillRect(31, 0, 2, 150);
  } else { // Piste: festgefahrener Sand mit Reifenspuren
    g.fillStyle = '#c8a46e'; g.fillRect(0, 0, 64, 256);
    for (let i = 0; i < 700; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '120,90,50' : '240,220,180'},.18)`; g.fillRect(Math.random() * 64, Math.random() * 256, 2, 3); }
    g.fillStyle = 'rgba(110,80,45,.28)'; g.fillRect(16, 0, 6, 256); g.fillRect(42, 0, 6, 256);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
// Straßenband entlang einer Strecke, auf das Gelände gelegt
function ribbon(world, path, z0, z1, width, mat, ground, step = 6) {
  const pos = [], uv = [], idx = []; let v = 0, n = 0;
  for (let z = z0; z >= z1; z -= step) {
    const cx = path(z), t = tangent(path, z), nx = t.z, nz = -t.x; // seitlich
    for (const k of [-1, 0, 1]) { const x = cx + nx * k * width / 2, zz = z + nz * k * width / 2; pos.push(x, ground(x, zz) + 0.3, zz); uv.push((k + 1) / 2, v); }
    if (n > 0) { const a = (n - 1) * 3, b = n * 3; idx.push(a, b, a + 1, b, b + 1, a + 1, a + 1, b + 1, a + 2, b + 1, b + 2, a + 2); }
    v += step / (width * 2.2); n++;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; world.add(m); return m;
}

export function create(ctx, { from = 'mecca', to = 'medina', vehicle = 'sedan', at = null } = {}) {
  const { engine, sky, ui } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  ui.el.day.textContent = T.day; ui.el.title.textContent = T.title(to);
  sky.state.shadowSize = 90;
  const land = buildHejaz(world, engine, { pilgrims: false });
  let hwLamps = [];

  // ---------- Strecken ----------
  const asphalt = new THREE.MeshStandardMaterial({ map: stripes('asphalt'), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const piste = new THREE.MeshStandardMaterial({ map: stripes('piste'), roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  const hwMat = new THREE.MeshStandardMaterial({ map: stripes('highway'), roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
  ribbon(world, roadX, -420, -D + 640, 22, hwMat, land.ground, 8); // Autobahn wie in der Stadt: breit, Spuren, Markierungen
  // Leitplanken und Laternen entlang der Autobahn
  { const rail = []; const LL = []; const glowL = [];
    for (let z = -470; z > -D + 690; z -= 12) { const t = tangent(roadX, z); for (const s2 of [-1, 1]) { const x = roadX(z) + t.z * s2 * 11.6, zz = z - t.x * s2 * 11.6; rail.push([x, land.ground(x, zz), zz, Math.atan2(t.x, t.z)]); } }
    for (let z = -480; z > -D + 700; z -= 55) { const t = tangent(roadX, z), s2 = ((z / 55) | 0) % 2 ? 1 : -1, x = roadX(z) + t.z * s2 * 12.4, zz = z - t.x * s2 * 12.4; LL.push([x, land.ground(x, zz), zz, Math.atan2(t.x, t.z) + (s2 > 0 ? -Math.PI / 2 : Math.PI / 2)]); }
    const rg = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.35, 12.2).translate(0, 0.6, 0), new THREE.MeshStandardMaterial({ color: 0xc9ccd0, metalness: 0.7, roughness: 0.35 }), rail.length);
    rail.forEach(([x, y, z, h], i) => { dm.position.set(x, y, z); dm.rotation.set(0, h, 0); dm.scale.setScalar(1); dm.updateMatrix(); rg.setMatrixAt(i, dm.matrix); }); world.add(rg);
    lamps(world, LL, glowL); hwLamps = glowL; }
  ribbon(world, mountainX, -720, -D + 920, 9, asphalt, land.ground);
  ribbon(world, desertX, -720, -D + 920, 10, piste, land.ground);

  // ---------- Sprungschanzen (Wüstenpiste, Autobahn-Rand, Bergstraße) ----------
  const ramps = [];
  const addRamp = (path, z, side = 0, dir = 1, L = 12, Hh = 3, W = 6) => {
    const t = tangent(path, z), x = path(z) + t.z * side, zz = z - t.x * side;
    const hd = Math.atan2(t.x * dir, t.z * dir); // Fahrtrichtung, in die die Schanze ansteigt
    ramps.push({ x, z: zz, h: hd, L, H: Hh, W, y0: land.ground(x, zz) });
  };
  for (let z = -1000; z > -2600; z -= 160) addRamp(desertX, z, 0, ((z / 160) | 0) % 2 ? 1 : -1, 12, 2.6 + ((-z / 160) % 3) * 0.6);
  for (const z of [-900, -1350, -1900, -2350]) addRamp(roadX, z, 14, z % 2 ? 1 : -1, 14, 3.5, 7);
  for (const z of [-1250, -2200]) addRamp(mountainX, z, 0, 1, 10, 1.8);
  const rampH = (x, z) => {
    let best = -1e9;
    for (const r of ramps) {
      const dx = x - r.x, dz = z - r.z, u = dx * Math.sin(r.h) + dz * Math.cos(r.h), w = dx * Math.cos(r.h) - dz * Math.sin(r.h);
      if (Math.abs(w) < r.W / 2 && u >= 0 && u <= r.L) best = Math.max(best, r.y0 + r.H * u / r.L);
    }
    return best;
  };
  const ground = (x, z) => Math.max(land.ground(x, z), rampH(x, z));
  { // Schanzen sichtbar: Keil mit gelb-schwarzer Kante
    const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
    for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#1b1b1b' : '#f2c230'; g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 16, 32); g.lineTo(i * 16 + 32, 0); g.lineTo(i * 16 + 16, 0); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
    const top = new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.8 }), edge = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
    for (const r of ramps) {
      const g2 = new THREE.BufferGeometry(), w = r.W / 2;
      const P = [[-w, 0, 0], [w, 0, 0], [-w, r.H, r.L], [w, r.H, r.L], [-w, 0, r.L], [w, 0, r.L]];
      const tri = [[0, 2, 1], [1, 2, 3], [4, 3, 2], [4, 5, 3], [0, 4, 2], [1, 3, 5]];
      const pos = []; for (const f of tri) for (const k of f) pos.push(...P[k]);
      g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.computeVertexNormals();
      g2.addGroup(0, 6, 0); g2.addGroup(6, 6, 1); g2.addGroup(12, 6, 0);
      const uvs = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < pos.length / 3; i++) { uvs[i * 2] = pos[i * 3] / 4 + 0.5; uvs[i * 2 + 1] = pos[i * 3 + 1] / r.H; } g2.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      const m = new THREE.Mesh(g2, [top, edge]); m.position.set(r.x, r.y0 - 0.05, r.z); m.rotation.y = r.h; m.castShadow = m.receiveShadow = true; world.add(m);
    }
  }

  // ---------- Dörfer ----------
  const colliders = [], glowWin = [], mosques = [];
  for (const v of VILLAGES) {
    const grp = new THREE.Group(); grp.position.set(v.x, v.h ?? land.ground(v.x, v.z), v.z); world.add(grp);
    const tw = createTowers(grp, { podiumStyle: 'medinaPodium' });
    let s = v.id.length * 31; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2 + rnd() * 0.3, rr = 14 + rnd() * (v.r - 18), x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (Math.abs(x + v.side * 0.7) < 7) continue; // Gasse zur Straße frei
      const w = 7 + rnd() * 5, d = 7 + rnd() * 5, h = 4.5 + rnd() * 4;
      tw.add(x, z, w, d, h, { style: v.id === 'berg' ? 'mecca' : 'medina', podium: 0, crown: false, tint: 0.85 + rnd() * 0.15 });
      colliders.push({ type: 'box', x: v.x + x, z: v.z + z, hw: w / 2, hd: d / 2, h: grp.position.y + h });
    }
    tw.build();
    const mq = mosque(grp, { x: 0, z: 0, w: 14, d: 12, h: 6, minarets: 1, glow: glowWin, ry: Math.atan2(-v.side, 0) });
    colliders.push({ type: 'box', x: v.x, z: v.z, hw: 7.5, hd: 7, h: grp.position.y + 12 }, { type: 'circle', x: v.x + 10, z: v.z + 6, r: 1.6 });
    mosques.push({ v, obj: mq });
    if (v.id === 'oase') { // Oase: Wasser und Palmen
      const pool = new THREE.Mesh(new THREE.CircleGeometry(9, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x3f8fb0, roughness: 0.15, metalness: 0.2 }));
      pool.position.set(-20 * Math.sign(v.side), 0.12, -14); grp.add(pool);
      palms(grp, Array.from({ length: 10 }, (_, i) => { const a = i / 10 * Math.PI * 2; return [-20 * Math.sign(v.side) + Math.cos(a) * 12, 0, -14 + Math.sin(a) * 12, 1 + (i % 3), 0.8]; }));
    } else palms(grp, [[v.side * 0.4, 0, 16, 1, 0.8], [v.side * 0.4, 0, -16, 2, 0.8]]);
    const sg = sign(world, v.path(v.z) + Math.sign(v.side) * 7, v.z + 8, Math.sign(v.side) > 0 ? -Math.PI / 2 : Math.PI / 2, ['قرية', v.name], { w: 3.4, h: 1, y: 2.6 });
    sg.position.y = land.ground(sg.position.x, sg.position.z);
  }
  // Wegweiser an den Abzweigungen
  for (const [z, lines, ry] of [[-735, T.fork, Math.PI], [-D + 905, T.forkBack, 0]]) { const x = roadX(z) + 11; const sg = sign(world, x, z, ry, lines, { w: 7.5, h: 1.8, y: 3.4 }); sg.position.y = land.ground(x, z); }

  // ---------- Parkours (goldene Ringe) ----------
  const COURSES = [
    { id: 'wueste', path: desertX, zs: Array.from({ length: 11 }, (_, i) => -1020 - i * 135) },
    { id: 'berg', path: mountainX, zs: Array.from({ length: 10 }, (_, i) => -1050 - i * 140) },
  ].map((c) => ({ ...c, name: T.courses[c.id], rings: c.zs.map((z) => { const x = c.path(z), t = tangent(c.path, z); return { x, z, y: land.ground(x, z) + 4.6, h: Math.atan2(t.x, t.z) }; }), next: 0, t: 0, on: false }));
  const ringGeo = new THREE.TorusGeometry(5, 0.38, 10, 40);
  const ringOn = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb81a, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 });
  const ringOff = new THREE.MeshStandardMaterial({ color: 0xd8b25a, emissive: 0x6a4a10, emissiveIntensity: 0.4, transparent: true, opacity: 0.45 });
  for (const c of COURSES) for (const r of c.rings) { r.mesh = new THREE.Mesh(ringGeo, ringOff); r.mesh.position.set(r.x, r.y, r.z); r.mesh.rotation.y = r.h; world.add(r.mesh); }
  const bestOf = (id) => { try { return +(localStorage.getItem('hp-parkour-' + id) || 0); } catch { return 0; } };
  const hud = document.createElement('div'); hud.id = 'tripHud'; document.body.appendChild(hud);

  // ---------- Spielfigur und Fahrzeug ----------
  const start = at === 'rest' ? { x: roadX(REST_Z) + (to === 'medina' ? -3.5 : 3.5), z: REST_Z } : to === 'medina' ? { x: roadX(-630) - 3.5, z: -630 } : { x: roadX(MED_END + 70) + 3.5, z: MED_END + 70 } // Fehler behoben: Start lag in Medina → sofort wieder angekommen;
  const hd = to === 'medina' ? Math.PI : 0;
  const player = createPlayer(ctx, { x: start.x + 4, z: start.z, heading: hd, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, speed: 2.4, fastSpeed: 4.2, colliders, ground, surface: 'sand' });
  const life = createLife(ctx, { kind: 'desert' });
  const interact = createInteract(ctx, player);
  const prayer = createPrayer(ctx, { city: 'mecca', player, qibla: () => ({ x: 0, z: 0 }) });
  prayer.interact = interact;
  for (const m of mosques) interact.add(prayer.spot({ obj: m.obj, x: m.v.x - Math.sign(m.v.side) * 10, z: m.v.z, key: 'pray-' + m.v.id, radius: 16 }));
  interact.add({ obj: new THREE.Group(), color: 'gold', radius: 30, near: 14, x: REST_X - 20, z: REST_Z, key: 'rest', label: T.rest, run() { ctx.borrowed = { kind: borrow.drive?.veh.kind || vehicle }; ctx.restStop?.(from, to); } });

  const pathPts = (path, zFrom, zTo, step = 18) => { const pts = [], dir = Math.sign(zTo - zFrom); for (let z = zFrom; dir > 0 ? z < zTo : z > zTo; z += dir * step) pts.push({ x: path(z), z }); pts.push({ x: path(zTo), z: zTo }); return pts; };
  const destinations = [
    ...[['medina', MED_END - 60], ['mecca', MEC_END + 60]].flatMap(([c, z]) => [['Autobahn', roadX], ['über die Berge', mountainX], ['durch die Wüste', desertX]].map(([how, path]) => ({ label: `${c === 'medina' ? 'Medina' : 'Mekka'} (${how})`, x: path(z), z, path }))),
    ...VILLAGES.map((v) => ({ label: v.name, x: v.x - Math.sign(v.side) * 12, z: v.z, path: v.path })),
    { label: 'Rastplatz', x: REST_X - 22, z: REST_Z, path: roadX },
  ];
  const route = (a, dest) => {
    if (!dest.path) return [dest];
    const pts = pathPts(dest.path, a.z, dest.z);
    // erst zur Strecke fahren (nächster Punkt), dann ihr folgen
    let k = 0, bd = 1e9; pts.forEach((p, i) => { const d = Math.hypot(p.x - a.x, p.z - a.z); if (d < bd && i < pts.length - 1) { bd = d; k = i; } });
    return [...pts.slice(k), { x: dest.x, z: dest.z }];
  };
  const noLand = (x, z) => (Math.hypot(x, z) < 240 ? 'Hier nicht landen – über der Kaaba und der Haram wird aus Respekt nicht gelandet.' : Math.abs(x) < 165 && Math.abs(z + D) < 125 ? 'Hier nicht landen – auf der Prophetenmoschee wird aus Respekt nicht gelandet.' : null);
  // Karte: Strecken als kurze Abschnitte
  const roadRects = [];
  for (const path of [roadX, mountainX, desertX]) for (let z = 200; z > -D - 300; z -= 12) { const x = path(z), w = path === roadX ? 11 : 6; roadRects.push({ x0: x - w, x1: x + w, z0: z - 8, z1: z + 8 }); }
  const map = showMinimap(ctx, {
    title: 'Karte · Mekka ↔ Medina', city: 'mecca', bounds: { x0: -1100, x1: 1100, z0: -D - 400, z1: 500 },
    roads: roadRects, blocks: colliders.filter((c) => c.type === 'box').map((c) => ({ x: c.x, z: c.z, w: c.hw * 2, d: c.hd * 2 })),
    shapes: [{ t: 'circle', x: 0, z: 0, r: 260, c: '#ece8e0', label: 'Mekka' }, { t: 'circle', x: 0, z: -D, r: 260, c: '#ece8e0', label: 'Medina' }],
    pois: [...VILLAGES.map((v) => ({ x: v.x, z: v.z, icon: '🏘️', label: v.name })), { x: REST_X, z: REST_Z, icon: '🕌', label: 'Rastplatz' },
      ...COURSES.map((c) => ({ x: c.rings[0].x, z: c.rings[0].z, icon: '🏁', label: c.name })), ...ramps.map((r) => ({ x: r.x, z: r.z, icon: '⤴️', label: '' })).slice(0, 0)],
  });
  const borrow = createBorrow(ctx, { player, interact, colliders, ground, noLand, destinations, route, map, where: from, baseActions: [],
    avoid: (x, z) => Math.abs(x - roadX(z)) < 12 });
  borrow.arriveWith(vehicle, start.x, start.z, hd);
  ui.info(`<p>${T.intro}</p>`); ui.el.panel.classList.add('collapsed');
  ctx.debugLife = { borrow, ground, COURSES };

  let done = false, villageSeen = '', prev = null;
  const arrive = (c) => { if (done) return; done = true; const D2 = borrow.drive; ctx.borrowed = D2 ? { kind: D2.veh.kind } : null; ui.toast(T.arrive(c), 2500); ctx.city?.(D2 ? 'car' : 'bus', c); };
  return {
    update(dt) {
      prayer.update(dt);
      player.update(dt);
      borrow.update(dt);
      cityNight.value = clock.night; for (const m of glowWin) m.emissiveIntensity = clock.night * 1.6; for (const m of hwLamps) m.emissiveIntensity = 0.3 + clock.night * 2.2;
      land.update(dt); life.update(dt); interact.update(dt); map.update();
      const D2 = borrow.drive, px = player.pos.x, pz = player.pos.z;
      // Parkours: durch den nächsten Ring fahren
      let line = '';
      for (const c of COURSES) {
        const r = c.rings[c.next];
        // durch den Ring gefahren? (Ebene des Rings zwischen letztem und jetzigem Bild überquert – klappt auch bei 340 km/h)
        let hit = false;
        if (D2 && r && prev) {
          const fx = Math.sin(r.h), fz = Math.cos(r.h), a0 = (prev.x - r.x) * fx + (prev.z - r.z) * fz, a1 = (D2.x - r.x) * fx + (D2.z - r.z) * fz;
          if (a0 * a1 <= 0 && a0 !== a1) { const t = a0 / (a0 - a1), cx = prev.x + (D2.x - prev.x) * t, cz = prev.z + (D2.z - prev.z) * t, cy = prev.y + (D2.y - prev.y) * t;
            hit = Math.hypot(cx - r.x, cz - r.z) < 7.5 && Math.abs(cy + 1.2 - r.y) < 7; }
        }
        if (hit) {
          r.mesh.material = ringOff; r.mesh.visible = false;
          if (c.next === 0) { c.on = true; c.t = 0; ui.toast(T.courseStart(c.name), 2600); }
          c.next++;
          if (c.next >= c.rings.length) { const best = bestOf(c.id), nb = !best || c.t < best; if (nb) try { localStorage.setItem('hp-parkour-' + c.id, String(c.t)); } catch { /* egal */ } ui.toast(T.courseDone(c.name, fmt(c.t), nb), 4000); c.on = false; c.next = 0; for (const q of c.rings) q.mesh.visible = true; }
        }
        if (c.on) { c.t += dt; line = T.courseRing(c.name, c.next, c.rings.length, fmt(c.t)); if (r && Math.hypot(px - r.x, pz - r.z) > 700) { c.on = false; c.next = 0; for (const q of c.rings) q.mesh.visible = true; } }
        c.rings.forEach((q, i) => { q.mesh.material = i === c.next ? ringOn : ringOff; q.mesh.rotation.z += dt * (i === c.next ? 1.2 : 0); });
      }
      prev = D2 ? { x: D2.x, y: D2.y, z: D2.z } : null;
      // Anzeige: Entfernung zum Ziel (echte km), Parkour, Dorf
      const km = Math.max(0, Math.round((to === 'medina' ? pz - MED_END : MEC_END - pz) / LEN * 340));
      const near = VILLAGES.find((v) => Math.hypot(px - v.x, pz - v.z) < v.r + 25);
      if (near && near.id !== villageSeen) { villageSeen = near.id; ui.toast(T.village(near.name), 2200); } else if (!near) villageSeen = '';
      const best = COURSES.map((c) => bestOf(c.id) ? `${c.name}: ${fmt(bestOf(c.id))}` : '').filter(Boolean).join(' · ');
      hud.innerHTML = `<b>${T.km(to === 'medina' ? 'Medina' : 'Mekka', km)}</b>${line ? `<span class="c">${line}</span>` : best ? `<span>${best}</span>` : ''}`;
      // in die Stadt hineingefahren = angekommen
      if (pz < MED_END) arrive('medina'); else if (pz > MEC_END) arrive('mecca');
    },
    dispose() { hud.remove(); borrow.dispose(); prayer.dispose(); map.dispose(); interact.dispose(); cityNight.value = 0; },
  };
}
