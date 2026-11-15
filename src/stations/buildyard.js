import * as THREE from 'three';
import { BUILDYARD as T, MATERIALS } from '../content/life.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { palms, sign, bus } from '../world/props.js';
import { createPlayer } from '../core/player.js';
import { createLife } from '../world/life.js';
import { createInteract } from '../life/interact.js';
import * as sfx from '../core/sfx.js';

// Sandstein-Bauhof in der Wüste vor Mekka: freies Bauen mit Steinquadern (0,5 m) auf einem Raster.
// Eigene Spielidee im Stil der übrigen Welt (halbrealistische Baustoffe des Hedschas, eigene Texturen), kein Nachbau eines Block-Spiels.
// Bedienung: Tippen/Klicken auf Boden oder Stein = daneben setzen (bzw. im Abbau-Modus wegnehmen). Material an den leuchtenden
// Stapeln holen oder unten rechts wählen. Man kann auf Steine steigen (eine Stufe = ein Stein), höhere Mauern halten auf.
// Speichern: localStorage „hp-bauhof“ (eigener Bau) bzw. „hp-bauhof-raum-<Code>“ (gemeinsamer Bau im privaten Raum).
// Zusammen spielen: Im privaten Raum bauen alle am selben Bau (Ereignisse über multi.send), öffentlich baut jeder für sich.
const S = 0.5, N = 48, H = 24, HALF = (N * S) / 2; // Steingröße, Raster N×N, max. H Lagen (12 m)
const CAP = 2400, MAX = 8000; // Instanzen je Material, Steine insgesamt
const key = (ix, iy, iz) => ix + iz * N + iy * N * N;
const unkey = (k) => [k % N, Math.floor(k / (N * N)), Math.floor(k / N) % N];
const cell = (v) => Math.floor((v + HALF) / S);

// ---------- eigene Texturen (im Browser gezeichnet, kein Download) ----------
function rnd(seed) { let s = seed; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function texture(id) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'), r = rnd(id.length * 977 + 13);
  const fill = (col) => { g.fillStyle = col; g.fillRect(0, 0, 256, 256); };
  const specks = (n, cols, s0, s1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; const s = s0 + r() * (s1 - s0); g.globalAlpha = 0.25 + r() * 0.35; g.fillRect(r() * 256, r() * 256, s, s); } g.globalAlpha = 1; };
  if (id === 'sand') {
    fill('#d8b47a'); specks(2600, ['#c49a5e', '#e6c896', '#b88d55'], 1, 3);
    g.globalAlpha = 0.18; for (let y = 30; y < 256; y += 38 + r() * 20) { g.fillStyle = '#a77e48'; g.fillRect(0, y, 256, 2 + r() * 3); } g.globalAlpha = 1;
  } else if (id === 'mud') {
    fill('#b8875a'); specks(1800, ['#a2744a', '#c99a6c', '#8f6440'], 1, 3);
    g.fillStyle = '#d9bf98'; // Fugen: zwei Ziegelreihen, versetzt
    for (const y of [0, 126, 252]) g.fillRect(0, y - 3, 256, 7);
    for (const [y, x] of [[0, 128], [126, 0], [126, 255]]) g.fillRect(x - 3, y, 7, 126);
    g.strokeStyle = 'rgba(230,205,140,0.5)'; for (let i = 0; i < 70; i++) { const x = r() * 256, y = r() * 256, a = r() * 6; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); } // Stroh
  } else if (id === 'coral') {
    fill('#e4dac6'); specks(1500, ['#d2c5ad', '#efe7d8'], 1, 4);
    for (let i = 0; i < 160; i++) { g.fillStyle = 'rgba(120,100,75,0.45)'; g.beginPath(); g.ellipse(r() * 256, r() * 256, 1 + r() * 3, 1 + r() * 2.5, r() * 3, 0, 7); g.fill(); } // Poren
  } else if (id === 'marble') {
    fill('#f1eee8'); specks(900, ['#e4e0d8', '#faf8f4'], 2, 6);
    g.strokeStyle = 'rgba(140,140,150,0.35)';
    for (let v = 0; v < 5; v++) { let x = r() * 256, y = 0; g.lineWidth = 0.6 + r() * 1.6; g.beginPath(); g.moveTo(x, y); while (y < 256) { x += (r() - 0.5) * 22; y += 8 + r() * 10; g.lineTo(x, y); } g.stroke(); }
  } else if (id === 'wood') {
    fill('#8c6440');
    for (let x = 0; x < 256; x += 2) { g.fillStyle = `rgba(${r() < 0.5 ? '60,40,22' : '170,130,90'},${0.15 + r() * 0.25})`; g.fillRect(x, 0, 1 + r() * 2, 256); }
    g.fillStyle = 'rgba(50,32,18,0.35)'; for (let i = 0; i < 6; i++) g.fillRect(0, r() * 256, 256, 1.5); // Fasern quer
  } else if (id === 'tile') {
    fill('#efe6d2');
    // achtzackiger Stern (zwei gedrehte Quadrate) mit Rand – eigenes geometrisches Muster
    const star = (cx, cy, rr, col) => { g.fillStyle = col; for (const a of [0, Math.PI / 4]) { g.save(); g.translate(cx, cy); g.rotate(a); g.fillRect(-rr, -rr, rr * 2, rr * 2); g.restore(); } };
    star(128, 128, 78, '#1f5f7a'); star(128, 128, 62, '#2f8f9a'); star(128, 128, 30, '#efe6d2'); star(128, 128, 20, '#c9a24e');
    for (const [x, y] of [[0, 0], [256, 0], [0, 256], [256, 256]]) star(x, y, 34, '#1f5f7a');
  }
  // Kanten: leichte Fase (dunkler Rand, heller Saum) – jeder Stein ist erkennbar, ohne Pixel-Look
  g.strokeStyle = 'rgba(40,25,10,0.45)'; g.lineWidth = 8; g.strokeRect(4, 4, 248, 248);
  g.strokeStyle = 'rgba(255,248,230,0.35)'; g.lineWidth = 3; g.strokeRect(10, 10, 236, 236);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return { tex: t, url: c.toDataURL('image/jpeg', 0.7) };
}
const ROUGH = { sand: 0.92, mud: 0.95, coral: 0.9, marble: 0.35, wood: 0.8, tile: 0.3 };

