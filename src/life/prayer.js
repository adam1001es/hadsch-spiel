import { clock } from './clock.js';
import { ADHAN, PRAYER_UI as U } from '../content/life.js';
import { holdAction, rakatSteps } from '../core/kit.js';
import { settings } from '../core/i18n.js';
import * as sfx from '../core/sfx.js';

// Gebetszeiten im Lebensspiel: Spieluhr laufen lassen (Tag/Nacht), Adhan zur Gebetszeit, Iqama-Hinweis, Beten als Halte-Handlung
// (Figur dreht sich zur Qibla und geht Stehen/Ruku'/Sujud durch). Orte zum Beten werden mit interact.add({ ...prayer.spot(...) })
// angemeldet; sie leuchten nur, wenn gerade ein Gebet fällig ist, das man noch nicht gebetet hat.
// Adhan-Aufnahme: public/assets/audio/adhan.mp3 (falls vorhanden), sonst ein leiser Hinweiston.
let adhanFile = null; // Promise<bool>
const hasAdhan = () => (adhanFile ||= fetch('./assets/audio/adhan.mp3', { method: 'HEAD' }).then((r) => r.ok && /audio|mpeg|octet/.test(r.headers.get('content-type') || 'audio')).catch(() => false));
let adhanAudio = null;

export function adhanHtml(p) {
  const rows = ADHAN.lines.filter((l) => !l[3] || l[3] === p?.id).map(([ar, tr, de]) => `<div class="ar">${ar}</div><p class="tr">${tr}</p><p>${de}</p>`).join('');
  return `<p><b>${U.adhanHead(p)}</b></p>${rows}<p class="small">${ADHAN.source}</p>`;
}

export function createPrayer(ctx, { city = 'mecca', player, qibla, lights = true }) {
  const { ui, sky } = ctx;
  let prev = clock.dayMin, act = null, actP = null, interact = null;
  const due = () => { const p = clock.current(city); return p && !clock.prayed(p) ? p : null; };
  function adhan(p) {
    ui.toast(U.adhanToast(p), 4000);
    ui.info(adhanHtml(p));
    if (!settings.voice) return;
    hasAdhan().then((ok) => {
      if (ok) { try { adhanAudio?.pause(); adhanAudio = new Audio('./assets/audio/adhan.mp3'); adhanAudio.volume = 0.8; adhanAudio.play().catch(() => sfx.chime()); } catch { sfx.chime(); } }
      else sfx.chime();
    });
  }
  function start(p) {
    if (act || !p) return;
    const q = qibla(player.pos.x, player.pos.z);
    player.heading = Math.atan2(q.x - player.pos.x, q.z - player.pos.z); // zur Qibla drehen
    actP = p; if (interact) interact.enabled = false; ui.prompt(null);
    act = holdAction(ctx, player, { label: U.hold, steps: rakatSteps(p.rakat, 0.55) });
  }
  const api = {
    get due() { return due(); },
    get jamaah() { return clock.jamaah(city); },
    get busy() { return !!act; },
    set interact(i) { interact = i; },
    start, adhanHtml,
    // Ort zum Beten (für interact.add): leuchtet nur, wenn ein Gebet fällig ist
    spot(o) { return { color: 'gold', radius: 9, near: 3, ...o, label: () => (due() ? U.pray(due()) : ''), when: () => !!due() && !act, run: () => start(due()) }; },
    update(dt) {
      clock.advance(dt);
      if (lights) { sky.state.artificial = 0.85; sky.setHour(clock.hour); }
      const now = clock.dayMin;
      for (const p of clock.prayers(city)) {
        const crossed = (a, b, t) => (a <= b ? a < t && t <= b : a < t || t <= b);
        if (crossed(prev, now, p.t)) adhan(p);
        if (crossed(prev, now, (p.t + p.iqama) % 1440)) ui.toast(U.iqama(p), 3500);
      }
      prev = now;
      if (act) {
        act.update(dt);
        if (act.done) { if (act.progress >= 1) { clock.markPrayed(actP); ui.toast(U.prayed(actP), 3000); } act = null; actP = null; if (interact) interact.enabled = true; }
      }
    },
    dispose() { act?.cancel(); act = null; try { adhanAudio?.pause(); } catch { /* egal */ } },
  };
  return api;
}
