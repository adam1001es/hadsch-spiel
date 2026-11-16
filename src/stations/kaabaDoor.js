import * as THREE from 'three';
import { buildKaaba, KAABA } from '../world/kaaba.js';
import { buildHaram } from '../world/haram.js';
import { createCrowd } from '../world/crowd.js';
import { createFigure } from '../core/player.js';
import { peopleModels } from '../world/crowd.js';
import { matafRadius } from '../world/haram.js';

// Kurze Szene an der Kaaba-Tür: Treppe steht an der Tür, die beiden Türflügel öffnen sich, die Figur geht hinein (dir 'in')
// bzw. kommt heraus und die Tür schließt sich wieder (dir 'out'). Danach then(). Antippen überspringt.
export function create(ctx, { dir = 'in', then } = {}) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(21); sky.state.artificial = 1; sky.state.shadowSize = 40;
  const { w, d } = KAABA;
  const { door, sitara } = buildKaaba(world);
  const { glow } = buildHaram(world);
  ui.el.stick.classList.add('off');
  ui.el.day.textContent = 'Belohnung';
  ui.el.title.textContent = dir === 'in' ? 'Die Tür der Kaaba öffnet sich' : 'Zurück hinaus';

  // Türflügel (Drehpunkt an der Außenkante), Licht dahinter
  const DX = door.position.x, DY = door.position.y, DZ = door.position.z, BOT = DY - 2;
  door.visible = false;
  // Sitara (Vorhang) wird zur Öffnung hochgerafft: unteren Teil ausblenden, damit die Türflügel sichtbar aufgehen
  sitara.scale.y = 0.42; sitara.position.y += 3.3 * (1464 / 808) * 0.29;
  const mats = door.material;
  const leaves = [-1, 1].map((s) => {
    const piv = new THREE.Group(); piv.position.set(DX + s * 1.2, DY, DZ); world.add(piv);
    const g = new THREE.BoxGeometry(1.2, 4, 0.18); g.translate(-s * 0.6, 0, 0);
    const m = new THREE.Mesh(g, mats); piv.add(m); return { piv, s };
  });
  // Blick in den beleuchteten Innenraum (grüner Vorhang oben, Marmor unten, Holzsäule) – liegt VOR der Kiswa-Fläche,
  // damit die Öffnung nicht schwarz bleibt; wird beim Öffnen eingeblendet
  const inTex = (() => {
    const c = document.createElement('canvas'); c.width = 256; c.height = 426; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 426); gr.addColorStop(0, '#3f6e4c'); gr.addColorStop(0.42, '#6f8f66'); gr.addColorStop(0.46, '#c9a24e'); gr.addColorStop(0.5, '#efe6d2'); gr.addColorStop(1, '#fbf4e4');
    g.fillStyle = gr; g.fillRect(0, 0, 256, 426);
    g.fillStyle = 'rgba(255,214,150,0.55)'; for (const x of [70, 190]) { g.beginPath(); g.arc(x, 150, 9, 0, 7); g.fill(); g.fillRect(x - 0.5, 0, 1, 141); } // Lampen
    g.fillStyle = '#4a2216'; g.fillRect(118, 0, 20, 426); g.fillStyle = '#d6b25e'; g.fillRect(116, 230, 24, 6); g.fillRect(116, 300, 24, 6); // Holzsäule mit Goldringen
    const v = g.createRadialGradient(128, 260, 30, 128, 213, 260); v.addColorStop(0, 'rgba(255,240,210,0)'); v.addColorStop(1, 'rgba(40,25,10,0.55)'); g.fillStyle = v; g.fillRect(0, 0, 256, 426);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const inside = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 4), new THREE.MeshBasicMaterial({ map: inTex, transparent: true, opacity: 0, toneMapped: false }));
  inside.position.set(DX, DY, DZ - 0.06); inside.renderOrder = 1; world.add(inside);
  const lamp = new THREE.PointLight(0xffd59a, 0, 14, 1.6); lamp.position.set(DX, DY, DZ + 1.5); world.add(lamp);
  // fahrbare Treppe (weiß mit Goldkante), wie sie zur Öffnung an die Tür gestellt wird
  const stairM = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.5 }), goldM = new THREE.MeshStandardMaterial({ color: 0xd8b25a, metalness: 1, roughness: 0.3 });
  const STEPS = 10, RUN = 0.38, rise = BOT / STEPS;
  for (let i = 0; i < STEPS; i++) {
    const st = new THREE.Mesh(new THREE.BoxGeometry(2.2, rise * (i + 1), RUN), stairM);
    st.position.set(DX, rise * (i + 1) / 2, DZ + 0.3 + (STEPS - 1 - i) * RUN + RUN / 2); st.castShadow = st.receiveShadow = true; world.add(st);
  }
  for (const s of [-1, 1]) { const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, STEPS * RUN * 1.2), goldM); rail.position.set(DX + s * 1.1, BOT / 2 + 0.9, DZ + 0.3 + STEPS * RUN / 2); rail.rotation.x = Math.atan2(BOT, STEPS * RUN); world.add(rail); }
  const stairEnd = DZ + 0.3 + STEPS * RUN;
  // einige Pilger im Tawaf im Hintergrund
  const N = engine.isMobile ? 120 : 220, crowd = createCrowd(world, N, { ihram: true });
  const A = new Float32Array(N).map(() => Math.random() * 6.28), R = new Float32Array(N).map((_, i) => 12 + Math.random() * (matafRadius(Math.cos(A[i]), -Math.sin(A[i])) - 15));
  // Figur
  const fig = createFigure(world, { color: ctx.profile?.gender === 'f' ? 0x2c3a4a : 0x34506a, covered: ctx.profile?.gender === 'f', ring: false, models: peopleModels() });
  const yAt = (z) => (z >= stairEnd ? 0 : z <= DZ + 0.3 ? BOT : BOT * (stairEnd - z) / (stairEnd - DZ - 0.3));
  const path = dir === 'in' ? [DZ + 6, DZ - 0.4] : [DZ - 0.4, DZ + 6];
  const cam = engine.camera, camPos = new THREE.Vector3(DX + 6, 3.6, DZ + 15), look = new THREE.Vector3(DX, DY - 0.6, DZ);
  let t = 0, finished = false;
  const finish = () => { if (finished) return; finished = true; then?.(); };
  ctx.input.onTap = () => finish();
  // Zeitplan: in: 0–1,5 s Blick · 1,5–3,5 s Tür öffnet · 3,5–7,5 s hineingehen · danach weiter
  //           out: 0–2 s Tür öffnet · 2–6 s herausgehen · 6–8 s Tür schließt · danach weiter
  return {
    update(dt) {
      t += dt;
      for (const m of glow) m.emissiveIntensity = sky.art * 0.55;
      for (let i = 0; i < N; i++) { A[i] += dt * 1.1 / R[i]; crowd.set(i, R[i] * Math.cos(A[i]), 0, -R[i] * Math.sin(A[i]), Math.atan2(-Math.sin(A[i]), -Math.cos(A[i]))); } crowd.commit();
      const sm = (a, b) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };
      const open = dir === 'in' ? sm(1.5, 3.5) : sm(0, 2) * (1 - sm(6, 8));
      for (const L of leaves) L.piv.rotation.y = L.s * open * 1.9;
      lamp.intensity = open * 25; inside.material.opacity = Math.min(1, open * 1.6);
      const walk = dir === 'in' ? sm(3.5, 7.5) : sm(2, 6);
      const z = path[0] + (path[1] - path[0]) * walk;
      fig.root.position.set(DX, yAt(z), z); fig.root.rotation.y = dir === 'in' ? Math.PI : 0;
      fig.root.visible = dir === 'in' ? z > DZ - 0.3 || walk < 1 : walk > 0;
      const moving = walk > 0 && walk < 1;
      fig.pose(moving ? 'walk' : 'stand'); fig.update(dt, moving ? 0.8 : 0);
      cam.position.lerp(camPos, 1); look.set(DX, DY - 0.8 - (dir === 'in' ? 0 : 1) * walk, DZ + (dir === 'in' ? 0 : 2 * walk)); cam.lookAt(look);
      if (t > (dir === 'in' ? 8 : 8.5)) finish();
    },
    dispose() { ctx.input.onTap = null; ui.el.stick.classList.remove('off'); },
  };
}
