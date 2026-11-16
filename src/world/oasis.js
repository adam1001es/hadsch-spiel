import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { pbr } from './assets.js';

// Oasen-Moschee: „Mosque“ von Illia (CC BY 4.0, https://skfb.ly/pvooG), vereinfacht (public/assets/models/oasis_mosque.glb).
// Ummauerte Anlage ca. 90 × 90 m, Tor in der Mitte der Mauer bei lokal z = +26,7, Moschee mit Eingang zum Tor, Palmenallee davor.
// Wird mit ry gedreht aufgestellt; Lage der Teile siehe OASIS (lokale Koordinaten, Tor bei +z).
export const OASIS = {
  walls: { x0: -44.7, x1: 44.7, z0: -62.8, z1: 26.7 }, gate: { x: 0, z: 26.7 },
  hall: { x0: -18.7, x1: 18.3, z0: -42.5, z1: -16.7 }, wings: [{ x0: -31, x1: 31, z0: -38, z1: -20 }, { x0: -10, x1: 10, z0: -55, z1: -42 }],
  front: { x: 0, z: -9 }, // Platz vor dem Eingang
};
let load = null;
// Steinstruktur ohne UV: Marmorbild aus drei Richtungen projiziert, dezent beigemischt
function stone(mat) {
  const t = pbr('marble_floor', [1, 1]).map;
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.tStone = { value: t };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWP; varying vec3 vWN;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWP = (modelMatrix * vec4(transformed, 1.0)).xyz; vWN = normalize(mat3(modelMatrix) * objectNormal);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tStone; varying vec3 vWP; varying vec3 vWN;')
      .replace('#include <map_fragment>', `vec3 bw = pow(abs(vWN), vec3(4.0)); bw /= (bw.x + bw.y + bw.z);
        vec3 st = texture2D(tStone, vWP.zy / 3.0).rgb * bw.x + texture2D(tStone, vWP.xz / 3.0).rgb * bw.y + texture2D(tStone, vWP.xy / 3.0).rgb * bw.z;
        diffuseColor.rgb *= mix(vec3(1.0), st * 1.2, 0.5);`);
  };
  mat.customProgramCacheKey = () => 'oasis-stone';
}
export function oasisMosque(world, { x = 0, z = 0, ry = 0, scale = 1, shadows = true } = {}) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; g.scale.setScalar(scale); world.add(g);
  load ||= new GLTFLoader().loadAsync('./assets/models/oasis_mosque.glb').then((r) => r.scene).catch(() => null);
  load.then((sc) => {
    if (!sc || !g.parent) return;
    const m = sc.clone(true);
    m.traverse((o) => {
      if (!o.isMesh) return;
      if (o.name === 'stone' || o.material.name === 'stone') { o.material = new THREE.MeshStandardMaterial({ color: 0xeee4d0, roughness: 0.82 }); stone(o.material); }
      else o.material = o.material.clone();
      o.castShadow = shadows; o.receiveShadow = true;
    });
    g.add(m);
  });
  return g;
}
