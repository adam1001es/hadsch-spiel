// Lernfortschritt im Browser merken (nur lokal): welche Stationen erledigt sind und wo es weitergeht.
const KEY = 'hp-progress';
function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } }
function write(p) { try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* egal */ } }

export const progressStore = {
  // { done: [Indizes], next: Index der nächsten Station }
  get() { const p = read(); return { done: Array.isArray(p.done) ? p.done : [], next: Number.isInteger(p.next) ? p.next : 0 }; },
  finish(i) { const p = this.get(); if (!p.done.includes(i)) p.done.push(i); p.next = i + 1; write(p); },
  reset() { write({ done: [], next: 0 }); },
};

// Freischaltung (nur lokal): Die „Straßen von Mekka und Medina“ (Lebensspiel) sind 15 Minuten zum Ausprobieren frei,
// danach erst nach einem erfolgreich abgeschlossenen Hadsch (oder mit dem Code von der Urkunde).
// Die Überraschung „In der Kaaba“ gibt es nur einmal – nach dem ersten erfolgreichen Hadsch.
const UKEY = 'hp-unlock';
export const TRIAL_SECONDS = 15 * 60;
const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // ohne 0/O und 1/I, damit man den Code leicht abschreiben kann
const sum = (s) => { let h = 7; for (const ch of s + 'hadsch-mabrur') h = (h * 31 + ch.charCodeAt(0)) >>> 0; return ABC[h % 32] + ABC[(h >>> 5) % 32]; };
function uread() { try { return JSON.parse(localStorage.getItem(UKEY) || '{}'); } catch { return {}; } }
function uwrite(u) { try { localStorage.setItem(UKEY, JSON.stringify(u)); } catch { /* egal */ } }

export const unlockStore = {
  get() { const u = uread(); return { hajj: !!u.hajj, codes: Array.isArray(u.codes) ? u.codes : [], trial: +u.trial || 0, kaabaPending: !!u.kaabaPending, kaabaUsed: !!u.kaabaUsed }; },
  unlocked() { return this.get().hajj; },
  trialLeft() { return Math.max(0, TRIAL_SECONDS - this.get().trial); },
  addTrial(sec) { const u = this.get(); u.trial = Math.min(TRIAL_SECONDS, u.trial + sec); uwrite(u); return TRIAL_SECONDS - u.trial; },
  // Lebensspiel betreten erlaubt?
  cityAllowed() { return this.unlocked() || this.trialLeft() > 0; },
  // Hadsch erfolgreich abgeschlossen: neuen Code erzeugen, freischalten, Kaaba-Überraschung (einmalig) bereitstellen
  complete() {
    const u = this.get();
    let r = ''; for (let i = 0; i < 6; i++) r += ABC[Math.floor(Math.random() * 32)];
    const code = `${r.slice(0, 4)}-${r.slice(4)}${sum(r)}`;
    u.hajj = true; u.codes.push(code); if (!u.kaabaUsed) u.kaabaPending = true; uwrite(u);
    return code;
  },
  lastCode() { const c = this.get().codes; return c[c.length - 1] || ''; },
  // Code von der Urkunde prüfen (z. B. auf einem anderen Gerät) – schaltet nur die Straßen frei, nicht die Kaaba-Überraschung
  redeem(text) {
    const s = String(text || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (s.length !== 8 || [...s].some((ch) => !ABC.includes(ch)) || sum(s.slice(0, 6)) !== s.slice(6)) return false;
    const u = this.get(); u.hajj = true; const code = `${s.slice(0, 4)}-${s.slice(4)}`; if (!u.codes.includes(code)) u.codes.push(code); uwrite(u); return true;
  },
  kaabaPending() { return this.get().kaabaPending; },
  useKaaba() { const u = this.get(); u.kaabaPending = false; u.kaabaUsed = true; uwrite(u); },
};
