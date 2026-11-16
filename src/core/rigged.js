import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

// Hauptfigur mit Skelett (Tripo-Rig des Nutzers): Gehen/Stehen aus den mitgelieferten Animationen,
// Gebets- und Handlungshaltungen (Ruku', Sujud, Sitzen, Dua, Werfen …) werden aus dem Skelett berechnet.
// Haltungen werden als „Knochen zeigt in Richtung …“ beschrieben (Körperraum: Blick nach +z, +x = links, +y = oben)
// und einmal beim Laden in lokale Drehungen umgerechnet. Beim Spielen wird weich zwischen Animation und Haltung überblendet.
const HEIGHT = 1.74;
const V = (x, y, z) => new THREE.Vector3(x, y, z).normalize();
const X = new THREE.Vector3(1, 0, 0);

// [‘aim’, Knochen, Kind-Knochen, Richtung] oder [‘rot’, Knochen, Achse, Grad]. Reihenfolge: Eltern vor Kindern.
const ARMS_DOWN = (sx = 1) => [['aim', 'L_Upperarm', 'L_Forearm', V(0.12 * sx, -1, 0.05)], ['aim', 'R_Upperarm', 'R_Forearm', V(-0.12 * sx, -1, 0.05)]];
const DEF = {
  stand: [ // aufrecht und gerade: Füße schulterbreit, Gewicht auf beiden Beinen, Arme locker gerade an der Seite
    ['rest', 'Hip'], ['rest', 'Pelvis'], ['rest', 'Waist'], ['rest', 'Spine01'], ['rest', 'Spine02'], ['rest', 'NeckTwist01'], ['rest', 'Head'],
    ['rest', 'L_Clavicle'], ['rest', 'R_Clavicle'],
    ['aim', 'L_Thigh', 'L_Calf', V(0.07, -1, 0)], ['aim', 'L_Calf', 'L_Foot', V(0.03, -1, -0.02)], ['aim', 'L_Foot', 'L_ToeBase', V(0.12, -0.3, 1)],
    ['aim', 'R_Thigh', 'R_Calf', V(-0.07, -1, 0)], ['aim', 'R_Calf', 'R_Foot', V(-0.03, -1, -0.02)], ['aim', 'R_Foot', 'R_ToeBase', V(-0.12, -0.3, 1)],
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.1, -1, 0.0)], ['aim', 'L_Forearm', 'L_Hand', V(0.04, -1, 0.1)], ['aim', 'L_Hand', 'L_Mid1', V(0.02, -1, 0.06)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.1, -1, 0.0)], ['aim', 'R_Forearm', 'R_Hand', V(-0.04, -1, 0.1)], ['aim', 'R_Hand', 'R_Mid1', V(-0.02, -1, 0.06)],
  ],
  qiyam: [ // stehend, rechte Hand über der linken auf der Brust
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.25, -0.95, 0.12)], ['aim', 'L_Forearm', 'L_Hand', V(-0.75, 0.3, 0.55)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.25, -0.95, 0.15)], ['aim', 'R_Forearm', 'R_Hand', V(0.8, 0.32, 0.5)],
  ],
  ruku: [ // Rücken waagerecht, Hände auf den Knien
    ['rot', 'Hip', X, 78], ['aim', 'L_Thigh', 'L_Calf', V(0.04, -1, -0.04)], ['aim', 'L_Calf', 'L_Foot', V(0, -1, -0.02)], ['aim', 'L_Foot', 'L_ToeBase', V(0, -0.3, 1)],
    ['aim', 'R_Thigh', 'R_Calf', V(-0.04, -1, -0.04)], ['aim', 'R_Calf', 'R_Foot', V(0, -1, -0.02)], ['aim', 'R_Foot', 'R_ToeBase', V(0, -0.3, 1)],
    ['rot', 'Spine01', X, 6], ['rot', 'Head', X, -10],
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.1, -0.9, 0.45)], ['aim', 'L_Forearm', 'L_Hand', V(0.03, -0.97, 0.25)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.1, -0.9, 0.45)], ['aim', 'R_Forearm', 'R_Hand', V(-0.03, -0.97, 0.25)],
  ],
  sujud: [ // Knie, Hände und Stirn am Boden, Hüfte hoch
    ['rot', 'Hip', X, 128],
    ['aim', 'L_Thigh', 'L_Calf', V(0.06, -0.97, 0.22)], ['aim', 'L_Calf', 'L_Foot', V(0, -0.06, -1)], ['aim', 'L_Foot', 'L_ToeBase', V(0, -0.9, -0.35)],
    ['aim', 'R_Thigh', 'R_Calf', V(-0.06, -0.97, 0.22)], ['aim', 'R_Calf', 'R_Foot', V(0, -0.06, -1)], ['aim', 'R_Foot', 'R_ToeBase', V(0, -0.9, -0.35)],
    ['rot', 'Head', X, -25],
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.22, -0.95, 0.15)], ['aim', 'L_Forearm', 'L_Hand', V(0.08, -0.12, 1)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.22, -0.95, 0.15)], ['aim', 'R_Forearm', 'R_Hand', V(-0.08, -0.12, 1)],
  ],
  sit: [ // auf den Fersen sitzen, Hände auf den Oberschenkeln
    ['aim', 'L_Thigh', 'L_Calf', V(0.05, -0.12, 1)], ['aim', 'L_Calf', 'L_Foot', V(0, -0.1, -1)], ['aim', 'L_Foot', 'L_ToeBase', V(0, -0.85, -0.5)],
    ['aim', 'R_Thigh', 'R_Calf', V(-0.05, -0.12, 1)], ['aim', 'R_Calf', 'R_Foot', V(0, -0.1, -1)], ['aim', 'R_Foot', 'R_ToeBase', V(0, -0.85, -0.5)],
    ['rot', 'Waist', X, 6],
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.12, -1, 0.18)], ['aim', 'L_Forearm', 'L_Hand', V(0.03, -0.3, 1)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.12, -1, 0.18)], ['aim', 'R_Forearm', 'R_Hand', V(-0.03, -0.3, 1)],
  ],
  dua: [ // Hände vor der Brust erhoben
    ['rot', 'Head', X, 8],
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.28, -0.75, 0.6)], ['aim', 'L_Forearm', 'L_Hand', V(-0.05, 0.45, 0.9)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.28, -0.75, 0.6)], ['aim', 'R_Forearm', 'R_Hand', V(0.05, 0.45, 0.9)],
  ],
  istilam: [ // rechte Hand zum Schwarzen Stein erhoben
    ...ARMS_DOWN(),
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.25, 0.4, 0.88)], ['aim', 'R_Forearm', 'R_Hand', V(-0.1, 0.5, 0.86)],
  ],
  drink: [ // Becher zum Mund
    ...ARMS_DOWN(),
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.2, -0.75, 0.6)], ['aim', 'R_Forearm', 'R_Hand', V(0.45, 0.85, 0.25)], ['rot', 'Head', X, -12],
  ],
  throw: [ // rechter Arm hoch zum Wurf
    ...ARMS_DOWN(),
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.3, 0.85, 0.3)], ['aim', 'R_Forearm', 'R_Hand', V(-0.1, 0.95, -0.15)],
  ],
  bend: [ // bücken und Kiesel aufheben
    ['aim', 'L_Thigh', 'L_Calf', V(0.05, -0.75, 0.6)], ['aim', 'L_Calf', 'L_Foot', V(0, -0.95, -0.25)],
    ['aim', 'R_Thigh', 'R_Calf', V(-0.05, -0.75, 0.6)], ['aim', 'R_Calf', 'R_Foot', V(0, -0.95, -0.25)],
    ['rot', 'Waist', X, 45], ['rot', 'Spine01', X, 20],
    ['aim', 'L_Upperarm', 'L_Forearm', V(0.12, -0.95, 0.25)],
    ['aim', 'R_Upperarm', 'R_Forearm', V(-0.1, -0.85, 0.5)], ['aim', 'R_Forearm', 'R_Hand', V(-0.05, -0.95, 0.3)],
  ],
};

