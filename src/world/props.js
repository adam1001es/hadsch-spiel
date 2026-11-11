import * as THREE from 'three';
import { pbr } from './assets.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Wiederverwendbare Bauteile für die Außen-Stationen. Viele gleiche Objekte → InstancedMesh.
const dummy = new THREE.Object3D();
function instanced(world, geo, mat, list, { shadow = true } = {}) {
  const m = new THREE.InstancedMesh(geo, mat, list.length);
  list.forEach(([x, y, z, ry = 0, s = 1], i) => { dummy.position.set(x, y, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(s); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
  m.castShadow = shadow; m.receiveShadow = true;
  world.add(m);
  return m;
}

// Mina-Zelte: weiße, feuerfeste Zelte mit Pyramidendach auf quadratischem Grundriss (8 × 8 m)
export function tents(world, list, { glow = null } = {}) {
  const wall = new THREE.BoxGeometry(8, 2.6, 8); wall.translate(0, 1.3, 0);
  const roof = new THREE.ConeGeometry(5.66, 2.4, 4, 1); roof.rotateY(Math.PI / 4); roof.translate(0, 2.6 + 1.2, 0);
  const fabric = new THREE.MeshStandardMaterial({ color: 0xf4f2ec, roughness: 0.85, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const a = instanced(world, wall, fabric, list), b = instanced(world, roof, fabric, list);
  if (glow) glow.push(fabric);
  return [a, b];
}

// Dattelpalmen / Bäume: Stamm + Kronenblätter
// Ein Palmwedel: schmales, gebogenes Blatt (nach außen und unten hängend)
function frond(len = 3.2, w = 0.55, seg = 8) {
  const g = new THREE.PlaneGeometry(w, len, 2, seg);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i) + len / 2, t = y / len;           // 0 am Stamm … 1 an der Spitze
    const x = p.getX(i) * (1 - t * 0.85) * (0.6 + Math.sin(t * Math.PI) * 0.8);
    p.setXYZ(i, x, Math.sin(t * 1.9) * len * 0.42 - t * t * len * 0.55, y * 0.95);
  }
  g.computeVertexNormals();
  return g;
}
export function palms(world, list) {
  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 7, 8); trunk.translate(0, 3.5, 0);
  const parts = [];
  for (let i = 0; i < 11; i++) {
    const f = frond(2.6 + (i % 3) * 0.4);
    f.rotateX(-0.15 - (i % 2) * 0.25); f.rotateY((i / 11) * Math.PI * 2); f.translate(0, 7, 0);
    parts.push(f);
  }
  const leaves = mergeGeometries(parts);
  instanced(world, trunk, new THREE.MeshStandardMaterial({ color: 0x7a5f44, roughness: 1 }), list);
  instanced(world, leaves, new THREE.MeshStandardMaterial({ color: 0x4f6b35, roughness: 0.9, side: THREE.DoubleSide }), list);
}
// Neem-Bäume (Arafat): runde Krone
export function trees(world, list) {
  const trunk = new THREE.CylinderGeometry(0.2, 0.3, 2.6, 7); trunk.translate(0, 1.3, 0);
  const crown = new THREE.IcosahedronGeometry(2.4, 1); crown.scale(1, 0.75, 1); crown.translate(0, 3.6, 0);
  instanced(world, trunk, new THREE.MeshStandardMaterial({ color: 0x6b5440, roughness: 1 }), list);
  instanced(world, crown, new THREE.MeshStandardMaterial({ color: 0x5c7a3c, roughness: 0.95, flatShading: true }), list);
}

// Straßenlaternen mit leuchtendem Kopf. glow-Liste: Materialien, deren Leuchten nachts hochgeregelt wird.
export function lamps(world, list, glow) {
  const pole = new THREE.CylinderGeometry(0.08, 0.12, 9, 6); pole.translate(0, 4.5, 0);
  const headG = new THREE.BoxGeometry(0.9, 0.25, 0.5); headG.translate(0, 9, 0);
  instanced(world, pole, new THREE.MeshStandardMaterial({ color: 0x8a8f94, metalness: 0.6, roughness: 0.5 }), list, { shadow: false });
  const lm = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 0 });
  instanced(world, headG, lm, list, { shadow: false });
  glow.push(lm);
}

// Schild mit Text (Arabisch + Deutsch) auf zwei Pfosten
export function sign(world, x, z, ry, lines, { w = 6, h = 1.6, y = 3.2, bg = '#1d5642', fg = '#f5f1e6' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = fg; g.lineWidth = 8; g.strokeRect(14, 14, c.width - 28, c.height - 28);
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length;
  lines.forEach((t, i) => {
    const ar = /[؀-ۿ]/.test(t);
    g.font = `${ar ? 'bold ' : '600 '}${Math.round(c.height / (n + 0.8) * (ar ? 0.72 : 0.5))}px ${ar ? '"Geeza Pro","Noto Naskh Arabic",serif' : 'Figtree, system-ui, sans-serif'}`;
    g.fillText(t, c.width / 2, c.height * (i + 1) / (n + 1));
  });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const grp = new THREE.Group();
  const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.6, side: THREE.DoubleSide, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.25 }));
  board.position.y = y;
  const post = new THREE.MeshStandardMaterial({ color: 0x777b80, metalness: 0.5, roughness: 0.5 });
  for (const sx of [-w / 2 + 0.3, w / 2 - 0.3]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, y + h / 2), post); p.position.set(sx, (y + h / 2) / 2, -0.03); grp.add(p); }
  grp.add(board); grp.position.set(x, 0, z); grp.rotation.y = ry; world.add(grp);
  return grp;
}

