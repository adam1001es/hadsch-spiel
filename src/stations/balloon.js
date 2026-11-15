import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { BALLOON as T } from '../content/hajj.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { buildKaaba } from '../world/kaaba.js';
import { buildHaram, matafRadius } from '../world/haram.js';
import { createCrowd } from '../world/crowd.js';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';
import { createLife } from '../world/life.js';
import * as sfx from '../core/sfx.js';

// Unterhaltung nach dem Hadsch: Heißluftballon über Mekka oder Medina.
// Der Spieler steht im Korb. Brenner halten = steigen, loslassen = langsam sinken, Joystick = lenken, wischen = Ansicht drehen.
// Vogelperspektive: Kamera hinter und über dem Ballon; Stadt aus einfachen, instanzierten Häusern (wenig Last auf schwachen Geräten).
let balloonLoad = null;
const MAX_ALT = 340;
const dm = new THREE.Object3D();

// Häuser rund um einen Mittelpunkt: helle Kästen in Blöcken, nicht auf Bergen und nicht im freien Kern
function city(world, { h, rIn, rOut, n, avoid = () => false, seed = 1 }) {
  let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85 });
  const im = new THREE.InstancedMesh(geo, mat, n), col = new THREE.Color();
  const cols = [0xf2ede3, 0xe8dfcf, 0xdcd2bf, 0xf6f3ee, 0xcfc4b0, 0xe2d7c3];
  let k = 0;
  for (let tries = 0; k < n && tries < n * 6; tries++) {
    const a = rnd() * 6.283, r = rIn + Math.sqrt(rnd()) * (rOut - rIn), x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (h(x, z) > 6 || avoid(x, z)) continue;
    const big = rnd() < 0.15, w = 14 + rnd() * (big ? 40 : 18), d = 14 + rnd() * (big ? 40 : 18), ht = (big ? 30 : 9) + rnd() * (big ? 70 : 22) * (1 - (r - rIn) / (rOut - rIn) * 0.6);
    dm.position.set(x, h(x, z) - 0.5, z); dm.rotation.set(0, Math.round(a / (Math.PI / 2)) * (Math.PI / 2) + (rnd() - 0.5) * 0.2, 0); dm.scale.set(w, ht, d); dm.updateMatrix();
    im.setMatrixAt(k, dm.matrix); im.setColorAt(k, col.setHex(cols[(rnd() * cols.length) | 0])); k++;
  }
  im.count = k; im.castShadow = false; im.receiveShadow = true; world.add(im);
}

// Uhrturm (Abraj al-Bait) vereinfacht: Sockelbau, Turm, Uhr mit vier grünen Zifferblättern, goldene Spitze mit Halbmond
function clockTower(world, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = Math.PI / 4; world.add(g);
  const stone = new THREE.MeshStandardMaterial({ color: 0xe9e2d4, roughness: 0.7 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x8fa6b5, roughness: 0.25, metalness: 0.4 });
  const add = (geo, m, y) => { const o = new THREE.Mesh(geo, m); o.position.y = y; g.add(o); return o; };
  add(new THREE.BoxGeometry(150, 70, 110), stone, 35);
  for (const [dx, dz, hh] of [[-55, 30, 150], [55, 30, 140], [-55, -30, 130], [55, -30, 160]]) { const o = add(new THREE.BoxGeometry(32, hh, 32), glass, hh / 2); o.position.x = dx; o.position.z = dz; }
  add(new THREE.BoxGeometry(56, 220, 56), stone, 70 + 110);
  const face = new THREE.MeshStandardMaterial({ color: 0x1f6b45, emissive: 0x2bbf6a, emissiveIntensity: 0.6, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3, emissive: 0x5a3e10, emissiveIntensity: 0.4 });
  add(new THREE.BoxGeometry(60, 50, 60), stone, 315);
  for (let k = 0; k < 4; k++) { const c = new THREE.Mesh(new THREE.CircleGeometry(21, 40), face); const a = k * Math.PI / 2; c.position.set(Math.sin(a) * 30.2, 315, Math.cos(a) * 30.2); c.rotation.y = a; g.add(c); const r = new THREE.Mesh(new THREE.RingGeometry(21, 23, 40), gold); r.position.copy(c.position); r.rotation.y = a; g.add(r); }
  add(new THREE.CylinderGeometry(12, 28, 40, 8), stone, 360);
  add(new THREE.CylinderGeometry(2, 9, 60, 8), gold, 410);
  const cres = add(new THREE.TorusGeometry(7, 1.6, 8, 24, Math.PI * 1.4), gold, 452); cres.rotation.z = Math.PI * 0.8;
}

