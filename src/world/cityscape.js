import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { makeVehicle, specOf, CAR_KINDS } from '../life/vehicles.js';

// Bausteine für die Städte Mekka und Medina im Lebensspiel (leicht für alte Handys):
// - Hochhäuser/Hotels: ein InstancedMesh je Fassadenstil; die Fenster kommen aus einer kleinen Kachel-Textur, deren Größe
//   im Shader aus der Gebäudegröße berechnet wird (Meter statt UV) → beliebig viele Türme mit wenigen Zeichenaufrufen.
// - Abraj al-Bait (Uhrturm-Komplex) im echten Maßstab, Uhrzeiger zeigen die Spielzeit.
// - Straßenverkehr: Autos und Busse auf einer Querstraße, Ampel mit Fußgängerüberweg; Autos bremsen für Menschen.
// - Schirme wie auf dem Vorplatz der Masjid an-Nabawi.
// - Begehbare Fläche als Vereinigung von Rechtecken (Kollision für die Spielfigur).
const dm = new THREE.Object3D();

// ---------- Fassaden-Texturen (eine Fensterachse × ein Geschoss) ----------
function canvasTex(w, h, draw, { repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = THREE.RepeatWrapping; t.wrapT = repeat ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping; return t;
}
const glassGrad = (g, x, y, w, h, top = '#5b6f7c', bot = '#2a3640') => { const gr = g.createLinearGradient(x, y, x + w * 0.4, y + h); gr.addColorStop(0, top); gr.addColorStop(0.55, bot); gr.addColorStop(1, '#3d4c57'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
function archPath(g, x, y, w, h) { const r = w / 2; g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y - r * 0.35); g.quadraticCurveTo(x + w, y, x + w, y + r); g.lineTo(x + w, y + h); g.closePath(); }
// Ladenfront unter einem Bogen: Steinrahmen, Schildband, Schaufenster mit Regalen und Waren, Glastür, Spiegelung
function shopFront(g, w, h, stone, dark, pointed) {
  g.fillStyle = stone; g.fillRect(0, 0, w, h);
  g.fillStyle = dark; g.fillRect(0, 0, w, 18); g.fillRect(0, h - 10, w, 10);
  const ox = 22, ow = w - 44, top = 92;
  const open = () => { if (pointed) archPath(g, ox, top, ow, h - top); else { g.beginPath(); g.moveTo(ox, h); g.lineTo(ox, top + ow / 2); g.arc(ox + ow / 2, top + ow / 2, ow / 2, Math.PI, 0); g.lineTo(ox + ow, h); g.closePath(); } };
  open(); g.fillStyle = dark; g.fill();
  g.save(); open(); g.clip();
  const gr = g.createLinearGradient(0, top, 0, h); gr.addColorStop(0, '#3b2c1e'); gr.addColorStop(0.3, '#f3dcae'); gr.addColorStop(1, '#d9b47a'); g.fillStyle = gr; g.fillRect(ox, top - 40, ow, h);
  // Schildband im Bogen
  g.fillStyle = '#1f4f3e'; g.fillRect(ox, 150, ow, 26); g.fillStyle = '#e6c46e'; g.fillRect(ox + 40, 160, ow - 80, 5);
  // Regale mit Waren (bunt, klein)
  const goods = ['#8a3b2b', '#c9a24e', '#2f6b55', '#e8e2d4', '#5b3a6e', '#3a5f8a', '#b86b3b'];
  for (let r = 0; r < 3; r++) { const y = 196 + r * 34; g.fillStyle = '#6b4a2e'; g.fillRect(ox + 6, y + 22, ow - 12, 4); for (let x = ox + 10; x < ox + ow - 14; x += 9) { g.fillStyle = goods[(x * 7 + r * 3) % goods.length]; g.fillRect(x, y + 6 + ((x + r) % 3) * 2, 6, 16 - ((x + r) % 3) * 2); } }
  g.fillStyle = '#7a5a3a'; g.fillRect(ox + 10, h - 52, ow * 0.45, 42); // Ladentheke
  // Glastür (rechts) und Sprossen, Spiegelung
  g.fillStyle = 'rgba(40,30,20,.55)'; g.fillRect(ox + ow * 0.62, 184, 3, h - 184); g.fillRect(ox + ow * 0.62, 184, ow * 0.38, 3);
  g.fillStyle = 'rgba(255,255,255,.16)'; g.beginPath(); g.moveTo(ox + 30, h); g.lineTo(ox + 70, 184); g.lineTo(ox + 92, 184); g.lineTo(ox + 52, h); g.fill();
  g.restore();
  g.strokeStyle = dark; g.lineWidth = 6; open(); g.stroke();
}
// Gemeinsame Bausteine der arabisch-osmanischen Fassaden
function stoneBlocks(g, w, h, base, line) { g.fillStyle = base; g.fillRect(0, 0, w, h); g.strokeStyle = line; g.lineWidth = 1; for (let y = 0; y < h; y += h / 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); const off = (y / (h / 6)) % 2 ? w / 4 : 0; for (let x = off; x < w; x += w / 2) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + h / 6); g.stroke(); } } }
function star8(g, x, y, r, fill) { g.fillStyle = fill; for (const a of [0, Math.PI / 4]) { g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); g.restore(); } }
function mashrabiya(g, x, y, w, h, wood = '#7a4f2c') { g.fillStyle = wood; g.fillRect(x, y, w, h); g.fillStyle = 'rgba(30,18,8,.55)'; const s = Math.max(4, w / 7); for (let yy = y + 2; yy < y + h - 2; yy += s) for (let xx = x + 2 + ((yy / s) % 2) * s / 2; xx < x + w - 2; xx += s) { g.beginPath(); g.arc(xx + s / 4, yy + s / 3, s / 4, 0, 7); g.fill(); } g.strokeStyle = 'rgba(255,230,190,.25)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1); }
function tileBand(g, x, y, w, h, c1 = '#2f8f9d', c2 = '#f4efe3') { g.fillStyle = c1; g.fillRect(x, y, w, h); for (let xx = x + h / 2; xx < x + w; xx += h) star8(g, xx, y + h / 2, h * 0.32, c2); }
// Fenster mit Spitzbogen: helle Steinrahmung, oben Glas (nachts warm beleuchtet), unten hölzernes Gitter
function arabWindow(g, x, y, w, h, frame, pointed = true, glassTop = '#4a5a63', wood) {
  g.fillStyle = frame; archPath(g, x - 5, y - 4, w + 10, h + 4); g.fill();
  if (pointed) archPath(g, x, y, w, h); else { g.beginPath(); g.moveTo(x, y + h); g.lineTo(x, y + w / 2); g.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0); g.lineTo(x + w, y + h); g.closePath(); }
  g.save(); g.clip(); glassGrad(g, x, y - 10, w, h, glassTop, '#26323a'); g.restore();
  mashrabiya(g, x + 2, y + h * 0.5, w - 4, h * 0.5, wood);
}
const FACADES = {
  // Mekka: warmer Sandstein, Spitzbogenfenster mit Maschrabiyya, Gesims mit Sternfries
  mecca: { bay: [3.6, 3.4], tex: () => canvasTex(256, 256, (g, w, h) => {
    stoneBlocks(g, w, h, '#e3cfa8', 'rgba(150,115,70,.18)');
    arabWindow(g, 70, 46, 116, 168, '#f0e2c4', true, '#5a6b74', '#7a4f2c');
    g.fillStyle = '#cdb489'; g.fillRect(0, h - 26, w, 26); for (let x = 16; x < w; x += 32) star8(g, x, h - 13, 6, '#a8875a');
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, h - 28, w, 2);
  }) },
  // osmanisch-andalusisch (statt kühler Glastürme): Cremestein, Doppelbogenfenster, türkise Fliesenfelder
  glass: { bay: [4.2, 3.6], tex: () => canvasTex(256, 224, (g, w, h) => {
    stoneBlocks(g, w, h, '#efe2c8', 'rgba(150,120,80,.15)');
    arabWindow(g, 40, 40, 74, 140, '#f8f0de', true, '#56707a', '#8a5a32'); arabWindow(g, 142, 40, 74, 140, '#f8f0de', true, '#56707a', '#8a5a32');
    tileBand(g, 0, h - 30, w, 22); g.fillStyle = '#d9c39a'; g.fillRect(0, h - 8, w, 8);
    star8(g, w / 2, 22, 9, '#2f8f9d');
  }) },
  // Medina: weiß/creme mit Rundbogenfenstern, hölzernen Gittern und grünen Fliesen
  medina: { bay: [3.4, 3.3], tex: () => canvasTex(256, 256, (g, w, h) => {
    stoneBlocks(g, w, h, '#f4efe4', 'rgba(150,130,100,.13)');
    arabWindow(g, 74, 48, 108, 160, '#fbf8f0', false, '#5d6e76', '#86603a');
    tileBand(g, 0, h - 28, w, 20, '#3f8f6a'); g.fillStyle = '#e6dccb'; g.fillRect(0, h - 8, w, 8);
  }) },
  // Erdgeschoss: Arkaden mit beleuchteten Läden (eine Kachel = 6 m breit, ganze Höhe 8 m)
  podium: { bay: [6, 8], tex: () => canvasTex(256, 340, (g, w, h) => shopFront(g, w, h, '#d6c7a8', '#bfae8a', true), { repeat: false }) },
  medinaPodium: { bay: [6, 8], tex: () => canvasTex(256, 340, (g, w, h) => shopFront(g, w, h, '#efe9de', '#d8cdb8', false), { repeat: false }) },
  // Abschluss oben: Zinnenkranz über einem Bogenband mit türkisem Fliesenfries
  crown: { bay: [2.6, 6], tex: () => canvasTex(128, 300, (g, w, h) => {
    g.fillStyle = '#ecdcbc'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#ecdcbc'; // Zinnen (gestufte arabische Merlons) oben
    g.clearRect(0, 0, w, 0);
    g.fillStyle = '#d8c49c'; g.fillRect(0, 48, w, 6);
    for (const x of [0, w / 2]) { g.fillStyle = '#ecdcbc'; g.fillRect(x + 10, 0, w / 2 - 20, 20); g.fillRect(x + 4, 20, w / 2 - 8, 28); }
    g.fillStyle = '#8a7656'; for (const x of [0, w / 2]) { g.fillRect(x, 0, 10, 20); g.fillRect(x + w / 2 - 10, 0, 10, 20); g.fillRect(x, 0, 4, 48); }
    tileBand(g, 0, 60, w, 26);
    archPath(g, 24, 112, 80, 160); g.fillStyle = '#6e5a40'; g.fill(); archPath(g, 32, 124, 64, 148); g.save(); g.clip(); glassGrad(g, 32, 110, 64, 160, '#5a6b74', '#2a343b'); g.restore();
    g.fillStyle = '#c9a24e'; g.fillRect(0, 96, w, 5); g.fillRect(0, h - 10, w, 10);
  }, { repeat: false }) },
};

