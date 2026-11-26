import * as THREE from 'three';
import { resolve } from '../core/player.js';
import { liveryTexture } from '../world/livery.js';

// Fallschirmsprung (Lebensspiel): aus dem Helikopter oder dem Heißluftballon abspringen.
// Freier Fall (Joystick = leicht in eine Richtung gleiten) → Schirm öffnen (Knopf, automatisch spätestens 70 m über dem Boden)
// → gleiten: Joystick links/rechts = lenken, vor = schneller sinken, zurück = bremsen → Landung, dann normal weitergehen.
// Gebäude halten seitlich auf, solange man nicht über ihnen ist; Moscheen/Haram haben keine Höhe → dort landet man nicht.

// Schirm (Gleitschirm-Form in islamlernen.at-Farben) mit Leinen zum Gurt (Ursprung = Gurt der Figur)
export function makeCanopy() {
  const g = new THREE.Group();
  const geo = new THREE.CylinderGeometry(4, 4, 7, 24, 1, true, -0.75, 1.5); // Bogen, Spannweite entlang der Zylinderachse
  geo.rotateZ(Math.PI / 2); geo.rotateX(-Math.PI / 2); // Achse quer (x), Bogen wölbt sich nach oben (Mitte über dem Kopf)
  const mat = new THREE.MeshStandardMaterial({ map: liveryTexture(), side: THREE.DoubleSide, roughness: 0.8 });
  const c = new THREE.Mesh(geo, mat); c.position.y = 2.2; c.scale.set(1, 1, 0.7); c.castShadow = true; g.add(c);
  const pts = [], top = 2.2 + 4 * Math.cos(0.75);
  for (const x of [-3.4, -1.7, 0, 1.7, 3.4]) for (const z of [-0.9, 0.9]) { pts.push(new THREE.Vector3(0, 1.5, 0), new THREE.Vector3(x, top - Math.abs(x) * 0.08, z)); }
  g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2b2b2b, transparent: true, opacity: 0.7 })));
  return g;
}

