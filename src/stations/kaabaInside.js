import * as THREE from 'three';
import { KAABA_INSIDE as T } from '../content/hajj.js';
import { canvasTexture, goldDoor } from '../world/textures.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, goTo, holdAction, rakatSteps } from '../core/kit.js';

// Belohnungs-Level nach dem Hadsch: das Innere der Kaaba (vereinfacht, respektvoll, ohne andere Personen).
// Gestaltung nach Vorlage-Bildern des Innenraums:
// - weißer Marmorboden mit dunkelgrünen Bändern und feinen Goldlinien (Rahmen an den Wänden und um jede Säule)
// - Wände: dunkelgrüner Sockel, weißer Marmor, dunkelgrünes Band, Rautenreihe, darüber grüner gemusterter Vorhang (auch Decke)
// - drei runde Holzsäulen (dunkles Rotbraun) mit goldenen Ringen und Zierbändern auf dunklen, quadratischen Marmorsockeln
// - lange Stange mit vielen hängenden Messing- und Goldlampen, achteckiger weißer Marmortisch mit dunkler Platte
// - goldene Tür (Bab al-Kaaba) und Bab at-Tawbah in der Ecke (+x, +z), kleine Tafeln an der Wand
// Raum ca. 10 × 8,6 m, Tür auf der +z-Seite (wie draußen: Nordost-Wand).
const W = 10.2, D = 8.6, H = 8;
const DOOR_X = -2.8; // wie die Tür außen (−w/2 + 3,2)
const PILLARS = [-3.3, 0, 3.3];
const TABLE = { x: -1.65, z: 0.9 };
const PX = 100; // Pixel pro Meter für die Bodentextur

