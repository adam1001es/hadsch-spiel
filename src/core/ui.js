const $ = (id) => document.getElementById(id);

// Alles, was der Spieler als Text/Knopf sieht.
export function createUI() {
  const el = { day: $('day'), title: $('title'), dots: $('dots'), counter: $('counter'), info: $('info'), actions: $('actions'), hold: $('hold'), toast: $('toast'), fade: $('fade') };
  let toastTimer = null;

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
    info(html) { el.info.innerHTML = html; },
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
    },
    hold(label) { el.hold.hidden = !label; if (label) el.hold.textContent = label; },
    toast(text, ms = 1800) {
      el.toast.textContent = text; el.toast.hidden = false;
      clearTimeout(toastTimer); toastTimer = setTimeout(() => (el.toast.hidden = true), ms);
    },
    fade(on) { el.fade.classList.toggle('on', on); return new Promise((r) => setTimeout(r, 470)); },
    prayer(p) { return `<div class="ar">${p.ar}</div><p class="tr">${p.tr}</p><p>${p.de}</p>`; },
    reset() { ui.info(''); ui.actions([]); ui.hold(null); ui.counter(''); },
  };
  return ui;
}
