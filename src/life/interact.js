import * as THREE from 'three';

// Randleuchten für alles Interaktive im Lebensspiel (Bus, Ballon, Datteln, Zamzam, Läden, Jobs …).
// Statt Aufgabenpfeilen: Wer in die Nähe kommt (< radius), sieht einen sanften, pulsierenden Umriss-Glanz am Objekt;
// ganz nah (< near) erscheint der Aktionsknopf (Enter/F auf der Tastatur).
// Günstig für alte Handys: kein Postprocessing. Pro Mesh eine Kopie, die Geometrie (und bei InstancedMesh die
// Instanz-Matrizen) teilt, mit einem additiven Fresnel-Shader. Die Kopien sind unsichtbar, solange man weit weg ist.
// Tiefentest bleibt an → das Leuchten liegt nie über der Spielfigur.
//
// Farbcode: gold = benutzen, green = kaufen/verdienen, blue = fahren/reisen.
export const GLOW = { gold: 0xffc94a, green: 0x5cf08a, blue: 0x5ab8ff };

const VERT = /* glsl */`
uniform float uPush;
varying vec3 vN; varying vec3 vV;
void main() {
  vec3 p = position + normal * uPush;
  mat4 m = modelMatrix;
  #ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
  #endif
  vec4 wp = m * vec4(p, 1.0);
  vN = normalize(mat3(m) * normal);
  vV = cameraPosition - wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}`;
const FRAG = /* glsl */`
uniform vec3 uColor; uniform float uAmount;
varying vec3 vN; varying vec3 vV;
void main() {
  float f = 1.0 - abs(dot(normalize(vN), normalize(vV)));
  float rim = pow(f, 2.2);
  gl_FragColor = vec4(uColor * (rim * 1.1 + 0.07) * uAmount, 1.0);
}`;

// Ein Material pro Farbe und Stärke-Wert je Objekt (Uniform uAmount) → eigenes Material je Eintrag, Shader wird geteilt
function glowMaterial(color, push) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uAmount: { value: 0 }, uPush: { value: push } },
    vertexShader: VERT, fragmentShader: FRAG,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -4,
  });
}

// Leucht-Kopien zu allen Meshes unter obj anlegen (auch zu später geladenen Modellen: refresh())
function attach(entry) {
  const add = (o) => {
    if (!o.isMesh || o.userData.isGlow || o.userData.glowDone || !o.geometry?.attributes.normal) return;
    o.userData.glowDone = true;
    let g;
    if (o.isInstancedMesh) {
      g = new THREE.InstancedMesh(o.geometry, entry.mat, o.count);
      g.instanceMatrix = o.instanceMatrix; // geteilt: bewegte Instanzen (Tauben) leuchten mit
      g.frustumCulled = false;
    } else if (o.isSkinnedMesh) return;
    else g = new THREE.Mesh(o.geometry, entry.mat);
    g.userData.isGlow = true; g.renderOrder = 2; g.visible = false; g.matrixAutoUpdate = false;
    g.raycast = () => {};
    o.add(g); entry.glows.push(g);
  };
  for (const obj of entry.objs) obj.traverse(add);
}

