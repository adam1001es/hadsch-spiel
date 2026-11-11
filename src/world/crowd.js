import * as THREE from 'three';
import { REGIONS, dressGeo, izarGeo, torsoGeo, ridaGeo, armsGeo, headGeo, hairGeo, beardGeo, faceGeo, khimarGeo, kufiGeo, ghutraGeo } from './people.js';

// Menschenmenge: Pilgerinnen und Pilger aus aller Welt, per InstancedMesh (eine Form = ein Draw Call).
// Jede Person besteht aus einigen Teilen (Gewand, Kopftuch, Gesicht, Kopf, Haar …); nicht benötigte Teile bleiben unsichtbar.
// Optionen: men = Anteil Männer, ihram = Männer im Ihram (zwei weiße Tücher), idtiba = rechte Schulter frei (Tawaf der Umrah).
const pick = (a) => a[(Math.random() * a.length) | 0];
function pickRegion() {
  let r = Math.random(), acc = 0;
  for (const g of REGIONS) { acc += g.w; if (r < acc) return g; }
  return REGIONS[0];
}

export function createCrowd(world, n, { men = 0.6, ihram = true, idtiba = false } = {}) {
  const P = {
    dress: () => dressGeo(8), izar: () => izarGeo(8), torso: () => torsoGeo(7, 0, false), rida: () => ridaGeo(9, 0, idtiba), arms: () => armsGeo(4),
    head: () => headGeo(7), hair: () => hairGeo(7), beard: () => beardGeo(6), face: () => faceGeo(6),
    khimar: () => khimarGeo(9), khimarLong: () => khimarGeo(9, 0, true), kufi: () => kufiGeo(8), ghutra: () => ghutraGeo(10),
  };
  const DOUBLE = new Set(['rida', 'khimar', 'khimarLong', 'ghutra']);

  // 1. Personen erzeugen: Liste der Teile mit Farbe
  const people = new Array(n), scale = new Float32Array(n), use = {};
  const tint = (hex, v = 0.06) => { const c = new THREE.Color(hex); return c.multiplyScalar(1 - v / 2 + Math.random() * v); };
  for (let i = 0; i < n; i++) {
    const R = pickRegion(), male = Math.random() < men;
    const skin = pick(R.skin), old = Math.random() < 0.18;
    const hair = old ? pick([0x8f8a84, 0xb8b2aa, 0xd8d4ce]) : pick(R.hair);
    const list = [];
    const put = (k, hex, v) => { list.push([k, tint(hex, v), use[k] = (use[k] || 0) + 1]); };
    if (male) {
      if (ihram) {
        put('izar', 0xf4f2ec, 0.05); put('rida', 0xf4f2ec, 0.05); put('torso', skin); put('arms', skin); put('head', skin);
        if (Math.random() < 0.8) put('hair', hair, 0.1); // sonst Glatze (z. B. nach dem Rasieren)
      } else {
        const col = pick(R.men.dress);
        put('dress', col); put('arms', col); put('head', skin);
        if (R.men.ghutra && Math.random() < R.men.ghutra) put('ghutra', pick(R.men.ghutraCol));
        else if (R.men.cap.length && Math.random() < R.men.capP) { put('kufi', pick(R.men.cap)); put('hair', hair, 0.1); }
        else put('hair', hair, 0.1);
      }
      if (Math.random() < (old ? 0.85 : 0.5)) put('beard', hair, 0.1);
      scale[i] = 0.95 + Math.random() * 0.12;
    } else {
      const dress = pick(R.women.dress);
      const kh = Math.random() < 0.55 ? pick(R.women.khimar) : dress;
      put('dress', dress); put('arms', dress);
      put(Math.random() < R.women.long ? 'khimarLong' : 'khimar', kh, 0.04);
      put('face', skin);
      scale[i] = 0.9 + Math.random() * 0.1;
    }
    people[i] = list;
  }

  // 2. Pro Teil ein InstancedMesh – genau so viele Instanzen, wie Personen das Teil tragen
  const meshes = {};
  for (const [k, count] of Object.entries(use)) {
    const m = new THREE.InstancedMesh(P[k](), new THREE.MeshStandardMaterial({ roughness: k === 'face' || k === 'head' || k === 'torso' ? 0.65 : 0.92, side: DOUBLE.has(k) ? THREE.DoubleSide : THREE.FrontSide }), count);
    m.frustumCulled = false; meshes[k] = m; world.add(m);
  }
  for (const list of people) for (const e of list) { e[2] -= 1; meshes[e[0]].setColorAt(e[2], e[1]); e[1] = meshes[e[0]]; }
  // Hinweis: use[k] wurde beim Erzeugen hochgezählt; e[2] ist jetzt der Instanz-Index (0 … count−1)
  for (const m of Object.values(meshes)) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  const d = new THREE.Object3D();
  return {
    n,
    // Position (x, y, z), Drehung ry, Höhe sy (z. B. 0.62 = sitzend), Neigung rx (z. B. π/2 = liegend)
    set(i, x, y, z, ry = 0, sy = 1, rx = 0) {
      const s = scale[i];
      d.position.set(x, y, z); d.rotation.set(rx, ry, 0); d.scale.set(s, sy * s, s); d.updateMatrix();
      const L = people[i];
      for (let k = 0; k < L.length; k++) L[k][1].setMatrixAt(L[k][2], d.matrix);
    },
    commit() { for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true; },
  };
}

// Für ältere Aufrufe: einzelne Figur (wird nicht mehr verwendet)
export function createPilgrim(world, bodyColor = 0xf3f1ea) {
  const crowd = createCrowd(world, 1, { men: 1, ihram: bodyColor === 0xf3f1ea });
  crowd.set(0, 0, 0, 0); crowd.commit();
  return { group: new THREE.Group(), setColor() {} };
}