FACADES.tower = FACADES.glass; // frühere Glastürme: jetzt osmanischer Stil

// Material mit Fassade in Metern (Instanz-Skalierung aus der Matrix), Dach flach eingefärbt
// Nacht (0…1) für alle Fassaden: Fenster leuchten unregelmäßig warm, Läden hell (von der Station aus der Spieluhr gesetzt)
export const cityNight = { value: 0 };
function facadeMat(style, { roof = 0xcfc4ae, rough = 0.75 } = {}) {
  const f = FACADES[style];
  const shiny = false; // Naturstein statt Spiegelglas (Wunsch: einladender, arabisch-osmanisch)
  const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: shiny ? 0.18 : rough, metalness: shiny ? 0.45 : 0.05, envMapIntensity: shiny ? 1.3 : 1 }); // Glas spiegelt Himmel und Umgebung
  const tex = f.tex(), bay = new THREE.Vector2(...f.bay), rc = new THREE.Color(roof);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tFac = { value: tex }; sh.uniforms.uBay = { value: bay }; sh.uniforms.uRoof = { value: rc }; sh.uniforms.uNight = cityNight; sh.uniforms.uShop = { value: /odium/.test(style) ? 1 : 0 };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vFac;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vec3 sc = vec3(length(instanceMatrix[0].xyz), length(instanceMatrix[1].xyz), length(instanceMatrix[2].xyz));
        vec3 lp = position * sc;
        float u = abs(normal.x) > 0.5 ? lp.z * sign(normal.x) : -lp.x * sign(normal.z);
        vFac = vec3(u + 1000.0, lp.y, abs(normal.y));`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tFac; uniform vec2 uBay; uniform vec3 uRoof; uniform float uNight, uShop; varying vec3 vFac;')
      .replace('#include <map_fragment>', `
        vec3 facGlow = vec3(0.0);
        if (vFac.z > 0.5) diffuseColor.rgb *= uRoof;
        else {
          vec3 fc = texture2D(tFac, vec2(vFac.x / uBay.x, vFac.y / uBay.y)).rgb; diffuseColor.rgb *= fc;
          float lum = dot(fc, vec3(0.3, 0.55, 0.15));
          vec2 cellId = floor(vec2(vFac.x / uBay.x, vFac.y / uBay.y));
          vec2 grp = vec2(floor(cellId.x / 3.0), cellId.y); float lit = step(0.55, fract(sin(dot(grp, vec2(12.9898, 78.233))) * 43758.5453)) * step(0.2, fract(sin(dot(cellId, vec2(39.3468, 11.135))) * 24634.6345)); // Wohnungen in Gruppen, ca. ein Viertel hell
          if (uShop > 0.5) facGlow = fc * smoothstep(0.45, 0.75, lum) * uNight * 0.9;            // Läden: Schaufenster hell
          else facGlow = vec3(1.0, 0.72, 0.38) * (1.0 - smoothstep(0.14, 0.3, lum)) * lit * uNight * 0.85; // Fenster: manche warm hell (nur das Glas)
        }`).replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n        totalEmissiveRadiance += facGlow;');
  };
  m.customProgramCacheKey = () => 'facade-' + style;
  return m;
}

// ---------- Hochhäuser ----------
// add(x, z, w, d, h, { style, podium, ry }) – Turm mit Sockel (Läden), Schaft, Abschluss; build() erzeugt die Instanzen.
// warme Steintöne je Gebäude (Sand, Rosé, Ocker, Creme); Medina hell
const WARM = [0xffffff, 0xfff1dc, 0xffe6cc, 0xf6e2c0, 0xffeedd, 0xf2dcc4].map((c) => new THREE.Color(c));
const WHITE = [0xffffff, 0xfffaf0, 0xf8f3ea].map((c) => new THREE.Color(c));
function tintOf(style, b, col) {
  if (!['mecca', 'glass', 'tower', 'medina'].includes(style)) return col.setScalar(b.tint);
  const k = Math.abs(Math.floor(b.x * 7.31 + b.z * 3.17)) % 6, pal = style === 'medina' ? WHITE : WARM;
  return col.copy(pal[k % pal.length]).multiplyScalar(Math.min(1, 0.92 + (b.tint - 0.9) * 0.6));
}
export function createTowers(world, { podiumStyle = 'podium' } = {}) {
  const L = {}; // Stil → [Matrizen, Farben]
  const push = (style, x, y, z, w, h, d, ry, tint) => {
    (L[style] ||= []).push({ x, y, z, w, h, d, ry, tint });
  };
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const foot = []; // Grundrisse für die Karte
  // Schmuck für attraktivere Türme: Zierbänder/Eckpfeiler (Kasten), Spitzen (Zylinder), Glaspyramiden, Lichtkränze (leuchten nachts)
  const X = { band: [], spire: [], pyr: [], ring: [] };
  let cur = null, topPart = false; // aktueller Grundriss; Teile der Spitze (entfallen bei Türmen mit Aussichtsplattform)
  const deco = (kind, x, y, z, w, h, d, ry) => X[kind].push({ x, y, z, w, h, d, ry, f: cur, top: topPart });
  function decorate(x, z, w, d, base, top, ry, hv, glassy) {
    const H = top - base; if (H < 40) return;
    const c = Math.cos(ry), s2 = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * s2, z - lx * s2 + lz * c];
    for (let y = base + 36; y < top - 10; y += hv > 0.5 ? 36 : 48) deco('band', x, y, z, w + 0.5, 0.9, d + 0.5, ry); // umlaufende Zierbänder
    if (glassy || hv > 0.6) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = at(sx * (w / 2), sz * (d / 2)); deco('band', px, base, pz, 1.1, H, 1.1, ry); } // Eckpfeiler
    deco('ring', x, top - 1.2, z, w + 0.7, 1.2, d + 0.7, ry); // Lichtkranz oben
  }
  // Höhe des Aufsatzes über der Krone (für Landen/Kollision): Stufe 6 m, Pyramide, Stufen 10 m
  const crownExtra = (hv, w, d) => { const m = Math.min(w, d); return hv < 0.3 ? 2 + m * 0.45 + 5 : hv < 0.62 ? m * 0.42 + 5 : 10 + m * 0.3 + 5; };
  function crownOf(x, z, w, d, top, ry, hv) {
    topPart = true; try { crownParts(x, z, w, d, top, ry, hv); } finally { topPart = false; }
  }
  function crownParts(x, z, w, d, top, ry, hv) { // osmanische Abschlüsse: Kuppeln mit goldener Spitze, Eckkuppeln, Stufen
    const m = Math.min(w, d), c = Math.cos(ry), s2 = Math.sin(ry), at = (lx, lz) => [x + lx * c + lz * s2, z - lx * s2 + lz * c];
    if (hv < 0.3) { deco('band', x, top, z, w * 0.75, 2, d * 0.75, ry); deco('pyr', x, top + 2, z, m * 0.62, m * 0.45, m * 0.62, ry); deco('spire', x, top + 2 + m * 0.45, z, 0.35, 5, 0.35, 0); }
    else if (hv < 0.62) { deco('pyr', x, top, z, m * 0.55, m * 0.42, m * 0.55, ry); deco('spire', x, top + m * 0.42, z, 0.35, 5, 0.35, 0);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const [px, pz] = at(sx * w * 0.38, sz * d * 0.38); deco('band', px, top, pz, m * 0.16, 2.2, m * 0.16, ry); deco('pyr', px, top + 2.2, pz, m * 0.16, m * 0.13, m * 0.16, ry); } }
    else { deco('band', x, top, z, w * 0.8, 5, d * 0.8, ry); deco('band', x, top + 5, z, w * 0.55, 5, d * 0.55, ry); deco('pyr', x, top + 10, z, m * 0.45, m * 0.3, m * 0.45, ry); deco('spire', x, top + 10 + m * 0.3, z, 0.35, 5, 0.35, 0); }
  }

  return {
    footprints: foot,
    add(x, z, w, d, h, { style = 'mecca', podium = 8, ry = 0, tint = 1, crown = true } = {}) {
      cur = { x, z, w, d, ry, h }; foot.push(cur);
      if (podium) push(podiumStyle, x, 0, z, w, podium, d, ry, 1);
      const inset = Math.min(4, Math.min(w, d) * 0.12), base = podium || 0;
      const bw = w - inset * 2, bd = d - inset * 2, hv = Math.abs(Math.sin(x * 12.9898 + z * 78.233)) % 1; // feste Variante je Ort
      // hohe Türme bekommen manchmal die moderne Glasfassade (Abwechslung im Stadtbild)
      if (h > 110 && hv > 0.55 && style !== 'medina') style = 'tower';
      const glassy = style === 'glass' || style === 'tower';
      if (h > 100 && hv > 0.35) { // Rücksprung: oberer Teil schmaler (wie bei echten Hochhäusern)
        const hs = base + (h - base) * (0.5 + hv * 0.25), k = 0.62 + hv * 0.15;
        push(style, x, base, z, bw, hs - base, bd, ry, tint);
        push(style, x, hs, z, bw * k, h - hs, bd * k, ry, tint);
        deco('band', x, hs, z, bw + 0.6, 1.4, bd + 0.6, ry); decorate(x, z, bw, bd, base, hs, ry, hv, glassy); decorate(x, z, bw * k, bd * k, hs, h, ry, hv, glassy);
        cur.roof = { w: bw * k, d: bd * k, y: h, low: { w: bw, d: bd, y: hs } };
        if (crown) { push('crown', x, h, z, bw * k * 0.7, 6, bd * k * 0.7, ry, 1); cur.crown = { w: bw * k * 0.7, d: bd * k * 0.7, top: h + 6 + (h > 60 ? crownExtra(hv, bw * k * 0.7, bd * k * 0.7) : 0) }; if (h > 60) crownOf(x, z, bw * k * 0.7, bd * k * 0.7, h + 6, ry, hv); }
      } else {
        push(style, x, base, z, bw, h - base, bd, ry, tint);
        decorate(x, z, bw, bd, base, h, ry, hv, glassy);
        cur.roof = { w: bw, d: bd, y: h };
        if (crown && h > 30) { push('crown', x, h, z, bw * 0.7, 6, bd * 0.7, ry, 1); cur.crown = { w: bw * 0.7, d: bd * 0.7, top: h + 6 + (h > 60 ? crownExtra(hv, bw * 0.7, bd * 0.7) : 0) }; if (h > 60) crownOf(x, z, bw * 0.7, bd * 0.7, h + 6, ry, hv); }
      }
    },
    build() {
      const meshes = [];
      for (const [style, list] of Object.entries(L)) {
        const im = new THREE.InstancedMesh(box, facadeMat(style, { roof: style === 'crown' ? 0xc9a24e : 0xcfc4ae, rough: style === 'glass' ? 0.35 : 0.8 }), list.length);
        const col = new THREE.Color();
        list.forEach((b, i) => { dm.position.set(b.x, b.y, b.z); dm.rotation.set(0, b.ry, 0); dm.scale.set(b.w, b.h, b.d); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); im.setColorAt(i, tintOf(style, b, col)); });
        im.castShadow = false; im.receiveShadow = true; world.add(im); meshes.push(im);
      }
      // Schmuck: Gold/Stein-Bänder, goldene Spitzen, Glaspyramiden, Lichtkränze (nachts warm leuchtend)
      const night = (m, k) => { m.onBeforeCompile = (sh) => { sh.uniforms.uNight = cityNight; sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uNight;').replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0, 0.78, 0.45) * uNight * ${k.toFixed(2)};`); }; m.customProgramCacheKey = () => 'deco' + k; return m; };
      const G = { band: box, spire: new THREE.CylinderGeometry(0.15, 0.5, 1, 8).translate(0, 0.5, 0), pyr: new THREE.SphereGeometry(0.5, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 2, 1) /* Kuppel */, ring: box };
      const MT = { band: night(new THREE.MeshStandardMaterial({ color: 0xd8c39a, roughness: 0.5, metalness: 0.3 }), 0.12), spire: night(new THREE.MeshStandardMaterial({ color: 0xd4af37, roughness: 0.3, metalness: 0.9 }), 0.5),
        pyr: night(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.35 }), 0.08), ring: night(new THREE.MeshStandardMaterial({ color: 0xf0d79a, roughness: 0.4, metalness: 0.4 }), 0.9) };
      const DOME = [0x4aa59a, 0xd4af37, 0xefe4cc, 0x3f8f7a].map((c) => new THREE.Color(c));
      for (const [k, list] of Object.entries(X)) {
        if (!list.length) continue;
        const keep = list.filter((b) => !(b.top && b.f?.deck)); if (!keep.length) continue;
        const im = new THREE.InstancedMesh(G[k], MT[k], keep.length);
        keep.forEach((b, i) => { dm.position.set(b.x, b.y, b.z); dm.rotation.set(0, b.ry, 0); dm.scale.set(b.w, b.h, b.d); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix);
          if (k === 'pyr') im.setColorAt(i, DOME[Math.abs(Math.floor((b.f?.x || 0) * 1.7 + (b.f?.z || 0) * 2.3)) % DOME.length]); }); // Kuppelfarbe je Turm: Türkis, Gold, Creme, Grün
        im.receiveShadow = true; world.add(im); meshes.push(im);
      }
      return meshes;
    },
  };
}

