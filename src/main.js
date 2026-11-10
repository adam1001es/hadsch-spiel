import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { createSky } from './core/sky.js';
import { createInput } from './core/input.js';
import { createUI } from './core/ui.js';
import { createStations } from './core/stations.js';
import { preview } from './stations/tawaf.js';
import * as content from './content/hajj.js';

const engine = createEngine(document.getElementById('c'));
const sky = createSky(engine);
const ui = createUI();
const input = createInput(engine.renderer.domElement, ui.el.hold);
const ctx = { engine, sky, ui, input, content };
const stations = createStations(ctx);

let current = preview(ctx);
const clock = new THREE.Clock();
engine.renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  sky.update(dt);
  if (current) current.update(dt); else stations.update(dt);
  engine.renderer.render(engine.scene, engine.camera);
});

const startScreen = document.getElementById('start');
document.getElementById('disclaimer').textContent = content.DISCLAIMER;
const begin = (i) => { startScreen.hidden = true; current = null; stations.go(i); };
document.getElementById('startBtn').addEventListener('click', () => begin(0));
const jump = document.getElementById('jump');
content.STATIONS.forEach((st, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = `${i + 1}. ${st.title}`;
  b.addEventListener('click', () => begin(i));
  jump.appendChild(b);
});

// Direkt zu einer Station springen (zum Testen): …/index.html#s2 öffnet Station 2.
const m = location.hash.match(/^#s(\d+)$/);
if (m) begin(Math.max(0, Math.min(content.STATIONS.length - 1, +m[1] - 1)));
