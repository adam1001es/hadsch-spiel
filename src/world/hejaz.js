import * as THREE from 'three';
import { buildTerrain, fbm } from './terrain.js';
import { buildKaaba } from './kaaba.js';
import { buildHaram, matafRadius } from './haram.js';
import { createCrowd } from './crowd.js';
import { roads, bus } from './props.js';
import { city, clockTower, nabawi } from '../stations/balloon.js';
import { oasisMosque } from './oasis.js';

// Gemeinsame Landschaft für Ballonflug und Busfahrt: Mekka bei (0, 0), Medina bei (0, −D), dazwischen die Autobahn durch
// Wüste und Berge (stark verkleinert: in echt ca. 340 km). Eine Welt – man fliegt/fährt sichtbar von einer Stadt zur anderen.
export const D = 3400, MED = { x: 0, z: -D };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const roadX = (z) => Math.sin(z * 0.0011) * 140 * smooth(0, 700, -z) * smooth(0, 700, z + D); // Straße mit sanften Kurven
// Rastplatz mit Oasen-Moschee auf halbem Weg (östlich der Autobahn, Tor zur Straße)
export const REST_Z = -1600, REST_X = roadX(REST_Z) + 80;

function rawH(x, z) {
  const toRoad = Math.abs(x - roadX(z)), dM = Math.hypot(x, z), dN = Math.hypot(x - MED.x, z - MED.z);
  const open = Math.min(smooth(70, 420, toRoad), smooth(500, 900, dM), smooth(800, 1250, dN), smooth(110, 260, Math.hypot(x - REST_X, z - REST_Z))); // Straße, Städte und Rastplatz flach
  return open * (fbm(x * 0.0018 + 7, z * 0.0018) * 260 + fbm(x * 0.009, z * 0.009) * 50) + (1 - open) * fbm(x * 0.03, z * 0.03) * 1.5 - 0.8;
}

// ---------- Strecken zwischen Mekka und Medina (selbst fahren) ----------
// Autobahn (roadX), Bergstraße westlich durch die Berge, Wüstenpiste östlich durch ein Sandmeer mit Dünen.
// Beide Nebenstrecken zweigen bei Mekka (z ≈ −700) von der Autobahn ab und münden vor Medina wieder ein.
const branch = (z) => smooth(-700, -1050, z) * smooth(-D + 900, -D + 1250, z);
export const mountainX = (z) => roadX(z) - branch(z) * (390 + Math.sin(z * 0.0042) * 130);
export const desertX = (z) => roadX(z) + branch(z) * (340 + Math.sin(z * 0.0055 + 1) * 95);
// Höhenprofil der Bergstraße: Geländehöhe entlang der Strecke, über ±90 m geglättet (befahrbare Steigungen)
let PROF = null; const P0 = 600, PSTEP = 10;
function prof(z) {
  if (!PROF) { PROF = []; for (let zz = P0; zz >= -D - 600; zz -= PSTEP) { let s = 0, n = 0; for (let k = -90; k <= 90; k += 10) { s += rawH(mountainX(zz + k), zz + k); n++; } PROF.push(s / n); } }
  const f = (P0 - z) / PSTEP, i = Math.max(0, Math.min(PROF.length - 2, Math.floor(f))), t = Math.min(1, Math.max(0, f - i));
  return PROF[i] * (1 - t) + PROF[i + 1] * t;
}
const dunes = (x, z) => 5 + 3.6 * Math.sin(x * 0.055 + Math.sin(z * 0.011) * 2.2) + 2.8 * Math.sin(z * 0.043 + x * 0.018) + 1.2 * Math.sin(x * 0.17 + z * 0.09);
// Dörfer: an der Autobahn, in den Bergen, Oase in der Wüste
export const VILLAGES = [
  { id: 'autobahn', name: 'Dorf an der Autobahn', z: -1150, side: 46, path: roadX, r: 34 },
  { id: 'berg', name: 'Bergdorf', z: -2050, side: -34, path: mountainX, r: 34 },
  { id: 'oase', name: 'Oasendorf', z: -2380, side: 40, path: desertX, r: 40 },
];
for (const v of VILLAGES) { v.x = v.path(v.z) + v.side; }
export function H(x, z) {
  let h = rawH(x, z);
  const b = branch(z);
  if (b > 0.02) {
    // Sandmeer um die Wüstenpiste
    const wd = (1 - smooth(70, 180, Math.abs(x - desertX(z)))) * smooth(0.05, 0.4, b);
    if (wd > 0) h = h * (1 - wd) + dunes(x, z) * wd;
    // Bergstraße: Fahrbahn auf das geglättete Profil legen
    const wm = (1 - smooth(8, 30, Math.abs(x - mountainX(z)))) * smooth(0.05, 0.4, b);
    if (wm > 0) h = h * (1 - wm) + prof(z) * wm;
  }
  for (const v of VILLAGES) { // Dörfer eben
    const d = Math.hypot(x - v.x, z - v.z); if (d > v.r + 45) continue;
    v.h ??= v.id === 'berg' ? prof(v.z) : v.id === 'oase' ? 3 : rawH(v.x, v.z);
    const w = 1 - smooth(v.r, v.r + 45, d); h = h * (1 - w) + v.h * w;
  }
  return h;
}

