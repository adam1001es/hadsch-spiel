
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Formen für Pilgerinnen und Pilger.
// Koordinaten: Füße bei y = 0, Blick nach +z.
// dy verschiebt die Form nach unten.

const V = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));

function lathe(pts, seg, {
  dy = 0,
  flat = 0.7,
  phiStart = 0,
  phiLength = Math.PI * 2
} = {}) {
  const g = new THREE.LatheGeometry(
    V(pts.map(([x, y]) => [x, y - dy])),
    seg,
    phiStart,
    phiLength
  );
  g.scale(1, 1, flat);
  return g;
}

// Langes Gewand
export const dressGeo = (seg = 12, dy = 0) =>
  lathe([
    [0, 0], [0.29, 0], [0.3, 0.07],
    [0.265, 0.5], [0.232, 0.95],
    [0.226, 1.1], [0.24, 1.25],
    [0.236, 1.35], [0.18, 1.43],
    [0.065, 1.48], [0, 1.48]
  ], seg, { dy });

// Unteres Ihram-Tuch
export const izarGeo = (seg = 12, dy = 0) =>
  lathe([
    [0, 0.05], [0.24, 0.05],
    [0.258, 0.14], [0.238, 0.6],
    [0.228, 1.0], [0, 1.0]
  ], seg, { dy });

// Oberkörper
export const torsoGeo = (seg = 12, dy = 0, full = true) =>
  lathe(
    full
      ? [
          [0, 0.95], [0.214, 0.95],
          [0.22, 1.1], [0.234, 1.27],
          [0.234, 1.36], [0.18, 1.44],
          [0.064, 1.48], [0.054, 1.53],
          [0, 1.53]
        ]
      : [
          [0.23, 1.15], [0.234, 1.27],
          [0.234, 1.36], [0.18, 1.44],
          [0.064, 1.48], [0.054, 1.53],
          [0, 1.53]
        ],
    seg,
    { dy }
  );

// Oberes Ihram-Tuch
export function ridaGeo(seg = 14, dy = 0, idtiba = false) {
  let g = lathe([
    [0.238, 0.9], [0.244, 1.08],
    [0.258, 1.27], [0.258, 1.36],
    [0.205, 1.45], [0.1, 1.495],
    [0.07, 1.5]
  ], seg, { dy });

  if (idtiba) {
    g = g.toNonIndexed();
    const p = g.attributes.position;
    const keep = [];

    for (let i = 0; i < p.count; i += 3) {
      const cx =
        (p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3;

      const cy =
        (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3 + dy;

      const lineY = 1.2 + (cx + 0.25) * (0.3 / 0.4);

      if (!(cx < 0.15 && cy > lineY)) {
        for (let k = 0; k < 3; k++) {
          keep.push(
            p.getX(i + k),
            p.getY(i + k),
            p.getZ(i + k)
          );
        }
      }
    }

    g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(keep, 3)
    );
    g.computeVertexNormals();
  }

  return g;
}

// Arme
export function armsGeo(seg = 6, dy = 0) {
  const parts = [-1, 1].map((s) => {
    const a = new THREE.CapsuleGeometry(0.05, 0.46, 2, seg);
    a.rotateZ(s * 0.04);
    a.translate(s * 0.248, 1.11 - dy, 0.015);
    return a;
  });

  return mergeGeometries(parts);
}

// Kopf: etwas natürlicher oval statt kugelförmig
export const headGeo = (seg = 16, dy = 0) => {
  const g = new THREE.SphereGeometry(seg > 12 ? 0.105 : 0.105, seg, Math.round(seg * 0.8));
  g.scale(0.88, 1.12, 0.94);
  g.translate(0, 1.6 - dy, 0.005);
  return g;
};

// Haare
export const hairGeo = (seg = 10, dy = 0) => {
  const g = new THREE.SphereGeometry(
    0.11, seg, 3, 0, Math.PI * 2, 0, Math.PI * 0.42
  );
  g.scale(0.92, 1.12, 1);
  g.translate(0, 1.605 - dy, -0.006);
  return g;
};

// Bart
export const beardGeo = (seg = 8, dy = 0) => {
  const g = new THREE.SphereGeometry(
    0.075, seg, 4, 0, Math.PI * 2,
    Math.PI * 0.35, Math.PI * 0.65
  );
  g.scale(1, 0.95, 0.72);
  g.translate(0, 1.56 - dy, 0.045);
  return g;
};

// Gesicht: weicher, leicht länglicher Gesichtsbereich
export const faceGeo = (seg = 16, dy = 0) => {
  const g = new THREE.SphereGeometry(0.068, seg, 12);
  g.scale(0.82, 1.08, 0.54);
  g.translate(0, 1.595 - dy, 0.095);
  return g;
};

// ----------------------------------------------------
// NEUES HIJAB-MODELL
// ----------------------------------------------------
// Das Kopftuch besteht aus einer Kopfkappe und einem
// Stoffteil, das den Hinterkopf und die Seiten bedeckt.
// Vorne bleibt eine Öffnung für das Gesicht.
// Die seitlichen Stoffbahnen fallen bis zu den Schultern.

export const khimarGeo = (seg = 24, dy = 0, long = false) => {
  const positions = [];
  const indices = [];

  const rows = long
    ? [
        [1.755, 0.045, 0.040],
        [1.735, 0.090, 0.075],
        [1.680, 0.125, 0.105],
        [1.610, 0.145, 0.120],
        [1.520, 0.175, 0.145],
        [1.420, 0.235, 0.190],
        [1.300, 0.285, 0.230],
        [1.150, 0.325, 0.260],
        [0.980, 0.345, 0.275],
        [0.860, 0.355, 0.285]
      ]
    : [
        [1.755, 0.045, 0.040],
        [1.735, 0.090, 0.075],
        [1.680, 0.125, 0.105],
        [1.610, 0.145, 0.120],
        [1.520, 0.175, 0.145],
        [1.440, 0.220, 0.180],
        [1.350, 0.260, 0.210],
        [1.260, 0.285, 0.230],
        [1.200, 0.290, 0.235]
      ];

  const start = 0.72;
  const end = Math.PI * 2 - 0.72;
  const steps = Math.max(24, seg * 2);

  for (let r = 0; r < rows.length; r++) {
    const [y, rx, rz] = rows[r];

    for (let j = 0; j <= steps; j++) {
      const a = start + (end - start) * j / steps;

      // Kleine Stoffwellen für weniger starre Oberflächen
      const fold =
        1 + 0.018 * Math.sin(a * 7 + r * 0.45);

      positions.push(
        Math.sin(a) * rx * fold,
        y - dy,
        Math.cos(a) * rz * fold
      );
    }
  }

  for (let r = 0; r < rows.length - 1; r++) {
    for (let j = 0; j < steps; j++) {
      const a = r * (steps + 1) + j;
      const b = a + steps + 1;

      indices.push(a, b, a + 1);
      indices.push(a + 1, b, b + 1);
    }
  }

  const cloth = new THREE.BufferGeometry();
  cloth.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(positions, 3)
  );
  cloth.setIndex(indices);
  cloth.computeVertexNormals();

  // Stoff bedeckt die Kopfoberseite.
  const cap = new THREE.SphereGeometry(
    0.145, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2
  );

  cap.scale(1, 0.78, 0.82);
  cap.translate(0, 1.625 - dy, 0);

  const merged = mergeGeometries([cap, cloth], false);
  merged.computeVertexNormals();

  return merged;
};