// Kleidungen der Hauptfigur (gleiches Skelett): Alltag, Ihram mit freier rechter Schulter (Idtiba'), später Ihram bedeckt
const FILES = { casual: 'player_m.glb', ihramOpen: 'player_m_ihram_open.glb' };
const RIGS = {};
export const rigModel = (k = 'casual') => RIGS[k] || null;
export const hasRig = (k) => !!RIGS[k];
export const rigReady = Promise.all(Object.entries(FILES).map(([k, f]) => new GLTFLoader().loadAsync('./assets/models/' + f).then((g) => {
  // Bewegung an Ort und Stelle: Positions-Spuren entfernen (die Figur wird vom Spiel bewegt)
  for (const c of g.animations) c.tracks = c.tracks.filter((t) => !t.name.endsWith('.position'));
  RIGS[k] = g;
}).catch((e) => console.error(f, e))));

function rotWorld(root, b, axis, deg) {
  root.updateMatrixWorld(true);
  const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq);
  const wq = new THREE.Quaternion(); b.getWorldQuaternion(wq);
  b.quaternion.copy(pq.invert().multiply(new THREE.Quaternion().setFromAxisAngle(axis, deg * Math.PI / 180)).multiply(wq));
}
function aimWorld(root, b, child, dir) {
  root.updateMatrixWorld(true);
  const p = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld), c = new THREE.Vector3().setFromMatrixPosition(child.matrixWorld);
  const cur = c.sub(p).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(cur, dir);
  const pq = new THREE.Quaternion(); b.parent.getWorldQuaternion(pq);
  const wq = new THREE.Quaternion(); b.getWorldQuaternion(wq);
  b.quaternion.copy(pq.invert().multiply(q).multiply(wq));
}

