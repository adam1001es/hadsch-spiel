import * as THREE from 'three';
import { BORROW as T } from '../content/life.js';
import { makeVehicle, specOf } from './vehicles.js';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';
import { inRects } from '../world/cityscape.js';
import * as sfx from '../core/sfx.js';

// Amanah-Ausleihe (Lebensspiel): Fahrzeuge im Verkehr anhalten oder am Taxistand den Fahrer fragen, einsteigen
// (Figur sitzt sichtbar), selbst fahren oder automatisch zu einem Ziel fahren lassen, aussteigen, zurückgeben.
// Fußgänger werden nie angefahren (das Fahrzeug bremst). Kein Stehlen, keine Verfolgung – nur freundliche Hinweise.
// opts: { player, interact, traffic, stands: [{ kind, x, z, ry }], area: [Rechtecke zum Fahren], people(): [{x,z}],
//         destinations: [{ label, x, z } | { label, intercity: 'mecca'|'medina' }], route(from, to) → Wegpunkte, map, where }
const LS = 'hp-life';
const addGood = () => { try { const o = JSON.parse(localStorage.getItem(LS) || '{}'); o.v = 1; o.amanah = (o.amanah || 0) + 1; localStorage.setItem(LS, JSON.stringify(o)); } catch { /* egal */ } };

// Sprechblase über einem Punkt (DOM, wandert mit der Kamera)
function bubbles(engine) {
  const list = [];
  const v = new THREE.Vector3();
  return {
    say(text, at, ms = 1800, who = '') {
      const el = document.createElement('div'); el.className = 'bubble' + (who ? ' ' + who : ''); el.textContent = text; document.body.appendChild(el);
      const b = { el, at, until: performance.now() + ms }; list.push(b); return b;
    },
    update() {
      const now = performance.now(), cam = engine.camera;
      for (let i = list.length - 1; i >= 0; i--) {
        const b = list[i];
        if (now > b.until) { b.el.remove(); list.splice(i, 1); continue; }
        v.copy(typeof b.at === 'function' ? b.at() : b.at).project(cam);
        const vis = v.z < 1; b.el.style.display = vis ? '' : 'none';
        if (vis) { b.el.style.left = ((v.x + 1) / 2 * innerWidth) + 'px'; b.el.style.top = ((1 - v.y) / 2 * innerHeight) + 'px'; }
      }
    },
    clear() { for (const b of list) b.el.remove(); list.length = 0; },
  };
}

