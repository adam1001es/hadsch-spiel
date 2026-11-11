
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

export function createAnimatedPeople({
  maxActive = 12,
  onWarning = console.warn
} = {}) {
  const loader = new GLTFLoader();
  const assets = new Map();
  const actors = new Set();

  let disposed = false;

  async function load(id, url) {
    const key = `${id}:${url}`;

    if (!assets.has(key)) {
      const promise = loader.loadAsync(url).then(gltf => {
        if (!gltf.scene || !gltf.animations.length) {
          throw new Error(`${id}: GLB enthält keine Animationen`);
        }

        return {
          scene: gltf.scene,
          animations: gltf.animations
        };
      }).catch(error => {
        assets.delete(key);
        throw error;
      });

      assets.set(key, promise);
    }

    return assets.get(key);
  }

  async function create({
    id,
    url,
    parent,
    position = new THREE.Vector3(),
    heading = 0,
    scale = 1
  }) {
    if (disposed) throw new Error('Crowd-System beendet');

    const asset = await load(id, url);

    if (actors.size >= maxActive) {
      throw new Error('Maximale Anzahl animierter Figuren erreicht');
    }

    const model = SkeletonUtils.clone(asset.scene);

    let hasSkeleton = false;

    model.traverse(node => {
      if (node.isSkinnedMesh) hasSkeleton = true;

      if (node.isMesh) {
        node.castShadow = false;
        node.receiveShadow = false;
      }
    });

    if (!hasSkeleton) {
      throw new Error(`${id}: Kein animiertes Skelett gefunden`);
    }

    const root = new THREE.Group();
    root.add(model);
    root.position.copy(position);
    root.rotation.y = heading;
    root.scale.setScalar(scale);
    parent.add(root);

    const mixer = new THREE.AnimationMixer(model);
    const actions = new Map();

    const walkClips = asset.animations.filter(clip =>
      /walk|walking|locomotion/i.test(clip.name)
    );

    if (!walkClips.length) {
      parent.remove(root);
      throw new Error(`${id}: Keine Gehanimation gefunden`);
    }

    for (const clip of asset.animations) {
      actions.set(clip.name, mixer.clipAction(clip));
    }

    const clip = walkClips[
      Math.floor(Math.random() * walkClips.length)
    ];

    let currentAction = actions.get(clip.name);

    currentAction.time =
      Math.random() * Math.max(0, clip.duration);

    currentAction.timeScale = 0.9 + Math.random() * 0.2;
    currentAction.play();
    mixer.update(0);

    let active = true;
    let alive = true;

    const actor = {
      root,
      mixer,

      update(dt) {
        if (!alive || !active) return;
        mixer.update(Math.min(dt, 0.05));
      },

      setAnimation(name, fade = 0.2) {
        const next = [...actions.entries()].find(
          ([key]) => key.toLowerCase().includes(name.toLowerCase())
        )?.[1];

        if (!next) return false;
        if (next === currentAction) return true;

        next.reset();
        next.timeScale = 0.9 + Math.random() * 0.2;
        next.fadeIn(fade);
        currentAction.crossFadeTo(next, fade, true);
        next.play();

        currentAction = next;
        return true;
      },

      setPosition(x, y, z) {
        root.position.set(x, y, z);
      },

      setHeading(angle) {
        root.rotation.y = angle;
      },

      setActive(value) {
        active = value;
        mixer.timeScale = value ? 1 : 0;
      },

      dispose() {
        if (!alive) return;

        alive = false;
        mixer.stopAllAction();
        mixer.uncacheRoot(model);
        parent.remove(root);
        actors.delete(actor);
      }
    };

    actors.add(actor);
    return actor;
  }

  return {
    load,
    create,

    update(dt) {
      for (const actor of actors) {
        actor.update(dt);
      }
    },

    dispose() {
      disposed = true;

      for (const actor of [...actors]) {
        actor.dispose();
      }

      assets.clear();
    },

    get count() {
      return actors.size;
    }
  };
}
