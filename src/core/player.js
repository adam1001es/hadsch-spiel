import * as THREE from 'three';

// Spielfigur mit einfachen Körperhaltungen, freier Bewegung, Kollision und Verfolgerkamera.
// Figur: Unterkörper (Gewand), Oberkörper + Kopf (Drehpunkt Hüfte), zwei Arme (Drehpunkt Schulter).

const LOWER = [[0, 0], [0.25, 0], [0.27, 0.12], [0.25, 0.5], [0.225, 0.9], [0, 0.9]];
const UPPER = [[0, 0], [0.225, 0], [0.215, 0.15], [0.235, 0.32], [0.235, 0.43], [0.19, 0.52], [0.07, 0.57], [0.055, 0.6], [0, 0.6]];
const lathe = (pts, seg) => { const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); g.scale(1, 1, 0.68); return g; };

// Ziel-Haltungen: Winkel in Radiant. hip = Oberkörper vorbeugen, knee = Absenken, armL/armR = Arme heben (nach vorne)
const POSES = {
  stand: { hip: 0, drop: 0, arm: [0.05, 0.05], lie: 0 },
  walk: { hip: 0.06, drop: 0, arm: [0.05, 0.05], lie: 0 },
  ruku: { hip: 1.45, drop: 0, arm: [1.35, 1.35], lie: 0 },
  sujud: { hip: 2.25, drop: 0.62, arm: [2.6, 2.6], lie: 0 },
  sit: { hip: 0.05, drop: 0.55, arm: [0.5, 0.5], lie: 0 },
  dua: { hip: 0.08, drop: 0, arm: [1.15, 1.15], lie: 0 },
  istilam: { hip: 0.05, drop: 0, arm: [0.2, 1.9], lie: 0 },
  throw: { hip: 0.12, drop: 0, arm: [0.3, 2.7], lie: 0 },
  sleep: { hip: 0, drop: 0, arm: [0.1, 0.1], lie: 1 },
  bend: { hip: 1.1, drop: 0.25, arm: [1.5, 1.5], lie: 0 },
};

// covered: Kopf mit Tuch bedeckt (Frauen) – Kopf hat dann die Farbe der Kleidung und ist etwas größer (Tuch)
export function createFigure(world, { color = 0xf3f1ea, skin = 0xc68642, ring = true, covered = false } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  const lower = new THREE.Mesh(lathe(LOWER, 24), cloth);
  const hip = new THREE.Group(); hip.position.y = 0.9; body.add(lower, hip);
  const upper = new THREE.Mesh(lathe(UPPER, 24), cloth);
  const headG = new THREE.SphereGeometry(0.105, 20, 14); headG.scale(0.92, 1.12, 1);
  const head = new THREE.Mesh(headG, covered ? cloth : skinM); head.position.set(0, 0.7, 0.01);
  if (covered) { head.scale.set(1.18, 1.12, 1.18); head.position.y = 0.69; }
  hip.add(upper, head);
  const armG = new THREE.CapsuleGeometry(0.05, 0.5, 4, 10); armG.translate(0, -0.3, 0);
  const arms = [-1, 1].map((side) => {
    const a = new THREE.Group(); a.position.set(side * 0.25, 0.43, 0);
    const m = new THREE.Mesh(armG, cloth); a.add(m);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skinM); hand.position.y = -0.6; a.add(hand);
    hip.add(a); return a;
  });
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let ringMesh = null;
  if (ring) {
    ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 40), new THREE.MeshBasicMaterial({ color: 0xf0c35a, transparent: true, opacity: 0.85, depthWrite: false }));
    ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.y = 0.04; root.add(ringMesh);
  }
  world.add(root);

  const cur = { hip: 0, drop: 0, arm: [0, 0], lie: 0 };
  let target = POSES.stand, swing = 0;
  return {
    root, cloth, skinM,
    setColor(c) { cloth.color.setHex(c); },
    pose(name) { target = POSES[name] || POSES.stand; },
    get poseName() { return Object.keys(POSES).find((k) => POSES[k] === target); },
    update(dt, walking = 0) {
      const k = 1 - Math.exp(-dt * 7);
      cur.hip += (target.hip - cur.hip) * k;
      cur.drop += (target.drop - cur.drop) * k;
      cur.lie += (target.lie - cur.lie) * k;
      cur.arm[0] += (target.arm[0] - cur.arm[0]) * k;
      cur.arm[1] += (target.arm[1] - cur.arm[1]) * k;
      swing += dt * (walking > 0.05 ? 7 + walking * 5 : 0);
      const sw = walking > 0.05 ? Math.sin(swing) * 0.45 * Math.min(1, walking) : 0;
      hip.rotation.x = cur.hip;
      lower.scale.y = 1 - cur.drop;
      hip.position.y = 0.9 * (1 - cur.drop);
      arms[0].rotation.x = -cur.arm[0] + sw;
      arms[1].rotation.x = -cur.arm[1] - sw;
      body.position.y = walking > 0.05 ? Math.abs(Math.sin(swing)) * 0.04 : 0;
      body.rotation.x = -cur.lie * Math.PI / 2;
      body.position.y += cur.lie * 0.25;
    },
  };
}

