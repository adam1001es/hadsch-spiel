import * as THREE from 'three';
import { initAssets } from '../world/assets.js';

// Renderer, Kamera, Szene. Alles Stationsspezifische kommt in `world` und wird beim Wechsel entsorgt.
export function createEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  // Auflösung: so scharf wie das Display (max. 2). Sinkt die Bildrate, wird sie stufenweise reduziert.
  const maxRatio = Math.min(window.devicePixelRatio || 1, 2);
  let ratio = maxRatio;
  renderer.setPixelRatio(ratio);
  initAssets(renderer);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 5000);
  let world = new THREE.Group();
  scene.add(world);

  let shiftOverride = null; // beim Fahren: Fahrer in die Mitte des freien Bereichs über den Fahrknöpfen
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Bildmitte etwas nach unten verschieben: die Spielfigur steht tiefer im Bild, oben ist Platz für Titel und Infokarte
    // (im Hochformat mehr, weil dort die Karte einen größeren Teil des Bildes bedeckt)
    const shift = shiftOverride != null ? shiftOverride(w, h) : h > w ? 0.14 : 0.08;
    camera.setViewOffset(w, h, 0, -h * shift, w, h);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function clearWorld() {
    world.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'bumpMap', 'emissiveMap']) if (m[k]) m[k].dispose();
        m.dispose();
      }
    });
    scene.remove(world);
    world = new THREE.Group();
    scene.add(world);
    return world;
  }

  // Bildrate messen: unter ~26 FPS Auflösung senken, über ~55 FPS wieder anheben.
  let acc = 0, frames = 0;
  function adapt(dt) {
    if (dt > 0.25) return; // Tab war im Hintergrund o. Ä.
    acc += dt; frames++;
    if (acc < 2) return;
    const fps = frames / acc; acc = 0; frames = 0;
    let next = ratio;
    if (fps < 26 && ratio > 1) next = Math.max(1, ratio - 0.25);
    else if (fps > 55 && ratio < maxRatio) next = Math.min(maxRatio, ratio + 0.25);
    if (next !== ratio) { ratio = next; renderer.setPixelRatio(ratio); resize(); }
  }

  return {
    setViewShift(fn) { shiftOverride = fn; resize(); }, // fn(w, h) → Anteil (positiv = Bild nach unten), null = Standard
    THREE, adapt, renderer, scene, camera,
    get world() { return world; },
    clearWorld,
    isMobile: Math.min(window.innerWidth, window.innerHeight) < 700,
  };
}
