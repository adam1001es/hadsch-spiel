import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
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

// 3D-Modell „hijab muslim woman“ (Yasser.Hamedah, CC BY 4.0), fürs Spiel umgewandelt: Arme gesenkt, vereinfacht,
// Teile einzeln färbbar (dress, hijab, head, arms = Hände, eyes, shoes). Wird beim Start vorgeladen.
let MUSLIMA = null;
export function preloadPeople() {
  return new GLTFLoader().loadAsync('./assets/models/muslima.glb').then((g) => {
    const parts = {};
    g.scene.traverse((c) => { if (c.isMesh) parts[c.name] = { geometry: c.geometry, material: c.material }; });
    if (parts.dress && parts.hijab && parts.head) MUSLIMA = parts;
  }).catch(() => {});
}
// Kleidfarben der Pilgerinnen: gedeckte dunkle Töne, Weiß/Beige/Creme und Pastell
const W_DARK = [0x5b4433, 0x1b1b1f, 0x3b2a4a, 0x1c2a44, 0x5a1f26, 0x8a8a8a, 0x4a4a50, 0x463326];
const W_LIGHT = [0xf4f2ec, 0xd8c8b0, 0xece2cc, 0xe6dccb];
const W_PASTEL = [0xc8d8e4, 0xe8cdd5, 0xd9c8de, 0xcfe3d6, 0xf0d5c4, 0xefe5c4];
function womanColors(R) {
  const r = Math.random();
  let dress;
  if (R.id === 'Arabien' || R.id === 'Iran') dress = r < 0.7 ? 0x1b1b1f : pick(W_DARK);
  else if (R.id === 'Südostasien') dress = r < 0.65 ? pick(W_LIGHT) : pick(W_PASTEL);
  else dress = r < 0.45 ? pick(W_DARK) : r < 0.7 ? pick(W_LIGHT) : pick(W_PASTEL);
  const h = Math.random();
  const hijab = h < 0.45 ? dress : h < 0.75 ? pick(W_LIGHT) : h < 0.9 ? pick(W_DARK) : pick(W_PASTEL);
  return { dress, hijab, shoes: Math.random() < 0.6 ? 0x1e1c1b : 0x4a3426 };
}

// Detailstufen: Nur Pilgerinnen in der Nähe der Kamera werden als 3D-Modell gezeichnet (sonst zu viele Dreiecke),
// weiter entfernte als einfache Figur in denselben Farben. setCrowdCamera() wird einmal beim Start aufgerufen.
let CAM = null, NEAR = 28, CAP = 200;
export function setCrowdCamera(camera, { near = 28, cap = 200 } = {}) { CAM = camera; NEAR = near; CAP = cap; }

