import { neighbors } from "./neighbors.js";

export const WORLD_SCALE = 1 / 45;
export const WORLD_BOUNDS = { minX: -5200, maxX: 5200, minY: -3600, maxY: 3900 };
export const PLAYER_RADIUS = { walk: 52, bike: 72 };
export const ROAD_X = [-96, -64, -32, 0, 32, 64, 96];
export const ROAD_Z = [-72, -48, -24, 0, 24, 48, 72];

const BUILDING_VARIANTS = [
  "house-red", "house-blue", "house-green", "house-brown", "modern-home", "old-wood",
  "convenience", "supermarket", "hospital", "clinic", "pharmacy", "post-office",
  "apartment", "office", "bank", "police", "community", "school",
  "library", "cafe", "restaurant", "bakery", "barber", "flower",
  "bookstore", "fish-shop", "bathhouse", "parking",
];

const ROOF_COLORS = [0xc85f4d, 0xd59a34, 0x4f91d5, 0x5aaa77, 0xb86695, 0x9c7556, 0x5c9ab5];
const WALL_COLORS = [0xffe3c2, 0xe8f3ff, 0xe7f4d6, 0xffe8ef, 0xfff0c8, 0xe7f6f4, 0xf4f1e9];

function rect(id, x, y, w, h, kind = "solid") {
  return { id, type: "rect", x, y, halfW: w / 2, halfH: h / 2, kind };
}

function circle(id, x, y, r, kind = "solid") {
  return { id, type: "circle", x, y, r, kind };
}

function sceneToWorld(x, z) {
  return { x: x / WORLD_SCALE, y: z / WORLD_SCALE };
}

function worldToSceneX(x) { return x * WORLD_SCALE; }
function worldToSceneZ(y) { return y * WORLD_SCALE; }

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick(rand, list) {
  return list[int(rand, 0, list.length - 1)];
}

function nearAny(value, list, margin) {
  return list.some((item) => Math.abs(value - item) < margin);
}

function isReservedSceneSpot(x, z, marginX = 10.5, marginZ = 8.5) {
  return neighbors.some((n) => {
    const hx = worldToSceneX(n.x);
    const hz = worldToSceneZ(n.y);
    const dx = worldToSceneX(n.deliveryX ?? n.x);
    const dz = worldToSceneZ(n.deliveryY ?? n.y);
    return (Math.abs(x - hx) < marginX && Math.abs(z - hz) < marginZ) || Math.hypot(x - dx, z - dz) < 8.6;
  });
}

function makeLot(rand, id, x, z, orientation = "h") {
  const scale = 1.02 + rand() * 0.28;
  return {
    id,
    x,
    z,
    orientation,
    roof: pick(rand, ROOF_COLORS),
    wall: pick(rand, WALL_COLORS),
    scale,
    variant: pick(rand, BUILDING_VARIANTS),
    yaw: (rand() - 0.5) * 0.08,
  };
}

function generateLots(rand) {
  const lots = [];
  let idx = 0;
  for (const roadZ of ROAD_Z) {
    for (let x = -104; x <= 104; x += 22) {
      if (rand() < 0.25 || Math.abs(x + 102) < 9 || Math.abs(x) < 7) { idx += 1; continue; }
      const side = rand() < 0.5 ? -1 : 1;
      const z = roadZ + side * (13.2 + rand() * 2.6);
      if (z < -82 || z > 82) { idx += 1; continue; }
      const lotX = x + (rand() - 0.5) * 5.2;
      if (isReservedSceneSpot(lotX, z) || nearAny(lotX, ROAD_X, 8.5)) { idx += 1; continue; }
      lots.push(makeLot(rand, `residential-h-${idx}`, lotX, z, "h"));
      idx += 1;
    }
  }

  for (const roadX of ROAD_X.filter((x) => x !== 0)) {
    for (let z = -76; z <= 76; z += 24) {
      if (rand() < 0.35 || Math.abs(z) < 8) { idx += 1; continue; }
      const side = rand() < 0.5 ? -1 : 1;
      const x = roadX + side * (13.0 + rand() * 2.4);
      if (x < -108 || x > 108) { idx += 1; continue; }
      const lotZ = z + (rand() - 0.5) * 4.4;
      if (isReservedSceneSpot(x, lotZ) || nearAny(lotZ, ROAD_Z, 8.5)) { idx += 1; continue; }
      lots.push(makeLot(rand, `residential-v-${idx}`, x, lotZ, "v"));
      idx += 1;
    }
  }
  return lots.slice(0, 54);
}

function generateTrees(rand, lots) {
  const trees = [];
  let attempts = 0;
  while (trees.length < 55 && attempts < 280) {
    attempts += 1;
    const x = -108 + rand() * 216;
    const z = -80 + rand() * 160;
    if (nearAny(x, ROAD_X, 8.6) || nearAny(z, ROAD_Z, 8.6) || isReservedSceneSpot(x, z, 9, 8)) continue;
    if (lots.some((lot) => Math.abs(lot.x - x) < 5.4 && Math.abs(lot.z - z) < 4.8)) continue;
    trees.push({ id: `tree-${trees.length}`, x, z, sakura: rand() < 0.28, scale: 0.68 + rand() * 0.36 });
  }
  return trees;
}