// ---------- Abraj al-Bait (Uhrturm-Komplex südlich der Masjid al-Haram) ----------
// Echte Maße vereinfacht: Uhrturm ca. 601 m mit Spitze, Zifferblätter ca. 43 m Durchmesser, Sockelbau mit sechs Hoteltürmen.
// Die Uhr schaut nach Norden (−z, zur Haram) und zu den Seiten. sky für die Uhrzeit.
export function abrajAlBait(world, towers, { x, z, w = 210, d = 150, sky }) {
  const P = 60; // Sockelhöhe
  towers.add(x, z, w, d, P, { style: 'mecca', podium: 8, crown: false });
  // sechs Hoteltürme auf dem Sockel (um den Uhrturm)
  for (const [dx, dz, hh, ww] of [[-75, -40, 230, 34], [75, -40, 240, 34], [-75, 30, 250, 38], [75, 30, 260, 38], [-30, 50, 210, 32], [30, 50, 220, 32]]) towers.add(x + dx, z + dz, ww, ww, hh, { style: 'mecca', podium: 0 });
  const tz = z - d / 2 + 30; // Uhrturm an der Nordseite des Sockels
  towers.add(x, tz, 46, 46, 400, { style: 'mecca', podium: 0, crown: false });
  const g = new THREE.Group(); g.position.set(x, 0, tz); world.add(g);
  const stone = new THREE.MeshStandardMaterial({ color: 0xe4d8c0, roughness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3, emissive: 0x5a3e10, emissiveIntensity: 0.35 });
  const face = new THREE.MeshStandardMaterial({ color: 0xf6f2e8, roughness: 0.4, emissive: 0xffffff, emissiveIntensity: 0.15 });
  const green = new THREE.MeshStandardMaterial({ color: 0x1f6b45, roughness: 0.5, emissive: 0x2bbf6a, emissiveIntensity: 0.25 });
  const add = (geo, m, y, px = 0, pz = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(px, y, pz); g.add(o); return o; };
  add(new THREE.BoxGeometry(56, 58, 56), stone, 429); // Uhrgehäuse
  const hands = [];
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, f = new THREE.Group(); f.position.set(Math.sin(a) * 28.3, 429, Math.cos(a) * 28.3); f.rotation.y = a; g.add(f);
    f.add(new THREE.Mesh(new THREE.CircleGeometry(21.5, 48), face));
    const ring = new THREE.Mesh(new THREE.RingGeometry(20, 21.5, 48), green); ring.position.z = 0.05; f.add(ring);
    for (let i = 0; i < 12; i++) { const t = new THREE.Mesh(new THREE.BoxGeometry(1.2, i % 3 ? 2.5 : 4.5, 0.2), green); const b = i / 12 * Math.PI * 2; t.position.set(Math.sin(b) * 18, Math.cos(b) * 18, 0.1); t.rotation.z = -b; f.add(t); }
    const hr = new THREE.Mesh(new THREE.BoxGeometry(1.6, 11, 0.3).translate(0, 5, 0), gold); hr.position.z = 0.3; f.add(hr);
    const mn = new THREE.Mesh(new THREE.BoxGeometry(1, 16, 0.3).translate(0, 7.5, 0), gold); mn.position.z = 0.4; f.add(mn);
    hands.push([hr, mn]);
  }
  add(new THREE.BoxGeometry(50, 30, 50), stone, 473);            // Aufsatz
  add(new THREE.CylinderGeometry(18, 25, 22, 8), stone, 499);   // achteckiger Übergang
  add(new THREE.SphereGeometry(16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold, 510); // goldene Kuppel
  add(new THREE.CylinderGeometry(1.5, 5, 60, 8), gold, 548);     // Spitze
  add(new THREE.SphereGeometry(3, 12, 8), gold, 580);
  const cres = add(new THREE.TorusGeometry(8, 1.8, 8, 28, Math.PI * 1.45), gold, 592); cres.rotation.z = Math.PI * 0.77;
  return {
    update(night = 0) {
      face.emissiveIntensity = 0.15 + night * 1.4; green.emissiveIntensity = 0.25 + night * 1.6;
      const hrs = ((sky?.hour ?? 12) % 12 + 12) % 12, min = (hrs % 1) * 60;
      for (const [hr, mn] of hands) { hr.rotation.z = -hrs / 12 * Math.PI * 2; mn.rotation.z = -min / 60 * Math.PI * 2; }
    },
  };
}

