import * as THREE from 'three';
import { pbr } from './assets.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
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
// Zelte wie in Mina/Arafat: weiße Stoffwände mit Nähten und Eingang, Pyramidendach mit Nahtlinien,
// gewellter Volant unter der Dachkante, Spitze mit Knauf, Eckpfosten. Alles als InstancedMesh (wenige Zeichenaufrufe).
const tentTex = {};
function tentCanvas(kind) {
  if (tentTex[kind]) return tentTex[kind];
  const c = document.createElement('canvas'), g = c.getContext('2d');
  if (kind === 'wall') {
    c.width = 512; c.height = 160;
    g.fillStyle = '#f3f0e8'; g.fillRect(0, 0, 512, 160);
    const gr = g.createLinearGradient(0, 0, 0, 160); gr.addColorStop(0, 'rgba(0,0,0,0.10)'); gr.addColorStop(0.15, 'rgba(0,0,0,0)'); gr.addColorStop(0.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(110,85,55,0.28)');
    g.fillStyle = gr; g.fillRect(0, 0, 512, 160);
    for (let x = 0; x <= 512; x += 64) { g.fillStyle = 'rgba(0,0,0,0.13)'; g.fillRect(x - 2, 0, 3, 160); g.fillStyle = 'rgba(255,255,255,0.6)'; g.fillRect(x + 1, 0, 2, 160); } // Nähte
    // Eingang (auf jeder 4. Bahn-Seite mittig): dunkle Öffnung mit hochgebundener Plane
    g.fillStyle = '#4a4036'; g.fillRect(208, 30, 96, 130);
    g.fillStyle = '#e4dfd3'; g.beginPath(); g.moveTo(204, 26); g.lineTo(308, 26); g.lineTo(256, 70); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.strokeRect(206, 28, 100, 134);
  } else if (kind === 'roof') {
    c.width = 256; c.height = 256;
    g.fillStyle = '#f6f4ee'; g.fillRect(0, 0, 256, 256);
    for (let x = 0; x <= 256; x += 32) { g.fillStyle = 'rgba(0,0,0,0.10)'; g.fillRect(x - 1, 0, 2, 256); }
    for (let q = 0; q <= 256; q += 64) { g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(q - 2, 0, 4, 256); } // Grate
  } else {
    c.width = 512; c.height = 64; // Volant: gewellte Unterkante mit feiner Borte
    g.fillStyle = '#ece6d8';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(512, 0);
    for (let x = 512; x >= 0; x -= 32) g.quadraticCurveTo(x - 16, 72, x - 32, 40);
    g.closePath(); g.fill();
    g.fillStyle = '#c8b48a'; g.fillRect(0, 10, 512, 5);
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (tentTex[kind] = t);
}
export function tents(world, list, { glow = null } = {}) {
  const S = 8, WH = 2.6, RH = 2.6; // Grundfläche, Wandhöhe, Dachhöhe
  const wall = new THREE.BoxGeometry(S, WH, S); wall.translate(0, WH / 2, 0);
  { const uv = wall.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i)); } // je Seite eine volle Bahn mit Eingang
  const roof = new THREE.ConeGeometry(S * 0.74, RH, 4, 1, true); roof.rotateY(Math.PI / 4); roof.translate(0, WH + RH / 2, 0);
  const val = new THREE.CylinderGeometry(S * 0.74, S * 0.74, 0.5, 4, 1, true); val.rotateY(Math.PI / 4); val.translate(0, WH - 0.05, 0);
  { const uv = val.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 4); }
  const cap = new THREE.CylinderGeometry(0.12, 0.35, 0.45, 8); cap.translate(0, WH + RH - 0.05, 0);
  const knob = new THREE.SphereGeometry(0.16, 10, 6); knob.translate(0, WH + RH + 0.3, 0);
  const poles = mergeGeometries([[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sz]) => new THREE.CylinderGeometry(0.06, 0.06, WH + 0.2, 6).translate(sx * (S / 2 + 0.02), (WH + 0.2) / 2, sz * (S / 2 + 0.02))));
  const fabric = new THREE.MeshStandardMaterial({ map: tentCanvas('wall'), roughness: 0.85, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const roofM = new THREE.MeshStandardMaterial({ map: tentCanvas('roof'), roughness: 0.8, side: THREE.DoubleSide, emissive: 0xffd9a0, emissiveIntensity: 0 });
  const valM = new THREE.MeshStandardMaterial({ map: tentCanvas('val'), alphaTest: 0.5, transparent: false, side: THREE.DoubleSide, roughness: 0.85 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, metalness: 0.6, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd2b061, metalness: 0.7, roughness: 0.35 });
  const out = [instanced(world, wall, [fabric, fabric, new THREE.MeshStandardMaterial({ color: 0xece8de }), fabric, fabric, fabric], list), instanced(world, roof, roofM, list),
    instanced(world, val, valM, list, { shadow: false }), instanced(world, cap, metal, list, { shadow: false }), instanced(world, knob, gold, list, { shadow: false }), instanced(world, poles, metal, list, { shadow: false })];
  if (glow) glow.push(fabric, roofM);
  return out;
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
// Palmen: 3D-Modell „Palm Trees“ (YadroGames, CC BY 4.0), vier Sorten mit echten Blatt-Bildern (je ca. 600 Dreiecke).
// Bis das Modell geladen ist, stehen einfache Palmen. Jede Palme bekommt eine Sorte (Index % 4).
let palmLoad = null;
export function palms(world, list) {
  const trunk = new THREE.CylinderGeometry(0.18, 0.28, 7, 8); trunk.translate(0, 3.5, 0);
  const parts = [];
  for (let i = 0; i < 11; i++) {
    const f = frond(2.6 + (i % 3) * 0.4);
    f.rotateX(-0.15 - (i % 2) * 0.25); f.rotateY((i / 11) * Math.PI * 2); f.translate(0, 7, 0);
    parts.push(f);
  }
  const leaves = mergeGeometries(parts);
  const simple = [
    instanced(world, trunk, new THREE.MeshStandardMaterial({ color: 0x7a5f44, roughness: 1 }), list),
    instanced(world, leaves, new THREE.MeshStandardMaterial({ color: 0x4f6b35, roughness: 0.9, side: THREE.DoubleSide }), list),
  ];
  palmLoad ||= new GLTFLoader().loadAsync('./assets/models/palms.glb').then((g) => g.scene).catch(() => null);
  palmLoad.then((sc) => {
    if (!sc || !simple[0].parent) return;
    for (let v = 1; v <= 4; v++) {
      const sub = list.filter((_, i) => i % 4 === v - 1); if (!sub.length) continue;
      sc.getObjectByName('palm' + v).traverse((o) => { if (o.isMesh) instanced(world, o.geometry, o.material, sub); });
    }
    for (const m of simple) m.removeFromParent();
  });
}
// Neem-Bäume (Arafat): runde Krone
export function trees(world, list) {
  const trunk = new THREE.CylinderGeometry(0.2, 0.3, 2.6, 7); trunk.translate(0, 1.3, 0);
  const crown = new THREE.IcosahedronGeometry(2.4, 1); crown.scale(1, 0.75, 1); crown.translate(0, 3.6, 0);
  instanced(world, trunk, new THREE.MeshStandardMaterial({ color: 0x6b5440, roughness: 1 }), list);
  instanced(world, crown, new THREE.MeshStandardMaterial({ color: 0x5c7a3c, roughness: 0.95, flatShading: true }), list);
}

// Straßenlaternen: 3D-Modell „Street Light“ (Algirdas Lalys, CC BY 4.0), 9,3 m, Arm nach +z (ry dreht ihn), 674 Dreiecke.
// Die Leuchte glüht nachts (glow-Liste). Bis das Modell geladen ist, stehen einfache Masten.
let lampLoad = null;
export function lamps(world, list, glow) {
  const pole = new THREE.CylinderGeometry(0.08, 0.12, 9, 6); pole.translate(0, 4.5, 0);
  const headG = new THREE.BoxGeometry(0.9, 0.25, 0.5); headG.translate(0, 9, 0);
  const lm = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: 0 });
  const simple = [instanced(world, pole, new THREE.MeshStandardMaterial({ color: 0x8a8f94, metalness: 0.6, roughness: 0.5 }), list, { shadow: false }), instanced(world, headG, lm, list, { shadow: false })];
  glow.push(lm);
  lampLoad ||= new GLTFLoader().loadAsync('./assets/models/streetlight.glb').then((g) => g.scene).catch(() => null);
  lampLoad.then((sc) => {
    if (!sc || !simple[0].parent) return;
    sc.traverse((o) => {
      if (!o.isMesh) return;
      let mat = o.material;
      if (mat.name === 'glass') { mat = mat.clone(); mat.emissive = new THREE.Color(0xffc070); mat.emissiveIntensity = 0; glow.push(mat); }
      instanced(world, o.geometry, mat, list, { shadow: false });
    });
    for (const m of simple) m.removeFromParent();
  });
}

