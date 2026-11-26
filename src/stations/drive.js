import * as THREE from 'three';
import { MECCA_CITY as T } from '../content/hajj.js';
import { buildHejaz, roadX, D } from '../world/hejaz.js';
import { bus } from '../world/props.js';
import { createLife } from '../world/life.js';
import { REST } from '../content/life.js';
import { clock } from '../life/clock.js';
import { cityNight } from '../world/cityscape.js';
import { makeVehicle, specOf, isAir } from '../life/vehicles.js';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';

// Fahrt zwischen Mekka und Medina: Kamera hinter dem Fahrzeug auf der Autobahn, die Landschaft zieht vorbei,
// am Ende kommt man in den Straßen der anderen Stadt an. „Ankommen“ oder Antippen überspringt.
// Mit dem Bus: auf halbem Weg Rastplatz mit Oasen-Moschee (Knopf; ist ein Gebet fällig, hält der Bus von selbst).
// Mit einem ausgeliehenen Fahrzeug (vehicle = Auto/Motorrad/Bus): man sitzt sichtbar darin, Räder drehen sich, Ankunft im Fahrzeug.
// Die Spieluhr läuft weiter.
export function create(ctx, { from = 'mecca', to = 'medina', resume = 0, vehicle = null } = {}) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(clock.hour); sky.state.shadowSize = 80;
  ui.el.day.textContent = T.driving;
  ui.el.title.textContent = to === 'medina' ? 'Nach Medina' : 'Nach Mekka';
  ui.el.stick.classList.add('off');
  ui.info(`<p>${T.driveInfo}</p>`);
  const land = buildHejaz(world, engine, { pilgrims: false });
  const veh = vehicle ? makeVehicle(world, vehicle) : null;
  const coach = veh ? veh.root : bus(world, 0, 0, 0, { livery: true }).group;
  // eigene Figur sitzt im ausgeliehenen Fahrzeug
  const fig = veh ? createFigure(world, { color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, covered: ctx.profile?.gender === 'f', ring: false, models: peopleModels() }) : null;
  fig?.pose(specOf(vehicle).pose);
  const life = createLife(ctx, { kind: 'desert', height: 20 });
  const Z0 = -560, Z1 = -D + 760, z0 = to === 'medina' ? Z0 : Z1, z1 = to === 'medina' ? Z1 : Z0, LEN = Math.abs(z1 - z0);
  let s = resume, done = false, stopped = false, prevX = null, prevZ = null;
  const SR = 0.5; // Rastplatz auf halbem Weg
  const restNow = () => { if (done || stopped) return; stopped = true; done = true; ctx.restStop?.(from, to); };
  const arrive = () => { if (done) return; done = true; ctx.city?.(veh ? 'car' : 'bus', to); };
  ui.actions([...(!veh && s < SR ? [{ label: REST.stop, onClick: restNow }] : []), { label: T.skip, kind: 'primary', onClick: arrive }]);
  ctx.input.onTap = arrive;
  const cam = engine.camera, cp = new THREE.Vector3(), lk = new THREE.Vector3(), seat = new THREE.Vector3(); let first = true;
  const camBack = veh ? Math.max(9, specOf(vehicle).cam[0] * 1.6) : 26, camUp = veh ? 4.5 : 11;
  return {
    update(dt) {
      const s0 = s; s = Math.min(1, s + dt * 65 / LEN); // ca. 65 m/s (verkleinert)
      clock.advance(dt); sky.state.artificial = 0.85; sky.setHour(clock.hour); cityNight.value = clock.night;
      if (!veh && s0 < SR && s >= SR) { const p = clock.current(to === 'medina' ? 'mecca' : 'medina'); if (p && !clock.prayed(p) && !resume) { ui.toast(REST.prayerStop, 3500); restNow(); return; } ui.actions([{ label: T.skip, kind: 'primary', onClick: arrive }]); }
      const z = z0 + (z1 - z0) * s, x = roadX(z) + (to === 'medina' ? -3.5 : 3.5), zn = z + Math.sign(z1 - z0) * 8, xn = roadX(zn) + (to === 'medina' ? -3.5 : 3.5);
      coach.position.set(x, veh && isAir(vehicle) ? 70 : 0.15, z); coach.rotation.y = Math.atan2(xn - x, zn - z); // Helikopter fliegt über der Autobahn
      if (veh) veh.rotor = 1;
      if (veh) { // Räder drehen sich mit der Geschwindigkeit, Figur sitzt im Sitz
        const sp = prevX == null ? 0 : Math.hypot(x - prevX, z - prevZ) / Math.max(dt, 1e-3); prevX = x; prevZ = z;
        veh.roll(sp, dt); coach.updateMatrixWorld(true); veh.seat(seat); fig.root.position.copy(seat); fig.root.rotation.y = coach.rotation.y; fig.update(dt, 0);
      }
      const back = new THREE.Vector3(x - xn, 0, z - zn).normalize();
      const k = first ? 1 : 1 - Math.exp(-dt * 3); first = false;
      cp.lerp(new THREE.Vector3(x + back.x * camBack + (veh ? 2 : 6), camUp, z + back.z * camBack), k); lk.lerp(new THREE.Vector3(xn, veh ? 1.2 : 2.5, zn), k);
      cam.position.copy(cp); cam.lookAt(lk);
      sky.state.focus.set(x, 0, z);
      ui.counter(`${Math.round((1 - s) * 340)} km`);
      land.update(dt); life.update(dt);
      if (s >= 1) arrive();
    },
    dispose() { cityNight.value = 0; ctx.input.onTap = null; ui.el.stick.classList.remove('off'); ui.counter(''); },
  };
}
