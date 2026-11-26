import * as THREE from 'three';
import { BUILDYARD as T, MATERIALS, ITEMS } from '../content/life.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { palms, sign, bus } from '../world/props.js';
import { createPlayer } from '../core/player.js';
import { createLife } from '../world/life.js';
import { createInteract, boxClosest } from '../life/interact.js';
import { clock } from '../life/clock.js';
import * as sfx from '../core/sfx.js';

// Sandstein-Bauhof: riesige Wüste mit Bergen zum freien Bauen (eigene Spielidee im Stil der übrigen Welt, kein Nachbau eines Block-Spiels).
// - Steine (0,5 m) überall: auf dem Sand, auf den Hängen, oben auf den Bergen (Raster ±950 m, bis 500 m hoch).
// - Fertige Gegenstände (Gebetsteppich, Hocker, Bett, Sofa, Lagerfeuer, Bäume …) aus dem Baukasten.
// - Springen und Fliegen (Schweben), Tag und Nacht nach der Spieluhr.
// - Zusammen bauen: Alle, die gleichzeitig im Bauhof sind, bauen an derselben Welt (öffentlich oder im privaten Raum).
//   Ereignisse über multi.send: 'b' Stein, 'p' Gegenstand, 'bq' Bau anfragen, 'bs' Bau schicken (in Stücken, wird zusammengeführt).
// Speichern: localStorage „hp-bauhof“ bzw. „hp-bauhof-raum-<Code>“ (Version 3; Versionen 1 und 2 werden übernommen).
const S = 0.5, K = 4096, OFF = 2048, YOFF = 64, LIM = 1900; // Steingröße, Schlüsselraster, Grenze ±LIM Zellen (±950 m)
const MAX = 60000, MAXP = 600; // Steine, Gegenstände insgesamt
const key = (gx, gy, gz) => (gx + OFF) + (gz + OFF) * K + (gy + YOFF) * K * K;
const unkey = (k) => { const gy = Math.floor(k / (K * K)), r = k - gy * K * K; return [r % K - OFF, gy - YOFF, Math.floor(r / K) - OFF]; };
const cell = (v) => Math.floor(v / S);
const ENTRY = -60; // Eingang im Westen (Bus, Hütte, Stapel) – wie im alten Bauhof

