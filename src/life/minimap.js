import { clock } from './clock.js';
import { PRAYER_UI as U } from '../content/life.js';

// Karte des Lebensspiels: runder Kreis oben rechts (dreht sich mit der Blickrichtung, zeigt Uhrzeit und nächstes Gebet).
// Antippen öffnet die große Karte (Norden oben) mit allen Orten; einen Ort antippen = Ziel → Leuchtwinkel am Boden führen hin.
// Die Station liefert info = { title, city, bounds, areas, blocks, roads, shapes, pois } (Weltkoordinaten, Norden = −z).
//   areas/roads: [{x0,x1,z0,z1}], blocks: [{x,z,w,d,ry}], shapes: [{t:'circle'|'rect', x,z,r | x0..z1, c, label}],
//   pois: [{x,z,icon,label}] (Erlebnis-Orte, Moscheen, Bus …)
let el = null;
function dom() {
  if (el) return el;
  const mini = document.createElement('button'); mini.type = 'button'; mini.id = 'minimap'; mini.setAttribute('aria-label', 'Karte öffnen');
  mini.innerHTML = '<canvas width="176" height="176"></canvas><span class="mm-time"></span>';
  const pop = document.createElement('div'); pop.id = 'mapPop'; pop.hidden = true;
  pop.innerHTML = `<div class="mp-card"><div class="mp-head"><b class="mp-title"></b><span class="mp-now"></span><button type="button" class="mp-close" aria-label="Schließen">✕</button></div>
    <div class="mp-wrap"><canvas class="mp-canvas"></canvas><div class="mp-zoom"><button type="button" data-z="in" aria-label="Hineinzoomen">＋</button><button type="button" data-z="out" aria-label="Herauszoomen">−</button><button type="button" data-z="me" aria-label="Zu mir">⌖</button></div></div><div class="mp-target" hidden></div>
    <div class="mp-places"></div><div class="mp-prayers"></div></div>`;
  document.body.append(mini, pop);
  el = { mini, pop, mc: mini.querySelector('canvas'), time: mini.querySelector('.mm-time'), pc: pop.querySelector('.mp-canvas') };
  return el;
}

