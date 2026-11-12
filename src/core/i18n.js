// Mehrsprachigkeit und Sprachausgabe.
//
// Übersetzt wird beim Anzeigen: Alle sichtbaren Texte im Spiel sind deutsche Quelltexte (hajj.js, Stationen, index.html).
// Ein Wörterbuch je Sprache (src/content/lang/<code>.js) ordnet deutschen Sätzen die Übersetzung zu.
// Ein MutationObserver übersetzt jeden neuen Textknoten (und placeholder/aria-label). Fehlt eine Übersetzung,
// bleibt der deutsche Text stehen. Schlüssel mit {0}, {1} … sind Muster (z. B. „Runde {0} / 7“), die Teile werden
// ihrerseits übersetzt. Arabische Texte (Gebete, Ayat) werden nie verändert.

export const LANGS = [
  { code: 'de', name: 'Deutsch', voice: ['de-DE', 'de-AT', 'de'] },
  { code: 'en', name: 'English', voice: ['en-GB', 'en-US', 'en'] },
  { code: 'tr', name: 'Türkçe', voice: ['tr-TR', 'tr'] },
  { code: 'ar', name: 'العربية', rtl: true, voice: ['ar-SA', 'ar-001', 'ar'] },
  { code: 'bs', name: 'Bosanski', voice: ['bs-BA', 'hr-HR', 'sr-Latn', 'hr'] },
  { code: 'sq', name: 'Shqip', voice: ['sq-AL', 'sq'] },
  { code: 'ce', name: 'Нохчийн', voice: ['ce', 'ru-RU'], voiceNote: true },
  { code: 'ps', name: 'پښتو', rtl: true, voice: ['ps-AF', 'ps'] },
  { code: 'fa', name: 'فارسی', rtl: true, voice: ['fa-IR', 'fa'] },
  { code: 'prs', name: 'دری (افغانستان)', rtl: true, voice: ['fa-AF', 'prs', 'fa-IR', 'fa'] },
];

import { audioCtx, audioOut } from './sfx.js';
const KEY = 'hp-settings';
const DEF = { lang: '', voice: true, rate: 1, recite: true, v: 3 };
export const settings = (() => {
  try {
    const st = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') };
    if (st.v !== 3) { st.voice = true; st.v = 3; } // Ton (Ansagen mit natürlicher Stimme + leise Geräusche) ist standardmäßig an
    return st;
  } catch { return { ...DEF }; }
})();
export function saveSettings() { try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* privat */ } }
export const lang = () => LANGS.find((l) => l.code === settings.lang) || LANGS[0];

// ---------- Übersetzung ----------
let dict = null, patterns = [];
const norm = (s) => s.replace(/\s+/g, ' ').trim();
const AR = /[؀-ۿ]/;
const isArabicOnly = (s) => AR.test(s) && !/[A-Za-zÄÖÜäöüß]{3}/.test(s);

function compile(d) {
  dict = new Map(); patterns = [];
  for (const [k, v] of Object.entries(d)) {
    const nk = norm(k);
    if (/\{\d\}/.test(nk)) {
      const esc = nk.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(\d)\\?\}/g, '(.+?)');
      patterns.push([new RegExp('^' + esc + '$'), v, nk.length]);
    } else dict.set(nk, v);
  }
  patterns.sort((a, b) => b[2] - a[2]); // spezifischere Muster zuerst
}

// Übersetzt einen ganzen Text (oder gibt ihn unverändert zurück)
export function t(s) {
  if (!dict || s == null) return s;
  const raw = String(s), n = norm(raw);
  if (!n || isArabicOnly(n)) return raw;
  const hit = dict.get(n) ?? (n.endsWith('.') ? null : dict.get(n + '.')?.replace(/[.。]$/, ''));
  if (hit != null) return keepSpace(raw, hit);
  for (const [re, v] of patterns) {
    const m = n.match(re);
    if (m) return keepSpace(raw, v.replace(/\{(\d)\}/g, (_, i) => t(m[+i + 1])));
  }
  // Zerlegen und Teile einzeln übersetzen (nur übernehmen, wenn sich etwas ändert)
  const tryParts = (parts, join) => { const tr = parts.map((x) => t(x)); return tr.some((x, i) => x !== parts[i]) ? tr.join(join) : null; };
  let m, r;
  if ((m = n.match(/^([▶○✓•·–\-]+\s*)(.+)$/)) && (r = t(m[2])) !== m[2]) return keepSpace(raw, m[1] + r);            // Zeichen davor
  if ((m = n.match(/^(.+?)(\s*(?:✓|:|…|\.\.\.))$/)) && (r = t(m[1])) !== m[1]) return keepSpace(raw, r + m[2]);       // Zeichen dahinter
  if (n.includes(' · ') && (r = tryParts(n.split(' · '), ' · '))) return keepSpace(raw, r);                               // Abschnitte
  if ((m = n.match(/^(.+?)\s*(\([^()]+\))$/)) && (r = tryParts([m[1], m[2]], ' '))) return keepSpace(raw, r);          // Zusatz in Klammern
  const sent = n.split(/(?<=[^\d\s][.!?:])\s+(?=[A-ZÄÖÜ„])/);                                                          // mehrere Sätze
  if (sent.length > 1 && (r = tryParts(sent, ' '))) return keepSpace(raw, r);
  if (missing && !/^[\d\s.,:/%–·✓✋➤▾▸×+\-→←↑]*$/.test(n) && !/[ḥʿāīūṣḍṭẓ]/.test(n) && /[a-zäöüß]{3}/.test(n)) missing.add(n);
  return raw;
}
const keepSpace = (raw, v) => (raw.match(/^\s*/)[0]) + v + (raw.match(/\s*$/)[0]);
// Für automatische Tests: fehlende Übersetzungen sammeln (window.__missing)
let missing = null;

