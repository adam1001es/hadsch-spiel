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

// Kaaba-Tür: zwei Flügel mit Zierfeldern und Rosetten. Rückgabe { map, bump } – bump erzeugt das Relief.
export function goldDoor() {
  const draw = (g, w, h, hi, lo, bg) => {
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.lineCap = 'round';
    const leaf = (x0, lw) => {
      g.strokeStyle = lo; g.lineWidth = 6; g.strokeRect(x0 + 10, 12, lw - 20, h - 24);
      g.strokeStyle = hi; g.lineWidth = 3; g.strokeRect(x0 + 20, 22, lw - 40, h - 44);
      const rows = 6, ph = (h - 70) / rows;
      for (let r = 0; r < rows; r++) {
        const y = 35 + r * ph, cx = x0 + lw / 2, cy = y + ph / 2;
        g.strokeStyle = lo; g.lineWidth = 3; g.strokeRect(x0 + 32, y + 6, lw - 64, ph - 12);
        // Rosette: Kreis mit 8 Blättern
        const R = Math.min(lw - 70, ph - 20) * 0.42;
        g.strokeStyle = hi; g.lineWidth = 2.5; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          g.beginPath(); g.ellipse(cx + Math.cos(a) * R * 0.5, cy + Math.sin(a) * R * 0.5, R * 0.42, R * 0.16, a, 0, Math.PI * 2); g.stroke();
        }
        g.fillStyle = hi; g.beginPath(); g.arc(cx, cy, R * 0.16, 0, Math.PI * 2); g.fill();
      }
    };
    leaf(0, w / 2); leaf(w / 2, w / 2);
    g.strokeStyle = lo; g.lineWidth = 5; g.beginPath(); g.moveTo(w / 2, 10); g.lineTo(w / 2, h - 10); g.stroke();
  };
  const map = canvasTexture(512, 860, (g, w, h) => draw(g, w, h, '#ffe6a6', '#8a6420', '#e0b85e'), [1, 1]);
  const bump = canvasTexture(512, 860, (g, w, h) => draw(g, w, h, '#fff', '#000', '#808080'), [1, 1], false);
  return { map, bump };
}

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

// Hizam: schwarzes Band mit goldener, stilisierter Schrift im Stil des Thuluth (bewusst kein lesbarer Text),
// gegliedert in Schriftfelder mit runden Medaillons dazwischen.
// map = Farbe, metal = Maske (G = Rauheit, B = Metall): Goldfaden metallisch, Stoff matt.
export function hizam(len) {
  const H = 192, W = Math.min(4096, Math.round(len * 200));
  const draw = (g, w, h, ink, bg) => {
    const r = rng(Math.round(len * 10));
    g.fillStyle = bg; g.fillRect(0, 0, w, h);
    g.strokeStyle = ink; g.fillStyle = ink; g.lineCap = 'round'; g.lineJoin = 'round';
    g.lineWidth = 4; g.strokeRect(5, 7, w - 10, h - 14);
    g.lineWidth = 1.6; g.strokeRect(12, 14, w - 24, h - 28);
    const fields = Math.max(2, Math.round(len / 4));
    const fw = (w - 24) / fields;
    for (let f = 0; f < fields; f++) {
      const x0 = 12 + f * fw;
      // Medaillon am Feldanfang
      if (f > 0) {
        g.lineWidth = 2.4; g.beginPath(); g.arc(x0, h / 2, h * 0.3, 0, Math.PI * 2); g.stroke();
        g.lineWidth = 1.4; g.beginPath(); g.arc(x0, h / 2, h * 0.22, 0, Math.PI * 2); g.stroke();
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; g.beginPath(); g.arc(x0 + Math.cos(a) * h * 0.12, h / 2 + Math.sin(a) * h * 0.12, 3, 0, Math.PI * 2); g.fill(); }
      }
      const xs = x0 + (f > 0 ? h * 0.36 : 20), xe = x0 + fw - h * 0.36;
      const base = h * 0.66, top = h * 0.2, low = h * 0.84;
      // Grundlinie in leichten Wellen, unterbrochen zwischen „Wörtern“
      let x = xs;
      while (x < xe - 30) {
        const wl = 60 + r() * 90, end = Math.min(xe, x + wl);
        g.lineWidth = 5.5;
        g.beginPath(); g.moveTo(x, base);
        g.bezierCurveTo(x + (end - x) * 0.3, base + 6, x + (end - x) * 0.7, base - 6, end, base - 2); g.stroke();
        // hohe Senkrechte (wie Alif/Lam), leicht schräg, oben spitz
        for (let k = 0, n = 1 + (r() * 3 | 0); k < n; k++) {
          const sx = x + 8 + r() * (end - x - 16), tt = top + r() * h * 0.12;
          g.lineWidth = 5; g.beginPath(); g.moveTo(sx, base); g.quadraticCurveTo(sx - 3, (base + tt) / 2, sx + 4, tt); g.stroke();
        }
        // Bogen unter der Linie (wie Nun/Ya) oder lange Schwinge
        if (r() < 0.55) {
          const bx = x + r() * (end - x - 40);
          g.lineWidth = 4.5; g.beginPath(); g.moveTo(bx + 44, base - 4); g.bezierCurveTo(bx + 40, low + 6, bx, low + 4, bx - 6, base - 10); g.stroke();
        } else {
          const bx = x + (end - x) * 0.4;
          g.lineWidth = 3.5; g.beginPath(); g.moveTo(bx, base - 8); g.bezierCurveTo(bx + 30, base - 40, bx + 70, base - 34, bx + 96, base - 50); g.stroke();
        }
        // Schleifen und Punkte (rein dekorativ)
        if (r() < 0.6) { g.lineWidth = 3.5; g.beginPath(); g.ellipse(x + 20 + r() * 30, base - 12, 9, 7, -0.4, 0, Math.PI * 2); g.stroke(); }
        for (let k = 0, n = r() * 4 | 0; k < n; k++) {
          const dx = x + r() * (end - x), dy = r() < 0.5 ? top + 14 + r() * 20 : low - 2;
          g.save(); g.translate(dx, dy); g.rotate(0.7); g.fillRect(-3.5, -3.5, 7, 7); g.restore();
        }
        x = end + 14 + r() * 18;
      }
    }
  };
  const map = canvasTexture(W, H, (g, w, h) => draw(g, w, h, '#d6ae58', '#0b0b0c'));
  const metal = canvasTexture(W, H, (g, w, h) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    draw(c.getContext('2d'), w, h, '#fff', '#000');
    const src = c.getContext('2d').getImageData(0, 0, w, h), out = g.createImageData(w, h);
    for (let i = 0; i < src.data.length; i += 4) {
      const v = src.data[i] / 255;
      out.data[i + 1] = Math.round(255 - v * 165); // Rauheit
      out.data[i + 2] = Math.round(v * 255);       // Metall
      out.data[i + 3] = 255;
    }
    g.putImageData(out, 0, 0);
  }, [1, 1], false);
  map.wrapS = metal.wrapS = THREE.ClampToEdgeWrapping;
  return { map, metal };
}
