// Geldbörse im Lebensspiel (Saudi-Riyal, SAR): verdient mit Jobs, ausgegeben in den Läden. Gespeichert auf dem Gerät.
// Kein Glücksspiel, keine Zinsen – nur ehrliche Arbeit und Einkaufen.
const KEY = 'hp-wallet';
const load = () => { try { const o = JSON.parse(localStorage.getItem(KEY) || 'null'); if (o && o.v === 1) return o; } catch { /* egal */ } return { v: 1, sar: 50, owned: [], earned: 0, jobs: 0 }; };
let st = load();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch { /* egal */ } };
let pill = null;
function render(delta = 0) {
  if (!pill) return;
  pill.querySelector('b').textContent = st.sar.toLocaleString('de-DE');
  if (delta) { const d = document.createElement('i'); d.textContent = (delta > 0 ? '+' : '') + delta; d.className = delta > 0 ? 'plus' : 'minus'; pill.appendChild(d); setTimeout(() => d.remove(), 1600); }
}
export const wallet = {
  get sar() { return st.sar; },
  get jobs() { return st.jobs; },
  add(n) { st.sar += n; st.earned += n; st.jobs++; save(); render(n); },
  spend(n) { if (st.sar < n) return false; st.sar -= n; save(); render(-n); return true; },
  owns: (id) => st.owned.includes(id),
  own(id) { if (!st.owned.includes(id)) { st.owned.push(id); save(); } },
  owned: (prefix) => st.owned.filter((o) => o.startsWith(prefix)),
  // Anzeige oben rechts unter der Karte (nur in Mekka/Medina)
  show(on) {
    if (on && !pill) { pill = document.createElement('div'); pill.id = 'wallet'; pill.innerHTML = '💰 <b></b> SAR'; document.body.appendChild(pill); render(); }
    if (!on && pill) { pill.remove(); pill = null; }
  },
};
