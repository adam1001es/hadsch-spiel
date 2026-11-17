import * as THREE from 'three';
import { BORROW as T } from '../content/life.js';
import { makeVehicle, specOf, SMALL_KINDS, CAR_KINDS } from './vehicles.js';
import { resolve } from '../core/player.js';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';
import * as sfx from '../core/sfx.js';

// Amanah-Ausleihe (Lebensspiel): Fahrzeuge im Verkehr anhalten oder am Taxistand den Fahrer fragen, einsteigen
// (Figur sitzt sichtbar), selbst fahren oder automatisch zu einem Ziel fahren lassen, aussteigen, zurückgeben.
// Fußgänger werden nie angefahren (das Fahrzeug bremst). Kein Stehlen, keine Verfolgung – nur freundliche Hinweise.
// opts: { player, interact, traffic, stands: [{ kind, x, z, ry }], area: [Rechtecke zum Fahren], people(): [{x,z}],
//         destinations: [{ label, x, z } | { label, intercity: 'mecca'|'medina' }], route(from, to) → Wegpunkte, map, where,
//         colliders: Gebäude (wie beim Spieler; optional h = Höhe → Helikopter fliegt darüber), ground(x, z) → Bodenhöhe,
//         noLand(x, z) → Hinweis, wenn der Helikopter hier nicht landen darf (Kaaba, Prophetenmoschee, Moscheen), avoid(x, z) }
// Keine Sperren: man fährt überall hin (auch Wüste/Berge), nur Gebäude halten auf. Steuerung: vier große Knöpfe ▲▼◀▶
// (Helikopter zusätzlich Hoch/Runter), am Laptop W/A/S/D bzw. Pfeiltasten, Leertaste = hoch, C = runter.
// Fahrzeuge immer in der Nähe: steht keins frei in der Nähe, erscheint eins hinter der Figur (Verleih, ohne Fahrer).
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
  const { player, interact, traffic = null, people = () => [], destinations = [], route = (a, b) => [b], map = null, where = 'mecca',
    colliders = [], ground = () => 0, noLand = () => null, avoid = () => false } = opts;
  // ---------- Fahrbedienung wie in Handy-Rennspielen: zwei Daumen ----------
  // Linker Daumen: Lenkfläche (Daumen hin und her schieben, weiter außen = stärker lenken).
  // Gas automatisch (Auto-Gas, abschaltbar → dann GAS-Pedal). Rechter Daumen: BREMSE/DRIFT (bei Tempo in der Kurve = Drift,
  // sonst bremsen, im Stand halten = rückwärts); NITRO einmal antippen = 3 s Turbo. Helikopter: Hoch/Runter statt Nitro.
  const ctl = { g: 0, b: 0, u: 0, d: 0, steer: 0 }; let nitroT = 0, nitroCool = 0, started = false;
  let autoGas = (() => { try { return localStorage.getItem('hp-autogas') !== '0'; } catch { return true; } })();
  // eigene Fahr-Einstellung je Gerät (versteckt: Tacho antippen): Lenkseite, Lenk-Stärke, Drift-Stärke
  const DS_KEY = 'hp-drive';
  const ds = (() => { try { return { steerRight: false, steer: 1, drift: 1, view: 1, ...JSON.parse(localStorage.getItem(DS_KEY) || '{}') }; } catch { return { steerRight: false, steer: 1, drift: 1, view: 1 }; } })();
  const saveDS = () => { try { localStorage.setItem(DS_KEY, JSON.stringify(ds)); } catch { /* egal */ } };
  const pad = document.createElement('div'); pad.id = 'driveCtl'; pad.hidden = true;
  pad.innerHTML = '<div class="dc-l"><div class="dc-speed" role="button" aria-label="Tacho"><b>0</b><span>km/h</span><em></em><i class="dc-gear">⚙</i></div>'
    + '<div class="dc-wheel" aria-label="Lenken: Daumen nach links oder rechts schieben"><i class="a l">‹</i><i class="knob"></i><i class="a r">›</i></div></div>'
    + '<div class="dc-r"><div class="dc-top"><button data-k="ag" class="ag" aria-label="Auto-Gas an oder aus"></button><button data-k="n" class="nitro" aria-label="Nitro"><span>⚡</span><small>NITRO</small></button>'
    + '<button data-k="u" class="air" aria-label="Hoch">▲ HOCH</button><button data-k="d" class="air" aria-label="Runter">▼ RUNTER</button></div>'
    + '<div class="dc-pedals"><button data-k="b" class="pedal brake" aria-label="Bremse, Drift und rückwärts"><span>BREMSE</span><small>Kurve = Drift</small></button>'
    + '<button data-k="g" class="pedal gas" aria-label="Gas"><span>GAS</span></button></div></div>';
  document.body.appendChild(pad);
  const speedEl = pad.querySelector('.dc-speed b'), infoEl = pad.querySelector('.dc-speed em'), unitEl = pad.querySelector('.dc-speed span');
  const wheel = pad.querySelector('.dc-wheel'), knob = wheel.querySelector('.knob'), agBtn = pad.querySelector('.ag'), nitroBtn = pad.querySelector('.nitro');
  const showAG = () => { agBtn.innerHTML = `<small>AUTO-GAS</small><span>${autoGas ? 'AN' : 'AUS'}</span>`; pad.classList.toggle('autogas', autoGas); };
  showAG();
  // ---------- versteckte Einstellung (Tacho antippen) ----------
  const setup = document.createElement('div'); setup.id = 'driveSetup'; setup.hidden = true;
  setup.innerHTML = `<div class="ds-card"><div class="ds-head"><b>Fahr-Einstellung</b><button type="button" class="ds-x" aria-label="Schließen">✕</button></div>
    <p class="ds-row"><span>Lenken mit</span><span class="ds-seg"><button type="button" data-side="0">linkem Daumen</button><button type="button" data-side="1">rechtem Daumen</button></span></p>
    <label class="ds-row"><span>Lenk-Stärke <em class="ds-v1"></em></span><input type="range" min="0.4" max="2" step="0.05" class="ds-steer"></label>
    <label class="ds-row"><span>Drift-Stärke <em class="ds-v2"></em></span><input type="range" min="0.3" max="1.8" step="0.05" class="ds-drift"></label>
    <p class="ds-row"><span>Kamera</span><span class="ds-seg"><button type="button" data-view="0.75">nah</button><button type="button" data-view="1">weit</button><button type="button" data-view="1.45">sehr weit</button></span></p>
    <p class="ds-row"><span>Auto-Gas</span><span class="ds-seg"><button type="button" data-ag="1">an</button><button type="button" data-ag="0">aus</button></span></p>
    <button type="button" class="ds-reset">Zurücksetzen</button><p class="ds-note">Wird auf diesem Gerät gespeichert.</p></div>`;
  document.body.appendChild(setup);
  const sSteer = setup.querySelector('.ds-steer'), sDrift = setup.querySelector('.ds-drift');
  const pct = (v) => Math.round(v * 100) + ' %';
  function applyDS() {
    pad.classList.toggle('swap', !!ds.steerRight);
    sSteer.value = ds.steer; sDrift.value = ds.drift; setup.querySelector('.ds-v1').textContent = pct(ds.steer); setup.querySelector('.ds-v2').textContent = pct(ds.drift);
    setup.querySelectorAll('[data-side]').forEach((b) => b.classList.toggle('on', +b.dataset.side === (ds.steerRight ? 1 : 0)));
    setup.querySelectorAll('[data-view]').forEach((b) => b.classList.toggle('on', Math.abs(+b.dataset.view - ds.view) < 0.01));
    setup.querySelectorAll('[data-ag]').forEach((b) => b.classList.toggle('on', +b.dataset.ag === (autoGas ? 1 : 0)));
  }
  applyDS();
  pad.querySelector('.dc-speed').addEventListener('click', () => { setup.hidden = false; applyDS(); });
  setup.addEventListener('click', (e) => {
    if (e.target === setup || e.target.closest('.ds-x')) { setup.hidden = true; return; }
    const side = e.target.closest('[data-side]'); if (side) { ds.steerRight = side.dataset.side === '1'; saveDS(); applyDS(); }
    const vw = e.target.closest('[data-view]'); if (vw) { ds.view = +vw.dataset.view; saveDS(); applyDS(); }
    const ag = e.target.closest('[data-ag]'); if (ag) { autoGas = ag.dataset.ag === '1'; try { localStorage.setItem('hp-autogas', autoGas ? '1' : '0'); } catch { /* egal */ } showAG(); applyDS(); }
    if (e.target.closest('.ds-reset')) { Object.assign(ds, { steerRight: false, steer: 1, drift: 1, view: 1 }); saveDS(); applyDS(); }
  });
  sSteer.addEventListener('input', () => { ds.steer = +sSteer.value; saveDS(); applyDS(); });
  sDrift.addEventListener('input', () => { ds.drift = +sDrift.value; saveDS(); applyDS(); });
  // Lenkfläche: analog, Daumen darf rutschen
  let wheelId = null;
  const steerAt = (e) => { const r = wheel.getBoundingClientRect(), k = ((e.clientX - r.left) / r.width - 0.5) * 2; ctl.steer = -Math.max(-1, Math.min(1, k * 1.25 * Math.sqrt(ds.steer))); knob.style.transform = `translateX(${(-ctl.steer) * r.width * 0.36}px)`; wheel.classList.toggle('on', true); started = true; };
  const steerOff = () => { wheelId = null; ctl.steer = 0; knob.style.transform = ''; wheel.classList.remove('on'); };
  wheel.addEventListener('pointerdown', (e) => { e.preventDefault(); wheelId = e.pointerId; try { wheel.setPointerCapture(e.pointerId); } catch { /* egal */ } steerAt(e); });
  wheel.addEventListener('pointermove', (e) => { if (e.pointerId === wheelId) steerAt(e); });
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) wheel.addEventListener(ev, (e) => { if (e.pointerId === wheelId) steerOff(); });
  const press = (e, on) => {
    const b = e.target.closest('button[data-k]'); if (!b) return; e.preventDefault(); const k = b.dataset.k;
    if (k === 'ag') { if (on) { autoGas = !autoGas; try { localStorage.setItem('hp-autogas', autoGas ? '1' : '0'); } catch { /* egal */ } showAG(); applyDS(); } return; }
    if (k === 'n') { if (on) fireNitro(); return; }
    ctl[k] = on ? 1 : 0; b.classList.toggle('on', on); if (on) { started = true; try { b.setPointerCapture(e.pointerId); } catch { /* egal */ } }
  };
  function fireNitro() { if (nitroCool > 0 || !drive || drive.spec.air) return; nitroT = 4.5; nitroCool = 7; started = true; }
  pad.addEventListener('pointerdown', (e) => press(e, true));
  for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) pad.addEventListener(ev, (e) => press(e, false));
  pad.addEventListener('contextmenu', (e) => e.preventDefault());
  // Tastatur: W/↑ Gas, S/↓ Bremse (Kurve = Drift, Stand = rückwärts), A/D bzw. ←/→ lenken, Umschalt = Nitro, Leertaste = Drift/Bremse (Helikopter: hoch), C = runter
  const keys = (e, on) => {
    if (!drive) return; const v = on ? 1 : 0;
    if (e.code === 'Space') { if (drive.spec.air) ctl.u = v; else ctl.b = v; e.preventDefault(); }
    if (e.code === 'KeyC') ctl.d = v;
    if ((e.code === 'ShiftLeft' || e.code === 'ShiftRight') && on) fireNitro();
    if (on && /Key[WASD]|Arrow/.test(e.code)) started = true;
  };
  const kd = (e) => keys(e, true), ku = (e) => keys(e, false);
  window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
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
    const back = specOf(s.kind).len / 2 + 1.2; // Fragepunkt hinter dem Fahrzeug (eindeutig, auch wenn mehrere nebeneinander stehen)
    interact.add({ obj: veh.root, color: 'blue', radius: 9, near: 2.4, x: s.x - Math.sin(s.ry) * back, z: s.z - Math.cos(s.ry) * back, key: 'stand-' + parked.length, label: () => (P.mine ? T.enter(veh.name) : T.ask), when: () => !drive && P.parked !== false, run: () => (P.mine ? enter(P) : ask(P)) });
  }
  // ---------- Verleih: Fahrzeug ohne Fahrer (immer eins in der Nähe) ----------
  function addRental(kind, x, z, h) {
    const veh = makeVehicle(world, kind); veh.root.position.set(x, ground(x, z), z); veh.root.rotation.y = h;
    const P = { veh, x, z, h, owner: null, home: { x, z, h }, src: 'rent', mine: true, parked: true };
    parked.push(P);
    P.ia = interact.add({ obj: veh.root, color: 'blue', radius: 10, near: Math.max(3, veh.spec.len / 2 + 1.4), pos: (o) => o.copy(veh.root.position), key: 'rent-' + kind + '-' + parked.length, label: T.rent(veh.name), when: () => !drive && P.parked && parked.includes(P), run: () => enter(P) });
    return P;
  }
  const RENT = [...SMALL_KINDS, 'escooter', 'bicycle', 'motorbike', ...CAR_KINDS];
  let spawnT = 0;
  function keepNearby(dt) {
    if ((spawnT -= dt) > 0 || drive || pending) return; spawnT = 2;
    const px = player.pos.x, pz = player.pos.z;
    // weit entfernte Verleih-Fahrzeuge wegräumen
    for (const P of parked.slice()) if (P.src === 'rent' && P !== drive?.P && Math.hypot(P.x - px, P.z - pz) > 160) { P.veh.root.removeFromParent(); if (P.ia) interact.remove(P.ia); parked.splice(parked.indexOf(P), 1); }
    if (parked.some((P) => P.parked !== false && Math.hypot(P.x - px, P.z - pz) < 22)) return;
    // hinter der Figur (außerhalb des Blickfelds) auf freiem Boden erscheinen lassen
    const back = player.viewYaw; // Richtung hinter der Kamera
    for (let k = 0; k < 10; k++) {
      const a = back + (Math.random() - 0.5) * 1.6, d = 7 + Math.random() * 6;
      const x = px + Math.sin(a) * d, z = pz + Math.cos(a) * d;
      if (avoid(x, z) || parked.some((P) => Math.hypot(P.x - x, P.z - z) < 12)) continue; // nicht neben anderen Fahrzeugen
      const q = { x, z }; resolve(q, 1.4, colliders); if (Math.hypot(q.x - x, q.z - z) > 0.01) continue;
      addRental(RENT[(Math.random() * RENT.length) | 0], x, z, Math.random() * Math.PI * 2); return;
    }
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
    drive = { P, veh: P.veh, spec: P.veh.spec, x: P.veh.root.position.x, z: P.veh.root.position.z, h: P.veh.root.rotation.y, v: 0, steer: 0, y: P.veh.root.position.y, vy: 0 };
    // Fahrer in die Mitte des freien Bereichs: unten liegen die Fahrknöpfe (~170 px), oben Titel/Knöpfe (~150 px)
    engine.setViewShift?.((w, h) => Math.max(-0.12, Math.min(0.05, (150 - 170) / h / 2 - (h > w ? 0.06 : 0.02))));
    pad.hidden = false; pad.classList.toggle('air', !!drive.spec.air); started = false; nitroT = 0; document.body.classList.add('driving'); ui.el.stick.classList.toggle('off', !drive.spec.air); // Helikopter: Joystick links
    player.ride = ride; player.freeze(true); player.fig.pose(drive.spec.pose); first = true; yaw0 = input.yaw;
    mode = 'self'; autoPts = null; lastKey = '';
    ctx.vehicle = drive.veh.kind; // für Mitspieler (multi.js)
    sfx.bus?.();
    ui.el.panel.classList.add('collapsed'); // beim Fahren nichts verdecken
    if (!seenInfo) { seenInfo = true; ui.info(`<p>${T.info}</p>`); } // einmal erklären (Karte bleibt zu, „i“ zeigt einen Punkt)
  }
  function exit(giveBack = false) {
    if (!drive) return;
    const D = drive, P = D.P;
    if (D.spec.air && D.y > ground(D.x, D.z) + 0.6) { ui.toast(T.landFirst, 2200); return; } // erst landen
    drive = null; player.ride = null; player.freeze(false); player.fig.pose('stand'); ctx.vehicle = null;
    setup.hidden = true; engine.setViewShift?.(null);
    pad.hidden = true; for (const k of Object.keys(ctl)) ctl[k] = 0; steerOff(); nitroT = 0; pad.querySelectorAll('button.on').forEach((b) => b.classList.remove('on')); cam.fov = 62; cam.updateProjectionMatrix(); document.body.classList.remove('driving'); ui.el.stick.classList.remove('off'); D.veh.rotor = 0;
    // neben dem Fahrzeug aussteigen (links)
    const side = D.spec.wid / 2 + 0.8; player.teleport(D.x + Math.cos(D.h) * side, D.z - Math.sin(D.h) * side, D.h);
    P.x = D.x; P.z = D.z; P.h = D.h; P.parked = true;
    { const q = { x: player.pos.x, z: player.pos.z }; resolve(q, 0.4, colliders); player.teleport(q.x, q.z, D.h); }
    if (giveBack) giveBackNow(P);
    ui.counter(''); ui.actions(opts.baseActions || []);
  }
  function giveBackNow(P) {
    if (P.src === 'rent') { ui.toast(T.rentBack, 2600); addGood(); return; } // Verleih: überall abstellen
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
      return (ctx.roadtrip || ctx.drive)?.(where, dest.intercity, { vehicle: kind }); // eigene Fahrt auf der Strecke
    }
    mode = 'auto'; autoName = dest.label; lastKey = '';
    autoPts = drive.spec.air ? [{ x: dest.x, z: dest.z }] : route({ x: drive.x, z: drive.z }, dest); // Helikopter fliegt direkt
  }
  function actions() {
    const key = mode + (autoPts ? 'a' : '');
    if (key === lastKey) return; lastKey = key;
    const list = [{ label: mode === 'self' ? T.auto : T.self, icon: mode === 'self' ? 'auto' : 'self', kind: 'primary', onClick: () => { mode = mode === 'self' ? 'auto' : 'self'; autoPts = null; lastKey = ''; } }];
    if (mode === 'auto' && !autoPts) for (const d of destinations) list.push({ label: '→ ' + d.label, onClick: () => setAuto(d) });
    list.push({ label: T.exit, icon: 'exit', onClick: () => exit(false) }, { label: T.give, icon: 'give', onClick: () => exit(true) });
    ui.actions(list);
  }

  // Fahren (ersetzt player.update): Steuerung, Fußgänger-Bremse, Gebäude, Boden/Berge, Figur im Sitz, Kamera
  function ride(dt) {
    const D = drive, S = D.spec;
    nitroT = Math.max(0, nitroT - dt); nitroCool = Math.max(0, nitroCool - dt);
    const sp0 = Math.abs(D.v), braking = ctl.b > 0 || input.move.y > 0.5;
    const turn = ctl.steer - input.move.x, up = ctl.u - ctl.d;
    // Bremse in der Kurve bei Tempo = Drift (wie die Handbremse in Rennspielen)
    let drift = !S.air && braking && sp0 > 8 && Math.abs(turn) > 0.3 && D.v > 0;
    const gas = ctl.g > 0 || input.move.y < -0.3 || (autoGas && started && !S.air);
    let manual = braking ? (drift ? 0.35 : -1) : gas ? 1 : 0;
    let throttle = 0, steer = 0, lift = 0, turbo = nitroT > 0;
    if (S.air) manual = Math.max(-1, Math.min(1, -input.move.y * 1.2 + ctl.g - ctl.b)); // Joystick: vor/zurück
    if (mode === 'self') {
      throttle = manual; steer = Math.max(-1, Math.min(1, turn)); lift = up;
    } else {
      if (braking || ctl.g || Math.abs(turn) > 0.3 || up) { mode = 'self'; autoPts = null; lastKey = ''; } // eigene Eingabe übernimmt
      turbo = false; drift = false;
      if (autoPts && autoPts.length) {
        // Wegpunkt erreicht (Radius wächst mit dem Tempo), Punkte hinter dem Fahrzeug überspringen
        const reach = (S.air ? 6 : 4) + Math.abs(D.v) * 0.28;
        while (autoPts.length > 1) { const q = autoPts[0], qx = q.x - D.x, qz = q.z - D.z, qd = Math.hypot(qx, qz); if (qd < reach || (qd < reach * 3 && qx * Math.sin(D.h) + qz * Math.cos(D.h) < 0)) autoPts.shift(); else break; }
        const p = autoPts[0], dx = p.x - D.x, dz = p.z - D.z, d = Math.hypot(dx, dz);
        const last = autoPts.length === 1;
        if (last && d < (S.air ? 6 : 5)) { autoPts = null; lastKey = ''; ui.toast(T.arrived(autoName), 2500); }
        const want = Math.atan2(dx, dz), da = Math.atan2(Math.sin(want - D.h), Math.cos(want - D.h));
        steer = Math.max(-1, Math.min(1, da * 2.5));
        // automatisch: zügig, aber kontrolliert (max. ~120 km/h, in Kurven langsamer)
        const cruise = Math.min(1, (S.air ? 40 : 33) / S.vmax) * (1 - Math.min(0.75, Math.abs(da) * 1.2));
        throttle = last && d < 25 ? Math.min(cruise, 0.2) : Math.abs(D.v) > S.vmax * cruise + 1 ? -0.3 : cruise;
        if (S.air) lift = d > 40 ? (D.y < ground(D.x, D.z) + 70 ? 1 : 0) : -1; // aufsteigen, am Ziel landen
      } else if (S.air && mode === 'auto') lift = -1;
    }
    const fx = Math.sin(D.h), fz = Math.cos(D.h);
    let limit = 1e9;
    const gy = ground(D.x, D.z);
    if (!S.air || D.y < gy + 2) for (const p of people()) { // Fußgänger vor dem Fahrzeug → automatisch bremsen
      const rx = p.x - D.x, rz = p.z - D.z, ahead = rx * fx + rz * fz, side = Math.abs(rx * fz - rz * fx);
      const dirAhead = D.v >= 0 ? ahead : -ahead;
      if (dirAhead > 0 && dirAhead < S.len / 2 + 2 + Math.abs(D.v) * 0.8 && side < S.wid / 2 + 0.9) limit = Math.min(limit, Math.max(0, dirAhead - S.len / 2 - 1.2));
    }
    D.steer += (steer - D.steer) * Math.min(1, dt * 9); // Lenkung spricht schnell an
    const vmax = turbo ? Math.min(S.vmax * 1.45, Math.max(S.vmax * 1.2, 94.4)) : S.vmax, acc = S.acc * (turbo ? 2.4 : 1) * (S.air ? 1 : 1.25); // Nitro bis 340 km/h
    if (S.air) { // Helikopter: Rotor hochfahren, steigen/sinken, am Boden nicht vorwärts
      const onGround = D.y <= gy + 0.05;
      D.veh.rotor += ((lift > 0 || !onGround || Math.abs(throttle) > 0.1 ? 1 : 0.25) - D.veh.rotor) * Math.min(1, dt * 1.2);
      D.vy += ((lift * 7) - D.vy) * Math.min(1, dt * 2.5);
      if (D.veh.rotor < 0.7 && D.vy > 0) D.vy = 0;
      D.y += D.vy * dt;
      if (D.y < gy) { // Landung – aber nicht auf Kaaba/Prophetenmoschee/Moscheen
        const why = noLand(D.x, D.z);
        if (why) { if (D.vy < 0 && (D.noLandT = (D.noLandT || 0) + dt) > 0.3) { ui.toast(why, 2600); D.noLandT = -3; } D.vy = Math.max(0, D.vy); D.y = gy + 0.01; }
        else { D.y = gy; D.vy = 0; }
      }
      const forbidden = noLand(D.x, D.z); if (forbidden && D.y < gy + 25) { D.y += (gy + 25 - D.y) * Math.min(1, dt * 1.5); if ((D.noLandT = (D.noLandT || 0) + dt) > 0.5) { ui.toast(forbidden, 2600); D.noLandT = -4; } }
      if (onGround && D.y <= gy + 0.05) throttle = 0;
      D.v += ((throttle * vmax) - D.v) * Math.min(1, dt * 0.9);
      D.h += D.steer * dt * 1.3; D.slip = 0;
    } else { // Boden: Gas, Bremse, Rückwärts, Rollen, Lenken, Driften
      if (throttle > 0.05) D.v += (D.v < 0 ? 14 : acc * throttle * Math.max(0.1, 1 - (D.v / vmax) ** 2)) * dt; // Gas (oben heraus langsamer, wie Luftwiderstand) (aus dem Rückwärtsgang erst bremsen)
      else if (throttle < -0.05) D.v -= (D.v > 0.4 ? 16 : acc * 0.7 * -throttle * Math.max(0, 1 + D.v / (S.vmax * 0.35))) * dt; // Bremse, dann rückwärts
      else D.v -= Math.sign(D.v) * Math.min(Math.abs(D.v), (0.9 + Math.abs(D.v) * 0.05) * dt); // ausrollen
      if (D.v > vmax) D.v -= Math.min(D.v - vmax, 10 * dt);
      if (D.v > limit) D.v = Math.max(limit, D.v - 22 * dt); // Fußgänger
      const sp = Math.abs(D.v), low = Math.min(1, sp / 3.5), high = 1 - 0.45 * Math.min(1, sp / 25) - 0.25 * Math.min(1, sp / 90); // bei Vollgas ruhiger lenken
      const maxYaw = (S.len > 8 ? 0.8 : S.len < 2.5 ? 2.6 : 2.1) * (drift ? 1 + 0.35 * ds.drift : 1) * (0.55 + 0.45 * ds.steer);
      const yawRate = D.steer * maxYaw * low * high * Math.sign(D.v || 1);
      D.h += yawRate * dt;
      // Driften: das Heck bricht aus (Bewegungsrichtung hinkt der Fahrzeugrichtung hinterher)
      D.slip = D.slip || 0;
      if (drift && sp > 5) { D.slip -= yawRate * dt * 0.8 * ds.drift; D.v *= Math.exp(-0.18 * dt); }
      D.slip *= Math.exp(-(drift && sp > 5 ? 1.1 : 7) * dt); D.slip = Math.max(-0.9, Math.min(0.9, D.slip));
    }
    if (limit < 0.5 && throttle > 0.2 && Math.abs(D.v) < 0.6 && (D.brakeT = (D.brakeT || 0) + dt) > 1.2) { ui.toast(T.braking, 1500); D.brakeT = -3; }
    // Bewegen; Gebäude halten auf (der Helikopter fliegt über Gebäude, die niedriger sind als er)
    const mdir = D.h + (D.slip || 0);
    const q = { x: D.x + Math.sin(mdir) * D.v * dt, z: D.z + Math.cos(mdir) * D.v * dt };
    const hit = { x: q.x, z: q.z };
    resolve(q, S.wid / 2, S.air ? colliders.filter((c) => (c.h ?? 1e9) > D.y - 1) : colliders);
    if (Math.hypot(q.x - hit.x, q.z - hit.z) > 0.02) { D.v *= -0.25; D.slip = 0; } // anprallen und leicht zurückfedern
    D.x = q.x; D.z = q.z;
    if (!S.air) { // Boden folgen; über Kuppen und Rampen abheben (Sprung), weich landen
      const g = ground(D.x, D.z);
      if (D.air) { D.vy -= 22 * dt; D.y += D.vy * dt; if (D.y <= g) { D.y = g; D.air = false; if (D.vy < -7) { D.v *= 0.92; } D.vy = 0; } }
      else {
        const gv = Math.max(-25, Math.min(25, (g - D.y) / Math.max(dt, 1e-3))); // Steiggeschwindigkeit des Bodens unter dem Fahrzeug
        if (D.vyG != null && gv < D.vyG - 7 && D.vyG > 2 && Math.abs(D.v) > 12) { D.air = true; D.vy = Math.min(11, D.vyG) * 0.85; D.y += D.vy * dt; } // Kuppe/Schanze → Sprung (begrenzt)
        else { D.y = g; D.vyG = D.vyG == null ? gv : D.vyG + (gv - D.vyG) * Math.min(1, dt * 12); }
      }
      if (D.air) D.vyG = null;
      D.airT = D.air ? (D.airT || 0) + dt : 0;
    }
    const R = D.veh.root; R.position.set(D.x, D.y, D.z); R.rotation.y = D.h;
    const two = S.len < 2.5, sp2 = Math.min(1, Math.abs(D.v) / 8);
    R.rotation.order = 'YXZ';
    // Neigung am Hang (vorne/hinten), in der Luft Nase leicht nach unten
    const pitchG = S.air ? 0 : Math.atan2(ground(D.x - fx * S.len * 0.4, D.z - fz * S.len * 0.4) - ground(D.x + fx * S.len * 0.4, D.z + fz * S.len * 0.4), S.len * 0.8);
    D.pitch = (D.pitch || 0) + ((S.air ? D.v / S.vmax * 0.15 : D.air ? Math.max(-0.4, Math.min(0.4, -D.vy * 0.02)) : pitchG) - (D.pitch || 0)) * Math.min(1, dt * 8);
    R.rotation.x = D.pitch;
    R.rotation.z = S.air ? -D.steer * 0.15 : two ? -D.steer * 0.38 * sp2 : -D.steer * 0.04 * sp2; // Zweiräder legen sich in die Kurve
    R.updateMatrixWorld(true);
    D.veh.roll(D.v, dt, D.steer);
    // Figur sitzt im Fahrzeug
    D.veh.seat(tmp); player.fig.root.position.copy(tmp); player.fig.root.rotation.y = D.h; player.fig.update(dt, 0);
    player.pos.set(D.x, D.y, D.z); player.heading = D.h;
    // Kamera hinter dem Fahrzeug (wischen = umschauen, kehrt langsam zurück)
    const look = input.yaw - yaw0; yaw0 += look * Math.min(1, dt * 0.8);
    D.camH = D.camH == null ? D.h : D.camH + Math.atan2(Math.sin(D.h - D.camH), Math.cos(D.h - D.camH)) * Math.min(1, dt * 4.5); // Kamera schwenkt weich nach
    const ang = D.camH + Math.PI + look, d0 = S.cam[0] * 0.72 * ds.view, hh = S.air ? S.cam[1] : 1.1 + S.cam[1] * 0.3 * ds.view, dist = d0 * (1 + Math.min(0.25, Math.abs(D.v) / 220)); // flacher Blick: Straße und Horizont sichtbar, Fahrzeug größer
    const wp = tmp.set(D.x + Math.sin(ang) * dist, D.y + hh + input.pitch * 4, D.z + Math.cos(ang) * dist);
    const fovWant = 62 + Math.min(16, Math.abs(D.v) / 6) + (turbo && Math.abs(D.v) > 5 ? 4 : 0); // Tempogefühl if (Math.abs(cam.fov - fovWant) > 0.05) { cam.fov += (fovWant - cam.fov) * Math.min(1, dt * 3); cam.updateProjectionMatrix(); }
    wp.y = Math.max(wp.y, ground(wp.x, wp.z) + 1);
    const k = first ? 1 : 1 - Math.exp(-dt * 6); first = false;
    camPos.lerp(wp, k); camLook.lerp(new THREE.Vector3(D.x + fx * 4, D.y + (S.air ? 1.1 : 1.6), D.z + fz * 4), k); // Fahrer immer in der Bildmitte; die Kamera steht hoch genug, um die Straße davor zu sehen
    cam.position.copy(camPos); cam.lookAt(camLook);
    speedEl.textContent = Math.round(Math.abs(D.v) * 3.6); unitEl.textContent = D.v < -0.3 ? 'km/h · R' : 'km/h';
    infoEl.textContent = S.air ? Math.round(D.y - gy) + ' m Höhe' : mode === 'auto' && autoPts ? '→ ' + autoName : turbo ? 'TURBO' : drift && Math.abs(D.slip) > 0.08 ? 'DRIFT' : '';
    pad.classList.toggle('boost', turbo && Math.abs(D.v) > 3);
    nitroBtn.classList.toggle('cool', nitroCool > 0 && nitroT <= 0); nitroBtn.style.setProperty('--cd', String(nitroT > 0 ? 1 : 1 - nitroCool / 7));
    if (!started && !S.air && autoGas) infoEl.textContent = 'Lenken oder Bremse = los';
    actions();
  }

  // mitgebrachtes Fahrzeug aus der anderen Stadt (nach der Autobahnfahrt): gleich drinsitzen
  function arriveWith(kind, x, z, h) {
    const veh = makeVehicle(world, kind); veh.root.position.set(x, ground(x, z), z); veh.root.rotation.y = h;
    const P = { veh, x, z, h, owner: null, home: { x, z, h }, src: 'away', mine: true };
    parked.push(P);
    interact.add({ obj: veh.root, color: 'blue', radius: 9, near: 3.6, pos: (o) => o.copy(veh.root.position), key: 'away', label: T.enter(veh.name), when: () => !drive && P.parked !== false && parked.includes(P), run: () => enter(P) });
    enter(P);
  }

  return {
    get driving() { return !!drive; },
    get drive() { return drive; }, // für Tests
    get ctl() { return ctl; },
    get parked() { return parked; },
    // mit dem eigenen Fahrzeug über die Autobahn in die andere Stadt
    intercity(to) { if (!drive || drive.spec.air && false) return; setAuto({ intercity: to }); },
    nitro: () => fireNitro(), start: () => { started = true; },
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
      keepNearby(dt);
      for (const d of drivers) d.update?.(dt, 0);
      for (const P of parked) P.owner?.update?.(dt, 0);
      talk.update();
    },
    dispose() { engine.setViewShift?.(null); talk.clear(); pad.remove(); setup.remove(); document.body.classList.remove('driving'); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); if (drive) { player.ride = null; ctx.vehicle = null; } },
  };
}