// ---------- Kollision ----------
// Formen: { type:'circle', x, z, r } (fest), { type:'box', x, z, hw, hd, rot } (fest),
// { type:'inside', x, z, r } (Begrenzung: Spieler bleibt innerhalb), { type:'rect', x0, x1, z0, z1 } (Begrenzung),
// { type:'fn', fn(p, r) } (eigene Regel, verschiebt p)
export function resolve(p, r, shapes) {
  for (let it = 0; it < 3; it++) {
    for (const s of shapes) {
      if (s.type === 'circle') {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r + r;
        if (d < m && d > 1e-6) { p.x = s.x + (dx / d) * m; p.z = s.z + (dz / d) * m; }
      } else if (s.type === 'box') {
        const c = Math.cos(s.rot || 0), sn = Math.sin(s.rot || 0);
        const lx = (p.x - s.x) * c - (p.z - s.z) * sn, lz = (p.x - s.x) * sn + (p.z - s.z) * c;
        const hw = s.hw + r, hd = s.hd + r;
        if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
          let nx = lx, nz = lz;
          if (hw - Math.abs(lx) < hd - Math.abs(lz)) nx = Math.sign(lx || 1) * hw; else nz = Math.sign(lz || 1) * hd;
          p.x = s.x + nx * c + nz * sn; p.z = s.z - nx * sn + nz * c;
        }
      } else if (s.type === 'inside') {
        const dx = p.x - s.x, dz = p.z - s.z, d = Math.hypot(dx, dz), m = s.r - r;
        if (d > m) { p.x = s.x + (dx / d) * m; p.z = s.z + (dz / d) * m; }
      } else if (s.type === 'rect') {
        p.x = Math.min(s.x1 - r, Math.max(s.x0 + r, p.x));
        p.z = Math.min(s.z1 - r, Math.max(s.z0 + r, p.z));
      } else if (s.type === 'fn') s.fn(p, r);
    }
  }
  return p;
}

