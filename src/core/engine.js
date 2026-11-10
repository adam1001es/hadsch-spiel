import * as THREE from 'three';

// Renderer, Kamera, Szene. Alles Stationsspezifische kommt in `world` und wird beim Wechsel entsorgt.
export function createEngine(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.6;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 5000);
  let world = new THREE.Group();
  scene.add(world);

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function clearWorld() {
    world.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of mats) {
        for (const k of ['map', 'normalMap', 'roughnessMap', 'emissiveMap']) if (m[k]) m[k].dispose();
        m.dispose();
      }
    });
    scene.remove(world);
    world = new THREE.Group();
    scene.add(world);
    return world;
  }

  return {
    THREE, renderer, scene, camera,
    get world() { return world; },
    clearWorld,
    isMobile: Math.min(window.innerWidth, window.innerHeight) < 700,
  };
}