export function showMinimap(ctx, info) {
  const E = dom(), player = ctx.player;
  E.mini.hidden = false; document.body.classList.add('has-minimap');
  let target = null, frame = 0, open = false, zoom = 1, pan = null; // pan = Kartenmitte (Welt), null = Mitte der Grenzen
  const C = { sand: '#e8dbbd', walk: '#f8f5ee', block: '#cbbd9f', blockLine: '#a8987a', road: '#6d6e72', water: '#9fc6d8' };

  // Welt → Bildschirm: forward/right der Kartenausrichtung, s = Pixel pro Meter
  function view(g, cx, cy, s, ang) {
    const f = { x: -Math.sin(ang), z: -Math.cos(ang) }, r = { x: Math.cos(ang), z: -Math.sin(ang) };
    const a = s * r.x, c = s * r.z, b = -s * f.x, d = -s * f.z;
    return { set: (px, pz) => g.setTransform(a, b, c, d, cx - (a * px + c * pz), cy - (b * px + d * pz)), pt: (x, z, px, pz) => [cx + a * (x - px) + c * (z - pz), cy + b * (x - px) + d * (z - pz)] };
  }
  function drawWorld(g, V, px, pz, s, labels, k = 1) { // k = Schriftfaktor (Bildschirm-Pixeldichte)
    V.set(px, pz);
    g.fillStyle = C.sand; g.fillRect(px - 5000, pz - 5000, 10000, 10000);
    for (const q of info.areas || []) { g.fillStyle = q.c || C.walk; g.fillRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0); }
    for (const q of info.roads || []) { g.fillStyle = C.road; g.fillRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0); g.fillStyle = '#e9c046'; g.fillRect(q.x0, (q.z0 + q.z1) / 2 - 0.3, q.x1 - q.x0, 0.6); }
    for (const sh of info.shapes || []) {
      g.fillStyle = sh.c; g.strokeStyle = sh.stroke || 'rgba(0,0,0,.25)'; g.lineWidth = 1.5 / s;
      if (sh.t === 'circle') { g.beginPath(); g.arc(sh.x, sh.z, sh.r, 0, 7); g.fill(); g.stroke(); }
      else { g.fillRect(sh.x0, sh.z0, sh.x1 - sh.x0, sh.z1 - sh.z0); g.strokeRect(sh.x0, sh.z0, sh.x1 - sh.x0, sh.z1 - sh.z0); }
    }
    g.fillStyle = C.block; g.strokeStyle = C.blockLine; g.lineWidth = 1 / s;
    for (const b of info.blocks || []) { g.save(); g.translate(b.x, b.z); g.rotate(-(b.ry || 0)); g.fillRect(-b.w / 2, -b.d / 2, b.w, b.d); g.strokeRect(-b.w / 2, -b.d / 2, b.w, b.d); g.restore(); }
    if (target) { g.strokeStyle = '#d4a017'; g.lineWidth = 3 / s; g.setLineDash([6 / s, 5 / s]); g.beginPath(); g.moveTo(player.pos.x, player.pos.z); g.lineTo(target.x, target.z); g.stroke(); g.setLineDash([]); }
    g.setTransform(1, 0, 0, 1, 0, 0);
    // Beschriftungen und Symbole immer aufrecht
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const sh of info.shapes || []) if (sh.label && labels) { const [x, y] = V.pt(sh.t === 'circle' ? sh.x : (sh.x0 + sh.x1) / 2, sh.t === 'circle' ? sh.z : (sh.z0 + sh.z1) / 2, px, pz); g.font = `600 ${13 * k}px Figtree, system-ui, sans-serif`; g.fillStyle = 'rgba(20,37,31,.85)'; g.fillText(sh.label, x, y); }
    for (const p of info.pois || []) { const [x, y] = V.pt(p.x, p.z, px, pz); g.font = `${(labels ? 18 : 13) * k}px system-ui, sans-serif`; g.fillText(p.icon, x, y); if (labels) { g.font = `500 ${11 * k}px Figtree, system-ui, sans-serif`; g.fillStyle = 'rgba(20,37,31,.85)'; g.fillText(p.label, x, y + 15 * k); } }
    if (target) { const [x, y] = V.pt(target.x, target.z, px, pz); g.font = `${20 * k}px system-ui`; g.fillText('📍', x, y - 8 * k); }
    for (const o of ctx.multi?.status?.().others || []) if (o.x != null && o.s === ctx.stationIndex) { const [x, y] = V.pt(o.x, o.z, px, pz); g.fillStyle = o.col || '#5fb3e6'; g.beginPath(); g.arc(x, y, 5 * k, 0, 7); g.fill(); }
  }
  function arrow(g, x, y, ang, size) { g.save(); g.translate(x, y); g.rotate(ang); g.fillStyle = '#e6c46e'; g.strokeStyle = '#14251f'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, -size); g.lineTo(size * 0.7, size * 0.7); g.lineTo(0, size * 0.35); g.lineTo(-size * 0.7, size * 0.7); g.closePath(); g.fill(); g.stroke(); g.restore(); }

  function drawMini() {
    const g = E.mc.getContext('2d'), W = E.mc.width, R = W / 2;
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, W);
    g.save(); g.beginPath(); g.arc(R, R, R - 3, 0, 7); g.clip();
    const yaw = player.viewYaw, V = view(g, R, R, 1.1, yaw);
    drawWorld(g, V, player.pos.x, player.pos.z, 1.1, false, 2);
    // Figur: Pfeil in Laufrichtung relativ zur Blickrichtung
    arrow(g, R, R, Math.PI - player.heading + yaw, 20);
    g.restore();
    // Norden-Markierung am Rand
    const nA = yaw; const nx = R + Math.sin(nA) * (R - 12), ny = R - Math.cos(nA) * (R - 12);
    g.font = 'bold 26px Figtree, system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.strokeStyle = '#14251f'; g.lineWidth = 3; g.strokeText('N', nx, ny); g.fillText('N', nx, ny);
    const d = info.city ? clock.current(info.city) : null, n = info.city ? clock.next(info.city) : null;
    E.time.textContent = info.city ? `${clock.hhmm()} · ${d && !clock.prayed(d) ? '🕌 ' + d.name + ' jetzt' : '🕌 ' + n.name + ' ' + clock.hhmm(n.t)}` : '';
  }
  function bounds() { const b = info.bounds; return { ...b, w: b.x1 - b.x0, h: b.z1 - b.z0 }; }
  function drawBig() {
    const c = E.pc, dpr = Math.min(2, window.devicePixelRatio || 1), cw = c.clientWidth, ch = c.clientHeight;
    if (c.width !== Math.round(cw * dpr)) { c.width = Math.round(cw * dpr); c.height = Math.round(ch * dpr); }
    const g = c.getContext('2d'), b = bounds(), s = Math.min(cw / b.w, ch / b.h) * dpr * zoom;
    const cx = pan ? pan.x : (b.x0 + b.x1) / 2, cz = pan ? pan.z : (b.z0 + b.z1) / 2;
    const V = view(g, c.width / 2, c.height / 2, s, 0);
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    drawWorld(g, V, cx, cz, s, s / dpr > 1.1, dpr); // Namen erst beim Hineinzoomen
    const [x, y] = V.pt(player.pos.x, player.pos.z, cx, cz);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); arrow(g, x / dpr, y / dpr, Math.PI - player.heading, 10);
    g.font = '600 12px Figtree, system-ui'; g.fillStyle = '#14251f'; g.textAlign = 'center'; g.fillText('Du', x / dpr, y / dpr + 20);
    E._big = { V, cx, cz, dpr, s };
  }
  function setTarget(p) {
    target = p ? { x: p.x, z: p.z, label: p.label } : null;
    const t = E.pop.querySelector('.mp-target');
    t.hidden = !target; if (target) t.innerHTML = `📍 Ziel: <b>${target.label}</b> – folge den Leuchtwinkeln am Boden <button type="button">Ziel löschen</button>`;
    t.querySelector('button')?.addEventListener('click', () => setTarget(null));
    if (open) drawBig();
  }
  function fill() {
    E.pop.querySelector('.mp-title').textContent = info.title;
    E.pop.querySelector('.mp-places').innerHTML = (info.pois || []).map((p, i) => `<button type="button" data-i="${i}">${p.icon} ${p.label}</button>`).join('');
    E.pop.querySelectorAll('.mp-places button').forEach((b) => b.addEventListener('click', () => { setTarget(info.pois[+b.dataset.i]); close(); }));
    if (info.city) {
      const P = clock.prayers(info.city), cur = clock.current(info.city);
      E.pop.querySelector('.mp-prayers').innerHTML = `<b>${U.times}</b><div class="mp-pt">${P.map((p) => `<span class="${cur === p ? 'now' : ''}">${p.name} ${clock.hhmm(p.t)} ${clock.prayed(p) ? '✓' : ''}</span>`).join('')}</div><p class="small">${U.note}</p>`;
      E.pop.querySelector('.mp-now').textContent = clock.hhmm();
    } else { E.pop.querySelector('.mp-prayers').innerHTML = ''; E.pop.querySelector('.mp-now').textContent = ''; }
  }
  function openMap() { open = true; E.pop.hidden = false; zoom = 2.2; pan = { x: player.pos.x, z: player.pos.z }; fill(); requestAnimationFrame(drawBig); } // öffnet um die eigene Position
  function close() { open = false; E.pop.hidden = true; }
  const onMini = () => openMap();
  const onClose = () => close();
  const onPop = (e) => { if (e.target === E.pop) close(); };
  // Verschieben (Finger/Maus ziehen) und Antippen unterscheiden
  let drag = null;
  const onDown = (e) => { drag = { x: e.clientX, y: e.clientY, moved: 0 }; E.pc.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!drag || !E._big || (e.pointerType === 'mouse' && !e.buttons)) return; const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.moved += Math.hypot(dx, dy); drag.x = e.clientX; drag.y = e.clientY;
    const B = E._big, k = B.dpr / B.s; pan = { x: B.cx - dx * k, z: B.cz - dy * k }; drawBig();
  };
  const onZoom = (e) => {
    const z = e.target.closest('button')?.dataset.z; if (!z) return; e.stopPropagation();
    if (z === 'me') { zoom = Math.max(zoom, 3); pan = { x: player.pos.x, z: player.pos.z }; }
    else { const B = E._big; if (!pan && B) pan = { x: B.cx, z: B.cz }; zoom = Math.min(8, Math.max(1, zoom * (z === 'in' ? 1.6 : 1 / 1.6))); if (zoom === 1) pan = null; }
    drawBig();
  };
  const onCanvas = (e) => { // Ort auf der Karte antippen
    if (drag && drag.moved > 8) { drag = null; return; } drag = null;
    const B = E._big; if (!B) return;
    const r = E.pc.getBoundingClientRect(), x = (e.clientX - r.left) * B.dpr, y = (e.clientY - r.top) * B.dpr;
    let best = null, bd = 40 * B.dpr; for (const p of info.pois || []) { const [px, py] = B.V.pt(p.x, p.z, B.cx, B.cz); const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = p; } }
    if (best) { setTarget(best); setTimeout(close, 450); }
  };
  E.mini.addEventListener('click', onMini); E.pop.querySelector('.mp-close').addEventListener('click', onClose); E.pop.addEventListener('click', onPop); E.pc.addEventListener('click', onCanvas); E.pc.addEventListener('pointerdown', onDown); E.pc.addEventListener('pointermove', onMove); E.pop.querySelector('.mp-zoom').addEventListener('click', onZoom);
  setTarget(null);

  return {
    get target() { return target; },
    setTarget,
    update() {
      if (target) { player.guideTo(target.x, target.z); if (player.distTo(target.x, target.z) < 5) { ctx.ui.toast('📍 Angekommen: ' + target.label, 2200); setTarget(null); } }
      if (frame++ % 3 === 0) drawMini();
      if (open && frame % 15 === 0) { drawBig(); E.pop.querySelector('.mp-now').textContent = info.city ? clock.hhmm() : ''; }
    },
    dispose() {
      close(); E.mini.hidden = true; document.body.classList.remove('has-minimap');
      E.mini.removeEventListener('click', onMini); E.pop.querySelector('.mp-close').removeEventListener('click', onClose); E.pop.removeEventListener('click', onPop); E.pc.removeEventListener('click', onCanvas); E.pc.removeEventListener('pointerdown', onDown); E.pc.removeEventListener('pointermove', onMove); E.pop.querySelector('.mp-zoom').removeEventListener('click', onZoom);
    },
  };
}
