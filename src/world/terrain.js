import * as THREE from 'three';
import { pbr } from './assets.js';

// Wüstengelände mit flacher Mitte und Bergen am Rand. Für Mina, Arafat, Muzdalifa.
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x, y) { let s = 0, a = 0.5, f = 1; for (let i = 0; i < 5; i++) { s += a * noise(x * f, y * f); f *= 2; a *= 0.5; } return s; }
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Felsige Berge wie im Hedschas: scharfe Grate (ridged noise), Vorberge, flache Mitte.
function ridged(x, y) { let s = 0, a = 0.55, f = 1, w = 1; for (let i = 0; i < 5; i++) { let n = 1 - Math.abs(noise(x * f, y * f) * 2 - 1); n *= n * w; w = Math.min(1, n * 1.6); s += n * a; f *= 2.03; a *= 0.5; } return s; }
export function heightFn({ r0 = 250, r1 = 550, amp = 150, sx = 1, sz = 1 } = {}) {
  return (x, z) => {
    const d = Math.hypot(x / sx, z / sz);
    const m = smooth(r0, r1, d);
    const foot = smooth(r0 * 0.98, r0 * 1.2, d); // flache Vorberge und Geröll am Bergfuß
    const big = fbm(x * 0.0035 + 10, z * 0.0035 - 3);
    return m * (big * amp * 0.55 + ridged(x * 0.006 + 3.1, z * 0.006 - 1.7) * amp * 0.72) + foot * fbm(x * 0.03, z * 0.03) * 4;
  };
}

// Gelände: Wüstenkies in der Ebene, Granitfels an steilen Hängen und auf den Bergen (echte Texturen, Poly Haven CC0).
// Die Fels-/Kies-Mischung kommt aus Hangneigung und Höhe; eine zweite, große Kies-Kachel bricht das Wiederholungsmuster.
export function buildTerrain(world, h, size = 1600, seg = 160) {
  seg = Math.max(seg, 220);
  const geo = new THREE.PlaneGeometry(size, size, seg, seg); geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, h(p.getX(i), p.getZ(i)));
  geo.computeVertexNormals();
  const nrm = geo.attributes.normal, col = new Float32Array(p.count * 3), rockW = new Float32Array(p.count);
  const warm = new THREE.Color(1.0, 0.97, 0.92), dark = new THREE.Color(0.62, 0.55, 0.5), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), y = p.getY(i), ny = nrm.getY(i);
    const v = fbm(x * 0.02, z * 0.02);
    rockW[i] = Math.min(1, Math.max(smooth(0.93, 0.78, ny), smooth(6, 22, y) * 0.85) + (v - 0.5) * 0.3);
    c.copy(warm).lerp(dark, rockW[i] * (0.4 + v * 0.6)).multiplyScalar(0.9 + fbm(x * 0.004, z * 0.004) * 0.2);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('rockW', new THREE.BufferAttribute(rockW, 1));
  const rep = size / 5; // Kies-Kachel 5 m
  const tex = pbr('desert', [rep, rep]), rock = pbr('granite', [1, 1]);
  const mat = new THREE.MeshStandardMaterial({ ...tex, vertexColors: true, roughness: 1, normalScale: new THREE.Vector2(1, 1) });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tRock = { value: rock.map }; sh.uniforms.tRockN = { value: rock.normalMap }; sh.uniforms.uRockS = { value: 5 / 9 }; // Fels-Kachel 9 m
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float rockW; varying float vRock;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRock = rockW;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRock, tRockN; uniform float uRockS; varying float vRock;')
      .replace('#include <map_fragment>', `
        vec3 sandC = texture2D(map, vMapUv).rgb * 1.12 * mix(0.8, 1.2, texture2D(map, vMapUv * 0.071).r * 1.6);
        vec3 rockC = texture2D(tRock, vMapUv * uRockS).rgb * mix(0.85, 1.15, texture2D(tRock, vMapUv * uRockS * 0.11).r * 1.8) * vec3(0.95, 0.8, 0.68); // warmer, dunkler Granit
        diffuseColor.rgb *= mix(sandC, rockC, smoothstep(0.25, 0.75, vRock));`)
      .replace('vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;',
        'vec3 mapN = mix(texture2D( normalMap, vNormalMapUv ).xyz, texture2D( tRockN, vNormalMapUv * uRockS ).xyz, smoothstep(0.25, 0.75, vRock)) * 2.0 - 1.0;');
  };
  mat.customProgramCacheKey = () => 'terrain2';
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true; world.add(m);
  return m;
}