export function create(ctx, { from } = {}) {
  const { engine, sky, ui } = ctx;
  const world = engine.world, mobile = engine.isMobile;
  sky.setHour(16.2); sky.state.shadowSize = 50;
  ui.el.day.textContent = T.day; ui.el.title.textContent = T.title;

  const h = heightFn({ r0: 70, r1: 420, amp: 140 });
  buildTerrain(world, h);
  // Bauplatz: festgestampfter Boden mit feinem Raster (zeigt, wo Steine hinkommen)
  { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#c9a676'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 900; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(150,115,70,.25)' : 'rgba(235,210,165,.25)'; g.fillRect(Math.random() * 128, Math.random() * 128, 2, 2); }
    g.strokeStyle = 'rgba(110,80,45,.35)'; g.lineWidth = 2; g.strokeRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(N / 2, N / 2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    const f = new THREE.Mesh(new THREE.PlaneGeometry(N * S, N * S).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: t, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
    f.position.y = 0.01; f.receiveShadow = true; world.add(f);
    // niedrige Randsteine
    const curbM = new THREE.MeshStandardMaterial({ color: 0xcbb38a, roughness: 0.9 });
    for (const [x, z, w, d] of [[0, -HALF - 0.15, N * S + 0.6, 0.3], [0, HALF + 0.15, N * S + 0.6, 0.3], [-HALF - 0.15, 0, 0.3, N * S], [HALF + 0.15, 0, 0.3, N * S]]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.12, d), curbM); m.position.set(x, 0.06, z); m.receiveShadow = true; world.add(m);
    } }

  // ---------- Baustoffe ----------
  const geo = new THREE.BoxGeometry(S, S, S);
  const mats = MATERIALS.map((m) => { const t = texture(m.id); return { ...m, url: t.url, mat: new THREE.MeshStandardMaterial({ map: t.tex, roughness: ROUGH[m.id] }) }; });
  const meshes = mats.map((m) => { const im = new THREE.InstancedMesh(geo, m.mat, CAP); im.count = 0; im.castShadow = im.receiveShadow = true; im.frustumCulled = false; world.add(im); return im; });
  const blocks = new Map(); // key → Material-Index
  const dm = new THREE.Object3D(), col = new THREE.Color();
  let dirty = new Set();
  function rebuild() {
    const n = mats.map(() => 0);
    for (const [k, m] of blocks) {
      if (!dirty.has(m) || n[m] >= CAP) continue;
      const [ix, iy, iz] = unkey(k);
      dm.position.set(-HALF + (ix + 0.5) * S, (iy + 0.5) * S, -HALF + (iz + 0.5) * S); dm.updateMatrix();
      meshes[m].setMatrixAt(n[m], dm.matrix);
      const v = 0.9 + ((k * 2654435761) >>> 0) % 1000 / 1000 * 0.18; meshes[m].setColorAt(n[m], col.setScalar(v)); // leichte Farbunterschiede
      n[m]++;
    }
    for (const m of dirty) { meshes[m].count = n[m]; meshes[m].instanceMatrix.needsUpdate = true; if (meshes[m].instanceColor) meshes[m].instanceColor.needsUpdate = true; }
    dirty.clear();
  }

  // ---------- Speichern ----------
  const store = () => (ctx.multi?.room ? 'hp-bauhof-raum-' + ctx.multi.room : 'hp-bauhof');
  let storeKey = store(), saveT = 0;
  const encode = () => [...blocks].map(([k, m]) => k.toString(36) + '.' + m).join(',');
  function load(str) {
    blocks.clear(); mats.forEach((_, i) => dirty.add(i));
    for (const p of (str || '').split(',')) { if (!p) continue; const [k, m] = p.split('.'); const kk = parseInt(k, 36), mm = +m; if (kk >= 0 && kk < N * N * H && mats[mm]) blocks.set(kk, mm); }
    rebuild();
  }
  const readSave = (k) => { try { const o = JSON.parse(localStorage.getItem(k) || 'null'); return o && o.v === 1 ? o.b : ''; } catch { return ''; } };
  const save = () => { try { localStorage.setItem(storeKey, JSON.stringify({ v: 1, b: encode() })); } catch { /* voll/privat */ } };
  load(readSave(storeKey));

  function setBlock(k, m, { send = true } = {}) {
    const old = blocks.get(k);
    if (m < 0) { if (old == null) return false; blocks.delete(k); dirty.add(old); }
    else { if (old === m) return false; if (old == null && blocks.size >= MAX) { ui.toast(T.full, 2000); return false; } blocks.set(k, m); dirty.add(m); if (old != null) dirty.add(old); }
    rebuild(); saveT = 1;
    if (send && ctx.multi?.room) ctx.multi.send('b', { k, m });
    return true;
  }

  // ---------- Umgebung ----------
  palms(world, [[-20, 0, -14, 1, 0.9], [-21, 0, 12, 2, 0.8], [19, 0, 16, 3, 0.85], [21, 0, -18, 1, 0.8], [3, 0, -22, 2, 0.75]]);
  const coach = bus(world, -18, 2, 0);
  sign(world, -15, -6, Math.PI / 2, T.sign, { w: 3.2, h: 1.1, y: 2.6 });
  // Werkzeughütte mit Infotafel
  const hut = new THREE.Group(); hut.position.set(16, 0, -8); world.add(hut);
  { const b = new THREE.Mesh(new THREE.BoxGeometry(3, 2.6, 3), mats[1].mat); b.position.y = 1.3; b.castShadow = b.receiveShadow = true; hut.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 3.6), mats[4].mat); roof.position.y = 2.7; roof.castShadow = true; hut.add(roof);
    const door = new THREE.Mesh(new THREE.PlaneGeometry(1, 1.9), mats[4].mat); door.position.set(-1.51, 0.95, 0); door.rotation.y = -Math.PI / 2; hut.add(door); }
  const board = new THREE.Group(); board.position.set(14.2, 0, -5.4); board.rotation.y = -Math.PI / 2; world.add(board);
  { const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), mats[4].mat); post.position.y = 0.7; board.add(post);
    const pl = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.08), new THREE.MeshStandardMaterial({ color: 0x2c3034, roughness: 0.8 })); pl.position.y = 1.6; board.add(pl); }

  // Materialstapel am Rand (2×2×2 Steine), leuchten in der Nähe → Material nehmen
  const piles = mats.map((m, i) => {
    const g = new THREE.InstancedMesh(geo, m.mat, 8); const x = -6.25 + i * 2.5, z = HALF + 1.6;
    for (let j = 0; j < 8; j++) { dm.position.set(x + ((j & 1) - 0.5) * S, ((j >> 2) + 0.5) * S, z + (((j >> 1) & 1) - 0.5) * S); dm.updateMatrix(); g.setMatrixAt(j, dm.matrix); }
    g.castShadow = true; world.add(g); return { g, x, z };
  });

  // ---------- Spielfigur: kann auf Steine steigen, höhere Mauern halten auf ----------
  let me = null;
  const filled = (ix, iy, iz) => ix >= 0 && iz >= 0 && ix < N && iz < N && iy >= 0 && iy < H && blocks.has(key(ix, iy, iz));
  const STEP = S + 0.06, BODY = 1.7;
  function ground(x, z) {
    const y0 = me ? me.pos.y : 0, ix = cell(x), iz = cell(z);
    let top = 0;
    for (let iy = Math.min(H - 1, Math.floor((y0 + STEP) / S) - 1); iy >= 0; iy--) if (filled(ix, iy, iz)) { top = (iy + 1) * S; break; }
    return top >= y0 ? top : Math.max(top, y0 - 0.32); // fallen: weich nach unten
  }
  const wall = { type: 'fn', fn(p, r) {
    const y0 = me ? me.pos.y : 0, c0 = cell(p.x), r0 = cell(p.z);
    const lo = Math.max(0, Math.floor((y0 + STEP) / S)), hi = Math.min(H - 1, Math.floor((y0 + BODY) / S));
    for (let ix = c0 - 1; ix <= c0 + 1; ix++) for (let iz = r0 - 1; iz <= r0 + 1; iz++) {
      let solid = false; for (let iy = lo; iy <= hi && !solid; iy++) solid = filled(ix, iy, iz);
      if (!solid) continue;
      const cx = -HALF + (ix + 0.5) * S, cz = -HALF + (iz + 0.5) * S, hw = S / 2 + r;
      const lx = p.x - cx, lz = p.z - cz;
      if (Math.abs(lx) < hw && Math.abs(lz) < hw) { if (hw - Math.abs(lx) < hw - Math.abs(lz)) p.x = cx + Math.sign(lx || 1) * hw; else p.z = cz + Math.sign(lz || 1) * hw; }
    }
  } };
  const colliders = [
    { type: 'rect', x0: -32, x1: 32, z0: -32, z1: 32 },
    coach.collider, { type: 'box', x: 16, z: -8, hw: 1.5, hd: 1.5 },
    ...piles.map((p) => ({ type: 'box', x: p.x, z: p.z, hw: 0.55, hd: 0.55 })),
    wall,
  ];
  const start = from === 'city' || !from ? { x: -13.5, z: 0, h: Math.PI / 2 } : { x: 0, z: HALF + 4, h: Math.PI };
  const player = createPlayer(ctx, { x: start.x, z: start.z, heading: start.h, color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0xf6f4ee, speed: 2.2, fastSpeed: 3.6, colliders, ground, surface: 'sand' });
  me = player;
  const life = createLife(ctx, { kind: 'desert' });

  // ---------- Werkzeug: Bauen/Abbauen, Material ----------
  let mode = 'build', cur = 0;
  const bar = document.createElement('div'); bar.id = 'buildbar';
  bar.innerHTML = '<button type="button" class="mat"><i></i><span></span></button><button type="button" class="mode"></button>';
  document.body.appendChild(bar);
  const matBtn = bar.querySelector('.mat'), modeBtn = bar.querySelector('.mode');
  const render = () => {
    matBtn.querySelector('i').style.backgroundImage = `url(${mats[cur].url})`; matBtn.querySelector('span').textContent = mats[cur].name;
    modeBtn.textContent = mode === 'build' ? T.remove : T.build; // Knopf zeigt, wohin man umschaltet
    bar.classList.toggle('removing', mode === 'remove'); matBtn.disabled = mode === 'remove';
  };
  const pick = (i) => { cur = (i + mats.length) % mats.length; mode = 'build'; render(); ui.toast(T.taken(mats[cur].name), 1200); };
  matBtn.addEventListener('click', () => pick(cur + 1));
  modeBtn.addEventListener('click', () => { mode = mode === 'build' ? 'remove' : 'build'; render(); });
  const onKey = (e) => {
    if (e.target?.tagName === 'INPUT') return;
    const n = +e.key; if (n >= 1 && n <= mats.length) pick(n - 1);
    if (e.code === 'KeyR') { mode = mode === 'build' ? 'remove' : 'build'; render(); }
  };
  window.addEventListener('keydown', onKey);
  render();

  // Zielrahmen (zeigt, wo der Stein hinkommt bzw. welcher wegkommt)
  const ghost = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(S * 1.02, S * 1.02, S * 1.02)), new THREE.LineBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.9, depthTest: false }));
  ghost.renderOrder = 5; ghost.visible = false; world.add(ghost);
  let ghostT = 0;

  // Strahl durch das Raster (Voxel-Schritte): erster Stein oder der Boden. Liefert { hit: key|null, place: key|null }
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function aim(cx, cy) {
    ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
    ray.setFromCamera(ndc, engine.camera);
    const o = ray.ray.origin, d = ray.ray.direction;
    const g = [(o.x + HALF) / S, o.y / S, (o.z + HALF) / S], dd = [d.x, d.y, d.z], size = [N, H, N];
    // Eintritt in den Rasterkasten
    let t0 = 0, t1 = 200;
    for (let a = 0; a < 3; a++) {
      if (Math.abs(dd[a]) < 1e-9) { if (g[a] < 0 || g[a] > size[a]) return null; continue; }
      let ta = (0 - g[a]) / dd[a], tb = (size[a] - g[a]) / dd[a]; if (ta > tb) [ta, tb] = [tb, ta];
      t0 = Math.max(t0, ta); t1 = Math.min(t1, tb);
    }
    if (t0 > t1) return null;
    const p = g.map((v, a) => v + dd[a] * (t0 + 1e-4));
    const c = p.map((v, a) => Math.min(size[a] - 1, Math.max(0, Math.floor(v))));
    const step = dd.map((v) => (v > 0 ? 1 : -1)), tD = dd.map((v) => Math.abs(1 / (v || 1e-9)));
    const tM = dd.map((v, a) => (v > 0 ? (c[a] + 1 - p[a]) : (p[a] - c[a])) * tD[a]);
    let prev = null, t = t0;
    for (let i = 0; i < 160; i++) {
      if (blocks.has(key(c[0], c[1], c[2]))) return { hit: key(c[0], c[1], c[2]), place: prev };
      prev = key(c[0], c[1], c[2]);
      const a = tM[0] < tM[1] ? (tM[0] < tM[2] ? 0 : 2) : (tM[1] < tM[2] ? 1 : 2);
      if (a === 1 && step[1] < 0 && c[1] === 0) return { hit: null, place: prev }; // Boden erreicht → auf den Boden setzen
      c[a] += step[a]; t = t0 + tM[a]; tM[a] += tD[a];
      if (c[a] < 0 || c[a] >= size[a]) return null;
    }
    void t; return null;
  }
  const center = (k) => { const [ix, iy, iz] = unkey(k); return new THREE.Vector3(-HALF + (ix + 0.5) * S, (iy + 0.5) * S, -HALF + (iz + 0.5) * S); };
  const reach = (k) => { const c = center(k); return Math.hypot(c.x - player.pos.x, c.z - player.pos.z) < 12 && Math.abs(c.y - player.pos.y) < 8; };
  const blocksMe = (k) => { const c = center(k); return Math.abs(c.x - player.pos.x) < S / 2 + 0.3 && Math.abs(c.z - player.pos.z) < S / 2 + 0.3 && c.y + S / 2 > player.pos.y + 0.02 && c.y - S / 2 < player.pos.y + BODY; };
  function target(cx, cy) {
    const a = aim(cx, cy); if (!a) return null;
    const k = mode === 'build' ? a.place : a.hit;
    return k == null ? null : k;
  }
  ctx.input.onTap = (cx, cy) => {
    const k = target(cx, cy); if (k == null) return;
    if (!reach(k)) { ui.toast(T.far, 1400); return; }
    if (mode === 'build') { if (blocksMe(k)) return; if (setBlock(k, cur)) sfx.step?.('stone', 1); }
    else if (setBlock(k, -1)) sfx.step?.('sand', 1);
    ghost.position.copy(center(k)); ghost.visible = true; ghostT = 0.6;
  };
  // Maus: Zielrahmen folgt dem Zeiger (ohne gedrückte Taste)
  const canvas = engine.renderer.domElement;
  const onMove = (e) => {
    if (e.pointerType !== 'mouse' || e.buttons) return;
    const k = target(e.clientX, e.clientY);
    if (k != null && reach(k)) { ghost.position.copy(center(k)); ghost.visible = true; ghostT = 1e9; ghost.material.color.set(mode === 'build' ? 0xffd36a : 0xff7a5a); }
    else if (ghostT > 1e8) ghost.visible = false;
  };
  canvas.addEventListener('pointermove', onMove);

  // ---------- Leuchtende Dinge (Randleuchten) ----------
  const interact = createInteract(ctx, player);
  piles.forEach((p, i) => interact.add({ obj: p.g, color: 'gold', x: p.x, z: p.z - 1.1, radius: 5, near: 1.6, label: '🧱 ' + T.take(mats[i].name), key: 'pile' + i, run() { pick(i); } }));
  interact.add({ obj: coach.group, color: 'blue', radius: 10, near: 2.8, push: 0.04, x: -14.3, z: 0, label: T.back, key: 'bus', run() { sfx.bus?.(); ctx.city?.('bauhof'); } });
  interact.add({ obj: board, color: 'gold', radius: 5, near: 2, label: '📜 Tafel lesen', key: 'board', run() { ui.info(`<p>${T.fact}</p>`); ui.el.panel.classList.remove('collapsed'); } });
  ctx.interact = interact;
  ctx.debug = { aim, blocks, target, reach, setBlock, key }; // für automatische Tests

  // ---------- Zusammen bauen (nur im privaten Raum) ----------
  const multi = ctx.multi;
  let synced = false, askT = 0, room = multi?.room || '';
  const offs = multi?.on ? [
    multi.on('b', (d) => { if (multi.room && typeof d?.k === 'number' && (d.m === -1 || mats[d.m])) setBlock(d.k, d.m, { send: false }); }),
    multi.on('bq', (d, from) => { // jemand fragt nach dem gemeinsamen Bau: der Mitspieler mit der kleinsten Kennung antwortet
      if (!multi.room || !synced) return;
      const here = multi.status().others.filter((o) => o.s === 'bauhof' && o.id !== from.id).map((o) => o.id).concat(multi.myId).sort();
      if (here[0] === multi.myId) multi.send('bs', { to: from.id, b: encode() });
    }),
    multi.on('bs', (d) => { if (!multi.room || d?.to !== multi.myId || synced) return; load(d.b); save(); synced = true; ui.toast(T.synced, 1800); }),
  ] : [];

  ui.el.panel.classList.remove('collapsed');
  ui.info(`<p>${T.intro}</p><p class="tr">${mobile ? '' : T.keys}</p>`);
  ui.actions([{ label: 'Zurück nach Mekka', onClick: () => ctx.city?.('bauhof') }]);

  return {
    update(dt) {
      player.update(dt);
      life.update(dt);
      interact.update(dt);
      if (ghostT < 1e8) { ghostT -= dt; if (ghostT <= 0) ghost.visible = false; }
      if (saveT > 0) { saveT -= dt; if (saveT <= 0) save(); }
      // privater Raum gewechselt → anderen Speicherstand laden, neu abgleichen
      const r = multi?.room || '';
      if (r !== room) { save(); room = r; storeKey = store(); load(readSave(storeKey)); synced = false; askT = 0; }
      if (room && !synced) {
        askT -= dt;
        const others = multi.status().others.filter((o) => o.s === 'bauhof');
        const ids = others.map((o) => o.id).concat(multi.myId).sort();
        if (!others.length) { if (askT < -6) synced = true; } // allein im Raum-Bauhof: eigener Stand gilt
        else if (ids[0] === multi.myId && askT < -6) synced = true; // niemand antwortet und ich bin „zuerst“: mein Stand gilt
        else if (askT <= 0) { askT = 3; multi.send('bq', {}); }
      }
    },
    dispose() {
      save(); interact.dispose(); offs.forEach((f) => f());
      ctx.input.onTap = null; window.removeEventListener('keydown', onKey); canvas.removeEventListener('pointermove', onMove);
      bar.remove(); ui.prompt(null);
      mats.forEach((m) => { m.mat.map.dispose(); });
    },
  };
}
