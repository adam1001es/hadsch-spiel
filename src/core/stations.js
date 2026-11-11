import { STATIONS, TEXT } from '../content/hajj.js';
import * as tawaf from '../stations/tawaf.js';
import * as miqat from '../stations/miqat.js';
import * as sai from '../stations/sai.js';
import * as mina from '../stations/mina.js';
import * as arafat from '../stations/arafat.js';
import * as muzdalifa from '../stations/muzdalifa.js';
import * as jamarat from '../stations/jamarat.js';
import * as info from '../stations/info.js';

// Neue Stationen hier eintragen, sobald die Datei in src/stations/ existiert.
const IMPL = { tawaf, miqat, sai, mina, arafat, muzdalifa, jamarat };

// Pädagogischer Ablauf jeder Station:
// 1. Lernkarte „Worum geht es? Warum? Deine Aufgaben. Wusstest du?“
// 2. Beim allerersten Mal: kurzes Steuerungs-Training mit Zeigehinweisen
// 3. Station spielen – oben steht immer die aktuelle Aufgabe (Aufgabenliste mit Häkchen)
// 4. Lernkarte „Das hast du gelernt“ + Quizfrage, dann nächste Station
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* egal */ } } };

export function createStations(ctx) {
  let current = null, index = -1, paused = false, tutorial = null, busy = false;
  ctx.progress.quizOk = ctx.progress.quizOk || 0;
  ctx.progress.quizN = ctx.progress.quizN || 0;

  function makeMission(tasks) {
    const state = tasks.map(() => 'open');
    const render = () => ctx.ui.mission(tasks, state);
    render();
    return {
      // Aufgabe k erledigt; freiwillige (Sunnah) Aufgaben davor gelten als übersprungen
      done(k) {
        if (k >= state.length || state[k] === 'ok') return;
        state[k] = 'ok';
        for (let j = 0; j < k; j++) if (state[j] === 'open' && tasks[j].s) state[j] = 'skip';
        render();
      },
      skip(k) { if (state[k] === 'open') { state[k] = 'skip'; render(); } },
      finish() { state.forEach((x, j) => { if (x === 'open') state[j] = tasks[j].s ? 'skip' : 'ok'; }); render(); },
    };
  }

  // Steuerungs-Training (einmalig): gehen → umschauen → Lichtsäule folgen
  function startTutorial() {
    const C = TEXT.coach, touch = matchMedia('(pointer: coarse)').matches;
    const p0 = ctx.player.pos.clone(), yaw0 = ctx.input.yaw;
    let step = 0, t = 0;
    ctx.ui.coach(touch ? C.stickTouch : C.stickKeys, touch ? 'stick' : 'center', touch ? '👇' : '⌨️');
    return {
      update(dt) {
        t += dt;
        if (step === 0 && ctx.player.pos.distanceTo(p0) > 2.5) { step = 1; t = 0; ctx.ui.coach(touch ? C.lookTouch : C.lookKeys, touch ? 'look' : 'center', touch ? '👉' : '🖱️'); }
        else if (step === 1 && Math.abs(ctx.input.yaw - yaw0) > 0.7) { step = 2; t = 0; ctx.ui.coach(C.follow, 'center', '✨'); }
        else if (step === 2 && t > 5) { step = 3; ctx.ui.coach(null); ctx.ui.toast(C.great, 2200); store.set('hp-tutorial', '1'); return true; }
        return false;
      },
    };
  }

  async function go(i) {
    await ctx.ui.fade(true);
    current?.dispose?.();
    ctx.engine.clearWorld();
    ctx.sky.reset();
    ctx.input.reset();
    ctx.ui.reset();
    index = i; tutorial = null;
    if (i >= STATIONS.length) { current = info.ending(ctx); ctx.ui.fade(false); return; }
    const st = STATIONS[i];
    const L = TEXT.learn[i];
    ctx.ui.station(i, STATIONS.length, st);
    ctx.mission = makeMission(L.tasks);
    const impl = IMPL[st.id] || info;
    current = impl.create(ctx, st);
    current.update?.(0.016); // Kamera einmal setzen, damit die Szene hinter der Lernkarte sichtbar ist
    paused = true;
    ctx.ui.fade(false);
    await ctx.ui.learnIntro(L, i, STATIONS.length, st);
    paused = false;
    if (!store.get('hp-tutorial') && ctx.player) tutorial = startTutorial();
  }

  ctx.next = async () => {
    if (busy) return;
    busy = true;
    const st = STATIONS[index], L = TEXT.learn[index];
    if (st && L) {
      ctx.mission?.finish();
      paused = true;
      ctx.ui.prompt(null); ctx.ui.hold(null); ctx.ui.auto(false); ctx.ui.coach(null);
      const first = await ctx.ui.learnRecap(L, st);
      ctx.progress.quizN++; if (first) ctx.progress.quizOk++;
    }
    await go(index + 1);
    busy = false;
  };
  return {
    go,
    update(dt) {
      if (paused) return;
      current?.update?.(dt);
      if (tutorial && tutorial.update(dt)) tutorial = null;
    },
  };
}
