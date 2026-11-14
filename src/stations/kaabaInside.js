import * as THREE from 'three';
import { KAABA_INSIDE as T } from '../content/hajj.js';
import { pbr } from '../world/assets.js';
import { canvasTexture } from '../world/textures.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, goTo, holdAction, rakatSteps } from '../core/kit.js';

// Belohnungs-Level nach dem Hadsch: das Innere der Kaaba (vereinfacht, respektvoll, ohne andere Personen).
// Raum ca. 10 × 8,6 m, Tür auf der +z-Seite (wie draußen: Nordost-Wand), Bab at-Tawbah in der Ecke (+x, +z).
// Unten heller Marmor, darüber und an der Decke grüner Vorhang mit stilisierter Schrift (keine echte Kalligrafie),
// drei Holzsäulen in einer Reihe, hängende Lampen. Licht: wenige Lampen, keine teuren Schatten.
const W = 10.2, D = 8.6, H = 9, MARBLE_H = 2.6;
const DOOR_X = -2.8; // wie die Tür außen (−w/2 + 3,2)

// Grüner Vorhang: Zickzack-Bänder mit stilisierten Schriftzügen (nur Formen, keine Buchstaben)
function curtainTexture(rep) {
  return canvasTexture(512, 512, (g, w, h) => {
    g.fillStyle = '#1f5a3c'; g.fillRect(0, 0, w, h);
    // feiner Stoff
    for (let i = 0; i < 4000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 3); }
    const band = (y0, dir) => {
      g.save(); g.strokeStyle = 'rgba(236,230,210,.85)'; g.lineWidth = 3;
      g.beginPath();
      for (let x = 0; x <= w; x += 64) { const y = y0 + ((x / 64) % 2 ? -1 : 1) * 42 * dir; x ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); g.restore();
    };
    for (let k = 0; k < 4; k++) { band(64 + k * 128, 1); band(64 + k * 128 + 18, 1); }
    // stilisierte Schriftzüge zwischen den Zickzacklinien: geschwungene Linien und Punkte
    g.strokeStyle = 'rgba(240,236,220,.8)'; g.fillStyle = 'rgba(240,236,220,.8)'; g.lineCap = 'round';
    for (let k = 0; k < 4; k++) for (let x = 0; x < w; x += 64) {
      const up = (x / 64) % 2 === 0, cy = 64 + k * 128 + (up ? 46 : -22), cx = x + 32;
      g.lineWidth = 2.6; g.beginPath();
      g.moveTo(cx - 20, cy); g.bezierCurveTo(cx - 10, cy - 14, cx + 4, cy + 10, cx + 20, cy - 4);
      g.moveTo(cx - 6, cy - 16); g.lineTo(cx - 6, cy + 2); g.moveTo(cx + 8, cy - 14); g.lineTo(cx + 8, cy);
      g.stroke();
      g.beginPath(); g.arc(cx - 14, cy + 9, 2, 0, 7); g.arc(cx + 13, cy + 8, 2, 0, 7); g.fill();
    }
  }, rep);
}

