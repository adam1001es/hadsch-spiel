import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Fahrzeuge des Lebensspiels (Amanah-Ausleihe): Autos (public/assets/models/cars, CC BY 4.0 Comrade1280),
// Motorrad (vehicles/motorbike.glb, CC BY 4.0 Yakpower), Bus (bus.glb, CC BY 4.0 agungkuncoro13021986).
// Alle mit Front nach +z, Boden y = 0. makeVehicle(kind) gibt sofort eine Gruppe zurück; das Modell wird nachgeladen.
// Räder: Autos haben wheel_fl/fr/rl/rr (Drehpunkt in der Radmitte); beim Motorrad werden die Räder aus der Form erkannt.
export const CAR_KINDS = ['sedan', 'compact', 'suv', 'minivan', 'hatchback', 'wagon', 'pickup', 'offroad', 'coupe', 'sport'];
export const VEHICLE_NAME = { sedan: 'Limousine', compact: 'Kleinwagen', suv: 'SUV', minivan: 'Minivan', hatchback: 'Schrägheck', wagon: 'Kombi', pickup: 'Pickup', offroad: 'Geländewagen', coupe: 'Coupé', sport: 'Sportwagen', motorbike: 'Motorrad', bus: 'Bus' };
const CAR = { seat: [0.37, -0.14, -0.25], pose: 'drive', len: 4.4, wid: 1.9, wheelR: 0.31, vmax: 15, acc: 5, cam: [7, 2.6] };
export const SPEC = {
  motorbike: { seat: [0, 0.42, -0.25], pose: 'ride', len: 2.1, wid: 0.8, wheelR: 0.33, vmax: 17, acc: 6, cam: [5, 2.1] },
  bus: { seat: [0.75, 1.05, 4.9], pose: 'drive', len: 12.4, wid: 3, wheelR: 0.5, vmax: 11, acc: 2.5, cam: [15, 5] },
};
export const specOf = (kind) => SPEC[kind] || CAR;
const FILE = (k) => (k === 'motorbike' ? 'vehicles/motorbike.glb' : k === 'bus' ? 'bus.glb' : `cars/${k}.glb`);
const cache = {};
export const loadVehicle = (kind) => (cache[kind] ||= new GLTFLoader().loadAsync('./assets/models/' + FILE(kind)).then((g) => g.scene).catch(() => null));

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

export function makeVehicle(world, kind, { shadows = true } = {}) {
  const spec = specOf(kind);
  const root = new THREE.Group(); world.add(root);
  const v = { kind, spec, root, wheels: [], ready: false, spin: 0, name: VEHICLE_NAME[kind] || 'Auto' };
  loadVehicle(kind).then((sc) => {
    if (!sc || !root.parent) return;
    const m = sc.clone(true); root.add(m);
    m.traverse((o) => { if (o.isMesh) { o.castShadow = shadows; o.receiveShadow = true; } });
    if (kind === 'motorbike') v.wheels = findWheels(m);
    else for (const n of ['wheel_fl', 'wheel_fr', 'wheel_rl', 'wheel_rr']) { const w = m.getObjectByName(n); if (w) { w.rotation.order = 'YXZ'; v.wheels.push({ obj: w, steer: n.includes('f') && n[6] === 'f' }); } }
    v.ready = true;
  });
  // Räder drehen (Geschwindigkeit m/s) und Vorderräder lenken (Radiant)
  v.roll = (speed, dt, steer = 0) => {
    v.spin += (speed * dt) / spec.wheelR;
    for (const w of v.wheels) { w.obj.rotation.order = 'YXZ'; w.obj.rotation.x = v.spin; if (w.steer) w.obj.rotation.y = steer * 0.5; }
  };
  // Weltposition des Sitzes (für die Figur)
  v.seat = (out = new THREE.Vector3()) => out.set(...spec.seat).applyMatrix4(root.matrixWorld);
  return v;
}
