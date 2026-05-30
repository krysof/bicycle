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

const SERVICE_LOTS = [
  { id: "service-convenience", x: -50, z: 62, orientation: "h", variant: "convenience", scale: 1.08, roof: 0x3d79a8, wall: 0xfffbef, frontage: 8.4, depth: 6.2 },
  { id: "service-supermarket", x: 50, z: 62, orientation: "h", variant: "supermarket", scale: 1.05, roof: 0xc9823d, wall: 0xf4e4c8, frontage: 10.2, depth: 7.0 },
  { id: "service-hospital", x: -82, z: 62, orientation: "h", variant: "hospital", scale: 1.04, roof: 0xf8f8ff, wall: 0xe6f4ff, frontage: 10.0, depth: 7.0 },
  { id: "service-school", x: 82, z: -62, orientation: "h", variant: "school", scale: 1.02, roof: 0xc78d4d, wall: 0xfff0d4, frontage: 11.0, depth: 7.4 },
  { id: "service-post-office", x: 18, z: 62, orientation: "h", variant: "post-office", scale: 1.04, roof: 0xb84a42, wall: 0xfff0e8, frontage: 8.0, depth: 6.0 },
  { id: "service-police", x: 104, z: -62, orientation: "h", variant: "police", scale: 1.02, roof: 0x4f91d5, wall: 0xffffff, frontage: 7.2, depth: 5.8 },
  { id: "service-pharmacy", x: -18, z: -62, orientation: "h", variant: "pharmacy", scale: 1.03, roof: 0x3dbb70, wall: 0xf0fff2, frontage: 7.8, depth: 5.8 },
  { id: "service-bathhouse", x: 106, z: 38, orientation: "h", variant: "bathhouse", scale: 1.02, roof: 0x4f91d5, wall: 0xe8f8ff, frontage: 8.2, depth: 6.2 },
];

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
  const nearNeighbor = neighbors.some((n) => {
    const hx = worldToSceneX(n.x);
    const hz = worldToSceneZ(n.y);
    const dx = worldToSceneX(n.deliveryX ?? n.x);
    const dz = worldToSceneZ(n.deliveryY ?? n.y);
    return (Math.abs(x - hx) < marginX && Math.abs(z - hz) < marginZ) || Math.hypot(x - dx, z - dz) < 8.6;
  });
  if (nearNeighbor) return true;
  return SERVICE_LOTS.some((lot) => Math.abs(x - lot.x) < (lot.frontage || 8) * 0.7 && Math.abs(z - lot.z) < (lot.depth || 6) * 0.8);
}

function makeLot(rand, id, x, z, orientation = "h") {
  // 大阪旧住宅区参考：小间口、深进深、木造二层 / 长屋感，整体沿道路整齐退让。
  const scale = 0.88 + rand() * 0.18;
  const osakaVariants = ["old-wood", "old-wood", "house-brown", "house-red", "house-blue", "modern-home", "bakery", "bookstore", "barber", "fish-shop"];
  return {
    id,
    x,
    z,
    orientation,
    roof: pick(rand, ROOF_COLORS),
    wall: pick(rand, WALL_COLORS),
    scale,
    variant: pick(rand, osakaVariants),
    yaw: (rand() - 0.5) * 0.025,
    frontage: 4.2 + rand() * 1.1,
    depth: 7.2 + rand() * 1.4,
  };
}

function generateLots(rand) {
  const lots = [];
  let idx = 0;
  const frontageXs = [-112, -98, -84, -70, -56, -42, -28, -14, 14, 28, 42, 56, 70, 84, 98, 112];
  for (const roadZ of ROAD_Z) {
    for (const side of [-1, 1]) {
      for (const baseX of frontageXs) {
        if (rand() < 0.16 || nearAny(baseX, ROAD_X, 5.2)) { idx += 1; continue; }
        const z = roadZ + side * (13.9 + rand() * 0.7);
        if (z < -82 || z > 82) { idx += 1; continue; }
        const lotX = baseX + (rand() - 0.5) * 1.2;
        if (isReservedSceneSpot(lotX, z, 12.2, 9.2)) { idx += 1; continue; }
        lots.push(makeLot(rand, `osaka-row-h-${idx}`, lotX, z, "h"));
        idx += 1;
      }
    }
  }

  // 少量转角店铺 / 竖向住宅，避免网格过空，但不再生成窄小怪路。
  for (const roadX of ROAD_X.filter((x) => x !== 0)) {
    for (const side of [-1, 1]) {
      for (let z = -60; z <= 60; z += 24) {
        if (rand() < 0.55 || nearAny(z, ROAD_Z, 7.2)) { idx += 1; continue; }
        const x = roadX + side * (13.8 + rand() * 0.8);
        if (x < -110 || x > 110) { idx += 1; continue; }
        const lotZ = z + (rand() - 0.5) * 1.4;
        if (isReservedSceneSpot(x, lotZ, 12.2, 9.2)) { idx += 1; continue; }
        lots.push(makeLot(rand, `osaka-corner-v-${idx}`, x, lotZ, "v"));
        idx += 1;
      }
    }
  }
  return lots.slice(0, 78).concat(SERVICE_LOTS.map((lot) => ({ ...lot, fixedService: true })));
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
    // 大阪市街地不应满屏是山；只保留极远处低矮绿影，不进入住宅地。
    hills: Array.from({ length: 2 }, (_, i) => ({
      x: i === 0 ? -96 : 96,
      z: -96,
      h: 5 + rand() * 2,
      r: 13 + rand() * 3,
      color: 0x8fbf8a,
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
  );

  return obstacles;
}

export const DEFAULT_WORLD_LAYOUT = createWorldLayout(1);
export const WORLD_OBSTACLES = createWorldObstacles(DEFAULT_WORLD_LAYOUT);
