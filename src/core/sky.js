import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';
import { environment } from '../world/assets.js';

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// Physikalischer Himmel + Sonne/Mond + Sterne. setHour(h) steuert Tageszeit (0–24, darf > 24 sein).
export function createSky(engine) {
  const { scene, renderer, camera } = engine;
  const sky = new Sky();
  sky.scale.setScalar(4000);
  scene.add(sky);
  const u = sky.material.uniforms;
  u.turbidity.value = 6; u.rayleigh.value = 1.6; u.mieCoefficient.value = 0.006; u.mieDirectionalG.value = 0.85;

  const starGeo = new THREE.BufferGeometry();
  const pts = [];
  for (let i = 0; i < 2000; i++) {
    const t = Math.random() * Math.PI * 2, p = Math.acos(Math.random());
    pts.push(Math.sin(p) * Math.cos(t) * 3000, Math.cos(p) * 3000, Math.sin(p) * Math.sin(t) * 3000);
  }
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false }));
  scene.add(stars);

  // Echte Himmelsfotos (Poly Haven, CC0): Tag, Sonnenuntergang, Nacht mit Milchstraße.
  // Je nach Sonnenstand überblendet; die Fotos werden so gedreht, dass ihre Sonne in Richtung unserer Sonne steht.
  // Am Horizont geht der Himmel in die Nebelfarbe über. Bis die Bilder geladen sind, bleibt der berechnete Himmel.
  const PHOTO = { day: { file: 'sky_day.jpg', sunU: 0.602 }, dusk: { file: 'sky_dusk.jpg', sunU: 0.565 }, night: { file: 'sky_night.jpg', sunU: 0.617 } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1900, 64, 32), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, depthTest: false, fog: false, toneMapped: false,
    uniforms: {
      tDay: { value: null }, tDusk: { value: null }, tNight: { value: null },
      uW: { value: new THREE.Vector3(1, 0, 0) }, uRot: { value: new THREE.Vector3() }, uBright: { value: new THREE.Vector3(1, 1, 1) },
      uFog: { value: new THREE.Color() },
    },
    vertexShader: `varying vec3 vDir; void main() { vDir = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w; }`,
    fragmentShader: `
      uniform sampler2D tDay, tDusk, tNight; uniform vec3 uW, uRot, uBright; uniform vec3 uFog; varying vec3 vDir;
      // Bild: oben = Zenit, Zeile 0,5/0,5156 = Horizont, unten ca. 2,8° unter dem Horizont
      vec3 pick(sampler2D t, float rot, vec3 d) {
        float el = degrees(asin(clamp(d.y, -1.0, 1.0)));
        vec2 uv = vec2(fract(atan(d.z, d.x) / 6.28318 + 0.5 + rot), 1.0 - (90.0 - max(el, -2.5)) / 92.8125);
        return texture2D(t, uv).rgb;
      }
      void main() {
        vec3 d = normalize(vDir);
        vec3 c = uW.x * uBright.x * pick(tDay, uRot.x, d) + uW.y * uBright.y * pick(tDusk, uRot.y, d) + uW.z * uBright.z * pick(tNight, uRot.z, d);
        c = mix(uFog, c, smoothstep(-0.03, 0.12, d.y));
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  }));
  dome.renderOrder = -10; dome.frustumCulled = false; dome.visible = false; scene.add(dome);
  {
    const loader = new THREE.TextureLoader(); let n = 0;
    for (const [k, P] of Object.entries(PHOTO)) loader.load('./assets/sky/' + P.file, (t) => {
      t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4;
      dome.material.uniforms['t' + k[0].toUpperCase() + k.slice(1)].value = t;
      if (++n === 3) { dome.visible = true; sky.visible = false; } // erst umschalten, wenn alle drei da sind
    });
  }

  const hemi = new THREE.HemisphereLight(0xcfe0f2, 0x8c7656, 0.8);
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0x9fb3c8, 80, 1800);

  // Umgebungslicht (HDRI): Tag- oder Nachtbild, je nach Sonnenstand. Wird im Hintergrund geladen.
  let envWanted = '', envReady = {};
  function useEnv(which) {
    if (envWanted === which) return;
    envWanted = which;
    environment(renderer, which).then((t) => { envReady[which] = t; if (envWanted === which) scene.environment = t; });
    if (envReady[which]) scene.environment = envReady[which];
  }

  const state = { hour: 12, art: 0, artificial: 0, indoor: false, focus: new THREE.Vector3(), shadowSize: 50, anim: null };
  const sunDir = new THREE.Vector3(), lightDir = new THREE.Vector3();
  const warm = new THREE.Color(0xfff0d6), night = new THREE.Color(0x0b1430), dayFog = new THREE.Color(0xc9d4dc), duskFog = new THREE.Color(0xd99a6a);

  function apply() {
    const h = ((state.hour % 24) + 24) % 24;
    const a = ((h - 6) / 12) * Math.PI;
    sunDir.set(Math.cos(a), Math.sin(a) * 0.92, 0.38).normalize();
    const e = sunDir.y;
    u.sunPosition.value.copy(sunDir);
    const dayK = smooth(-0.08, 0.25, e);
    const art = state.indoor ? 1 : state.artificial * (1 - smooth(-0.04, 0.18, e));
    state.art = art;
    renderer.toneMappingExposure = 0.3 + dayK * 0.3 + art * 0.45;
    stars.material.opacity = 1 - smooth(-0.25, -0.02, e);
    const photo = dome.material.uniforms.tNight.value && dome.material.uniforms.tDay.value && dome.material.uniforms.tDusk.value;
    sky.visible = !state.indoor && !photo;
    dome.visible = !state.indoor && !!photo;
    stars.visible = !photo; // das Nachtfoto hat echte Sterne
    if (photo) {
      const U = dome.material.uniforms;
      const nightW = 1 - smooth(-0.14, 0.0, e), dayW = smooth(0.1, 0.32, e), duskW = Math.max(0, 1 - nightW - dayW);
      U.uW.value.set(dayW, duskW, nightW);
      // Fotos so drehen, dass ihre Sonne in Richtung unserer Sonne steht
      const su = Math.atan2(sunDir.z, sunDir.x) / (Math.PI * 2) + 0.5;
      U.uRot.value.set(PHOTO.day.sunU - su, PHOTO.dusk.sunU - su, PHOTO.night.sunU - su);
      // Dämmerung nach Sonnenuntergang dunkler, Nacht etwas aufgehellt (Lichter des Haram)
      U.uBright.value.set(1.0, 0.18 + 0.82 * smooth(-0.1, 0.12, e), 0.6 + art * 0.25);
    }

    lightDir.copy(e > -0.02 ? sunDir : new THREE.Vector3(-sunDir.x * 0.6, 0.75, 0.3).normalize());
    lightDir.lerp(new THREE.Vector3(0.25, 1, 0.18).normalize(), art * 0.8).normalize();
    sun.color.setHSL(0.09, 0.6 * (1 - dayK) + 0.1, 0.85).lerp(warm, art * 0.7);
    sun.intensity = Math.max(0.15, dayK * 2.4) + art * 2.2;
    hemi.intensity = 0.15 + dayK * 0.35 + art * 0.9;
    hemi.color.set(0x8fa4c8).lerp(new THREE.Color(0xcfe0f2), dayK).lerp(warm, art * 0.5);
    useEnv(dayK > 0.35 && !state.indoor ? 'day' : 'night');
    scene.environmentIntensity = dayK > 0.35 ? 0.25 + dayK * 0.2 : 0.15 + art * 0.25;
    scene.environmentRotation.y = 0.6;
    const fogC = night.clone().lerp(duskFog, smooth(-0.1, 0.05, e)).lerp(dayFog, smooth(0.05, 0.35, e));
    scene.fog.color.copy(fogC);
    dome.material.uniforms.uFog.value.copy(fogC);

    const s = state.shadowSize, c = sun.shadow.camera;
    c.left = -s; c.right = s; c.top = s; c.bottom = -s; c.near = 1; c.far = 900; c.updateProjectionMatrix();
  }

  return {
    state,
    setHour(h) { state.hour = h; state.anim = null; apply(); },
    animateTo(h, dur, cb) { state.anim = { from: state.hour, to: h, t: 0, dur, cb }; },
    get hour() { return state.hour; },
    get art() { return state.art; },
    update(dt) {
      if (state.anim) {
        const A = state.anim; A.t += dt;
        const k = Math.min(1, A.t / A.dur);
        state.hour = A.from + (A.to - A.from) * k * k * (3 - 2 * k);
        if (k >= 1) { state.anim = null; A.cb && A.cb(); }
      }
      apply();
      sky.position.copy(camera.position);
      dome.position.copy(camera.position);
      stars.position.copy(camera.position);
      sun.position.copy(state.focus).addScaledVector(lightDir, 400);
      sun.target.position.copy(state.focus);
    },
    reset() { state.artificial = 0; state.indoor = false; state.focus.set(0, 0, 0); state.shadowSize = 50; state.anim = null; },
  };
}
