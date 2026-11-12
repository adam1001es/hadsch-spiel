// Leise Geräusche, im Browser erzeugt (Web Audio) – keine Dateien, kein Download.
// Schritte je nach Untergrund, Wasserhahn beim Ghusl, Trinken beim Zamzam, Bus beim Einsteigen,
// sanfter Klang bei Sonnenauf- und -untergang. Alles bewusst leise und kurz. Folgt dem Ton-Knopf (settings.voice).
import { settings } from './i18n.js';

let ac = null, master = null, noiseBuf = null, keepAlive = null;
function ctx() {
  if (!ac) {
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 1.3; master.connect(ac.destination);
      // 2 s weißes Rauschen als Rohstoff für Schritte, Wasser, Zischen
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch { ac = null; }
  }
  if (ac && ac.state !== 'running') ac.resume().catch(() => {});
  return ac;
}
export const audioCtx = () => ctx();
export const audioOut = () => (ctx(), master);

// iPhone: Ton erst nach einer Berührung erlaubt, und im Lautlos-Modus ist Web Audio stumm.
// Darum bei jeder Berührung (bis es läuft): Kontext fortsetzen, einen stillen Ton spielen,
// die Audio-Sitzung auf „Wiedergabe“ stellen (Safari 17+) und ein stilles, endloses <audio> starten (ältere iOS).
const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
function unlock() {
  try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* egal */ }
  const c = ctx(); if (!c) return;
  try { const b = c.createBuffer(1, 1, 22050), src = c.createBufferSource(); src.buffer = b; src.connect(c.destination); src.start(0); } catch { /* egal */ }
  if (!keepAlive) { try { keepAlive = new Audio(SILENT); keepAlive.loop = true; keepAlive.setAttribute('playsinline', ''); keepAlive.volume = 0.01; keepAlive.play().catch(() => { keepAlive = null; }); } catch { keepAlive = null; } }
  if (c.state === 'running') for (const ev of EVENTS) removeEventListener(ev, unlock, true);
}
const EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
for (const ev of EVENTS) addEventListener(ev, unlock, true);
export const unlockSfx = () => unlock();
const on = () => settings.voice && ctx();

function noise(t0, dur, { type = 'bandpass', freq = 1000, q = 1, gain = 0.2, attack = 0.005, rate = 1 } = {}) {
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.value = rate; s.loop = true;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(f).connect(g).connect(master); s.start(t0, Math.random() * 1.5); s.stop(t0 + dur + 0.05);
  return { s, f, g };
}
function tone(t0, dur, freq, { type = 'sine', gain = 0.1, attack = 0.01, to = null } = {}) {
  const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t0); if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = ac.createGain(); g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(gain, t0 + attack); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}

// Schritt: sand (weich knirschend), stone (Fels, trocken), marble (glatter Boden, kurzer heller Klick), carpet (gedämpft)
export function step(surface = 'sand', strength = 1) {
  if (!on()) return;
  const t = ac.currentTime, v = (0.85 + Math.random() * 0.3) * strength;
  if (surface === 'sand') {
    noise(t, 0.14, { type: 'bandpass', freq: 700 + Math.random() * 300, q: 0.7, gain: 0.05 * v, attack: 0.02 });
    noise(t + 0.01, 0.09, { type: 'highpass', freq: 3500, q: 0.5, gain: 0.012 * v, attack: 0.01 });
  } else if (surface === 'stone') {
    noise(t, 0.07, { type: 'bandpass', freq: 1500 + Math.random() * 500, q: 1.4, gain: 0.07 * v, attack: 0.003 });
    tone(t, 0.05, 140 + Math.random() * 30, { gain: 0.03 * v, attack: 0.002, to: 90 });
  } else if (surface === 'marble') {
    noise(t, 0.05, { type: 'bandpass', freq: 2600 + Math.random() * 400, q: 2, gain: 0.03 * v, attack: 0.002 });
    tone(t, 0.06, 200, { gain: 0.012 * v, attack: 0.002, to: 140 });
  } else {
    noise(t, 0.1, { type: 'lowpass', freq: 500, q: 0.6, gain: 0.03 * v, attack: 0.015 });
  }
}

// Wasserhahn: rauschendes Wasser, solange keep() aufgerufen wird (z. B. jedes Bild während des Ghusl)
let water = null, waterUntil = 0;
export function waterKeep() {
  if (!on()) return;
  const t = ac.currentTime; waterUntil = t + 0.35;
  if (!water) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 0.6;
    const f2 = ac.createBiquadFilter(); f2.type = 'peaking'; f2.frequency.value = 3200; f2.gain.value = 6;
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.06, t + 0.4);
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 260; lfo.connect(lg).connect(f.frequency); lfo.start();
    s.connect(f).connect(f2).connect(g).connect(master); s.start();
    tone(t, 0.12, 1800, { gain: 0.02, to: 900 }); // Hahn aufdrehen
    water = { s, g, lfo };
    const tick = () => {
      if (!water) return;
      if (ac.currentTime > waterUntil) { const w = water; water = null; w.g.gain.setTargetAtTime(0, ac.currentTime, 0.12); setTimeout(() => { w.s.stop(); w.lfo.stop(); }, 700); return; }
      if (Math.random() < 0.5) tone(ac.currentTime + Math.random() * 0.1, 0.05, 900 + Math.random() * 1400, { gain: 0.012, to: 500 }); // Tropfen/Plätschern
      setTimeout(tick, 120);
    };
    tick();
  }
}

// Trinken: drei leise Schlucke
export function drink() {
  if (!on()) return;
  const t = ac.currentTime + 0.25;
  for (let i = 0; i < 3; i++) {
    const t0 = t + i * 0.55;
    tone(t0, 0.16, 260, { gain: 0.05, attack: 0.02, to: 120 });
    noise(t0, 0.12, { type: 'lowpass', freq: 600, gain: 0.025, attack: 0.02 });
  }
}

// Bus: Tür zischt, Motor läuft an und brummt kurz
export function bus() {
  if (!on()) return;
  const t = ac.currentTime;
  noise(t, 0.6, { type: 'highpass', freq: 2500, gain: 0.05, attack: 0.02 }); // Türzischen
  const o = ac.createOscillator(), o2 = ac.createOscillator(); o.type = 'sawtooth'; o2.type = 'square';
  o.frequency.setValueAtTime(38, t + 0.5); o.frequency.linearRampToValueAtTime(52, t + 2.2); o2.frequency.setValueAtTime(19, t + 0.5); o2.frequency.linearRampToValueAtTime(26, t + 2.2);
  const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 220;
  const g = ac.createGain(); g.gain.setValueAtTime(0, t + 0.5); g.gain.linearRampToValueAtTime(0.09, t + 1.0); g.gain.linearRampToValueAtTime(0.07, t + 2.4); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
  o.connect(f); o2.connect(f); f.connect(g).connect(master); o.start(t + 0.5); o2.start(t + 0.5); o.stop(t + 3.7); o2.stop(t + 3.7);
}

// Sonnenaufgang (aufsteigend) / -untergang (absteigend): weicher, ruhiger Klang
export function sun(rising) {
  if (!on()) return;
  const t = ac.currentTime, notes = rising ? [220, 330, 440] : [440, 330, 220];
  notes.forEach((f, i) => { tone(t + i * 0.5, 3.2, f, { gain: 0.035, attack: 0.6 }); tone(t + i * 0.5, 3.2, f * 2.005, { gain: 0.01, attack: 0.8 }); });
}
