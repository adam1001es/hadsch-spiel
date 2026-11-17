import * as THREE from 'three';
import { createEngine } from './core/engine.js';
import { createSky } from './core/sky.js';
import { createInput } from './core/input.js';
import { createUI } from './core/ui.js';
import { createStations } from './core/stations.js';
import { preview } from './stations/tawaf.js';
import * as content from './content/hajj.js';
import { progressStore, unlockStore } from './core/progress.js';
import { createMulti } from './core/multi.js';
import { rigReady } from './core/rigged.js';
import { preloadPeople, setCrowdCamera, peopleStatus } from './world/crowd.js';
import { initI18n, LANGS, settings, saveSettings, lang, unlockVoice, voiceAvailable, speak, stopSpeaking, stopAudio } from './core/i18n.js';
initI18n();
import { unlockSfx } from './core/sfx.js';
addEventListener('pointerdown', () => { unlockVoice(); unlockSfx(); }, { once: true, capture: true });
addEventListener('keydown', () => { unlockVoice(); unlockSfx(); }, { once: true, capture: true });
const peopleReady = preloadPeople(); // 3D-Pilgerinnen im Hintergrund laden

const engine = createEngine(document.getElementById('c'));
const sky = createSky(engine);
setCrowdCamera(engine.camera, { near: 26, cap: engine.isMobile ? 70 : 140 }); // 3D-Pilgerinnen/Pilger nur in der Nähe (je Gruppe)
const ui = createUI();
const input = createInput(engine.renderer.domElement, ui.el.hold, ui.el.stick);
const ctx = { engine, sky, ui, input, content, progress: { sunnah: new Set(), done: new Set() } };
ctx.ready = Promise.all([peopleReady, rigReady]); // 3D-Pilger und Hauptfigur (Skelett) geladen
window.__hp = ctx; // für automatische Tests
const stations = createStations(ctx);
const multi = createMulti(ctx); ctx.multi = multi;

let current = preview(ctx);
const clock = new THREE.Clock();
let frameAcc = 0;
engine.renderer.setAnimationLoop(() => {
  // Bildrate begrenzen (60, im Sparmodus 30): Handy bleibt kühler, Akku hält länger
  frameAcc += clock.getDelta();
  if (frameAcc < 1 / engine.perf.fpsCap - 0.004) return;
  const raw = frameAcc; frameAcc = 0;
  const dt = Math.min(raw, 0.05);
  engine.adapt(raw);
  sky.update(dt);
  if (current) current.update(dt); else stations.update(dt);
  multi.update(dt);
  if (!current) ui.autoCollapse?.(input, dt);
  engine.renderer.render(engine.scene, engine.camera);
});

