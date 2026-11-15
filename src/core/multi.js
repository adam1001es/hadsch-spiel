// Zusammen spielen: Schüler verbinden sich selbst über einen Raum-Code (4 Ziffern) und sehen sich gegenseitig als Pilger.
// Technik: PeerJS (WebRTC). Ein öffentlicher Vermittlungsdienst stellt nur die Verbindung her, die Spieldaten gehen danach
// direkt von Gerät zu Gerät. Wer den Raum erstellt, ist „Gastgeber“ und leitet die Positionen an alle weiter (max. 8 Spieler).
// Übertragen wird NUR: Station, Position, Blickrichtung, Haltung, Kleidungs-/Hautfarbe. Keine Namen, kein Chat, kein Konto.
import * as THREE from 'three';
import { createFigure } from './player.js';
import { peopleModels } from '../world/crowd.js';

const PREFIX = 'hadschpfad-raum-', MAX = 8, RATE = 0.12;
const COLORS = ['#e6c46e', '#5fb3e6', '#e67a5f', '#8fd16a', '#c78fe6', '#e6e05f', '#5fe6c4', '#e65fa8'];

export function createMulti(ctx) {
  let Peer = null, peer = null, host = false, code = '', myNum = 0, conns = new Map(), hostConn = null;
  let states = {}; // peerId → { s, x, z, h, p, c, k, f, n }
  const figs = new Map(); // peerId → { fig, world, x, z, h, badge }
  let sendT = 0, listT = 0, onChange = () => {};

  // Vermittlungsdienst: Standard = öffentlicher PeerJS-Dienst; zum Testen ?peer=localhost:9000
  const opts = () => { const m = location.search.match(/[?&]peer=([^&:]+):(\d+)/); return m ? { host: m[1], port: +m[2], path: '/', secure: false } : {}; };
  const load = async () => (Peer ||= (await import('peerjs')).Peer);

  function myState() {
    const p = ctx.player; if (!p || ctx.stationIndex == null || ctx.stationIndex === 'balloon') return null;
    return { s: ctx.stationIndex, x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), h: +p.fig.root.rotation.y.toFixed(2), p: p.fig.poseName || 'stand',
      c: p.fig.cloth.color.getHex(), k: p.fig.skinM.color.getHex(), f: ctx.profile?.gender === 'f' ? 1 : 0, n: myNum };
  }
  const status = () => ({ on: !!peer && (host || !!hostConn), host, code, me: myNum, others: Object.entries(states).map(([id, s]) => ({ id, ...s })) });
  const changed = () => onChange(status());

  function leave(msg) {
    try { peer?.destroy(); } catch { /* egal */ }
    peer = null; hostConn = null; conns.clear(); states = {}; host = false; code = ''; myNum = 0;
    for (const f of figs.values()) f.world.remove(f.fig.root);
    figs.clear(); changed();
    if (msg) ctx.ui.toast(msg, 3000);
  }

  async function create() {
    const P = await load(); leave();
    code = String(1000 + Math.floor(Math.random() * 9000));
    peer = new P(PREFIX + code, opts()); host = true; myNum = 1;
    peer.on('open', () => { changed(); ctx.ui.toast('Raum ' + code + ' erstellt', 2500); });
    peer.on('disconnected', () => { try { peer?.reconnect(); } catch { /* egal */ } }); // Vermittlung kurz weg (z. B. Handy im Hintergrund)
    peer.on('error', (e) => { if (e.type === 'unavailable-id') create(); else leave('Verbindung nicht möglich (' + e.type + ')'); });
    peer.on('connection', (c) => {
      c.on('open', () => {
        if (conns.size >= MAX - 1) { c.send({ t: 'full' }); setTimeout(() => c.close(), 300); return; }
        const used = new Set([1, ...[...conns.values()].map((x) => x.n)]); let n = 2; while (used.has(n)) n++;
        conns.set(c.peer, { c, n }); c.send({ t: 'hello', n }); changed(); ctx.ui.toast('Pilger ' + n + ' ist dabei', 2000);
      });
      c.on('data', (d) => { if (d?.t === 'st' && conns.has(c.peer)) { states[c.peer] = { ...d.st, n: conns.get(c.peer).n }; } });
      c.on('close', () => { const had = conns.get(c.peer); conns.delete(c.peer); delete states[c.peer]; changed(); if (had) ctx.ui.toast('Pilger ' + had.n + ' hat den Raum verlassen', 2000); });
    });
    changed();
  }

  async function join(c) {
    c = String(c || '').replace(/\D/g, '');
    if (c.length !== 4) { ctx.ui.toast('Bitte den 4-stelligen Raum-Code eingeben', 2500); return; }
    const P = await load(); leave();
    code = c; peer = new P(undefined, opts());
    peer.on('error', (e) => leave(e.type === 'peer-unavailable' ? 'Raum ' + c + ' nicht gefunden' : 'Verbindung nicht möglich (' + e.type + ')'));
    peer.on('open', () => {
      hostConn = peer.connect(PREFIX + c);
      hostConn.on('data', (d) => {
        if (d?.t === 'hello') { myNum = d.n; changed(); ctx.ui.toast('Verbunden mit Raum ' + c + ' – du bist Pilger ' + d.n, 3000); }
        else if (d?.t === 'full') leave('Raum ist voll (max. 8)');
        else if (d?.t === 'all') { delete d.all[peer.id]; states = d.all; }
      });
      hostConn.on('close', () => { if (peer) leave('Der Raum wurde beendet'); });
    });
    changed();
  }

  function badge(n) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = COLORS[(n - 1) % COLORS.length]; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
    g.fillStyle = '#14251f'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(n), 32, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(0.42, 0.42, 1); s.position.y = 2.15; s.renderOrder = 10; return s;
  }

  return {
    create, join, leave: () => leave(), status,
    set onChange(fn) { onChange = fn; },
    update(dt) {
      if (!peer) return;
      // Liste (wer ist wo) einmal pro Sekunde aktualisieren
      listT += dt; if (listT > 1) { listT = 0; changed(); }
      // senden
      sendT += dt;
      if (sendT > RATE) {
        sendT = 0; const me = myState();
        if (host) { const all = { ...states }; if (me) all[peer.id] = me; for (const { c } of conns.values()) if (c.open) c.send({ t: 'all', all }); }
        else if (hostConn?.open && me) hostConn.send({ t: 'st', st: me });
      }
      // Mitspieler in derselben Station zeigen (weich nachgeführt)
      const world = ctx.engine.world;
      for (const [id, f] of figs) if (!states[id] || f.world !== world || states[id].s !== ctx.stationIndex) { f.world.remove(f.fig.root); figs.delete(id); }
      for (const [id, s] of Object.entries(states)) {
        if (s.s !== ctx.stationIndex || !ctx.player) continue;
        let f = figs.get(id);
        if (!f) {
          const fig = createFigure(world, { color: s.c, covered: !!s.f, ring: false, models: peopleModels() });
          fig.skinM.color.setHex(s.k); const b = badge(s.n); fig.root.add(b);
          f = { fig, world, x: s.x, z: s.z, h: s.h, c: s.c }; figs.set(id, f);
        }
        if (f.c !== s.c) { f.fig.setColor(s.c); f.c = s.c; }
        const k = Math.min(1, dt * 8), ox = f.x, oz = f.z;
        f.x += (s.x - f.x) * k; f.z += (s.z - f.z) * k;
        f.h += Math.atan2(Math.sin(s.h - f.h), Math.cos(s.h - f.h)) * k;
        const v = Math.hypot(f.x - ox, f.z - oz) / Math.max(dt, 1e-3);
        f.fig.pose(v > 0.3 ? 'walk' : s.p === 'walk' ? 'stand' : s.p);
        f.fig.root.position.set(f.x, s.y ?? ctx.player.pos.y, f.z); f.fig.root.rotation.y = f.h;
        f.fig.update(dt, v / 1.6);
      }
    },
  };
}
