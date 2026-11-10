import * as THREE from 'three';
import { buildKaaba, KAABA } from '../world/kaaba.js';
import { buildHaram } from '../world/haram.js';
import { createCrowd, createPilgrim } from '../world/crowd.js';
import { RABBANA } from '../content/hajj.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);

// Tawaf: 7 Runden gegen den Uhrzeigersinn (von oben), Start an der grünen Linie beim Schwarzen Stein.
// Position auf dem Kreis: x = R·cos(θ), z = −R·sin(θ); θ wächst = gegen den Uhrzeigersinn, Kaaba links.
export function create(ctx, st) {
  const { engine, sky, ui, input } = ctx;
  const world = engine.world;
  sky.setHour(st.hour ?? 21);
  sky.state.artificial = 1;
  sky.state.shadowSize = 45;

  buildKaaba(world);
  const { glow } = buildHaram(world);

  const R = 17.5, th0 = KAABA.blackStoneAngle;
  let th = th0, laps = 0, done = false, istilamLap = -1, segment = '';
  const fast = st.kind !== 'umrah';
  const me = createPilgrim(world, st.kind === 'umrah' ? 0xf3f1ea : 0x7d8b99);

  const lineGeo = new THREE.PlaneGeometry(0.35, 36); lineGeo.rotateX(-Math.PI / 2);
  const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.75 }));
  line.position.set(Math.cos(th0) * 31, 0.03, -Math.sin(th0) * 31);
  line.rotation.y = Math.atan2(Math.cos(th0), -Math.sin(th0));
  world.add(line);

  const N = engine.isMobile ? 700 : 1200;
  const crowd = createCrowd(world, N);
  const ar = new Float32Array(N), aa = new Float32Array(N), av = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) { ar[i] = 14 + Math.pow(Math.random(), 1.5) * 32; aa[i] = Math.random() * TAU; av[i] = (0.9 + Math.random() * 0.7) / ar[i]; ph[i] = Math.random() * 6; }

  ui.info(`<p>${st.intro}</p>`);
  ui.hold('Gehen');

  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let first = true, time = 0;

  function setInfo(seg) {
    if (seg === segment || done) return;
    segment = seg;
    if (seg === 'yemeni') ui.info(`<p>Zwischen Rukn al-Yamani und Schwarzem Stein:</p>${ui.prayer(RABBANA)}`);
    else if (seg === 'free') ui.info('<p>Freies Dua und Dhikr, in jeder Sprache.</p>');
  }

  function finish() {
    done = true;
    ui.hold(null);
    ui.counter('7 / 7 ✓');
    ui.toast('Tawaf vollständig');
    const last = st.kind === 'wada';
    const items = [];
    if (!last) {
      items.push({ label: '2 Rak\'at hinter Maqam Ibrahim', kind: 'sunnah', onClick: (e) => { e.target.remove(); ui.toast('Gebetet'); } });
      items.push({ label: 'Zamzam trinken', kind: 'sunnah', onClick: (e) => { e.target.remove(); ui.toast('Zamzam getrunken'); } });
    }
    items.push({ label: last ? 'Hadsch abschließen' : 'Weiter', kind: 'primary', onClick: ctx.next });
    ui.info(last ? '<p>Der Abschieds-Tawaf ist vollständig.</p>' : '<p>Der Tawaf ist vollständig.</p>');
    ui.actions(items);
  }

  return {
    update(dt) {
      time += dt;
      const art = sky.art;
      for (const m of glow) m.emissiveIntensity = art * 0.55;

      if (!done && input.holding) {
        const raml = st.kind === 'umrah' && laps < 3 ? 1.2 : 1;
        th += ((fast ? 14 : 11) * raml * dt) / R;
      }
      const rel = th - th0;
      const newLaps = Math.min(7, Math.floor(rel / TAU));
      if (!done && newLaps > laps) { laps = newLaps; if (laps >= 7) { th = th0 + 7 * TAU; finish(); } else ui.toast(`Runde ${laps} ✓`); }
      if (!done) {
        ui.counter(`Runde ${laps + 1} / 7`);
        const phase = rel - laps * TAU;
        setInfo(phase > 1.5 * Math.PI ? 'yemeni' : phase > 0.3 ? 'free' : segment);
        const near = phase < 0.16 || phase > TAU - 0.1;
        if (near && istilamLap !== laps) {
          ui.actions([{ label: '✋ Bismillah, Allahu Akbar', kind: 'sunnah', onClick: () => { istilamLap = laps; ui.actions([]); ui.toast('Allahu Akbar'); } }]);
        } else if (!near && ui.el.actions.childElementCount) ui.actions([]);
      }

      const cs = Math.cos(th), sn = Math.sin(th);
      const p = new THREE.Vector3(R * cs, 0, -R * sn);
      me.group.position.copy(p);
      me.group.position.y = input.holding && !done ? Math.abs(Math.sin(time * 9)) * 0.06 : 0;
      me.group.rotation.y = Math.atan2(-sn, -cs);

      for (let i = 0; i < N; i++) {
        aa[i] += av[i] * dt;
        const a = aa[i];
        let r = ar[i];
        const da = Math.atan2(Math.sin(a - th), Math.cos(a - th));
        if (Math.abs(r - R) < 0.9 && Math.abs(da) * r < 1.2) r += r > R ? 0.9 : -0.9;
        crowd.set(i, r * Math.cos(a), Math.abs(Math.sin(time * 5 + ph[i])) * 0.04, -r * Math.sin(a), Math.atan2(-Math.sin(a), -Math.cos(a)));
      }
      crowd.commit();

      const f = new THREE.Vector3(-sn, 0, -cs), out = new THREE.Vector3(cs, 0, -sn);
      const off = f.clone().multiplyScalar(-9).addScaledVector(out, 4).applyAxisAngle(UP, input.yaw);
      off.y = 6 + input.pitch * 6;
      const look = f.clone().multiplyScalar(4).addScaledVector(out, -9).applyAxisAngle(UP, input.yaw);
      look.y = 4;
      const k = first ? 1 : 1 - Math.exp(-dt * 5);
      camPos.lerp(p.clone().add(off), k); camLook.lerp(p.clone().add(look), k); first = false;
      engine.camera.position.copy(camPos);
      engine.camera.lookAt(camLook);
    },
  };
}

// Vorschau für den Startbildschirm: Kamera kreist um die Kaaba.
export function preview(ctx) {
  const { engine, sky } = ctx;
  sky.setHour(20.5); sky.state.artificial = 1; sky.state.shadowSize = 45;
  buildKaaba(engine.world);
  const { glow } = buildHaram(engine.world);
  const N = 600, crowd = createCrowd(engine.world, N);
  const ar = [], aa = [], av = [];
  for (let i = 0; i < N; i++) { ar.push(14 + Math.random() * 30); aa.push(Math.random() * TAU); av.push(1.2 / ar[i]); }
  let t = 0;
  return {
    update(dt) {
      t += dt;
      for (const m of glow) m.emissiveIntensity = sky.art * 0.55;
      for (let i = 0; i < N; i++) { aa[i] += av[i] * dt; crowd.set(i, ar[i] * Math.cos(aa[i]), 0, -ar[i] * Math.sin(aa[i]), Math.atan2(-Math.sin(aa[i]), -Math.cos(aa[i]))); }
      crowd.commit();
      engine.camera.position.set(Math.cos(t * 0.05) * 48, 16, Math.sin(t * 0.05) * 48);
      engine.camera.lookAt(0, 7, 0);
    },
  };
}
