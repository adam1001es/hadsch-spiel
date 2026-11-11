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
const input = createInput(engine.renderer.domElement, ui.el.hold, ui.el.stick);
const ctx = { engine, sky, ui, input, content, progress: { sunnah: new Set(), done: new Set() } };
window.__hp = ctx; // für automatische Tests
const stations = createStations(ctx);

let current = preview(ctx);
const clock = new THREE.Clock();
engine.renderer.setAnimationLoop(() => {
  const raw = clock.getDelta();
  const dt = Math.min(raw, 0.05);
  engine.adapt(raw);
  sky.update(dt);
  if (current) current.update(dt); else stations.update(dt);
  engine.renderer.render(engine.scene, engine.camera);
});

const startScreen = document.getElementById('start');
document.getElementById('disclaimer').textContent = content.DISCLAIMER;
// Profil (Vorname, Geschlecht, Alter) – nur lokal im Browser gespeichert
const pf = (() => { try { return JSON.parse(localStorage.getItem('hp-profile') || '{}'); } catch { return {}; } })();
const pfName = document.getElementById('pfName'), pfAge = document.getElementById('pfAge'), pfForm = document.getElementById('profile');
pfAge.innerHTML = '<option value="">bitte wählen</option>' + Array.from({ length: 11 }, (_, k) => `<option value="${k + 7}">${k + 7} Jahre</option>`).join('') + '<option value="18">18 oder älter</option>';
pfName.value = pf.name || ''; pfAge.value = pf.age || '';
const segBtns = [...document.querySelectorAll('.pf-seg button')];
const setGender = (g) => { pf.gender = g; segBtns.forEach((b) => b.setAttribute('aria-checked', String(b.dataset.g === g))); pfForm.classList.remove('missing'); };
segBtns.forEach((b) => b.addEventListener('click', () => setGender(b.dataset.g)));
if (pf.gender) setGender(pf.gender);
function readProfile() {
  const name = pfName.value.trim().replace(/[<>&"]/g, '').slice(0, 20);
  ctx.profile = { name: name || '', gender: pf.gender || 'm', age: +pfAge.value || 0 };
  try { localStorage.setItem('hp-profile', JSON.stringify(ctx.profile)); } catch { /* egal */ }
}
readProfile();

const begin = (i, check = true) => {
  if (check && !pf.gender) { pfForm.classList.add('missing'); ui.toast('Bitte wähle aus: Junge/Mann oder Mädchen/Frau', 2600); return; }
  readProfile();
  startScreen.hidden = true; ui.el.stick.classList.remove('off'); current = null; stations.go(i);
};
ui.el.stick.classList.add('off');
document.getElementById('startBtn').addEventListener('click', () => begin(0));
const jump = document.getElementById('jump');
content.STATIONS.forEach((st, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = `${i + 1}. ${st.title}`;
  b.addEventListener('click', () => begin(i));
  jump.appendChild(b);
});

// Übersicht & Anleitung (runder Kartenknopf oben rechts)
const guide = document.getElementById('guide');
const guideFrame = document.getElementById('guideFrame');
document.getElementById('guideBtn').addEventListener('click', () => {
  if (!guideFrame.src) guideFrame.src = './anleitung.html';
  input.holding = false;
  guide.hidden = false;
});
document.getElementById('guideClose').addEventListener('click', () => { guide.hidden = true; });

// Direkt zu einer Station springen (zum Testen): …/index.html#s2 öffnet Station 2.
const m = location.hash.match(/^#s(\d+)$/);
if (m) begin(Math.max(0, Math.min(content.STATIONS.length - 1, +m[1] - 1)), false);
