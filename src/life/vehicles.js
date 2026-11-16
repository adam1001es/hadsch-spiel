import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Fahrzeuge des Lebensspiels (Amanah-Ausleihe): Autos (public/assets/models/cars, CC BY 4.0 Comrade1280),
// Motorrad (vehicles/motorbike.glb, CC BY 4.0 Yakpower), Bus (bus.glb, CC BY 4.0 agungkuncoro13021986).
// Alle mit Front nach +z, Boden y = 0. makeVehicle(kind) gibt sofort eine Gruppe zurück; das Modell wird nachgeladen.
// Räder: Autos haben wheel_fl/fr/rl/rr (Drehpunkt in der Radmitte); beim Motorrad werden die Räder aus der Form erkannt.
// Weitere (vehicles/README.md): Geländemotorräder dirtbike_<farbe> (wheel_f/wheel_r), E-Scooter, Fahrrad, E-Bike, Helikopter
// (rotor_main dreht um y, rotor_tail um x). Beim Laden wird jedes Modell auf Mitte x = z = 0 und Boden y = 0 gesetzt.
export const DIRT_COLORS = ['orange', 'red', 'green', 'black', 'white', 'yellow'];
export const SMALL_KINDS = ['escooter', 'bicycle', 'ebike', 'motorbike', ...DIRT_COLORS.map((c) => 'dirtbike_' + c)];
export const isAir = (k) => k === 'helicopter';
export const CAR_KINDS = ['sedan', 'compact', 'suv', 'minivan', 'hatchback', 'wagon', 'pickup', 'offroad', 'coupe', 'sport'];
export const VEHICLE_NAME = { sedan: 'Limousine', compact: 'Kleinwagen', suv: 'SUV', minivan: 'Minivan', hatchback: 'Schrägheck', wagon: 'Kombi', pickup: 'Pickup', offroad: 'Geländewagen', coupe: 'Coupé', sport: 'Sportwagen', motorbike: 'Motorrad', bus: 'Bus', escooter: 'E-Scooter', bicycle: 'Fahrrad', ebike: 'E-Bike', helicopter: 'Helikopter', ...Object.fromEntries(DIRT_COLORS.map((c) => ['dirtbike_' + c, 'Geländemotorrad'])) };
const CAR = { seat: [0.37, -0.14, -0.25], pose: 'drive', len: 4.4, wid: 1.9, wheelR: 0.31, vmax: 15, acc: 5, cam: [9.5, 3.6] };
// hohe Autos: Sitz höher (sonst ragen die Beine unten heraus)
const TALL = { ...CAR, seat: [0.4, 0.12, -0.25], cam: [10.5, 4], vmax: 50, acc: 7 };
// Höchstgeschwindigkeit in m/s (×3,6 = km/h); Nitro bis höchstens 94,4 m/s = 340 km/h
CAR.vmax = 55; CAR.acc = 8.5;
const FAST = { sport: { ...CAR, seat: [0.36, -0.36, -0.35], vmax: 78, acc: 12 }, coupe: { ...CAR, seat: [0.37, -0.26, -0.3], vmax: 70, acc: 11 } }; // flache Autos: tiefer sitzen
export const SPEC = {
  motorbike: { seat: [0, 0.04, -0.28], pose: 'ride', len: 2.1, wid: 0.8, wheelR: 0.33, vmax: 72, acc: 13, cam: [7, 2.8] },
  ...FAST,
  suv: TALL, offroad: TALL, pickup: TALL, minivan: TALL,
  bus: { seat: [0.75, 1.05, 4.9], pose: 'drive', len: 12.4, wid: 3, wheelR: 0.5, vmax: 30, acc: 3.5, cam: [18, 6.5] },
  escooter: { seat: [0, 0.12, -0.15], pose: 'stand', len: 1.1, wid: 0.6, wheelR: 0.1, vmax: 7, acc: 4, cam: [6, 2.6] },
  bicycle: { seat: [0, 0.14, -0.2], pose: 'ride', len: 1.8, wid: 0.6, wheelR: 0.34, vmax: 7, acc: 3, cam: [6, 2.6] },
  ebike: { seat: [0, 0.16, -0.25], pose: 'ride', len: 1.9, wid: 0.6, wheelR: 0.34, vmax: 12, acc: 4, cam: [6, 2.6] },
  dirt: { seat: [0, 0.16, -0.2], pose: 'ride', len: 2.1, wid: 0.8, wheelR: 0.35, vmax: 45, acc: 11, cam: [7, 2.8], offroad: true },
  helicopter: { seat: [0.55, 0.45, 2.4], pose: 'drive', len: 11, wid: 3, wheelR: 1, vmax: 70, acc: 10, cam: [22, 8], air: true },
};
export const specOf = (kind) => (kind?.startsWith('dirtbike') ? SPEC.dirt : SPEC[kind] || CAR);
const FILE = (k) => (k === 'bus' ? 'bus.glb' : CAR_KINDS.includes(k) ? `cars/${k}.glb` : `vehicles/${k}.glb`);
const cache = {};
export const loadVehicle = (kind) => (cache[kind] ||= new GLTFLoader().loadAsync('./assets/models/' + FILE(kind)).then((g) => {
  // Scheiben hell getönt und durchsichtig, damit man sieht, wer im Fahrzeug sitzt
  g.scene.traverse((o) => { const m = o.material; if (o.isMesh && m && /glass/i.test(m.name)) { m.color.set(0x8fa6b3); m.opacity = 0.22; m.transparent = true; m.depthWrite = false; m.roughness = 0.1; m.metalness = 0.2; } });
  return g.scene;
}).catch(() => null));

