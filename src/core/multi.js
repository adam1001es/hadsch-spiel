// Zusammen spielen: Schüler verbinden sich selbst über einen Raum-Code (4 Ziffern) und sehen sich gegenseitig als Pilger.
// Technik: öffentlicher MQTT-Nachrichtendienst über WebSocket (HiveMQ). Max. 8 Spieler pro Raum.
// Übertragen wird NUR: Station, Position, Blickrichtung, Haltung, Kleidungs-/Hautfarbe. Keine Namen, kein Chat, kein Konto.
import * as THREE from 'three';
import { createFigure } from './player.js';
import { peopleModels } from '../world/crowd.js';

const MAX = 8, RATE = 0.15;
const COLORS = ['#e6c46e', '#5fb3e6', '#e67a5f', '#8fd16a', '#c78fe6', '#e6e05f', '#5fe6c4', '#e65fa8'];

export function createMulti(ctx) {
  // Verbindung über einen öffentlichen MQTT-Nachrichtendienst (WebSocket, funktioniert auch im Mobilfunk und in Schul-WLANs,
  // wo direkte Gerät-zu-Gerät-Verbindungen oft blockiert sind). Jeder sendet seinen Zustand an „hadsch3d/<Code>/<id>“
  // und empfängt die der anderen. Zum Testen: ?mqtt=ws://127.0.0.1:8888
  const BROKER = (location.search.match(/[?&]mqtt=([^&]+)/) || [])[1] || 'wss://broker.hivemq.com:8884/mqtt';
  const TOPIC = 'hadsch3d-v1/';
  let client = null, host = false, code = '', myNum = 0, myId = '', joinedAt = 0, connected = false;
  let states = {}; // id → { s, x, z, h, p, c, k, f, n, t }
  const seen = {}; // id → letzte Nachricht (ms)
  const figs = new Map(); // id → { fig, world, x, z, h }
  let sendT = 0, listT = 0, onChange = () => {}, lookT = 0;
  const load = async () => (await import('mqtt')).default;

  function myState() {
    const base = { n: myNum, j: joinedAt };
    if (ctx.stationIndex === 'balloon' || ctx.stationIndex === 'drive') return { ...base, s: ctx.stationIndex }; // nur „wo bin ich“
    const p = ctx.player; if (!p || ctx.stationIndex == null) return { ...base, s: null };
    return { ...base, s: ctx.stationIndex, x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), h: +p.fig.root.rotation.y.toFixed(2), p: p.fig.poseName || 'stand',
      c: p.fig.cloth.color.getHex(), k: p.fig.skinM.color.getHex(), f: ctx.profile?.gender === 'f' ? 1 : 0 };
  }
  const status = () => ({ on: connected && myNum > 0, host, code, me: myNum, others: Object.entries(states).filter(([, s]) => s.n).map(([id, s]) => ({ id, ...s })) });
  const changed = () => onChange(status());

  function leave(msg) {
    try { if (client && myId) client.publish(TOPIC + code + '/' + myId, '', { retain: false }); client?.end(true); } catch { /* egal */ }
    client = null; connected = false; states = {}; host = false; code = ''; myNum = 0;
    for (const f of figs.values()) f.world.remove(f.fig.root);
    figs.clear(); changed();
    if (msg) ctx.ui.toast(msg, 3000);
  }

  async function start(c, asHost) {
    let mqtt; try { mqtt = await load(); } catch { ctx.ui.toast('Verbindung nicht möglich', 3000); return; }
    leave();
    code = c; host = asHost; myNum = 0; joinedAt = Date.now(); myId = Math.random().toString(36).slice(2, 10);
    changed();
    client = mqtt.connect(BROKER, { clientId: 'h3d_' + myId, clean: true, connectTimeout: 10000, reconnectPeriod: 3000, keepalive: 30 });
    client.on('connect', () => {
      connected = true;
      client.subscribe(TOPIC + code + '/+');
      // kurz zuhören, dann die kleinste freie Nummer nehmen (Ersteller bekommt 1)
      lookT = asHost ? 0 : performance.now() + 1600; // Echtzeit
      if (asHost) { myNum = 1; ctx.ui.toast('Raum ' + code + ' erstellt', 2500); }
      changed();
    });
    client.on('message', (topic, buf) => {
      const id = topic.slice(topic.lastIndexOf('/') + 1); if (id === myId) return;
      if (!buf.length) { delete states[id]; delete seen[id]; return; }
      try { const st = JSON.parse(buf.toString()); const isNew = !states[id]; states[id] = st; seen[id] = Date.now();
        if (isNew && st.n && myNum) ctx.ui.toast('Pilger ' + st.n + ' ist dabei', 2000);
        // gleiche Nummer? Wer später kam, wählt neu
        if (myNum && st.n === myNum && (st.j < joinedAt || (st.j === joinedAt && id < myId))) { myNum = 0; lookT = performance.now() + 300; }
      } catch { /* ungültig */ }
    });
    client.on('error', () => { /* mqtt verbindet selbst neu */ });
    const cl = client; setTimeout(() => { if (client === cl && !connected) ctx.ui.toast('Noch keine Verbindung – bitte Internet prüfen', 3500); }, 12000);
    client.on('offline', () => { connected = false; changed(); });
    client.on('reconnect', () => changed());
  }

  const create = () => start(String(1000 + Math.floor(Math.random() * 9000)), true);
  function join(c) {
    c = String(c || '').replace(/\D/g, '');
    if (c.length !== 4) { ctx.ui.toast('Bitte den 4-stelligen Raum-Code eingeben', 2500); return; }
    start(c, false);
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
      if (!client) return;
      // Nummer wählen (nach kurzem Zuhören)
      if (connected && !myNum && lookT > 0) { if (performance.now() >= lookT) { lookT = 0;
        const used = new Set(Object.values(states).map((x) => x.n)); let n = 1; while (used.has(n)) n++;
        if (n > MAX) { leave('Raum ist voll (max. 8)'); return; }
        myNum = n; changed(); ctx.ui.toast(Object.keys(states).length ? 'Verbunden mit Raum ' + code + ' – du bist Pilger ' + n : 'Raum ' + code + ': noch niemand da – warte auf die anderen', 3000);
      } }
      // Wer 8 s nichts sendet, ist weg
      const now = Date.now();
      for (const id of Object.keys(states)) if (now - (seen[id] || 0) > 8000) { const n = states[id].n; delete states[id]; delete seen[id]; if (n) ctx.ui.toast('Pilger ' + n + ' hat den Raum verlassen', 2000); }
      listT += dt; if (listT > 1) { listT = 0; changed(); }
      if (connected && myNum && performance.now() - sendT > RATE * 1000) { sendT = performance.now(); const me = myState(); client.publish(TOPIC + code + '/' + myId, JSON.stringify(me), { qos: 0 }); }
      // Mitspieler in derselben Station zeigen (weich nachgeführt)
      const world = ctx.engine.world;
      for (const [id, f] of figs) if (!states[id] || f.world !== world || states[id].s !== ctx.stationIndex) { f.world.remove(f.fig.root); figs.delete(id); }
      for (const [id, s] of Object.entries(states)) {
        if (s.s !== ctx.stationIndex || s.s === 'balloon' || !ctx.player || s.x == null) continue;
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
