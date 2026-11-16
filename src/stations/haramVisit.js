import * as THREE from 'three';
import { buildKaaba, KAABA } from '../world/kaaba.js';
import { buildHaram, matafRadius } from '../world/haram.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import { createLife } from '../world/life.js';
import { createTowers, abrajAlBait, cityNight } from '../world/cityscape.js';
import { PRAYER_UI as U } from '../content/life.js';
import { clock } from '../life/clock.js';
import { createPrayer } from '../life/prayer.js';
import { showMinimap } from '../life/minimap.js';

// Lebensspiel: frei in der Masjid al-Haram bei der Kaaba (ohne Aufgaben). Pilger gehen Tawaf; zur Zeit des Gemeinschaftsgebets
// stellen sich alle in Kreisen um die Kaaba auf und beten. Man kann jederzeit beten (zur Gebetszeit) und einen freiwilligen
// Tawaf gehen (Rundenzähler, Kaaba immer links = gegen den Uhrzeigersinn). Hinaus geht es auf den Platz vor der Haram.
export function create(ctx) {
  const { engine, sky, ui } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  ui.el.day.textContent = 'Lebensspiel'; ui.el.title.textContent = U.haramTitle;
  sky.state.shadowSize = 50;
  const { w, d } = KAABA;
  buildKaaba(world);
  const { glow } = buildHaram(world, { tower: false });
  const towers = createTowers(world); const abraj = abrajAlBait(world, towers, { x: 65, z: 338, sky }); towers.build();

  // Pilger: Tawaf (θ wächst = gegen den Uhrzeigersinn), beim Gemeinschaftsgebet Kreise um die Kaaba
  const N = mobile ? 150 : 260, crowd = createCrowd(world, N, { ihram: true, men: 0.6 });
  const TH = new Float32Array(N).map(() => Math.random() * Math.PI * 2);
  const R = new Float32Array(N).map((_, i) => 9 + Math.random() * (matafRadius(Math.cos(TH[i]), -Math.sin(TH[i])) - 14));
  const SP = new Float32Array(N).map(() => 0.9 + Math.random() * 0.4);
  const slot = []; for (let r = 8.5; slot.length < N; r += 1.15) { const n = Math.floor((2 * Math.PI * r) / 0.85); for (let k = 0; k < n && slot.length < N; k++) { const a = (k / n) * Math.PI * 2; slot.push({ r, a }); } }
  const pos = Array.from({ length: N }, (_, i) => ({ x: R[i] * Math.cos(TH[i]), z: -R[i] * Math.sin(TH[i]), ry: 0 }));

  // Kollision wie im Tawaf: Kaaba, Hijr-Mauer, Maqam, Mataf-Rand
  const hx = w / 2;
  const colliders = [
    { type: 'box', x: 0, z: 0, hw: w / 2 + 0.25, hd: d / 2 + 0.25 },
    { type: 'circle', x: -1.5, z: d / 2 + 9, r: 1.0 },
    { type: 'fn', fn(p, r) { const dd = Math.hypot(p.x, p.z), m = matafRadius(p.x, p.z) - 1.2 - r; if (dd > m) { p.x *= m / dd; p.z *= m / dd; } } },
    { type: 'fn', fn(p, r) {
      const dx = p.x - hx, dz = p.z, dd = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
      if (Math.abs(a) > Math.PI / 3 || dd < 6.6 - r || dd > 7.4 + r) return;
      const to = dd < 7.0 ? 6.6 - r : 7.4 + r; p.x = hx + Math.cos(a) * to; p.z = Math.sin(a) * to;
    } },
  ];
  const player = createPlayer(ctx, { x: 0, z: 30, heading: Math.PI, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, speed: 2.4, fastSpeed: 3.8, colliders, surface: 'marble' });
  const life = createLife(ctx, { kind: 'haram' });
  const prayer = createPrayer(ctx, { city: 'mecca', player, qibla: () => ({ x: 0, z: 0 }) });

  // Knöpfe: Beten (zur Gebetszeit) und hinaus
  let lastKey = '';
  const actions = () => {
    const p = prayer.due, key = (p ? p.id : '-') + (prayer.busy ? 'b' : '');
    if (key === lastKey) return; lastKey = key;
    ui.actions([...(p && !prayer.busy ? [{ label: U.pray(p), kind: 'primary', onClick: () => prayer.start(prayer.due) }] : []), { label: U.leaveHaram, onClick: () => ctx.city?.('haram', 'mecca') }]);
  };
  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${U.haramIntro}</p><p class="small">${U.note}</p>`);

  // freiwilliger Tawaf: Runden zählen, wenn man nah an der Kaaba gegen den Uhrzeigersinn geht
  let th = Math.atan2(-player.pos.z, player.pos.x), acc = 0, laps = 0;
  const map = showMinimap(ctx, {
    title: 'Karte · Masjid al-Haram', city: 'mecca', bounds: { x0: -70, x1: 70, z0: -70, z1: 70 },
    areas: [], shapes: [{ t: 'circle', x: 0, z: 0, r: 52, c: '#f4f1ea', label: '' }, { t: 'rect', x0: -w / 2, x1: w / 2, z0: -d / 2, z1: d / 2, c: '#111', label: '' }],
    pois: [{ x: 0, z: 9, icon: '🕋', label: 'Kaaba' }, { x: -1.5, z: d / 2 + 9, icon: '⬜', label: 'Maqam Ibrahim' }, { x: 0, z: 45, icon: '🚪', label: 'Ausgang (Süden)' }],
  });
  let wasJ = false;

  return {
    update(dt) {
      prayer.update(dt);
      player.update(dt);
      actions();
      const night = clock.night; cityNight.value = night;
      for (const m of glow) m.emissiveIntensity = sky.art * 0.55;
      abraj.update(night);
      // Pilger bewegen: Tawaf oder Gebetskreise
      const jm = !!prayer.jamaah;
      if (jm !== wasJ) { wasJ = jm; if (jm) ui.toast('Alle stellen sich zum Gebet in Kreisen um die Kaaba auf.', 3500); }
      const k = Math.min(1, dt * 1.5), cyc = (performance.now() / 1000) % 8 / 8;
      for (let i = 0; i < N; i++) {
        const P = pos[i];
        if (jm) { const s = slot[i]; const tx = Math.cos(s.a) * s.r, tz = -Math.sin(s.a) * s.r; P.x += (tx - P.x) * k; P.z += (tz - P.z) * k; P.ry = Math.atan2(-P.x, -P.z); }
        else { TH[i] += (dt * SP[i]) / R[i]; const tx = R[i] * Math.cos(TH[i]), tz = -R[i] * Math.sin(TH[i]); P.x += (tx - P.x) * k * 2; P.z += (tz - P.z) * k * 2; P.ry = Math.atan2(-Math.sin(TH[i]), -Math.cos(TH[i])); }
        const sy = jm && Math.hypot(P.x - Math.cos(slot[i].a) * slot[i].r, P.z + Math.sin(slot[i].a) * slot[i].r) < 0.5 ? (cyc > 0.45 && cyc < 0.85 ? 0.62 : 1) : 1;
        crowd.set(i, P.x, 0, P.z, P.ry, sy);
      }
      crowd.commit();
      life.update(dt);
      // Tawaf-Runden (θ wächst gegen den Uhrzeigersinn); nur innerhalb des Mataf nahe der Kaaba
      const t2 = Math.atan2(-player.pos.z, player.pos.x), dth = Math.atan2(Math.sin(t2 - th), Math.cos(t2 - th)); th = t2;
      if (Math.hypot(player.pos.x, player.pos.z) < 30 && !prayer.busy) {
        acc += dth;
        if (acc < -0.6) acc = Math.max(acc, -0.6); // rückwärts zählt nicht
        if (acc >= Math.PI * 2) { acc -= Math.PI * 2; laps++; if (laps >= 7) { ui.toast(U.tawafDone, 3500); laps = 0; ui.counter(''); } else ui.counter(U.tawafLap(laps + 1)); }
        else if (acc > 0.5 && !laps) ui.counter(U.tawafLap(1));
      }
      map.update();
    },
    dispose() { prayer.dispose(); map.dispose(); cityNight.value = 0; ui.counter(''); },
  };
}
