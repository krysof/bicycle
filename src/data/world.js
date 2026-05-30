import { neighbors } from "./neighbors.js";

export const WORLD_SCALE = 1 / 45;
export const WORLD_BOUNDS = { minX: -16740, maxX: 16740, minY: -12675, maxY: 12675 };
export const PLAYER_RADIUS = { walk: 52, bike: 72 };
export const MAP_W = 744;
export const MAP_D = 563;
export const ROAD_X = [-328, -236, -162, -96, -38, 24, 88, 156, 236, 316];
export const ROAD_Z = [-232, -172, -116, -64, -18, 44, 112, 188, 244];
export const ROAD_SEGMENTS = [
  { dir: "h", z: -232, x1: -356, x2: 344, main: true },
  { dir: "h", z: -116, x1: -356, x2: 322, main: true },
  { dir: "h", z: 44, x1: -330, x2: 344, main: true },
  { dir: "h", z: 188, x1: -356, x2: 344, main: true },
  { dir: "h", z: -172, x1: -324, x2: -82 },
  { dir: "h", z: -64, x1: -260, x2: 118 },
  { dir: "h", z: -18, x1: 20, x2: 286 },
  { dir: "h", z: 112, x1: -318, x2: -28 },
  { dir: "h", z: 244, x1: 86, x2: 344 },
  { dir: "v", x: -328, z1: -250, z2: 210, main: true },
  { dir: "v", x: -96, z1: -250, z2: 226, main: true },
  { dir: "v", x: 88, z1: -238, z2: 262, main: true },
  { dir: "v", x: 316, z1: -250, z2: 250, main: true },
  { dir: "v", x: -236, z1: -232, z2: -58 },
  { dir: "v", x: -162, z1: -186, z2: 54 },
  { dir: "v", x: -38, z1: -116, z2: 118 },
  { dir: "v", x: 24, z1: -70, z2: 196 },
  { dir: "v", x: 156, z1: -116, z2: 52 },
  { dir: "v", x: 236, z1: -24, z2: 244 },
];

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
  { id: "service-convenience", x: -272, z: 230, orientation: "h", variant: "convenience", scale: 1.08, roof: 0x3d79a8, wall: 0xfffbef, frontage: 8.4, depth: 6.2 },
  { id: "service-supermarket", x: -176, z: 230, orientation: "h", variant: "supermarket", scale: 1.05, roof: 0xc9823d, wall: 0xf4e4c8, frontage: 10.2, depth: 7.0 },
  { id: "service-hospital", x: -80, z: 230, orientation: "h", variant: "hospital", scale: 1.04, roof: 0xf8f8ff, wall: 0xe6f4ff, frontage: 10.0, depth: 7.0 },
  { id: "service-school", x: 80, z: -230, orientation: "h", variant: "school", scale: 1.02, roof: 0xc78d4d, wall: 0xfff0d4, frontage: 11.0, depth: 7.4 },
  { id: "service-post-office", x: 176, z: 230, orientation: "h", variant: "post-office", scale: 1.04, roof: 0xb84a42, wall: 0xfff0e8, frontage: 8.0, depth: 6.0 },
  { id: "service-police", x: 272, z: -230, orientation: "h", variant: "police", scale: 1.02, roof: 0x4f91d5, wall: 0xffffff, frontage: 7.2, depth: 5.8 },
  { id: "service-pharmacy", x: -304, z: -230, orientation: "h", variant: "pharmacy", scale: 1.03, roof: 0x3dbb70, wall: 0xf0fff2, frontage: 7.8, depth: 5.8 },
  { id: "service-bathhouse", x: 304, z: 134, orientation: "h", variant: "bathhouse", scale: 1.02, roof: 0x4f91d5, wall: 0xe8f8ff, frontage: 8.2, depth: 6.2 },
  { id: "service-danchi-north", x: -300, z: -190, orientation: "h", variant: "apartment", scale: 1.02, roof: 0x7890a8, wall: 0xe8edf2, frontage: 10.4, depth: 6.8 },
  { id: "service-danchi-east", x: 300, z: 184, orientation: "h", variant: "apartment", scale: 1.02, roof: 0x7890a8, wall: 0xe8edf2, frontage: 10.4, depth: 6.8 },
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
  const osakaVariants = ["old-wood", "old-wood", "old-wood", "house-brown", "house-red", "house-blue", "modern-home", "house-brown", "house-blue", "fish-shop"];
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
  const addLot = (x, z, orientation) => {
    if (x < -360 || x > 360 || z < -270 || z > 270) return;
    if (isReservedSceneSpot(x, z, 12.2, 9.2)) return;
    if (lots.some((lot) => Math.abs(lot.x - x) < 9.5 && Math.abs(lot.z - z) < 8.0)) return;
    lots.push(makeLot(rand, `kitaeguchi-lot-${idx}`, x + (rand() - 0.5) * 1.1, z + (rand() - 0.5) * 0.8, orientation));
    idx += 1;
  };

  ROAD_SEGMENTS.forEach((seg) => {
    if (seg.dir === "h") {
      const step = seg.main ? 22 : 18;
      for (let x = seg.x1 + 14; x <= seg.x2 - 14; x += step) {
        if (rand() < (seg.main ? 0.42 : 0.34)) continue;
        const side = rand() < 0.5 ? -1 : 1;
        addLot(x, seg.z + side * (13.8 + rand() * 1.4), "h");
      }
    } else {
      const step = seg.main ? 24 : 20;
      for (let z = seg.z1 + 14; z <= seg.z2 - 14; z += step) {
        if (rand() < (seg.main ? 0.50 : 0.42)) continue;
        const side = rand() < 0.5 ? -1 : 1;
        addLot(seg.x + side * (13.6 + rand() * 1.3), z, "v");
      }
    }
  });
  return lots.slice(0, 96).concat(SERVICE_LOTS.map((lot) => ({ ...lot, fixedService: true })));
}

