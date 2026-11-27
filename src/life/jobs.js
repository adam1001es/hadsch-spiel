import * as THREE from 'three';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';
import { wallet } from './wallet.js';
import { JOBS as T } from '../content/life.js';

// Jobs im Lebensspiel (Mekka/Medina): ein Job zur Zeit, Ziel mit Leitpfeilen, Karte und Zielzeile; Lohn in SAR (wallet.js).
// Taxi (mit Auto Fahrgast abholen und bringen), Lieferdienst (Döner → Kunde), Pilger helfen (zur Moschee begleiten),
// Büro (im Hochhaus fünf Akten bearbeiten). opts: { world, player, interact, borrow, map, shops, places: [{x,z,label}], gate: {x,z}, doener: {x,z} }
export function createJobs(ctx, { world, player, interact, borrow, map, shops, places, gate, doener, baseActions }) {
  const { ui } = ctx;
  let job = null;
  const rnd = (a) => a[(Math.random() * a.length) | 0];
  const far = (from, min) => { const c = places.filter((p) => Math.hypot(p.x - from.x, p.z - from.z) > min); return rnd(c.length ? c : places); };
  const fig = (color) => { const f = createFigure(world, { color, ring: false, models: peopleModels(), rigged: false }); return f; };
  const addGood = () => { try { const o = JSON.parse(localStorage.getItem('hp-life') || '{}'); o.v = 1; o.amanah = (o.amanah || 0) + 1; localStorage.setItem('hp-life', JSON.stringify(o)); } catch { /* egal */ } };

  // ---------- Auswahl (Jobbörse) ----------
  const pop = document.createElement('div'); pop.id = 'jobPop'; pop.hidden = true; document.body.appendChild(pop);
  function openBoard() {
    pop.innerHTML = `<div class="jb-card"><div class="jb-head"><span>💼 ${T.title}</span><button type="button" class="jb-x" aria-label="Schließen">✕</button></div>
      <p class="jb-sub">${T.sub} · 💰 ${wallet.sar} SAR</p><div class="jb-list">${T.list.map((j) => `<button type="button" data-j="${j.id}"><span class="i">${j.icon}</span><span><b>${j.name}</b>${j.info}</span><em>${j.pay}</em></button>`).join('')}</div>
      ${job ? `<p style="margin-top:12px"><button type="button" class="jb-cancel" style="padding:8px 12px;border-radius:10px;border:1px solid #b5402a;background:#fff;color:#b5402a">${T.cancel}</button></p>` : ''}</div>`;
    pop.hidden = false;
  }
  pop.addEventListener('click', (e) => {
    if (e.target === pop || e.target.closest('.jb-x')) { pop.hidden = true; return; }
    if (e.target.closest('.jb-cancel')) { stop(); ui.toast(T.cancelled, 1800); pop.hidden = true; return; }
    const b = e.target.closest('[data-j]'); if (!b) return;
    if (job) { ui.toast(T.busy, 2200); return; }
    pop.hidden = true; start(b.dataset.j);
  });

  // ---------- Ablauf ----------
  function target(t) { job.t = t; map?.setTarget?.(t ? { x: t.x, z: t.z, label: t.label } : null); }
  function stop() { if (!job) return; job.f?.root.removeFromParent(); map?.setTarget?.(null); ui.goal(null); job = null; }
  function pay(n, text) { wallet.add(n); ui.toast(text, 3500); stop(); }
  function start(id) {
    job = { id, phase: 'go' };
    if (id === 'taxi') { const p = far(player.pos, 60); job.f = fig([0xe9e4d8, 0x6f7f8e, 0x3b4a5a][(Math.random() * 3) | 0]); job.f.root.position.set(p.x, 0, p.z); target({ ...p, label: T.taxi.pick }); job.goal = T.taxi.pick; ui.toast(T.taxi.start, 3200); }
    else if (id === 'delivery') { target({ ...doener, label: T.delivery.pick }); job.goal = T.delivery.pick; ui.toast(T.delivery.start, 2800); }
    else if (id === 'help') { const p = far(gate, 80); job.f = fig(0xe9e4d8); job.f.root.position.set(p.x, 0, p.z); target({ ...p, label: T.help.find }); job.goal = T.help.find; ui.toast(T.help.start, 3000); }
    else if (id === 'office') { const d = shops.towerDoor; if (!d) { job = null; return; } target({ x: d.x, z: d.z, label: T.office.go }); job.goal = T.office.go; ui.toast(T.office.start, 3000); }
  }

  // Büro: Raum im Hochhaus, fünf Schreibtische nacheinander
  let office = null;
  if (shops.towerDoor) {
    office = shops.makeRoom('buero', shops.towerDoor);
    interact.add({ objs: [], color: 'green', radius: 6, near: 2.4, pos: (v) => v.set(shops.towerDoor.x, 0, shops.towerDoor.z), key: 'office-enter', label: T.office.enter, when: () => job?.id === 'office' && job.phase === 'go' && !shops.inside,
      run: () => { shops.enter(office); job.phase = 'work'; job.k = 0; target(null); job.goal = T.office.task(1); } });
    office.desks.forEach((d, i) => interact.add({ objs: [], color: 'green', radius: 3, near: 1.6, x: office.x + d.x, z: d.z, key: 'desk-' + i, label: T.office.file,
      when: () => job?.id === 'office' && job.phase === 'work' && shops.inside === office && job.k === i,
      run: () => { job.k++; ui.toast(T.office.fileDone(job.k), 1400); if (job.k >= office.desks.length) pay(60, T.office.done); else job.goal = T.office.task(job.k + 1); } }));
  }

  // Aktionsleiste: Jobs und eigenes Auto
  function refreshActions() {
    baseActions.length = 0;
    baseActions.push(...(baseActions.base || []));
    baseActions.push({ label: T.open, kind: 'primary', onClick: () => openBoard() });
    const cars = wallet.owned('car:');
    if (cars.length) baseActions.push({ label: T.myCar, onClick: () => { const k = cars[cars.length - 1].slice(4), h = player.heading; borrow.rent(k, player.pos.x + Math.cos(h) * 3.5, player.pos.z - Math.sin(h) * 3.5, h, k === 'sport'); } });
    if (!borrow.driving && !shops.inside) ui.actions(baseActions);
  }
  let carsN = -1;

  const v = new THREE.Vector3();
  return {
    openBoard, refreshActions, get job() { return job; },
    update(dt) {
      const n = wallet.owned('car:').length; if (n !== carsN) { carsN = n; refreshActions(); }
      shops.towerBusy = job?.id === 'office' && job.phase === 'go';
      if (!job) return;
      if (job.id === 'office' && job.phase === 'work' && shops.inside !== office) { job.phase = 'go'; target({ x: shops.towerDoor.x, z: shops.towerDoor.z, label: T.office.go }); job.goal = T.office.go; }
      const P = player.pos, D = borrow.drive;
      const dist = job.t ? Math.hypot(job.t.x - P.x, job.t.z - P.z) : 1e9;
      if (job.t && !D && !shops.inside) player.guideTo(job.t.x, job.t.z);
      ui.goal(job.goal + (job.t && dist > 8 ? ` · ${Math.round(dist)} m` : '') + (job.timer != null ? ` · ${Math.max(0, Math.ceil(job.timer))} s` : ''));
      if (job.id === 'taxi') {
        if (job.phase === 'go' && dist < 10) {
          if (!D || D.spec.air) { if (!job.warned) { job.warned = true; ui.toast(T.taxi.inCar, 2400); } }
          else if (Math.abs(D.v) < 4) { job.f.root.visible = false; job.phase = 'ride'; const d = far(P, 150); job.from = { x: P.x, z: P.z }; target(d); job.goal = T.taxi.drop(d.label); ui.toast(T.taxi.aboard, 2200); }
        } else if (job.phase === 'ride' && dist < 10 && D && Math.abs(D.v) < 5) {
          const p = 30 + Math.min(60, Math.round(Math.hypot(job.t.x - job.from.x, job.t.z - job.from.z) / 8));
          job.f.root.position.set(P.x + 2, 0, P.z); job.f.root.visible = true; const f = job.f; job.f = null; setTimeout(() => f.root.removeFromParent(), 4000);
          pay(p, T.taxi.done(p));
        }
        if (job?.f && job.phase === 'go') { job.f.root.lookAt(P.x, 0, P.z); job.f.update(dt, 0); }
      } else if (job.id === 'delivery') {
        if (job.phase === 'go' && dist < 5) { const d = far(P, 120); target(d); job.goal = T.delivery.drop(d.label); job.phase = 'drop'; job.timer = 150; ui.toast(T.delivery.got, 2200); }
        else if (job.phase === 'drop') { job.timer -= dt; if (dist < 6) { const fast = job.timer > 0; pay(fast ? 40 : 25, T.delivery.done(fast ? 40 : 25, fast)); } }
      } else if (job.id === 'help') {
        const F = job.f.root;
        if (job.phase === 'go') { F.lookAt(P.x, 0, P.z); job.f.update(dt, 0); if (dist < 3 && !D) { job.phase = 'follow'; target({ ...gate, label: T.help.goal }); job.goal = T.help.goal; ui.toast(T.help.follow, 2600); } }
        else { // folgt mit etwas Abstand
          v.set(P.x - F.position.x, 0, P.z - F.position.z); const d = v.length(), sp = d > 2.2 ? Math.min(4.5, d * 1.2) : 0;
          if (d > 30) F.position.set(P.x - 1.5, 0, P.z - 1.5); else if (sp) F.position.addScaledVector(v.normalize(), sp * dt);
          F.rotation.y = Math.atan2(P.x - F.position.x, P.z - F.position.z); job.f.pose(sp ? 'walk' : 'stand'); job.f.update(dt, sp / 1.6);
          if (Math.hypot(F.position.x - gate.x, F.position.z - gate.z) < 8) { addGood(); const f = job.f; job.f = null; setTimeout(() => f.root.removeFromParent(), 3000); pay(20, T.help.thanks); }
        }
      }
    },
    dispose() { stop(); pop.remove(); },
  };
}