// Felsen (z. B. Safa, Marwa, Jabal ar-Rahma): verbeulte Kugel mit Fels-Textur
export function rock(world, { r = 3, x = 0, y = 0, z = 0, sy = 0.7, seed = 1, rep = 2 } = {}) {
  const g = new THREE.IcosahedronGeometry(r, 4);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 1.7 + seed) * Math.cos(v.z * 1.3 - seed) * 0.18 + Math.sin(v.y * 2.3 + seed * 2) * 0.1;
    v.multiplyScalar(1 + n); v.y *= sy; p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ ...pbr('rock', [rep, rep]), roughness: 1 }));
  m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; world.add(m);
  return m;
}

// Kiesel zum Aufsammeln (Muzdalifa)
export function pebbleGeometry() {
  const g = new THREE.IcosahedronGeometry(0.06, 1); g.scale(1, 0.7, 0.85); return g;
}

// Gebetsmatten (Muzdalifa / Arafat)
export function mats(world, list) {
  const g = new THREE.BoxGeometry(1, 0.02, 2); g.translate(0, 0.01, 0);
  const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ roughness: 1 }), list.length);
  const cols = [0x8a3b2e, 0x2f5d50, 0x6b4e2e, 0x3b4a6b, 0x7d6a3a];
  const c = new THREE.Color();
  list.forEach(([x, z, ry], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); m.setColorAt(i, c.setHex(cols[i % cols.length])); });
  m.receiveShadow = true; world.add(m);
  return m;
}

// Einfache weiße Moschee mit Kuppel und Minarett(en)
export function mosque(world, { x = 0, z = 0, ry = 0, w = 40, d = 30, h = 9, minarets = 1, glow = null } = {}) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; world.add(grp);
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.75 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), white); body.position.y = h / 2; body.castShadow = body.receiveShadow = true; grp.add(body);
  // Bogenfenster als dunkle Felder (leuchten nachts)
  const win = new THREE.MeshStandardMaterial({ color: 0x3a3226, emissive: 0xffd08a, emissiveIntensity: 0 });
  if (glow) glow.push(win);
  const wg = new THREE.PlaneGeometry(1.6, 3.2);
  for (let i = 0; i < Math.floor(w / 4); i++) {
    const f = new THREE.Mesh(wg, win); f.position.set(-w / 2 + 2 + i * 4, h * 0.45, d / 2 + 0.02); grp.add(f);
    const b = new THREE.Mesh(wg, win); b.position.set(-w / 2 + 2 + i * 4, h * 0.45, -d / 2 - 0.02); b.rotation.y = Math.PI; grp.add(b);
  }
  const dome = new THREE.Mesh(new THREE.SphereGeometry(Math.min(w, d) * 0.28, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), white);
  dome.position.y = h; dome.castShadow = true; grp.add(dome);
  for (let i = 0; i < minarets; i++) {
    const mx = minarets === 1 ? w / 2 + 3 : (i === 0 ? -1 : 1) * (w / 2 + 3);
    const mH = h * 4.2;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.5, mH, 12), white); t.position.set(mx, mH / 2, d / 2 - 3); t.castShadow = true; grp.add(t);
    const bal = new THREE.Mesh(new THREE.CylinderGeometry(2, 1.6, 1, 14), white); bal.position.set(mx, mH * 0.78, d / 2 - 3); grp.add(bal);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.3, 14), win); lamp.position.set(mx, mH * 0.78 + 0.6, d / 2 - 3); grp.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.2, 4, 12), new THREE.MeshStandardMaterial({ color: 0xd8b04f, metalness: 0.8, roughness: 0.35 })); cap.position.set(mx, mH + 2, d / 2 - 3); grp.add(cap);
  }
  return grp;
}

// Reisebus: 3D-Modell „indonesian bus Ecoline“ (agungkuncoro13021986, CC BY 4.0), vereinfacht. Länge 12,2 m entlang z, Front bei +z.
// Wird einmal geladen und pro Station geklont. Gibt die Gruppe zurück; collider() liefert die Kollisionsbox.
let busLoad = null;
export function bus(world, x, z, ry = 0) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; world.add(grp);
  busLoad ||= new GLTFLoader().loadAsync('./assets/models/bus.glb').then((g) => g.scene).catch(() => null);
  busLoad.then((sc) => {
    if (!sc || !grp.parent) return;
    const m = sc.clone(true); m.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } }); grp.add(m);
  });
  return { group: grp, collider: { type: 'box', x, z, hw: 1.55, hd: 6.2, rot: ry } };
}