// Masjid an-Nabawi vereinfacht: großes flaches Gebäude mit Arkaden, zwei Innenhöfe mit Schirmen, zehn Minarette, Grüne Kuppel
function nabawi(world) {
  const W = 300, D = 220, H = 14;
  const g = new THREE.Group(); world.add(g);
  const cream = new THREE.MeshStandardMaterial({ color: 0xece4d4, roughness: 0.75 });
  const arch = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#ece4d4'; x.fillRect(0, 0, 256, 64); x.fillStyle = '#8f8270'; for (let k = 0; k < 8; k++) { x.beginPath(); x.moveTo(k * 32 + 6, 64); x.lineTo(k * 32 + 6, 30); x.arc(k * 32 + 16, 30, 10, Math.PI, 0); x.lineTo(k * 32 + 26, 64); x.fill(); } const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const side = (len) => { const t = arch.clone(); t.needsUpdate = true; t.repeat.set(len / 32, 1); return new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }); };
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, H, D), [side(D), side(D), cream, cream, side(W), side(W)]); body.position.y = H / 2; g.add(body);
  // Innenhöfe: heller Marmor, Schirme (weiße Membranen)
  const court = new THREE.MeshStandardMaterial({ color: 0xf5f2ec, roughness: 0.4 });
  const umbG = new THREE.ConeGeometry(9, 3, 4, 1, true); umbG.rotateY(Math.PI / 4);
  const umbM = new THREE.MeshStandardMaterial({ color: 0xf8f6f0, roughness: 0.6, side: THREE.DoubleSide });
  for (const cx of [-45, 45]) {
    const c = new THREE.Mesh(new THREE.PlaneGeometry(60, 70).rotateX(-Math.PI / 2), court); c.position.set(cx, H + 0.05, -10); g.add(c);
    const um = new THREE.InstancedMesh(umbG, umbM, 12); let k = 0;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) { dm.position.set(cx - 20 + i * 20, H + 6, -10 - 26 + j * 17.5); dm.rotation.set(Math.PI, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); um.setMatrixAt(k++, dm.matrix); }
    g.add(um);
  }
  // kleine Dachkuppeln (Schiebekuppeln) als Raster
  const dg = new THREE.SphereGeometry(5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2);
  const domes = new THREE.InstancedMesh(dg, new THREE.MeshStandardMaterial({ color: 0xcfc6b2, roughness: 0.6 }), 200); let n = 0;
  for (let x = -W / 2 + 15; x < W / 2 - 10; x += 18) for (let z = -D / 2 + 15; z < D / 2 - 10; z += 18) {
    if (Math.abs(Math.abs(x) - 45) < 34 && Math.abs(z + 10) < 40) continue; // über den Höfen keine
    if (n >= 200) break; dm.position.set(x, H, z); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); domes.setMatrixAt(n++, dm.matrix);
  }
  domes.count = n; g.add(domes);
  // Grüne Kuppel (über der Grabkammer, an der Südost-Ecke des alten Teils)
  const green = new THREE.MeshStandardMaterial({ color: 0x2f8a4e, roughness: 0.45, metalness: 0.1 });
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(9, 9, 8, 8), green); drum.position.set(-20, H + 4, D / 2 - 30); g.add(drum);
  const gd = new THREE.Mesh(new THREE.SphereGeometry(9.5, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), green); gd.position.set(-20, H + 8, D / 2 - 30); gd.scale.y = 1.3; g.add(gd);
  const goldM = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3 });
  const fin = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.8, 6, 6), goldM); fin.position.set(-20, H + 23, D / 2 - 30); g.add(fin);
  // Minarette: weiß, achteckig, Balkone, goldene Spitze mit Halbmond
  const minM = new THREE.MeshStandardMaterial({ color: 0xf2eee6, roughness: 0.6 });
  const spots = [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2], [-W / 2, 0], [W / 2, 0], [0, -D / 2], [0, D / 2], [-60, D / 2 - 18], [10, D / 2 - 18]];
  for (const [x, z] of spots) {
    const m = new THREE.Group(); m.position.set(x, 0, z); g.add(m);
    const add = (geo, mat, y) => { const o = new THREE.Mesh(geo, mat); o.position.y = y; m.add(o); };
    add(new THREE.CylinderGeometry(4, 4.5, 50, 8), minM, 25);
    add(new THREE.CylinderGeometry(5.5, 5.5, 1.5, 8), minM, 50);
    add(new THREE.CylinderGeometry(3.2, 3.6, 22, 8), minM, 62);
    add(new THREE.CylinderGeometry(4.5, 4.5, 1.2, 8), minM, 73);
    add(new THREE.CylinderGeometry(2.4, 2.8, 12, 8), minM, 80);
    add(new THREE.ConeGeometry(2.6, 8, 8), goldM, 90);
    const c = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.3, 6, 16, Math.PI * 1.4), goldM); c.position.y = 96; c.rotation.z = Math.PI * 0.8; m.add(c);
  }
  // Vorplatz mit großen Schirmen ringsum (hell)
  const plaza = new THREE.Mesh(new THREE.PlaneGeometry(W + 160, D + 160).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.5 })); plaza.position.y = 0.06; g.add(plaza);
  const bigU = new THREE.InstancedMesh(new THREE.ConeGeometry(7, 2.5, 4, 1, true).rotateY(Math.PI / 4), umbM, 80); n = 0;
  for (let x = -W / 2 - 50; x <= W / 2 + 50; x += 16) for (const z of [-D / 2 - 30, D / 2 + 30]) { if (n < 80) { dm.position.set(x, 9, z); dm.rotation.set(0, 0, 0); dm.scale.set(1, 1, 1); dm.updateMatrix(); bigU.setMatrixAt(n++, dm.matrix); } }
  bigU.count = n; g.add(bigU);
  return { half: [W / 2 + 80, D / 2 + 80] };
}