export function createCrowd(world, n, { men = 0.6, ihram = true, idtiba = false } = {}) {
  const P = {
    dress: () => dressGeo(8), izar: () => izarGeo(8), torso: () => torsoGeo(7, 0, false), rida: () => ridaGeo(9, 0, idtiba), arms: () => armsGeo(4),
    head: () => headGeo(7), hair: () => hairGeo(7), beard: () => beardGeo(6), face: () => faceGeo(6),
    khimar: () => khimarGeo(9), khimarLong: () => khimarGeo(9, 0, true), kufi: () => kufiGeo(8), ghutra: () => ghutraGeo(10),
  };
  const DOUBLE = new Set(['rida', 'khimar', 'khimarLong', 'ghutra', 'w_hijab', 'w_dress']);

  // 1. Personen erzeugen: Liste der Teile mit Farbe (einfache Figur) und – bei Frauen – Modellteile
  const people = new Array(n), model = new Array(n), scale = new Float32Array(n), use = {};
  const sh = new Float32Array(n).fill(1), sw = new Float32Array(n).fill(1); // Höhe, Breite (Statur)
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
      const col = MUSLIMA ? womanColors(R) : { dress: pick(R.women.dress), hijab: Math.random() < 0.55 ? pick(R.women.khimar) : null, shoes: 0x1e1c1b };
      const hijab = col.hijab ?? col.dress;
      // einfache Figur (für die Ferne) in denselben Farben
      put('dress', col.dress); put('arms', col.dress);
      put(Math.random() < (MUSLIMA ? 0.15 : R.women.long) ? 'khimarLong' : 'khimar', hijab, 0.04);
      put('face', skin);
      scale[i] = MUSLIMA ? 1.02 : 0.9 + Math.random() * 0.1;
      if (MUSLIMA) {
        // Pilgerin als 3D-Modell (in der Nähe): etwas kleiner/größer (sh) und schlanker/kräftiger (sw)
        sh[i] = 0.94 + Math.random() * 0.12; sw[i] = 0.9 + Math.random() * 0.24;
        model[i] = [['w_dress', tint(col.dress, 0.04)], ['w_hijab', tint(hijab, 0.03)], ['w_head', tint(skin, 0.04)],
          ...(MUSLIMA.arms ? [['w_arms', tint(skin, 0.04)]] : []), ...(MUSLIMA.eyes ? [['w_eyes', new THREE.Color(0xffffff)]] : []),
          ...(MUSLIMA.shoes ? [['w_shoes', tint(col.shoes, 0.05)]] : [])];
      }
    }
    people[i] = list;
  }

  // 2. Pro Teil ein InstancedMesh – genau so viele Instanzen, wie Personen das Teil tragen
  const meshes = {};
  const makeMesh = (k, geo, count) => {
    const mat = k.startsWith('w_')
      ? Object.assign(MUSLIMA[k.slice(2)].material.clone(), { side: DOUBLE.has(k) ? THREE.DoubleSide : THREE.FrontSide })
      : new THREE.MeshStandardMaterial({ roughness: k === 'face' || k === 'head' || k === 'torso' ? 0.65 : 0.92, side: DOUBLE.has(k) ? THREE.DoubleSide : THREE.FrontSide });
    if (k.startsWith('w_')) mat.color.setHex(0xffffff);
    const m = new THREE.InstancedMesh(geo, mat, count);
    m.frustumCulled = false; meshes[k] = m; world.add(m);
    return m;
  };
  for (const [k, count] of Object.entries(use)) makeMesh(k, P[k](), count);
  for (const list of people) for (const e of list) { e[2] -= 1; meshes[e[0]].setColorAt(e[2], e[1]); e[1] = meshes[e[0]]; }
  // Modell-Pilgerinnen: feste Anzahl Plätze (CAP), werden je nach Entfernung vergeben
  const nWomen = model.filter(Boolean).length, cap = Math.min(CAP, nWomen);
  const mMeshes = [];
  if (cap > 0) for (const k of Object.keys(MUSLIMA)) { const m = makeMesh('w_' + k, MUSLIMA[k].geometry, cap); m.count = 0; mMeshes.push(m); }
  const mByKey = Object.fromEntries(mMeshes.map((m) => [Object.keys(meshes).find((k) => meshes[k] === m), m]));
  for (const m of Object.values(meshes)) if (m.instanceColor) m.instanceColor.needsUpdate = true;

  const slotOf = new Int32Array(n).fill(-1), slotUsed = new Uint8Array(Math.max(1, cap));
  const last = new Float32Array(n * 6), hasLast = new Uint8Array(n);
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  const d = new THREE.Object3D(), camAt = new THREE.Vector3(1e9, 0, 0);
  let colorsDirty = false, setsSinceCommit = 0, dirty = true;

  function freeSlot(i) {
    const sl = slotOf[i]; if (sl < 0) return;
    for (const m of mMeshes) m.setMatrixAt(sl, ZERO);
    slotUsed[sl] = 0; slotOf[i] = -1;
  }
  function takeSlot(i) {
    let sl = -1; for (let k = 0; k < cap; k++) if (!slotUsed[k]) { sl = k; break; }
    if (sl < 0) return -1;
    slotUsed[sl] = 1; slotOf[i] = sl;
    for (const [key, color] of model[i]) mByKey[key].setColorAt(sl, color);
    colorsDirty = true;
    return sl;
  }

  const api = {
    n,
    // Position (x, y, z), Drehung ry, Höhe sy (z. B. 0.62 = sitzend), Neigung rx (z. B. π/2 = liegend)
    set(i, x, y, z, ry = 0, sy = 1, rx = 0) {
      const o = i * 6; last[o] = x; last[o + 1] = y; last[o + 2] = z; last[o + 3] = ry; last[o + 4] = sy; last[o + 5] = rx; hasLast[i] = 1;
      setsSinceCommit++; dirty = true;
      const s = scale[i];
      d.position.set(x, y, z); d.rotation.set(rx, ry, 0); d.scale.set(s * sw[i], sy * s * sh[i], s * sw[i]); d.updateMatrix();
      const L = people[i];
      let useModel = false;
      if (model[i] && cap > 0 && CAM) {
        const near = (x - CAM.position.x) ** 2 + (z - CAM.position.z) ** 2 < NEAR * NEAR;
        if (near && (slotOf[i] >= 0 || takeSlot(i) >= 0)) useModel = true;
        else if (!near) freeSlot(i);
      }
      if (useModel) {
        const sl = slotOf[i];
        for (const m of mMeshes) m.setMatrixAt(sl, d.matrix);
        for (let k = 0; k < L.length; k++) L[k][1].setMatrixAt(L[k][2], ZERO);
      } else {
        for (let k = 0; k < L.length; k++) L[k][1].setMatrixAt(L[k][2], d.matrix);
      }
    },
    commit() {
      // Feststehende Mengen (set nur einmal): Detailstufen neu verteilen, wenn sich die Kamera bewegt hat
      if (CAM && cap > 0 && camAt.distanceToSquared(CAM.position) > 9) {
        camAt.copy(CAM.position);
        if (setsSinceCommit < n) for (let i = 0; i < n; i++) if (model[i] && hasLast[i]) { const o = i * 6; api.set(i, last[o], last[o + 1], last[o + 2], last[o + 3], last[o + 4], last[o + 5]); }
      }
      setsSinceCommit = 0;
      let top = 0; for (let k = 0; k < cap; k++) if (slotUsed[k]) top = k + 1;
      for (const m of mMeshes) { m.count = top; if (colorsDirty && m.instanceColor) m.instanceColor.needsUpdate = true; }
      colorsDirty = false;
      if (dirty) for (const m of Object.values(meshes)) m.instanceMatrix.needsUpdate = true;
      dirty = false;
    },
  };
  return api;
}

// Für ältere Aufrufe: einzelne Figur (wird nicht mehr verwendet)
export function createPilgrim(world, bodyColor = 0xf3f1ea) {
  const crowd = createCrowd(world, 1, { men: 1, ihram: bodyColor === 0xf3f1ea });
  crowd.set(0, 0, 0, 0); crowd.commit();
  return { group: new THREE.Group(), setColor() {} };
}