// ---------- Schirme (Masjid an-Nabawi): Mast + quadratische, nach oben geöffnete Membran ----------
export function umbrellas(world, list, { span = 12, height = 14 } = {}) {
  const memb = new THREE.ConeGeometry(span, 4, 4, 1, true); memb.rotateX(Math.PI); memb.rotateY(Math.PI / 4); memb.translate(0, height, 0);
  const pole = new THREE.CylinderGeometry(0.35, 0.45, height, 10); pole.translate(0, height / 2, 0);
  const mk = (geo, mat) => { const im = new THREE.InstancedMesh(geo, mat, list.length); list.forEach(([x, z], i) => { dm.position.set(x, 0, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); }); world.add(im); return im; };
  const m = mk(memb, new THREE.MeshStandardMaterial({ color: 0xfbf9f3, roughness: 0.8, side: THREE.DoubleSide, emissive: 0xfff6e6, emissiveIntensity: 0.42 })); // helle Membran, auch von unten (Licht scheint durch) m.receiveShadow = true; m.castShadow = true;
  mk(pole, new THREE.MeshStandardMaterial({ color: 0xe9e4d8, roughness: 0.5, metalness: 0.2 }));
}

// ---------- begehbare Fläche: Vereinigung von Rechtecken ----------
export function walkable(rects) {
  return { type: 'fn', fn(p, r) {
    for (const q of rects) if (p.x >= q.x0 + r && p.x <= q.x1 - r && p.z >= q.z0 + r && p.z <= q.z1 - r) return;
    let bx = p.x, bz = p.z, bd = 1e9;
    for (const q of rects) { const cx = Math.min(q.x1 - r, Math.max(q.x0 + r, p.x)), cz = Math.min(q.z1 - r, Math.max(q.z0 + r, p.z)); const d = (cx - p.x) ** 2 + (cz - p.z) ** 2; if (d < bd) { bd = d; bx = cx; bz = cz; } }
    p.x = bx; p.z = bz;
  } };
}
export const inRects = (rects, x, z, m = 0) => rects.some((q) => x >= q.x0 + m && x <= q.x1 - m && z >= q.z0 + m && z <= q.z1 - m);