// opts: { player, ground(x, z), colliders, onLand() }
export function createParachute(ctx, { player, ground, colliders = [], onLand = null, noLand = () => null }) {
  const { engine, ui, input } = ctx;
  const cam = engine.camera, camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), tmp = new THREE.Vector3();
  const canopy = makeCanopy(); canopy.visible = false; engine.world.add(canopy);
  let S = null, first = true;

  function setActions() {
    ui.actions(S.phase === 'fall' ? [{ label: '🪂 Schirm öffnen', kind: 'primary', onClick: () => open() }] : []);
  }
  function open() { if (!S || S.phase !== 'fall') return; S.phase = 'glide'; S.open = 0; canopy.visible = true; S.sp = Math.max(6, Math.hypot(S.vx, S.vz)); setActions(); ui.toast('Schirm offen – Joystick: lenken, vor = schneller, zurück = bremsen', 2600); }
  function land() {
    const s = S; S = null; canopy.visible = false; ctx.para = null;
    player.ride = null; player.freeze(false); player.fig.root.rotation.set(0, s.h, 0); player.fig.pose('stand');
    const q = { x: player.pos.x, z: player.pos.z }; resolve(q, 0.4, colliders); player.teleport(q.x, q.z, s.h);
    ui.counter(''); ui.toast('Gelandet! 🪂', 1800); onLand?.();
  }
  function ride(dt) {
    const p = player.pos, gy = ground(p.x, p.z);
    const mx = input.move.x, my = input.move.y;
    if (S.phase === 'fall') {
      S.vy = Math.max(-48, S.vy - 9.8 * dt);
      // im freien Fall ein wenig in Blickrichtung gleiten
      const yaw = S.h, fx = Math.sin(yaw), fz = Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      S.vx += ((fx * -my + rx * -mx) * 9 - S.vx) * Math.min(1, dt * 1.5); S.vz += ((fz * -my + rz * -mx) * 9 - S.vz) * Math.min(1, dt * 1.5);
      S.h -= mx * dt * 1.2;
      if (p.y - gy < 70) open();
    } else {
      S.open = Math.min(1, S.open + dt * 1.6);
      S.h -= mx * dt * 1.3; // lenken
      const wantSp = 9 - my * 4, wantVy = -4.2 + my * 2.8; // vor (my < 0): schneller und steiler
      S.sp += (wantSp - S.sp) * Math.min(1, dt * 1.5);
      S.vy += (wantVy - S.vy) * Math.min(1, dt * (S.open < 1 ? 3 : 1.5));
      S.vx = Math.sin(S.h) * S.sp; S.vz = Math.cos(S.h) * S.sp;
    }
    // nicht auf Kaaba, Prophetenmoschee oder Moscheen landen: dort hält der Schirm die Höhe, bis man weggelenkt hat
    const why = S.phase === 'glide' && p.y - gy < 45 ? noLand(p.x, p.z) : null;
    if (why) { S.vy = Math.max(S.vy, 0); if ((S.nlT = (S.nlT || 0) + dt) > 0.4) { ui.toast(why + ' – bitte weglenken', 2400); S.nlT = -3; } }
    const q = { x: p.x + S.vx * dt, z: p.z + S.vz * dt };
    resolve(q, 0.5, colliders.filter((c) => (c.h ?? 1e9) > p.y - 1)); // Gebäude, die höher sind als man selbst, halten auf
    p.x = q.x; p.z = q.z; p.y += S.vy * dt;
    const g2 = ground(p.x, p.z);
    if (p.y <= g2) { p.y = g2; land(); return; }
    // Figur und Schirm
    const F = player.fig.root; F.position.copy(p); F.rotation.order = 'YXZ';
    if (S.phase === 'fall') { F.rotation.set(-1.2, S.h, 0); player.fig.pose('stand'); }
    else { F.rotation.set(0, S.h, -mx * 0.25); player.fig.pose('ride');
      canopy.position.copy(p); canopy.rotation.set(0, S.h, -mx * 0.2); canopy.scale.set(0.3 + 0.7 * S.open, 0.3 + 0.7 * S.open, 1); }
    player.fig.update(dt, 0); player.heading = S.h;
    // Kamera hinter und etwas über der Figur (wischen = umschauen, kehrt zurück)
    const look = input.yaw - S.yaw0; S.yaw0 += look * Math.min(1, dt * 0.8);
    const ang = S.h + Math.PI + look, dist = S.phase === 'fall' ? 8 : 13, hh = S.phase === 'fall' ? 3 : 9.5; // über dem Schirm, damit man ihn von oben sieht
    tmp.set(p.x + Math.sin(ang) * dist, p.y + hh + input.pitch * 6, p.z + Math.cos(ang) * dist); tmp.y = Math.max(tmp.y, ground(tmp.x, tmp.z) + 1.2);
    const k = first ? 1 : 1 - Math.exp(-dt * 6); first = false;
    camPos.lerp(tmp, k); camLook.lerp(tmp.set(p.x, p.y + (S.phase === 'fall' ? 0.5 : 2.5), p.z), k);
    cam.position.copy(camPos); cam.lookAt(camLook);
    ui.counter(`🪂 ${Math.max(0, Math.round(p.y - g2))} m`);
  }
  return {
    get active() { return !!S; },
    // Absprung bei (x, y, z), Blickrichtung h, mitgenommenes Tempo (vx, vz)
    start(x, y, z, h, vx = 0, vz = 0) {
      S = { phase: 'fall', vy: 0, vx, vz, h, yaw0: input.yaw, open: 0, sp: 0 }; first = true;
      player.ride = ride; player.freeze(true); player.pos.set(x, y, z); ctx.para = S;
      ui.el.panel.classList.add('collapsed'); ui.prompt(null);
      if (y - ground(x, z) < 90) open(); else { setActions(); ui.toast('Freier Fall! Schirm öffnen oder bis 70 m warten', 2400); }
    },
    dispose() { canopy.removeFromParent(); if (S) { player.ride = null; player.freeze(false); ctx.para = null; } },
  };
}
