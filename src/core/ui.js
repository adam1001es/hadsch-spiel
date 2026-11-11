const $ = (id) => document.getElementById(id);

// Alles, was der Spieler als Text/Knopf sieht.
export function createUI() {
  const el = {
    day: $('day'), title: $('title'), dots: $('dots'), counter: $('counter'), info: $('info'), actions: $('actions'),
    hold: $('hold'), toast: $('toast'), fade: $('fade'), panel: $('panel'), prompt: $('prompt'), hint: $('hint'),
    goal: $('goal'), goalArrow: $('goalArrow'), goalText: $('goalText'), stick: $('stick'),
    choice: $('choice'), choiceQ: $('choiceQ'), choiceOpts: $('choiceOpts'), choiceFb: $('choiceFb'),
  };
  let toastTimer = null, hintTimer = null, promptFn = null, promptKey = '';

  // Höhe des unteren Panels als CSS-Variable, damit Joystick und Aktionsknopf darüber sitzen
  const layout = () => document.documentElement.style.setProperty('--panelH', el.panel.offsetHeight + 'px');
  new ResizeObserver(layout).observe(el.panel);
  window.addEventListener('resize', layout);

  el.prompt.addEventListener('click', () => { const f = promptFn; if (f) f(); });
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
    info(html) { el.info.innerHTML = html; layout(); },
    counter(text) { el.counter.textContent = text || ''; },
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
    hold(label) { el.hold.hidden = !label; if (label) el.hold.textContent = label; layout(); },
    // Aktionsknopf vor Ort. Gleicher key → kein Neuaufbau (verhindert Flackern im Frame-Loop).
    prompt(label, fn, { sunnah = false, key = label } = {}) {
      if (!label) { if (!el.prompt.hidden) { el.prompt.hidden = true; promptKey = ''; promptFn = null; } return; }
      promptFn = fn;
      if (promptKey === key && !el.prompt.hidden) return;
      promptKey = key;
      el.prompt.textContent = label;
      el.prompt.classList.toggle('sunnah', sunnah);
      el.prompt.hidden = false;
    },
    // Ziel-Anzeige: Text + Pfeilwinkel (Radiant, 0 = geradeaus, positiv = rechts)
    goal(text, angle = null) {
      if (!text) { el.goal.hidden = true; return; }
      el.goal.hidden = false;
      if (el.goalText.textContent !== text) el.goalText.textContent = text;
      el.goalArrow.style.visibility = angle == null ? 'hidden' : 'visible';
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
        options.forEach((o) => {
          const b = document.createElement('button');
          b.type = 'button'; b.innerHTML = o.html;
          b.addEventListener('click', () => {
            el.choiceFb.hidden = false;
            el.choiceFb.innerHTML = o.why || (o.ok ? 'Richtig.' : 'Nicht ganz – versuch es noch einmal.');
            if (o.ok) {
              b.className = 'ok';
              [...el.choiceOpts.children].forEach((c) => { if (c !== b) { c.disabled = true; c.classList.add('done'); } });
              const go = document.createElement('button');
              go.type = 'button'; go.className = 'primary'; go.textContent = done; go.style.marginTop = '10px';
              go.addEventListener('click', () => { el.choice.hidden = true; resolve(o); });
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
    reset() {
      ui.info(''); ui.actions([]); ui.hold(null); ui.counter(''); ui.prompt(null); ui.goal(null);
      el.hint.hidden = true; el.choice.hidden = true; el.stick.classList.remove('off');
    },
  };
  return ui;
}
