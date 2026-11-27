import * as THREE from 'three';

// Wildnis rund um die Stadt (Lebensspiel): Sprungschanzen und ein Ring-Parkours in den Bergen.
// Teil 1 (vor dem Boden): offroadRamps(h, opts) → { ramps, rampH(x, z) } – damit die Schanzen Teil des Bodens sind.
// Teil 2: buildOffroad(world, ui, data) → { update(drive, dt), course } – Schanzen zeichnen, Ringe, Zeit, Bestzeit.
const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// Strecke: Bogen um den Stadtmittelpunkt (cx, cz) im Radius r, von Winkel a0 bis a1 (Bergland, keine Gebäude)
export function offroadRamps(h, { cx = 0, cz = 0, r = 1050, a0 = 3.3, a1 = 4.5, rings = 12 } = {}) {
  const pt = (a) => ({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, h: Math.atan2(-Math.sin(a), Math.cos(a)) }); // Fahrtrichtung entlang des Bogens
  const ramps = [], ringPts = [];
  for (let i = 0; i < rings; i++) {
    const a = a0 + (a1 - a0) * (i / (rings - 1)), p = pt(a);
    ringPts.push(p);
    if (i < rings - 1) { // Schanze zwischen zwei Ringen, mal groß, mal klein
      const q = pt(a + (a1 - a0) / (rings - 1) * 0.55);
      const H = i % 3 === 2 ? 5.5 : 3 + (i % 2) * 1.2, L = H * 3.6;
      ramps.push({ x: q.x - Math.sin(q.h) * L, z: q.z - Math.cos(q.h) * L, h: q.h, L, H, W: 8 });
    }
  }
  for (const rp of ramps) rp.y0 = Math.max(0, h(rp.x, rp.z)) - 0.05;
  const rampH = (x, z) => {
    let best = -1e9;
    for (const q of ramps) {
      const dx = x - q.x, dz = z - q.z; if (dx * dx + dz * dz > 900) continue;
      const u = dx * Math.sin(q.h) + dz * Math.cos(q.h), w = dx * Math.cos(q.h) - dz * Math.sin(q.h);
      if (Math.abs(w) < q.W / 2 && u >= 0 && u <= q.L) best = Math.max(best, q.y0 + q.H * u / q.L);
    }
    return best;
  };
  return { ramps, rampH, ringPts };
}

export function buildOffroad(world, ui, { ramps, ringPts }, ground, { id = 'wildnis', name = 'Berg-Parkours' } = {}) {
  // Schanzen: Keil mit gelb-schwarzer Kante
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#1b1b1b' : '#f2c230'; g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 16, 32); g.lineTo(i * 16 + 32, 0); g.lineTo(i * 16 + 16, 0); g.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapS = THREE.RepeatWrapping;
  const top = new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.8 }), edge = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 });
  for (const r of ramps) {
    const g2 = new THREE.BufferGeometry(), w = r.W / 2;
    const P = [[-w, 0, 0], [w, 0, 0], [-w, r.H, r.L], [w, r.H, r.L], [-w, -3, r.L], [w, -3, r.L], [-w, -3, 0], [w, -3, 0]];
    const tri = [[0, 2, 1], [1, 2, 3], [4, 3, 2], [4, 5, 3], [6, 4, 2], [6, 2, 0], [7, 1, 3], [7, 3, 5]];
    const pos = []; for (const f of tri) for (const k of f) pos.push(...P[k]);
    g2.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g2.computeVertexNormals();
    g2.addGroup(0, 6, 0); g2.addGroup(6, 6, 1); g2.addGroup(12, 12, 0);
    const uvs = new Float32Array(pos.length / 3 * 2); for (let i = 0; i < pos.length / 3; i++) { uvs[i * 2] = pos[i * 3] / 4 + 0.5; uvs[i * 2 + 1] = (pos[i * 3 + 1] + 3) / (r.H + 3); } g2.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    const m = new THREE.Mesh(g2, [top, edge]); m.position.set(r.x, r.y0, r.z); m.rotation.y = r.h; m.castShadow = m.receiveShadow = true; world.add(m);
  }
  // Ringe
  const ringGeo = new THREE.TorusGeometry(5, 0.38, 10, 40);
  const ringOn = new THREE.MeshStandardMaterial({ color: 0xffd34d, emissive: 0xffb81a, emissiveIntensity: 1.6, metalness: 0.4, roughness: 0.3 });
  const ringOff = new THREE.MeshStandardMaterial({ color: 0xd8b25a, emissive: 0x6a4a10, emissiveIntensity: 0.4, transparent: true, opacity: 0.45 });
  const rings = ringPts.map((p) => { const y = ground(p.x, p.z) + 4.6, mesh = new THREE.Mesh(ringGeo, ringOff); mesh.position.set(p.x, y, p.z); mesh.rotation.y = p.h; world.add(mesh); return { ...p, y, mesh }; });
  const C = { next: 0, t: 0, on: false };
  const bestOf = () => { try { return +(localStorage.getItem('hp-parkour-' + id) || 0); } catch { return 0; } };
  let prev = null;
  const reset = () => { C.on = false; C.next = 0; for (const q of rings) q.mesh.visible = true; };
  return {
    start: rings[0], rings,
    update(D, dt) {
      const r = rings[C.next];
      if (D && r && prev) { // Ebene des Rings überquert (klappt auch bei hohem Tempo)
        const fx = Math.sin(r.h), fz = Math.cos(r.h), a0 = (prev.x - r.x) * fx + (prev.z - r.z) * fz, a1 = (D.x - r.x) * fx + (D.z - r.z) * fz;
        if (a0 * a1 <= 0 && a0 !== a1) {
          const t = a0 / (a0 - a1), cx = prev.x + (D.x - prev.x) * t, cz = prev.z + (D.z - prev.z) * t, cy = prev.y + (D.y - prev.y) * t;
          if (Math.hypot(cx - r.x, cz - r.z) < 7.5 && Math.abs(cy + 1.2 - r.y) < 7) {
            r.mesh.visible = false;
            if (C.next === 0) { C.on = true; C.t = 0; ui.toast(`🏁 ${name}: los! Fahr durch alle goldenen Ringe`, 2600); }
            C.next++;
            if (C.next >= rings.length) { const best = bestOf(), nb = !best || C.t < best; if (nb) try { localStorage.setItem('hp-parkour-' + id, String(C.t)); } catch { /* egal */ } ui.toast(`🏆 ${name} geschafft in ${fmt(C.t)}${nb ? ' – neue Bestzeit!' : ` (Bestzeit ${fmt(best)})`}`, 4200); reset(); }
          }
        }
      }
      prev = D ? { x: D.x, y: D.y, z: D.z } : null;
      if (C.on) { C.t += dt; ui.counter(`🏁 Ring ${C.next + 1}/${rings.length} · ${fmt(C.t)}`); if (!D || (rings[C.next] && Math.hypot(D.x - rings[C.next].x, D.z - rings[C.next].z) > 600)) { reset(); ui.counter(''); } }
      rings.forEach((q, i) => { q.mesh.material = i === C.next ? ringOn : ringOff; if (i === C.next) q.mesh.rotation.z += dt * 1.2; });
    },
  };
}