function generateTrees(rand, lots) {
  const trees = [];
  let attempts = 0;
  while (trees.length < 70 && attempts < 650) {
    attempts += 1;
    const x = -350 + rand() * 700;
    const z = -260 + rand() * 520;
    if (nearAny(x, ROAD_X, 8.6) || nearAny(z, ROAD_Z, 8.6) || isReservedSceneSpot(x, z, 9, 8)) continue;
    if (lots.some((lot) => Math.abs(lot.x - x) < 5.4 && Math.abs(lot.z - z) < 4.8)) continue;
    trees.push({ id: `tree-${trees.length}`, x, z, sakura: rand() < 0.28, scale: 0.68 + rand() * 0.36 });
  }
  return trees;
}

function generateLandmarks(rand) {
  const parkCandidates = [[-270, 198], [-174, -164], [270, 198], [238, -164], [-46, 230]];
  const shopCandidates = [[-270, -198], [270, -198], [-270, 198], [270, 198], [50, -198]];
  const busCandidates = [[142, -230], [-142, -230], [142, 230], [-142, 230]];
  const shrineCandidates = [[296, 198], [-296, 198], [296, -198]];
  const fieldCandidates = [[286, -214], [330, -206], [-286, -214], [286, 118]];
  return {
    riverX: -344 + (rand() - 0.5) * 2.2,
    park: pick(rand, parkCandidates),
    shop: pick(rand, shopCandidates),
    bus: pick(rand, busCandidates),
    shrine: pick(rand, shrineCandidates),
    fields: [pick(rand, fieldCandidates), pick(rand, fieldCandidates).map((v, i) => v + (i === 0 ? 14 : 2))],
    sign: [-60 + (rand() - 0.5) * 48, 232],
    poles: Array.from({ length: 10 }, (_, i) => ({
      x: pick(rand, ROAD_X.filter((x) => x !== 0)) + (rand() < 0.5 ? -6.3 : 6.3),
      z: -228 + i * 50 + (rand() - 0.5) * 5,
    })),
    // 大阪市街地不应满屏是山；只保留极远处低矮绿影，不进入住宅地。
    hills: Array.from({ length: 2 }, (_, i) => ({
      x: i === 0 ? -320 : 320,
      z: -288,
      h: 5 + rand() * 2,
      r: 13 + rand() * 3,
      color: 0x8fbf8a,
      rot: rand() * Math.PI,
    })),
    grassPatches: Array.from({ length: 9 }, (_, i) => ({
      x: -300 + (i % 3) * 300 + (rand() - 0.5) * 32,
      z: -180 + Math.floor(i / 3) * 180 + (rand() - 0.5) * 24,
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
    rect("river-north", riverX, -8550, riverWidth, 8100, "water"),
    rect("river-south", riverX, 8550, riverWidth, 8100, "water"),
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