const startScreen = document.getElementById('start');
document.getElementById('disclaimer').textContent = content.DISCLAIMER;
// Version + Status der 3D-Modelle (hilft beim Testen am iPhone)
const ver = document.createElement('p'); ver.className = 'small'; ver.id = 'version';
document.getElementById('disclaimer').after(ver);
// Neue Version online? (Browser wie Firefox am iPhone halten die alte Seite lange im Speicher) → einmal neu laden
fetch('./version.json?t=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)).then((v) => {
  if (!v || v.build === __BUILD__) return;
  try { if (sessionStorage.getItem('hp-reloaded') === v.build) return; sessionStorage.setItem('hp-reloaded', v.build); } catch { return; }
  location.reload();
}).catch(() => {});
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
{ const box = document.getElementById('jumpBox'); box.open = true; box.addEventListener('toggle', () => { box.open = true; }); } // Stationen immer aufgeklappt
const prog = progressStore.get();
content.STATIONS.forEach((st, i) => {
  const b = document.createElement('button');
  b.type = 'button'; b.textContent = `${i + 1}. ${st.title}`;
  if (prog.done.includes(i)) b.className = 'done';
  b.addEventListener('click', () => begin(i));
  jump.appendChild(b);
});
// Erlebnis-Bereiche (Kaaba, Straßen von Mekka, Ballon) direkt wählbar
const trialNote = () => unlockStore.unlocked() ? '' : unlockStore.trialLeft() > 0 ? ` (Probe: noch ${Math.ceil(unlockStore.trialLeft() / 60)} Min.)` : ' 🔒 nach dem Hadsch';
const bonusBtns = [];
for (const bx of ctx.bonus || []) {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'bonus'; b.textContent = '★ ' + bx.title + trialNote(); bonusBtns.push([b, bx]);
  b.addEventListener('click', () => { readProfile(); startScreen.hidden = true; ui.el.stick.classList.remove('off'); current = null; bx.go(); });
  jump.appendChild(b);
}
// direkt per Link: …#kaaba, …#mekka, …#ballon
// Code von der Urkunde eingeben → Straßen von Mekka und Medina dauerhaft frei
{
  const inp = document.getElementById('codeIn'), btn = document.getElementById('codeBtn'), box = document.getElementById('codeBox');
  if (unlockStore.unlocked()) box.hidden = true;
  btn.addEventListener('click', () => {
    if (unlockStore.redeem(inp.value)) { ui.toast('Freigeschaltet! Die Straßen von Mekka und Medina kannst du jetzt immer spielen.', 3600); box.hidden = true; for (const [b, bx] of bonusBtns) b.textContent = '★ ' + bx.title; }
    else ui.toast('Dieser Code stimmt nicht. Bitte genau so eingeben, wie er auf der Urkunde steht.', 3200);
  });
}
{ const bm = { '#mekka': 0 }[location.hash]; if (location.hash === '#ballon' || location.hash === '#medina' || location.hash === '#bauhof' || location.hash === '#strecke') setTimeout(() => { readProfile(); startScreen.hidden = true; current = null; location.hash === '#ballon' ? ctx.balloon('mecca') : location.hash === '#bauhof' ? ctx.bauhof() : location.hash === '#strecke' ? ctx.roadtrip('mecca', 'medina', { vehicle: 'sport' }) : ctx.city(null, 'medina'); }, 0); if (bm != null) setTimeout(() => { readProfile(); startScreen.hidden = true; current = null; ctx.bonus[bm].go(); }, 0); }
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
if (location.hash === '#ende') begin(content.STATIONS.length, false); // Urkunde (und Belohnung in der Kaaba)

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
document.getElementById('startLangSum').textContent = '🌐 ' + lang().name + ' ▾'; // Sprachauswahl auf dem Startbildschirm eingeklappt
const setVoice = document.getElementById('setVoice'), setRecite = document.getElementById('setRecite'), voiceNote = document.getElementById('setVoiceNote');
setVoice.checked = settings.voice; setRecite.checked = settings.recite;
const soundBtn = document.getElementById('soundBtn');
const setSound = (on) => { settings.voice = on; saveSettings(); setVoice.checked = on; soundBtn.setAttribute('aria-pressed', String(on)); if (!on) { stopSpeaking(); stopAudio(); } };
soundBtn.setAttribute('aria-pressed', String(settings.voice));
soundBtn.addEventListener('click', () => { const on = !settings.voice; setSound(on); if (on) speak('So klingt die Stimme.'); ui.toast(on ? 'Ton an' : 'Ton aus', 1200); });
setVoice.addEventListener('change', () => { setSound(setVoice.checked); if (settings.voice) speak('So klingt die Stimme.'); });
setRecite.addEventListener('change', () => { settings.recite = setRecite.checked; saveSettings(); });
// Grafik: Akku sparen / Automatisch / Schön – wirkt nach dem Neuladen
{
  const gBtns = [...document.querySelectorAll('#setGfx button')];
  const cur = ['save', 'nice'].includes(settings.gfx) ? settings.gfx : 'auto';
  gBtns.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.g === cur)));
  gBtns.forEach((b) => b.addEventListener('click', () => { if (b.dataset.g === cur) return; settings.gfx = b.dataset.g; saveSettings(); engine.perf.resetAuto(); ui.toast('Grafik wird umgestellt …', 1200); setTimeout(() => location.reload(), 700); }));
  const note = document.getElementById('setGfxNote'); if (note) note.textContent = engine.perf.low ? 'Gerade aktiv: Akku sparen (30 Bilder/s, weniger Details).' : 'Gerade aktiv: volle Grafik.';
}
engine.onLow = () => ui.toast('Dein Gerät ist ausgelastet – Akku-Sparmodus ist jetzt an (änderbar in den Einstellungen).', 4200);
const rateBtns = [...document.querySelectorAll('#setRate button')];
const markRate = () => rateBtns.forEach((b) => b.setAttribute('aria-pressed', String(Math.abs(+b.dataset.r - settings.rate) < 0.01)));
rateBtns.forEach((b) => b.addEventListener('click', () => { settings.rate = +b.dataset.r; saveSettings(); markRate(); speak('So klingt die Stimme.'); }));
markRate();
document.getElementById('setBtn').addEventListener('click', () => {
  input.holding = false;
  // Hinweis, wenn das Gerät keine Stimme für diese Sprache hat
  const ok = voiceAvailable();
  voiceNote.hidden = ok; voiceNote.textContent = 'Für diese Sprache gibt es noch keine Stimme. Die Texte erscheinen trotzdem übersetzt.';
  setBox.hidden = false;
});
document.getElementById('setClose').addEventListener('click', () => { setBox.hidden = true; });
setBox.addEventListener('click', (e) => { if (e.target === setBox) setBox.hidden = true; });

