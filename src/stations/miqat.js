import * as THREE from 'three';
import { TEXT, TALBIYAH } from '../content/hajj.js';
import { heightFn, buildTerrain } from '../world/terrain.js';
import { palms, mosque, sign } from '../world/props.js';
import { createCrowd } from '../world/crowd.js';
import { createPlayer } from '../core/player.js';
import { createFlow, createMarker, goTo, promptAt, holdAction, sunnah } from '../core/kit.js';

const T = TEXT.miqat;

// Station 1: Miqat Dhul-Hulaifa (Abyar Ali) bei Medina, Nachmittag.
export function create(ctx, st) {
  const { engine, sky, ui } = ctx;
  const world = engine.world;
  sky.setHour(16);
  sky.state.shadowSize = 60;

  const h = heightFn({ r0: 160, r1: 480, amp: 170 });
  buildTerrain(world, h);
  const glow = [];
  // Moschee mit hohem Minarett, Waschhaus, Palmenhain
  mosque(world, { x: 0, z: -48, w: 56, d: 34, h: 10, minarets: 1, glow });
  const wash = new THREE.Group(); wash.position.set(-30, 0, -6); world.add(wash);
  const wm = new THREE.MeshStandardMaterial({ color: 0xece6da, roughness: 0.8 });
  const wb = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 9), wm); wb.position.y = 2; wb.castShadow = wb.receiveShadow = true; wash.add(wb);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshStandardMaterial({ color: 0x5b4632 })); door.position.set(0, 1.4, 4.52); wash.add(door);
  sign(world, -30, -1.2, 0, ['مغاسل', 'Waschräume · Ghusl'], { w: 5, h: 1.3, y: 4.6 });
  // Bus
  const bus = new THREE.Group(); bus.position.set(34, 0, 22); bus.rotation.y = -0.3; world.add(bus);
  const bm = new THREE.MeshStandardMaterial({ color: 0xf3f3f0, roughness: 0.4, metalness: 0.2 });
  const bb = new THREE.Mesh(new THREE.BoxGeometry(3, 3.2, 12), bm); bb.position.y = 1.9; bb.castShadow = true; bus.add(bb);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(3.05, 1.1, 10.5), new THREE.MeshStandardMaterial({ color: 0x223040, roughness: 0.15, metalness: 0.6 })); glass.position.set(0, 2.6, 0.3); bus.add(glass);
  for (const [x, z] of [[-1.5, -4], [1.5, -4], [-1.5, 4], [1.5, 4]]) { const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 16), new THREE.MeshStandardMaterial({ color: 0x1b1b1b })); wh.rotation.z = Math.PI / 2; wh.position.set(x, 0.55, z); bus.add(wh); }
  const plist = [];
  for (let i = 0; i < 70; i++) { const a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 70; plist.push([Math.cos(a) * r, 0, Math.sin(a) * r, Math.random() * 6, 0.8 + Math.random() * 0.5]); }
  for (let i = 0; i < 12; i++) plist.push([(i - 5.5) * 9, 0, -22, Math.random() * 6, 0.9]); // Palmenreihe vor der Moschee
  palms(world, plist);
  // Pilger rund um die Moschee
  const N = 160, crowd = createCrowd(world, N, { ihram: true });
  const cp = [];
  for (let i = 0; i < N; i++) { cp.push([(Math.random() - 0.5) * 70, -24 - Math.random() * 10, Math.random() * 6]); crowd.set(i, cp[i][0], 0, cp[i][1], cp[i][2]); }
  crowd.commit();

  const colliders = [
    { type: 'box', x: 0, z: -48, hw: 28, hd: 17 }, { type: 'circle', x: 31, z: -34, r: 1.6 },
    { type: 'box', x: -30, z: -6, hw: 7, hd: 4.5 }, { type: 'box', x: 34, z: 22, hw: 1.6, hd: 6, rot: -0.3 },
    { type: 'inside', x: 0, z: 0, r: 110 },
  ];
  const player = createPlayer(ctx, { x: 4, z: 26, heading: Math.PI, color: 0x3d6b9a, speed: 3.2, fastSpeed: 5, colliders });
  player.fig.skinM.color.setHex(0xb07a4f);

  const flow = createFlow();
  const marker = createMarker(world, { r: 2 });

  async function run() {
    ui.info(`<p>${st.intro}</p><p class="tr">${T.ghuslInfo}</p>`);
    await goTo(ctx, flow, marker, T.goGhusl, -30, -0.5);
    await promptAt(ctx, flow, T.ghusl, () => marker.inside(player.pos, 1));
    marker.hide();
    await flow.run(holdAction(ctx, player, { label: 'Halten: Ghusl', steps: [{ pose: 'bend', sec: 1.2 }, { pose: 'stand', sec: 0.6 }, { pose: 'bend', sec: 1.2 }] }));
    ui.toast('Ghusl ✓'); ctx.mission?.done(0);
    await ui.choice(T.clothesQ, T.clothes);
    player.fig.setColor(0xf6f4ee);
    ui.toast('Ihram angelegt ✓'); ctx.mission?.done(1);

    ui.info(`<p>Geh zur Moschee und fasse dort die Absicht.</p>`);
    await goTo(ctx, flow, marker, T.goMosque, 0, -28);
    await promptAt(ctx, flow, T.niyyaPlace, () => marker.inside(player.pos, 1));
    marker.hide();
    await ui.choice(T.niyyaQ, T.niyya);
    ui.toast('Niyya: Labbaika ʿumratan ✓'); ctx.mission?.done(2);

    // Talbiyah als Sunnah: Teile in Reihenfolge antippen
    let talbiyahDone = false;
    ui.info(`<p>Ab jetzt sprichst du die Talbiyah – oft und mit Freude.</p>`);
    ui.actions([{ label: 'Talbiyah sprechen', kind: 'sunnah', onClick: async () => {
      ui.actions([]);
      await ui.order(T.talbiyahQ, T.talbiyahParts);
      sunnah(ctx, 'talbiyah');
      ui.info(ui.prayer(TALBIYAH));
      ui.toast('Labbaik ✓'); ctx.mission?.done(3);
      talbiyahDone = true;
    } }, { label: 'Weiter', onClick: () => { ui.actions([]); talbiyahDone = true; } }]);
    await flow.until(() => talbiyahDone);

    // Ihram-Verbote: 4 Karten (verboten / erlaubt)
    const pickRules = [...T.rules].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!pickRules.some((r) => !r[1])) pickRules[3] = T.rules.find((r) => !r[1]);
    for (const [txt, forbidden] of pickRules) {
      await ui.choice(`${T.rulesQ}<br><b>${txt}</b>`, [
        { html: 'Verboten', ok: forbidden, why: forbidden ? `Richtig – im Ihram verboten.` : 'Das ist erlaubt – im Ihram sogar erwünscht bzw. normal.' },
        { html: 'Erlaubt', ok: !forbidden, why: !forbidden ? 'Richtig – das ist erlaubt.' : 'Das ist im Ihram verboten.' },
      ]);
    }
    ui.info(`<p>${T.rulesInfo}</p>`); ctx.mission?.done(4);

    await goTo(ctx, flow, marker, T.goBus, 31.5, 18);
    await promptAt(ctx, flow, T.bus, () => marker.inside(player.pos, 1));
    ctx.next();
  }
  run();

  let t = 0;
  return {
    update(dt) {
      t += dt;
      flow.update(dt);
      player.update(dt);
      marker.update(dt);
      for (const m of glow) m.emissiveIntensity = sky.art * 1.2;
      // Pilger stehen und beten leicht wiegend
      for (let i = 0; i < N; i += 7) crowd.set(i, cp[i][0], 0, cp[i][1], cp[i][2] + Math.sin(t + i) * 0.2);
      crowd.commit();
    },
    dispose() { flow.dispose(); },
  };
}
