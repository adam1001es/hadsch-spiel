// Aktive Pilger: jede Person folgt ihrem eigenen Weg aus Wegpunkten und macht dort etwas
// (stehen, beten, Dua, werfen, Kiesel aufheben). Ist ein Weg zu Ende, wird ein neuer erzeugt.
// route(i, first) → [{ x, z, wait?, act?, face? }, …]  (act: 'stand' | 'pray' | 'dua' | 'throw' | 'pick')
// Geschwindigkeit je Person leicht unterschiedlich. Ergebnis pro Bild über crowd.set / crowd.gesture.
export function createAgents(crowd, n, route, { speed = 1.1, y = () => 0, clear = null } = {}) {
  const A = [];
  for (let i = 0; i < n; i++) {
    const pts = route(i, true);
    // Beim Start irgendwo auf dem Weg beginnen, damit nicht alle gleichzeitig loslaufen
    const k = Math.floor(Math.random() * pts.length);
    A.push({ pts, k, x: pts[k].x, z: pts[k].z, wait: (pts[k].wait || 0) * Math.random(), act: pts[k].act || null, t: Math.random() * 10, ry: Math.random() * 6.28, sp: speed * (0.8 + Math.random() * 0.4) });
  }
  return {
    list: A, // aktuelle Positionen (z. B. damit Autos bremsen)
    update(dt, view) {
      for (let i = 0; i < n; i++) {
        const a = A[i]; a.t += dt;
        let sy = 1, g = 0;
        if (a.wait > 0) {
          a.wait -= dt;
          const p = a.pts[a.k];
          if (p.face != null) a.ry += Math.atan2(Math.sin(p.face - a.ry), Math.cos(p.face - a.ry)) * Math.min(1, dt * 4);
          if (a.act === 'pray') { const c = (a.t % 6) / 6; sy = c > 0.45 && c < 0.85 ? 0.62 : 1; }      // stehen ↔ knien (Gebet)
          else if (a.act === 'dua') g = -2 - Math.min(1, Math.min(a.wait, (p.wait || 6) - a.wait) * 1.5); // Hände heben und senken
          else if (a.act === 'throw') { const c = (a.t % 1.6) / 1.6; g = -Math.max(0, Math.sin(c * Math.PI)) ; } // Wurf alle 1,6 s
          else if (a.act === 'pick') { const c = (a.t % 3) / 3; sy = c < 0.5 ? 0.62 : 1; }                 // bücken, aufheben
          if (a.wait <= 0) { a.k++; a.act = null; }
        } else {
          if (a.k >= a.pts.length) { a.pts = route(i, false); a.k = 0; a.x = a.pts[0].x; a.z = a.pts[0].z; }
          const p = a.pts[a.k], dx = p.x - a.x, dz = p.z - a.z, d = Math.hypot(dx, dz), step = a.sp * dt;
          if (d <= step) { a.x = p.x; a.z = p.z; a.wait = p.wait || 0; a.act = p.act || null; if (!a.wait) a.k++; }
          else { a.x += (dx / d) * step; a.z += (dz / d) * step; const want = Math.atan2(dx, dz); a.ry += Math.atan2(Math.sin(want - a.ry), Math.cos(want - a.ry)) * Math.min(1, dt * 6); }
        }
        let x = a.x, z = a.z;
        if (clear && view) [x, z] = clear(view, x, z);
        crowd.gesture(i, g);
        crowd.set(i, x, y(x, z), z, a.ry, sy);
      }
      crowd.commit();
    },
  };
}