// ---------- Fahrbahn + Verkehr ----------
// Straße entlang x bei z0…z0+20 (zwei Spuren je Richtung), Zebrastreifen bei crossX (Breite crossW), Ampel.
// Autos (erfundene, schlichte Formen, keine Marken) und Busse fahren im Kreis, halten an der roten Ampel und bremsen
// für jede Person auf der Fahrbahn vor ihnen. people() → [{x, z}] (Spieler, Mitspieler, Fußgänger).
export function createTraffic(world, { z0, x0 = -420, x1 = 420, crossX, crossW = 30, mobile = false, taxis = 0.45, people = () => [] }) {
  const W = 20;
  // Fahrbahn, Markierungen, Bordsteine
  const asphalt = new THREE.MeshStandardMaterial({ color: 0x55565a, roughness: 0.95 });
  const road = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, W).rotateX(-Math.PI / 2), asphalt); road.position.set((x0 + x1) / 2, 0.04, z0 + W / 2); road.receiveShadow = true; world.add(road);
  const white = new THREE.MeshBasicMaterial({ color: 0xeeeeea }), yellow = new THREE.MeshBasicMaterial({ color: 0xe9c046 });
  const dash = new THREE.PlaneGeometry(3, 0.18).rotateX(-Math.PI / 2), nd = Math.floor((x1 - x0) / 9);
  for (const [lz, mat, cont] of [[z0 + 5, white, false], [z0 + 15, white, false], [z0 + 9.85, yellow, true], [z0 + 10.15, yellow, true]]) {
    if (cont) { const l = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, 0.15).rotateX(-Math.PI / 2), mat); l.position.set((x0 + x1) / 2, 0.05, lz); world.add(l); continue; }
    const im = new THREE.InstancedMesh(dash, mat, nd); for (let i = 0; i < nd; i++) { dm.position.set(x0 + i * 9 + 1.5, 0.05, lz); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); } world.add(im);
  }
  const zebra = new THREE.InstancedMesh(new THREE.PlaneGeometry(crossW - 4, 0.6).rotateX(-Math.PI / 2), white, 16);
  for (let i = 0; i < 16; i++) { dm.position.set(crossX, 0.055, z0 + 0.8 + i * 1.2); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); zebra.setMatrixAt(i, dm.matrix); } world.add(zebra);
  const curb = new THREE.MeshStandardMaterial({ color: 0xd7d2c6, roughness: 0.8 });
  for (const cz of [z0 - 0.15, z0 + W + 0.15]) { const c = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 0.15, 0.3), curb); c.position.set((x0 + x1) / 2, 0.075, cz); world.add(c); }
  // Ampeln an den vier Ecken des Überwegs
  const poleM = new THREE.MeshStandardMaterial({ color: 0x2e3236, metalness: 0.5, roughness: 0.5 });
  const lampM = { r: new THREE.MeshStandardMaterial({ color: 0x3a0d0d, emissive: 0xff2a1a, emissiveIntensity: 0 }), y: new THREE.MeshStandardMaterial({ color: 0x3a300d, emissive: 0xffb01a, emissiveIntensity: 0 }), g: new THREE.MeshStandardMaterial({ color: 0x0d3a1a, emissive: 0x2aff6a, emissiveIntensity: 0 }) };
  const pedM = { r: new THREE.MeshStandardMaterial({ color: 0x3a0d0d, emissive: 0xff2a1a, emissiveIntensity: 0 }), g: new THREE.MeshStandardMaterial({ color: 0x0d3a1a, emissive: 0x2aff6a, emissiveIntensity: 0 }) };
  for (const [sx, sz, face] of [[-1, -1, 1], [1, -1, 1], [-1, 1, -1], [1, 1, -1]]) {
    const g = new THREE.Group(); g.position.set(crossX + sx * (crossW / 2 + 0.6), 0, sz < 0 ? z0 - 0.8 : z0 + W + 0.8); world.add(g);
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.6, 6), poleM); p.position.y = 1.8; g.add(p);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 1.05, 0.3), poleM); head.position.set(0, 3.3, 0); g.add(head);
    ['r', 'y', 'g'].forEach((k, i) => { const l = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), lampM[k]); l.position.set(sx * 0.17, 3.62 - i * 0.32, 0); g.add(l); });
    // Fußgängerampel (zeigt über die Straße)
    const ph = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.6, 0.26), poleM); ph.position.set(0, 2.2, 0); g.add(ph);
    ['r', 'g'].forEach((k, i) => { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.22), pedM[k]); l.position.set(0, 2.34 - i * 0.28, face * 0.135); l.rotation.y = face > 0 ? 0 : Math.PI; g.add(l); });
  }
  // Fahrzeuge: echte Modelle (Autos, ein Motorrad, Busse) mit drehenden Rädern. Jedes Fahrzeug kann angehalten (hold)
  // und ausgeliehen werden (take → aus dem Verkehr genommen, giveBack → fährt wieder mit). Erfundene Modelle ohne Marken.
  void taxis;
  const n = mobile ? 9 : 15;
  const lanes = [{ z: z0 + 2.5, dir: 1 }, { z: z0 + 7.5, dir: 1 }, { z: z0 + 12.5, dir: -1 }, { z: z0 + 17.5, dir: -1 }];
  const all = [];
  const add = (kind, ln, x) => { const veh = makeVehicle(world, kind, { driver: true }); const sp = specOf(kind); all.push({ kind, veh, ln, x, v: 7, vmax: Math.min(sp.vmax, 9 + Math.random() * 4), len: sp.len + 0.3, held: false, borrowed: false }); };
  for (let i = 0; i < n; i++) add(CAR_KINDS[i % CAR_KINDS.length], lanes[i % 4], x0 + Math.random() * (x1 - x0));
  add('motorbike', lanes[0], x0 + (x1 - x0) * 0.6);
  add('bus', lanes[1], x0 + (x1 - x0) * 0.25); add('bus', lanes[3], x0 + (x1 - x0) * 0.75);
  let t = 0, carGreen = true, phase = '';
  const stopLine = (vh) => (vh.ln.dir > 0 ? crossX - crossW / 2 - 2 : crossX + crossW / 2 + 2);
  const place = (vh) => { const g = vh.veh.root; g.position.set(vh.x, 0, vh.ln.z); g.rotation.y = vh.ln.dir > 0 ? Math.PI / 2 : -Math.PI / 2; };
  return {
    get pedGreen() { return !carGreen; },
    get vehicles() { return all.filter((v) => !v.borrowed); },
    hold(vh, on = true) { vh.held = on; },                             // anhalten (Fahrer fragen)
    take(vh) { vh.borrowed = true; vh.held = false; if (vh.veh.driver) vh.veh.driver.visible = false; return vh.veh; },  // ausleihen: nicht mehr im Verkehr, Fahrer steigt aus
    // zurückgeben: fährt wieder auf seiner Spur mit (an der Stelle, die der Rückgabe am nächsten liegt)
    giveBack(vh, x) { vh.borrowed = false; vh.held = false; vh.v = 0; if (vh.veh.driver) vh.veh.driver.visible = true; vh.x = Math.min(x1 - 5, Math.max(x0 + 5, x)); place(vh); },
    update(dt) {
      t += dt; const c = t % 28; // 0–15 Autos grün, 15–18 gelb, 18–28 Fußgänger grün
      const ph = c < 15 ? 'g' : c < 18 ? 'y' : 'r';
      if (ph !== phase) { phase = ph; carGreen = ph === 'g'; for (const k of ['r', 'y', 'g']) lampM[k].emissiveIntensity = k === ph ? 3 : 0; pedM.r.emissiveIntensity = ph === 'r' ? 0 : 3; pedM.g.emissiveIntensity = ph === 'r' ? 3 : 0; }
      const ppl = people();
      for (const vh of all) {
        if (vh.borrowed) continue;
        const d = vh.ln.dir, front = vh.x + d * vh.len / 2;
        let gap = 1e9;
        for (const o of all) if (o !== vh && !o.borrowed && o.ln === vh.ln) { let dx = (o.x - vh.x) * d; if (dx < 0) dx += x1 - x0; gap = Math.min(gap, dx - (o.len + vh.len) / 2); }
        // rote/gelbe Ampel: vor der Haltelinie stehen bleiben (wenn noch davor)
        const toLine = (stopLine(vh) - front) * d;
        if (!carGreen && toLine > -0.5) gap = Math.min(gap, toLine);
        // Menschen auf der Fahrbahn vor dem Fahrzeug → bremsen (niemand wird angefahren)
        for (const p of ppl) { const dx = (p.x - front) * d; if (dx > -1 && dx < 14 && Math.abs(p.z - vh.ln.z) < 2.2) gap = Math.min(gap, dx - 2); }
        const want = vh.held || gap < 2 ? 0 : Math.min(vh.vmax, (gap - 2) * 0.9);
        vh.v += (want - vh.v) * Math.min(1, dt * (want < vh.v ? (vh.held ? 2.5 : 4) : 1.2));
        vh.x += d * vh.v * dt;
        if (vh.x > x1) vh.x -= x1 - x0; if (vh.x < x0) vh.x += x1 - x0;
        place(vh); vh.veh.roll(vh.v, dt);
      }
    },
  };
}

// Sitzbänke und Poller (Instanzen)
export function benches(world, list) {
  const g = mergeGeometries([new THREE.BoxGeometry(2, 0.08, 0.5).translate(0, 0.45, 0), new THREE.BoxGeometry(2, 0.45, 0.08).translate(0, 0.75, -0.22), new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(-0.9, 0.22, 0), new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(0.9, 0.22, 0)]);
  const im = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0x7a5a3a, roughness: 0.7 }), list.length);
  list.forEach(([x, z, ry], i) => { dm.position.set(x, 0, z); dm.rotation.set(0, ry, 0); dm.scale.setScalar(1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
  im.castShadow = true; world.add(im);
}
export function bollards(world, list) {
  const im = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.14, 0.9, 8).translate(0, 0.45, 0), new THREE.MeshStandardMaterial({ color: 0x9a9da2, metalness: 0.6, roughness: 0.4 }), list.length);
  list.forEach(([x, z], i) => { dm.position.set(x, 0, z); dm.rotation.set(0, 0, 0); dm.scale.setScalar(1); dm.updateMatrix(); im.setMatrixAt(i, dm.matrix); });
  world.add(im);
}
