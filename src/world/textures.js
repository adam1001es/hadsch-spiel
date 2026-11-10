import * as THREE from 'three';

// Platzhalter-Texturen per Canvas. Später durch echte CC0-Texturen in public/assets/textures ersetzen.
function rng(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function canvasTexture(w, h, draw, repeat = [1, 1], color = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const marble = (rep) => canvasTexture(512, 512, (g, w, h) => {
  const r = rng(3);
  g.fillStyle = '#efede7'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 2600; i++) { const v = 170 + r() * 50 | 0; g.fillStyle = `rgba(${v},${v - 2},${v - 8},${r() * 0.08})`; g.fillRect(r() * w, r() * h, 2 + r() * 10, 2 + r() * 10); }
  for (let i = 0; i < 18; i++) {
    g.strokeStyle = `rgba(120,118,110,${0.05 + r() * 0.12})`; g.lineWidth = 0.5 + r() * 1.5; g.beginPath();
    let x = r() * w, y = r() * h; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 120; y += (r() - 0.3) * 80; g.lineTo(x, y); }
    g.stroke();
  }
  g.strokeStyle = 'rgba(140,132,118,.45)'; g.lineWidth = 2;
  for (let i = 0; i <= 2; i++) { g.beginPath(); g.moveTo(i * w / 2, 0); g.lineTo(i * w / 2, h); g.moveTo(0, i * h / 2); g.lineTo(w, i * h / 2); g.stroke(); }
}, rep);

export const kiswa = () => canvasTexture(1024, 1024, (g, w, h) => {
  g.fillStyle = '#0c0c0d'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,255,255,0.05)'; g.lineWidth = 2;
  for (let y = 0; y < h; y += 48) for (let x = ((y / 48) % 2) * 32; x < w; x += 64) {
    g.beginPath(); g.arc(x, y, 14, 0.2, Math.PI * 1.7); g.stroke();
    g.beginPath(); g.moveTo(x - 18, y + 10); g.quadraticCurveTo(x, y + 26, x + 20, y + 8); g.stroke();
  }
  const y0 = h * 0.26, bh = h * 0.075;
  g.fillStyle = '#141210'; g.fillRect(0, y0, w, bh);
  g.strokeStyle = '#c9a24a'; g.lineWidth = 3; g.strokeRect(-2, y0 + 4, w + 4, bh - 8);
  g.lineWidth = 2.4; // stilisierte Kalligrafie, bewusst kein echter Text
  for (let x = 10; x < w; x += 22) {
    const hh = bh * 0.55 * (0.4 + ((x * 7) % 13) / 13 * 0.6);
    g.beginPath(); g.moveTo(x, y0 + bh * 0.8); g.lineTo(x, y0 + bh * 0.8 - hh); g.stroke();
    if (x % 3 === 1) { g.beginPath(); g.moveTo(x - 8, y0 + bh * 0.72); g.quadraticCurveTo(x + 4, y0 + bh * 0.92, x + 14, y0 + bh * 0.7); g.stroke(); }
  }
  for (let i = 0; i < 4; i++) { g.strokeRect(w * (0.12 + i * 0.22), h * 0.4, w * 0.1, h * 0.07); }
});

export const gold = () => canvasTexture(256, 512, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#b8892f'); gr.addColorStop(0.5, '#f0d27a'); gr.addColorStop(1, '#9c7424');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(80,55,10,.6)'; g.lineWidth = 3;
  for (let y = 20; y < h; y += 70) g.strokeRect(20, y, w - 40, 55);
});

export function arches(rows, glow) {
  return canvasTexture(256, 128 * rows, (g, w, h) => {
    g.fillStyle = glow ? '#000' : '#d6ccb8'; g.fillRect(0, 0, w, h);
    const rh = h / rows;
    for (let r = 0; r < rows; r++) {
      const top = r * rh, aw = w * 0.6, ax = (w - aw) / 2, ay = top + rh * 0.22, ab = top + rh * 0.95;
      if (!glow) { g.fillStyle = '#c4b8a0'; g.fillRect(0, top + rh - 6, w, 6); }
      g.fillStyle = glow ? '#ffd18a' : '#4a3a28';
      g.beginPath(); g.moveTo(ax, ab); g.lineTo(ax, ay + aw / 2); g.arc(w / 2, ay + aw / 2, aw / 2, Math.PI, 0); g.lineTo(ax + aw, ab); g.closePath(); g.fill();
    }
  });
}
