import * as THREE from 'three';

// Natürliches Leben am Himmel: Vogelschwärme (am Haram Tauben) und ab und zu ein Flugzeug hoch oben.
// Sehr leicht: ein InstancedMesh für alle Vögel (Flügelschlag im Vertex-Shader), ein kleines Flugzeug-Modell.
// kind: 'haram' (Tauben über dem Mataf), 'desert' (wenige Vögel + Flugzeug), 'none'
export function createLife(ctx, { kind = 'desert', height = 0 } = {}) {
  if (kind === 'none') return { update() {}, dispose() {} };
  const world = ctx.engine.world, sky = ctx.sky;
  const mobile = ctx.engine.isMobile;

  // Vogel: Körper + zwei Flügel (Dreiecke). Flügel-Ecken haben |x| > 0 → schlagen im Shader auf und ab.
  const g = new THREE.BufferGeometry();
  const v = new Float32Array([
    0, 0, 0.18, -0.06, 0, -0.12, 0.06, 0, -0.12, // Körper
    0, 0, 0.06, -0.5, 0, -0.04, 0, 0, -0.08, // linker Flügel
    0, 0, 0.06, 0, 0, -0.08, 0.5, 0, -0.04, // rechter Flügel
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(v, 3)); g.computeVertexNormals();
  const N = kind === 'haram' ? (mobile ? 24 : 40) : (mobile ? 10 : 16);
  const phase = new THREE.InstancedBufferAttribute(new Float32Array(N).map(() => Math.random() * 6.28), 1);
  g.setAttribute('aPhase', phase);
  const uT = { value: 0 };
  const mat = new THREE.MeshBasicMaterial({ color: kind === 'haram' ? 0x8a8780 : 0x3a332c, side: THREE.DoubleSide, fog: true });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uT = uT;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aPhase; uniform float uT;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nfloat flap = sin(uT * 9.0 + aPhase) * 0.9; transformed.y += abs(transformed.x) * flap;');
  };
  const birds = new THREE.InstancedMesh(g, mat, N); birds.frustumCulled = false; world.add(birds);
  const dm = new THREE.Object3D();
  // Mittelpunkt folgt dem Spieler langsam (die Vögel bleiben in Sichtweite, ohne ihm nachzujagen)
  const center = new THREE.Vector3(); if (ctx.player) center.copy(ctx.player.pos);
  // Schwärme: kreisen um einen Mittelpunkt, jeder Vogel mit eigenem Abstand/Höhe
  const B = Array.from({ length: N }, (_, i) => ({ r: (kind === 'haram' ? 25 : 30) + Math.random() * (kind === 'haram' ? 30 : 70), a: Math.random() * 6.28, h: height + (kind === 'haram' ? 18 : 16) + Math.random() * 20, sp: (0.18 + Math.random() * 0.12) * (i % 2 ? 1 : -1), s: kind === 'haram' ? 1.3 : 2.2, wob: Math.random() * 6 }));

  // Flugzeug: Rumpf, Flügel, Leitwerk; nachts blinkende Lichter
  let plane = null, pT = 12 + Math.random() * 20, pDir = new THREE.Vector3(), pPos = new THREE.Vector3();
  if (kind !== 'haram') {
    plane = new THREE.Group();
    const white = new THREE.MeshBasicMaterial({ color: 0xd8dde2, fog: false, transparent: true, opacity: 0.85 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 30, 8).rotateX(Math.PI / 2), white);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(34, 0.4, 5), white);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(11, 0.3, 3), white); tail.position.z = -13;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5, 3), white); fin.position.set(0, 2.5, -13);
    const lightM = new THREE.MeshBasicMaterial({ color: 0xff3a2a, fog: false });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.2, 6, 4), lightM); lamp.position.set(17, 0, 0);
    const lamp2 = lamp.clone(); lamp2.material = new THREE.MeshBasicMaterial({ color: 0x3aff6a, fog: false }); lamp2.position.x = -17;
    plane.add(body, wing, tail, fin, lamp, lamp2); plane.visible = false; plane.userData.lamps = [lamp, lamp2]; plane.userData.body = [body, wing, tail, fin];
    world.add(plane);
  }
  let t = 0;
  return {
    update(dt) {
      t += dt; uT.value = t;
      if (ctx.player) center.lerp(ctx.player.pos, Math.min(1, dt * 0.05));
      const h = ((sky.hour % 24) + 24) % 24, night = h < 6.1 || h > 18.7;
      birds.visible = !night; // nachts fliegen keine Vögel
      if (birds.visible) {
        for (let i = 0; i < N; i++) {
          const b = B[i]; b.a += b.sp * dt;
          const x = center.x + Math.cos(b.a) * b.r, z = center.z + Math.sin(b.a) * b.r, y = b.h + Math.sin(t * 0.7 + b.wob) * 2;
          dm.position.set(x, y, z); dm.rotation.set(0, b.sp > 0 ? -b.a + Math.PI : -b.a, 0); dm.scale.setScalar(b.s); dm.updateMatrix(); birds.setMatrixAt(i, dm.matrix);
        }
        birds.instanceMatrix.needsUpdate = true;
      }
      if (plane) {
        pT -= dt;
        if (!plane.visible && pT <= 0) { // neuer Überflug: hoch oben, quer über den Himmel
          const a = Math.random() * 6.28; pDir.set(Math.cos(a), 0, Math.sin(a));
          pPos.set(center.x - pDir.x * 1400, 650 + Math.random() * 200, center.z - pDir.z * 1400);
          plane.rotation.y = Math.atan2(pDir.x, pDir.z); plane.visible = true;
        }
        if (plane.visible) {
          pPos.addScaledVector(pDir, 60 * dt); plane.position.copy(pPos);
          // nachts nur die blinkenden Positionslichter, tagsüber der helle Rumpf
          const blink = Math.sin(t * 6) > 0.6; for (const l of plane.userData.lamps) l.visible = night ? blink : true;
          for (const m of plane.userData.body) m.visible = !night;
          if (Math.hypot(pPos.x - center.x, pPos.z - center.z) > 1500 && (pPos.x - center.x) * pDir.x + (pPos.z - center.z) * pDir.z > 0) { plane.visible = false; pT = 60 + Math.random() * 60; }
        }
      }
    },
    dispose() { g.dispose(); mat.dispose(); },
  };
}
