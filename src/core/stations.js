import { STATIONS, TEXT } from '../content/hajj.js';
import * as tawaf from '../stations/tawaf.js';
import * as miqat from '../stations/miqat.js';
import * as sai from '../stations/sai.js';
import * as mina from '../stations/mina.js';
import * as arafat from '../stations/arafat.js';
import * as muzdalifa from '../stations/muzdalifa.js';
import * as jamarat from '../stations/jamarat.js';
import * as info from '../stations/info.js';
import * as kaabaInside from '../stations/kaabaInside.js';
import * as balloon from '../stations/balloon.js';
import * as meccaCity from '../stations/meccaCity.js';
import * as kaabaDoor from '../stations/kaabaDoor.js';
import * as drive from '../stations/drive.js';
import * as buildyard from '../stations/buildyard.js';
import { progressStore } from './progress.js';
import { createLife } from '../world/life.js';

// Neue Stationen hier eintragen, sobald die Datei in src/stations/ existiert.
const IMPL = { tawaf, miqat, sai, mina, arafat, muzdalifa, jamarat };
// Vögel/Flugzeug: draußen Wüstenvögel + Flugzeug, am Haram Tauben, drinnen nichts
const LIFE = { miqat: 'desert', mina: 'desert', arafat: 'desert', muzdalifa: 'desert', tawaf: 'haram' };

// Pädagogischer Ablauf jeder Station:
// 1. Lernkarte „Worum geht es? Warum? Deine Aufgaben. Wusstest du?“
// 2. Beim allerersten Mal: kurzes Steuerungs-Training mit Zeigehinweisen
// 3. Station spielen – oben steht immer die aktuelle Aufgabe (Aufgabenliste mit Häkchen)
// 4. Lernkarte „Das hast du gelernt“ + Quizfrage, dann nächste Station
const store = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch { /* egal */ } } };