// ---------- Spieler: Bewegung + Kamera ----------
export function createPlayer(ctx, { x = 0, z = 0, heading = 0, color, speed = 1.6, fastSpeed = 2.8, colliders = [], ground = null, camDist = 6.5, camHeight = 2.6 } = {}) {
  const { engine, input } = ctx;
  const fig = createFigure(engine.world, { color, covered: ctx.profile?.gender === 'f' });
  const pos = new THREE.Vector3(x, 0, z);
  const vel = new THREE.Vector3();
  let head = heading, walking = 0, frozen = false;
  input.yaw = heading; // Kamera hinter der Figur (Blickrichtung = heading)
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let first = true;

  // Navigation zum Ziel (alles durch die Menge hindurch sichtbar):
  // 1. großer goldener Richtungspfeil direkt neben der Figur (wie ein Kompass)
  // 2. leichte Leuchtlinie am Boden bis zum Ziel
  // 3. Bodenpfeile, die langsam Richtung Ziel wandern
  const navMat = (opacity) => new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity, depthWrite: false, depthTest: false, fog: false });
  const GN = 8;
  const chev = new THREE.Shape(); chev.moveTo(-0.45, -0.2); chev.lineTo(0, 0.25); chev.lineTo(0.45, -0.2); chev.lineTo(0.45, 0.05); chev.lineTo(0, 0.5); chev.lineTo(-0.45, 0.05);
  const chevG = new THREE.ShapeGeometry(chev); chevG.rotateX(-Math.PI / 2); chevG.rotateY(Math.PI); // Spitze zeigt nach +z (= Richtung ang)
  const guide = new THREE.InstancedMesh(chevG, navMat(0.7), GN);
  guide.frustumCulled = false; guide.renderOrder = 20; engine.world.add(guide);
  const arrowS = new THREE.Shape();
  arrowS.moveTo(0, 0.9); arrowS.lineTo(0.5, 0.25); arrowS.lineTo(0.18, 0.25); arrowS.lineTo(0.18, -0.35); arrowS.lineTo(-0.18, -0.35); arrowS.lineTo(-0.18, 0.25); arrowS.lineTo(-0.5, 0.25);
  const arrowG = new THREE.ShapeGeometry(arrowS); arrowG.rotateX(-Math.PI / 2); arrowG.rotateY(Math.PI);
  const navArrow = new THREE.Mesh(arrowG, navMat(0.95)); navArrow.renderOrder = 21; engine.world.add(navArrow);
  const lineG = new THREE.PlaneGeometry(0.12, 1); lineG.rotateX(-Math.PI / 2); lineG.translate(0, 0, 0.5);
  const navLine = new THREE.Mesh(lineG, navMat(0.35)); navLine.renderOrder = 19; engine.world.add(navLine);
  const gTarget = new THREE.Vector2(); let gFresh = 0, gPhase = 0, gT = 0;
  const gd = new THREE.Object3D();
  const showNav = (v) => { guide.visible = navArrow.visible = navLine.visible = v; };
  showNav(false);
  function updateGuide(dt) {
    gFresh -= dt; gPhase = (gPhase + dt * 1.2) % 1; gT += dt;
    if (gFresh <= 0) { showNav(false); return; }
    const dx = gTarget.x - pos.x, dz = gTarget.y - pos.z, dist = Math.hypot(dx, dz);
    if (dist < 2.2) { showNav(false); return; }
    showNav(true);
    const ux = dx / dist, uz = dz / dist, ang = Math.atan2(ux, uz);
    const gy = (x, z) => (ground ? ground(x, z) : 0) + 0.06;
    // Richtungspfeil an der Figur, pulsiert leicht
    navArrow.position.set(pos.x + ux * 1.25, gy(pos.x + ux * 1.25, pos.z + uz * 1.25) + 0.02, pos.z + uz * 1.25);
    navArrow.rotation.y = ang; navArrow.scale.setScalar(1 + Math.sin(gT * 5) * 0.08);
    // Leuchtlinie bis zum Ziel (max. 60 m)
    const len = Math.min(dist - 1.5, 60);
    navLine.position.set(pos.x + ux * 1.5, gy(pos.x, pos.z), pos.z + uz * 1.5); navLine.rotation.y = ang; navLine.scale.set(1, 1, Math.max(0.1, len - 1.5));
    // wandernde Bodenpfeile
    let n = 0;
    for (let i = 0; i < GN; i++) {
      const d = 2.6 + (i + gPhase) * 1.8;
      if (d > dist - 1.5) break;
      gd.position.set(pos.x + ux * d, gy(pos.x + ux * d, pos.z + uz * d), pos.z + uz * d); gd.rotation.set(0, ang, 0);
      gd.scale.setScalar(0.9 - i * 0.05); gd.updateMatrix(); guide.setMatrixAt(n++, gd.matrix);
    }
    guide.count = n; guide.instanceMatrix.needsUpdate = true;
  }

  const p = {
    fig, pos, colliders,
    auto: null,      // Autopilot-Funktion (dt) → { x, z, fast } oder null
    onManual: null,  // wird gerufen, wenn man während des Autopilots selbst steuert
    speedMul: 1,
    get heading() { return head; },
    set heading(v) { head = v; },
    get moving() { return walking; },
    get fast() { return input.fast && walking > 0.3; },
    freeze(v = true) { frozen = v; if (v) vel.set(0, 0, 0); },
    get frozen() { return frozen; },
    teleport(nx, nz, h) { pos.set(nx, 0, nz); if (h != null) { head = h; input.yaw = h; } first = true; },
    // Blickrichtung der Kamera (Winkel um Y, 0 = nach -Z)
    get viewYaw() { return input.yaw + Math.PI; },
    // Ist die Kamera/Figur grob Richtung Punkt ausgerichtet? (für Qibla / Kaaba)
    facing(tx, tz, tol = 0.45) {
      const want = Math.atan2(-(tx - pos.x), -(tz - pos.z));
      const d = Math.atan2(Math.sin(want - p.viewYaw), Math.cos(want - p.viewYaw));
      return Math.abs(d) < tol;
    },
    distTo(tx, tz) { return Math.hypot(tx - pos.x, tz - pos.z); },
    // Leitpfeile zum Ziel zeigen (muss jeden Frame erneuert werden, sonst blenden sie aus)
    guideTo(tx, tz) { gTarget.set(tx, tz); gFresh = 0.25; },
    update(dt) {
      input.update(dt);
      const mx = frozen ? 0 : input.move.x, my = frozen ? 0 : input.move.y;
      let amt = Math.min(1, Math.hypot(mx, my));
      // Autopilot: liefert eine Richtung in Weltkoordinaten. Eigene Eingabe hat immer Vorrang (und beendet ihn).
      let autoDir = null;
      if (p.auto && !frozen) {
        if (amt > 0.3) p.onManual?.();
        else { autoDir = p.auto(dt); if (autoDir) amt = 1; }
      }
      const yaw = input.yaw + Math.PI; // Kamera schaut in diese Richtung
      // Vorwärts = weg von der Kamera
      const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
      const sp = ((autoDir ? autoDir.fast : input.fast) ? fastSpeed : speed) * p.speedMul;
      let tx = (fx * -my + rx * mx) * sp, tz = (fz * -my + rz * mx) * sp;
      if (autoDir) {
        const l = Math.hypot(autoDir.x, autoDir.z) || 1;
        tx = (autoDir.x / l) * sp; tz = (autoDir.z / l) * sp;
        // Kamera dreht sich langsam hinter die Figur
        const want = head, d = Math.atan2(Math.sin(want - input.yaw), Math.cos(want - input.yaw));
        input.yaw += d * Math.min(1, dt * 1.5);
      }
      const k = 1 - Math.exp(-dt * 8);
      vel.x += (tx - vel.x) * k; vel.z += (tz - vel.z) * k;
      pos.x += vel.x * dt; pos.z += vel.z * dt;
      resolve(pos, 0.32, p.colliders);
      pos.y = ground ? ground(pos.x, pos.z) : 0;
      const v = Math.hypot(vel.x, vel.z);
      walking = v / speed;
      if (v > 0.15) {
        const want = Math.atan2(vel.x, vel.z);
        const d = Math.atan2(Math.sin(want - head), Math.cos(want - head));
        head += d * Math.min(1, dt * 10);
      }
      if (amt > 0.05 && fig.poseName !== 'walk' && ['stand', 'walk'].includes(fig.poseName)) fig.pose('walk');
      if (amt <= 0.05 && fig.poseName === 'walk') fig.pose('stand');
      fig.root.position.copy(pos);
      fig.root.rotation.y = head;
      fig.update(dt, walking);
      updateGuide(dt);

      // Kamera: hinter dem Spieler, Höhe über Pitch
      const pitch = input.pitch;
      const dist = camDist * (1 + Math.max(0, pitch) * 0.6);
      const off = new THREE.Vector3(Math.sin(yaw) * dist, camHeight + pitch * 5, Math.cos(yaw) * dist);
      const wantPos = pos.clone().add(off);
      if (ground) wantPos.y = Math.max(wantPos.y, ground(wantPos.x, wantPos.z) + 1);
      const wantLook = pos.clone().add(new THREE.Vector3(fx * 2.5, 1.5, fz * 2.5));
      const ck = first ? 1 : 1 - Math.exp(-dt * 9);
      camPos.lerp(wantPos, ck); camLook.lerp(wantLook, ck); first = false;
      engine.camera.position.copy(camPos);
      engine.camera.lookAt(camLook);
      ctx.sky.state.focus.copy(pos);
    },
  };
  ctx.player = p; // für Tests und Stationen
  return p;
}
