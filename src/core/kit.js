import * as THREE from 'three';

// Gemeinsame Bausteine für interaktive Stationen.

// Ablauf als Skript: `await flow.until(() => bedingung)` wartet, bis die Bedingung in einem Frame erfüllt ist.
// `await flow.run(aktion)` aktualisiert eine Aktion (z. B. holdAction) jeden Frame, bis sie fertig ist.
export function createFlow() {
  let waits = [], dead = false, tickers = [];
  return {
    until(cond) { return new Promise((res) => waits.push({ cond, res })); },
    wait(sec) { let t = 0; return this.until(() => (t += this.dt) >= sec); },
    run(action) { tickers.push(action); return this.until(() => action.done); },
    dt: 0,
    update(dt) {
      if (dead) return;
      this.dt = dt;
      tickers = tickers.filter((a) => { a.update(dt); return !a.done; });
      const still = [];
      for (const w of waits) { if (w.cond()) w.res(); else still.push(w); }
      waits = still;
    },
    dispose() { dead = true; waits = []; tickers.forEach((a) => a.cancel?.()); tickers = []; },
    get dead() { return dead; },
  };
}

// Zielmarkierung: leuchtender Ring am Boden + Lichtsäule. Sichtbar aus der Ferne.
// (Alle Markierungen stehen zusätzlich in window.__markers – nur für automatische Tests.)
const MARKERS = (window.__markers = []);
export function createMarker(world, { color = 0xe6c46e, r = 1.6, height = 14 } = {}) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
  const beamG = new THREE.CylinderGeometry(r * 0.55, r * 0.75, height, 24, 1, true); beamG.translate(0, height / 2, 0);
  const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  g.add(ring, beam); g.visible = false; world.add(g);
  let t = 0;
  const api = {
    group: g,
    r,
    show(x, z, y = 0) { g.position.set(x, y, z); g.visible = true; },
    hide() { g.visible = false; },
    get visible() { return g.visible; },
    update(dt) { if (!g.visible) return; t += dt; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05); beam.material.opacity = 0.12 + Math.sin(t * 2) * 0.04; },
    inside(p, extra = 0) { return g.visible && Math.hypot(p.x - g.position.x, p.z - g.position.z) < r + extra; },
  };
  MARKERS.push(api);
  return api;
}

// Pfeil oben links: zeigt relativ zur Blickrichtung zum Ziel.
export function pointGoal(ui, player, text, tx, tz) {
  if (tx == null) { ui.goal(text, null); return; }
  const want = Math.atan2(-(tx - player.pos.x), -(tz - player.pos.z));
  const d = Math.atan2(Math.sin(want - player.viewYaw), Math.cos(want - player.viewYaw));
  const dist = player.distTo(tx, tz);
  ui.goal(dist > 4 ? `${text} · ${Math.round(dist)} m` : text, -d);
}

// Halte-Handlung (Gebet, Dua, Schlafen …): solange der Halte-Knopf gedrückt ist, läuft der Fortschritt.
// steps: Liste von { pose, sec } – die Figur geht die Haltungen der Reihe nach durch.
export function holdAction(ctx, player, { label, steps = [{ pose: 'dua', sec: 3 }], onTick, rest = 'stand' }) {
  const { ui, input } = ctx;
  const total = steps.reduce((a, s) => a + s.sec, 0);
  let t = 0, done = false;
  ui.hold(label);
  player.freeze(true);
  return {
    get progress() { return t / total; },
    get done() { return done; },
    update(dt) {
      if (done) return;
      if (input.holding) {
        t = Math.min(total, t + dt);
        let acc = 0, pose = steps[steps.length - 1].pose;
        for (const s of steps) { if (t < acc + s.sec) { pose = s.pose; break; } acc += s.sec; }
        player.fig.pose(pose);
        onTick?.(t / total, dt);
        if (t >= total) { done = true; ui.hold(null); player.fig.pose(rest); player.freeze(false); input.holding = false; }
      } else if (t > 0 && t < total) {
        player.fig.pose(steps[0].pose === 'stand' ? 'stand' : steps[0].pose);
      }
      ui.counter(done ? '' : `${Math.round((t / total) * 100)} %`);
    },
    cancel() { done = true; ui.hold(null); player.freeze(false); player.fig.pose(rest); },
  };
}