export function createStations(ctx) {
  let life = null;
  let current = null, index = -1, paused = false, tutorial = null, busy = false;
  ctx.progress.quizOk = ctx.progress.quizOk || 0;
  ctx.progress.quizN = ctx.progress.quizN || 0;

  // Lernkarte an das Profil anpassen: Aufgaben-Variante für Spielerinnen (tf), Ansprache mit Namen
  function personal(L) {
    const f = ctx.profile?.gender === 'f', n = ctx.profile?.name || '';
    return { ...L, tasks: L.tasks.map((t) => ({ ...t, t: f && t.tf ? t.tf : t.t })), hello: TEXT.hello(n), well: TEXT.wellDone(n) };
  }

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

  let lastPlayed = -1; // zuletzt gespielte Station (in dieser Sitzung)

  // Quereinstieg: kurze Einordnung „Davor … · Danach …“
  function contextFor(i) {
    if (i === 0 || i === lastPlayed + 1) return '';
    const prev = STATIONS[i - 1], next = STATIONS[i + 1];
    const recap = TEXT.learn[i - 1].recap[0];
    return `Davor: <b>${i}. ${prev.title}</b> – ${recap}${next ? ` Danach: <b>${i + 2}. ${next.title}</b>.` : ''}`;
  }

  // Stationsauswahl über die Rauten oben im HUD
  ctx.ui.el.dots.addEventListener('click', async () => {
    if (paused || busy || index < 0) return;
    paused = true;
    const sel = await ctx.ui.chooser([...STATIONS, ...BONUS], index, progressStore.get().done);
    paused = false;
    if (sel == null) return;
    if (sel >= STATIONS.length) { BONUS[sel - STATIONS.length].go(); return; }
    if (sel !== index) { lastPlayed = -1; go(sel); }
  });

  // Erlebnis-Bereiche nach dem Hadsch: jederzeit über die Stationsauswahl erreichbar
  const BONUS = [
    { title: 'In der Kaaba', day: 'Belohnung', go: () => { index = STATIONS.length; ctx.reward(); } },
    { title: 'Die Straßen von Mekka und Medina', day: 'Erleben', go: () => { index = STATIONS.length; ctx.city(); } },
  ];
  ctx.bonus = BONUS;

  async function go(i) {
    await ctx.ui.fade(true);
    await ctx.ready; // Modelle (z. B. Pilgerinnen) fertig geladen
    current?.dispose?.(); life?.dispose(); life = null;
    ctx.engine.clearWorld();
    ctx.sky.reset();
    ctx.input.reset();
    ctx.ui.reset();
    index = i; tutorial = null; ctx.stationIndex = i; // für „Zusammen spielen“: wer ist in welcher Station
    if (i >= STATIONS.length) { paused = false; ctx.mission = null; current = info.ending(ctx); ctx.ui.fade(false); return; } // nach der letzten Lernkarte nicht pausiert lassen
    const st = STATIONS[i];
    const L = { ...personal(TEXT.learn[i]), context: contextFor(i) };
    ctx.ui.station(i, STATIONS.length, st);
    ctx.mission = makeMission(L.tasks);
    const impl = IMPL[st.id] || info;
    current = impl.create(ctx, st);
    life = createLife(ctx, { kind: LIFE[st.id] || 'none' });
    current.update?.(0.016); // Kamera einmal setzen, damit die Szene hinter der Lernkarte sichtbar ist
    paused = true;
    ctx.ui.fade(false);
    await ctx.ui.learnIntro(L, i, STATIONS.length, st);
    paused = false;
    if (!store.get('hp-tutorial') && ctx.player) tutorial = startTutorial();
  }

  // Belohnung nach dem Hadsch: in die Kaaba eintreten (und zurück zur Urkunde)
  async function scene(make) {
    await ctx.ui.fade(true);
    await ctx.ready;
    current?.dispose?.(); life?.dispose(); life = null;
    ctx.engine.clearWorld(); ctx.sky.reset(); ctx.input.reset(); ctx.ui.reset();
    paused = false; tutorial = null; ctx.mission = null;
    current = make(ctx); current.update?.(0.016);
    ctx.ui.fade(false);
  }
  // Kaaba: von außen (Tür öffnet sich) hinein, und wieder hinaus in die Straßen von Mekka
  ctx.reward = () => { ctx.stationIndex = 'kaaba'; return scene((c) => kaabaDoor.create(c, { dir: 'in', then: () => scene(kaabaInside.create) })); };
  ctx.leaveKaaba = () => scene((c) => kaabaDoor.create(c, { dir: 'out', then: () => ctx.city() }));
  ctx.balloon = (where = 'mecca') => { ctx.stationIndex = 'balloon'; return scene((c) => balloon.create(c, { where })); };
  ctx.city = (from, where = 'mecca') => { ctx.stationIndex = 'city-' + where; return scene((c) => meccaCity.create(c, { from, where })); };
  // Neue Bereiche des Lebensspiels erscheinen NICHT im Startmenü, sondern nur in der Welt (Wegweiser in Mekka/Medina)
  ctx.bauhof = (from = 'mecca') => { ctx.stationIndex = 'bauhof'; return scene((c) => buildyard.create(c, { from })); };
  ctx.drive = (from, to) => { ctx.stationIndex = 'drive'; return scene((c) => drive.create(c, { from, to })); };
  ctx.backToEnding = () => { ctx.stationIndex = STATIONS.length; return scene(info.ending); };

  ctx.next = async () => {
    if (busy) return;
    busy = true;
    const st = STATIONS[index], L = TEXT.learn[index] && personal(TEXT.learn[index]);
    if (st && L) {
      ctx.mission?.finish();
      paused = true;
      ctx.ui.prompt(null); ctx.ui.hold(null); ctx.ui.auto(false); ctx.ui.coach(null);
      const first = await ctx.ui.learnRecap(L, st);
      ctx.progress.quizN++; if (first) ctx.progress.quizOk++;
      progressStore.finish(index);
      lastPlayed = index;
    }
    await go(index + 1);
    busy = false;
  };
  return {
    go,
    update(dt) {
      if (paused) return;
      current?.update?.(dt);
      life?.update(dt);
      if (tutorial && tutorial.update(dt)) tutorial = null;
    },
  };
}
