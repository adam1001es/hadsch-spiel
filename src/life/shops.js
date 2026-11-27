import * as THREE from 'three';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';
import { makeVehicle } from './vehicles.js';
import { SHOPS as T } from '../content/life.js';

// Betretbare Läden und Aussichtsplattform (Lebensspiel, Mekka/Medina).
// Die Innenräume stehen weit draußen in derselben Welt (x ≥ ROOM_X, außerhalb des Geländes); „Eintreten“ setzt die Figur hinein,
// „Hinausgehen“ wieder vor die Ladentür. Ein einziges Licht wandert mit in den Raum, in dem man gerade ist (schont schwache Geräte).
// Kein Geld im Spiel: anprobieren, Probefahrt, Reise buchen, Döner bestellen … alles zum Ausprobieren.
export const ROOM_X = 2900;
const W = 14, D = 16, H = 4.6; // Raumgröße (Tür an der Seite +z)

const canvasTex = (w, h, draw, rep = [1, 1]) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...rep); t.anisotropy = 4; return t;
};
// Böden/Wände
const floorTex = (a, b) => canvasTex(128, 128, (g) => { g.fillStyle = a; g.fillRect(0, 0, 128, 128); g.fillStyle = b; g.fillRect(0, 0, 64, 64); g.fillRect(64, 64, 64, 64); g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; g.strokeRect(0, 0, 64, 64); g.strokeRect(64, 64, 64, 64); }, [W / 2, D / 2]);
const wallTex = (top, low) => canvasTex(64, 256, (g, w, h) => { g.fillStyle = top; g.fillRect(0, 0, w, h); g.fillStyle = low; g.fillRect(0, h * 0.72, w, h * 0.28); g.fillStyle = 'rgba(201,164,90,.9)'; g.fillRect(0, h * 0.71, w, 4); }, [6, 1]);

// Poster (Reisebüro): einfache gemalte Landschaften, keine Fotos
function poster(kind, title) {
  return canvasTex(512, 640, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.6);
    const pal = { medina: ['#f6d79a', '#e9b872'], mecca: ['#fbe3b3', '#e6a86b'], sea: ['#7cc6ee', '#bfe6f7'], hills: ['#ffd2a8', '#f4a6a0'], rocks: ['#ffb27a', '#ffd9a8'] }[kind];
    sky.addColorStop(0, pal[0]); sky.addColorStop(1, pal[1]); g.fillStyle = sky; g.fillRect(0, 0, w, h);
    if (kind === 'medina') { g.fillStyle = '#efe7d6'; g.fillRect(60, 330, 392, 170); g.fillStyle = '#2f8a4e'; g.beginPath(); g.arc(256, 330, 70, Math.PI, 0); g.fill(); g.fillRect(250, 220, 12, 50); for (const x of [90, 422]) { g.fillStyle = '#f4efe3'; g.fillRect(x - 10, 180, 20, 320); g.beginPath(); g.moveTo(x - 14, 180); g.lineTo(x, 140); g.lineTo(x + 14, 180); g.fill(); } }
    else if (kind === 'mecca') { g.fillStyle = '#e8e2d4'; g.fillRect(40, 360, 432, 140); g.fillStyle = '#111'; g.fillRect(216, 380, 80, 80); g.fillStyle = '#c9a45a'; g.fillRect(216, 400, 80, 8); g.fillStyle = '#d9d2c2'; g.fillRect(330, 120, 60, 240); g.fillStyle = '#c9a45a'; g.beginPath(); g.arc(360, 170, 22, 0, 7); g.fill(); }
    else if (kind === 'sea') { g.fillStyle = '#1f78b4'; g.fillRect(0, 330, w, 170); g.fillStyle = '#f2dcb0'; g.fillRect(0, 470, w, 30); g.fillStyle = '#fff'; for (let i = 0; i < 6; i++) g.fillRect(40 + i * 80, 360 + (i % 2) * 40, 40, 4); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(400, 120, 50, 0, 7); g.fill(); g.fillStyle = '#e8443a'; g.beginPath(); g.ellipse(200, 400, 48, 14, 0, 0, 7); g.fill(); g.fillStyle = '#fff'; g.fillRect(188, 380, 22, 12); }
    else if (kind === 'hills') { g.fillStyle = '#7c9a5a'; g.beginPath(); g.moveTo(0, 420); g.quadraticCurveTo(140, 250, 280, 380); g.quadraticCurveTo(380, 280, 512, 400); g.lineTo(512, 500); g.lineTo(0, 500); g.fill(); g.fillStyle = '#e8578a'; for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(30 + (i * 53) % 460, 430 + (i * 37) % 60, 6, 0, 7); g.fill(); } }
    else { g.fillStyle = '#b8643a'; g.beginPath(); g.moveTo(40, 500); g.lineTo(80, 260); g.quadraticCurveTo(160, 200, 220, 280); g.lineTo(260, 500); g.fill(); g.beginPath(); g.moveTo(280, 500); g.lineTo(320, 300); g.quadraticCurveTo(400, 240, 460, 320); g.lineTo(480, 500); g.fill(); }
    g.fillStyle = 'rgba(20,37,31,.88)'; g.fillRect(0, h - 140, w, 140); g.fillStyle = '#f5efe0'; g.font = '600 52px Figtree, sans-serif'; g.textAlign = 'center'; g.fillText(title, w / 2, h - 60);
  });
}

