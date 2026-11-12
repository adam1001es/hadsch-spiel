import * as THREE from 'three';
import { step as sfxStep } from './sfx.js';
import { izarGeo, torsoGeo, ridaGeo, hairGeo, faceGeo, khimarGeo } from '../world/people.js';
import { peopleModels } from '../world/crowd.js';
import { WALK, walkMaterial } from '../world/walk.js';

// Spielfigur mit einfachen Körperhaltungen, freier Bewegung, Kollision und Verfolgerkamera.
// Figur: Unterkörper (Gewand), Oberkörper + Kopf (Drehpunkt Hüfte), zwei Arme (Drehpunkt Schulter).

const LOWER = [[0, 0], [0.25, 0], [0.27, 0.12], [0.25, 0.5], [0.225, 0.9], [0, 0.9]];
const UPPER = [[0, 0], [0.225, 0], [0.215, 0.15], [0.235, 0.32], [0.235, 0.43], [0.19, 0.52], [0.07, 0.57], [0.055, 0.6], [0, 0.6]];
const lathe = (pts, seg) => { const g = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg); g.scale(1, 1, 0.68); return g; };

// Ziel-Haltungen: Winkel in Radiant. hip = Oberkörper vorbeugen, knee = Absenken, armL/armR = Arme heben (nach vorne)
const POSES = {
  // arm/elbow = Haltung für das 3D-Modell: Arm nach vorn heben (Schulter) und Unterarm beugen, je [rechts, links]
  stand: { hip: 0, drop: 0, arm: [0.05, 0.05], lie: 0, m: [0, 0], e: [0, 0] },
  walk: { hip: 0.06, drop: 0, arm: [0.05, 0.05], lie: 0, m: [0, 0], e: [0, 0] },
  ruku: { hip: 1.45, drop: 0, arm: [1.35, 1.35], lie: 0, m: [1.35, 1.35], e: [0, 0] },
  sujud: { hip: 2.15, drop: 0.62, arm: [2.6, 2.6], lie: 0, m: [1.6, 1.6], e: [0.5, 0.5], th: 0.35 }, // Knie am Boden, Oberschenkel fast senkrecht
  sit: { hip: 0.05, drop: 0.55, arm: [0.5, 0.5], lie: 0, m: [0.55, 0.55], e: [0.55, 0.55], th: 1.5708 }, // auf den Fersen sitzen
  dua: { hip: 0.08, drop: 0, arm: [1.15, 1.15], lie: 0, m: [0.5, 0.5], e: [1.45, 1.45] },
  istilam: { hip: 0.05, drop: 0, arm: [1.9, 0.2], lie: 0, m: [1.75, 0.05], e: [0.15, 0] },
  drink: { hip: 0.05, drop: 0, arm: [1.6, 0.1], lie: 0, m: [0.75, 0.05], e: [2.05, 0] },
  throw: { hip: 0.12, drop: 0, arm: [2.7, 0.3], lie: 0, m: [2.6, 0.15], e: [0.3, 0] },
  sleep: { hip: 0, drop: 0, arm: [0.1, 0.1], lie: 1, m: [0, 0], e: [0, 0] },
  bend: { hip: 1.1, drop: 0.25, arm: [1.5, 1.5], lie: 0, m: [1.3, 1.3], e: [0.2, 0.2] },
};