// Haltungen einmal pro geladenem Modell vorberechnen (an einer Hilfskopie in Ruhehaltung)
const POSED_CACHE = new WeakMap();
function precompute(g) {
  if (POSED_CACHE.has(g)) return POSED_CACHE.get(g);
  const POSED = {}; POSED_CACHE.set(g, POSED);
  const ref = cloneSkinned(g.scene);
  const rest = new Map(); ref.traverse((o) => { if (o.isBone) rest.set(o.name, o.quaternion.clone()); });
  const mesh = (() => { let m = null; ref.traverse((o) => { if (o.isSkinnedMesh) m = o; }); return m; })();
  // Bezug: Fußsohle in Ruhehaltung
  ref.updateMatrixWorld(true); mesh.computeBoundingBox(); const floor0 = mesh.boundingBox.min.y;
  for (const [name, list] of Object.entries(DEF)) {
    ref.traverse((o) => { if (o.isBone) o.quaternion.copy(rest.get(o.name)); });
    const used = new Set();
    for (const [kind, bn, a, d] of list) {
      const b = ref.getObjectByName(bn); if (!b) continue; used.add(bn);
      if (kind === 'rot') rotWorld(ref, b, a, d); else if (kind === 'aim') { const c = ref.getObjectByName(a); if (c) aimWorld(ref, b, c, d); } // 'rest' = Ruhehaltung
    }
    ref.updateMatrixWorld(true); mesh.skeleton.update(); mesh.computeBoundingBox();
    POSED[name] = { q: new Map([...used].map((bn) => [bn, ref.getObjectByName(bn).quaternion.clone()])), drop: mesh.boundingBox.min.y - floor0 };
  }
  return POSED;
}

export function createRiggedFigure(parent, key = 'casual') {
  const g = RIGS[key]; if (!g) return null;
  const posed = precompute(g);
  const model = cloneSkinned(g.scene);
  const box = new THREE.Box3().setFromObject(model), scale = HEIGHT / (box.max.y - box.min.y);
  const holder = new THREE.Group(); holder.scale.setScalar(scale); holder.add(model); parent.add(holder);
  model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const mixer = new THREE.AnimationMixer(model);
  const clip = (n) => g.animations.find((a) => a.name.toLowerCase().startsWith(n));
  const walk = mixer.clipAction(clip('walk')), idleClip = clip('idle'), idle = idleClip ? mixer.clipAction(idleClip) : null;
  walk.play(); walk.setEffectiveWeight(0); if (idle) { idle.play(); idle.setEffectiveWeight(1); }
  const bones = new Map(); model.traverse((o) => { if (o.isBone) bones.set(o.name, o); });
  const allPoseBones = new Set(); for (const p of Object.values(posed)) for (const bn of p.q.keys()) allPoseBones.add(bn);
  const cur = new Map([...allPoseBones].map((bn) => [bn, bones.get(bn).quaternion.clone()])); // aktuelle Haltung je Knochen
  const amt = new Map([...allPoseBones].map((bn) => [bn, 0])); // Anteil Haltung (0 = Animation)
  let target = null, drop = 0, wAmt = 0;
  return {
    holder,
    pose(name) { target = posed[name] ? name : null; },
    update(dt, walking = 0) {
      // Gehen ↔ Stehen überblenden, Schritttempo an die Geschwindigkeit anpassen
      const wk = target ? 0 : Math.min(1, walking * 1.6);
      wAmt += (wk - wAmt) * Math.min(1, dt * 8);
      walk.setEffectiveWeight(Math.max(wAmt, idle ? 0 : 1e-3)); idle?.setEffectiveWeight(1 - wAmt);
      walk.timeScale = 0.75 + Math.min(1.2, walking) * 0.55;
      mixer.update(dt);
      // Haltung darüberlegen
      // Ohne Handlung: eigene aufrechte Stehhaltung (statt der Tripo-Idle-Animation), beim Gehen die Geh-Animation
      const P = target ? posed[target] : posed.stand, k = 1 - Math.exp(-dt * 7), want = target ? 1 : 1 - wAmt;
      for (const bn of allPoseBones) {
        const b = bones.get(bn), tq = P && P.q.get(bn);
        const a = amt.get(bn) + ((tq ? want : 0) - amt.get(bn)) * k; amt.set(bn, a);
        if (tq) cur.get(bn).slerp(tq, k);
        if (a > 0.001) b.quaternion.slerp(cur.get(bn), a); else cur.get(bn).copy(b.quaternion);
      }
      drop += ((target && P ? P.drop : 0) - drop) * k;
      model.position.y = -drop;
    },
  };
}
