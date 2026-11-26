import * as THREE from 'three';

// Bunte islamlernen.at-Lackierung für Fahrzeuge (Helikopter, Sportwagen am Taxistand) – gleiche Farben wie der Ballon.
// Die Lacktexturen der Modelle sind Atlanten → das Muster wird im Fahrzeugraum projiziert (Seiten: Länge × Höhe,
// oben/vorne/hinten: nur Farbbahnen ohne Schrift). Nur Lackpixel (Heli: blau, Auto: rot) werden ersetzt; Fenster,
// Lichter, Gummis, Nähte bleiben. Die Helligkeit des Originallacks (Schatten, Wölbungen) wird übernommen.
let tex = null;

function draw(c) {
  const W = c.width, H = c.height, g = c.getContext('2d');
  const cols = ['#ffd45c', '#4fd1c5', '#ff8a6b', '#8fd694', '#6ec3ff', '#ffb648', '#ff7aa8', '#fffaf0'];
  // schräge Farbbahnen
  const N = 18, sw = (W * 1.4) / N;
  for (let i = -2; i < N + 2; i++) {
    g.fillStyle = cols[(i + 16) % cols.length]; g.beginPath();
    g.moveTo(i * sw, 0); g.lineTo(i * sw + sw + 1, 0); g.lineTo(i * sw + sw + 1 - H * 0.6, H); g.lineTo(i * sw - H * 0.6, H); g.fill();
  }
  const wave = (y0, amp, ph, color, thick, alpha) => {
    g.globalAlpha = alpha; g.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = y0 + Math.sin((x / W) * Math.PI * 6 + ph) * amp; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineTo(W, y0 + thick + amp); g.lineTo(0, y0 + thick + amp); g.closePath(); g.fillStyle = color; g.fill(); g.globalAlpha = 1;
  };
  wave(H * 0.05, H * 0.04, 0.4, '#ffffff', H * 0.06, 0.5);
  wave(H * 0.8, H * 0.04, 1.9, '#3fb6a8', H * 0.08, 0.45);
  // helles Band mit Schriftzug (Mitte der Seite)
  const by = H * 0.5, bh = H * 0.15; // schmales Band, die Farben bleiben vorherrschend (Canvas: oben = Fahrzeugboden)
  g.fillStyle = '#fffaf0'; g.fillRect(0, by, W, bh);
  g.fillStyle = '#e6c46e'; g.fillRect(0, by - H * 0.02, W, H * 0.02); g.fillRect(0, by + bh, W, H * 0.02);
  const fs = Math.round(bh * 0.82); g.font = `600 ${fs}px Figtree, "Helvetica Neue", Arial, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'left';
  const word = 'islamlernen', dom = '.at', w1 = g.measureText(word).width, w2 = g.measureText(dom).width, x0 = W / 2 - (w1 + w2) / 2;
  g.fillStyle = '#14514a'; g.fillText(word, x0, by + bh / 2 + fs * 0.04);
  g.fillStyle = '#e09a1a'; g.fillText(dom, x0 + w1, by + bh / 2 + fs * 0.04);
  for (const sx of [x0 - fs * 0.6, x0 + w1 + w2 + fs * 0.6]) {
    g.fillStyle = '#e09a1a';
    for (const a of [0, Math.PI / 4]) { g.save(); g.translate(sx, by + bh / 2); g.rotate(a); const r = fs * 0.2; g.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); g.restore(); }
  }
}
export function liveryTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas'); c.width = 2048; c.height = 512; draw(c);
  tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  document.fonts?.load?.('600 100px Figtree').then(() => { draw(c); tex.needsUpdate = true; }).catch(() => {});
  return tex;
}

// Lackpixel erkennen: Rückgabe 0…1 (Maske) und Helligkeit des Originals
const MASK = {
  // Heli: blauer und hellgrauer Lack (weiße Zierstreifen und dunkle Teile bleiben)
  blue: 'float mb = smoothstep(0.18, 0.32, c.b - max(c.r, c.g * 0.7)); float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b));'
    + 'float mg = smoothstep(0.45, 0.52, c.g) * (1.0 - smoothstep(0.66, 0.74, c.g)) * (1.0 - smoothstep(0.06, 0.12, sat));'
    + 'float mk = max(mb, mg); float sh = mix(clamp(c.g / 0.56, 0.6, 1.15), clamp(c.b / 0.78, 0.55, 1.15), mb);',
  // Bus: heller (weißer/hellgrauer) Lack, Fenster/Reifen (dunkel) und Lichter (farbig) bleiben
  white: 'float sat = max(c.r, max(c.g, c.b)) - min(c.r, min(c.g, c.b)); float mk = smoothstep(0.2, 0.32, c.g) * (1.0 - smoothstep(0.08, 0.16, sat)); float sh = clamp(0.55 + c.g * 0.6, 0.6, 1.15);',
  red: 'float mk = smoothstep(0.08, 0.2, c.r - 1.8 * max(c.g, c.b)); float sh = clamp(pow(c.r / 0.85, 0.8), 0.35, 1.15);',
};

// mesh: Lackteil, toVeh: Matrix Mesh → Fahrzeugraum (Front +z, Boden y = 0), box: Größe des Fahrzeugs im Fahrzeugraum
export function applyLivery(mesh, toVeh, box, paint, { vOff = 0 } = {}) { // vOff: Schriftband höher/tiefer (Anteil der Höhe)
  const mat = mesh.material.clone();
  const uniforms = { uLiv: { value: liveryTexture() }, uToVeh: { value: toVeh.clone() }, uMin: { value: box.min.clone() }, uSize: { value: box.getSize(new THREE.Vector3()) }, uVOff: { value: vOff } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uToVeh; varying vec3 vVeh; varying vec3 vVehN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvVeh = (uToVeh * vec4(position, 1.0)).xyz; vVehN = normalize(mat3(uToVeh) * normal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D uLiv; uniform vec3 uMin; uniform vec3 uSize; uniform float uVOff; varying vec3 vVeh; varying vec3 vVehN;')
      .replace('#include <map_fragment>', `#include <map_fragment>
      {
        vec3 c = diffuseColor.rgb; ${MASK[paint]}
        vec3 q = (vVeh - uMin) / uSize; // 0…1 in Breite (x), Höhe (y), Länge (z)
        vec3 n = normalize(vVehN);
        // Seiten: Schrift von beiden Seiten lesbar (rechts von hinten nach vorn gespiegelt)
        float u = n.x > 0.0 ? 1.0 - q.z : q.z;
        vec3 side = texture2D(uLiv, vec2(u, clamp(q.y + uVOff, 0.0, 1.0))).rgb;
        vec3 top = texture2D(uLiv, vec2(q.z, 0.86 + 0.1 * q.x)).rgb; // oben/vorne/hinten: nur Farbbahnen
        vec3 liv = mix(top, side, smoothstep(0.35, 0.6, abs(n.x)));
        diffuseColor.rgb = mix(c, liv * sh, mk);
      }`);
  };
  mat.customProgramCacheKey = () => 'livery-' + paint;
  mesh.material = mat;
}
