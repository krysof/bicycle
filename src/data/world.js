import { neighbors } from "./neighbors.js";

export const WORLD_SCALE = 1 / 45;
export const WORLD_BOUNDS = { minX: -5200, maxX: 5200, minY: -3600, maxY: 3900 };
export const PLAYER_RADIUS = { walk: 52, bike: 72 };

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
function isReservedSceneSpot(x, z, marginX = 10.5, marginZ = 8.5) {
  return neighbors.some((n) => {
    const hx = worldToSceneX(n.x);
    const hz = worldToSceneZ(n.y);
    const dx = worldToSceneX(n.deliveryX ?? n.x);
    const dz = worldToSceneZ(n.deliveryY ?? n.y);
    return (Math.abs(x - hx) < marginX && Math.abs(z - hz) < marginZ) || Math.hypot(x - dx, z - dz) < 7.2;
  });
}

function generateDecorHouseObstacles() {
  const obstacles = [];
  let idx = 0;
  // 与 ThreeRenderer.addProceduralTown 的日式住宅区排列保持一致。
  for (const roadZ of [-72, -48, -24, 0, 24, 48, 72]) {
    for (let x = -104; x <= 104; x += 22) {
      if (Math.abs(x + 102) < 9 || Math.abs(x) < 7) continue;
      const side = idx % 2 ? -1 : 1;
      const z = roadZ + side * 9.2;
      if (z < -82 || z > 82) continue;
      const lotX = x + ((idx % 3) - 1) * 1.2;
      if (isReservedSceneSpot(lotX, z)) { idx += 1; continue; }
      const p = sceneToWorld(lotX, z);
      obstacles.push(rect(`residential-h-${idx}`, p.x, p.y, 340, 270, "house"));
      idx += 1;
    }
  }
  for (const roadX of [-96, -64, -32, 32, 64, 96]) {
    for (let z = -76; z <= 76; z += 24) {
      if (Math.abs(z) < 8) continue;
      const side = idx % 2 ? -1 : 1;
      const x = roadX + side * 9.0;
      if (x < -108 || x > 108) continue;
      const lotZ = z + ((idx % 3) - 1) * 1.0;
      if (isReservedSceneSpot(x, lotZ)) { idx += 1; continue; }
      const p = sceneToWorld(x, lotZ);
      obstacles.push(rect(`residential-v-${idx}`, p.x, p.y, 300, 340, "house"));
      idx += 1;
    }
  }
  return obstacles;
}

function generateTreeObstacles() {
  const obstacles = [];
  for (let i = 0; i < 90; i += 1) {
    const x = -108 + ((i * 37) % 216);
    const z = -80 + ((i * 53) % 160);
    if (Math.abs(x % 32) < 4 || Math.abs(z % 24) < 4 || isReservedSceneSpot(x, z, 8.5, 7.5)) continue;
    const p = sceneToWorld(x, z);
    obstacles.push(circle(`tree-${i}`, p.x, p.y, 45 + (i % 4) * 4, "tree"));
  }
  return obstacles;
}

const targetHouseObstacles = neighbors.map((n) => rect(`target-house-${n.id}`, n.x, n.y, 380, 320, "house"));

// 河流在 x=-102 的长条，三座桥位置可通行，所以拆成几段。
const riverX = -102 / WORLD_SCALE;
const riverWidth = 4.2 / WORLD_SCALE;
const riverSegments = [
  // 留出三座桥：y ≈ -2160, 0, 2160。
  rect("river-north", riverX, -3188, riverWidth, 1275, "water"),
  rect("river-upper-mid", riverX, -1080, riverWidth, 1380, "water"),
  rect("river-lower-mid", riverX, 1080, riverWidth, 1380, "water"),
  rect("river-south", riverX, 3188, riverWidth, 1275, "water"),
];

const landmarkObstacles = [
  rect("shop", -70 / WORLD_SCALE, -68 / WORLD_SCALE, 440, 380, "shop"),
  rect("vending-a", -78 / WORLD_SCALE, -63 / WORLD_SCALE, 70, 70, "object"),
  rect("vending-b", -64 / WORLD_SCALE, -63 / WORLD_SCALE, 70, 70, "object"),
  rect("bus-stop", 44 / WORLD_SCALE, -70 / WORLD_SCALE, 160, 90, "object"),
  rect("torii", 88 / WORLD_SCALE, 58 / WORLD_SCALE, 160, 80, "shrine"),
  rect("field-a", 86 / WORLD_SCALE, -64 / WORLD_SCALE, 560, 360, "field"),
  rect("field-b", 100 / WORLD_SCALE, -62 / WORLD_SCALE, 560, 360, "field"),
  rect("park-tree-a", -86 / WORLD_SCALE, 52 / WORLD_SCALE, 120, 120, "tree"),
  rect("park-tree-b", -70 / WORLD_SCALE, 55 / WORLD_SCALE, 110, 110, "tree"),
];

// 远处山体可见，底部作为不可进入区域，避免穿山。
const mountainObstacles = [
  rect("mountain-wall", 0, -3860, 10400, 560, "mountain"),
];

export const WORLD_OBSTACLES = [
  ...targetHouseObstacles,
  ...generateDecorHouseObstacles(),
  ...generateTreeObstacles(),
  ...riverSegments,
  ...landmarkObstacles,
  ...mountainObstacles,
];