function generateLandmarks(rand) {
  const parkCandidates = [[-78, 58], [-78, -36], [78, 58], [74, -36], [-14, 70]];
  const shopCandidates = [[-78, -58], [78, -58], [-78, 58], [78, 58], [18, -58]];
  const busCandidates = [[44, -70], [-44, -70], [44, 70], [-44, 70]];
  const shrineCandidates = [[88, 58], [-88, 58], [88, -58]];
  const fieldCandidates = [[86, -64], [100, -62], [-86, -64], [86, 34]];
  return {
    riverX: -102 + (rand() - 0.5) * 2.2,
    park: pick(rand, parkCandidates),
    shop: pick(rand, shopCandidates),
    bus: pick(rand, busCandidates),
    shrine: pick(rand, shrineCandidates),
    fields: [pick(rand, fieldCandidates), pick(rand, fieldCandidates).map((v, i) => v + (i === 0 ? 14 : 2))],
    sign: [-18 + (rand() - 0.5) * 28, 72],
    poles: Array.from({ length: 10 }, (_, i) => ({
      x: pick(rand, ROAD_X.filter((x) => x !== 0)) + (rand() < 0.5 ? -6.3 : 6.3),
      z: -60 + i * 13 + (rand() - 0.5) * 5,
    })),
    hills: Array.from({ length: 9 }, (_, i) => ({
      x: -104 + i * 26 + (rand() - 0.5) * 8,
      z: -88 + (rand() - 0.5) * 2,
      h: 10 + rand() * 7,
      r: 9 + rand() * 5,
      color: rand() < 0.5 ? 0x8fbf8a : 0x93c79a,
      rot: rand() * Math.PI,
    })),
    grassPatches: Array.from({ length: 9 }, (_, i) => ({
      x: -92 + (i % 3) * 92 + (rand() - 0.5) * 16,
      z: -54 + Math.floor(i / 3) * 54 + (rand() - 0.5) * 12,
      w: 12 + rand() * 12,
      d: 8 + rand() * 10,
      color: rand() < 0.5 ? 0xa9d88e : 0xd7e9ad,
      rot: (rand() - 0.5) * 0.18,
    })),
  };
}

export function createWorldLayout(seed = Date.now()) {
  const numericSeed = Number.isFinite(seed) ? seed : Date.now();
  const rand = mulberry32(numericSeed);
  const lots = generateLots(rand);
  return {
    seed: numericSeed,
    lots,
    trees: generateTrees(rand, lots),
    landmarks: generateLandmarks(rand),
    atmosphere: {
      timeOfDay: pick(rand, ["morning", "morning", "dusk"]),
      weather: pick(rand, ["clear", "clear", "breeze", "afterRain"]),
    },
  };
}

export function createWorldObstacles(layout = createWorldLayout(1)) {
  const obstacles = [];

  // 只挡住房屋核心，避免屋檐 / 院落边缘在道路上形成看不见的空气墙。
  neighbors.forEach((n) => obstacles.push(rect(`target-house-${n.id}`, n.x, n.y, 160, 150, "house")));

  layout.lots.forEach((lot) => {
    const p = sceneToWorld(lot.x, lot.z);
    const w = (lot.orientation === "v" ? 160 : 185) * lot.scale;
    const h = (lot.orientation === "v" ? 185 : 160) * lot.scale;
    obstacles.push(rect(lot.id, p.x, p.y, w, h, "house"));
  });

  layout.trees.forEach((tree) => {
    const p = sceneToWorld(tree.x, tree.z);
    obstacles.push(circle(tree.id, p.x, p.y, 18 + tree.scale * 9, "tree"));
  });

  const riverX = layout.landmarks.riverX / WORLD_SCALE;
  const riverWidth = 4.2 / WORLD_SCALE;
  obstacles.push(
    rect("river-north", riverX, -3188, riverWidth, 1275, "water"),
    rect("river-upper-mid", riverX, -1080, riverWidth, 1380, "water"),
    rect("river-lower-mid", riverX, 1080, riverWidth, 1380, "water"),
    rect("river-south", riverX, 3188, riverWidth, 1275, "water"),
  );

  const [shopX, shopZ] = layout.landmarks.shop;
  const [busX, busZ] = layout.landmarks.bus;
  const [shrineX, shrineZ] = layout.landmarks.shrine;
  obstacles.push(
    rect("shop", shopX / WORLD_SCALE, shopZ / WORLD_SCALE, 230, 180, "shop"),
    rect("vending-a", (shopX - 8) / WORLD_SCALE, (shopZ + 5) / WORLD_SCALE, 58, 58, "object"),
    rect("vending-b", (shopX + 6) / WORLD_SCALE, (shopZ + 5) / WORLD_SCALE, 58, 58, "object"),
    rect("torii", shrineX / WORLD_SCALE, shrineZ / WORLD_SCALE, 140, 70, "shrine"),
    rect("mountain-wall", 0, -3860, 10400, 560, "mountain"),
  );

  return obstacles;
}

export const DEFAULT_WORLD_LAYOUT = createWorldLayout(1);
export const WORLD_OBSTACLES = createWorldObstacles(DEFAULT_WORLD_LAYOUT);