// Kappe für Männer
export const kufiGeo = (seg = 12, dy = 0) => {
  const g = new THREE.CylinderGeometry(0.098, 0.104, 0.075, seg);
  g.translate(0, 1.69 - dy, 0);
  return g;
};

// Ghutra
export const ghutraGeo = (seg = 14, dy = 0) =>
  lathe([
    [0, 1.75], [0.08, 1.735],
    [0.125, 1.67], [0.138, 1.58],
    [0.16, 1.47], [0.21, 1.34],
    [0.2, 1.3]
  ], seg, {
    dy,
    flat: 0.8,
    phiStart: 0.75,
    phiLength: Math.PI * 2 - 1.5
  });

// ----------------------------------------------------
// HERKUNFTSREGIONEN
// ----------------------------------------------------

export const SKIN = {
  vdark: [0x3a2219, 0x46291c, 0x51301f],
  dark: [0x5a3825, 0x6a4230, 0x7a4b31],
  brown: [0x8d5524, 0x9a6038, 0xa86e45],
  olive: [0xb07a4f, 0xbb8456, 0xc08a5c],
  light: [0xc68642, 0xd09a6a, 0xdaa676],
  fair: [0xe0ac69, 0xeab98c, 0xf1c27d],
  pale: [0xf3cfb3, 0xf5d6c0]
};

