import * as THREE from 'three';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

// Echte CC0-Texturen (Poly Haven) aus public/assets. Quellen: public/assets/textures/README.md
// Bilder werden einmal geladen und zwischengespeichert; jede Textur bekommt ihr eigenes Wiederholungsmaß.
const BASE = './assets/';
const images = new Map();
let maxAniso = 8;

export function initAssets(renderer) {
  maxAniso = Math.min(16, renderer.capabilities.getMaxAnisotropy());
}

function image(url) {
  if (!images.has(url)) {
    images.set(url, new Promise((res, rej) => {
      const img = new Image();
      img.decoding = 'async';
      img.onload = () => res(img);
      img.onerror = rej;
      img.src = url;
    }));
  }
  return images.get(url);
}

// Lädt eine Textur; sie ist sofort verwendbar und erscheint, sobald das Bild da ist.
export function texture(name, { repeat = [1, 1], color = true } = {}) {
  const t = new THREE.Texture();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = maxAniso;
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  image(BASE + 'textures/' + name).then((img) => { t.image = img; t.needsUpdate = true; }).catch(() => {});
  return t;
}

// Farbe + Normal + Rauheit eines Materials (Dateien <name>_diff/_nor/_rough.jpg)
export function pbr(name, repeat) {
  return {
    map: texture(`${name}_diff.jpg`, { repeat }),
    normalMap: texture(`${name}_nor.jpg`, { repeat, color: false }),
    roughnessMap: texture(`${name}_rough.jpg`, { repeat, color: false }),
  };
}

// Umgebungslicht aus echten Himmelsfotos (HDRI): sorgt für glaubwürdige Spiegelungen auf Marmor und Gold.
const envs = {};
export function environment(renderer, which) {
  if (!envs[which]) {
    envs[which] = new Promise((res) => {
      new RGBELoader().load(BASE + `hdri/${which}.hdr`, (hdr) => {
        const pm = new THREE.PMREMGenerator(renderer);
        const rt = pm.fromEquirectangular(hdr);
        hdr.dispose(); pm.dispose();
        res(rt.texture);
      }, undefined, () => res(null));
    });
  }
  return envs[which];
}