// Schild mit Text (Arabisch + Deutsch), modern: Tafel mit abgerundeten Ecken (Anthrazit, cremefarbene Schrift,
// feine goldene Linie zwischen den Sprachen). Halterung: ein schlanker Mast hinter der Tafel; hoch hängende Schilder
// (Hallen) an zwei dünnen Seilen. bg/fg/accent für Sonderfälle (z. B. gelbe Grenzschilder in Arafat).
export function sign(world, x, z, ry, lines, { w = 6, h = 1.6, y = 3.2, bg = '#2c3034', fg = '#f3ece0', accent = '#c9a45a', hang = y > 5, wall = false } = {}) {
  const R = Math.min(w, h) * 0.18; // Eckenradius
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const g = c.getContext('2d'), cw = c.width, chh = c.height, rr = R / w * cw;
  const round = (pad) => { g.beginPath(); g.roundRect(pad, pad, cw - 2 * pad, chh - 2 * pad, Math.max(1, rr - pad)); };
  round(0); g.fillStyle = bg; g.fill();
  round(10); g.strokeStyle = 'rgba(255,255,255,0.10)'; g.lineWidth = 4; g.stroke();
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  const n = lines.length, rows = lines.map((t, i) => ({ t, ar: /[؀-ۿ]/.test(t), cy: chh * (i + 1) / (n + 1) }));
  for (const r of rows) {
    g.font = `${r.ar ? 'bold ' : '500 '}${Math.round(chh / (n + 0.8) * (r.ar ? 0.66 : 0.42))}px ${r.ar ? '"Geeza Pro","Noto Naskh Arabic",serif' : 'Figtree, system-ui, sans-serif'}`;
    g.fillText(r.t, cw / 2, r.cy);
  }
  if (n > 1) { g.fillStyle = accent; const ly = (rows[0].cy + rows[1].cy) / 2; g.fillRect(cw * 0.36, ly - 2, cw * 0.28, 4); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const grp = new THREE.Group();
  // Tafelkörper (abgerundet, 6 cm stark) und bedruckte Vorderseite
  const shape = new THREE.Shape(); shape.moveTo(-w / 2 + R, -h / 2); shape.lineTo(w / 2 - R, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + R);
  shape.lineTo(w / 2, h / 2 - R); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - R, h / 2); shape.lineTo(-w / 2 + R, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - R);
  shape.lineTo(-w / 2, -h / 2 + R); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + R, -h / 2);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 6 }).translate(0, 0, -0.07), new THREE.MeshStandardMaterial({ color: bg, roughness: 0.5, metalness: 0.2 }));
  body.position.y = y; body.castShadow = true; grp.add(body);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: 0.5, roughness: 0.55, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.22 }));
  face.position.set(0, y, 0.002); grp.add(face);
  const back = face.clone(); back.rotation.y = Math.PI; back.position.z = -0.072; grp.add(back);
  const metal = new THREE.MeshStandardMaterial({ color: 0x3a3d41, metalness: 0.6, roughness: 0.4 });
  if (wall) { /* an der Fassade befestigt: keine Halterung */ } else if (hang) {
    for (const sx of [-w * 0.35, w * 0.35]) { const cab = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4), metal); cab.position.set(sx, y + h / 2 + 2, -0.04); grp.add(cab); }
  } else {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, y, 0.1), metal); post.position.set(0, y / 2, -0.13); post.castShadow = true; grp.add(post);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.06, 0.34), metal); foot.position.set(0, 0.03, -0.13); grp.add(foot);
  }
  grp.position.set(x, 0, z); grp.rotation.y = ry; world.add(grp);
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