const DARK = '#1f3a2e', GOLDC = '#c9a24e';
function veins(g, w, h, n, alpha) {
  for (let i = 0; i < n; i++) {
    g.strokeStyle = `rgba(165,162,154,${alpha * 0.6 * (0.4 + Math.random())})`; g.lineWidth = 0.5 + Math.random() * 0.8; g.beginPath();
    let x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += (Math.random() - 0.5) * 140; y += (Math.random() - 0.4) * 90; g.lineTo(x, y); }
    g.stroke();
  }
}
// Rahmen: dunkelgrünes Band mit Goldlinie, innen weißer Streifen und schmales grünes Band
function frame(g, x, y, w, h) {
  const B = 0.14 * PX, gap = 0.08 * PX, b2 = 0.06 * PX;
  g.strokeStyle = DARK; g.lineWidth = B; g.strokeRect(x + B / 2, y + B / 2, w - B, h - B);
  g.strokeStyle = GOLDC; g.lineWidth = 2; g.strokeRect(x + B + 3, y + B + 3, w - 2 * B - 6, h - 2 * B - 6);
  const o = B + gap; g.strokeStyle = DARK; g.lineWidth = b2; g.strokeRect(x + o + b2 / 2, y + o + b2 / 2, w - 2 * o - b2, h - 2 * o - b2);
}
function floorTexture() {
  return canvasTexture(W * PX, D * PX, (g, w, h) => {
    g.fillStyle = '#f2f0eb'; g.fillRect(0, 0, w, h);
    // Marmorplatten (feine Fugen) und Adern
    g.strokeStyle = 'rgba(160,156,146,.35)'; g.lineWidth = 1.5;
    for (let x = 0; x < w; x += 1.2 * PX) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    for (let y = 0; y < h; y += 1.2 * PX) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    veins(g, w, h, 60, 0.18);
    // Randstreifen an den Wänden (dunkel) und großer Rahmen
    g.fillStyle = DARK; const e = 0.12 * PX; g.fillRect(0, 0, w, e); g.fillRect(0, h - e, w, e); g.fillRect(0, 0, e, h); g.fillRect(w - e, 0, e, h);
    frame(g, 0.55 * PX, 0.55 * PX, w - 1.1 * PX, h - 1.1 * PX);
    // Rahmen um jede Säule
    for (const x of PILLARS) { const s = 1.5 * PX, cx = (x + W / 2) * PX, cy = (D / 2) * PX; frame(g, cx - s / 2, cy - s / 2, s, s); }
  });
}
// Wandverkleidung bis 4,3 m: dunkler Sockel, weißer Marmor, grünes Band, Rautenreihe, grünes Band
const WALL_H = 4.3;
function wallTexture(len) {
  const pxm = 60;
  return canvasTexture(Math.round(len * pxm), Math.round(WALL_H * pxm), (g, w, h) => {
    const Y = (m) => h - m * pxm; // Höhe in Metern → Pixel (von unten)
    g.fillStyle = '#f3f1ec'; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(160,156,146,.3)'; g.lineWidth = 1;
    for (let x = 0; x < w; x += 1.1 * pxm) { g.beginPath(); g.moveTo(x, Y(3.2)); g.lineTo(x, Y(0.4)); g.stroke(); }
    veins(g, w, h, 30, 0.14);
    g.fillStyle = DARK; g.fillRect(0, Y(0.4), w, 0.4 * pxm);              // Sockel
    g.fillStyle = GOLDC; g.fillRect(0, Y(0.42), w, 2);
    g.fillStyle = DARK; g.fillRect(0, Y(3.38), w, 0.18 * pxm);            // Band
    g.fillStyle = GOLDC; g.fillRect(0, Y(3.2), w, 2); g.fillRect(0, Y(3.38), w, 2);
    g.fillStyle = DARK;                                                     // Rautenreihe
    for (let x = 0.3 * pxm; x < w; x += 0.6 * pxm) { const cy = Y(3.8), r = 0.08 * pxm; g.beginPath(); g.moveTo(x, cy - r); g.lineTo(x + r, cy); g.lineTo(x, cy + r); g.lineTo(x - r, cy); g.fill(); }
    g.fillRect(0, Y(4.3), w, 0.12 * pxm);
  });
}
// Grüner Vorhang (Wände oben und Decke): helles Salbeigrün mit dichtem, feinem Muster (stilisiert, keine echte Schrift)
function curtainTexture(rep) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#5f8a62'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`; g.fillRect(Math.random() * w, Math.random() * h, 1, 2); }
    g.strokeStyle = 'rgba(214,232,206,.38)'; g.fillStyle = 'rgba(214,232,206,.38)'; g.lineCap = 'round'; g.lineWidth = 1.6;
    for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) {
      const cx = col * 32 + (row % 2) * 16 + 8, cy = row * 32 + 16;
      g.beginPath(); g.moveTo(cx - 9, cy + 4); g.bezierCurveTo(cx - 4, cy - 6, cx + 3, cy + 8, cx + 10, cy - 2);
      g.moveTo(cx - 3, cy - 9); g.lineTo(cx - 3, cy + 2); g.moveTo(cx + 4, cy - 8); g.lineTo(cx + 4, cy + 1); g.stroke();
      g.beginPath(); g.arc(cx + 8, cy + 6, 1.3, 0, 7); g.fill();
    }
  }, rep);
}

