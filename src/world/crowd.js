import * as THREE from 'three';

const SKIN = [0x5a3825, 0x8d5524, 0xc68642, 0xe0ac69, 0xf1c27d, 0x3d2618];
const pick = (a) => a[(Math.random() * a.length) | 0];

// Körperform (Gewand bis zum Boden, Schultern, Hals) als Drehkörper, vorne/hinten abgeflacht. Ca. 1,70 m groß.
const PROFILE = [[0, 0], [0.25, 0], [0.27, 0.12], [0.25, 0.5], [0.22, 0.9], [0.215, 1.05], [0.235, 1.22], [0.235, 1.33], [0.19, 1.42], [0.07, 1.47], [0.055, 1.5], [0, 1.5]];
function bodyGeometry(seg) {
  const g = new THREE.LatheGeometry(PROFILE.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  g.scale(1, 1, 0.68);
  return g;
}
function headGeometry(seg) {
  const g = new THREE.SphereGeometry(0.105, seg, Math.round(seg * 0.75));
  g.scale(0.92, 1.12, 1); g.translate(0, 1.6, 0.01);
  return g;
}

// Viele Pilger als zwei InstancedMeshes (Körper + Kopf). set(i, x, y, z, rotY, scaleY, rotX)
export function createCrowd(world, n, { men = 0.6, ihram = true } = {}) {
  const bodyG = bodyGeometry(10), headG = headGeometry(10);
  const B = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ roughness: 0.95 }), n);
  const H = new THREE.InstancedMesh(headG, new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
  B.frustumCulled = H.frustumCulled = false;
  const c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    let bc, hc;
    if (Math.random() < men) { bc = ihram ? 0xf3f1ea : pick([0xf4f2ec, 0x9aa6b2, 0x6b5b4b, 0xdedad0]); hc = pick(SKIN); }
    else { const r = Math.random(); bc = r < 0.45 ? 0xf1efe9 : r < 0.85 ? 0x1c1b1f : pick([0x3b4a5c, 0x6a5a49]); hc = r < 0.45 ? 0xf6f5f0 : bc; }
    B.setColorAt(i, c.setHex(bc).multiplyScalar(0.9 + Math.random() * 0.1));
    H.setColorAt(i, c.setHex(hc));
  }
  world.add(B, H);
  const d = new THREE.Object3D();
  return {
    n,
    set(i, x, y, z, ry = 0, sy = 1, rx = 0) {
      d.position.set(x, y, z); d.rotation.set(rx, ry, 0); d.scale.set(1, sy, 1); d.updateMatrix();
      B.setMatrixAt(i, d.matrix); H.setMatrixAt(i, d.matrix);
    },
    commit() { B.instanceMatrix.needsUpdate = H.instanceMatrix.needsUpdate = true; },
  };
}

export function createPilgrim(world, bodyColor = 0xf3f1ea) {
  const g = new THREE.Group();
  const bodyG = bodyGeometry(24), headG = headGeometry(20);
  const bodyM = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.9 });
  const body = new THREE.Mesh(bodyG, bodyM), head = new THREE.Mesh(headG, new THREE.MeshStandardMaterial({ color: 0xc68642, roughness: 0.6 }));
  body.castShadow = head.castShadow = true;
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.58, 32), new THREE.MeshBasicMaterial({ color: 0xf0c35a, transparent: true, opacity: 0.9, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.04;
  g.add(body, head, ring); world.add(g);
  return { group: g, setColor: (c) => bodyM.color.setHex(c) };
}
