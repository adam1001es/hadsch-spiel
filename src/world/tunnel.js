import * as THREE from 'three';
import { sign } from './props.js';

// Tunnelportal am Straßenende: Betonrahmen mit dunkler, beleuchteter Öffnung, dahinter ein Felshügel.
// Breite quer zur Fahrbahn; ry dreht das Portal (0 = Öffnung schaut nach +z). lines = Schild über der Einfahrt.
export function tunnelPortal(world, { x, y = 0, z, ry = 0, width = 24, lines, hill = true }) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; world.add(g);
  const conc = new THREE.MeshStandardMaterial({ color: 0xcfc6b4, roughness: 0.85 });
  const dark = new THREE.MeshBasicMaterial({ color: 0x07090b });
  const w = width / 2, H = 8.5;
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, H + 2, 7), conc); p.position.set(s * (w + 1.2), (H + 2) / 2, -3.5); p.castShadow = true; g.add(p); }
  const top = new THREE.Mesh(new THREE.BoxGeometry(width + 4.8, 2.6, 7), conc); top.position.set(0, H + 1.3, -3.5); top.castShadow = true; g.add(top);
  const hole = new THREE.Mesh(new THREE.PlaneGeometry(width, H), dark); hole.position.set(0, H / 2, -6.9); g.add(hole);
  // Lampenreihe im Tunnel (leuchtet)
  const lampM = new THREE.MeshStandardMaterial({ color: 0xfff1cf, emissive: 0xffd590, emissiveIntensity: 2 });
  for (let k = 0; k < 6; k++) { const l = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.15, 0.4), lampM); l.position.set((k % 2 ? 1 : -1) * (w - 1.5), H - 0.4, -1 - k * 1.1); g.add(l); }
  const band = new THREE.Mesh(new THREE.BoxGeometry(width + 4.9, 0.4, 0.2), new THREE.MeshStandardMaterial({ color: 0xc9a24e, metalness: 0.7, roughness: 0.35 })); band.position.set(0, H + 0.2, 0.02); g.add(band);
  if (hill) { const h = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: 0x9a7a58, roughness: 1, flatShading: true })); h.scale.set(width * 1.9, 22, 34); h.position.set(0, -2, -34); g.add(h); }
  if (lines) sign(g, 0, 0.3, 0, lines, { w: 10, h: 2.2, y: H + 4.2, bg: '#1f4f9a', fg: '#ffffff', accent: '#ffffff', wall: true });
  return g;
}
