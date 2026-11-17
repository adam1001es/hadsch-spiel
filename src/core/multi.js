// Zusammen spielen: Wer gerade gleichzeitig spielt, sieht die anderen automatisch als Pilger – am selben Ort (Station,
// Kaaba, Straßen von Mekka/Medina). Über dem Kopf steht nur der Anfangsbuchstabe des Vornamens (kein Name, kein Chat).
// Optional: privater Raum mit 4-stelligem Code (z. B. für eine Schulklasse) – dann sieht man nur die Leute im Raum.
// Technik: öffentlicher MQTT-Nachrichtendienst über WebSocket (HiveMQ) – funktioniert auch im Mobilfunk und in Schul-WLANs.
// Jeder Ort hat ein eigenes Thema, man empfängt nur die Leute am eigenen Ort (spart Daten, auch bei vielen Spielern).
// Zum Testen: ?mqtt=ws://127.0.0.1:8888
import * as THREE from 'three';
import { createFigure } from './player.js';
import { peopleModels } from '../world/crowd.js';
import { settings, saveSettings } from './i18n.js';
import { makeVehicle } from '../life/vehicles.js';
const seatV = new THREE.Vector3();

const RATE = 0.25, SHOW = 14; // Senden 4× pro Sekunde; höchstens 14 Mitspieler gleichzeitig zeigen (die nächsten)
const COLORS = ['#e6c46e', '#5fb3e6', '#e67a5f', '#8fd16a', '#c78fe6', '#e6e05f', '#5fe6c4', '#e65fa8'];
const colorOf = (id) => COLORS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export function createMulti(ctx) {
  const BROKER = (location.search.match(/[?&]mqtt=([^&]+)/) || [])[1] || 'wss://broker.hivemq.com:8884/mqtt';
  const ROOT = 'hadsch3d-v2/';
  const myId = Math.random().toString(36).slice(2, 10);
  let client = null, connected = false, code = '', sub = '', loc = null;
  let states = {}; const seen = {};
  // Wer spielt gerade insgesamt (egal wo, auch in privaten Räumen)? Kleines Lebenszeichen alle 10 s, nur Ort, kein Name
  const ALL = ROOT + 'da/', alive = {}; let aliveT = -1e9;
  const announce = () => { if (client && connected) { aliveT = performance.now(); client.publish(ALL + myId, JSON.stringify({ s: ctx.stationIndex ?? 'start' }), { qos: 0 }); } };
  setInterval(announce, 10000); // eigener Takt, unabhängig vom Bildaufbau
  const figs = new Map();
  let sendT = 0, listT = 0, onChange = () => {};
  const load = async () => (await import('mqtt')).default;
  // Ereignisse zwischen Mitspielern am selben Ort (z. B. Stein gesetzt im Bauhof): Thema „<Ort>/ev/<id>“, nicht gespeichert
  const listeners = new Map(); // Typ → Set(fn(daten, von: { id, ...zustand }))
  const evSub = () => sub.slice(0, -1) + 'ev/+';
  const base = () => ROOT + (code ? 'raum/' + code : 'alle') + '/';
  const locKey = () => (ctx.stationIndex == null ? 'start' : String(ctx.stationIndex));
  const initial = () => ((ctx.profile?.name || '').trim()[0] || '•').toUpperCase();

  function myState() {
    const s = { i: initial(), s: ctx.stationIndex };
    if (ctx.stationIndex === 'balloon' || ctx.stationIndex === 'drive') return s; // nur „wo bin ich“
    const p = ctx.player; if (!p || ctx.stationIndex == null) return s;
    return { ...s, x: +p.pos.x.toFixed(2), y: +p.pos.y.toFixed(2), z: +p.pos.z.toFixed(2), h: +p.fig.root.rotation.y.toFixed(2), p: p.fig.poseName || 'stand',
      c: p.fig.cloth.color.getHex(), k: p.fig.skinM.color.getHex(), f: ctx.profile?.gender === 'f' ? 1 : 0, ...(ctx.vehicle ? { v: ctx.vehicle } : {}) }; // v = Fahrzeug, in dem man sitzt
  }
  const totals = () => { const now = Date.now(), by = {}; let n = 0; for (const [id, a] of Object.entries(alive)) { if (now - a.t > 25000) { delete alive[id]; continue; } n++; by[a.s] = (by[a.s] || 0) + 1; } return { n, by }; };
  const status = () => ({ online: settings.online !== false, connected, code, me: initial(), total: connected ? totals() : { n: 0, by: {} }, others: Object.entries(states).map(([id, s]) => ({ id, col: colorOf(id), ...s })) });
  const changed = () => onChange(status());

  function clearOthers() { states = {}; for (const k of Object.keys(seen)) delete seen[k]; for (const f of figs.values()) f.world.remove(f.fig.root); figs.clear(); }
  function resubscribe() {
    if (!client || !connected) return;
    const t = base() + locKey() + '/+';
    if (t === sub) return;
    if (sub) { client.publish(sub.slice(0, -1) + myId, ''); client.unsubscribe([sub, evSub()]); }
    clearOthers(); sub = t; loc = ctx.stationIndex; client.subscribe([sub, evSub()]); changed();
  }

  async function connect() {
    if (client) return;
    let mqtt; try { mqtt = await load(); } catch { return; }
    if (client) return;
    client = mqtt.connect(BROKER, { clientId: 'h3d_' + myId, clean: true, connectTimeout: 10000, reconnectPeriod: 4000, keepalive: 30, will: { topic: ALL + myId, payload: '', qos: 0, retain: false } });
    client.on('connect', () => { connected = true; sub = ''; aliveT = -1e9; client.subscribe(ALL + '+'); announce(); resubscribe(); changed(); });
    client.on('message', (topic, buf) => {
      const id = topic.slice(topic.lastIndexOf('/') + 1); if (id === myId) return;
      if (topic === ALL + id) {
        if (!buf.length) { delete alive[id]; return; }
        const fresh = !alive[id];
        try { alive[id] = { s: JSON.parse(buf.toString()).s ?? 'start', t: Date.now() }; } catch { return; }
        if (fresh && performance.now() - aliveT > 2000) announce(); // Neuer Spieler: gleich zurückmelden, damit er sofort mitzählt
        return;
      }
      if (topic === evSub().slice(0, -1) + id) { // Ereignis eines Mitspielers am selben Ort
        try { const ev = JSON.parse(buf.toString()); const fs = listeners.get(ev.t); if (fs) for (const f of fs) f(ev.d, { id, ...(states[id] || {}) }); } catch { /* ungültig */ }
        return;
      }
      if (topic.slice(0, topic.lastIndexOf('/') + 1) !== sub.slice(0, -1)) return;
      if (!buf.length) { delete states[id]; delete seen[id]; return; }
      try { states[id] = JSON.parse(buf.toString()); seen[id] = Date.now(); } catch { /* ungültig */ }
    });
    client.on('error', () => { /* verbindet selbst neu */ });
    client.on('offline', () => { connected = false; changed(); });
  }
  function disconnect() {
    try { if (client && connected) client.publish(ALL + myId, ''); if (client && sub) client.publish(sub.slice(0, -1) + myId, ''); client?.end(true); } catch { /* egal */ }
    client = null; connected = false; sub = ''; clearOthers(); changed();
  }

  function badge(letter, col) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    g.fillStyle = col; g.beginPath(); g.arc(32, 32, 28, 0, 7); g.fill();
    g.fillStyle = '#14251f'; g.font = 'bold 36px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(letter, 32, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false, transparent: true }));
    s.scale.set(0.42, 0.42, 1); s.position.y = 2.15; s.renderOrder = 10; return s;
  }

  // automatisch online, wenn erlaubt (Standard: an)
  if (settings.online !== false) setTimeout(connect, 1500);

  return {
    status, myId,
    get room() { return code; }, // privater Raum (leer = alle online)
    // Ereignis an alle anderen am selben Ort senden; false, wenn (noch) nicht verbunden
    send(t, d) { if (!client || !connected || !sub || ctx.stationIndex !== loc) return false; client.publish(evSub().slice(0, -1) + myId, JSON.stringify({ t, d }), { qos: 0 }); return true; },
    // Auf Ereignisse hören; gibt eine Funktion zum Abmelden zurück
    on(t, fn) { if (!listeners.has(t)) listeners.set(t, new Set()); listeners.get(t).add(fn); return () => listeners.get(t)?.delete(fn); },
    set onChange(fn) { onChange = fn; },
    setOnline(on) { settings.online = on; saveSettings(); if (on) connect(); else disconnect(); changed(); },
    create() { code = String(1000 + Math.floor(Math.random() * 9000)); if (!client) connect(); else { sub = ''; resubscribe(); } ctx.ui.toast('Privater Raum ' + code, 2500); changed(); },
    join(c) {
      c = String(c || '').replace(/\D/g, '');
      if (c.length !== 4) { ctx.ui.toast('Bitte den 4-stelligen Raum-Code eingeben', 2500); return; }
      code = c; if (!client) connect(); else { sub = ''; resubscribe(); } ctx.ui.toast('Raum ' + c + ' – du siehst jetzt nur die Leute im Raum', 3000); changed();
    },
    leave() { code = ''; sub = ''; resubscribe(); changed(); }, // zurück zu „alle online“
    update(dt) {
      if (!client) return;
      if (connected && ctx.stationIndex !== loc) resubscribe(); // Ort gewechselt → nur noch Leute dort empfangen
      const now = Date.now();
      for (const id of Object.keys(states)) if (now - (seen[id] || 0) > 8000) { delete states[id]; delete seen[id]; }
      listT += dt; if (listT > 1) { listT = 0; changed(); }
      if (connected && sub && performance.now() - sendT > RATE * 1000) { sendT = performance.now(); client.publish(sub.slice(0, -1) + myId, JSON.stringify(myState()), { qos: 0 }); }
      // Mitspieler am selben Ort zeigen (die nächsten SHOW), weich nachgeführt
      const world = ctx.engine.world, me = ctx.player?.pos;
      const near = new Set(Object.entries(states).filter(([, s]) => s.s === ctx.stationIndex && s.x != null && me)
        .sort((a, b) => Math.hypot(a[1].x - me.x, a[1].z - me.z) - Math.hypot(b[1].x - me.x, b[1].z - me.z)).slice(0, SHOW).map(([id]) => id));
      for (const [id, f] of figs) if (!near.has(id) || f.world !== world) { f.world.remove(f.fig.root); f.veh?.root.removeFromParent(); figs.delete(id); }
      for (const id of near) {
        const s = states[id];
        let f = figs.get(id);
        if (!f) {
          const fig = createFigure(world, { color: s.c, covered: !!s.f, ring: false, models: peopleModels(), rigged: false }); // Mitspieler: leichte Figur
          fig.skinM.color.setHex(s.k); fig.root.add(badge(s.i || '•', colorOf(id)));
          f = { fig, world, x: s.x, z: s.z, h: s.h, c: s.c }; figs.set(id, f);
        }
        if (f.c !== s.c) { f.fig.setColor(s.c); f.c = s.c; }
        const k = Math.min(1, dt * 6), ox = f.x, oz = f.z;
        f.x += (s.x - f.x) * k; f.z += (s.z - f.z) * k;
        f.h += Math.atan2(Math.sin(s.h - f.h), Math.cos(s.h - f.h)) * k;
        const v = Math.hypot(f.x - ox, f.z - oz) / Math.max(dt, 1e-3);
        // Mitspieler im Fahrzeug: Fahrzeug an seiner Position, Figur sitzt im Sitz
        if (s.v && (!f.veh || f.veh.kind !== s.v)) { f.veh?.root.removeFromParent(); f.veh = makeVehicle(world, s.v); }
        if (!s.v && f.veh) { f.veh.root.removeFromParent(); f.veh = null; }
        if (f.veh) {
          const R = f.veh.root; R.position.set(f.x, 0, f.z); R.rotation.y = f.h; R.updateMatrixWorld(true); f.veh.roll(v, dt);
          f.fig.pose(s.p || 'drive'); f.fig.root.position.copy(f.veh.seat(seatV)); f.fig.root.rotation.y = f.h; f.fig.update(dt, 0);
          continue;
        }
        f.fig.pose(v > 0.3 ? 'walk' : s.p === 'walk' ? 'stand' : s.p);
        f.fig.root.position.set(f.x, s.y ?? me.y, f.z); f.fig.root.rotation.y = f.h;
        f.fig.update(dt, v / 1.6);
      }
    },
  };
}
