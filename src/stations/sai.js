import * as THREE from 'three';
import { TEXT, SAFA_AYAH } from '../content/hajj.js';
import { pbr } from '../world/assets.js';
import { rock, sign } from '../world/props.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, goTo, promptAt, holdAction, duaFacing, pointGoal, sunnah } from '../core/kit.js';

const T = TEXT.sai;
// Gang entlang z: Safa bei z = −L/2, Marwa bei z = +L/2. Spur Richtung Marwa: x > 0 (links der Mitte, in Laufrichtung).
const L = 90, W = 20, H = 10;
const G0 = -L / 2 + L * 0.38, G1 = -L / 2 + L * 0.6; // grüner Abschnitt
const KAABA_DIR = { x: -160, z: -70 }; // Richtung zur Kaaba (außerhalb des Gangs)

export function create(ctx, st) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  const umrah = st.umrah !== false;
  sky.setHour(umrah ? 22 : 17.5);
  sky.state.indoor = true;
  sky.state.shadowSize = 40;

  // Boden, Decke, Wände
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, L + 16), new THREE.MeshStandardMaterial({ ...pbr('marble_floor', [W / 1.5, (L + 16) / 1.5]), roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; world.add(floor);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, L + 16), new THREE.MeshStandardMaterial({ color: 0xf1ede4, roughness: 0.8, side: THREE.DoubleSide }));
  ceil.rotation.x = Math.PI / 2; ceil.position.y = H; world.add(ceil);
  const panelMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4dc, emissiveIntensity: 1.4 });
  const greenMat = new THREE.MeshStandardMaterial({ color: 0x9fffc4, emissive: 0x2bff88, emissiveIntensity: 2.2 });
  for (let z = -L / 2; z < L / 2; z += 6) {
    for (const x of [-5, 5]) {
      const green = z > G0 - 1 && z < G1 + 1;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(green ? 8 : 3.4, green ? 0.5 : 3.4), green ? greenMat : panelMat);
      p.rotation.x = Math.PI / 2; p.position.set(x, H - 0.02, z); world.add(p);
    }
  }
  // Grüne Leuchtsäulen an Anfang und Ende des grünen Bereichs
  for (const z of [G0, G1]) for (const x of [-9.6, 9.6, -0.5, 0.5]) {
    const g = new THREE.Mesh(new THREE.BoxGeometry(0.3, H, 0.3), greenMat); g.position.set(x, H / 2, z); world.add(g);
  }
  const wallMat = new THREE.MeshStandardMaterial({ color: 0xe6dfd2, roughness: 0.7 });
  const archMat = new THREE.MeshStandardMaterial({ color: 0xcfc4b0, roughness: 0.6 });
  for (const sx of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.6, H, L + 16), wallMat); wall.position.set(sx * (W / 2 + 0.3), H / 2, 0); wall.receiveShadow = true; world.add(wall);
    // Säulen und Bögen an den Wänden
    for (let z = -L / 2; z <= L / 2; z += 7.5) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, H - 1.5, 16), archMat); c.position.set(sx * (W / 2 - 0.6), (H - 1.5) / 2, z); c.castShadow = true; world.add(c);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.5, 1.3), archMat); cap.position.set(sx * (W / 2 - 0.6), H - 1.5, z); world.add(cap);
    }
  }
  // Mittelbarriere mit Säulen (trennt die Laufrichtungen)
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xbfb6a4, roughness: 0.5 });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 72), barrierMat); bar.position.set(0, 0.55, 0); bar.castShadow = true; world.add(bar);
  for (let z = -36; z <= 36; z += 9) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, H, 16), archMat); c.position.set(0, H / 2, z); c.castShadow = true; world.add(c); }

  // Safa und Marwa: freiliegender Fels hinter Glas, mit Schild
  const glassMat = new THREE.MeshStandardMaterial({ color: 0xbfe0e8, transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.2 });
  for (const [z, ar, de] of [[-L / 2, 'الصفا', 'As-Safa'], [L / 2, 'المروة', 'Al-Marwa']]) {
    const s = Math.sign(z);
    rock(world, { r: 6, x: 0, y: 0.5, z: z + s * 6.5, sy: 0.45, seed: s * 3, rep: 3 });
    const gl = new THREE.Mesh(new THREE.BoxGeometry(14, 1.1, 0.06), glassMat); gl.position.set(0, 0.55, z + s * 1.6); world.add(gl);
    sign(world, 0, z + s * 0.5, s > 0 ? Math.PI : 0, [ar, de], { w: 7, h: 1.8, y: 6.5 });
    const endWall = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMat); endWall.position.set(0, H / 2, z + s * 8); endWall.rotation.y = s > 0 ? Math.PI : 0; world.add(endWall);
  }
  // Raumlicht (Halle ist überdacht)
  const lightA = new THREE.PointLight(0xfff0d8, 60, 40, 1.6); lightA.position.set(0, H - 1, -30);
  const lightB = new THREE.PointLight(0xfff0d8, 60, 40, 1.6); lightB.position.set(0, H - 1, 30);
  const lightG = new THREE.PointLight(0x6dffaa, 30, 26, 1.6); lightG.position.set(0, H - 1, (G0 + G1) / 2);
  world.add(lightA, lightB, lightG);

  // Kollision: Gang, Barriere, Glas vor den Felsen
  const colliders = [
    { type: 'rect', x0: -W / 2 + 0.9, x1: W / 2 - 0.9, z0: -L / 2 + 1.7, z1: L / 2 - 1.7 },
    { type: 'box', x: 0, z: 0, hw: 0.45, hd: 36 },
  ];
  for (let z = -36; z <= 36; z += 9) colliders.push({ type: 'circle', x: 0, z, r: 0.45 });

  const player = createPlayer(ctx, { x: 4, z: -L / 2 + 3.5, heading: 0, color: umrah ? 0xf3f1ea : 0x6f7f8e, speed: 3.4, fastSpeed: 5.4, colliders, camDist: 5.5, camHeight: 2.3 });

  // Mitpilger in zwei Richtungen
  const N = engine.isMobile ? 260 : 400;
  const crowd = createCrowd(world, N, { ihram: umrah });
  const cx = new Float32Array(N), cz = new Float32Array(N), cv = new Float32Array(N), men = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    const dir = i % 2 ? 1 : -1;
    cx[i] = dir * (1 + Math.random() * 7.5); cz[i] = (Math.random() - 0.5) * L; cv[i] = dir * (1.1 + Math.random() * 0.5); men[i] = Math.random() < 0.6 ? 1 : 0;
  }

  const flow = createFlow();
  const marker = createMarker(world, { r: 1.8 });
  let lap = 0, target = 'marwa', duaCount = 0, greenHintLap = -1, time = 0, hillAction = false;

  function hillDua(where) {
    ui.actions([{ label: where === 'safa' && lap === 0 ? T.ayah : T.duaHill, kind: 'sunnah', onClick: async () => {
      ui.actions([]);
      if (where === 'safa' && lap === 0) ui.info(`${ui.prayer(SAFA_AYAH)}<p class="tr">Dreh dich zur Kaaba (Pfeil oben) und halte zum Dua.</p>`);
      hillAction = true;
      await duaFacing(ctx, flow, { tx: KAABA_DIR.x, tz: where === 'safa' ? KAABA_DIR.z : KAABA_DIR.z + L, sec: 4, text: T.faceKaaba });
      hillAction = false;
      duaCount++; if (duaCount >= 2) sunnah(ctx, 'safa');
      ui.toast('Dua ✓');
      ui.info(`<p>${lap % 2 === 0 ? T.go : T.back}</p>`);
    } }]);
  }

  async function run() {
    ui.info(`<p>${T.startInfo}</p><p class="tr">${T.go}</p>`);
    hillDua('safa');
    await flow.until(() => lap >= 7);
    ui.actions([]);
    if (umrah) {
      ui.info(`<p>Sieben Strecken – du endest auf Marwa.</p><p class="tr">${T.taqsir}</p>`);
      await goTo(ctx, flow, marker, T.taqsirGoal, -5, L / 2 - 5);
      await promptAt(ctx, flow, T.taqsir, () => marker.inside(player.pos, 1));
      marker.hide();
      await flow.run(holdAction(ctx, player, { label: 'Halten: Haare kürzen', steps: [{ pose: 'bend', sec: 2.2 }] }));
      ui.toast('Taqsir ✓');
      ui.info(`<p>${T.umrahDone}</p>`);
    } else {
      ui.info(`<p>${T.hajjDone}</p>`);
    }
    await goTo(ctx, flow, marker, T.exit, 7, L / 2 - 4);
    ctx.next();
  }
  run();

  return {
    update(dt) {
      time += dt;
      flow.update(dt);
      player.update(dt);
      marker.update(dt);
      const p = player.pos;
      const inGreen = p.z > G0 && p.z < G1;

      if (lap < 7) {
        // Ankunft am Hügel
        if (target === 'marwa' && p.z > L / 2 - 4.5) {
          lap++; target = 'safa';
          ui.toast(`Strecke ${lap} / 7 ✓`, 2200);
          if (lap < 7) { ui.info(`<p>Marwa. ${T.back}</p>`); hillDua('marwa'); }
        } else if (target === 'safa' && p.z < -L / 2 + 4.5) {
          lap++; target = 'marwa';
          ui.toast(`Strecke ${lap} / 7 ✓`, 2200);
          ui.info(`<p>Safa. ${T.go}</p>`); hillDua('safa');
        }
        // Weg vom Hügel → Dua-Knopf verschwindet
        if (!hillAction && Math.abs(p.z) < L / 2 - 9 && ui.el.actions.childElementCount) ui.actions([]);
        ui.counter(`Strecke ${Math.min(7, lap + 1)} / 7`);
        if (!hillAction) pointGoal(ui, player, target === 'marwa' ? 'Marwa' : 'Safa', target === 'marwa' ? 3.5 : -3.5, target === 'marwa' ? L / 2 - 3 : -L / 2 + 3);
        if (inGreen && player.moving > 0.2) {
          if (greenHintLap !== lap) { greenHintLap = lap; ui.toast(T.green, 2400); if (!player.fast) ui.hint(T.greenHint, 3000); }
        }
      }

      // Mitpilger
      for (let i = 0; i < N; i++) {
        const g = cz[i] > G0 && cz[i] < G1 && men[i] ? 1.8 : 1;
        cz[i] += cv[i] * g * dt;
        if (cz[i] > L / 2 - 3) { cz[i] = -L / 2 + 3; } else if (cz[i] < -L / 2 + 3) { cz[i] = L / 2 - 3; }
        let x = cx[i], z = cz[i];
        const dx = x - p.x, dz = z - p.z, dd = Math.hypot(dx, dz);
        if (dd < 1) { x = p.x + (dx / (dd || 1)) * 1; }
        crowd.set(i, x, Math.abs(Math.sin(time * 6 + i)) * 0.04, z, cv[i] > 0 ? 0 : Math.PI);
      }
      crowd.commit();
    },
    dispose() { flow.dispose(); },
  };
}