// Teppiche mit Bordüre und Muster (Canvas-Textur, vier Farbstellungen) und je ein Kissen am Kopfende (+z lokal).
// list: [x, z, ry]; Teppich 2 × 3 m (lange Seite lokal z). Gibt nichts zurück.
export function carpets(world, list) {
  const PAL = [['#7e2a22', '#d9b56a', '#1f2f4a'], ['#22405f', '#d8c9a0', '#8a2a24'], ['#4f3a24', '#e0c48a', '#2e5a4a'], ['#5a1f3a', '#cfae6a', '#24453a']];
  const geo = new THREE.BoxGeometry(2, 0.03, 3); geo.translate(0, 0.015, 0);
  const cush = new THREE.BoxGeometry(0.55, 0.13, 0.38, 3, 2, 3); { const p = cush.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); p.setY(i, p.getY(i) * (1 - (x * x) / 0.12 - (z * z) / 0.06) + 0.065); } cush.computeVertexNormals(); }
  PAL.forEach(([base, line, mid], v) => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 384; const g = c.getContext('2d');
    g.fillStyle = base; g.fillRect(0, 0, 256, 384);
    g.strokeStyle = line; g.lineWidth = 10; g.strokeRect(14, 14, 228, 356); g.lineWidth = 3; g.strokeRect(30, 30, 196, 324);
    g.fillStyle = mid; for (let i = 0; i < 12; i++) { g.fillRect(36 + (i % 2) * 6, 40 + i * 26, 8, 8); g.fillRect(212 - (i % 2) * 6, 40 + i * 26, 8, 8); }
    g.save(); g.translate(128, 192); g.fillStyle = line; g.beginPath(); g.moveTo(0, -90); g.lineTo(52, 0); g.lineTo(0, 90); g.lineTo(-52, 0); g.closePath(); g.fill();
    g.fillStyle = mid; g.beginPath(); g.moveTo(0, -66); g.lineTo(36, 0); g.lineTo(0, 66); g.lineTo(-36, 0); g.closePath(); g.fill(); g.restore();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    const sub = list.filter((_, i) => i % 4 === v); if (!sub.length) return;
    const m = new THREE.InstancedMesh(geo, [null, null, new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), null, null, null].map((x) => x || new THREE.MeshStandardMaterial({ color: base, roughness: 1 })), sub.length);
    sub.forEach(([x, z, ry], i) => { dummy.position.set(x, 0, z); dummy.rotation.set(0, ry, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); m.setMatrixAt(i, dummy.matrix); });
    m.receiveShadow = true; world.add(m);
  });
  const cm = new THREE.InstancedMesh(cush, new THREE.MeshStandardMaterial({ roughness: 0.9 }), list.length), col = new THREE.Color();
  const CC = [0xe9e2d2, 0xc9b48a, 0x9a3a2e, 0x2f4f6a, 0xd8c7a0];
  list.forEach(([x, z, ry], i) => { dummy.position.set(x + Math.sin(ry) * 1.2, 0.03, z + Math.cos(ry) * 1.2); dummy.rotation.set(0, ry, 0); dummy.updateMatrix(); cm.setMatrixAt(i, dummy.matrix); cm.setColorAt(i, col.setHex(CC[(i * 7) % CC.length])); });
  cm.castShadow = true; cm.receiveShadow = true; world.add(cm);
}