// einfacher Fahrer (Oberkörper + Kopf mit Ghutra) für Fahrzeuge im Verkehr – sehr leicht, eine geteilte Form
let driverGeo = null;
const driverMat = new THREE.MeshStandardMaterial({ color: 0xf1eee6, roughness: 0.85 });
function driverMesh() {
  if (!driverGeo) {
    const torso = new THREE.CylinderGeometry(0.17, 0.21, 0.6, 8).translate(0, 0.3, 0);
    const headG = new THREE.SphereGeometry(0.12, 10, 8).translate(0, 0.75, 0.02);
    driverGeo = [torso, headG];
  }
  const g = new THREE.Group(); for (const geo of driverGeo) g.add(new THREE.Mesh(geo, driverMat)); return g;
}

// Motorrad: runde, schmale Teile nahe am Boden vorne/hinten = Räder → in eine Drehgruppe um ihre Mitte legen
function findWheels(model) {
  model.updateMatrixWorld(true);
  const found = [], box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
  model.traverse((o) => {
    if (!o.isMesh) return;
    box.setFromObject(o); box.getSize(s); box.getCenter(c);
    const round = Math.abs(s.y - s.z) < 0.12 && s.y > 0.45 && s.y < 0.9 && s.x < 0.35, low = Math.abs(c.y - s.y / 2) < 0.1;
    if (round && low) found.push({ o, c: c.clone() });
  });
  const wheels = [];
  for (const { o, c: cc } of found) {
    const pivot = new THREE.Group(); const parent = o.parent; parent.updateMatrixWorld(true);
    pivot.position.copy(parent.worldToLocal(cc.clone())); parent.add(pivot); pivot.updateMatrixWorld(true);
    pivot.attach(o); wheels.push({ obj: pivot, steer: cc.z > 0.2 });
  }
  return wheels;
}

const isIn = (o, p) => { for (let q = o; q; q = q.parent) if (q === p) return true; return false; };

