import { settings } from './i18n.js';

// Leistung/Akku: schwache oder volle Handys werden schnell warm und langsam.
// settings.gfx: 'auto' (Standard) | 'save' (Akku sparen) | 'nice' (volle Grafik).
// Im Modus „auto“ wird auf schwachen Geräten – oder wenn das Spiel dauerhaft ruckelt – der Sparmodus benutzt.
const AKEY = 'hp-gfx-auto';
const coarse = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
const mobile = coarse && Math.min(innerWidth, innerHeight) < 900;
const weak = (navigator.deviceMemory && navigator.deviceMemory <= 4) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);
let autoLow = false; try { autoLow = localStorage.getItem(AKEY) === 'low'; } catch { /* egal */ }
const mode = ['save', 'nice'].includes(settings.gfx) ? settings.gfx : 'auto';

export const perf = {
  mobile, mode,
  low: mode === 'save' || (mode === 'auto' && (autoLow || (mobile && weak))),
  get fpsCap() { return this.low ? 30 : 60; },           // Bilder pro Sekunde (auch 120-Hz-Displays nur 60 → weniger Wärme)
  // Spiel ruckelt dauerhaft trotz niedriger Auflösung → Sparmodus merken (nur im Modus „auto“)
  goLow() { if (this.low || mode !== 'auto') return false; this.low = true; try { localStorage.setItem(AKEY, 'low'); } catch { /* egal */ } return true; },
  resetAuto() { try { localStorage.removeItem(AKEY); } catch { /* egal */ } },
};
