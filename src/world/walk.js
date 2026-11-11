import * as THREE from 'three';

// Bewegung ohne Skelett: Die Figuren sind starre Modelle. Im Vertex-Shader werden Bereiche gedreht:
// - Gehen: Beine/Rock um die Hüfte (links/rechts gegengleich, sanfter Übergang in der Mitte), Fuß hebt sich;
//   Arme schwingen gegenläufig um die Schulter
// - Knien (Sitzen, Sujud, Taschahhud): Oberschenkel nach vorn, Unterschenkel unter den Körper geklappt
// - Armhaltungen (nur Spielfigur): Arm nach vorn heben (Schulter) und Unterarm beugen (Ellbogen) – Dua, Trinken …
// Menge: Attribut aWalk = (Phase, Gehstärke, Knien) je Instanz; der ganze Körper wird beim Knien abgesenkt.
// Spielfigur: Uniforms; das Absenken übernimmt die Figur selbst (Hüftgelenk in player.js).
//
// Parameter (Meter, Figur steht bei y = 0, Blick nach +z):
//   hip, legAmp, lift, shy (Schulterhöhe), armX (ab |x| = Arm), armAmp, armMinY, fold (Unterschenkel klappen)
export const WALK = {
  // einfache Figuren
  dress: { hip: 0.95, legAmp: 0.22, armX: 9, fold: false }, izar: { hip: 0.95, legAmp: 0.38, lift: 0.03, armX: 9 },
  arms: { hip: 0, armX: 0, armAmp: 0.4, shy: 1.36 },
  head: { hip: 0 }, hair: { hip: 0 }, beard: { hip: 0 }, face: { hip: 0 }, torso: { hip: 0 }, rida: { hip: 0 },
  khimar: { hip: 0 }, khimarLong: { hip: 0 }, kufi: { hip: 0 }, ghutra: { hip: 0 },
  // Pilgerin (Abaya)
  w_dress: { hip: 0.88, legAmp: 0.2, armX: 0.215, armAmp: 0.3, shy: 1.36, armMinY: 0.9, fold: false, armAttr: true }, // Ärmel im Modell markiert (armW)
  w_arms: { hip: 0, armX: 0, armAmp: 0.3, shy: 1.36 },
  w_shoes: { hip: 0.85, legAmp: 0.32, lift: 0.04, armX: 9 },
  w_hijab: { hip: 0, trim: true }, w_hijabLong: { hip: 0, trim: true }, w_feet: { hip: 0.88, legAmp: 0.32, lift: 0.04, armX: 9 }, w_head: { hip: 0 }, w_eyes: { hip: 0 },
  // Pilger im Ihram
  m_cloth: { hip: 0.92, legAmp: 0.36, lift: 0.03, armX: 0.24, armAmp: 0.4, shy: 1.4, fold: false },
  m_skin: { hip: 0.92, legAmp: 0.42, lift: 0.05, armX: 0.24, armAmp: 0.42, shy: 1.4 },
  m_cover: { hip: 0 },
  // Pilger im Shalwar Kameez
  k_top: { hip: 0.92, legAmp: 0.3, armX: 0.175, armAmp: 0.4, shy: 1.38, fold: false },
  k_bottom: { hip: 0.92, legAmp: 0.44, lift: 0.05, armX: 9 },
  k_shoes: { hip: 0.92, legAmp: 0.44, lift: 0.05, armX: 9 },
  k_trim: { hip: 0, armX: 0.175, armAmp: 0.4, shy: 1.38 },
  k_hands: { hip: 0, armX: 0, armAmp: 0.4, shy: 1.38 },
  k_head: { hip: 0 }, k_eyes: { hip: 0 },
};
// Gesichtsformen: Kopfmitte und Halsansatz je Gruppe (Meter). Teile mit face: true werden pro Person verformt:
// Breite, Länge und Kinnpartie (aFace / uFace) – Kopf, Augen und Kopftuch gemeinsam, damit alles zusammenpasst.
export const HEAD_OF = { '': [1.6, 1.49], w: [1.58, 1.47], m: [1.625, 1.51], k: [1.585, 1.45] };
const FACE_KEYS = ['head', 'face', 'hair', 'beard', 'khimar', 'khimarLong', 'kufi', 'ghutra', 'w_head', 'w_eyes', 'w_hijab', 'w_hijabLong', 'm_skin', 'k_head', 'k_eyes'];
// Hüfthöhe je Modell-Gruppe (für das Absenken beim Knien in der Menge)
export const HIP_OF = { '': 0.95, w: 0.88, m: 0.92, k: 0.92 };