// ---------- eigene Texturen (im Browser gezeichnet, kein Download) ----------
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function texture(id) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = rnd(id.length * 977 + 13);
  const fill = (col) => { g.fillStyle = col; g.fillRect(0, 0, 256, 256); };
  const specks = (n, cols, s0, s1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const s = s0 + r() * (s1 - s0); g.globalAlpha = 0.25 + r() * 0.35; g.fillRect(r() * 256, r() * 256, s, s); } g.globalAlpha = 1; };
  if (id === 'sand') {
    fill('#d8b47a'); specks(2600, ['#c49a5e', '#e6c896', '#b88d55'], 1, 3);
    g.globalAlpha = 0.18; for (let y = 30; y < 256; y += 38 + r() * 20) { g.fillStyle = '#a77e48'; g.fillRect(0, y, 256, 2 + r() * 3); } g.globalAlpha = 1;
  } else if (id === 'mud') {
    fill('#b8875a'); specks(1800, ['#a2744a', '#c99a6c', '#8f6440'], 1, 3);
    g.fillStyle = '#d9bf98'; // Fugen: zwei Ziegelreihen, versetzt
    for (const y of [0, 126, 252]) g.fillRect(0, y - 3, 256, 7);
    for (const [y, x] of [[0, 128], [126, 0], [126, 255]]) g.fillRect(x - 3, y, 7, 126);
    g.strokeStyle = 'rgba(230,205,140,0.5)'; for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 256, a = r() * 6; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); } // Stroh
  } else if (id === 'coral') {
    fill('#e4dac6'); specks(1500, ['#d2c5ad', '#efe7d8'], 1, 4);
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(120,100,75,0.45)'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2.5, r() * 3, 0, 7); g.fill(); } // Poren
  } else if (id === 'marble') {
    fill('#f1eee8'); specks(900, ['#e4e0d8', '#faf8f4'], 2, 6);
    g.strokeStyle = 'rgba(140,140,150,0.35)';
    for (let v = 0; v < 5; v++) { let x = r() * 256, y = 0; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); g.moveTo(x, y); while (y < 256) { x += (r() - 0.5) * 22; y += 8 + r() * 10; g.lineTo(x, y); } g.stroke(); }
  } else if (id === 'wood') {
    fill('#8c6440');
    for (let x = 0; x < 256; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '60,40,22' : '170,130,90'},${0.15 + r() * 0.25})`; g.fillRect(x, 0, 1 + r() * 2, 256); }
    g.fillStyle = 'rgba(50,32,18,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(0, r() * 256, 256, 1.5); // Fasern quer
  } else if (id === 'tile') {
    fill('#efe6d2');
    // achtzackiger Stern (zwei gedrehte Quadrate) mit Rand – eigenes geometrisches Muster
    const star = (cx, cy, rr, col) => { g.fillStyle = col; for (const a of [0, Math.PI / 4]) { g.save(); g.translate(cx, cy); g.rotate(a); g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore(); } };
    star(128, 128, 78, '#1f5f7a'); star(128, 128, 62, '#2f8f9a'); star(128, 128, 30, '#efe6d2'); star(128, 128, 20, '#c9a24e');
    for (const [x, y] of [[0, 0], [256, 0], [0, 256], [256, 256]]) star(x, y, 34, '#1f5f7a');
  } else if (id === 'basalt') {
    fill('#4a4846'); specks(2400, ['#3a3836', '#5c5955', '#2e2c2a'], 1, 3);
  } else if (id === 'glass') {
    const gr = g.createLinearGradient(0, 0, 256, 256); gr.addColorStop(0, '#cfe7ef'); gr.addColorStop(1, '#8fb9c9'); g.fillStyle = gr; g.fillRect(0, 0, 256, 256);
    g.fillStyle = 'rgba(255,255,255,.45)'; g.beginPath(); g.moveTo(40, 220); g.lineTo(90, 30); g.lineTo(120, 30); g.lineTo(70, 220); g.fill();
  } else if (id === 'green') {
    fill('#4f7d33'); specks(3000, ['#3e6a28', '#679a44', '#2f5520'], 2, 5);
  }
  // Kanten: leichte Fase (dunkler Rand, heller Saum) – jeder Stein ist erkennbar, ohne Pixel-Look
  g.strokeStyle = 'rgba(40,25,10,0.45)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  g.strokeStyle = 'rgba(255,248,230,0.35)'; g.lineWidth = 3; g.strokeRect(10, 10, 236, 236);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, url: c.toDataURL('image/jpeg', 0.7) };
}const ROUGH = { sand: 0.92, mud: 0.95, coral: 0.9, marble: 0.35, wood: 0.8, tile: 0.3, basalt: 0.9, glass: 0.08, green: 1 };

// ---------- fertige Gegenstände (einfache Formen, geteilte Materialien) ----------
let IM = null;
function itemMats() {
  if (IM) return IM;
  const std = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const carpet = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 224; const g = c.getContext('2d');
    g.fillStyle = '#7e2a22'; g.fillRect(0, 0, 128, 224); g.strokeStyle = '#d9b56a'; g.lineWidth = 6; g.strokeRect(8, 8, 112, 208);
    g.fillStyle = '#1f2f4a'; g.beginPath(); g.moveTo(30, 200); g.lineTo(30, 70); g.quadraticCurveTo(64, 20, 98, 70); g.lineTo(98, 200); g.fill(); // Gebetsnische (Richtung)
    g.fillStyle = '#d9b56a'; g.beginPath(); g.moveTo(64, 90); g.lineTo(80, 130); g.lineTo(64, 170); g.lineTo(48, 130); g.fill();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  IM = {
    wood: std(0x8a6240), dark: std(0x4e3826), white: std(0xf4f1ea, 0.9), green: std(0x2f6b45, 0.9), red: std(0x8a2a24, 0.9),
    leaf: std(0x4f7d33, 0.95), stone: std(0x9c9182, 0.95), fabric: std(0xe2d2a8, 0.95), pot: std(0xb5653a), sandy: std(0xc9a06a, 0.95),
    water: std(0x3f8fb0, 0.15, { metalness: 0.2 }), carpet: new THREE.MeshStandardMaterial({ map: carpet, roughness: 0.95 }),
    flame: new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xff7a1a, emissiveIntensity: 2, transparent: true, opacity: 0.92 }),
    lamp: new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffc070, emissiveIntensity: 0.4 }),
  };
  return IM;
}
function buildItem(id) {
  const M = itemMats(), g = new THREE.Group(), flames = [];
  const add = (geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); o.castShadow = true; o.receiveShadow = true; g.add(o); return o; };
  const box = (w, h, d, m, x, y, z, rx, ry, rz) => add(new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz);
  const cyl = (a, b, h, m, x, y, z, seg = 10, rx = 0, ry = 0, rz = 0) => add(new THREE.CylinderGeometry(a, b, h, seg), m, x, y, z, rx, ry, rz);
  const ball = (r, m, x, y, z, sx = 1, sy = 1, sz = 1) => { const o = add(new THREE.SphereGeometry(r, 12, 8), m, x, y, z); o.scale.set(sx, sy, sz); return o; };
  if (id === 'teppich') box(0.7, 0.02, 1.2, M.carpet, 0, 0.01, 0);
  else if (id === 'hocker') { cyl(0.22, 0.22, 0.06, M.wood, 0, 0.45, 0, 14); for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; cyl(0.025, 0.025, 0.44, M.dark, Math.cos(a) * 0.15, 0.22, Math.sin(a) * 0.15); } }
  else if (id === 'tisch') { box(1.2, 0.06, 0.7, M.wood, 0, 0.74, 0); for (const [x, z] of [[-0.54, -0.29], [0.54, -0.29], [-0.54, 0.29], [0.54, 0.29]]) box(0.06, 0.72, 0.06, M.dark, x, 0.36, z); }
  else if (id === 'bank') { box(1.6, 0.06, 0.42, M.wood, 0, 0.45, 0); box(1.6, 0.4, 0.05, M.wood, 0, 0.72, -0.2, -0.15); for (const x of [-0.7, 0.7]) box(0.06, 0.44, 0.4, M.dark, x, 0.22, 0); }
  else if (id === 'bett') { box(1, 0.3, 2, M.wood, 0, 0.15, 0); box(0.95, 0.18, 1.9, M.white, 0, 0.39, 0); box(0.6, 0.1, 0.3, M.white, 0, 0.53, -0.75); box(0.97, 0.06, 1.1, M.green, 0, 0.5, 0.35); box(1, 0.7, 0.08, M.wood, 0, 0.35, -1); }
  else if (id === 'sofa') { box(1.8, 0.4, 0.8, M.red, 0, 0.2, 0); box(1.8, 0.5, 0.18, M.red, 0, 0.65, -0.31); for (const x of [-0.81, 0.81]) box(0.18, 0.3, 0.8, M.red, x, 0.55, 0); for (const x of [-0.42, 0.42]) box(0.78, 0.1, 0.6, M.fabric, x, 0.45, 0.05); }
  else if (id === 'feuer') {
    for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2; ball(0.11, M.stone, Math.cos(a) * 0.36, 0.06, Math.sin(a) * 0.36, 1, 0.7, 1); }
    for (let k = 0; k < 3; k++) cyl(0.05, 0.05, 0.7, M.dark, 0, 0.1, 0, 6, Math.PI / 2 - 0.25, k / 3 * Math.PI, 0);
    for (const [x, z, s] of [[0, 0, 1], [0.08, 0.05, 0.7], [-0.07, -0.05, 0.75]]) { const f = add(new THREE.ConeGeometry(0.14 * s, 0.5 * s, 8), M.flame, x, 0.3 * s + 0.08, z); f.castShadow = false; flames.push(f); }
  }
  else if (id === 'laterne') { cyl(0.04, 0.05, 2.2, M.dark, 0, 1.1, 0); box(0.26, 0.34, 0.26, M.lamp, 0, 2.3, 0); add(new THREE.ConeGeometry(0.22, 0.2, 4), M.dark, 0, 2.57, 0, 0, Math.PI / 4); }
  else if (id === 'palme') { cyl(0.11, 0.17, 4, M.wood, 0, 2, 0, 8); for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2, l = box(0.28, 0.03, 1.7, M.leaf, Math.sin(a) * 0.7, 3.85, Math.cos(a) * 0.7, 0.45, a, 0); l.rotation.order = 'YXZ'; l.rotation.set(0.45, a, 0); } }
  else if (id === 'baum') { cyl(0.12, 0.17, 1.9, M.dark, 0, 0.95, 0, 8); ball(1.1, M.leaf, 0, 2.5, 0); ball(0.75, M.leaf, 0.55, 2.2, 0.3); ball(0.7, M.leaf, -0.5, 2.3, -0.3); }
  else if (id === 'pflanze') { cyl(0.2, 0.15, 0.35, M.pot, 0, 0.17, 0, 12); ball(0.32, M.leaf, 0, 0.58, 0, 1, 1.1, 1); }
  else if (id === 'zelt') { const c = add(new THREE.ConeGeometry(1.5, 1.9, 4), M.fabric, 0, 0.95, 0, 0, Math.PI / 4); c.material = M.fabric; box(0.6, 0.9, 0.02, M.dark, 0, 0.45, 1.07); }
  else if (id === 'brunnen') { const r = add(new THREE.CylinderGeometry(0.9, 0.95, 0.6, 18, 1, true), M.stone, 0, 0.3, 0); r.material.side = THREE.DoubleSide; add(new THREE.CircleGeometry(0.88, 18), M.water, 0, 0.45, 0, -Math.PI / 2); cyl(0.95, 0.95, 0.06, M.stone, 0, 0.62, 0, 18); }
  else if (id === 'kiste') box(0.6, 0.6, 0.6, M.wood, 0, 0.3, 0);
  else if (id === 'kamel') {
    box(0.6, 0.55, 1.5, M.sandy, 0, 1.25, 0); ball(0.32, M.sandy, 0, 1.6, 0.05, 1, 0.9, 1.2);
    cyl(0.12, 0.14, 0.75, M.sandy, 0, 1.55, 0.85, 8, 0.6); box(0.2, 0.22, 0.42, M.sandy, 0, 1.9, 1.12);
    for (const [x, z] of [[-0.2, -0.55], [0.2, -0.55], [-0.2, 0.55], [0.2, 0.55]]) cyl(0.06, 0.05, 1, M.sandy, x, 0.5, z, 6);
  }
  g.userData.flames = flames;
  return g;
}

export function create(ctx, { from } = {}) {
  const { engine, sky, ui, input } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  sky.state.shadowSize = 50;
  ui.el.day.textContent = T.day; ui.el.title.textContent = T.title;

  // ---------- Gelände: weite flache Wüste (r < 300 m), dahinter Hänge und Berge – überall bebaubar ----------
  const SIZE = 2600, SEG = 300, hBase = heightFn({ r0: 300, r1: 950, amp: 190 });
  buildTerrain(world, hBase, SIZE, SEG);
  const cellT = SIZE / SEG;
  // Höhe genau so, wie das Geländenetz sie zeigt (Dreiecke des Rasters)
  const terrainH = (x, z) => {
    const fx = (x + SIZE / 2) / cellT, fz = (z + SIZE / 2) / cellT, i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= SEG || j >= SEG) return hBase(x, z);
    const u = fx - i, w = fz - j, x0 = -SIZE / 2 + i * cellT, z0 = -SIZE / 2 + j * cellT;
    const ha = hBase(x0, z0), hb = hBase(x0, z0 + cellT), hd = hBase(x0 + cellT, z0);
    if (u + w <= 1) return ha + (hd - ha) * u + (hb - ha) * w;
    const hc = hBase(x0 + cellT, z0 + cellT); return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - w);
  };
  // feines Raster auf der flachen Wüste (zeigt, wo Steine hinkommen)
  { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#c9a676'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(150,115,70,.25)' : 'rgba(235,210,165,.25)'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    g.strokeStyle = 'rgba(110,80,45,.28)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(580, 580); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const f = new THREE.Mesh(new THREE.CircleGeometry(290, 64).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    f.position.y = 0.01; f.receiveShadow = true; world.add(f); }

  // ---------- Baustoffe (InstancedMesh je Baustoff, wächst bei Bedarf) ----------
  const geo = new THREE.BoxGeometry(S, S, S);
  const mats = MATERIALS.map((m) => { const t = texture(m.id); const glass = m.id === 'glass'; return { ...m, url: t.url, mat: new THREE.MeshStandardMaterial({ map: t.tex, roughness: ROUGH[m.id] ?? 0.9, transparent: glass, opacity: glass ? 0.45 : 1, depthWrite: !glass }) }; });
  const meshes = mats.map((m) => { const im = new THREE.InstancedMesh(geo, m.mat, 2000); im.count = 0; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; world.add(im); return im; });
  const blocks = new Map(); // Schlüssel → Baustoff
  const dm = new THREE.Object3D(), col = new THREE.Color();
  const dirty = new Set();
  function rebuild() {
    if (!dirty.size) return;
    const list = new Map([...dirty].map((m) => [m, []]));
    for (const [k, m] of blocks) list.get(m)?.push(k);
    for (const [m, keys] of list) {
      let im = meshes[m];
      if (keys.length > im.instanceMatrix.count) { // mehr Platz: neues InstancedMesh mit doppelter Größe
        const n = new THREE.InstancedMesh(geo, mats[m].mat, Math.max(keys.length * 2, im.instanceMatrix.count * 2)); n.castShadow = n.receiveShadow = true; n.frustumCulled = false;
        world.remove(im); im.dispose(); world.add(n); meshes[m] = im = n;
      }
      keys.forEach((k, i) => {
        const [gx, gy, gz] = unkey(k);
        dm.position.set((gx + 0.5) * S, (gy + 0.5) * S, (gz + 0.5) * S); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
        im.setColorAt(i, col.setScalar(0.9 + ((k * 2654435761) >>> 0) % 1000 / 1000 * 0.18)); // leichte Farbunterschiede
      });
      im.count = keys.length; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
    dirty.clear();
  }
  // ---------- Gegenstände ----------
  const propsG = new THREE.Group(); world.add(propsG);
  const props = new Map(); // Schlüssel → { t, r, obj }
  const ITEM = Object.fromEntries(ITEMS.map((it) => [it.id, it]));
  function putProp(k, t, r) {
    const old = props.get(k); if (old) { propsG.remove(old.obj); props.delete(k); }
    if (!t || !ITEM[t]) return;
    const o = buildItem(t), [gx, gy, gz] = unkey(k);
    o.position.set((gx + 0.5) * S, gy * S, (gz + 0.5) * S); o.rotation.y = (r || 0) * Math.PI / 2; o.userData.pk = k;
    propsG.add(o); props.set(k, { t, r: r || 0, obj: o });
  }

  // ---------- Speichern (Version 3) ----------
  const store = () => (ctx.multi?.room ? 'hp-bauhof-raum-' + ctx.multi.room : 'hp-bauhof');
  let storeKey = store(), saveT = 0;
  const encode = () => [...blocks].map(([k, m]) => k.toString(36) + '.' + m).join(',');
  const encodeP = () => [...props].map(([k, p]) => k.toString(36) + '.' + p.t + '.' + p.r).join(',');
  // alte Speicherstände: v2 = Raster 240×240 (Mitte bei Zelle 120), v1 = 48×48 (Mitte bei Zelle 24), Boden bei y = 0
  const fromOld = (kk, v) => { const n = v === 1 ? 48 : 240; const ix = kk % n, iz = Math.floor(kk / n) % n, iy = Math.floor(kk / (n * n)); return key(ix - n / 2, iy, iz - n / 2); };
  function merge(bStr, pStr, v = 3, replace = false) {
    if (replace) { blocks.clear(); for (const k of [...props.keys()]) putProp(k, null); mats.forEach((_, i) => dirty.add(i)); }
    let added = 0;
    for (const s2 of (bStr || '').split(',')) {
      if (!s2) continue; const [a, b] = s2.split('.'); let kk = parseInt(a, 36); const m = +b;
      if (!Number.isFinite(kk) || !mats[m]) continue; if (v < 3) kk = fromOld(kk, v);
      if (!blocks.has(kk) && blocks.size < MAX) { blocks.set(kk, m); dirty.add(m); added++; }
    }
    for (const s2 of (pStr || '').split(',')) { if (!s2) continue; const [a, t, r] = s2.split('.'); const kk = parseInt(a, 36); if (Number.isFinite(kk) && ITEM[t] && !props.has(kk) && props.size < MAXP) { putProp(kk, t, +r); added++; } }
    rebuild(); return added;
  }
  const readSave = (k) => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && [1, 2, 3].includes(o.v) ? o : { v: 3, b: '', p: '' }; } catch { return { v: 3, b: '', p: '' }; } };
  const loadSave = (k) => { const o = readSave(k); merge(o.b, o.p, o.v, true); };
  const save = () => { try { localStorage.setItem(storeKey, JSON.stringify({ v: 3, b: encode(), p: encodeP() })); } catch { /* voll/privat */ } };
  loadSave(storeKey);

  const multi = ctx.multi;
  function setBlock(k, m, { send = true } = {}) {
    const old = blocks.get(k);
    if (m < 0) { if (old == null) return false; blocks.delete(k); dirty.add(old); }
    else { if (old === m) return false; if (old == null && blocks.size >= MAX) { ui.toast(T.full, 2000); return false; } blocks.set(k, m); dirty.add(m); if (old != null) dirty.add(old); }
    rebuild(); saveT = 1;
    if (send) multi?.send?.('b', { k, m });
    return true;
  }
  function setProp(k, t, r = 0, { send = true } = {}) {
    if (t && props.size >= MAXP && !props.has(k)) { ui.toast(T.full, 2000); return false; }
    if (!t && !props.has(k)) return false;
    putProp(k, t, r); saveT = 1;
    if (send) multi?.send?.('p', { k, t: t || '', r });
    return true;
  }

  // ---------- Umgebung am Eingang ----------
  const W = ENTRY;
  palms(world, [[W - 18, 0, -26, 1, 0.9], [W - 20, 0, 22, 2, 0.8], [W + 24, 0, 30, 3, 0.85], [W + 28, 0, -32, 1, 0.8], [W - 30, 0, 4, 2, 0.75]]);
  const coach = bus(world, W - 12, 2, 0);
  sign(world, W - 5, -7, Math.PI / 2, T.sign, { w: 3.2, h: 1.1, y: 2.6 });
  const hut = new THREE.Group(); hut.position.set(W - 6, 0, -16); world.add(hut);
  { const b = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 3), mats[1].mat); b.position.y = 1.3; b.castShadow = b.receiveShadow = true; hut.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 3.6), mats[4].mat); roof.position.y = 2.7; roof.castShadow = true; hut.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), mats[4].mat); door.position.set(1.51, 0.95, 0); door.rotation.y = Math.PI / 2; hut.add(door); }
  const board = new THREE.Group(); board.position.set(W - 3.6, 0, -13.2); board.rotation.y = Math.PI / 2; world.add(board);
  { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), mats[4].mat); post.position.y = 0.7; board.add(post);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.8 })); pl.position.y = 1.6; board.add(pl); }
  const piles = mats.map((m, i) => {
    const g = new THREE.InstancedMesh(geo, m.mat, 8); const x = W - 2.2, z = 4 + i * 2.5;
    for (let j = 0; j < 8; j++) { dm.position.set(x + ((j & 1) - 0.5) * S, ((j >> 2) + 0.5) * S, z + (((j >> 1) & 1) - 0.5) * S); dm.updateMatrix(); g.setMatrixAt(j, dm.matrix); }
    g.castShadow = true; world.add(g); return { g, x, z };
  });

  // ---------- Figur: gehen, auf Steine steigen, springen, fliegen ----------
  const filled = (gx, gy, gz) => blocks.has(key(gx, gy, gz));
  const STEP = S + 0.06, BODY = 1.7, GRAV = 24, JUMP = 7.6, FLY = 7;
  const st = { y: 0, vy: 0, fly: false, done: false, dt: 0.016 };
  // höchste Oberfläche unter der Figur (Steine bis eine Stufe über den Füßen, sonst Gelände)
  const surfaceAt = (x, z, yRef) => {
    const gx = cell(x), gz = cell(z), th = terrainH(x, z), lo = Math.floor(th / S) - 1;
    for (let gy = Math.floor((yRef + STEP) / S) - 1, n = 0; gy >= lo && n < 600; gy--, n++) if (filled(gx, gy, gz)) return Math.max(th, (gy + 1) * S);
    return th;
  };
  // wird von der Figur einmal pro Bild für die Füße gerufen (Physik), danach nur für Kamera/Leuchtwinkel (Gelände)
  function ground(x, z) {
    if (st.done || !player || x !== player.pos.x || z !== player.pos.z) return terrainH(x, z);
    st.done = true; const dt = st.dt, s = surfaceAt(x, z, st.y);
    if (st.fly) { st.y = Math.max(s, Math.min(520, st.y + (ctl.up - ctl.down) * FLY * dt)); return st.y; }
    if (st.vy !== 0 || st.y > s + 0.05) { // in der Luft: Schwerkraft
      st.vy -= GRAV * dt; st.y += st.vy * dt;
      if (st.y <= s) { st.y = s; st.vy = 0; }
      else if (st.vy === 0 && st.y - s < 0.35) st.y = s; // kleine Stufe hinunter
      return st.y;
    }
    st.y = s; return s;
  }
  let player = null;
  const wall = { type: 'fn', fn(p, r) {
    const y0 = st.y, c0 = cell(p.x), r0 = cell(p.z);
    const lo = Math.floor((y0 + STEP) / S), hi = Math.floor((y0 + BODY) / S);
    for (let gx = c0 - 1; gx <= c0 + 1; gx++) for (let gz = r0 - 1; gz <= r0 + 1; gz++) {
      let solid = false; for (let gy = lo; gy <= hi && !solid; gy++) solid = filled(gx, gy, gz);
      if (!solid) continue;
      const cx = (gx + 0.5) * S, cz = (gz + 0.5) * S, hw = S / 2 + r, lx = p.x - cx, lz = p.z - cz;
      if (Math.abs(lx) < hw && Math.abs(lz) < hw) { if (hw - Math.abs(lx) < hw - Math.abs(lz)) p.x = cx + Math.sign(lx || 1) * hw; else p.z = cz + Math.sign(lz || 1) * hw; }
    }
  } };
  const colliders = [
    { type: 'rect', x0: -LIM * S, x1: LIM * S, z0: -LIM * S, z1: LIM * S },
    coach.collider, { type: 'box', x: W - 6, z: -16, hw: 1.5, hd: 1.5 },
    ...piles.map((p) => ({ type: 'box', x: p.x, z: p.z, hw: 0.55, hd: 0.55 })),
    wall,
  ];
  player = createPlayer(ctx, { x: W + 4, z: -2, heading: Math.PI / 2, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0xf6f4ee, speed: 3, fastSpeed: 6, colliders, ground, surface: 'sand' });
  const life = createLife(ctx, { kind: 'desert' });

  // ---------- Werkzeug: Baukasten, Bauen/Abbauen, Springen, Fliegen ----------
  let mode = 'build', cur = { kind: 'block', i: 0 };
  const ctl = { up: 0, down: 0 };
  const bar = document.createElement('div'); bar.id = 'buildbar';
  bar.innerHTML = '<button type="button" class="mat"><i></i><span></span></button><button type="button" class="mode"></button>'
    + '<div class="bb-move"><button type="button" class="fly" aria-label="Fliegen">🕊️<small>' + T.fly + '</small></button>'
    + '<button type="button" class="down" aria-label="Runter">▼</button><button type="button" class="jump" aria-label="Springen">⤒<small>' + T.jump + '</small></button></div>';
  document.body.appendChild(bar);
  const matBtn = bar.querySelector('.mat'), modeBtn = bar.querySelector('.mode'), flyBtn = bar.querySelector('.fly'), jumpBtn = bar.querySelector('.jump'), downBtn = bar.querySelector('.down');
  const inv = document.createElement('div'); inv.id = 'invPop'; inv.hidden = true;
  inv.innerHTML = `<div class="inv-card"><div class="inv-head"><b>${T.boxTitle}</b><button type="button" class="inv-x" aria-label="Schließen">✕</button></div>
    <h4>${T.blocks}</h4><div class="inv-grid">${mats.map((m, i) => `<button type="button" data-b="${i}"><i style="background-image:url(${m.url})"></i><span>${m.name}</span></button>`).join('')}</div>
    <h4>${T.items}</h4><div class="inv-grid">${ITEMS.map((it) => `<button type="button" data-it="${it.id}"><i class="emo">${it.icon}</i><span>${it.name}</span></button>`).join('')}</div></div>`;
  document.body.appendChild(inv);
  const curName = () => (cur.kind === 'block' ? mats[cur.i].name : ITEM[cur.id].name);
  const render = () => {
    const i = matBtn.querySelector('i');
    if (cur.kind === 'block') { i.style.backgroundImage = `url(${mats[cur.i].url})`; i.textContent = ''; i.className = ''; }
    else { i.style.backgroundImage = ''; i.textContent = ITEM[cur.id].icon; i.className = 'emo'; }
    matBtn.querySelector('span').textContent = curName();
    modeBtn.textContent = mode === 'build' ? T.remove : T.build;
    bar.classList.toggle('removing', mode === 'remove'); bar.classList.toggle('flying', st.fly);
    jumpBtn.innerHTML = st.fly ? '▲<small>hoch</small>' : '⤒<small>' + T.jump + '</small>';
  };
  const pick = (c) => { cur = c; mode = 'build'; render(); ui.toast(T.taken(curName()), 1200); };
  matBtn.addEventListener('click', () => { inv.hidden = false; });
  inv.addEventListener('click', (e) => {
    if (e.target === inv || e.target.closest('.inv-x')) { inv.hidden = true; return; }
    const b = e.target.closest('[data-b]'), it = e.target.closest('[data-it]');
    if (b) pick({ kind: 'block', i: +b.dataset.b }); if (it) pick({ kind: 'item', id: it.dataset.it });
    if (b || it) inv.hidden = true;
  });
  modeBtn.addEventListener('click', () => { mode = mode === 'build' ? 'remove' : 'build'; render(); });
  const jump = () => { if (st.fly) return; if (st.vy === 0 && st.y <= surfaceAt(player.pos.x, player.pos.z, st.y) + 0.06) st.vy = JUMP; };
  const toggleFly = () => { st.fly = !st.fly; st.vy = 0; player.speedMul = st.fly ? 2.2 : 1; render(); ui.toast(st.fly ? T.flyOn : T.flyOff, 1800); };
  flyBtn.addEventListener('click', toggleFly);
  const hold = (btn, k) => {
    btn.addEventListener('pointerdown', (e) => { e.preventDefault(); if (k === 'up' && !st.fly) { jump(); return; } ctl[k] = 1; btn.classList.add('on'); try { btn.setPointerCapture(e.pointerId); } catch { /* egal */ } });
    for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) btn.addEventListener(ev, () => { ctl[k] = 0; btn.classList.remove('on'); });
  };
  hold(jumpBtn, 'up'); hold(downBtn, 'down');
  const onKey = (e) => {
    if (e.target?.tagName === 'INPUT') return;
    const n = +e.key; if (n >= 1 && n <= Math.min(9, mats.length)) pick({ kind: 'block', i: n - 1 });
    if (e.code === 'KeyR') { mode = mode === 'build' ? 'remove' : 'build'; render(); }
    if (e.code === 'KeyV') toggleFly();
    if (e.code === 'KeyI') inv.hidden = !inv.hidden;
    if (e.code === 'Space') { e.preventDefault(); if (st.fly) ctl.up = 1; else jump(); }
    if (e.code === 'KeyC') ctl.down = 1;
  };
  const onKeyUp = (e) => { if (e.code === 'Space') ctl.up = 0; if (e.code === 'KeyC') ctl.down = 0; };
  window.addEventListener('keydown', onKey); window.addEventListener('keyup', onKeyUp);
  render();

  // Zielrahmen
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S * 1.02, S * 1.02, S * 1.02)), new THREE.LineBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.9, depthTest: false }));
  ghost.renderOrder = 5; ghost.visible = false; world.add(ghost);
  let ghostT = 0;

  // Strahl durch das Raster: erster Stein oder das Gelände (auch an Hängen). { hit: Schlüssel|null, place: Schlüssel|null }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function setRay(cx, cy) { ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1); ray.setFromCamera(ndc, engine.camera); }
  function aim(cx, cy) {
    setRay(cx, cy);
    const o = ray.ray.origin, d = ray.ray.direction;
    const p = [o.x / S, o.y / S, o.z / S], dd = [d.x, d.y, d.z];
    const c = p.map(Math.floor), step = dd.map((v) => (v > 0 ? 1 : -1)), tD = dd.map((v) => Math.abs(1 / (v || 1e-9)));
    const tM = dd.map((v, a) => (v > 0 ? (c[a] + 1 - p[a]) : (p[a] - c[a])) * tD[a]);
    let prev = null, t = 0;
    for (let i = 0; i < 260; i++) {
      const k = key(c[0], c[1], c[2]);
      if (blocks.has(k)) return { hit: k, place: prev };
      // Gelände getroffen? (Punkt des Strahls unter der Geländeoberfläche)
      const wx = (p[0] + dd[0] * t) * S, wy = (p[1] + dd[1] * t) * S, wz = (p[2] + dd[2] * t) * S, th = terrainH(wx, wz);
      if (wy < th) { const gy = Math.round(th / S); return { hit: null, place: key(cell(wx), blocks.has(key(cell(wx), gy, cell(wz))) ? gy + 1 : gy, cell(wz)), ground: true }; }
      prev = k;
      const a = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : (tM[1] < tM[2] ? 1 : 2);
      t = tM[a]; c[a] += step[a]; tM[a] += tD[a];
      if (Math.abs(c[0]) > LIM || Math.abs(c[2]) > LIM || c[1] < -YOFF + 1 || c[1] > 1100) return null;
    }
    return null;
  }
  const center = (k) => { const [gx, gy, gz] = unkey(k); return new THREE.Vector3((gx + 0.5) * S, (gy + 0.5) * S, (gz + 0.5) * S); };
  const reach = (k) => { const c = center(k); return Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 20 && Math.abs(c.y - player.pos.y) < 14; };
  const blocksMe = (k) => { const c = center(k); return Math.abs(c.x - player.pos.x) < S / 2 + 0.3 && Math.abs(c.z - player.pos.z) < S / 2 + 0.3 && c.y + S / 2 > player.pos.y + 0.02 && c.y - S / 2 < player.pos.y + BODY; };
  const propHit = (cx, cy) => { setRay(cx, cy); const h = ray.intersectObject(propsG, true)[0]; if (!h || h.distance > 30) return null; let o = h.object; while (o && o.userData.pk == null) o = o.parent; return o ? o.userData.pk : null; };
  function target(cx, cy) {
    if (mode === 'remove') { const pk = propHit(cx, cy); if (pk != null) return { k: pk, prop: true }; }
    const a = aim(cx, cy); if (!a) return null;
    const k = mode === 'build' ? a.place : a.hit;
    return k == null ? null : { k };
  }
  const faceRot = (k) => { const c = center(k), a = Math.atan2(player.pos.x - c.x, player.pos.z - c.z); return ((Math.round(a / (Math.PI / 2)) % 4) + 4) % 4; }; // Gegenstand schaut zur Figur
  input.onTap = (cx, cy) => {
    if (!inv.hidden) return;
    const tg = target(cx, cy); if (!tg) return;
    const k = tg.k;
    if (!reach(k)) { ui.toast(T.far, 1400); return; }
    if (mode === 'build') {
      if (cur.kind === 'block') { if (blocksMe(k) || props.has(k)) return; if (setBlock(k, cur.i)) sfx.step?.('stone', 1); }
      else if (!blocks.has(k) && setProp(k, cur.id, faceRot(k))) sfx.step?.('stone', 1);
    } else if (tg.prop ? setProp(k, null) : setBlock(k, -1)) sfx.step?.('sand', 1);
    ghost.position.copy(center(k)); ghost.visible = true; ghostT = 0.6;
  };
  const canvas = engine.renderer.domElement;
  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const tg = target(e.clientX, e.clientY);
    if (tg && reach(tg.k)) { ghost.position.copy(center(tg.k)); ghost.visible = true; ghostT = 1e9; ghost.material.color.set(mode === 'build' ? 0xffd36a : 0xff7a5a); }
    else if (ghostT > 1e8) ghost.visible = false;
  };
  canvas.addEventListener('pointermove', onMove);

  // ---------- Leuchtende Dinge ----------
  const interact = createInteract(ctx, player);
  piles.forEach((p, i) => interact.add({ obj: p.g, color: 'gold', x: p.x + 1.1, z: p.z, radius: 5, near: 1.6, label: '🧱 ' + T.take(mats[i].name), key: 'pile' + i, run() { pick({ kind: 'block', i }); } }));
  interact.add({ obj: coach.group, color: 'blue', radius: 10, near: 2.4, push: 0.04, x: W - 8.3, z: 0, closest: boxClosest(coach.group, 1.6, 6.2), label: T.back(from === 'medina'), key: 'bus', run() { sfx.bus?.(); ctx.city?.('bauhof', from === 'medina' ? 'medina' : 'mecca'); } });
  interact.add({ obj: board, color: 'gold', radius: 5, near: 2, label: '📜 Tafel lesen', key: 'board', run() { ui.info(`<p>${T.fact}</p>`); ui.el.panel.classList.remove('collapsed'); } });
  ctx.interact = interact;
  ctx.debug = { aim, blocks, props, target, reach, setBlock, setProp, key, st, terrainH, merge };

  // ---------- Zusammen bauen: alle im Bauhof (öffentlich oder im privaten Raum) ----------
  const offs = [];
  const sendBuild = (to) => { // ganzen Bau in Stücken schicken (jeweils 1500 Steine)
    const b = [...blocks], p = encodeP(); let part = 0;
    for (let i = 0; i < Math.max(1, b.length); i += 1500) {
      const chunk = b.slice(i, i + 1500).map(([k, m]) => k.toString(36) + '.' + m).join(','), pp = i === 0 ? p : '';
      setTimeout(() => multi?.send?.('bs', { to, b: chunk, p: pp }), 150 * part++);
    }
  };
  if (multi?.on) {
    offs.push(multi.on('b', (d) => { if (typeof d?.k === 'number' && (d.m === -1 || mats[d.m])) setBlock(d.k, d.m, { send: false }); }));
    offs.push(multi.on('p', (d) => { if (typeof d?.k === 'number' && (!d.t || ITEM[d.t])) setProp(d.k, d.t || null, d.r || 0, { send: false }); }));
    offs.push(multi.on('bq', (d, fromP) => { if (blocks.size || props.size) sendBuild(fromP.id); }));
    offs.push(multi.on('bs', (d) => { if (d?.to !== multi.myId && d?.to !== '*') return; if (merge(d.b, d.p)) { saveT = 1; ui.toast(T.synced, 1600); } }));
  }
  let announced = false, room = multi?.room || '', othersN = 0, flameT = 0;

  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${T.intro}</p><p class="tr">${mobile ? '' : T.keys}</p>`);
  ui.actions([{ label: T.backShort(from === 'medina'), onClick: () => ctx.city?.('bauhof', from === 'medina' ? 'medina' : 'mecca') }]);

  return {
    update(dt) {
      clock.advance(dt); sky.state.artificial = 0.6; sky.setHour(clock.hour); // Tag und Nacht nach der Spieluhr
      st.dt = dt; st.done = false;
      player.update(dt);
      life.update(dt); interact.update(dt);
      if (ghostT < 1e8) { ghostT -= dt; if (ghostT <= 0) ghost.visible = false; }
      if (saveT > 0) { saveT -= dt; if (saveT <= 0) save(); }
      // Lagerfeuer flackern, Laternen leuchten nachts
      flameT += dt; const night = clock.night, M = itemMats();
      M.lamp.emissiveIntensity = 0.3 + night * 2.5; M.flame.emissiveIntensity = 1.6 + night * 1.6;
      for (const p of props.values()) for (const f of p.obj.userData.flames) f.scale.y = 0.85 + 0.25 * Math.sin(flameT * 12 + f.position.x * 40);
      // privater Raum gewechselt → anderen Speicherstand laden
      const r = multi?.room || '';
      if (r !== room) { save(); room = r; storeKey = store(); loadSave(storeKey); announced = false; }
      // Mitspieler im Bauhof: Bau anfragen und den eigenen schicken (wird bei allen zusammengeführt)
      const others = multi?.status ? multi.status().others.filter((o) => o.s === 'bauhof') : [];
      if (others.length !== othersN) { if (others.length > othersN && others.length) ui.toast(T.shared(others.length), 2200); othersN = others.length; }
      if (others.length && !announced && multi?.send?.('bq', {})) { announced = true; if (blocks.size || props.size) sendBuild('*'); }
      if (!others.length) announced = false;
    },
    dispose() {
      save(); interact.dispose(); offs.forEach((f) => f());
      input.onTap = null; window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKeyUp); canvas.removeEventListener('pointermove', onMove);
      bar.remove(); inv.remove(); ui.prompt(null); player.speedMul = 1;
      mats.forEach((m) => { m.mat.map.dispose(); });
    },
  };
}