export function create(ctx) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(21);
  sky.state.indoor = true;
  sky.state.shadowSize = 14;

  // Boden: heller Marmor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [W / 1.2, D / 1.2]), roughness: 0.6, color: 0xf4f1ea }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  // Wände: unten Marmor, oben grüner Vorhang; Decke grün
  const marbleM = new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [3, 1]), roughness: 0.5, color: 0xf6f2ea });
  const greenM = (len, hh) => new THREE.MeshStandardMaterial({ map: curtainTexture([len / 3.2, hh / 3.2]), roughness: 0.85, color: 0xffffff });
  const walls = [
    { x: 0, z: -D / 2, ry: 0, len: W }, { x: 0, z: D / 2, ry: Math.PI, len: W },
    { x: -W / 2, z: 0, ry: Math.PI / 2, len: D }, { x: W / 2, z: 0, ry: -Math.PI / 2, len: D },
  ];
  for (const wl of walls) {
    const g = new THREE.Group(); g.position.set(wl.x, 0, wl.z); g.rotation.y = wl.ry; world.add(g);
    const lo = new THREE.Mesh(new THREE.PlaneGeometry(wl.len, MARBLE_H), marbleM); lo.position.y = MARBLE_H / 2; g.add(lo);
    const hi = new THREE.Mesh(new THREE.PlaneGeometry(wl.len, H - MARBLE_H), greenM(wl.len, H - MARBLE_H)); hi.position.y = MARBLE_H + (H - MARBLE_H) / 2; g.add(hi);
    // goldene Leiste zwischen Marmor und Vorhang
    const trim = new THREE.Mesh(new THREE.BoxGeometry(wl.len, 0.12, 0.05), new THREE.MeshStandardMaterial({ color: 0xc9a45a, metalness: 0.8, roughness: 0.35 }));
    trim.position.set(0, MARBLE_H, 0.03); g.add(trim);
    // Marmortafeln mit Inschriften (angedeutet)
    for (let x = -wl.len / 2 + 1.4; x < wl.len / 2 - 0.8; x += 2.6) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.9), new THREE.MeshStandardMaterial({ color: 0xe4ddcf, roughness: 0.4 }));
      p.position.set(x, 1.6, 0.012); g.add(p);
    }
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), greenM(W, D)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; world.add(ceil);

  // Tür (innen): goldene Fläche in der +z-Wand, geschlossen
  const goldM = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3, emissive: 0x8a6418, emissiveIntensity: 0.6 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.1), goldM); door.position.set(DOOR_X, 1.8, D / 2 - 0.05); world.add(door);
  // Bab at-Tawbah: kleinere goldene Tür in der Ecke (+x, +z)
  const tawbah = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.5, 0.1), goldM); tawbah.position.set(W / 2 - 0.9, 1.25, D / 2 - 0.05); world.add(tawbah);

  // Drei Holzsäulen in einer Reihe, mit Querbalken oben
  const wood = new THREE.MeshStandardMaterial({ color: 0x6b4426, roughness: 0.55 });
  const PILLARS = [-3.3, 0, 3.3];
  for (const x of PILLARS) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, H, 16), wood); c.position.set(x, H / 2, 0); c.castShadow = true; world.add(c);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 0.4, 16), wood); base.position.set(x, 0.2, 0); world.add(base);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 0.6), wood); cap.position.set(x, H - 0.4, 0); world.add(cap);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.3, 0.3), wood); beam.position.set(0, H - 0.75, 0); world.add(beam);

  // Hängende Lampen zwischen den Säulen (leuchten warm)
  const lampM = new THREE.MeshStandardMaterial({ color: 0xe8d2a0, metalness: 0.6, roughness: 0.35, emissive: 0xffc070, emissiveIntensity: 1.4 });
  const chainM = new THREE.MeshStandardMaterial({ color: 0xb79a5a, metalness: 0.8, roughness: 0.4 });
  for (const x of [-4.6, -1.65, 1.65, 4.6]) for (const z of [-0.35, 0.35]) {
    const len = 2.4 + Math.abs(x) * 0.15;
    const ch = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 4), chainM); ch.position.set(x, H - 0.75 - len / 2, z); world.add(ch);
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), lampM); l.scale.y = 1.3; l.position.set(x, H - 0.75 - len - 0.12, z); world.add(l);
  }
  // Licht: warmes Raumlicht (zwei Punktlichter ohne Schatten), dazu das Innenlicht des Himmels-Systems
  for (const x of [-2.5, 2.5]) { const pl = new THREE.PointLight(0xffd9a0, 18, 16, 1.6); pl.position.set(x, 5.5, 0); world.add(pl); }

  const colliders = [
    { type: 'rect', x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 },
    ...PILLARS.map((x) => ({ type: 'circle', x, z: 0, r: 0.42 })),
  ];
  const player = createPlayer(ctx, { x: DOOR_X, z: D / 2 - 1.2, heading: 0, color: 0xf3f1ea, speed: 1.6, fastSpeed: 2.4, colliders, camDist: 3.4, camHeight: 1.6, surface: 'marble' });
  const flow = createFlow();
  const marker = createMarker(world, { r: 0.8, height: 3 });

  // Kurze Hinweise, wenn man an Säulen, Bab at-Tawbah oder Lampen vorbeikommt
  const spots = [
    { x: 0, z: 0, r: 1.6, text: T.pillars }, { x: W / 2 - 0.9, z: D / 2 - 1, r: 1.5, text: T.tawbah },
    { x: 4.6, z: -1.5, r: 1.3, text: T.lamps },
  ];
  const seen = new Set();

  ui.el.day.textContent = 'Belohnung';
  ui.el.title.textContent = T.title;
  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${T.intro}</p><p>${T.look}</p><p class="tr">${T.real}</p>`);

  async function run() {
    await flow.wait(2.5);
    const px = DOOR_X, pz = -D / 2 + 1.5;
    ui.info(`<p>${T.goalInfo}</p><p class="tr">${T.real}</p>`);
    await goTo(ctx, flow, marker, T.goal, px, pz);
    marker.hide();
    player.heading = 0;
    await flow.run(holdAction(ctx, player, { label: T.pray, steps: rakatSteps(2) }));
    ui.info(`<p>${T.anyDir}</p><p>${T.hijr}</p>`);
    await flow.run(holdAction(ctx, player, { label: T.dua, steps: [{ pose: 'dua', sec: 4 }] }));
    ui.counter('');
    ui.info(`<p><b>${T.end}</b></p><p class="tr">${T.real}</p>`);
    ui.actions([
      { label: T.back, onClick: () => ctx.backToEnding?.() },
      { label: T.again, kind: 'primary', onClick: () => location.reload() },
    ]);
  }
  run();

  return {
    update(dt) {
      flow.update(dt);
      player.update(dt);
      marker.update(dt);
      // Kamera bleibt im Raum
      const c = engine.camera.position;
      c.x = Math.max(-W / 2 + 0.25, Math.min(W / 2 - 0.25, c.x));
      c.z = Math.max(-D / 2 + 0.25, Math.min(D / 2 - 0.25, c.z));
      c.y = Math.min(H - 0.4, c.y);
      for (const s of spots) if (!seen.has(s) && player.distTo(s.x, s.z) < s.r) { seen.add(s); ui.toast(s.text, 3500); }
    },
    dispose() { flow.dispose(); },
  };
}