// Kiesfeld („Becken“): flache Mulde mit Kiesboden (echtes Kiesbild, Poly Haven CC0) und niedrigem Steinrand.
// Gibt die Positionen für einzelne, aufsammelbare Kiesel zurück (dicht verteilt im Feld).
export function gravelBasin(world, { x, z, rx = 5, rz = 4, ry = 0, n = 200 }) {
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; world.add(grp);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ ...pbr('pebbles', [rx / 1.2, rz / 1.2]), roughness: 1 }));
  disc.scale.set(rx, 1, rz); disc.position.y = 0.025; disc.receiveShadow = true; grp.add(disc);
  // Rand aus flachen Steinen
  const rim = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.22, 0).scale(1.4, 0.55, 1), new THREE.MeshStandardMaterial({ color: 0x8a7f72, roughness: 0.95, flatShading: true }), 64);
  for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; dummy.position.set(Math.cos(a) * (rx + 0.15), 0.08, Math.sin(a) * (rz + 0.15)); dummy.rotation.set(0, -a + Math.random() * 0.4, 0); dummy.scale.setScalar(0.8 + Math.random() * 0.5); dummy.updateMatrix(); rim.setMatrixAt(i, dummy.matrix); }
  rim.castShadow = true; rim.receiveShadow = true; grp.add(rim);
  const pts = [], c = Math.cos(ry), sn = Math.sin(ry);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 0.92; const lx = Math.cos(a) * r * rx, lz = Math.sin(a) * r * rz; pts.push([x + lx * c + lz * sn, z - lx * sn + lz * c]); }
  return pts;
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