// ---------- Zusammen spielen ----------
{
  const $ = (id) => document.getElementById(id);
  const where = (s) => (s === 'kaaba' ? 'in der Kaaba' : s === 'city-mecca' ? 'in den Straßen von Mekka' : s === 'city-medina' ? 'in den Straßen von Medina' : s === 'drive' ? 'im Bus' : s === 'balloon' ? 'im Heißluftballon' : s >= content.STATIONS.length ? 'bei der Urkunde' : typeof s === 'number' ? `Station ${s + 1}: ${content.STATIONS[s].title}` : 'am Start');
  const render = (st) => {
    $('multiOnline').checked = st.online;
    $('multiOff').hidden = !!st.code; $('multiOn').hidden = !st.code; $('multiShow').textContent = st.code || '----';
    $('multiStat').textContent = !st.online ? 'Aus – du spielst allein.' : !st.connected ? 'Verbinde …' : (st.code ? `Privater Raum ${st.code}` : 'Online') + ` · hier bei dir: ${st.others.length}`;
    $('multiList').innerHTML = st.online ? st.others.map((o) => `<li><i style="background:${o.col}">${o.i || '•'}</i> ${where(o.s)}</li>`).join('') : '';
    const n = st.online && st.connected ? st.others.length : 0;
    $('multiBtn').classList.toggle('on', n > 0);
    $('multiCount').hidden = !n; $('multiCount').textContent = String(n);
  };
  multi.onChange = render; render(multi.status());
  $('multiBtn').addEventListener('click', () => { $('multi').hidden = false; });
  $('multiClose').addEventListener('click', () => { $('multi').hidden = true; });
  $('multi').addEventListener('click', (e) => { if (e.target.id === 'multi') $('multi').hidden = true; });
  $('multiCreate').addEventListener('click', () => multi.create());
  $('multiJoin').addEventListener('click', () => multi.join($('multiCode').value));
  $('multiCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') multi.join($('multiCode').value); });
  $('multiLeave').addEventListener('click', () => multi.leave());
  $('multiOnline').addEventListener('change', (e) => multi.setOnline(e.target.checked));
}

// ---------- Menü (ein Knopf statt vier) ----------
{
  const menuBtn = document.getElementById('menuBtn');
  const setMenu = (open) => { document.body.classList.toggle('menu-open', open); menuBtn.setAttribute('aria-expanded', String(open)); };
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); setMenu(!document.body.classList.contains('menu-open')); });
  for (const id of ['guideBtn', 'setBtn', 'multiBtn']) document.getElementById(id).addEventListener('click', () => setMenu(false));
  document.addEventListener('pointerdown', (e) => { if (!e.target.closest('#menuBtn, #guideBtn, #setBtn, #soundBtn, #multiBtn')) setMenu(false); }, true);
  // Punkt am Menü-Knopf, wenn man mit anderen verbunden ist
  const dot = document.getElementById('menuDot');
  new MutationObserver(() => { dot.hidden = !document.getElementById('multiBtn').classList.contains('on'); }).observe(document.getElementById('multiBtn'), { attributes: true, attributeFilter: ['class'] });
}
