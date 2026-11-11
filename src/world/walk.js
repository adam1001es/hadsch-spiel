import * as THREE from 'three';

// Gehbewegung ohne Skelett: Die Figuren sind starre Modelle. Im Vertex-Shader werden Punkte unterhalb der Hüfte
// (Beine, Rock/Abaya) und Punkte im Armbereich im Gehtakt um Hüfte bzw. Schulter gedreht.
// - Beine: links/rechts gegengleich, sanfter Übergang in der Mitte (Abaya reißt nicht), Fuß hebt sich beim Vorschwingen
// - Arme: gegenläufig zum Bein derselben Seite
// Takt pro Figur: Menge → Attribut aWalk (Phase, Stärke) je Instanz; Spielfigur → Uniform uWalk.
//
// Parameter (Meter, Figur steht bei y = 0, Blick nach +z):
//   hip, legAmp (rad), lift (m), shy/shx (Schulter), armX (ab |x| = Arm), armAmp (rad), yOff (Teil ist um yOff nach unten verschoben)
export const WALK = {
  // einfache Figuren
  dress: { hip: 0.95, legAmp: 0.22, armX: 9 }, izar: { hip: 0.95, legAmp: 0.38, lift: 0.03, armX: 9 },
  arms: { hip: 0, armX: 0, armAmp: 0.4, shy: 1.36, shx: 0.25 },
  // Pilgerin (Abaya)
  w_dress: { hip: 0.85, legAmp: 0.2, armX: 0.215, armAmp: 0.3, shy: 1.32, shx: 0.17, armMinY: 0.9 },
  w_arms: { hip: 0, armX: 0, armAmp: 0.3, shy: 1.32, shx: 0.17 },
  w_shoes: { hip: 0.85, legAmp: 0.32, lift: 0.04, armX: 9 },
  // Pilger im Ihram
  m_cloth: { hip: 0.92, legAmp: 0.36, lift: 0.03, armX: 0.24, armAmp: 0.4, shy: 1.4, shx: 0.26 },
  m_skin: { hip: 0.92, legAmp: 0.42, lift: 0.05, armX: 0.24, armAmp: 0.42, shy: 1.4, shx: 0.26 },
  // Pilger im Shalwar Kameez
  k_top: { hip: 0.92, legAmp: 0.3, armX: 0.175, armAmp: 0.4, shy: 1.38, shx: 0.17 },
  k_bottom: { hip: 0.92, legAmp: 0.44, lift: 0.05, armX: 9 },
  k_shoes: { hip: 0.92, legAmp: 0.44, lift: 0.05, armX: 9 },
  k_trim: { hip: 0, armX: 0.175, armAmp: 0.4, shy: 1.38, shx: 0.17 },
  k_hands: { hip: 0, armX: 0, armAmp: 0.4, shy: 1.38, shx: 0.17 },
};

const f = (x) => (Number.isInteger(x) ? x + '.0' : String(x));
export function walkMaterial(mat, p, { instanced = true, yOff = 0 } = {}) {
  if (!p) return null;
  const P = { hip: 0, legAmp: 0, lift: 0, shy: 1.38, shx: 0.2, armX: 9, armAmp: 0, armMinY: 0.55, ...p };
  const uniforms = { uWalk: { value: new THREE.Vector2(0, 0) } };
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWalk = uniforms.uWalk;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${instanced ? 'attribute vec2 aWalk;' : 'uniform vec2 uWalk;'}
vec3 walkRot(vec3 v, vec2 piv, float a) { float c = cos(a), s = sin(a); float dy = v.y - piv.x, dz = v.z - piv.y; return vec3(v.x, piv.x + dz * s + dy * c, piv.y + dz * c - dy * s); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
{
  vec2 wk = ${instanced ? 'aWalk' : 'uWalk'};
  float amt = wk.y;
  if (amt > 0.001) {
    vec3 v = transformed; v.y += ${f(P.yOff ?? yOff)};
    float sideF = clamp(v.x / 0.07, -1.0, 1.0);
    float sw = sin(wk.x);
    bool isArm = abs(v.x) > ${f(P.armX)} && v.y < ${f(P.shy + 0.06)} && v.y > ${f(P.armMinY)};
    if (v.y < ${f(P.hip)} && !isArm) {
      float w = clamp((${f(P.hip)} - v.y) / ${f(P.hip || 1)}, 0.0, 1.0);
      v = walkRot(v, vec2(${f(P.hip)}, 0.0), ${f(P.legAmp)} * amt * sw * sideF);
      v.y += ${f(P.lift)} * amt * max(0.0, cos(wk.x) * sign(sideF)) * abs(sideF) * w;
    }
    if (isArm) {
      float wa = smoothstep(${f(P.shy + 0.06)}, ${f(P.shy - 0.12)}, v.y);
      v = walkRot(v, vec2(${f(P.shy)}, 0.0), -${f(P.armAmp)} * amt * sw * sign(v.x) * wa);
    }
    v.y -= ${f(P.yOff ?? yOff)};
    transformed = v;
  }
}`);
  };
  const key = 'walk' + JSON.stringify(P) + instanced + yOff;
  mat.customProgramCacheKey = () => key;
  return uniforms;
}
