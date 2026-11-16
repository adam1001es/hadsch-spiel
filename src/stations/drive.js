import * as THREE from 'three';
import { MECCA_CITY as T } from '../content/hajj.js';
import { buildHejaz, roadX, D } from '../world/hejaz.js';
import { bus } from '../world/props.js';
import { createLife } from '../world/life.js';
import { REST } from '../content/life.js';
import { clock } from '../life/clock.js';
import { cityNight } from '../world/cityscape.js';

// Busfahrt zwischen Mekka und Medina: Kamera hinter dem Bus auf der Autobahn, die Landschaft zieht vorbei,
// am Ende kommt man in den Straßen der anderen Stadt an. „Ankommen“ oder Antippen überspringt.
// Auf halbem Weg: Rastplatz mit Oasen-Moschee (Knopf; ist ein Gebet fällig, hält der Bus von selbst). Die Spieluhr läuft weiter.
export function create(ctx, { from = 'mecca', to = 'medina', resume = 0 } = {}) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(clock.hour); sky.state.shadowSize = 80;
  ui.el.day.textContent = T.driving;
  ui.el.title.textContent = to === 'medina' ? 'Nach Medina' : 'Nach Mekka';
  ui.el.stick.classList.add('off');
  ui.info(`<p>${T.driveInfo}</p>`);
  const land = buildHejaz(world, engine, { pilgrims: false });
  const coach = bus(world, 0, 0).group;
  const life = createLife(ctx, { kind: 'desert', height: 20 });
  const Z0 = -560, Z1 = -D + 760, z0 = to === 'medina' ? Z0 : Z1, z1 = to === 'medina' ? Z1 : Z0, LEN = Math.abs(z1 - z0);
  let s = resume, done = false, stopped = false;
  const SR = 0.5; // Rastplatz auf halbem Weg
  const restNow = () => { if (done || stopped) return; stopped = true; done = true; ctx.restStop?.(from, to); };
  const arrive = () => { if (done) return; done = true; ctx.city?.('bus', to); };
  ui.actions([...(s < SR ? [{ label: REST.stop, onClick: restNow }] : []), { label: T.skip, kind: 'primary', onClick: arrive }]);
  ctx.input.onTap = arrive;
  const cam = engine.camera, cp = new THREE.Vector3(), lk = new THREE.Vector3(); let first = true;
  return {
    update(dt) {
      const s0 = s; s = Math.min(1, s + dt * 65 / LEN); // ca. 65 m/s (verkleinert)
      clock.advance(dt); sky.state.artificial = 0.85; sky.setHour(clock.hour); cityNight.value = clock.night;
      if (s0 < SR && s >= SR) { const p = clock.current(to === 'medina' ? 'mecca' : 'medina'); if (p && !clock.prayed(p) && !resume) { ui.toast(REST.prayerStop, 3500); restNow(); return; } ui.actions([{ label: T.skip, kind: 'primary', onClick: arrive }]); }
      const ease = s < 0.06 ? s / 0.06 : s > 0.94 ? (1 - s) / 0.06 : 1;
      const z = z0 + (z1 - z0) * s, x = roadX(z) + (to === 'medina' ? -3.5 : 3.5), zn = z + Math.sign(z1 - z0) * 8, xn = roadX(zn) + (to === 'medina' ? -3.5 : 3.5);
      coach.position.set(x, 0.15, z); coach.rotation.y = Math.atan2(xn - x, zn - z);
      const back = new THREE.Vector3(x - xn, 0, z - zn).normalize();
      const k = first ? 1 : 1 - Math.exp(-dt * 3); first = false;
      cp.lerp(new THREE.Vector3(x + back.x * 26 + 6, 11, z + back.z * 26), k); lk.lerp(new THREE.Vector3(xn, 2.5, zn), k);
      cam.position.copy(cp); cam.lookAt(lk);
      sky.state.focus.set(x, 0, z);
      ui.counter(`${Math.round((1 - s) * 340)} km`);
      land.update(dt); life.update(dt);
      void ease;
      if (s >= 1) arrive();
    },
    dispose() { cityNight.value = 0; ctx.input.onTap = null; ui.el.stick.classList.remove('off'); ui.counter(''); },
  };
}
