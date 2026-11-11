import * as THREE from 'three';
import { pbr } from './assets.js';

// Wüstengelände mit flacher Mitte und Bergen am Rand. Für Mina, Arafat, Muzdalifa.
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * noise(x * f, y * f); f *= 2; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function heightFn({ r0 = 250, r1 = 550, amp = 150, sx = 1, sz = 1 } = {}) {
  return (x, z) => {
    const m = smooth(r0, r1, Math.hypot(x / sx, z / sz));
    const ridge = 1 - Math.abs(fbm(x * 0.009, z * 0.009) * 2 - 1);
    return m * (fbm(x * 0.0045 + 10, z * 0.0045 - 3) * amp * 0.7 + ridge * amp * 0.5);
  };
}

export function buildTerrain(world, h, size = 1600, seg = 160) {
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, col = new Float32Array(p.count * 3);
  const sand = new THREE.Color(0xffffff), rock = new THREE.Color(0x5a4a3e), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = h(x, z);
    p.setY(i, y);
    c.copy(sand).lerp(rock, smooth(2, 30, y) * (0.7 + fbm(x * 0.05, z * 0.05) * 0.4));
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  // Echte Sand-Textur (Kachel ca. 6 m), durch Vertex-Farben zu Fels abgedunkelt
  const tex = pbr('sand', [size / 6, size / 6]);
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ ...tex, vertexColors: true, roughness: 1, normalScale: new THREE.Vector2(0.8, 0.8) }));
  m.receiveShadow = true; world.add(m);
  return m;
}
