import * as THREE from 'three';

// Neue Hülle für den Heißluftballon (balloon.glb): helle, abstrakte Farbbahnen mit dem Schriftzug „islamlernen.at“.
// Die Textur des Modells ist ein zerstückelter Atlas → statt der UVs wird die Hülle zylindrisch um die Ballonachse
// projiziert (Winkel = u, Höhe = v). So bleibt die Schrift scharf und unverzerrt. Korb, Seile und Brenner (unter
// y = ENV0) behalten die Originaltextur; Nähte und Falten des Originals werden als Helligkeit übernommen.
const ENV0 = 3.6, ENV1 = 27; // Hülle von 3,6 m bis zur Spitze (27 m)
let tex = null, mat = null;

function draw(c) {
  const W = c.width, H = c.height, g = c.getContext('2d');
  const cols = ['#ffd45c', '#4fd1c5', '#ff8a6b', '#fffaf0', '#8fd694', '#6ec3ff', '#ffb648', '#f7f3e8'];
  const N = 16, gw = W / N;
  for (let i = 0; i < N; i++) { g.fillStyle = cols[i % cols.length]; g.fillRect(i * gw, 0, gw + 1, H); }
  // abstrakte, weiche Wellen über die Bahnen (wiederholt sich nahtlos rundherum)
  const wave = (y0, amp, ph, color, thick) => {
    g.beginPath();
    for (let x = 0; x <= W; x += 8) { const y = y0 + Math.sin((x / W) * Math.PI * 4 + ph) * amp + Math.sin((x / W) * Math.PI * 10 + ph * 2) * amp * 0.3; x ? g.lineTo(x, y) : g.moveTo(x, y); }
    g.lineTo(W, y0 + thick + amp * 2); g.lineTo(0, y0 + thick + amp * 2); g.closePath(); g.fillStyle = color; g.fill();
  };
  g.globalAlpha = 0.55; wave(H * 0.06, H * 0.04, 0, '#ffffff', H * 0.05);
  g.globalAlpha = 0.45; wave(H * 0.2, H * 0.05, 1.7, '#ff7aa8', H * 0.04);
  g.globalAlpha = 0.4; wave(H * 0.8, H * 0.05, 0.6, '#3fb6a8', H * 0.05);
  g.globalAlpha = 0.5; wave(H * 0.9, H * 0.03, 2.4, '#ffd45c', H * 0.06);
  g.globalAlpha = 1;
  // helles Band in der breitesten Höhe mit dem Schriftzug (zweimal rundherum → von überall lesbar)
  const by = H * 0.37, bh = H * 0.24;
  g.fillStyle = '#fffaf0'; g.fillRect(0, by, W, bh);
  g.fillStyle = '#e6c46e'; g.fillRect(0, by - H * 0.012, W, H * 0.012); g.fillRect(0, by + bh, W, H * 0.012);
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const fs = Math.round(bh * 0.62); g.font = `600 ${fs}px Figtree, "Helvetica Neue", Arial, sans-serif`;
  for (const cx of [W * 0.25, W * 0.75]) {
    const word = 'islamlernen', dom = '.at', w1 = g.measureText(word).width, w2 = g.measureText(dom).width, x0 = cx - (w1 + w2) / 2;
    g.textAlign = 'left';
    g.fillStyle = '#14514a'; g.fillText(word, x0, by + bh / 2);
    g.fillStyle = '#e09a1a'; g.fillText(dom, x0 + w1, by + bh / 2);
    // kleine Sterne als Schmuck links und rechts
    for (const sx of [x0 - fs * 0.6, x0 + w1 + w2 + fs * 0.6]) star(g, sx, by + bh / 2, fs * 0.22, '#e09a1a');
  }
}
function star(g, x, y, r, col) { // achtzackiger Stern aus zwei Quadraten
  g.fillStyle = col;
  for (const a of [0, Math.PI / 4]) { g.save(); g.translate(x, y); g.rotate(a); g.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 1.4); g.restore(); }
}

function skinTexture() {
  if (tex) return tex;
  const c = document.createElement('canvas'); c.width = 2048; c.height = 768;
  draw(c);
  tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping; tex.anisotropy = 8;
  // Schrift neu zeichnen, sobald die Webschrift geladen ist
  document.fonts?.load?.('600 100px Figtree').then(() => { draw(c); tex.needsUpdate = true; }).catch(() => {});
  return tex;
}

// Material des Modells einmal umbauen (alle Klone teilen es)
export function skinBalloon(root) {
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (!mat) {
      mat = o.material.clone();
      const skin = skinTexture();
      mat.onBeforeCompile = (sh) => {
        sh.uniforms.uSkin = { value: skin };
        sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObjPos = position;');
        sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vObjPos;\nuniform sampler2D uSkin;')
          .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance += skinGlow;')
          .replace('#include <map_fragment>', `#include <map_fragment>
          vec3 skinGlow = vec3(0.0);
          if (vObjPos.y > ${ENV0.toFixed(2)}) {
            float u = atan(vObjPos.x, vObjPos.z) / 6.2831853 + 0.5; // von außen gesehen lesbar (nicht gespiegelt)
            float v = clamp((vObjPos.y - ${ENV0.toFixed(2)}) / ${(ENV1 - ENV0).toFixed(2)}, 0.0, 1.0);
            vec2 uvA = vec2(u, v), uvB = vec2(fract(u + 0.5), v); // Canvas-Textur: v = 1 ist oben
            // Ableitungen ohne Sprung an der Naht (sonst feine Linie durch falsche Mipmap)
            vec2 dx = dFdx(uvA), dy = dFdy(uvA), dxB = dFdx(uvB), dyB = dFdy(uvB);
            if (abs(dx.x) + abs(dy.x) > abs(dxB.x) + abs(dyB.x)) { dx = dxB; dy = dyB; }
            vec3 skin = textureGrad(uSkin, uvA, dx, dy).rgb;
            float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            float shade = clamp(1.0 + (lum - 0.32) * 1.3, 0.62, 1.2); // Nähte und Falten des Originals bleiben sichtbar
            float blend = smoothstep(${ENV0.toFixed(2)}, ${(ENV0 + 0.6).toFixed(2)}, vObjPos.y);
            diffuseColor.rgb = mix(diffuseColor.rgb, skin * shade, blend);
            skinGlow = skin * 0.18 * blend; // Stoff leuchtet leicht durch (Sonne), damit die Farben hell bleiben
          }`);
      };
      mat.customProgramCacheKey = () => 'balloonSkin1';
    }
    o.material = mat;
  });
  return root;
}