// ctx.ui für den Knopf; player mit pos (Vector3). opts: { radius = 7, near = 2.6 }
// Nächster Punkt auf dem Umriss eines Fahrzeugs (gedrehtes Rechteck, halbe Breite hw, halbe Länge hd entlang der Fahrzeugachse)
// → das Einsteigen geht von jeder Seite, sobald man direkt daneben steht.
export const boxClosest = (obj, hw, hd) => (px, pz, out) => {
  const p = obj.position, h = obj.rotation.y, c = Math.cos(h), s = Math.sin(h);
  const dx = px - p.x, dz = pz - p.z, lx = dx * c - dz * s, lz = dx * s + dz * c; // in Fahrzeug-Koordinaten
  const cx = Math.max(-hw, Math.min(hw, lx)), cz = Math.max(-hd, Math.min(hd, lz));
  return out.set(p.x + cx * c + cz * s, 0, p.z - cx * s + cz * c);
};
export const circleClosest = (obj, r) => (px, pz, out) => {
  const p = obj.position, dx = px - p.x, dz = pz - p.z, d = Math.hypot(dx, dz) || 1, k = Math.min(1, r / d);
  return out.set(p.x + dx * k, 0, p.z + dz * k);
};
export function createInteract(ctx, player, { radius: R0 = 7, near: N0 = 2.6 } = {}) {
  const ui = ctx.ui;
  const items = [];
  let t = 0, active = null, frame = 0;
  const v = new THREE.Vector3(), box = new THREE.Box3();

  const api = {
    // { obj | objs, label, run, color: 'gold'|'green'|'blue', x, z (Aktionspunkt, sonst Mitte des Objekts), radius, near, key, push, when() }
    add(o) {
      const objs = o.objs || (o.obj ? [o.obj] : []);
      const color = GLOW[o.color] ?? o.color ?? GLOW.gold;
      const e = { ...o, objs, color: o.color || 'gold', radius: o.radius ?? R0, near: o.near ?? N0, key: o.key || o.label,
        mat: glowMaterial(color, o.push ?? 0.025), glows: [], amount: 0 };
      attach(e); items.push(e); return e;
    },
    remove(e) { const i = items.indexOf(e); if (i < 0) return; items.splice(i, 1); for (const g of e.glows) g.removeFromParent(); e.mat.dispose(); if (active === e) { active = null; ui.prompt(null); } },
    // Aktionspunkt eines Eintrags (fest oder Objektmitte, z. B. für fahrende Busse)
    point(e) {
      if (e.closest) return e.closest(player.pos.x, player.pos.z, v); // nächster Punkt am Umriss (Fahrzeug, Ballon …)
      if (e.pos) return e.pos(v); // bewegter Punkt (z. B. fahrendes Auto), günstig ohne Umriss-Berechnung
      if (e.x != null) return v.set(e.x, 0, e.z);
      box.makeEmpty(); for (const o of e.objs) box.expandByObject(o);
      return box.isEmpty() ? v.set(1e9, 0, 1e9) : box.getCenter(v);
    },
    get items() { return items; },
    enabled: true, // false: kein Knopf (z. B. während man betet)
    update(dt) {
      dt = Number.isFinite(dt) ? dt : 0.016;
      t += dt;
      // nachgeladene Modelle (Bus, Ballon) bekommen ihre Leucht-Kopie
      if (frame++ % 10 === 0) for (const e of items) attach(e);
      const px = player.pos.x, pz = player.pos.z;
      let best = null, bd = 1e9;
      const pulse = 0.78 + 0.22 * Math.sin(t * 3.2);
      for (const e of items) {
        const ok = api.enabled && (!e.when || e.when());
        const p = api.point(e);
        const d = Math.hypot(p.x - px, p.z - pz);
        // weich ein- und ausblenden: voll ab halber Entfernung, darüber hinaus weniger
        const want = ok ? Math.min(1, Math.max(0, (e.radius - d) / (e.radius * 0.5))) : 0;
        e.amount += (want - e.amount) * Math.min(1, dt * 6);
        const vis = e.amount > 0.02;
        const amt = e.amount * pulse * (d < e.near ? 1.35 : 1);
        e.mat.uniforms.uAmount.value = amt;
        for (const g of e.glows) { if (g.visible !== vis) g.visible = vis; if (g.isInstancedMesh) g.count = g.parent?.count ?? g.count; }
        if (ok && d < e.near && d < bd) { bd = d; best = e; }
      }
      if (best) {
        active = best;
        const label = typeof best.label === 'function' ? best.label() : best.label; // Beschriftung darf sich ändern
        ui.prompt(label, () => { const e = active; if (e) e.run?.(); }, { key: best.key + '|' + label, tone: best.color });
      } else if (active) { active = null; ui.prompt(null); }
    },
    dispose() { for (const e of [...items]) api.remove(e); ui.prompt(null); },
  };
  return api;
}