// covered: Kopf mit Tuch bedeckt (Frauen) – Kopf hat dann die Farbe der Kleidung und ist etwas größer (Tuch)
export function createFigure(world, { color = 0xf3f1ea, skin = 0xc68642, ring = true, covered = false, models = null } = {}) {
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.92 });
  const skinM = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  // Kleidung je nach Geschlecht und Zustand:
  //  Mann im Ihram (weiße Kleidung): Izar + Rida', Oberkörper/Arme mit Haut; Idtiba' = rechte Schulter frei
  //  Mann sonst: Gewand (Thobe) in der Kleidungsfarbe. Frau: Gewand + Kopftuch (Khimar), Gesicht frei
  const lowerDress = new THREE.Mesh(lathe(LOWER, 24), cloth);
  const lowerIzar = new THREE.Mesh(izarGeo(24), cloth);
  const hip = new THREE.Group(); hip.position.y = 0.9; body.add(lowerDress, lowerIzar, hip);
  const upper = new THREE.Mesh(lathe(UPPER, 24), cloth);
  const torso = new THREE.Mesh(torsoGeo(20, 0.9), skinM);
  const ridaDouble = new THREE.MeshStandardMaterial({ color, roughness: 0.92, side: THREE.DoubleSide });
  const rida = new THREE.Mesh(ridaGeo(28, 0.9), ridaDouble);
  const ridaIdt = new THREE.Mesh(ridaGeo(28, 0.9, true), ridaDouble);
  const headG = new THREE.SphereGeometry(0.105, 20, 14); headG.scale(0.92, 1.12, 1);
  const head = new THREE.Mesh(headG, skinM); head.position.set(0, 0.7, 0.01);
  const hair = new THREE.Mesh(hairGeo(16, 0.9), new THREE.MeshStandardMaterial({ color: 0x1d1a17, roughness: 0.8 }));
  const khimar = new THREE.Mesh(khimarGeo(28, 0.9), ridaDouble);
  const face = new THREE.Mesh(faceGeo(16, 0.9), skinM);
  hip.add(upper, torso, rida, ridaIdt, head, hair, khimar, face);
  let idtiba = false;
  // weiße Kleidung (sRGB-Werte, nicht die linearen Farbwerte) = Ihram
  const isIhram = () => { const h = cloth.color.getHex(); return !covered && ((h >> 16) & 255) > 0xe6 && ((h >> 8) & 255) > 0xe6 && (h & 255) > 0xdc; };
  let armMeshes = [];
  // 3D-Modell als Spielfigur (wie die Pilger in der Menge): an der Hüfte geteilt, damit Ruku'/Sujud weiter gehen
  // Je Outfit eine Modell-Variante: Frau (Abaya), Mann im Ihram, Mann im Shalwar Kameez
  const HIP = covered ? 0.88 : 0.95;
  const variants = {}, walkU = [], PREFIX = { woman: 'w_', ihram: 'm_', kameez: 'k_' };
  let mCover = null;
  // Teilen an der Hüfte; Arme/Hände (|x| > armX) gehören immer zum Oberkörper, auch wenn sie tiefer hängen
  function splitAt(geo, h, armX = 9) {
    const g = geo.index ? geo.toNonIndexed() : geo, pos = g.attributes.position, lo = [], up = [];
    const aw = g.attributes.armW;
    for (let t = 0; t < pos.count; t += 3) { const y = (pos.getY(t) + pos.getY(t + 1) + pos.getY(t + 2)) / 3, x = Math.abs(pos.getX(t) + pos.getX(t + 1) + pos.getX(t + 2)) / 3; const arm = aw ? aw.getX(t) + aw.getX(t + 1) + aw.getX(t + 2) > 1.5 : x > armX && y > 0.55; (y > h || arm ? up : lo).push(t); }
    const pick = (tris, dy) => { const ng = new THREE.BufferGeometry(); for (const k of Object.keys(g.attributes)) { const at = g.attributes[k], arr = new Float32Array(tris.length * 3 * at.itemSize); tris.forEach((t, j) => { for (let q = 0; q < 3; q++) for (let c = 0; c < at.itemSize; c++) arr[(j * 3 + q) * at.itemSize + c] = at.array[(t + q) * at.itemSize + c]; }); ng.setAttribute(k, new THREE.BufferAttribute(arr, at.itemSize)); } ng.translate(0, -dy, 0); return ng; };
    return [pick(lo, 0), pick(up, h)];
  }
  function buildVariant(id, src) {
    if (!src) return;
    const grp = new THREE.Group(); body.add(grp);
    variants[id] = { grp };
    for (const [k, part] of Object.entries(src)) {
      const mat = part.material.clone();
      if (k === 'hijabLong') continue; // Spielfigur: kurzer Hijab
      mat.side = ['hijab', 'dress', 'cover'].includes(k) ? THREE.DoubleSide : THREE.FrontSide;
      if (k === 'skin' || k === 'head' || k === 'arms' || k === 'hands' || k === 'feet') mat.color = skinM.color; // Hautfarbe der Figur
      else if (k === 'dress' || k === 'hijab' || k === 'top' || k === 'bottom') mat.color = cloth.color; // Kleidungsfarbe
      else if (k === 'trim') mat.color = new THREE.Color(0x2a2420);
      else if (k === 'cloth') mat.color = new THREE.Color(0xf6f4ee);
      else if (k === 'shoes') mat.color = new THREE.Color(0x1e1c1b);
      else if (k !== 'cover') mat.color = new THREE.Color(0xffffff);
      // Gehen, Armhaltung, Knien und Verbeugen (weich gebeugt an der Hüfte) im Shader
      const wp = WALK[PREFIX[id] + k] || { hip: 0 };
      const wu = walkMaterial(mat, wp, { instanced: false, groupHip: HIP, body: true, faceKey: PREFIX[id] + k, group: PREFIX[id][0] });
      wu.eAdd = id === 'woman' ? 0.35 : 0; // Pilgerin: Unterarme hängen im Modell gerade → Ellbogen etwas mehr beugen
      walkU.push(wu);
      const a = new THREE.Mesh(part.geometry, mat);
      a.castShadow = true; grp.add(a);
      if (k === 'cover') mCover = [a];
    }
  }
  if (models) { if (covered) buildVariant('woman', models.woman); else { buildVariant('ihram', models.man); buildVariant('kameez', models.kameez); } }
  const procedural = () => [lowerDress, lowerIzar, upper, torso, rida, ridaIdt, head, hair, khimar, face];
  let armGroups = [];
  function outfit() {
    const ih = isIhram();
    const want = covered ? 'woman' : ih ? 'ihram' : 'kameez';
    const useModel = !!variants[want];
    for (const [id, v] of Object.entries(variants)) v.grp.visible = id === want;
    if (mCover) for (const m of mCover) m.visible = !idtiba; // Idtiba': rechte Schulter frei
    for (const a of armGroups) a.visible = !useModel;
    if (useModel) { for (const m of procedural()) m.visible = false; return; }
    ridaDouble.color.copy(cloth.color);
    lowerIzar.visible = ih; lowerDress.visible = !ih;
    upper.visible = !ih; torso.visible = ih;
    rida.visible = ih && !idtiba; ridaIdt.visible = ih && idtiba;
    head.visible = !covered; hair.visible = !covered;
    khimar.visible = covered; face.visible = covered;
    for (const m of armMeshes) m.material = ih ? skinM : cloth;
  }
  const armG = new THREE.CapsuleGeometry(0.05, 0.5, 4, 10); armG.translate(0, -0.3, 0);
  const arms = [-1, 1].map((side) => {
    const a = new THREE.Group(); a.position.set(side * 0.25, 0.43, 0);
    const m = new THREE.Mesh(armG, cloth); a.add(m); armMeshes.push(m);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), skinM); hand.position.y = -0.6; a.add(hand);
    hip.add(a); return a;
  });
  armGroups = arms;
  outfit();
  root.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  let ringMesh = null;
  if (ring) {
    // Dezenter Ring: ein feiner, halbdurchsichtiger Bogen zeichnet sich langsam zum Kreis, schließt sich,
    // löst sich wieder auf und dreht dabei ständig weiter (Periode ca. 5 s)
    ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.46, 0.54, 64), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uC: { value: new THREE.Color(0xf6e2b0) } },
      vertexShader: 'varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uT; uniform vec3 uC; varying vec2 vP;
        float ease(float x) { x = clamp(x, 0.0, 1.0); return x * x * (3.0 - 2.0 * x); }
        void main() {
          float p = fract(uT / 5.0);
          float head = ease(p * 1.6) * 6.2832, tail = ease(p * 1.6 - 0.6) * 6.2832; // Kopf läuft voraus, Ende folgt
          float a = mod(atan(vP.y, vP.x) - uT * 0.5, 6.2832);                     // dreht ständig weiter
          float vis = smoothstep(tail - 0.05, tail + 0.35, a) * (1.0 - smoothstep(head - 0.35, head + 0.05, a));
          float r = length(vP), edge = smoothstep(0.46, 0.48, r) * (1.0 - smoothstep(0.52, 0.54, r)); // weiche Kanten
          gl_FragColor = vec4(uC, vis * edge * 0.42);
          #include <colorspace_fragment>
        }`,
    }));
    ringMesh.rotation.x = -Math.PI / 2; ringMesh.position.y = 0.04; root.add(ringMesh);
  }
  world.add(root);

  const cur = { hip: 0, drop: 0, arm: [0, 0], lie: 0, m: [0, 0], e: [0, 0], th: 0 };
  let target = POSES.stand, swing = 0;
  return {
    root, cloth, skinM,
    setColor(c) { cloth.color.setHex(c); outfit(); },
    // Idtiba': rechte Schulter frei (nur Männer, nur im Tawaf der Umrah)
    setIdtiba(v) { idtiba = v; outfit(); },
    pose(name) { target = POSES[name] || POSES.stand; },
    get poseName() { return Object.keys(POSES).find((k) => POSES[k] === target); },
    update(dt, walking = 0) {
      if (ringMesh) ringMesh.material.uniforms.uT.value += dt;
      const k = 1 - Math.exp(-dt * 7);
      cur.hip += (target.hip - cur.hip) * k;
      cur.drop += (target.drop - cur.drop) * k;
      cur.lie += (target.lie - cur.lie) * k;
      cur.arm[0] += (target.arm[0] - cur.arm[0]) * k;
      cur.arm[1] += (target.arm[1] - cur.arm[1]) * k;
      for (let q = 0; q < 2; q++) { cur.m[q] += (target.m[q] - cur.m[q]) * k; cur.e[q] += (target.e[q] - cur.e[q]) * k; }
      swing += dt * (walking > 0.05 ? 7 + walking * 5 : 0);
      const sw = walking > 0.05 ? Math.sin(swing) * 0.45 * Math.min(1, walking) : 0;
      // Modell-Figur: Beine/Arme im Shader (nur im Stehen/Gehen, nicht beim Beten oder Liegen)
      const wAmt = walking > 0.05 && cur.hip < 0.2 && cur.drop < 0.05 && cur.lie < 0.05 ? Math.min(1, walking) : 0;
      const kn = Math.min(1, cur.drop / 0.55); // Knien statt Stauchen
      for (const u of walkU) { u.uWalk.value.x = swing; u.uWalk.value.y += (wAmt - u.uWalk.value.y) * Math.min(1, dt * 10); u.uWalk.value.z = kn; u.uArm.value.set(cur.m[0], cur.m[1]); u.uElbow.value.set(cur.e[0] + u.eAdd * Math.min(1, cur.m[0] * 2), cur.e[1] + u.eAdd * Math.min(1, cur.m[1] * 2)); }
      hip.rotation.x = cur.hip;
      lowerDress.scale.y = lowerIzar.scale.y = 1 - cur.drop;
      // Beine: Oberschenkel-Winkel th, Unterschenkel liegt immer waagerecht nach hinten (fo = -π/2 - th);
      // Hüfthöhe: auf den Fersen ca. 0,2 m, mit fast senkrechten Oberschenkeln (Sujud) ca. 0,53 m
      cur.th += ((target.th || 0) - cur.th) * k;
      const th = cur.th * kn, fo = (-Math.PI / 2 - cur.th) * kn;
      const sink = (HIP - (0.2 + 0.33 * Math.cos(cur.th))) * kn;
      for (const u of walkU) { u.uBody.value.set(cur.hip, sink); u.uKnee.value.set(th, fo); }
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
export function createPlayer(ctx, { x = 0, z = 0, heading = 0, color, speed = 1.6, fastSpeed = 2.8, colliders = [], ground = null, camDist = 6.5, camHeight = 2.6, surface = 'sand' } = {}) {
  let stepDist = 0; // für Schrittgeräusche (alle ca. 0,75 m)
  const { engine, input } = ctx;
  const fig = createFigure(engine.world, { color, covered: ctx.profile?.gender === 'f', models: peopleModels() });
  const pos = new THREE.Vector3(x, 0, z);
  const vel = new THREE.Vector3();
  let head = heading, walking = 0, frozen = false;
  input.yaw = heading; // Kamera hinter der Figur (Blickrichtung = heading)
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  let first = true;

  // Navigation zum Ziel: dezente Leuchtwinkel am Boden vor der Figur, die wie ein Lauflicht nach vorne
  // aufleuchten und wieder verblassen (Welle, kurze Pause, nächste Welle). Durch die Menge hindurch sichtbar.
  const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const GN = 5, G0 = 4.2, GS = 2.0; // Anzahl, Abstand des ersten Winkels zur Figur, Abstand zwischen den Winkeln
  const chevTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    const path = () => { g.beginPath(); g.moveTo(22, 84); g.lineTo(64, 44); g.lineTo(106, 84); };
    g.lineCap = g.lineJoin = 'round';
    // weicher Schatten (Kontrast auf hellem Boden), Leuchten, heller Kern – mit shadowBlur (funktioniert auch in Safari)
    g.shadowColor = 'rgba(40,28,10,0.7)'; g.shadowBlur = 10; path(); g.strokeStyle = 'rgba(60,42,14,0.25)'; g.lineWidth = 28; g.stroke();
    g.shadowColor = 'rgba(255,205,110,0.9)'; g.shadowBlur = 10; path(); g.strokeStyle = 'rgba(245,205,120,0.95)'; g.lineWidth = 18; g.stroke();
    g.shadowBlur = 0; path(); g.strokeStyle = '#fbf3e2'; g.lineWidth = 8; g.stroke(); // zurückhaltende Farben: Creme mit leichtem Goldschimmer
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const chevG = new THREE.PlaneGeometry(1.9, 1.9); chevG.rotateX(-Math.PI / 2); chevG.rotateY(Math.PI); chevG.scale(1, 1, 1.8); // in Laufrichtung gestreckt: aus flachem Blickwinkel gut lesbar // Spitze zeigt nach +z (= Richtung ang)
  const chevA = new THREE.InstancedBufferAttribute(new Float32Array(GN), 1); chevG.setAttribute('aA', chevA);
  const chevM = new THREE.MeshBasicMaterial({ map: chevTex, transparent: true, depthWrite: false, depthTest: true, fog: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -4 }); // liegt auf dem Boden, Figur und Menschen verdecken die Winkel
  chevM.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aA; varying float vA;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvA = aA;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vA;').replace('#include <map_fragment>', '#include <map_fragment>\ndiffuseColor.a *= vA;');
  };
  const guide = new THREE.InstancedMesh(chevG, chevM, GN);
  guide.frustumCulled = false; guide.renderOrder = 20; engine.world.add(guide);
  const gTarget = new THREE.Vector2(); let gFresh = 0, gT = 0, gVis = 0;
  const gd = new THREE.Object3D();
  guide.visible = false;
  function updateGuide(dt) {
    gFresh -= dt; gT += dt;
    const dx = gTarget.x - pos.x, dz = gTarget.y - pos.z, dist = Math.hypot(dx, dz);
    const want = gFresh > 0 && dist >= 2.2 ? 1 : 0;
    gVis += (want - gVis) * Math.min(1, dt * 4); // sanft ein- und ausblenden
    if (gVis < 0.01) { guide.visible = false; return; }
    guide.visible = true;
    const ux = dx / (dist || 1), uz = dz / (dist || 1), ang = Math.atan2(ux, uz);
    const gy = (x, z) => (ground ? ground(x, z) : 0) + 0.08;
    const CYCLE = 3.2, wave = (gT % CYCLE) / 2.4; // Welle (2,4 s), dann 0,8 s Pause
    // Immer sichtbar (Grundhelligkeit), die Welle läuft darüber. Auf dem richtigen Weg etwas ruhiger, nie unsichtbar.
    const fx = Math.sin(head), fz = Math.cos(head), onWay = smooth(0.75, 0.96, fx * ux + fz * uz) * (walking > 0.3 ? 1 : 0.6);
    const strength = gVis * (1 - 0.3 * onWay);
    let n = 0;
    for (let i = 0; i < GN; i++) {
      const k = wave * (GN + 1.5) - i; // jeder Winkel leuchtet kurz nach seinem Vorgänger auf
      const a = k > 0 && k < 2 ? Math.sin((k / 2) * Math.PI) : 0;
      const d = G0 + i * GS + Math.max(0, Math.min(2, k)) * 0.18; // gleitet beim Leuchten ein Stück nach vorn
      if (d > dist - 1.2) break;
      gd.position.set(pos.x + ux * d, gy(pos.x + ux * d, pos.z + uz * d), pos.z + uz * d); gd.rotation.set(0, ang, 0);
      gd.scale.setScalar(0.85 + a * 0.15); gd.updateMatrix(); guide.setMatrixAt(n, gd.matrix);
      chevA.setX(n, Math.min(1, (0.5 + 0.6 * a) * strength * (1 - i * 0.07))); n++;
    }
    guide.count = n; guide.instanceMatrix.needsUpdate = true; chevA.needsUpdate = true;
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
      // Leise Schritte je nach Untergrund (surface: 'sand' | 'stone' | 'marble' | 'carpet' oder Funktion (x, z) → Untergrund)
      if (v > 0.4 && !frozen) { stepDist += v * dt; if (stepDist > 0.75) { stepDist = 0; sfxStep(typeof surface === 'function' ? surface(pos.x, pos.z) : surface, Math.min(1, v / speed)); } } else stepDist = 0.5;
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