export function create(ctx) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(12);
  sky.state.indoor = true;
  sky.state.shadowSize = 14;

  // Boden
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.22, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);

  // Wände
  const greenM = (len, hh) => new THREE.MeshStandardMaterial({ map: curtainTexture([len / 0.9, hh / 0.9]), roughness: 0.9 });
  const walls = [
    { x: 0, z: -D / 2, ry: 0, len: W }, { x: 0, z: D / 2, ry: Math.PI, len: W },
    { x: -W / 2, z: 0, ry: Math.PI / 2, len: D }, { x: W / 2, z: 0, ry: -Math.PI / 2, len: D },
  ];
  for (const wl of walls) {
    const g = new THREE.Group(); g.position.set(wl.x, 0, wl.z); g.rotation.y = wl.ry; world.add(g);
    const lo = new THREE.Mesh(new THREE.PlaneGeometry(wl.len, WALL_H), new THREE.MeshStandardMaterial({ map: wallTexture(wl.len), roughness: 0.3 }));
    lo.position.y = WALL_H / 2; lo.receiveShadow = true; g.add(lo);
    const hi = new THREE.Mesh(new THREE.PlaneGeometry(wl.len, H - WALL_H), greenM(wl.len, H - WALL_H)); hi.position.y = WALL_H + (H - WALL_H) / 2; g.add(hi);
  }
  // Wandtafeln: dunkelgrüne Tafeln mit Goldrahmen, eine goldene Tafel
  const plaqueM = new THREE.MeshStandardMaterial({ color: 0x2c4a3a, roughness: 0.4 }), plaqueG = new THREE.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.9, roughness: 0.35 });
  const plaques = [[0, -D / 2, 0, -3.8], [0, -D / 2, 0, -1.2], [0, -D / 2, 0, 2.6], [-W / 2, 0, Math.PI / 2, -1.5], [-W / 2, 0, Math.PI / 2, 2], [W / 2, 0, -Math.PI / 2, 0.8], [0, D / 2, Math.PI, 0.6], [0, D / 2, Math.PI, 2.6]];
  plaques.forEach(([x, z, ry, off], i) => {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; world.add(g);
    const f = new THREE.Mesh(new THREE.BoxGeometry(i % 4 === 1 ? 1.0 : 0.62, i % 4 === 1 ? 0.75 : 0.9, 0.03), plaqueG); f.position.set(off, 2.3, 0.02); g.add(f);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(i % 4 === 1 ? 0.9 : 0.52, i % 4 === 1 ? 0.65 : 0.8), i === 2 ? plaqueG : plaqueM); p.position.set(off, 2.3, 0.04); g.add(p);
  });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), greenM(W, D)); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; world.add(ceil);
  // Deckenleiste
  const trimM = new THREE.MeshStandardMaterial({ color: 0x2a4a38, roughness: 0.6 });
  for (const wl of walls) { const t = new THREE.Mesh(new THREE.BoxGeometry(wl.len, 0.25, 0.12), trimM); t.position.set(wl.x, H - 0.12, wl.z); t.rotation.y = wl.ry; world.add(t); }

  // Tür innen: goldene Doppeltür im weißen Marmorrahmen
  const dt = goldDoor();
  const doorM = new THREE.MeshStandardMaterial({ map: dt.map, bumpMap: dt.bump, bumpScale: 2, metalness: 0.9, roughness: 0.32, emissive: 0x5a3e10, emissiveIntensity: 0.35 });
  const frameM = new THREE.MeshStandardMaterial({ color: 0xece8df, roughness: 0.3 });
  const df = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.9, 0.12), frameM); df.position.set(DOOR_X, 1.95, D / 2 - 0.06); world.add(df);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 3.5), doorM); door.position.set(DOOR_X, 1.75, D / 2 - 0.125); door.rotation.y = Math.PI; world.add(door);
  // Bab at-Tawbah: verkleidete Ecke mit kleiner goldener Tür
  const tb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 3.4, 0.5), new THREE.MeshStandardMaterial({ color: 0xeeeae2, roughness: 0.35 })); tb.position.set(W / 2 - 0.75, 1.7, D / 2 - 0.25); world.add(tb);
  const tbd = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.4), doorM); tbd.position.set(W / 2 - 0.75, 1.25, D / 2 - 0.51); tbd.rotation.y = Math.PI; world.add(tbd);

  // Säulen: dunkles Rotbraun, goldene Ringe und Zierbänder, dunkler quadratischer Sockel mit Goldkante
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a2216, roughness: 0.45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd6b25e, metalness: 0.95, roughness: 0.3, emissive: 0x3a2808, emissiveIntensity: 0.4 });
  const darkStone = new THREE.MeshStandardMaterial({ color: 0x1d2a24, roughness: 0.25 });
  const R = 0.2;
  for (const x of PILLARS) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(R, R, H, 20), wood); c.position.set(x, H / 2, 0); c.castShadow = true; world.add(c);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.55, 0.85), darkStone); base.position.set(x, 0.275, 0); world.add(base);
    const baseTrim = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.04, 0.88), gold); baseTrim.position.set(x, 0.56, 0); world.add(baseTrim);
    const step = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.3, 0.58), wood); step.position.set(x, 0.73, 0); world.add(step);
    // goldene Ringe und Zierbänder (wie in den Vorlagen: unten ein Ring, in Augenhöhe ein breites Band, oben weitere Bänder)
    const ring = (y, h = 0.05, r = R + 0.025) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 20), gold); m.position.set(x, y, 0); world.add(m); };
    ring(0.92); ring(1.05, 0.03);
    for (const y0 of [2.6, 4.6]) { ring(y0, 0.05); ring(y0 + 0.5, 0.05); const band = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.012, R + 0.012, 0.45, 20), gold); band.position.set(x, y0 + 0.25, 0); world.add(band);
      for (let k = 0; k < 4; k++) { const a = (k / 4) * Math.PI * 2, dmd = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0).scale(0.6, 1.4, 0.25), wood); dmd.position.set(x + Math.cos(a) * (R + 0.018), y0 + 0.25, Math.sin(a) * (R + 0.018)); dmd.rotation.y = -a + Math.PI / 2; world.add(dmd); } }
    ring(H - 0.35, 0.3, R + 0.05);
  }

  // Achteckiger Tisch aus weißem Marmor mit dunkler Platte
  const tbody = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.95, 8), new THREE.MeshStandardMaterial({ color: 0xf0ede6, roughness: 0.3 })); tbody.position.set(TABLE.x, 0.475, TABLE.z); tbody.rotation.y = Math.PI / 8; world.add(tbody);
  const ttop = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.07, 8), darkStone); ttop.position.set(TABLE.x, 0.985, TABLE.z); ttop.rotation.y = Math.PI / 8; world.add(ttop);
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2 + Math.PI / 8, p = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.55), new THREE.MeshStandardMaterial({ color: 0xe4ded2, roughness: 0.35 })); p.position.set(TABLE.x + Math.cos(a) * 0.512, 0.5, TABLE.z + Math.sin(a) * 0.512); p.rotation.y = -a + Math.PI / 2; world.add(p);
    if (k % 2 === 0) { const kn = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 4), gold); kn.position.set(TABLE.x + Math.cos(a) * 0.54, 0.6, TABLE.z + Math.sin(a) * 0.54); world.add(kn); } }

  // Lampen: lange Stange durch die Säulenreihe von Wand zu Wand, daran viele Messing- und Goldlampen in verschiedenen Formen
  const ROD_Y = 4.0;
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, W, 6).rotateZ(Math.PI / 2), gold); rod.position.set(0, ROD_Y, 0.35); world.add(rod);
  const rod2 = rod.clone(); rod2.position.z = -0.35; world.add(rod2);
  const lathe = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 10);
  const shapes = [
    lathe([[0, -0.3], [0.1, -0.26], [0.15, -0.16], [0.11, -0.06], [0.05, -0.02], [0.03, 0], [0, 0]]),   // Vase
    lathe([[0, -0.22], [0.14, -0.2], [0.16, -0.12], [0.08, -0.06], [0.03, 0], [0, 0]]),                  // Schale
    lathe([[0, -0.34], [0.06, -0.32], [0.12, -0.2], [0.12, -0.1], [0.06, -0.04], [0.04, 0], [0, 0]]),    // hohe Lampe
  ];
  const lampMs = [new THREE.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.9, roughness: 0.3 }), new THREE.MeshStandardMaterial({ color: 0xa8875a, metalness: 0.85, roughness: 0.4 }), new THREE.MeshStandardMaterial({ color: 0xbfc0b5, metalness: 0.85, roughness: 0.35 })];
  const dm = new THREE.Object3D(), lampList = [[], [], []];
  for (let x = -W / 2 + 0.45; x < W / 2 - 0.3; x += 0.42) {
    if (PILLARS.some((p) => Math.abs(p - x) < 0.3)) continue;
    for (const z of [0.35, -0.35]) { const k = Math.floor(Math.abs(Math.sin(x * 12.3 + z * 7)) * 3); lampList[k].push([x, z, 0.35 + Math.abs(Math.sin(x * 5.1 + z)) * 0.35]); }
  }
  const chainG = new THREE.CylinderGeometry(0.006, 0.006, 1, 3); chainG.translate(0, -0.5, 0);
  const chains = new THREE.InstancedMesh(chainG, gold, lampList.flat().length); let ci = 0;
  lampList.forEach((list, k) => {
    const im = new THREE.InstancedMesh(shapes[k], lampMs[(k + 1) % 3], list.length);
    list.forEach(([x, z, drop], i) => {
      dm.position.set(x, ROD_Y - drop, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
      dm.position.set(x, ROD_Y, z); dm.scale.set(1, drop, 1); dm.updateMatrix(); chains.setMatrixAt(ci++, dm.matrix);
    });
    world.add(im);
  });
  world.add(chains);

  // Licht: helles, weiches Raumlicht (zwei Punktlichter ohne Schatten)
  for (const x of [-2.6, 2.6]) { const pl = new THREE.PointLight(0xfff3e0, 16, 16, 1.4); pl.position.set(x, 6, 0); world.add(pl); }

  const colliders = [
    { type: 'rect', x0: -W / 2 + 0.5, x1: W / 2 - 0.5, z0: -D / 2 + 0.5, z1: D / 2 - 0.5 },
    ...PILLARS.map((x) => ({ type: 'circle', x, z: 0, r: 0.6 })),
    { type: 'circle', x: TABLE.x, z: TABLE.z, r: 0.75 },
    { type: 'box', x: W / 2 - 0.75, z: D / 2 - 0.25, hw: 0.75, hd: 0.25 },
  ];
  const player = createPlayer(ctx, { x: DOOR_X, z: D / 2 - 1.2, heading: Math.PI, color: 0x34506a, speed: 1.6, fastSpeed: 2.4, colliders, camDist: 3.4, camHeight: 1.6, surface: 'marble' });
  const flow = createFlow();
  const marker = createMarker(world, { r: 0.8, height: 3 });

  // Kurze Hinweise, wenn man an Säulen, Bab at-Tawbah oder Lampen vorbeikommt
  const spots = [
    { x: 0, z: -1, r: 1.4, text: T.pillars }, { x: W / 2 - 1.8, z: D / 2 - 1.2, r: 1.3, text: T.tawbah },
    { x: 4.6, z: -1.2, r: 1.3, text: T.lamps },
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
    player.heading = Math.PI; // zur Wand gegenüber der Tür
    await flow.run(holdAction(ctx, player, { label: T.pray, steps: rakatSteps(2) }));
    ui.info(`<p>${T.anyDir}</p><p>${T.hijr}</p>`);
    await flow.run(holdAction(ctx, player, { label: T.dua, steps: [{ pose: 'dua', sec: 4 }] }));
    ui.counter('');
    ui.info(`<p><b>${T.end}</b></p><p class="tr">${T.real}</p>`);
    ui.actions([
      { label: T.back, onClick: () => ctx.backToEnding?.() },

      { label: '🕌 Hinaus in die Straßen von Mekka', kind: 'primary', onClick: () => ctx.leaveKaaba?.() },
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