const done = new WeakMap();
function translateNode(node) {
  if (node.nodeType === 3) {
    const v = node.nodeValue; if (done.get(node) === v) return;
    const p = node.parentElement; if (!p || p.closest('script,style,.ar,[data-noi18n]')) return;
    const tv = t(v); if (tv !== v) node.nodeValue = tv; done.set(node, node.nodeValue);
  } else if (node.nodeType === 1) {
    if (node.matches('script,style,.ar,[data-noi18n]')) return;
    for (const a of ['placeholder', 'aria-label', 'title']) if (node.hasAttribute(a)) { const v = node.getAttribute(a), tv = t(v); if (tv !== v) node.setAttribute(a, tv); }
    for (const c of node.childNodes) translateNode(c);
  }
}

export async function initI18n() {
  const L = lang();
  document.documentElement.lang = L.code === 'prs' ? 'fa-AF' : L.code;
  document.documentElement.toggleAttribute('data-rtl', !!L.rtl);
  if (L.code === 'de') return;
  try {
    const mods = import.meta.glob('../content/lang/*.js');
    const load = mods[`../content/lang/${L.code}.js`];
    if (!load) return;
    compile((await load()).default);
  } catch (e) { console.warn('Sprache', e); return; }
  if (/[?&]i18ncheck/.test(location.search)) { missing = new Set(); window.__missing = missing; }
  translateNode(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') translateNode(m.target);
      else if (m.type === 'attributes') translateNode(m.target);
      else for (const n of m.addedNodes) translateNode(n);
    }
  }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['placeholder', 'aria-label', 'title'] });
}

// ---------- Sprachansagen (natürliche Stimme, vorab erzeugt) ----------
// Ziel-Namen werden als fertige Audiodateien abgespielt: assets/voice/<sprache>/<hash>.mp3 (Piper-Stimmen, offline erzeugt,
// z. B. „Thorsten“ für Deutsch). Gibt es für einen Text keine Datei, bleibt es still – keine Computerstimme des Geräts.
const VOICED = ['de', 'en', 'tr', 'ar', 'fa', 'prs'];
export const voiceAvailable = (L = lang()) => VOICED.includes(L.code);
const clipHash = (s) => { let h = 0x811c9dc5; for (const ch of norm(s)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(16).padStart(8, '0'); };
let manifest = null;
const loadManifest = () => (manifest ||= voiceAvailable() ? fetch(`./assets/voice/${lang().code}/index.json`).then((r) => r.json()).then((a) => new Set(a)).catch(() => new Set()) : Promise.resolve(new Set()));
// Wiedergabe über Web Audio (läuft auf dem iPhone nach der ersten Berührung auch ohne neue Berührung und im Lautlos-Modus)
const buffers = new Map();
function loadClip(url) {
  if (!buffers.has(url)) buffers.set(url, fetch(url).then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => audioCtx().decodeAudioData(ab, res, rej))).catch(() => null));
  return buffers.get(url);
}
let clip = null, lastKey = '', lastAt = 0;
export function unlockVoice() { loadManifest(); }
function playUrl(url, rate = 1, onEnd) {
  const c = audioCtx(); if (!c) return null;
  return loadClip(url).then((buf) => {
    if (!buf) return null;
    const src = c.createBufferSource(); src.buffer = buf; src.playbackRate.value = rate;
    const g = c.createGain(); g.gain.value = 0.9; src.connect(g).connect(audioOut());
    src.onended = () => { if (clip === src) clip = null; onEnd && onEnd(); }; src.start(); return src;
  });
}
// key = deutscher Quelltext (z. B. „Waschhaus“); gespielt wird die Aufnahme in der gewählten Sprache
export async function speak(key, { interrupt = true } = {}) {
  if (!settings.voice || !key) return;
  const k = norm(String(key).split(' · ')[0]);
  if (k === lastKey && performance.now() - lastAt < 4000) return;
  const set = await loadManifest(), h = clipHash(k);
  if (!set.has(h)) return;
  lastKey = k; lastAt = performance.now();
  if (clip && !interrupt) return;
  stopSpeaking();
  const src = await playUrl(`./assets/voice/${lang().code}/${h}.mp3`, settings.rate || 1);
  if (src) clip = src;
}
export const stopSpeaking = () => { if (clip) { try { clip.stop(); } catch { /* schon zu Ende */ } clip = null; } };

// ---------- Rezitation / Aufnahmen (arabische Texte) ----------
// Aufnahmen liegen in public/assets/audio/<name>.mp3 (z. B. talbiyah.mp3). Fehlt eine Datei, erscheint kein Abspielknopf.
const audioOk = new Map();
export async function hasAudio(name) {
  if (!audioOk.has(name)) audioOk.set(name, fetch(`./assets/audio/${name}.mp3`, { method: 'HEAD' }).then((r) => r.ok && /audio|mpeg|octet/.test(r.headers.get('content-type') || 'audio')).catch(() => false));
  return audioOk.get(name);
}
let player = null;
export function playAudio(name, onEnd, { auto = false } = {}) {
  if (auto && !settings.voice) return null; // Ton aus: nichts automatisch abspielen (▶ geht immer)
  stopSpeaking(); stopAudio();
  playUrl(`./assets/audio/${name}.mp3`, 1, onEnd)?.then((src) => { player = src; });
  return true;
}
export const stopAudio = () => { if (player) { try { player.stop(); } catch { /* egal */ } player = null; } };
