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
const TALL = { ...CAR, seat: [0.4, 0.12, -0.25], cam: [10.5, 4] };
export const SPEC = {
  motorbike: { seat: [0, 0.04, -0.28], pose: 'ride', len: 2.1, wid: 0.8, wheelR: 0.33, vmax: 17, acc: 6, cam: [7, 2.8] },
  suv: TALL, offroad: TALL, pickup: TALL, minivan: TALL,
  bus: { seat: [0.75, 1.05, 4.9], pose: 'drive', len: 12.4, wid: 3, wheelR: 0.5, vmax: 11, acc: 2.5, cam: [18, 6.5] },
  escooter: { seat: [0, 0.12, -0.15], pose: 'stand', len: 1.1, wid: 0.6, wheelR: 0.1, vmax: 7, acc: 4, cam: [6, 2.6] },
  bicycle: { seat: [0, 0.14, -0.2], pose: 'ride', len: 1.8, wid: 0.6, wheelR: 0.34, vmax: 7, acc: 3, cam: [6, 2.6] },
  ebike: { seat: [0, 0.16, -0.25], pose: 'ride', len: 1.9, wid: 0.6, wheelR: 0.34, vmax: 9, acc: 4, cam: [6, 2.6] },
  dirt: { seat: [0, 0.16, -0.2], pose: 'ride', len: 2.1, wid: 0.8, wheelR: 0.35, vmax: 16, acc: 7, cam: [7, 2.8], offroad: true },
  helicopter: { seat: [0.55, 0.45, 2.4], pose: 'drive', len: 11, wid: 3, wheelR: 1, vmax: 30, acc: 8, cam: [22, 8], air: true },
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
      v.rotorMain = m.getObjectByName('rotor_main'); v.rotorTail = m.getObjectByName('rotor_tail');
      // Sitz aus der Form: Kabine = Rumpf ohne Rotoren; Pilot vorne rechts in der Kabine, unter der Rotornabe nach vorn
      root.updateMatrixWorld(true); const inv = root.matrixWorld.clone().invert(), hub = new THREE.Vector3();
      v.rotorMain?.getWorldPosition(hub); hub.applyMatrix4(inv);
      const body = new THREE.Box3(); m.traverse((o) => { if (o.isMesh && !(v.rotorMain && isIn(o, v.rotorMain)) && !(v.rotorTail && isIn(o, v.rotorTail))) { const b = new THREE.Box3().setFromObject(o).applyMatrix4(inv); if (b.max.z > hub.z - 1) body.union(b); } });
      if (!body.isEmpty()) v.seatPos = new THREE.Vector3(hub.x + 0.35, body.min.y + 0.55, Math.min(body.max.z - 1.4, hub.z + 1.2));
    }
    else for (const n of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) { const w = m.getObjectByName(n); if (w) { w.rotation.order = 'YXZ'; v.wheels.push({ obj: w, steer: n.includes('f') && n[6] === 'f' }); } }
    v.ready = true;
  });
  // Räder drehen (Geschwindigkeit m/s) und Vorderräder lenken (Radiant)
  v.rotor = 0; // Helikopter: Rotordrehzahl 0…1
  v.roll = (speed, dt, steer = 0) => {
    if (v.rotorMain) { v.rotorMain.rotation.y += dt * 28 * v.rotor; if (v.rotorTail) v.rotorTail.rotation.x += dt * 40 * v.rotor; }
    v.spin += (speed * dt) / spec.wheelR;
    for (const w of v.wheels) { w.obj.rotation.order = 'YXZ'; w.obj.rotation.x = v.spin; if (w.steer) w.obj.rotation.y = steer * 0.5; }
  };
  // Weltposition des Sitzes (für die Figur)
  v.seat = (out = new THREE.Vector3()) => (v.seatPos ? out.copy(v.seatPos) : out.set(...spec.seat)).applyMatrix4(root.matrixWorld);
  return v;
}