export function createShops(ctx, { world, player, interact, fronts, onTestDrive, travel, prices = null }) {
  const { ui, engine } = ctx;
  const rooms = [];
  const light = new THREE.PointLight(0xfff1dc, 0, 30, 1.1); world.add(light);
  const std = (c, r = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: r, ...extra });
  const M = { wood: std(0x8a6240), dark: std(0x3a2c22), metal: std(0xc9ccd0, 0.3, { metalness: 0.8 }), gold: std(0xd4af37, 0.35, { metalness: 0.85 }), white: std(0xf2eee6, 0.6),
    glass: std(0xbcd8e6, 0.08, { transparent: true, opacity: 0.35 }), panel: new THREE.MeshStandardMaterial({ color: 0xfff6e0, emissive: 0xfff1d0, emissiveIntensity: 1.2 }) };
  const box = (g, w, h, d, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  const cyl = (g, a, b, h, m, x, y, z, seg = 16) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(a, b, h, seg), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; g.add(o); return o; };
  let inRoom = null, back = null, roof = null;

  // ---------- Raum bauen ----------
  function room(i, type) {
    const g = new THREE.Group(); g.position.set(ROOM_X + i * 40, 0, 0); world.add(g);
    const st = T.types[type], col = st.colors;
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: floorTex(col[0], col[1]), roughness: type === 'autos' ? 0.25 : 0.7, metalness: type === 'autos' ? 0.2 : 0 }));
    fl.receiveShadow = true; g.add(fl);
    const wm = new THREE.MeshStandardMaterial({ map: wallTex(col[2], col[3]), roughness: 0.9, emissive: 0xffffff, emissiveIntensity: 0.06 });
    for (const [w, x, z, ry] of [[W, 0, -D / 2, 0], [D, -W / 2, 0, Math.PI / 2], [D, W / 2, 0, -Math.PI / 2], [W, 0, D / 2, Math.PI]]) { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, H), wm); o.position.set(x, H / 2, z); o.rotation.y = ry; o.receiveShadow = true; g.add(o); }
    const ce = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(Math.PI / 2), std(0xf4f0e8, 0.9, { emissive: 0xffffff, emissiveIntensity: 0.08 })); ce.position.y = H; g.add(ce);
    for (let x = -4; x <= 4; x += 4) for (let z = -5; z <= 5; z += 5) box(g, 1.6, 0.04, 0.6, M.panel, x, H - 0.03, z);
    // Tür (innen) und Schild über der Tür
    box(g, 2.2, 2.6, 0.12, M.glass, 0, 1.3, D / 2 - 0.08); box(g, 2.5, 0.15, 0.2, M.gold, 0, 2.68, D / 2 - 0.1);
    const label = canvasTex(512, 96, (c, w, h) => { c.fillStyle = '#14251f'; c.fillRect(0, 0, w, h); c.fillStyle = '#e6c46e'; c.font = '600 46px Figtree, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(st.name, w / 2, h / 2); });
    const lb = new THREE.Mesh(new THREE.PlaneGeometry(4, 0.75), new THREE.MeshBasicMaterial({ map: label })); lb.position.set(0, H - 0.7, -D / 2 + 0.02); g.add(lb);
    const R = { i, type, g, x: g.position.x, z: 0, solids: [], spots: [], spin: [], figs: [] };
    const solid = (x, z, hw, hd) => R.solids.push({ x, z, hw, hd });
    const spot = (x, z, label, run, color = 'gold') => R.spots.push({ x, z, label, run, color });
    const counter = (x, z, w = 3) => { box(g, w, 1.05, 0.7, M.wood, x, 0.52, z); box(g, w + 0.1, 0.06, 0.8, std(0x2c3034, 0.3), x, 1.07, z); solid(x, z, w / 2 + 0.1, 0.45); };
    const seller = (x, z, ry) => { const f = createFigure(g, { color: 0x34506a, ring: false, models: peopleModels(), rigged: false }); f.root.position.set(x, 0, z); f.root.rotation.y = ry; R.figs.push(f); };

    if (type === 'kleidung') {
      // Kleiderstangen mit Thobes/Abayas, Spiegel, Puppen, Kasse
      const outfits = ctx.profile?.gender === 'f' ? T.outfitsF : T.outfitsM;
      outfits.forEach((o, k) => {
        const z = -5 + k * 2.4, side = k % 2 ? 1 : -1, x = side * (W / 2 - 1.2);
        box(g, 0.05, 1.7, 2, M.metal, x, 0.85, z); cyl(g, 0.025, 0.025, 2, M.metal, x, 1.7, z).rotation.x = Math.PI / 2;
        const cm = std(o.c, 0.9);
        for (let j = 0; j < 6; j++) box(g, 0.08, 1.15, 0.42, cm, x, 1.05, z - 0.8 + j * 0.32);
        solid(x, z, 0.35, 1.05);
        spot(x - side * 1.2, z, '👕 ' + T.wear(o.name), () => { player.fig.setColor(o.c); ui.toast(T.worn(o.name), 2200); });
      });
      box(g, 1.6, 2.4, 0.05, std(0xdfe8ee, 0.05, { metalness: 0.9 }), 0, 1.4, -D / 2 + 0.05); // Spiegel
      for (const [x, c, cov] of [[-1.5, 0xe9e4d8, false], [1.5, 0x1f1f24, true]]) { cyl(g, 0.5, 0.55, 0.2, M.white, x, 0.1, -3.5); const f = createFigure(g, { color: c, covered: cov, ring: false, models: peopleModels(), rigged: false }); f.root.position.set(x, 0.2, -3.5); R.figs.push(f); solid(x, -3.5, 0.5, 0.5); }
      counter(3, 4.5); seller(3, 3.7, Math.PI);
    } else if (type === 'autos') {
      // Autogalerie: drei Autos auf Drehtellern
      const cars = [['sport', -4, true], ['suv', 0, false], ['coupe', 4, false]];
      for (const [kind, x, lv] of cars) {
        cyl(g, 2.6, 2.7, 0.18, std(0x2a2e33, 0.3, { metalness: 0.5 }), x, 0.09, -2.5, 40);
        const v = makeVehicle(g, kind, lv ? { livery: true } : {}); v.root.position.set(x, 0.18, -2.5); R.spin.push(v.root);
        solid(x, -2.5, 2.4, 2.4);
        spot(x, 0.2, '🚗 ' + T.testDrive(v.name), () => { leave(); onTestDrive?.(kind, lv); });
        (R.cars ||= []).push({ kind, lv, x, name: v.name });
      }
      counter(-3.5, 5.2, 2.6); seller(-3.5, 4.4, Math.PI);
      const banner = canvasTex(1024, 160, (c, w, h) => { c.fillStyle = '#c9a45a'; c.fillRect(0, 0, w, h); c.fillStyle = '#14251f'; c.font = '700 70px Figtree, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(T.carBanner, w / 2, h / 2); });
      const bn = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshBasicMaterial({ map: banner })); bn.position.set(0, 2.9, -D / 2 + 0.03); g.add(bn);
    } else if (type === 'reise') {
      // Reisebüro: Schreibtisch, Globus, Poster mit Reisezielen
      counter(0, -4.5, 3.2); seller(0, -5.3, 0);
      const globeTex = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#3a7bbf'; c.fillRect(0, 0, w, h); c.fillStyle = '#8fbf6a'; for (const [x, y, r] of [[60, 40, 24], [90, 70, 18], [150, 50, 30], [200, 80, 16], [130, 95, 12]]) { c.beginPath(); c.ellipse(x, y, r, r * 0.7, 0.3, 0, 7); c.fill(); } }, [1, 1]);
      cyl(g, 0.05, 0.25, 0.8, M.wood, 3, 0.4, -4.5); const gl = new THREE.Mesh(new THREE.SphereGeometry(0.45, 24, 16), new THREE.MeshStandardMaterial({ map: globeTex, roughness: 0.5 })); gl.position.set(3, 1.25, -4.5); g.add(gl); R.spin.push(gl);
      T.trips.forEach((tr, k) => {
        const side = k < 2 ? -1 : 1, z = -2 + (k % 2) * 5, x = side * (W / 2 - 0.03);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), new THREE.MeshBasicMaterial({ map: poster(tr.img, tr.title) })); p.position.set(x, 1.9, z); p.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2; g.add(p);
        spot(x - side * 1.3, z, tr.icon + ' ' + tr.label, () => travel?.(tr.id), 'blue');
      });
      for (const x of [-1.5, 1.5]) { box(g, 0.5, 0.45, 0.5, M.dark, x, 0.23, -2.6); }
    } else if (type === 'doener') {
      // Döner/Shawarma-Imbiss: Theke, drehender Spieß vor dem Grill, Menütafel, Tische
      counter(0, -4, 6); seller(0, -5.2, 0);
      box(g, 1.4, 1.8, 0.2, new THREE.MeshStandardMaterial({ color: 0x5a1a0a, emissive: 0xff6a1a, emissiveIntensity: 1.1 }), -2, 1.8, -6.9); // Grill
      const spit = new THREE.Group(); spit.position.set(-2, 1.1, -6.3); g.add(spit); R.spin.push(spit);
      cyl(spit, 0.02, 0.02, 1.6, M.metal, 0, 0.8, 0, 6); for (let k = 0; k < 6; k++) cyl(spit, 0.32 - k * 0.025, 0.3 - k * 0.025, 0.2, std(0x8a4a22, 0.9), 0, 0.3 + k * 0.2, 0, 12);
      const menu = canvasTex(512, 320, (c, w, h) => { c.fillStyle = '#1e1e1e'; c.fillRect(0, 0, w, h); c.fillStyle = '#e6c46e'; c.font = '700 40px Figtree, sans-serif'; c.fillText('MENÜ · halal', 30, 56); c.fillStyle = '#f5efe0'; c.font = '500 32px Figtree, sans-serif'; T.menu.forEach((m, k) => c.fillText('• ' + m, 40, 112 + k * 46)); });
      const mb = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2), new THREE.MeshBasicMaterial({ map: menu })); mb.position.set(2, 2.6, -D / 2 + 0.03); g.add(mb);
      for (const [x, z] of [[-4, 1.5], [4, 1.5], [-4, 4.5], [4, 4.5]]) { cyl(g, 0.5, 0.5, 0.05, M.white, x, 0.75, z, 20); cyl(g, 0.05, 0.05, 0.75, M.metal, x, 0.37, z, 6); for (const dz of [-0.75, 0.75]) cyl(g, 0.2, 0.2, 0.45, M.wood, x, 0.23, z + dz, 10); solid(x, z, 0.5, 0.5); }
      spot(0, -2.9, '🥙 ' + T.order, () => ui.toast(T.orders[(Math.random() * T.orders.length) | 0], 2800), 'green');
    } else if (type === 'parfum') {
      // Parfüm & Oud: Regale mit bunten Flakons, Räuchergefäß
      const bottle = new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), bm = new THREE.MeshStandardMaterial({ roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85 });
      const im = new THREE.InstancedMesh(bottle, bm, 120), dm = new THREE.Object3D(), cc = new THREE.Color(); let n = 0;
      for (const side of [-1, 1]) for (let s2 = 0; s2 < 4; s2++) { box(g, 0.4, 0.04, 9, M.wood, side * (W / 2 - 0.3), 0.6 + s2 * 0.5, 0); for (let k = 0; k < 15; k++) { dm.position.set(side * (W / 2 - 0.3), 0.73 + s2 * 0.5, -4.2 + k * 0.6); dm.updateMatrix(); im.setMatrixAt(n, dm.matrix); im.setColorAt(n++, cc.setHSL((k * 0.13 + s2 * 0.3) % 1, 0.6, 0.55)); } solid(side * (W / 2 - 0.3), 0, 0.3, 4.6); }
      im.count = n; g.add(im);
      counter(0, -4.5, 3); seller(0, -5.3, 0); cyl(g, 0.18, 0.12, 0.3, M.gold, 1, 1.25, -4.5, 10);
      spot(0, -3.3, '🌸 ' + T.smell, () => ui.toast(T.smells[(Math.random() * T.smells.length) | 0], 2600), 'green');
    } else if (type === 'datteln') {
      // Datteln & Süßes: Kisten mit Dattelbergen
      const dg = new THREE.SphereGeometry(0.05, 6, 4).scale(1, 1.6, 1), dmat = std(0x5a2e14, 0.5);
      const im = new THREE.InstancedMesh(dg, dmat, 1200), dm = new THREE.Object3D(); let n = 0;
      for (const [x, z] of [[-4, -3], [-4, 0], [-4, 3], [4, -3], [4, 0], [4, 3], [0, 0.5]]) {
        box(g, 1.6, 0.6, 1.1, M.wood, x, 0.3, z); solid(x, z, 0.85, 0.6);
        for (let k = 0; k < 170 && n < 1200; k++) { const a = Math.random() * 6.28, r = Math.sqrt(Math.random()); dm.position.set(x + Math.cos(a) * r * 0.7, 0.62 + (1 - r) * 0.18, z + Math.sin(a) * r * 0.45); dm.rotation.set(Math.random(), Math.random(), Math.random()); dm.updateMatrix(); im.setMatrixAt(n++, dm.matrix); }
      }
      im.count = n; im.castShadow = true; g.add(im);
      counter(0, -5, 3); seller(0, -5.8, 0);
      spot(0, -2.2, '🌴 ' + T.taste, () => ui.toast(T.tastes[(Math.random() * T.tastes.length) | 0], 2600), 'green');
    } else if (type === 'buero') {
      // Büro im Hochhaus: Schreibtische mit Bildschirmen, Aktenschrank, Fenster mit Aussicht
      R.desks = [];
      for (const [x, z] of [[-4, -4], [0, -4], [4, -4], [-4, 1], [4, 1]]) {
        box(g, 2, 0.06, 1, std(0xe8e2d6, 0.5), x, 0.75, z); for (const dx of [-0.9, 0.9]) box(g, 0.05, 0.75, 0.9, M.metal, x + dx, 0.37, z);
        box(g, 0.9, 0.55, 0.05, std(0x111418, 0.3), x, 1.12, z - 0.3); box(g, 0.82, 0.46, 0.01, new THREE.MeshStandardMaterial({ color: 0x9fd0ff, emissive: 0x5aa8ff, emissiveIntensity: 0.6 }), x, 1.12, z - 0.27);
        box(g, 0.5, 0.5, 0.5, M.dark, x, 0.25, z + 0.8); box(g, 0.3, 0.06, 0.4, std(0xf6f2ea, 0.9), x + 0.6, 0.8, z + 0.1);
        solid(x, z, 1.05, 0.55); R.desks.push({ x, z: z + 1.3 });
      }
      for (let k = 0; k < 3; k++) box(g, 1, 2, 0.5, std(0x6a7078, 0.5, { metalness: 0.3 }), -6.3, 1, 4 - k * 1.1); solid(-6.3, 2.9, 0.5, 1.7);
      const win = canvasTex(512, 256, (c, w, h) => { const gr = c.getContext ? null : null; const sky = c.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#8cc4ec'); sky.addColorStop(1, '#f2dcae'); c.fillStyle = sky; c.fillRect(0, 0, w, h); c.fillStyle = '#d9cdb5'; for (let i = 0; i < 18; i++) c.fillRect(i * 30, h - 40 - (i * 37) % 90, 24, 200); c.fillStyle = '#2b2f34'; for (let i = 1; i < 4; i++) c.fillRect(i * w / 4 - 3, 0, 6, h); });
      const wn = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, 2.4), new THREE.MeshBasicMaterial({ map: win })); wn.position.set(0, 2.2, -D / 2 + 0.03); g.add(wn);
    } else { // buecher
      const bk = new THREE.BoxGeometry(0.06, 0.3, 0.22), im = new THREE.InstancedMesh(bk, std(0xffffff, 0.8), 600), dm = new THREE.Object3D(), cc = new THREE.Color(); let n = 0;
      for (const side of [-1, 1]) for (let s2 = 0; s2 < 5; s2++) { box(g, 0.35, 0.03, 10, M.wood, side * (W / 2 - 0.25), 0.4 + s2 * 0.45, 0); for (let k = 0; k < 55 && n < 600; k++) { dm.position.set(side * (W / 2 - 0.25), 0.57 + s2 * 0.45, -4.8 + k * 0.175); dm.updateMatrix(); im.setMatrixAt(n, dm.matrix); im.setColorAt(n++, cc.setHSL([0.33, 0.6, 0.08, 0.12][k % 4], 0.5, 0.3 + (k % 3) * 0.08)); } solid(side * (W / 2 - 0.25), 0, 0.3, 5.1); }
      im.count = n; g.add(im); counter(0, -4.5, 3); seller(0, -5.3, 0);
      spot(0, -3.3, '📚 ' + T.browse, () => ui.toast(T.browsed, 2400), 'green');
    }
    if (prices) applyPrices(R, type);
    // Ausgang
    spot(0, D / 2 - 1.2, '🚪 ' + T.exit, () => leave(), 'blue');
    // Leuchtpunkte (Interact) für alle Stellen im Raum
    for (const s of R.spots) interact.add({ objs: [], color: s.color, radius: 3, near: 1.5, x: R.x + s.x, z: s.z, key: 'shop-' + i + '-' + (s.key || s.label), label: s.label, run: s.run, when: () => inRoom === R });
    rooms.push(R); return R;
  }

  // Preise (Geldbörse): Spots mit Kaufen-Funktion umbauen. prices = { wallet, T: Texte }
  function applyPrices(R, type) {
    const { wallet, P } = prices;
    const buy = (cost, ok) => { if (!wallet.spend(cost)) { ui.toast(P.noMoney(cost, wallet.sar), 2600); return; } ok(); };
    for (const s of R.spots) {
      const run = s.run, lab = s.label; s.key = lab;
      if (type === 'kleidung') { const name = lab.replace(/^👕 /, '').replace(/^.*?: /, ''), id = 'outfit:' + name;
        s.label = () => (wallet.owns(id) ? lab : `👕 ${P.buy(name, P.outfit)}`); s.run = () => (wallet.owns(id) ? run() : buy(P.outfit, () => { wallet.own(id); run(); })); }
      else if (type === 'doener') s.run = () => buy(P.doener, run), s.label = `${lab} (${P.doener} SAR)`;
      else if (type === 'parfum') s.run = () => buy(P.parfum, run), s.label = `🌸 ${P.buyPlain(P.parfum)}`;
      else if (type === 'datteln') s.run = () => buy(P.datteln, run), s.label = `${lab} (${P.datteln} SAR)`;
      else if (type === 'buecher') s.run = () => buy(P.buch, () => ui.toast(P.bookBought, 2400)), s.label = `📚 ${P.buyPlain(P.buch)}`;
    }
    if (type === 'autos') for (const c of R.cars || []) {
      const id = 'car:' + c.kind;
      R.spots.push({ x: c.x, z: 1.6, key: 'buy-' + c.kind, color: 'green', label: () => (wallet.owns(id) ? `🔑 ${P.carOwned}` : `💰 ${P.buy(c.name, P.cars[c.kind])}`),
        run: () => { if (wallet.owns(id)) { leave(); onTestDrive?.(c.kind, c.lv); return; } buy(P.cars[c.kind], () => { wallet.own(id); ui.toast(P.carBought(c.name), 3500); }); } });
    }
  }

  // ---------- Ladentüren in der Stadt ----------
  const doorMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffd99a, emissiveIntensity: 0.6, roughness: 0.2 });
  fronts.forEach((f, i) => {
    const R = room(i, f.type);
    const nx = Math.sin(f.ry), nz = Math.cos(f.ry); // Blickrichtung aus dem Laden heraus
    const door = new THREE.Group(); door.position.set(f.x + nx * 0.06, 0, f.z + nz * 0.06); door.rotation.y = f.ry; world.add(door);
    box(door, 2.4, 2.8, 0.08, doorMat, 0, 1.4, 0); box(door, 2.7, 0.18, 0.2, M.gold, 0, 2.9, 0.05);
    // Schaufenster links und rechts, Markise
    for (const sx of [-3.2, 3.2]) box(door, 3, 2.2, 0.06, doorMat, sx, 1.5, 0);
    const aw = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.08, 1.6), std(T.types[f.type].awning, 0.9)); aw.position.set(0, 3.35, 0.8); aw.rotation.x = 0.22; aw.castShadow = true; door.add(aw);
    const out = { x: f.x + nx * 1.8, z: f.z + nz * 1.8, h: f.ry };
    R.door = out;
    interact.add({ obj: door, color: 'gold', radius: 7, near: 2.4, x: out.x, z: out.z, key: 'shopdoor-' + i, label: '🛍️ ' + T.enter(T.types[f.type].name), when: () => !inRoom && !roof, run: () => enter(R) });
  });

  function enter(R) {
    back = R.door; inRoom = R;
    player.teleport(R.x, D / 2 - 3, Math.PI); ctx.input.pitch = 0; player.fig.root.rotation.set(0, Math.PI, 0);
    light.position.set(R.x, H - 0.6, 0); light.intensity = 45;
    ui.el.panel.classList.add('collapsed'); ui.toast(T.welcome(T.types[R.type].name), 2000);
  }
  let lastDoor = null;
  function leave() {
    if (!inRoom) return; const b = back; inRoom = null; light.intensity = 0; lastDoor = b;
    if (b) player.teleport(b.x, b.z, b.h);
  }

  // ---------- Aussichtsplattform auf einem Hochhaus ----------
  let deck = null, towerOut = null;
  function addTower(tw) {
    if (!tw) return;
    const { x, z, w, d, h } = tw, inset = Math.min(4, Math.min(w, d) * 0.12), bw = w - inset * 2, bd = d - inset * 2, hv = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) % 1;
    const k = h > 100 && hv > 0.35 ? 0.62 + hv * 0.15 : 1, dw = bw * k * 0.7, dd = bd * k * 0.7, y = h + 6; // Plattform = Dach des Aufsatzes
    deck = { x, z, hw: dw / 2 - 0.6, hd: dd / 2 - 0.6, y };
    const g = new THREE.Group(); g.position.set(x, y, z); world.add(g);
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(dw, dd).rotateX(-Math.PI / 2), std(0xd9d2c4, 0.7)); fl.position.y = 0.02; fl.receiveShadow = true; g.add(fl);
    for (const [L, px, pz, ry] of [[dw, 0, -dd / 2, 0], [dw, 0, dd / 2, 0], [dd, -dw / 2, 0, Math.PI / 2], [dd, dw / 2, 0, Math.PI / 2]]) { box(g, L, 1.1, 0.06, M.glass, px, 0.6, pz, ry); box(g, L, 0.06, 0.12, M.metal, px, 1.15, pz, ry); }
    box(g, 2.6, 2.6, 2.2, std(0x3a4148, 0.4, { metalness: 0.5 }), 0, 1.3, 0); // Aufzughaus
    for (const [bx2, bz2] of [[-dw / 4, dd / 4], [dw / 4, -dd / 4]]) { box(g, 1.6, 0.45, 0.45, M.wood, bx2, 0.23, bz2); }
    // Eingang unten (Lobby-Tür am Sockel, zur Straße hin) und Aufzug
    const side = tw.door; // { x, z, ry }
    const ld = new THREE.Group(); ld.position.set(side.x, 0, side.z); ld.rotation.y = side.ry; world.add(ld);
    box(ld, 3.2, 3.2, 0.1, doorMat, 0, 1.6, 0); box(ld, 3.6, 0.25, 0.3, M.gold, 0, 3.3, 0.1);
    const out = { x: side.x + Math.sin(side.ry) * 2, z: side.z + Math.cos(side.ry) * 2, h: side.ry }; towerOut = out;
    interact.add({ obj: ld, color: 'blue', radius: 8, near: 2.6, x: out.x, z: out.z, key: 'tower-up', label: '🛗 ' + T.elevatorUp(Math.round(y)), when: () => !inRoom && !roof && !api.towerBusy, run: () => { back = out; roof = deck; player.teleport(x, z + 2, 0); ui.toast(T.onTop(Math.round(y)), 2600); } });
    interact.add({ objs: [], color: 'blue', radius: 4, near: 2.2, x, z: z + 1.6, key: 'tower-down', label: '🛗 ' + T.elevatorDown, when: () => roof === deck, run: () => { roof = null; if (back) player.teleport(back.x, back.z, back.h); } });
  }

  const api = {
    towerBusy: false,
    makeRoom(type, door) { const R = room(rooms.length, type); R.door = door; return R; }, get towerDoor() { return towerOut; },
    get inside() { return inRoom || roof; }, get lastDoor() { return lastDoor; }, rooms, enter,
    addTower,
    // Boden: im Laden 0, auf der Plattform Plattformhöhe; sonst null (normaler Boden)
    ground(x, z) { if (x > ROOM_X - 50) return 0; if (roof && Math.abs(x - roof.x) < roof.hw + 3 && Math.abs(z - roof.z) < roof.hd + 3) return roof.y; return null; },
    // Wände und Möbel halten auf
    collider: { type: 'fn', fn(p, r) {
      if (roof) { p.x = Math.max(roof.x - roof.hw, Math.min(roof.x + roof.hw, p.x)); p.z = Math.max(roof.z - roof.hd, Math.min(roof.z + roof.hd, p.z)); const dx = p.x - roof.x, dz = p.z - roof.z; if (Math.abs(dx) < 1.3 + r && Math.abs(dz) < 1.1 + r) { if (1.3 + r - Math.abs(dx) < 1.1 + r - Math.abs(dz)) p.x = roof.x + Math.sign(dx || 1) * (1.3 + r); else p.z = roof.z + Math.sign(dz || 1) * (1.1 + r); } return; }
      const R = inRoom; if (!R) return;
      const lx = p.x - R.x; p.x = R.x + Math.max(-W / 2 + r, Math.min(W / 2 - r, lx)); p.z = Math.max(-D / 2 + r, Math.min(D / 2 - r, p.z));
      for (const s of R.solids) { const dx = p.x - (R.x + s.x), dz = p.z - s.z, hw = s.hw + r, hd = s.hd + r; if (Math.abs(dx) < hw && Math.abs(dz) < hd) { if (hw - Math.abs(dx) < hd - Math.abs(dz)) p.x = R.x + s.x + Math.sign(dx || 1) * hw; else p.z = s.z + Math.sign(dz || 1) * hd; } }
    } },
    leave,
    update(dt) {
      for (const R of rooms) { if (R !== inRoom) continue; for (const o of R.spin) o.rotation.y += dt * 0.35; for (const f of R.figs) f.update(dt, 0); }
      if (inRoom) { // Kamera im Raum: tiefer und näher hinter der Figur, Blick nach vorn (nicht auf den Boden)
        const R = inRoom, yaw = ctx.input.yaw + Math.PI, fx = -Math.sin(yaw), fz = -Math.cos(yaw), p = player.pos;
        const c = engine.camera.position;
        c.set(p.x - fx * 3.6, 2.3 + ctx.input.pitch * 1.5, p.z - fz * 3.6);
        c.x = R.x + Math.max(-W / 2 + 0.3, Math.min(W / 2 - 0.3, c.x - R.x)); c.z = Math.max(-D / 2 + 0.3, Math.min(D / 2 - 0.3, c.z)); c.y = Math.min(H - 0.4, Math.max(0.8, c.y));
        engine.camera.lookAt(p.x + fx * 2.5, 1.3, p.z + fz * 2.5);
      }
    },
  };
  return api;
}