const f = (x) => { const s = String(+x.toFixed(4)); return s.includes('.') || s.includes('e') ? s : s + '.0'; };
export function walkMaterial(mat, p, { instanced = true, yOff = 0, groupHip = 0.95, body = false, faceKey = '', group = '' } = {}) {
  const face = FACE_KEYS.includes(faceKey), [HY, NY] = HEAD_OF[group] || HEAD_OF[''];
  if (!p) return null;
  const P = { hip: 0, legAmp: 0, lift: 0, shy: 1.38, armX: 9, armAmp: 0, armMinY: 0.55, fold: true, ...p };
  const H = P.hip || groupHip, KN = H * 0.5, SEAT = 0.2; // Kniehöhe, Sitzhöhe der Hüfte beim Knien
  const uniforms = { uWalk: { value: new THREE.Vector3(0, 0, 0) }, uArm: { value: new THREE.Vector2(0, 0) }, uElbow: { value: new THREE.Vector2(0, 0) }, uBody: { value: new THREE.Vector2(0, 0) }, uFace: { value: new THREE.Vector3(1, 1, 1) } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    if (P.trim) patchTrim(sh);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
${instanced ? 'attribute vec3 aWalk;' : 'uniform vec3 uWalk; uniform vec2 uArm; uniform vec2 uElbow; uniform vec2 uBody;'}
${P.armAttr ? 'attribute float armW;' : ''}
${face ? (instanced ? 'attribute vec3 aFace;' : 'uniform vec3 uFace;') : ''}
vec3 walkRot(vec3 v, vec2 piv, float a) { float c = cos(a), s = sin(a); float dy = v.y - piv.x, dz = v.z - piv.y; return vec3(v.x, piv.x + dz * s + dy * c, piv.y + dz * c - dy * s); }`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
${face ? `{ // Gesichtsform: Breite (x), Länge (y), Kinnpartie (z) – nur oberhalb des Halses
  vec3 fc = ${instanced ? 'aFace' : 'uFace'};
  float hb = smoothstep(${f(NY - 0.03)}, ${f(NY + 0.04)}, transformed.y)${faceKey === 'm_skin' ? ` * (1.0 - smoothstep(0.12, 0.16, abs(transformed.x)))` : ''};
  float jaw = smoothstep(${f(HY)}, ${f(HY - 0.1)}, transformed.y);
  transformed.x *= mix(1.0, fc.x * mix(1.0, fc.z, jaw), hb);
  transformed.y = mix(transformed.y, ${f(HY)} + (transformed.y - ${f(HY)}) * fc.y, hb);
}` : ''}
{
  vec3 wk = ${instanced ? 'aWalk' : 'uWalk'};
  float kneel = wk.z, amt = wk.y * (1.0 - kneel);
  ${instanced ? 'vec2 armP = vec2(0.45 * kneel); vec2 elbP = vec2(0.6 * kneel);' : 'vec2 armP = uArm; vec2 elbP = uElbow;'}
  if (amt > 0.001 || kneel > 0.001 || armP.x + armP.y + elbP.x + elbP.y > 0.001${body ? ' || uBody.x > 0.001' : ''}) {
    vec3 v = transformed; v.y += ${f(yOff)};
    float sideF = clamp(v.x / 0.07, -1.0, 1.0);
    float sw = sin(wk.x);
    bool isArm = ${P.armAttr ? 'armW > 0.02' : `abs(v.x) > ${f(P.armX)} && v.y < ${f(P.shy + 0.06)} && v.y > ${f(P.armMinY)}`};
    if (v.y < ${f(P.hip)} && !isArm) {
      float w = clamp((${f(P.hip)} - v.y) / ${f(H)}, 0.0, 1.0);
      ${P.fold ? `if (v.y < ${f(KN)}) v = walkRot(v, vec2(${f(KN)}, 0.0), 3.14159 * kneel); // Unterschenkel zurückklappen` : ''}
      v = walkRot(v, vec2(${f(P.hip)}, 0.0), ${f(P.legAmp)} * amt * sw * sideF + 1.5708 * kneel ${P.fold ? '' : '* 0.9'});
      v.y += ${f(P.lift)} * amt * max(0.0, cos(wk.x) * sign(sideF)) * abs(sideF) * w;
    }
    if (isArm) {
      float wa = smoothstep(${f(P.shy + 0.06)}, ${f(P.shy - 0.12)}, v.y);
      float ap = v.x < 0.0 ? armP.x : armP.y, ep = v.x < 0.0 ? elbP.x : elbP.y;
      float ELB = ${f(P.shy - 0.29)};
      if (v.y < ELB && ep > 0.0) v = walkRot(v, vec2(ELB, 0.0), ep * smoothstep(ELB, ELB - 0.06, v.y) * ${P.armAttr ? 'armW' : `smoothstep(${f(P.armX)}, ${f(P.armX + 0.035)}, abs(v.x))`}); // Unterarm beugen
      float wx = ${P.armAttr ? 'armW' : `smoothstep(${f(P.armX)}, ${f(P.armX + 0.035)}, abs(v.x))`}; // weicher Übergang Ärmel → Körper
      v = walkRot(v, vec2(${f(P.shy)}, 0.0), (-${f(P.armAmp)} * amt * sw * sign(v.x) + ap) * wa * wx);
    }
    ${instanced ? `v.y -= ${f(H - SEAT)} * kneel; // ganzer Körper sinkt beim Knien` : ''}
    ${body ? `// Spielfigur: Oberkörper weich an der Hüfte nach vorn beugen (Arme ganz), dann absenken
    float bw = isArm ? 1.0 : smoothstep(${f(groupHip - 0.1)}, ${f(groupHip + 0.12)}, transformed.y);
    v = walkRot(v, vec2(${f(groupHip)}, 0.0), -uBody.x * bw);
    v.y -= uBody.y;` : ''}
    v.y -= ${f(yOff)};
    transformed = v;
  }
}`);
  };
  const key = 'walk4' + JSON.stringify(P) + instanced + yOff + groupHip + body + face + group;
  mat.customProgramCacheKey = () => key;
  return uniforms;
}

// Hijab mit Goldrand: Die Textur ist eine Maske (weiß = Goldrand). Der Stoff bekommt die Farbe der Person, der Rand bleibt golden.
export const TRIM_GOLD = '0.80, 0.62, 0.28';
export function patchTrim(sh) {
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <map_fragment>', '#ifdef USE_MAP\n float trimM = texture2D(map, vMapUv).r;\n#else\n float trimM = 0.0;\n#endif')
    .replace('#include <color_fragment>', `#include <color_fragment>\n diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${TRIM_GOLD}), trimM);`);
}
