import * as THREE from 'three';
import { buildTerrain, fbm } from './terrain.js';
import { buildKaaba } from './kaaba.js';
import { buildHaram, matafRadius } from './haram.js';
import { createCrowd } from './crowd.js';
import { roads, bus } from './props.js';
import { city, clockTower, nabawi } from '../stations/balloon.js';

// Gemeinsame Landschaft für Ballonflug und Busfahrt: Mekka bei (0, 0), Medina bei (0, −D), dazwischen die Autobahn durch
// Wüste und Berge (stark verkleinert: in echt ca. 340 km). Eine Welt – man fliegt/fährt sichtbar von einer Stadt zur anderen.
export const D = 3400, MED = { x: 0, z: -D };
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
export const roadX = (z) => Math.sin(z * 0.0011) * 140 * smooth(0, 700, -z) * smooth(0, 700, z + D); // Straße mit sanften Kurven

export function H(x, z) {
  const toRoad = Math.abs(x - roadX(z)), dM = Math.hypot(x, z), dN = Math.hypot(x - MED.x, z - MED.z);
  const open = Math.min(smooth(70, 420, toRoad), smooth(500, 900, dM), smooth(800, 1250, dN)); // Straße und Städte flach
  return open * (fbm(x * 0.0018 + 7, z * 0.0018) * 260 + fbm(x * 0.009, z * 0.009) * 50) + (1 - open) * fbm(x * 0.03, z * 0.03) * 1.5 - 0.8;
}

export function buildHejaz(world, engine, { pilgrims = true } = {}) {
  const mobile = engine.isMobile;
  // Gelände in zwei Hälften (je 4000 m), damit die Auflösung reicht
  for (const zc of [-D * 0.25 + 200, -D * 0.85 + 100]) {
    const t = buildTerrain(world, (x, z) => H(x, z + zc), 2200, mobile ? 200 : 260); t.position.z = zc; t.scale.set(1, 1, 1);
  }
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
    update(dt) {
      for (const c of coaches) {
        c.s = (c.s + dt * 0.012 * c.dir + 1) % 1; const z = Z0 + (Z1 - Z0) * c.s, x = roadX(z) + c.dir * 3.5;
        c.g.position.set(x, 0.15, z); c.g.rotation.y = c.dir > 0 ? Math.PI : 0;
      }
      if (crowd) { for (let i = 0; i < cN; i++) { ang[i] += dt * 1.1 / rad[i]; const a = ang[i]; crowd.set(i, rad[i] * Math.cos(a), 0, -rad[i] * Math.sin(a), Math.atan2(-Math.sin(a), -Math.cos(a))); } crowd.commit(); }
    },
  };
}