export function makeVehicle(world, kind, { shadows = true, driver = false } = {}) {
  const spec = specOf(kind);
  const root = new THREE.Group(); world.add(root);
  const v = { kind, spec, root, wheels: [], ready: false, spin: 0, name: VEHICLE_NAME[kind] || 'Auto', driver: null };
  if (driver) { v.driver = driverMesh(); v.driver.position.set(spec.seat[0], spec.seat[1] + (kind === 'motorbike' ? 0.15 : 0.5), spec.seat[2]); root.add(v.driver); }
  loadVehicle(kind).then((sc) => {
    if (!sc || !root.parent) return;
    const raw = sc.clone(true), m = new THREE.Group(); m.add(raw); root.add(m);
    // auf Mitte und Boden setzen (manche Modelle sind im Paket verschoben)
    const bb = new THREE.Box3().setFromObject(raw), cc = bb.getCenter(new THREE.Vector3());
    raw.position.set(-cc.x, -bb.min.y, -cc.z);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = true; } });
    if (kind === 'motorbike') v.wheels = findWheels(m);
    else if (kind.startsWith('dirtbike')) { for (const n of ['wheel_f', 'wheel_r']) { const w = m.getObjectByName(n); if (w) v.wheels.push({ obj: w, steer: n === 'wheel_f' }); } }
    else if (kind === 'helicopter') {
      // Rotoren neu aufhängen: Drehpunkt = Mitte der Rotorblätter (der Drehpunkt in der Datei liegt daneben)
      // in Ruhelage messen (Lage/Drehung des Fahrzeugs kurz zurücksetzen, sonst werden die Messkästen schief)
      const sp = root.position.clone(), sq = root.quaternion.clone(); root.position.set(0, 0, 0); root.quaternion.identity();
      root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(), hub = new THREE.Vector3();
      // Im Modell heißen die Teile: „elise“ = Hauptrotor (Blätter), „rotor_main/rotor_tail“ = Heckrotor (Fenestron), „interior“ = Kabine
      const repivot = (obj) => {
        if (!obj) return null;
        obj.updateMatrixWorld(true); obj.geometry?.computeBoundingBox();
        const bb = obj.isMesh ? obj.geometry.boundingBox.clone().applyMatrix4(obj.matrixWorld) : new THREE.Box3().setFromObject(obj), c = bb.getCenter(new THREE.Vector3());
        if (obj.isMesh) { // Nabe = Mitte des kleinsten Kreises um alle Punkte (Blattspitzen liegen gleich weit von der Nabe)
          const pa = obj.geometry.attributes.position, pts = [], q = new THREE.Vector3();
          for (let i = 0; i < pa.count; i += Math.max(1, (pa.count / 600) | 0)) { q.fromBufferAttribute(pa, i).applyMatrix4(obj.matrixWorld); pts.push([q.x, q.z]); }
          let cx = c.x, cz = c.z;
          for (let it = 1; it < 400; it++) { let far = pts[0], fd = -1; for (const p of pts) { const d = (p[0] - cx) ** 2 + (p[1] - cz) ** 2; if (d > fd) { fd = d; far = p; } } cx += (far[0] - cx) / (it + 1); cz += (far[1] - cz) / (it + 1); }
          c.x = cx; c.z = cz;
        }
        const parent = obj.parent, piv = new THREE.Group(); parent.add(piv); piv.position.copy(parent.worldToLocal(c.clone())); piv.updateMatrixWorld(true); piv.attach(obj);
        return { piv, c: c.applyMatrix4(inv) };
      };
      const meshNamed = (n) => { let r = null; m.traverse((o) => { if (!r && o.isMesh && (o.name === n || o.material?.name === n)) r = o; }); return r; };
      const rm = repivot(meshNamed('elise')), rt = repivot(m.getObjectByName('rotor_tail')), rt2 = repivot(m.getObjectByName('rotor_main'));
      v.rotorMain = rm?.piv || null; v.rotorTail = rt?.piv || null; v.rotorTail2 = rt2?.piv || null;
      const cab = meshNamed('interior');
      if (cab) { cab.geometry.computeBoundingBox(); const bb = cab.geometry.boundingBox.clone().applyMatrix4(cab.matrixWorld).applyMatrix4(inv), c = bb.getCenter(new THREE.Vector3());
        v.seatPos = new THREE.Vector3(c.x + 0.3, bb.min.y - 0.15, c.z + 0.1); } // Pilot in der Kabine
      const body = new THREE.Box3();
      root.position.copy(sp); root.quaternion.copy(sq); root.updateMatrixWorld(true);
    }
    else for (const n of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) { const w = m.getObjectByName(n); if (w) { w.rotation.order = 'YXZ'; v.wheels.push({ obj: w, steer: n.includes('f') && n[6] === 'f' }); } }
    v.ready = true;
  });
  // Räder drehen (Geschwindigkeit m/s) und Vorderräder lenken (Radiant)
  v.rotor = 0; // Helikopter: Rotordrehzahl 0…1
  v.roll = (speed, dt, steer = 0) => {
    if (v.rotorMain) { v.rotorMain.rotation.y += dt * 11 * v.rotor; for (const t of [v.rotorTail, v.rotorTail2]) if (t) t.rotation.x += dt * 17 * v.rotor; } // langsam genug, dass man das Drehen sieht
    v.spin += (speed * dt) / spec.wheelR;
    for (const w of v.wheels) { w.obj.rotation.order = 'YXZ'; w.obj.rotation.x = v.spin; if (w.steer) w.obj.rotation.y = steer * 0.5; }
  };
  // Weltposition des Sitzes (für die Figur)
  v.seat = (out = new THREE.Vector3()) => (v.seatPos ? out.copy(v.seatPos) : out.set(...spec.seat)).applyMatrix4(root.matrixWorld);
  return v;
}
