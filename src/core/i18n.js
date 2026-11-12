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

const KEY = 'hp-settings';
const DEF = { lang: '', voice: true, rate: 1, recite: true };
export const settings = (() => { try { return { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { ...DEF }; } })();
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

// ---------- Sprachausgabe (Vorlesen der Aufgaben und Hinweise) ----------
const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : null;
let voices = [], unlocked = false;
const pickVoices = () => { voices = synth ? synth.getVoices() : []; };
if (synth) { pickVoices(); synth.onvoiceschanged = pickVoices; }

// Ruhige, angenehme Stimme der passenden Sprache (bevorzugt „Enhanced“/„Premium“/natürliche Stimmen)
function voiceFor(L) {
  if (!voices.length) pickVoices();
  for (const tag of L.voice) {
    const c = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(tag.toLowerCase()));
    if (c.length) return c.sort((a, b) => score(b) - score(a))[0];
  }
  return null;
}
const score = (v) => (/premium|enhanced|natural|neural|siri/i.test(v.name) ? 4 : 0) + (/female|anna|helena|petra|yelda|maged|laila|zeynep|sara|ava|samantha|serena/i.test(v.name) ? 1 : 0) + (v.localService ? 1 : 0);
export const voiceAvailable = (L = lang()) => !!(synth && voiceFor(L));

// iOS: Sprachausgabe erst nach einer Berührung erlaubt → beim ersten Tippen einmal leer sprechen
export function unlockVoice() {
  if (unlocked || !synth) return; unlocked = true;
  try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; synth.speak(u); } catch { /* egal */ }
}

let lastSaid = '', lastAt = 0;
export function speak(text, { interrupt = true } = {}) {
  if (!settings.voice || !synth) return;
  const s = norm(String(text || '').replace(/<[^>]+>/g, ' ').replace(/[✓✋➤▾▸•·]/g, ' ').replace(/[؀-ۿ]+[^A-Za-zÄÖÜäöüß]*/g, (m) => (lang().rtl ? m : ' ')));
  if (!s || (s === lastSaid && performance.now() - lastAt < 4000)) return;
  const L = lang(), v = voiceFor(L); if (!v) return;
  lastSaid = s; lastAt = performance.now();
  if (interrupt) synth.cancel();
  const u = new SpeechSynthesisUtterance(s); u.voice = v; u.lang = v.lang; u.rate = 0.95 * settings.rate; u.pitch = 1;
  synth.speak(u);
}
export const stopSpeaking = () => { if (synth) synth.cancel(); };

// ---------- Rezitation / Aufnahmen (arabische Texte) ----------
// Aufnahmen liegen in public/assets/audio/<name>.mp3 (z. B. talbiyah.mp3). Fehlt eine Datei, erscheint kein Abspielknopf.
const audioOk = new Map();
export async function hasAudio(name) {
  if (!audioOk.has(name)) audioOk.set(name, fetch(`./assets/audio/${name}.mp3`, { method: 'HEAD' }).then((r) => r.ok && /audio|mpeg|octet/.test(r.headers.get('content-type') || 'audio')).catch(() => false));
  return audioOk.get(name);
}
let player = null;
export function playAudio(name, onEnd) {
  stopSpeaking();
  if (player) { player.pause(); player = null; }
  player = new Audio(`./assets/audio/${name}.mp3`); player.onended = () => onEnd && onEnd(); player.play().catch(() => {});
  return player;
}
export const stopAudio = () => { if (player) { player.pause(); player = null; } };
