import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { createSky } from './core/sky.js';
import { createInput } from './core/input.js';
import { createUI } from './core/ui.js';
import { createStations } from './core/stations.js';
import { preview } from './stations/tawaf.js';
import * as content from './content/hajj.js';
import { progressStore } from './core/progress.js';
import { preloadPeople, setCrowdCamera, peopleStatus } from './world/crowd.js';
import { initI18n, LANGS, settings, saveSettings, lang, unlockVoice, voiceAvailable, speak, stopSpeaking, stopAudio } from './core/i18n.js';
initI18n();
addEventListener('pointerdown', unlockVoice, { once: true, capture: true });
const peopleReady = preloadPeople(); // 3D-Pilgerinnen im Hintergrund laden

const engine = createEngine(document.getElementById('c'));
const sky = createSky(engine);
setCrowdCamera(engine.camera, { near: 26, cap: engine.isMobile ? 70 : 140 }); // 3D-Pilgerinnen/Pilger nur in der Nähe (je Gruppe)
const ui = createUI();
const input = createInput(engine.renderer.domElement, ui.el.hold, ui.el.stick);
const ctx = { engine, sky, ui, input, content, progress: { sunnah: new Set(), done: new Set() } };
ctx.ready = peopleReady;
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
// Version + Status der 3D-Modelle (hilft beim Testen am iPhone)
const ver = document.createElement('p'); ver.className = 'small'; ver.id = 'version';
document.getElementById('disclaimer').after(ver);
const showVer = () => { ver.textContent = `Version ${__BUILD__} · Pilgerin: ${peopleStatus.woman} · Pilger: ${peopleStatus.man} · Kameez: ${peopleStatus.kameez}`; };
showVer(); peopleReady.then(showVer);
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
const prog = progressStore.get();
content.STATIONS.forEach((st, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = `${i + 1}. ${st.title}`;
  if (prog.done.includes(i)) b.className = 'done';
  b.addEventListener('click', () => begin(i));
  jump.appendChild(b);
});
// Weiterspielen, wenn es einen gespeicherten Stand gibt
const resume = document.getElementById('resumeBtn');
if (prog.next > 0 && prog.next < content.STATIONS.length) {
  resume.hidden = false;
  resume.textContent = `Weiterspielen: ${prog.next + 1}. ${content.STATIONS[prog.next].title}`;
  resume.addEventListener('click', () => begin(prog.next));
}

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

// ---------- Einstellungen: Sprache, Vorlesen, Tempo, Rezitation ----------
const setBox = document.getElementById('settings');
function langButtons(host) {
  host.innerHTML = '';
  for (const L of LANGS) {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = L.name; b.dataset.noi18n = '';
    b.setAttribute('aria-pressed', String(L.code === lang().code));
    b.addEventListener('click', () => { if (L.code === lang().code) return; settings.lang = L.code; saveSettings(); location.reload(); });
    host.appendChild(b);
  }
}
langButtons(document.getElementById('setLang')); langButtons(document.getElementById('startLang'));
const setVoice = document.getElementById('setVoice'), setRecite = document.getElementById('setRecite'), voiceNote = document.getElementById('setVoiceNote');
setVoice.checked = settings.voice; setRecite.checked = settings.recite;
const soundBtn = document.getElementById('soundBtn');
const setSound = (on) => { settings.voice = on; saveSettings(); setVoice.checked = on; soundBtn.setAttribute('aria-pressed', String(on)); if (!on) { stopSpeaking(); stopAudio(); } };
soundBtn.setAttribute('aria-pressed', String(settings.voice));
soundBtn.addEventListener('click', () => { const on = !settings.voice; setSound(on); if (on) speak('So klingt die Stimme.'); ui.toast(on ? 'Ton an' : 'Ton aus', 1200); });
setVoice.addEventListener('change', () => { setSound(setVoice.checked); if (settings.voice) speak('So klingt die Stimme.'); });
setRecite.addEventListener('change', () => { settings.recite = setRecite.checked; saveSettings(); });
const rateBtns = [...document.querySelectorAll('#setRate button')];
const markRate = () => rateBtns.forEach((b) => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.r - settings.rate) < 0.01)));
rateBtns.forEach((b) => b.addEventListener('click', () => { settings.rate = +b.dataset.r; saveSettings(); markRate(); speak('So klingt die Stimme.'); }));
markRate();
document.getElementById('setBtn').addEventListener('click', () => {
  input.holding = false;
  // Hinweis, wenn das Gerät keine Stimme für diese Sprache hat
  const ok = voiceAvailable();
  voiceNote.hidden = ok; voiceNote.textContent = 'Für diese Sprache hat dein Gerät keine Vorlese-Stimme. Die Texte erscheinen trotzdem übersetzt.';
  setBox.hidden = false;
});
document.getElementById('setClose').addEventListener('click', () => { setBox.hidden = true; });
setBox.addEventListener('click', (e) => { if (e.target === setBox) setBox.hidden = true; });
