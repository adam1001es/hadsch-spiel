import * as THREE from 'three';
import { TEXT } from '../content/hajj.js';
import { pbr } from '../world/assets.js';
import { sign } from '../world/props.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, goTo, duaFacing, pointGoal, sunnah, viewLine, clearView, createAutopilot, autoAfter } from '../core/kit.js';

const T = TEXT.jamarat;
// Jede Dschamra: lange ovale Wand (Stadion-Form, ca. 26 m) in einem Becken mit niedrigem Rand. Wand entlang x.
const A = 12.2, WALL_R = 0.8, WALL_H = 22, BASIN_R = 5, RIM_R = 5.7, RIM_H = 1.2;
const POS = { ula: 0, wusta: -75, aqaba: -150 };
const QIBLA = { x: -3000, z: -500 };
const G = 9.81;

// Abstand eines Punktes zur Mittellinie (Segment −A…A auf der x-Achse) einer Dschamra bei z0
const segDist = (x, z, z0) => Math.hypot(x - Math.max(-A, Math.min(A, x)), z - z0);

function stadium(a, r) {
  const s = new THREE.Shape();
  s.absarc(a, 0, r, -Math.PI / 2, Math.PI / 2, false);
  s.absarc(-a, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return s;
}

export function create(ctx, st) {
  const { engine, sky, ui, input } = ctx;
  const world = engine.world;
  const list = st.list || ['aqaba'];
  const firstDay = list.length === 1;
  sky.setHour(st.hour ?? 9);
  sky.state.shadowSize = 50;

  // Brückenebene: Boden, Decke auf Säulen
  const zMin = Math.min(...list.map((k) => POS[k])) - 30, zMax = Math.max(...list.map((k) => POS[k])) + 40;
  const len = zMax - zMin, zc = (zMin + zMax) / 2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(80, len), new THREE.MeshStandardMaterial({ ...pbr('terrazzo', [80 / 2, len / 2]), roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.position.z = zc; floor.receiveShadow = true; world.add(floor);
  const concrete = new THREE.MeshStandardMaterial({ ...pbr('concrete', [6, 6]), roughness: 1 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(80, 1.2, len), concrete); roof.position.set(0, 12.6, zc); roof.castShadow = roof.receiveShadow = true; world.add(roof);
  for (let z = zMin + 10; z < zMax; z += 18) for (const x of [-34, -22, 22, 34]) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 16), concrete); c.position.set(x, 6, z); c.castShadow = true; world.add(c);
  }
  // Beleuchtung unter der Decke: Leuchtfelder + Füll-Licht (die echte Brücke ist hell erleuchtet)
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff3dc, emissiveIntensity: 1.6 });
  for (let z = zMin + 6; z < zMax; z += 8) for (const x of [-28, -12, 12, 28]) {
    const lp = new THREE.Mesh(new THREE.PlaneGeometry(4, 1.2), lampMat); lp.rotation.x = Math.PI / 2; lp.position.set(x, 11.98, z); world.add(lp);
  }
  const fill = new THREE.HemisphereLight(0xfff6e8, 0x8a8170, 1.6); world.add(fill);
  for (const k of list) { const pl = new THREE.PointLight(0xfff0d8, 220, 45, 1.4); pl.position.set(0, 11, POS[k] + 9); world.add(pl); }
  // Geländer an den Seiten
  for (const x of [-40, 40]) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, len), new THREE.MeshStandardMaterial({ color: 0xb8bcc0, metalness: 0.6, roughness: 0.4 })); r.position.set(x, 0.55, zc); world.add(r); }
  // Boden unter der Brücke (Tal), damit der Blick nach außen nicht ins Leere geht
  const under = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), new THREE.MeshStandardMaterial({ ...pbr('sand', [300, 300]), roughness: 1 }));
  under.rotation.x = -Math.PI / 2; under.position.y = -12; world.add(under);

  // Dschamarat
  const wallMat = new THREE.MeshStandardMaterial({ ...pbr('concrete', [3, 6]), color: 0xd8d2c8, roughness: 1 });
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xc9c2b4, roughness: 0.6 });
  const basinMat = new THREE.MeshStandardMaterial({ color: 0x8f877a, roughness: 1 });
  for (const k of list) {
    const z0 = POS[k];
    const wg = new THREE.ExtrudeGeometry(stadium(A, WALL_R), { depth: WALL_H + 13, bevelEnabled: false, curveSegments: 16 });
    wg.rotateX(-Math.PI / 2);
    const wall = new THREE.Mesh(wg, wallMat); wall.position.set(0, -0.5, z0); wall.castShadow = wall.receiveShadow = true; world.add(wall);
    const rimShape = stadium(A, RIM_R); rimShape.holes.push(new THREE.Path(stadium(A, BASIN_R).getPoints(24)));
    const rg = new THREE.ExtrudeGeometry(rimShape, { depth: RIM_H, bevelEnabled: false, curveSegments: 20 }); rg.rotateX(-Math.PI / 2);
    const rim = new THREE.Mesh(rg, rimMat); rim.position.set(0, 0, z0); rim.castShadow = rim.receiveShadow = true; world.add(rim);
    const bg = new THREE.ShapeGeometry(stadium(A, BASIN_R), 20); bg.rotateX(-Math.PI / 2);
    const basin = new THREE.Mesh(bg, basinMat); basin.position.set(0, 0.03, z0); basin.receiveShadow = true; world.add(basin);
    const [ar, de] = T.names[k];
    sign(world, 0, z0 + 1.2, 0, [ar, de], { w: 9, h: 2, y: 9.5 });
  }

  // Pilger am Beckenrand
  const N = engine.isMobile ? 260 : 420;
  const crowd = createCrowd(world, N, { ihram: firstDay });
  const cs = [];
  for (let i = 0; i < N; i++) {
    const k = list[i % list.length], z0 = POS[k];
    const side = Math.random() < 0.5 ? 1 : -1;
    let x = (Math.random() * 2 - 1) * (A + 3);
    if (side > 0 && Math.abs(x) < 3.5) x += x < 0 ? -4 : 4; // Platz für den Spieler frei lassen
    const z = z0 + side * (RIM_R + 0.6 + Math.random() * 4);
    cs.push([x, z, side > 0 ? Math.PI : 0, Math.random() * 6]);
  }

  const colliders = [{ type: 'rect', x0: -39, x1: 39, z0: zMin + 1, z1: zMax - 1 }];
  for (const k of list) colliders.push({ type: 'fn', fn(p, r) {
    const z0 = POS[k], cx = Math.max(-A, Math.min(A, p.x)), dx = p.x - cx, dz = p.z - z0, d = Math.hypot(dx, dz), m = RIM_R + r;
    if (d < m && d > 1e-6) { p.x = cx + (dx / d) * m; p.z = z0 + (dz / d) * m; }
  } });
  for (let z = zMin + 10; z < zMax; z += 18) for (const x of [-34, -22, 22, 34]) colliders.push({ type: 'circle', x, z, r: 0.8 });

  const player = createPlayer(ctx, { x: 2, z: POS[list[0]] + 26, heading: Math.PI, color: firstDay ? 0xf6f4ee : 0x6f7f8e, speed: 3.2, fastSpeed: 5, colliders, surface: 'marble' });
  player.fig.skinM.color.setHex(0xb07a4f);

  // Wurf: Stein, Flugbahn-Vorschau
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x7d7468, roughness: 0.9 });
  const stones = [];
  const arcPts = new Float32Array(40 * 3);
  const arcGeo = new THREE.BufferGeometry(); arcGeo.setAttribute('position', new THREE.BufferAttribute(arcPts, 3));
  const arc = new THREE.Points(arcGeo, new THREE.PointsMaterial({ color: 0xffe6a0, size: 0.14, transparent: true, opacity: 0.9, depthWrite: false }));
  arc.visible = false; world.add(arc);

  let cur = 0, valid = 0, canThrow = false, talbiyahEnded = !firstDay;
  const flow = createFlow();
  const marker = createMarker(world, { r: 1.8 });

  function launchParams(aim) {
    const power = Math.max(0, Math.min(1, aim.dy / (window.innerHeight * 0.32)));
    const yaw = player.viewYaw - aim.dx * 0.0035;
    const v = 4 + power * 11, el = 0.6;
    return { dir: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)), v, el };
  }
  function origin() { return player.pos.clone().add(new THREE.Vector3(0, 1.9, 0)); }

  // Ergebnis der Bahn vorausberechnen: 'hit' (Wand/Becken), 'short', 'long', 'miss'
  function simulate(p0, dir, v, el, out) {
    const vx = dir.x * v * Math.cos(el), vz = dir.z * v * Math.cos(el), vy = v * Math.sin(el);
    const z0 = POS[list[cur]];
    let res = 'miss', n = 0;
    for (let t = 0; t < 4; t += 0.025) {
      const x = p0.x + vx * t, y = p0.y + vy * t - 0.5 * G * t * t, z = p0.z + vz * t;
      if (out && n < 40 && Math.round(t / 0.025) % 3 === 0) { out[n * 3] = x; out[n * 3 + 1] = y; out[n * 3 + 2] = z; n++; }
      const d = segDist(x, z, z0);
      if (d < WALL_R && y < WALL_H) { res = 'hit'; break; }
      if (y <= RIM_H && d < RIM_R && d > BASIN_R) { res = 'hit'; break; } // Rand → fällt meist hinein
      if (y <= 0.05) {
        if (d < BASIN_R) res = 'hit';
        else { const toward = (z - z0) * (p0.z - z0) > 0 && Math.abs(z - z0) > 0.1; res = toward ? 'short' : 'long'; if (Math.abs(x) > A + RIM_R) res = 'miss'; }
        break;
      }
    }
    if (out) { for (let i = n; i < 40; i++) { out[i * 3] = out[(n - 1) * 3]; out[i * 3 + 1] = out[(n - 1) * 3 + 1]; out[i * 3 + 2] = out[(n - 1) * 3 + 2]; } }
    return res;
  }

  input.onThrow = (aim) => {
    if (!canThrow) return;
    if (segDist(player.pos.x, player.pos.z, POS[list[cur]]) > 12) { ui.hint(T.tooFar); return; }
    const { dir, v, el } = launchParams(aim);
    const p0 = origin();
    const res = simulate(p0, dir, v, el, null);
    const m = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), stoneMat); m.position.copy(p0); m.castShadow = true; world.add(m);
    stones.push({ m, p: p0.clone(), vel: new THREE.Vector3(dir.x * v * Math.cos(el), v * Math.sin(el), dir.z * v * Math.cos(el)), res, t: 0, landed: false });
    player.heading = Math.atan2(dir.x, dir.z);
    player.fig.pose('throw'); setTimeout(() => !flow.dead && player.fig.pose('stand'), 450);
    if (!talbiyahEnded) { talbiyahEnded = true; ui.toast(T.talbiyahEnds, 2600); }
    else ui.toast('Allahu Akbar', 1100);
  };

  // Für automatische Tests: sucht einen treffenden Wurf und führt ihn aus
  ctx.debug = { autoThrow() {
    // zur Wand drehen
    const z0 = POS[list[cur]], wx = Math.max(-A, Math.min(A, player.pos.x));
    input.yaw = Math.atan2(wx - player.pos.x, z0 - player.pos.z);
    for (let dy = 20; dy < window.innerHeight * 0.32; dy += 6) for (const dx of [0, 20, -20, 40, -40]) {
      const { dir, v, el } = launchParams({ dx, dy });
      if (simulate(origin(), dir, v, el, null) === 'hit') { input.onThrow({ dx, dy }); return true; }
    }
    return false;
  } };

  // Autopilot (optional, ab dem 3. Stein bzw. ab der zweiten Dschamra): wirft die übrigen Steine mit „Allahu Akbar“
  let autoWait = 0;
  const auto = createAutopilot(ctx, {
    label: 'Automatisch werfen',
    steer() {
      const z0 = POS[list[cur]], p = player.pos;
      if (segDist(p.x, p.z, z0) < 9) return null;
      const tz = z0 + Math.sign(p.z - z0 || 1) * (RIM_R + 3);
      return { x: Math.max(-A, Math.min(A, p.x)) - p.x, z: tz - p.z, fast: false };
    },
    available: () => canThrow && (valid >= autoAfter(ctx, 2) || cur > 0) && valid < 7,
    tick(dt) {
      autoWait -= dt;
      const flying = stones.some((s) => !s.landed);
      if (autoWait <= 0 && !flying && valid < 7 && segDist(player.pos.x, player.pos.z, POS[list[cur]]) < 10) { ctx.debug.autoThrow(); autoWait = 1.2; }
    },
  });

  async function run() {
    ui.info(`<p>${st.intro}</p>`);
    for (cur = 0; cur < list.length; cur++) {
      const k = list[cur], z0 = POS[k];
      valid = 0;
      await goTo(ctx, flow, marker, T.names[k][1], 0, z0 + RIM_R + 3.5);
      if (firstDay) ctx.mission?.done(0);
      marker.hide();
      ui.info(`<p><b>${T.names[k][1]}</b> – 7 Steine, bei jedem Wurf „Allahu Akbar“.</p><p class="tr">${T.aim}</p>`);
      input.mode = 'throw'; canThrow = true;
      ui.hint(T.aim, 4000);
      await flow.until(() => valid >= 7);
      canThrow = false; input.mode = 'look'; arc.visible = false;
      ui.toast(`${T.names[k][1]} ✓`, 2200);
      ctx.mission?.done(firstDay ? 1 : { ula: 0, wusta: 2, aqaba: 4 }[k]);
      if (k !== 'aqaba') {
        // Sunnah: zur Seite treten und zur Qibla Dua machen
        let choice = null;
        ui.info(`<p>Sunnah: Tritt etwas zur Seite und mache Dua Richtung Qibla.</p>`);
        ui.actions([{ label: T.dua, kind: 'sunnah', onClick: () => { choice = 'dua'; ui.actions([]); } }, { label: T.next, onClick: () => { choice = 'next'; ui.actions([]); } }]);
        await flow.until(() => choice);
        if (choice === 'next') ctx.mission?.skip(k === 'ula' ? 1 : 3);
        if (choice === 'dua') {
          await goTo(ctx, flow, marker, T.duaGoal, A + 9, z0 - 4);
          marker.hide();
          await duaFacing(ctx, flow, { tx: QIBLA.x, tz: QIBLA.z, sec: 5 });
          ctx.progress.jdua = (ctx.progress.jdua || 0) + 1;
          if (ctx.progress.jdua >= 2) sunnah(ctx, 'jamarat_dua');
          ui.toast('Dua ✓'); ctx.mission?.done(k === 'ula' ? 1 : 3);
        }
      }
    }
    ui.info(`<p>${firstDay ? 'Dschamrat al-Aqaba ist geworfen. Als Nächstes: Opfer und Rasur.' : T.afterAll}</p>`);
    await goTo(ctx, flow, marker, T.exitGoal, 30, zMax - 8);
    ctx.next();
  }
  run();

  let time = 0;
  return {
    update(dt) {
      time += dt;
      flow.update(dt);
      auto.update(dt);
      player.update(dt);
      marker.update(dt);
      // Vorschau beim Zielen
      if (canThrow && input.aim && input.aim.dy > 8) {
        const { dir, v, el } = launchParams(input.aim);
        const r = simulate(origin(), dir, v, el, arcPts);
        arc.material.color.setHex(r === 'hit' ? 0x7dffb0 : 0xffe6a0);
        arcGeo.attributes.position.needsUpdate = true; arc.visible = true;
        player.heading = Math.atan2(dir.x, dir.z);
      } else arc.visible = false;
      if (canThrow) ui.counter(`Steine ${valid} / 7`);
      else if ((ui.counterRaw || '').startsWith('Steine')) ui.counter('');
      // Steine fliegen
      for (const s of stones) {
        if (s.landed) continue;
        s.t += dt;
        s.vel.y -= G * dt;
        s.p.addScaledVector(s.vel, dt);
        const d = segDist(s.p.x, s.p.z, POS[list[Math.min(cur, list.length - 1)]]);
        if (s.res === 'hit' && (d < WALL_R + 0.05 || (d < BASIN_R && s.p.y < 0.1))) { s.vel.set(0, -2, 0); }
        if (s.p.y <= (d < RIM_R && d > BASIN_R ? RIM_H : 0.04) || s.t > 4) {
          s.p.y = Math.max(0.04, s.p.y); s.landed = true;
          if (s.res === 'hit') { valid++; ui.toast(`${T.valid} ${valid} / 7`, 1300); }
          else ui.hint(T[s.res] || T.miss, 2200);
        }
        s.m.position.copy(s.p);
      }
      // Pilger am Rand werfen
      const v = viewLine(ctx);
      for (let i = 0; i < N; i++) { const c = cs[i]; const [x, z] = clearView(v, c[0], c[1]); crowd.set(i, x, Math.abs(Math.sin(time * 2 + c[3])) * 0.03, z, c[2]); }
      crowd.commit();
    },
    dispose() { flow.dispose(); },
  };
}
