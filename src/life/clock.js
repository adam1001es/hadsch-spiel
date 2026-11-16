import { PRAYERS } from '../content/life.js';

// Spieluhr des Lebensspiels: läuft in allen Lebensspiel-Orten weiter (Mekka, Medina, Haram, Nabawi) und wird gespeichert.
// 1 Spielstunde = 90 Sekunden (ein Tag ≈ 36 Minuten). Zeit in Spielminuten seit Beginn (Tag = floor(min / 1440)).
const KEY = 'hp-life-clock', SEC_PER_MIN = 1.5;
let state = (() => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) return o; } catch { /* egal */ } return { v: 1, min: 15 * 60 + 25, prayed: {} }; })();
let saveT = 0;
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* egal */ } };

export const clock = {
  get min() { return state.min; },
  get day() { return Math.floor(state.min / 1440); },
  get dayMin() { return ((state.min % 1440) + 1440) % 1440; },
  get hour() { return this.dayMin / 60; },
  hhmm(m = this.dayMin) { const h = Math.floor(m / 60) % 24, mm = Math.floor(m % 60); return `${String(h).padStart(2, '0')}:${String(mm).padStart(2, '0')}`; },
  advance(dt) { state.min += dt / SEC_PER_MIN; saveT += dt; if (saveT > 5) { saveT = 0; save(); } },
  set(dayMin) { state.min = this.day * 1440 + dayMin; save(); },
  // aktuelles Gebet (dessen Zeit gerade läuft) und nächstes; Zeit des Fajr endet mit Sonnenaufgang (06:35)
  prayers(city = 'mecca') { return PRAYERS[city] || PRAYERS.mecca; },
  current(city) {
    const P = this.prayers(city), m = this.dayMin;
    let cur = null; for (const p of P) if (m >= p.t) cur = p;
    if (!cur) cur = P[P.length - 1]; // nach Mitternacht: Isha-Zeit läuft noch bis Fajr
    if (cur.id === 'fajr' && m > 6 * 60 + 35) return null; // zwischen Sonnenaufgang und Dhuhr: keine Pflichtgebetszeit
    return cur;
  },
  next(city) { const P = this.prayers(city), m = this.dayMin; return P.find((p) => p.t > m) || P[0]; },
  minutesTo(p) { return ((p.t - this.dayMin) % 1440 + 1440) % 1440; },
  // Gemeinschaftsgebet: von Iqama bis 15 Spielminuten danach
  jamaah(city) { const p = this.current(city); if (!p) return null; const d = ((this.dayMin - p.t) % 1440 + 1440) % 1440; return d >= p.iqama && d < p.iqama + 15 ? p : null; },
  // Gebet gilt für den Tag, an dem seine Zeit begann (Isha nach Mitternacht → Vortag)
  key(p) { const day = this.dayMin < p.t ? this.day - 1 : this.day; return day + ':' + p.id; },
  prayed(p) { return !!(p && state.prayed[this.key(p)]); },
  markPrayed(p) { state.prayed[this.key(p)] = 1; const keep = this.day - 2; for (const k of Object.keys(state.prayed)) if (+k.split(':')[0] < keep) delete state.prayed[k]; save(); },
  // 0 = Tag, 1 = Nacht (sanfte Übergänge um Sonnenauf-/-untergang)
  get night() { const h = this.hour, s = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); }; return Math.max(1 - s(5.6, 6.6, h), s(17.9, 18.8, h)); },
  save,
};