export function createBorrow(ctx, opts) {
  const { engine, ui, input } = ctx;
  const world = engine.world;
  const { player, interact, traffic = null, area = [], people = () => [], destinations = [], route = (a, b) => [b], map = null, where = 'mecca' } = opts;
  const talk = bubbles(engine);
  const drivers = []; // Fahrer-Figuren (warten neben ihrem Fahrzeug)
  const mkDriver = (x, z, ry) => { const f = createFigure(world, { color: [0xf3f1ea, 0x6f7f8e, 0x3b4a5a, 0xe8e0cf][(Math.random() * 4) | 0], ring: false, models: peopleModels(), rigged: false }); f.root.position.set(x, 0, z); f.root.rotation.y = ry; return f; };
  const head = (f) => () => f.root.position.clone().setY(2.1);

  // ---------- Taxistand: geparkte Fahrzeuge mit Fahrer ----------
  const parked = []; // { veh, x, z, h, owner, home: {x,z}, src: 'stand'|'traffic'|'away', vh }
  for (const s of opts.stands || []) {
    const veh = makeVehicle(world, s.kind); veh.root.position.set(s.x, 0, s.z); veh.root.rotation.y = s.ry;
    const side = specOf(s.kind).wid / 2 + 0.9, ox = Math.cos(s.ry) * side, oz = -Math.sin(s.ry) * side;
    const owner = mkDriver(s.x + ox, s.z + oz, s.ry + Math.PI / 2);
    const P = { veh, x: s.x, z: s.z, h: s.ry, owner, home: { x: s.x, z: s.z, h: s.ry }, src: 'stand' };
    parked.push(P);
    interact.add({ obj: veh.root, color: 'blue', radius: 9, near: 3.6, x: s.x + ox * 1.6, z: s.z + oz * 1.6, key: 'stand-' + parked.length, label: () => (P.mine ? T.enter(veh.name) : T.ask), when: () => !drive && P.parked !== false, run: () => (P.mine ? enter(P) : ask(P)) });
  }
  // ---------- Verkehr: fahrende Fahrzeuge anhalten ----------
  if (traffic) for (const vh of traffic.vehicles) {
    interact.add({ obj: vh.veh.root, color: 'blue', radius: 11, near: 4.5, push: 0.03, pos: (out) => out.copy(vh.veh.root.position), key: 'tr-' + vh.kind + vh.ln.z + Math.round(vh.x), label: T.hail, when: () => !drive && !vh.borrowed && !pending, run: () => hail(vh) });
  }

  let drive = null, pending = null, mode = 'self', autoPts = null, autoName = '', lastKey = '';
  const cam = engine.camera, camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
  let first = true, yaw0 = 0, seenInfo = false;

  function hail(vh) { // anhalten → Fahrer steigt aus → fragen → einsteigen
    traffic.hold(vh, true); pending = { vh, t: 0, step: 0 }; ui.prompt(null);
  }
  function ask(P) {
    talk.say(T.askLine(P.veh.name), () => player.pos.clone().setY(2.1), 1600, 'me');
    setTimeout(() => { talk.say(T.yesLine, head(P.owner), 2200, 'npc'); }, 1100);
    setTimeout(() => { P.mine = true; enter(P); }, 2300);
  }
  function enter(P) {
    if (drive) return;
    P.parked = false; P.mine = true;
    drive = { P, veh: P.veh, spec: P.veh.spec, x: P.veh.root.position.x, z: P.veh.root.position.z, h: P.veh.root.rotation.y, v: 0, steer: 0 };
    player.ride = ride; player.freeze(true); player.fig.pose(drive.spec.pose); first = true; yaw0 = input.yaw;
    mode = 'self'; autoPts = null; lastKey = '';
    ctx.vehicle = drive.veh.kind; // für Mitspieler (multi.js)
    sfx.bus?.();
    if (!seenInfo) { seenInfo = true; ui.info(`<p>${T.info}</p>`); } // einmal erklären: Amanah + Bedienung
  }
  function exit(giveBack = false) {
    if (!drive) return;
    const D = drive, P = D.P; drive = null; player.ride = null; player.freeze(false); player.fig.pose('stand'); ctx.vehicle = null;
    // neben dem Fahrzeug aussteigen (links)
    const side = D.spec.wid / 2 + 0.8; player.teleport(D.x + Math.cos(D.h) * side, D.z - Math.sin(D.h) * side, D.h);
    P.x = D.x; P.z = D.z; P.h = D.h; P.parked = true;
    if (giveBack) giveBackNow(P);
    ui.counter(''); ui.actions(opts.baseActions || []);
  }
  function giveBackNow(P) {
    const home = P.src === 'traffic' ? P.owner.root.position : P.home;
    const dist = Math.hypot(P.x - home.x, P.z - home.z);
    if (P.src === 'away') { // aus der anderen Stadt mitgebracht: am Taxistand dieser Stadt abgeben
      const st = parked.find((q) => q.src === 'stand');
      if (st && Math.hypot(P.x - st.home.x, P.z - st.home.z) > 40) { ui.toast(T.far(T.standName), 3500); map?.setTarget({ x: st.home.x, z: st.home.z, label: T.standName }); return; }
      ui.toast(T.standReturn, 3000); addGood(); ui.toast(T.hasanat, 3000); P.veh.root.removeFromParent(); parked.splice(parked.indexOf(P), 1); ctx.borrowed = null; return;
    }
    if (dist > 40) { ui.toast(T.far(P.src === 'traffic' ? T.ownerName : T.standName), 3500); map?.setTarget({ x: home.x, z: home.z, label: P.src === 'traffic' ? 'Fahrer' : 'Taxistand' }); return; }
    talk.say(T.thanks, head(P.owner), 2600, 'npc'); addGood(); setTimeout(() => ui.toast(T.hasanat, 2800), 900);
    P.mine = false;
    if (P.src === 'traffic') { // Fahrer steigt ein und fährt weiter
      setTimeout(() => { traffic.giveBack(P.vh, P.x); P.owner.root.removeFromParent(); parked.splice(parked.indexOf(P), 1); }, 2200);
    } else { P.veh.root.position.set(P.home.x, 0, P.home.z); P.veh.root.rotation.y = P.home.h; P.x = P.home.x; P.z = P.home.z; P.h = P.home.h; }
  }
  function setAuto(dest) {
    if (dest.intercity) { // über die Autobahn in die andere Stadt
      const kind = drive.veh.kind; exit(false); ctx.borrowed = { kind, from: where };
      return ctx.drive?.(where, dest.intercity, { vehicle: kind });
    }
    mode = 'auto'; autoName = dest.label; autoPts = route({ x: drive.x, z: drive.z }, { x: dest.x, z: dest.z }); lastKey = '';
  }
  function actions() {
    const key = mode + (autoPts ? 'a' : '');
    if (key === lastKey) return; lastKey = key;
    const list = [{ label: mode === 'self' ? T.auto : T.self, kind: 'primary', onClick: () => { mode = mode === 'self' ? 'auto' : 'self'; autoPts = null; lastKey = ''; } }];
    if (mode === 'auto' && !autoPts) for (const d of destinations) list.push({ label: '→ ' + d.label, onClick: () => setAuto(d) });
    list.push({ label: T.exit, onClick: () => exit(false) }, { label: T.give, onClick: () => exit(true) });
    ui.actions(list);
  }

  // Fahren (ersetzt player.update): Steuerung, Fußgänger-Bremse, Grenzen, Figur im Sitz, Kamera
  function ride(dt) {
    const D = drive, S = D.spec;
    let throttle = 0, steer = 0;
    if (mode === 'self') {
      throttle = -input.move.y; steer = -input.move.x;
      if (Math.abs(throttle) > 0.2 || Math.abs(steer) > 0.2) autoPts = null;
    } else if (autoPts && autoPts.length) {
      const p = autoPts[0], dx = p.x - D.x, dz = p.z - D.z, d = Math.hypot(dx, dz);
      if (d < 4) { autoPts.shift(); if (!autoPts.length) { ui.toast(T.arrived(autoName), 2500); autoPts = null; lastKey = ''; } }
      const want = Math.atan2(dx, dz), da = Math.atan2(Math.sin(want - D.h), Math.cos(want - D.h));
      steer = Math.max(-1, Math.min(1, da * 2)); throttle = d < 10 && autoPts?.length === 1 ? 0.35 : 0.75 * (1 - Math.min(0.6, Math.abs(da)));
      if (Math.abs(input.move.y) > 0.3 || Math.abs(input.move.x) > 0.3) { mode = 'self'; autoPts = null; lastKey = ''; } // eigene Eingabe übernimmt
    }
    // Fußgänger vor dem Fahrzeug → bremsen
    const fx = Math.sin(D.h), fz = Math.cos(D.h);
    let limit = S.vmax;
    for (const p of people()) {
      const rx = p.x - D.x, rz = p.z - D.z, ahead = rx * fx + rz * fz * 1, side = Math.abs(rx * fz - rz * fx);
      const dirAhead = D.v >= 0 ? ahead : -ahead;
      if (dirAhead > 0 && dirAhead < S.len / 2 + 2 + Math.abs(D.v) * 0.8 && side < S.wid / 2 + 0.9) limit = Math.min(limit, Math.max(0, dirAhead - S.len / 2 - 1.2));
    }
    const target = throttle * S.vmax;
    D.v += (Math.max(-S.vmax * 0.3, Math.min(limit, target)) - D.v) * Math.min(1, dt * (Math.abs(target) < Math.abs(D.v) ? 2.5 : S.acc / S.vmax * 2));
    if (limit < 0.5 && throttle > 0.2 && D.v < 0.6 && (D.brakeT = (D.brakeT || 0) + dt) > 1.2) { ui.toast(T.braking, 1500); D.brakeT = -3; }
    D.steer += (steer - D.steer) * Math.min(1, dt * 5);
    D.h += D.steer * D.v * dt / (S.len * 0.55);
    const nx = D.x + Math.sin(D.h) * D.v * dt, nz = D.z + Math.cos(D.h) * D.v * dt;
    if (!area.length || inRects(area, nx, nz, S.wid / 2)) { D.x = nx; D.z = nz; } else D.v *= -0.2; // Rand: anhalten
    const R = D.veh.root; R.position.set(D.x, 0, D.z); R.rotation.y = D.h; R.updateMatrixWorld(true);
    D.veh.roll(D.v, dt, D.steer);
    // Figur sitzt im Fahrzeug
    D.veh.seat(tmp); player.fig.root.position.copy(tmp); player.fig.root.rotation.y = D.h; player.fig.update(dt, 0);
    player.pos.set(D.x, 0, D.z); player.heading = D.h;
    // Kamera hinter dem Fahrzeug (wischen = umschauen, kehrt langsam zurück)
    const look = input.yaw - yaw0; yaw0 += look * Math.min(1, dt * 0.8);
    const ang = D.h + Math.PI + look, [dist, hh] = S.cam;
    const wp = tmp.set(D.x + Math.sin(ang) * dist, hh + input.pitch * 4, D.z + Math.cos(ang) * dist);
    const k = first ? 1 : 1 - Math.exp(-dt * 6); first = false;
    camPos.lerp(wp, k); camLook.lerp(new THREE.Vector3(D.x + fx * 3, 1.2, D.z + fz * 3), k);
    cam.position.copy(camPos); cam.lookAt(camLook);
    ui.counter(`${Math.round(Math.abs(D.v) * 3.6)} km/h${mode === 'auto' && autoPts ? ' · → ' + autoName : ''}`);
    actions();
  }

  // mitgebrachtes Fahrzeug aus der anderen Stadt (nach der Autobahnfahrt): gleich drinsitzen
  function arriveWith(kind, x, z, h) {
    const veh = makeVehicle(world, kind); veh.root.position.set(x, 0, z); veh.root.rotation.y = h;
    const P = { veh, x, z, h, owner: null, home: { x, z, h }, src: 'away', mine: true };
    parked.push(P);
    interact.add({ obj: veh.root, color: 'blue', radius: 9, near: 3.6, pos: (o) => o.copy(veh.root.position), key: 'away', label: T.enter(veh.name), when: () => !drive && P.parked !== false && parked.includes(P), run: () => enter(P) });
    enter(P);
  }

  return {
    get driving() { return !!drive; },
    arriveWith,
    update(dt) {
      if (pending) { // angehaltenes Fahrzeug: warten bis es steht, Fahrer steigt aus, kurze Unterhaltung, einsteigen
        const pv = pending, vh = pv.vh, R = vh.veh.root; pv.t += dt;
        if (pv.step === 0 && vh.v < 0.3) {
          pv.step = 1; const h = R.rotation.y, side = vh.veh.spec.wid / 2 + 0.8;
          pv.owner = mkDriver(R.position.x + Math.cos(h) * side, R.position.z - Math.sin(h) * side, h + Math.PI / 2);
          talk.say(T.askLine(vh.veh.name), () => player.pos.clone().setY(2.1), 1500, 'me'); pv.t = 0;
        } else if (pv.step === 1 && pv.t > 1.0) { pv.step = 2; talk.say(T.yesLine, head(pv.owner), 2200, 'npc'); pv.t = 0; }
        else if (pv.step === 2 && pv.t > 1.2) {
          traffic.take(vh); const P = { veh: vh.veh, x: R.position.x, z: R.position.z, h: R.rotation.y, owner: pv.owner, home: null, src: 'traffic', vh, mine: true };
          // Fahrer wartet am Straßenrand; eigenes Fahrzeug später wieder einsteigen
          parked.push(P);
          interact.add({ obj: vh.veh.root, color: 'blue', radius: 9, near: 3.6, pos: (o) => o.copy(vh.veh.root.position), key: 'mine-' + parked.length, label: T.enter(vh.veh.name), when: () => !drive && P.parked !== false && parked.includes(P) && P.mine, run: () => enter(P) });
          pending = null; enter(P);
        } else if (pv.t > 8) { traffic.hold(vh, false); pending = null; } // hält nicht an (z. B. Bus im Stau)
      }
      for (const d of drivers) d.update?.(dt, 0);
      for (const P of parked) P.owner?.update?.(dt, 0);
      talk.update();
    },
    dispose() { talk.clear(); if (drive) { player.ride = null; ctx.vehicle = null; } },
  };
}