// Moschee als 3D-Modell: „M-01 [mosque]“ (Designs Forge, CC BY 4.0): zwei Minarette, gerippte Kuppel,
// Grundfläche 44 × 44 m (Mitte im Ursprung, Eingang Richtung +z). Bis das Modell geladen ist, steht die einfache Moschee.
// Feine Steinstruktur ohne UV-Koordinaten: echtes Marmorbild, aus drei Richtungen projiziert (triplanar), dezent beigemischt
function stoneDetail(mat) {
  const t = pbr('marble_floor', [1, 1]).map;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tStone = { value: t };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tStone; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <map_fragment>', `vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 st = texture2D(tStone, vWP.zy / 2.5).rgb * bw.x + texture2D(tStone, vWP.xz / 2.5).rgb * bw.y + texture2D(tStone, vWP.xy / 2.5).rgb * bw.z;
        diffuseColor.rgb *= mix(vec3(1.0), st * 1.25, 0.45);`);
  };
  mat.customProgramCacheKey = () => 'stone1';
}
const MOSQUES = { 2: { file: 'mosque2.glb', hw: 22, hd: 22 } };
const mosqueLoads = {};
export function mosqueModel(world, { x = 0, z = 0, ry = 0, glow = null, variant = 2 } = {}) {
  const V = MOSQUES[variant];
  const simple = mosque(world, { x, z, ry, w: 44, d: 44, h: 10, minarets: 2, glow });
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = ry; world.add(grp);
  mosqueLoads[variant] ||= new GLTFLoader().loadAsync('./assets/models/' + V.file).then((g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry = toCreasedNormals(o.geometry, Math.PI / 6); // Kanten scharf, Kuppeln rund
      o.castShadow = true; o.receiveShadow = true;
      if (o.material.name === 'stone') stoneDetail(o.material);
      if (o.material.name === 'glass') { o.material.emissive = new THREE.Color(0xffd08a); o.material.emissiveIntensity = 0; }
    });
    return g.scene;
  }).catch(() => null);
  mosqueLoads[variant].then((sc) => {
    if (!sc || !grp.parent) return;
    const m = sc.clone(true); grp.add(m); simple.removeFromParent();
    m.traverse((o) => { if (o.isMesh && o.material.name === 'glass' && glow && !glow.includes(o.material)) glow.push(o.material); });
  });
  return { group: grp, collider: { type: 'box', x, z, hw: V.hw, hd: V.hd, rot: ry } };
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
