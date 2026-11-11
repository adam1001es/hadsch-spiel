import * as THREE from 'three';
import { buildKaaba, KAABA } from '../world/kaaba.js';
import { buildHaram } from '../world/haram.js';
import { createCrowd } from '../world/crowd.js';
import { RABBANA, TEXT } from '../content/hajj.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, pointGoal, holdAction, rakatSteps, pick, sunnah, createAutopilot } from '../core/kit.js';

const TAU = Math.PI * 2;
const T = TEXT.tawaf;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Tawaf: Der Spieler läuft selbst um die Kaaba. Winkel θ wie im ganzen Spiel: x = r·cos θ, z = −r·sin θ.
// θ wächst = gegen den Uhrzeigersinn (von oben) = Kaaba links. Runden zählen an der grünen Linie (Schwarzer Stein).
export function create(ctx, st) {
  const { engine, sky, ui, input } = ctx;
  const world = engine.world;
  sky.setHour(st.hour ?? 21);
  sky.state.artificial = 1;
  sky.state.shadowSize = 45;

  buildKaaba(world);
  const { glow } = buildHaram(world);
  const { w, d } = KAABA;
  const th0 = KAABA.blackStoneAngle;

  // Grüne Linie vom Schwarzen Stein nach außen
  const lineGeo = new THREE.PlaneGeometry(0.35, 40); lineGeo.rotateX(-Math.PI / 2);
  const line = new THREE.Mesh(lineGeo, new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.8 }));
  line.position.set(Math.cos(th0) * 28, 0.03, -Math.sin(th0) * 28);
  line.rotation.y = Math.atan2(Math.cos(th0), -Math.sin(th0));
  world.add(line);

  // Zamzam-Spender am Rand des Mataf
  const zamzam = new THREE.Group(); world.add(zamzam);
  const steel = new THREE.MeshStandardMaterial({ color: 0xcfd3d6, metalness: 1, roughness: 0.25 });
  const zth = th0 + 0.55, zr = 41;
  for (let i = 0; i < 6; i++) {
    const a = zth + (i - 2.5) * 0.035;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 20), steel);
    c.position.set(Math.cos(a) * zr, 0.9, -Math.sin(a) * zr); c.castShadow = true;
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 0.5), new THREE.MeshStandardMaterial({ color: 0x2b3b36, roughness: 0.6 }));
    stand.position.set(c.position.x, 0.225, c.position.z);
    zamzam.add(c, stand);
  }
  zamzam.userData.pick = 'zamzam';

  // Kollision: Kaaba, Hijr-Mauer, Maqam, Mataf-Rand
  const hx = w / 2;
  const colliders = [
    { type: 'box', x: 0, z: 0, hw: w / 2 + 0.25, hd: d / 2 + 0.25 },
    { type: 'circle', x: -1.5, z: d / 2 + 9, r: 1.0 },
    { type: 'inside', x: 0, z: 0, r: 48 },
    { type: 'fn', fn(p, r) {
      const dx = p.x - hx, dz = p.z, dd = Math.hypot(dx, dz), a = Math.atan2(dz, dx);
      if (Math.abs(a) > Math.PI / 3 || dd < 6.6 - r || dd > 7.4 + r) return;
      const to = dd < 7.0 ? 6.6 - r : 7.4 + r;
      p.x = hx + Math.cos(a) * to; p.z = Math.sin(a) * to;
    } },
  ];
  const inHijr = (p) => p.x > hx + 0.2 && Math.hypot(p.x - hx, p.z) < 6.6;

  // Start kurz vor der grünen Linie, Blick in Laufrichtung (gegen den Uhrzeigersinn)
  const R0 = 11, thS = th0 - 0.12;
  const sx = R0 * Math.cos(thS), sz = -R0 * Math.sin(thS);
  const dirX = -Math.sin(thS), dirZ = -Math.cos(thS); // Tangente in Richtung wachsendes θ
  const player = createPlayer(ctx, { x: sx, z: sz, heading: Math.atan2(dirX, dirZ), color: st.kind === 'umrah' ? 0xf3f1ea : 0x6f7f8e, speed: 3, fastSpeed: 4.4, colliders });
  input.yaw = Math.atan2(dirX, dirZ) + 0.5; // etwas zur Kaaba gedreht

  // Menge
  const N = engine.isMobile ? 650 : 1100;
  const crowd = createCrowd(world, N, { ihram: st.kind !== 'ifada' && st.kind !== 'wada' ? true : false, men: 0.6 });
  const ar = new Float32Array(N), aa = new Float32Array(N), av = new Float32Array(N), ph = new Float32Array(N);
  for (let i = 0; i < N; i++) { ar[i] = 10 + Math.pow(Math.random(), 1.4) * 36; aa[i] = Math.random() * TAU; av[i] = (1.0 + Math.random() * 0.6) / ar[i]; ph[i] = Math.random() * 6; }

  const flow = createFlow();
  const mMaqam = createMarker(world, { r: 1.8 });
  const mZam = createMarker(world, { color: 0x7fc8ff, r: 1.8 });
  const mExit = createMarker(world, { color: 0x35d07f, r: 2.2 });

  // Zustand
  let phi = Math.atan2(-sz, sx); // abgewickelter Winkel
  let start = phi + wrap(th0 - phi); // Winkel der grünen Linie, nahe am Startwinkel
  let prog = phi - start, maxProg = prog, laps = 0, done = false, invalid = false, wasInHijr = false;
  let istilamCount = 0, istilamLap = -1, segment = '', wrongT = 0, action = null, time = 0;

  ui.info(`<p>${st.intro}</p><p class="tr">${T.start}</p>`);
  ui.goal('Grüne Linie: Schwarzer Stein', null);
  if (st.kind === 'umrah') setTimeout(() => !flow.dead && ui.hint(TEXT.controls, 4200), 600);

  function setInfo(seg) {
    if (seg === segment || done) return;
    segment = seg;
    if (seg === 'yemeni') ui.info(`<p>${T.yemeni}</p>${ui.prayer(RABBANA)}`);
    else if (seg === 'free') ui.info(`<p>${T.free}</p>${st.kind === 'umrah' && laps < 3 ? `<p class="tr">${T.raml}</p>` : ''}`);
  }

  function doIstilam() {
    if (istilamLap === laps || done) return;
    istilamLap = laps; istilamCount++;
    if (istilamCount >= 7) sunnah(ctx, 'istilam');
    player.fig.pose('istilam'); setTimeout(() => !flow.dead && player.fig.pose('stand'), 900);
    ui.toast('Bismillah, Allahu Akbar');
    ui.prompt(null);
  }
  input.onTap = (x, y) => {
    const h = pick(engine, x, y, [zamzam]);
    if (h && player.distTo(h.point.x, h.point.z) < 4 && done) drink();
  };

  function drink() {
    if (ctx.progress.sunnah.has('zamzam') && !mZam.visible) return;
    mZam.hide(); ui.prompt(null);
    player.fig.pose('istilam');
    setTimeout(() => { if (flow.dead) return; player.fig.pose('stand'); ui.toast('Zamzam getrunken'); sunnah(ctx, 'zamzam'); }, 1400);
  }

  async function after() {
    const last = st.kind === 'wada';
    ui.info(`<p>${last ? T.doneWada : T.done}</p>${last ? '' : `<p class="tr">${T.after}</p>`}`);
    if (last) {
      mExit.show(Math.cos(th0 + 0.25) * 38, -Math.sin(th0 + 0.25) * 38);
      await flow.until(() => mExit.inside(player.pos));
      ctx.next(); return;
    }
    mMaqam.show(-1.5, d / 2 + 12.2);
    mZam.show(Math.cos(zth) * (zr - 2.5), -Math.sin(zth) * (zr - 2.5));
    mExit.show(Math.cos(th0 + 0.2) * 44, -Math.sin(th0 + 0.2) * 44);
    await flow.until(() => mExit.inside(player.pos));
    ctx.next();
  }

  // Autopilot (optional, ab Runde 3): läuft außen um Kaaba und Hijr Ismail herum (Radius 14,5 m)
  const auto = createAutopilot(ctx, {
    available: () => laps >= 2 && !done,
    steer() {
      const p = player.pos, th = Math.atan2(-p.z, p.x) + 0.3, R = 14.5;
      return { x: R * Math.cos(th) - p.x, z: -R * Math.sin(th) - p.z, fast: st.kind === 'umrah' && laps < 3 };
    },
  });

  function finish() {
    auto.finish();
    done = true;
    ui.counter('7 / 7 ✓');
    ui.toast(st.kind === 'wada' ? 'Abschieds-Tawaf vollständig' : 'Tawaf vollständig', 2400);
    ui.prompt(null);
    after();
  }

  return {
    update(dt) {
      time += dt;
      flow.update(dt);
      for (const m of glow) m.emissiveIntensity = sky.art * 0.55;
      auto.update(dt);
      player.update(dt);
      action?.update(dt);
      mMaqam.update(dt); mZam.update(dt); mExit.update(dt);
      const p = player.pos;

      if (!done) {
        // Winkel abwickeln
        const th = Math.atan2(-p.z, p.x);
        phi += wrap(th - phi);
        prog = phi - start;
        if (prog < maxProg - 0.35 && player.moving > 0.3) { wrongT += dt; if (wrongT > 0.6) { ui.hint(T.wrongWay); wrongT = -3; } }
        else if (wrongT > 0) wrongT = 0;
        if (prog > maxProg) maxProg = prog;

        // Hijr Ismail
        const hij = inHijr(p);
        if (hij && !wasInHijr && maxProg > 0) { invalid = true; ui.hint(T.hijrIn, 3200); }
        wasInHijr = hij;

        const newLaps = Math.min(7, Math.floor(maxProg / TAU));
        if (newLaps > laps) {
          if (invalid) {
            invalid = false; start += TAU; maxProg -= TAU; prog -= TAU;
            ui.hint(T.hijrLap, 3600);
          } else {
            laps = newLaps;
            if (laps >= 7) finish(); else ui.toast(`Runde ${laps} ✓`);
          }
        }

        if (!done) {
          if (maxProg < 0) { ui.counter('Start: grüne Linie'); pointGoal(ui, player, 'Grüne Linie', Math.cos(th0) * 11, -Math.sin(th0) * 11); }
          else { ui.counter(`Runde ${laps + 1} / 7`); ui.goal(st.kind === 'umrah' && laps < 3 ? `Runde ${laps + 1}: Raml – zügig gehen` : 'Kaaba links halten', null); }
          const phase = ((prog % TAU) + TAU) % TAU;
          setInfo(maxProg < 0 ? segment : phase > 1.5 * Math.PI ? 'yemeni' : phase > 0.3 ? 'free' : segment);
          // Istilam an der Linie (kurz davor bis kurz danach)
          const near = (phase < 0.14 || phase > TAU - 0.1) && Math.hypot(p.x, p.z) < 30;
          if (near && istilamLap !== laps) ui.prompt(T.istilam, doIstilam, { sunnah: true });
          else ui.prompt(null);
        }
      } else {
        // Nach dem Tawaf: Orte für Sunnah
        if (!action && mMaqam.inside(p)) {
          ui.prompt(T.maqamPray, () => {
            ui.prompt(null);
            player.heading = Math.atan2(-p.x, -p.z); // Gesicht zur Kaaba
            action = holdAction(ctx, player, { label: 'Beten', steps: rakatSteps(2) });
          }, { sunnah: true });
        } else if (!action && mZam.inside(p, 1)) ui.prompt(T.zamzamDrink, drink, { sunnah: true });
        else if (!action) ui.prompt(null);
        if (action?.done) { action = null; mMaqam.hide(); sunnah(ctx, 'maqam'); ui.toast('2 Rak\'at gebetet'); }
        const target = mMaqam.visible ? [T.maqamGoal, -1.5, d / 2 + 12.2] : mZam.visible ? [T.zamzamGoal, Math.cos(zth) * (zr - 2.5), -Math.sin(zth) * (zr - 2.5)] : [T.exitGoal, mExit.group.position.x, mExit.group.position.z];
        pointGoal(ui, player, target[0], target[1], target[2]);
      }

      // Menge: kreist, weicht dem Spieler (und der Sichtlinie der Kamera) aus
      const cam = engine.camera.position, cx = cam.x - p.x, cz = cam.z - p.z, cl2 = cx * cx + cz * cz || 1;
      for (let i = 0; i < N; i++) {
        aa[i] += av[i] * dt;
        const a = aa[i];
        let x = ar[i] * Math.cos(a), z = -ar[i] * Math.sin(a);
        const dx = x - p.x, dz = z - p.z, dd = Math.hypot(dx, dz);
        if (dd < 1.1) { x = p.x + (dx / (dd || 1)) * 1.1; z = p.z + (dz / (dd || 1)) * 1.1; }
        else {
          // Sichtlinie Kamera → Spieler freihalten
          const t = Math.max(0, Math.min(1, (dx * cx + dz * cz) / cl2));
          const qx = x - (p.x + cx * t), qz = z - (p.z + cz * t), qd = Math.hypot(qx, qz);
          if (t > 0.05 && qd < 0.8) { x += (qx / (qd || 1)) * (0.8 - qd); z += (qz / (qd || 1)) * (0.8 - qd); }
        }
        if (x > -w / 2 - 0.4 && x < w / 2 + 0.4 && z > -d / 2 - 0.4 && z < d / 2 + 0.4) z += z > 0 ? 1.5 : -1.5;
        crowd.set(i, x, Math.abs(Math.sin(time * 5 + ph[i])) * 0.04, z, Math.atan2(-Math.sin(a), -Math.cos(a)));
      }
      crowd.commit();
    },
    dispose() { flow.dispose(); },
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
  for (let i = 0; i < N; i++) { ar.push(10 + Math.random() * 32); aa.push(Math.random() * TAU); av.push(1.2 / ar[i]); }
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