export function buildHejaz(world, engine, { pilgrims = true } = {}) {
  const mobile = engine.isMobile;
  // Gelände in zwei Hälften (je 4000 m), damit die Auflösung reicht
  const SIZE = 2200, SEG = Math.max(mobile ? 200 : 260, 220), ZC = [-D * 0.25 + 200, -D * 0.85 + 100];
  for (const zc of ZC) {
    const t = buildTerrain(world, (x, z) => H(x, z + zc), SIZE, SEG); t.position.z = zc; t.scale.set(1, 1, 1);
  }
  // Höhe genau so, wie das Geländenetz sie zeigt (Dreiecke des Rasters) – damit Fahrzeuge nicht einsinken oder schweben
  const cell = SIZE / SEG;
  const ground = (x, z) => {
    const zc = Math.abs(z - ZC[0]) < Math.abs(z - ZC[1]) ? ZC[0] : ZC[1];
    const fx = (x + SIZE / 2) / cell, fz = (z - zc + SIZE / 2) / cell, i = Math.floor(fx), j = Math.floor(fz);
    if (i < 0 || j < 0 || i >= SEG || j >= SEG) return H(x, z);
    const u = fx - i, w = fz - j, x0 = -SIZE / 2 + i * cell, z0 = zc - SIZE / 2 + j * cell;
    const ha = H(x0, z0), hb = H(x0, z0 + cell), hd = H(x0 + cell, z0);
    if (u + w <= 1) return ha + (hd - ha) * u + (hb - ha) * w;
    const hc = H(x0 + cell, z0 + cell); return hc + (hb - hc) * (1 - u) + (hd - hc) * (1 - w);
  };
  // Mekka
  buildKaaba(world); buildHaram(world);
  clockTower(world, -250, -250);
  city(world, { h: H, rIn: 360, rOut: 820, n: mobile ? 450 : 800, avoid: (x, z) => Math.hypot(x + 250, z + 250) < 120 || Math.abs(x - roadX(z)) < 25 });
  // Medina
  const med = new THREE.Group(); med.position.set(MED.x, 0, MED.z); world.add(med);
  const { half } = nabawi(med);
  city(med, { h: (x, z) => H(x + MED.x, z + MED.z), rIn: 0, rOut: 900, n: mobile ? 450 : 800, seed: 7, avoid: (x, z) => (Math.abs(x) < half[0] && Math.abs(z) < half[1]) || Math.abs(x + MED.x - roadX(z + MED.z)) < 25 });
  // Autobahn Mekka – Medina (in Abschnitten entlang der Kurven)
  const segs = []; for (let z = -620; z > -D + 820; z -= 120) segs.push({ x1: roadX(z), z1: z, x2: roadX(z - 120), z2: z - 120, w: 16 });
  roads(world, segs, { curb: false, y: 0.15 });
  oasisMosque(world, { x: REST_X, z: REST_Z, ry: -Math.PI / 2, shadows: false }); // Oasen-Moschee am Rastplatz
  // Busse auf der Autobahn (fahren hin und her)
  const coaches = []; for (let k = 0; k < (mobile ? 4 : 7); k++) { const b = bus(world, 0, 0); coaches.push({ g: b.group, s: Math.random(), dir: k % 2 ? 1 : -1 }); }
  // Pilger beim Tawaf
  let crowd = null, cN = 0, ang, rad;
  if (pilgrims) {
    cN = mobile ? 220 : 400; crowd = createCrowd(world, cN, { ihram: true });
    ang = new Float32Array(cN).map(() => Math.random() * 6.283);
    rad = new Float32Array(cN).map((_, i) => 11 + Math.random() * (matafRadius(Math.cos(ang[i]), -Math.sin(ang[i])) - 14));
  }
  const Z0 = -640, Z1 = -D + 840;
  return {
    ground, coaches,
    update(dt) {
      for (const c of coaches) {
        c.s = (c.s + dt * 0.012 * c.dir + 1) % 1; const z = Z0 + (Z1 - Z0) * c.s, x = roadX(z) + c.dir * 3.5;
        c.g.position.set(x, 0.15, z); c.g.rotation.y = c.dir > 0 ? Math.PI : 0;
      }
      if (crowd) { for (let i = 0; i < cN; i++) { ang[i] += dt * 1.1 / rad[i]; const a = ang[i]; crowd.set(i, rad[i] * Math.cos(a), 0, -rad[i] * Math.sin(a), Math.atan2(-Math.sin(a), -Math.cos(a))); } crowd.commit(); }
    },
  };
}