export const REGIONS = [
  {
    id: 'Südostasien',
    w: 0.2,
    skin: [...SKIN.light, ...SKIN.fair, ...SKIN.olive],
    hair: [0x141210, 0x1d1a17],
    women: {
      dress: [0xf4f2ec, 0xf4f2ec, 0xe9e3d6, 0xd6e4ec],
      khimar: [0xf6f4ee],
      long: 0.75
    },
    men: {
      dress: [0xf4f2ec, 0xe7efe9, 0xece2cf, 0xdbe3ea],
      cap: [0x1b1b1d, 0xf4f2ec],
      capP: 0.8,
      ghutra: 0
    }
  },
  {
    id: 'Südasien',
    w: 0.22,
    skin: [...SKIN.brown, ...SKIN.olive, ...SKIN.dark],
    hair: [0x141210, 0x2a2420, 0x8f8a84],
    women: {
      dress: [0x1c2236, 0x4a1f2a, 0x203a2c, 0x1b1b1f, 0xf1efe9, 0x5a4636],
      khimar: [0x1b1b1f, 0xf1efe9, 0x2c2c3a],
      long: 0.25
    },
    men: {
      dress: [0xf4f2ec, 0xd9d9d4, 0xe8dcc4, 0xc9d6e2],
      cap: [0xf4f2ec],
      capP: 0.6,
      ghutra: 0
    }
  },
  {
    id: 'Arabien',
    w: 0.14,
    skin: [...SKIN.light, ...SKIN.olive, ...SKIN.fair],
    hair: [0x141210, 0x2a2420],
    women: {
      dress: [0x111113, 0x111113, 0x1a1a1e],
      khimar: [0x111113],
      long: 0.15
    },
    men: {
      dress: [0xf6f5f0, 0xf6f5f0, 0xe6e2d8],
      cap: [0xf4f2ec],
      capP: 0.15,
      ghutra: 0.75,
      ghutraCol: [0xf6f5f0, 0xe2b5b5]
    }
  },
  {
    id: 'Westafrika',
    w: 0.12,
    skin: [...SKIN.vdark, ...SKIN.dark],
    hair: [0x0f0d0c],
    women: {
      dress: [0x1e7f4f, 0xd9822b, 0x6b3fa0, 0x2a5caa, 0xb83a2e, 0xf1efe9, 0xe0b23a],
      khimar: [0x1e7f4f, 0xd9822b, 0xf1efe9, 0x2a5caa, 0x6b3fa0],
      long: 0.2
    },
    men: {
      dress: [0x2a5caa, 0xf4f2ec, 0x6b4e2e, 0x1e7f4f, 0xe8e0c8],
      cap: [0xf4f2ec, 0x2a5caa, 0xb83a2e, 0x1e7f4f],
      capP: 0.7,
      ghutra: 0
    }
  },
  {
    id: 'Ost-/Nordafrika',
    w: 0.11,
    skin: [...SKIN.dark, ...SKIN.brown, ...SKIN.light],
    hair: [0x141210, 0x2a2420, 0xb8b2aa],
    women: {
      dress: [0x6b5440, 0xe8dcc4, 0x1b1b1f, 0x8a3b4a, 0xf1efe9],
      khimar: [0xf1efe9, 0x6b5440, 0x1b1b1f, 0xc9a77a],
      long: 0.3
    },
    men: {
      dress: [0xf4f2ec, 0xe8dcc4, 0xbfb5a2],
      cap: [0xf4f2ec],
      capP: 0.4,
      ghutra: 0.3,
      ghutraCol: [0xf6f5f0]
    }
  },
  {
    id: 'Türkei/Zentralasien',
    w: 0.1,
    skin: [...SKIN.fair, ...SKIN.light, ...SKIN.pale],
    hair: [0x2a2420, 0x4a3a2c, 0x9a948c],
    women: {
      dress: [0x5a6370, 0x2c3a52, 0xc9bca6, 0x7d8a96],
      khimar: [0xbcd2e8, 0xe8dcc4, 0xf1efe9, 0xd8b8c8, 0x8a9a7a],
      long: 0.1
    },
    men: {
      dress: [0x5a6370, 0x8a8a84, 0x3a4250],
      cap: [0xf4f2ec],
      capP: 0.5,
      ghutra: 0
    }
  },
  {
    id: 'Iran',
    w: 0.06,
    skin: [...SKIN.fair, ...SKIN.light],
    hair: [0x141210, 0x2a2420],
    women: {
      dress: [0x111113],
      khimar: [0x111113],
      long: 0.9
    },
    men: {
      dress: [0x6b6258, 0x8a8a84, 0x4a4a50],
      cap: [],
      capP: 0,
      ghutra: 0
    }
  },
  {
    id: 'Europa/Amerika',
    w: 0.05,
    skin: [...SKIN.pale, ...SKIN.fair, ...SKIN.dark, ...SKIN.vdark],
    hair: [0x2a2420, 0x6b4a2c, 0xa07a4a, 0x141210],
    women: {
      dress: [0x2c3a52, 0x5a4636, 0xf1efe9, 0x3a5a4a, 0x7d6a8a],
      khimar: [0xf1efe9, 0x2c3a52, 0xc9bca6, 0x7d6a8a],
      long: 0.1
    },
    men: {
      dress: [0xf4f2ec, 0x8a8a84, 0x3a4250],
      cap: [0xf4f2ec, 0x1b1b1d],
      capP: 0.5,
      ghutra: 0
    }
  }
];