// Ein Gebet mit n Rak'at als Haltungsfolge (Stehen → Ruku' → Stehen → 2× Sujud), am Ende Sitzen.
export function rakatSteps(n, perPose = 0.5) {
  const s = [];
  for (let i = 0; i < n; i++) s.push({ pose: 'stand', sec: perPose * 1.4 }, { pose: 'ruku', sec: perPose }, { pose: 'stand', sec: perPose * 0.6 }, { pose: 'sujud', sec: perPose }, { pose: 'sit', sec: perPose * 0.5 }, { pose: 'sujud', sec: perPose });
  s.push({ pose: 'sit', sec: perPose * 1.5 });
  return s;
}

// Objekte antippen: gibt das getroffene Objekt (oder einen Vorfahren mit userData.pick) zurück.
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
export function pick(engine, x, y, objects) {
  ndc.set((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, engine.camera);
  const hit = ray.intersectObjects(objects, true)[0];
  if (!hit) return null;
  let o = hit.object;
  while (o && !o.userData.pick && o.parent) o = o.parent;
  return { object: o, point: hit.point, distance: hit.distance };
}

// Sunnah-Schritte für die Auswertung am Ende (nur was wirklich getan wurde).
export const SUNNAH_LIST = [
  ['talbiyah', 'Talbiyah'],
  ['istilam', 'Istilam in jeder Runde'],
  ['maqam', '2 Rak\'at hinter Maqam Ibrahim'],
  ['zamzam', 'Zamzam'],
  ['safa', 'Dua auf Safa und Marwa'],
  ['mashar', 'Dhikr am al-Mash\'ar al-Haram'],
  ['jamarat_dua', 'Dua nach den ersten beiden Dschamarat'],
];
export function sunnah(ctx, key) { ctx.progress.sunnah.add(key); }

// Wartet, bis der Spieler in der Markierung steht; zeigt solange den Zielpfeil.
export async function goTo(ctx, flow, marker, text, x, z) {
  marker.show(x, z);
  await flow.until(() => { pointGoal(ctx.ui, ctx.player, text, x, z); return marker.inside(ctx.player.pos); });
  ctx.ui.goal(null);
}

// Aktionsknopf vor Ort zeigen und auf Antippen warten (verschwindet, wenn man den Ort verlässt).
export async function promptAt(ctx, flow, label, inside = () => true, opts = {}) {
  let clicked = false;
  await flow.until(() => {
    if (inside()) ctx.ui.prompt(label, () => { clicked = true; }, opts); else ctx.ui.prompt(null);
    return clicked;
  });
  ctx.ui.prompt(null);
}

// Gebet als Halte-Handlung: Figur geht Stehen/Ruku'/Sujud durch.
export function pray(ctx, flow, rakat, label = 'Halten: beten') {
  return flow.run(holdAction(ctx, ctx.player, { label, steps: rakatSteps(rakat) }));
}

// Winkel zum Ziel relativ zur Blickrichtung (für Qibla-Anzeige)
export function angleTo(player, tx, tz) {
  const want = Math.atan2(-(tx - player.pos.x), -(tz - player.pos.z));
  return Math.atan2(Math.sin(want - player.viewYaw), Math.cos(want - player.viewYaw));
}

// Zur Qibla drehen und Dua halten: Fortschritt läuft nur, wenn man in Richtung Kaaba schaut.
export function duaFacing(ctx, flow, { label = 'Halten: Dua', sec = 6, tx, tz, text = 'Richtung Qibla drehen', onTick }) {
  const { ui, player, input } = ctx;
  let t = 0, done = false;
  ui.hold(label);
  ctx.facingTarget = { x: tx, z: tz };
  const act = {
    get done() { return done; },
    update(dt) {
      const a = angleTo(player, tx, tz), ok = Math.abs(a) < 0.45;
      ui.goal(ok ? 'Qibla ✓' : text, -a);
      if (input.holding && ok) {
        t += dt; player.freeze(true); player.heading = player.viewYaw; player.fig.pose('dua'); onTick?.(t / sec, dt);
        if (t >= sec) { done = true; ui.hold(null); player.freeze(false); player.fig.pose('stand'); ui.goal(null); ui.counter(''); return; }
      } else {
        if (input.holding && !ok) ui.hint('Dreh dich zuerst Richtung Qibla (rechts wischen).', 1200);
        player.freeze(false); if (player.fig.poseName === 'dua') player.fig.pose('stand');
      }
      ui.counter(`${Math.round((t / sec) * 100)} %`);
    },
    cancel() { done = true; ui.hold(null); player.freeze(false); },
  };
  return flow.run(act);
}

// Hält Mitpilger aus dem Bereich um den Spieler und aus der Sichtlinie Kamera → Spieler heraus.
// Pro Frame einmal view = viewLine(ctx) holen, dann für jede Figur clearView(view, x, z) → [x, z].
export function viewLine(ctx) {
  const p = ctx.player.pos, c = ctx.engine.camera.position, cx = c.x - p.x, cz = c.z - p.z;
  return { px: p.x, pz: p.z, cx, cz, l2: cx * cx + cz * cz || 1 };
}
export function clearView(v, x, z) {
  const dx = x - v.px, dz = z - v.pz, dd = Math.hypot(dx, dz);
  if (dd < 1.1) return [v.px + (dx / (dd || 1)) * 1.1, v.pz + (dz / (dd || 1)) * 1.1];
  const t = Math.max(0, Math.min(1, (dx * v.cx + dz * v.cz) / v.l2));
  const qx = x - (v.px + v.cx * t), qz = z - (v.pz + v.cz * t), qd = Math.hypot(qx, qz);
  if (t > 0.03 && qd < 0.9) return [x + (qx / (qd || 1)) * (0.9 - qd), z + (qz / (qd || 1)) * (0.9 - qd)];
  return [x, z];
}

// Autopilot (freiwillig): Knopf erscheint erst, wenn available() wahr ist (z. B. nach 2 Runden).
// steer(dt) → { x, z, fast } Laufrichtung in Weltkoordinaten (oder null = stehen bleiben)
// tick(dt)  → für Handlungen ohne Laufen (z. B. automatisch werfen); wird nur bei aktivem Autopilot gerufen.
// Selbst steuern (Joystick) schaltet ihn aus.
export function createAutopilot(ctx, { available, steer = null, tick = null, label = 'Autopilot' }) {
  const { ui, player } = ctx;
  let on = false, shown = false, finished = false;
  const set = (v) => {
    on = v;
    player.auto = on && steer ? steer : null;
    player.onManual = on ? () => { set(false); ui.toast('Autopilot aus – du gehst selbst'); } : null;
    ui.auto(true, on, () => set(!on));
    if (on) ui.toast(`${label} an – du kannst jederzeit selbst übernehmen`, 2400);
  };
  return {
    get on() { return on; },
    update(dt) {
      if (finished) return;
      const av = available();
      if (av && !shown) { shown = true; ui.auto(true, false, () => set(!on)); ui.toast('Tipp: Autopilot ist jetzt möglich (optional)', 2600); }
      if (!av && shown) { shown = false; if (on) set(false); ui.auto(false); }
      if (on) tick?.(dt);
    },
    finish() { finished = true; if (on) { on = false; player.auto = null; player.onManual = null; } ui.auto(false); },
  };
}
