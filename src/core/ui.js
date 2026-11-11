import { TEXT } from '../content/hajj.js';

const $ = (id) => document.getElementById(id);
// Einmalige Zeigehinweise (erster Aktionsknopf, erster Halte-Knopf) – im Browser gemerkt
const seen = (() => { try { return JSON.parse(localStorage.getItem('hp-coach') || '{}'); } catch { return {}; } })();
const markSeen = (k) => { seen[k] = 1; try { localStorage.setItem('hp-coach', JSON.stringify(seen)); } catch { /* egal */ } };

// Alles, was der Spieler als Text/Knopf sieht.
export function createUI() {
  const el = {
    day: $('day'), title: $('title'), dots: $('dots'), counter: $('counter'), info: $('info'), actions: $('actions'),
    hold: $('hold'), toast: $('toast'), fade: $('fade'), panel: $('panel'), prompt: $('prompt'), hint: $('hint'),
    goal: $('goal'), goalArrow: $('goalArrow'), goalText: $('goalText'), stick: $('stick'),
    panelToggle: $('panelToggle'), auto: $('autoBtn'),
    choice: $('choice'), choiceQ: $('choiceQ'), choiceOpts: $('choiceOpts'), choiceFb: $('choiceFb'),
    mission: $('mission'), learn: $('learn'), learnCard: $('learnCard'), coach: $('coach'), coachText: $('coachText'),
  };
  let toastTimer = null, hintTimer = null, promptFn = null, promptKey = '';

  // Höhe des unteren Panels als CSS-Variable, damit Joystick und Aktionsknopf darüber sitzen
  const hud = document.getElementById('hud');
  // Höhen von HUD und Zielpfeil → Infokarte sitzt direkt darunter
  const layout = () => {
    const root = document.documentElement.style;
    root.setProperty('--hudH', hud.offsetHeight + 'px');
    root.setProperty('--stackH', (hud.offsetHeight + (el.goal.hidden ? 0 : el.goal.offsetHeight + 4)) + 'px');
    const hasActions = el.actions.childElementCount > 0;
    el.panel.classList.toggle('has-actions', hasActions);
    el.panel.classList.toggle('empty', !hasActions && !el.info.textContent.trim());
    // „mehr“ nur zeigen, wenn der Text länger ist als die kompakte Karte
    const body = el.panel.querySelector('.panel-body');
    // Zugeklappt: nur eine Zeile (Aufgabe). Ohne Aufgabe (z. B. Endbildschirm) wird der Text gezeigt.
    const collapsed = el.panel.classList.contains('collapsed');
    el.panel.classList.toggle('no-mission', el.mission.hidden);
    el.panelToggle.hidden = collapsed;
    el.panelToggle.textContent = 'zuklappen ▴';
    void body;
  };
  // Infokarte antippen: auf-/zuklappen (nicht beim Tippen auf Knöpfe)
  el.panel.addEventListener('click', (e) => {
    if (e.target.closest('#actions button')) return;
    el.panel.classList.toggle('collapsed'); el.panel.classList.remove('unread'); layout();
  });
  new ResizeObserver(layout).observe(hud);
  window.addEventListener('resize', layout);

  el.prompt.addEventListener('click', () => { if (!seen.prompt) { markSeen('prompt'); ui.coach(null); } const f = promptFn; if (f) f(); });
  el.hold.addEventListener('pointerdown', () => { if (!seen.hold) { markSeen('hold'); ui.coach(null); } });
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'Enter' || e.code === 'KeyF') && !el.prompt.hidden && el.choice.hidden) { e.preventDefault(); el.prompt.click(); }
  });

  const ui = {
    el,
    station(index, total, st) {
      el.day.textContent = st.day;
      el.title.textContent = st.title;
      el.dots.innerHTML = '';
      for (let i = 0; i < total; i++) {
        const d = document.createElement('i');
        if (i < index) d.className = 'done'; else if (i === index) d.className = 'now';
        el.dots.appendChild(d);
      }
    },
    // Neuer Text: Karte bleibt klein, ein Punkt zeigt „neu“. Antippen öffnet sie.
    info(html) { if (el.info.innerHTML !== html) { el.info.innerHTML = html; if (html && el.panel.classList.contains('collapsed')) el.panel.classList.add('unread'); } layout(); },
    counter(text) { const t = text || ''; if (el.counter.textContent !== t) el.counter.textContent = t; },
    // items: [{ label, onClick, kind: 'primary' | 'sunnah' | '' }]
    actions(items = []) {
      el.actions.innerHTML = '';
      for (const it of items) {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = it.label;
        if (it.kind) b.className = it.kind;
        b.addEventListener('click', it.onClick);
        el.actions.appendChild(b);
      }
      layout();
    },
    // Halte-Knopf: für Handlungen, die Zeit brauchen (Gebet, Dua, Schlafen). label=null blendet aus.
    hold(label) {
      el.hold.hidden = !label; if (label) el.hold.textContent = label.replace(/^Halten: /, 'Halten:\n');
      document.body.classList.toggle('has-hold', !!label);
      if (label && !seen.hold) ui.coach(TEXT.coach.hold, 'hold', '👇');
      else if (!label && el.coach.className === 'hold') ui.coach(null);
    },
    // Autopilot-Knopf (optional): show=false blendet aus. onToggle(on) wird beim Antippen gerufen.
    auto(show, on = false, onToggle = null) {
      el.auto.hidden = !show;
      if (!show) return;
      el.auto.classList.toggle('on', on);
      el.auto.textContent = on ? '⏸ Selbst gehen' : '▶ Autopilot';
      if (onToggle) el.auto.onclick = () => onToggle();
    },
    // Aktionsknopf vor Ort. Gleicher key → kein Neuaufbau (verhindert Flackern im Frame-Loop).
    prompt(label, fn, { sunnah = false, key = label } = {}) {
      if (!label) { if (!el.prompt.hidden) { el.prompt.hidden = true; promptKey = ''; promptFn = null; if (el.coach.className === 'prompt') ui.coach(null); } return; }
      promptFn = fn;
      if (promptKey === key && !el.prompt.hidden) return;
      promptKey = key;
      if (!seen.prompt) ui.coach(TEXT.coach.prompt, 'prompt', '👇');
      el.prompt.textContent = label;
      el.prompt.classList.toggle('sunnah', sunnah);
      el.prompt.hidden = false;
    },
    // Ziel-Anzeige: Text + Pfeilwinkel (Radiant, 0 = geradeaus, positiv = rechts)
    goal(text, angle = null) {
      if (!text) { if (!el.goal.hidden) { el.goal.hidden = true; layout(); } return; }
      if (el.goal.hidden) { el.goal.hidden = false; layout(); }
      if (el.goalText.textContent !== text) el.goalText.textContent = text;
      el.goalArrow.style.display = angle == null ? 'none' : '';
      if (angle != null) el.goalArrow.style.transform = `rotate(${angle - Math.PI / 2}rad)`;
    },
    hint(text, ms = 2600) {
      el.hint.textContent = text; el.hint.hidden = false;
      clearTimeout(hintTimer); hintTimer = setTimeout(() => (el.hint.hidden = true), ms);
    },
    toast(text, ms = 1800) {
      el.toast.textContent = text; el.toast.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.toast.hidden = true), ms);
    },
    // Wissensfrage. options: [{ html, ok: bool, why: 'Erklärung' }]. Falsche Antworten werden erklärt, nicht bestraft.
    choice(question, options, { done = 'Weiter' } = {}) {
      return new Promise((resolve) => {
        el.choiceQ.innerHTML = question;
        el.choiceOpts.innerHTML = '';
        el.choiceFb.innerHTML = '';
        el.choiceFb.hidden = true;
        el.choice.hidden = false;
        let tries = 0;
        options.forEach((o) => {
          const b = document.createElement('button');
          b.type = 'button'; b.innerHTML = o.html;
          b.addEventListener('click', () => {
            tries++;
            el.choiceFb.hidden = false;
            el.choiceFb.innerHTML = o.why || (o.ok ? 'Richtig.' : 'Nicht ganz – versuch es noch einmal.');
            if (o.ok) {
              b.className = 'ok';
              [...el.choiceOpts.children].forEach((c) => { if (c !== b) { c.disabled = true; c.classList.add('done'); } });
              const go = document.createElement('button');
              go.type = 'button'; go.className = 'primary'; go.textContent = done; go.style.marginTop = '10px';
              go.addEventListener('click', () => { el.choice.hidden = true; resolve({ ...o, tries }); });
              el.choiceFb.appendChild(document.createElement('br'));
              el.choiceFb.appendChild(go);
              go.focus();
            } else {
              b.className = 'no'; b.disabled = true;
            }
          });
          el.choiceOpts.appendChild(b);
        });
      });
    },
    // Reihenfolge-Rätsel: Teile in der richtigen Reihenfolge antippen.
    order(question, parts) {
      return new Promise((resolve) => {
        el.choiceQ.innerHTML = question;
        el.choiceOpts.innerHTML = '';
        el.choiceFb.hidden = false;
        el.choiceFb.innerHTML = '';
        el.choice.hidden = false;
        let next = 0;
        const shuffled = parts.map((p, i) => ({ p, i })).sort(() => Math.random() - 0.5);
        if (shuffled.every((s, k) => s.i === k)) shuffled.reverse();
        for (const s of shuffled) {
          const b = document.createElement('button');
          b.type = 'button'; b.innerHTML = s.p;
          b.addEventListener('click', () => {
            if (s.i === next) {
              b.className = 'ok'; b.disabled = true; next++;
              el.choiceFb.innerHTML += (next > 1 ? ' · ' : '') + s.p.replace(/<[^>]+>/g, ' ');
              if (next === parts.length) {
                const go = document.createElement('button');
                go.type = 'button'; go.className = 'primary'; go.textContent = 'Weiter'; go.style.marginTop = '10px'; go.style.display = 'block';
                go.addEventListener('click', () => { el.choice.hidden = true; resolve(); });
                el.choiceFb.appendChild(go);
              }
            } else { b.classList.remove('no'); void b.offsetWidth; b.classList.add('no'); setTimeout(() => b.classList.remove('no'), 400); }
          });
          el.choiceOpts.appendChild(b);
        }
      });
    },
    fade(on) { el.fade.classList.toggle('on', on); return new Promise((r) => setTimeout(r, 470)); },
    prayer(p) { return `<div class="ar">${p.ar}</div><p class="tr">${p.tr}</p><p>${p.de}</p>`; },
    // Aufgabenliste: tasks [{t, s}], state: Array 'open' | 'ok' | 'skip'. Zeigt die aktuelle Aufgabe oben in der Infokarte.
    mission(tasks, state) {
      if (!tasks) { el.mission.hidden = true; el.mission.innerHTML = ''; layout(); return; }
      const curAny = state.findIndex((x) => x === 'open');
      const doneN = state.filter((x) => x !== 'open').length;
      const now = curAny < 0 ? 'Alles erledigt ✓' : tasks[curAny].t + (tasks[curAny].s ? ' (Sunnah)' : '');
      el.mission.hidden = false;
      el.mission.innerHTML = `<span class="tag">Aufgabe</span><span>${now}</span><span class="n">${doneN}/${tasks.length} <i class="more">▾</i></span>`;
      let list = el.panel.querySelector('.task-list');
      if (!list) { list = document.createElement('ol'); list.className = 'task-list'; el.mission.after(list); }
      list.innerHTML = tasks.map((t, i) => `<li class="${state[i] === 'ok' ? 'ok' : state[i] === 'skip' ? 'skip' : i === curAny ? 'now' : ''}">${state[i] === 'ok' ? '✓' : state[i] === 'skip' ? '–' : i === curAny ? '▶' : '○'} ${t.t}${t.s ? ' <span class="s">Sunnah</span>' : ''}</li>`).join('');
      layout();
    },
    // Lernkarte vor der Station: Worum geht es? Warum? Aufgaben, Wusstest du?
    learnIntro(L, idx, total, st) {
      return new Promise((resolve) => {
        el.learnCard.innerHTML = `${idx === 0 && L.hello ? `<p class="hello">${L.hello} Schön, dass du dabei bist.</p>` : ''}<div class="k">Station ${idx + 1} von ${total} · ${st.day}</div><h2>${st.title}</h2>
          <h3>Worum geht es?</h3><p>${L.what}</p>
          <h3>Warum?</h3><p>${L.why}</p>
          <h3>Deine Aufgaben</h3><ol>${L.tasks.map((t) => `<li>${t.t}${t.s ? ' <span class="s">· Sunnah (freiwillig)</span>' : ''}</li>`).join('')}</ol>
          <div class="fact"><b>Wusstest du?</b> ${L.fact}</div>
          <button class="primary go" type="button">Los geht's</button>`;
        el.learn.hidden = false;
        const go = el.learnCard.querySelector('.go');
        go.addEventListener('click', () => { el.learn.hidden = true; resolve(); });
        el.learnCard.scrollTop = 0;
      });
    },
    // Lernkarte nach der Station: Zusammenfassung + eine Quizfrage. Gibt true zurück, wenn beim ersten Versuch richtig.
    learnRecap(L, st) {
      return new Promise((resolve) => {
        el.learnCard.innerHTML = `<div class="k">Geschafft · ${st.title} ✓</div><h2>${L.well || 'Gut gemacht!'}</h2><p>Das hast du gelernt:</p>
          <ul>${L.recap.map((r) => `<li>${r}</li>`).join('')}</ul>
          <h3>Quiz</h3><p><b>${L.quiz.q}</b></p><div class="quiz"></div><p class="fb" hidden></p>`;
        el.learn.hidden = false;
        el.learnCard.scrollTop = 0;
        const box = el.learnCard.querySelector('.quiz'), fb = el.learnCard.querySelector('.fb');
        let tries = 0;
        [...L.quiz.o].sort(() => Math.random() - 0.5).forEach((o) => {
          const b = document.createElement('button'); b.type = 'button'; b.innerHTML = o.html;
          b.addEventListener('click', () => {
            tries++; fb.hidden = false; fb.textContent = o.why;
            if (!o.ok) { b.className = 'no'; b.disabled = true; return; }
            b.className = 'ok';
            [...box.children].forEach((c) => (c.disabled = true));
            const go = document.createElement('button'); go.type = 'button'; go.className = 'primary go'; go.textContent = 'Weiter zur nächsten Station';
            go.addEventListener('click', () => { el.learn.hidden = true; resolve(tries === 1); });
            el.learnCard.appendChild(go); go.scrollIntoView({ block: 'nearest' });
          });
          box.appendChild(b);
        });
      });
    },
    // Zeigehinweis (Steuerungs-Training). where: 'stick' | 'look' | 'hold' | 'prompt' | 'center'
    coach(text, where = 'center', hand = '👆') {
      if (!text) { el.coach.hidden = true; return; }
      el.coach.className = where; el.coachText.textContent = text;
      el.coach.querySelector('#coachHand').textContent = hand;
      el.coach.hidden = false;
    },
    reset() {
      ui.mission(null); ui.coach(null); el.learn.hidden = true;
      ui.info(''); ui.actions([]); ui.hold(null); ui.counter(''); ui.prompt(null); ui.goal(null); ui.auto(false);
      el.hint.hidden = true; el.choice.hidden = true; el.stick.classList.remove('off');
    },
  };
  return ui;
}