export function create(ctx, { where = 'mecca' } = {}) {
  const { engine, sky, ui, input } = ctx;
  const world = engine.world;
  sky.setHour(where === 'mecca' ? 16.8 : 9.5);
  sky.state.shadowSize = 120;
  ui.el.day.textContent = T.title;
  ui.el.title.textContent = where === 'mecca' ? T.mecca : T.medina;
  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${T.intro}</p><p>${where === 'mecca' ? T.meccaInfo : T.medinaInfo}</p><p class="tr">${T.note}</p>`);

  let crowd = null, cN = 0, ang = null, rad = null, spd = null;
  const h = where === 'mecca' ? heightFn({ r0: 380, r1: 750, amp: 230 }) : heightFn({ r0: 650, r1: 1100, amp: 110 });
  buildTerrain(world, h);
  if (where === 'mecca') {
    buildKaaba(world); buildHaram(world);
    clockTower(world, -250, -250);
    city(world, { h, rIn: 360, rOut: 760, n: engine.isMobile ? 450 : 800, avoid: (x, z) => Math.hypot(x + 250, z + 250) < 120 });
    // Pilger beim Tawaf (von oben gut sichtbar): kreisen gegen den Uhrzeigersinn
    cN = engine.isMobile ? 260 : 450; crowd = createCrowd(world, cN, { ihram: true });
    ang = new Float32Array(cN).map(() => Math.random() * 6.283); spd = new Float32Array(cN).map(() => 0.05 + Math.random() * 0.03);
    rad = new Float32Array(cN).map((_, i) => { const a = ang[i]; return 11 + Math.random() * (matafRadius(Math.cos(a), -Math.sin(a)) - 14); });
  } else {
    const { half } = nabawi(world);
    city(world, { h, rIn: 0, rOut: 700, n: engine.isMobile ? 450 : 800, avoid: (x, z) => Math.abs(x) < half[0] && Math.abs(z) < half[1] });
  }

  // Ballon (3D-Modell) mit dem Spieler im Korb; Brennerflamme
  const MIN_ALT = where === 'mecca' ? 110 : 80; // über Minaretten und Dächern
  const balloon = new THREE.Group(); world.add(balloon);
  const pos = new THREE.Vector3(where === 'mecca' ? 220 : 300, where === 'mecca' ? 130 : 100, where === 'mecca' ? 220 : 260), vel = new THREE.Vector3();
  balloonLoad ||= new GLTFLoader().loadAsync('./assets/models/balloon.glb').then((g) => g.scene).catch(() => null);
  balloonLoad.then((sc) => { if (sc && balloon.parent) { const m = sc.clone(true); m.traverse((o) => { if (o.isMesh) o.castShadow = true; }); balloon.add(m); } });
  const fig = createFigure(balloon, { color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0xf6f4ee, covered: ctx.profile?.gender === 'f', ring: false, models: peopleModels() });
  fig.root.position.set(0.15, 0.12, -0.75); fig.root.rotation.y = Math.PI / 4; // im Korb (Korb ca. 1,6 m, leicht versetzt)
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.35, 1.8, 10), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, opacity: 0.85 }));
  flame.position.set(0, 2.9, -0.55); flame.visible = false; balloon.add(flame);
  const glow = new THREE.PointLight(0xffa040, 0, 18, 1.5); glow.position.set(0, 3.2, -0.55); balloon.add(glow);
  ctx.balloonPos = pos;
  const life = createLife(ctx, { kind: 'desert', height: 30 });

  ui.hold(T.burner);
  ui.actions([
    { label: where === 'mecca' ? T.toMedina : T.toMecca, onClick: () => ctx.balloon?.(where === 'mecca' ? 'medina' : 'mecca') },
    { label: T.land, kind: 'primary', onClick: () => ctx.backToEnding?.() },
  ]);
  const camPos = new THREE.Vector3(), look = new THREE.Vector3(); let first = true, t = 0;
  input.yaw = Math.atan2(pos.x, pos.z); input.pitch = 0.55; // Blick schräg nach unten auf die Moschee
  const R = where === 'mecca' ? 700 : 750;

  return {
    update(dt) {
      t += dt; input.update?.(dt);
      // Steigen / Sinken
      const ground = Math.max(0, h(pos.x, pos.z));
      if (input.holding) { vel.y += (5 - vel.y) * Math.min(1, dt * 1.5); sfx.burnerKeep(); }
      else vel.y += (-1.6 - vel.y) * Math.min(1, dt * 0.8);
      flame.visible = input.holding; flame.scale.setScalar(0.85 + Math.random() * 0.3); glow.intensity = input.holding ? 30 : 0;
      // Lenken relativ zur Blickrichtung (sanft, wie ein Ballon im Wind)
      const mx = input.move.x, my = input.move.y, yaw = input.yaw;
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const want = new THREE.Vector3((rx * mx - fx * my) * 16, 0, (rz * mx - fz * my) * 16);
      vel.x += (want.x + 1.2 - vel.x) * Math.min(1, dt * 0.9); vel.z += (want.z - vel.z) * Math.min(1, dt * 0.9); // +1,2 m/s leichter Wind
      pos.addScaledVector(vel, dt);
      pos.y = Math.min(MAX_ALT, Math.max(ground + MIN_ALT, pos.y)); if (pos.y <= ground + MIN_ALT && vel.y < 0) vel.y = 0;
      const r = Math.hypot(pos.x, pos.z); if (r > R) { pos.x *= R / r; pos.z *= R / r; }
      balloon.position.copy(pos); balloon.rotation.y = Math.sin(t * 0.2) * 0.3; balloon.rotation.z = Math.sin(t * 0.7) * 0.015;
      fig.update(dt, 0);
      // Vogelperspektive: Kamera hinter/über dem Ballon, Pitch = Höhe des Blicks
      const dist = 34 + input.pitch * 30, up = 6 + input.pitch * 40;
      const wantPos = new THREE.Vector3(pos.x + Math.sin(yaw) * dist, pos.y + up, pos.z + Math.cos(yaw) * dist);
      const wantLook = new THREE.Vector3(pos.x, pos.y + 4 - input.pitch * 25, pos.z);
      const k = first ? 1 : 1 - Math.exp(-dt * 4); camPos.lerp(wantPos, k); look.lerp(wantLook, k); first = false;
      engine.camera.position.copy(camPos); engine.camera.lookAt(look);
      sky.state.focus.copy(pos).setY(0);
      ui.counter(`Höhe ${Math.round(pos.y - ground)} m`);
      // Pilger beim Tawaf
      if (crowd) { for (let i = 0; i < cN; i++) { ang[i] += spd[i] * dt * 12 / rad[i]; const a = ang[i]; crowd.set(i, rad[i] * Math.cos(a), 0, -rad[i] * Math.sin(a), Math.atan2(-Math.sin(a), -Math.cos(a))); } crowd.commit(); }
      life.update(dt);
    },
    dispose() { ui.hold(null); ui.counter(''); delete ctx.balloonPos; },
  };
}
