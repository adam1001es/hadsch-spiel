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
