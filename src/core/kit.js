import * as THREE from 'three';

// Gemeinsame Bausteine für interaktive Stationen.

// Ablauf als Skript: `await flow.until(() => bedingung)` wartet, bis die Bedingung in einem Frame erfüllt ist.
export function createFlow() {
  let waits = [], dead = false;
  return {
    until(cond) { return new Promise((res) => waits.push({ cond, res })); },
    wait(sec) { let t = 0; return this.until(() => (t += this.dt) >= sec); },
    dt: 0,
    update(dt) {
      if (dead) return;
      this.dt = dt;
      const still = [];
      for (const w of waits) { if (w.cond()) w.res(); else still.push(w); }
      waits = still;
    },
    dispose() { dead = true; waits = []; },
    get dead() { return dead; },
  };
}

// Zielmarkierung: leuchtender Ring am Boden + Lichtsäule. Sichtbar aus der Ferne.
export function createMarker(world, { color = 0xe6c46e, r = 1.6, height = 14 } = {}) {
  const g = new THREE.Group();
  const ring = new THREE.Mesh(new THREE.RingGeometry(r * 0.82, r, 48), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05;
  const beamG = new THREE.CylinderGeometry(r * 0.55, r * 0.75, height, 24, 1, true); beamG.translate(0, height / 2, 0);
  const beam = new THREE.Mesh(beamG, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.16, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  g.add(ring, beam); g.visible = false; world.add(g);
  let t = 0;
  return {
    group: g,
    r,
    show(x, z, y = 0) { g.position.set(x, y, z); g.visible = true; },
    hide() { g.visible = false; },
    get visible() { return g.visible; },
    update(dt) { if (!g.visible) return; t += dt; ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05); beam.material.opacity = 0.12 + Math.sin(t * 2) * 0.04; },
    inside(p, extra = 0) { return g.visible && Math.hypot(p.x - g.position.x, p.z - g.position.z) < r + extra; },
  };
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
export function rakatSteps(n, perPose = 0.7) {
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
