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

function generateDecorHouseObstacles() {
  const obstacles = [];
  let idx = 0;
  for (let gx = -96; gx <= 96; gx += 16) {
    for (let gz = -72; gz <= 72; gz += 16) {
      if (Math.abs(gx) < 8 || Math.abs(gz) < 8) continue;
      if ((idx + Math.floor(gx)) % 3 === 0) {
        idx += 1;
        continue;
      }
      const x = gx + ((idx * 7) % 7) - 3;
      const z = gz + ((idx * 5) % 6) - 3;
      const p = sceneToWorld(x, z);
      obstacles.push(rect(`decor-house-${idx}`, p.x, p.y, 120, 110, "house"));
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
    if (Math.abs(x % 32) < 4 || Math.abs(z % 24) < 4) continue;
    const p = sceneToWorld(x, z);
    obstacles.push(circle(`tree-${i}`, p.x, p.y, 45 + (i % 4) * 4, "tree"));
  }
  return obstacles;
}

const targetHouseObstacles = neighbors.map((n) => rect(`target-house-${n.id}`, n.x, n.y, 150, 130, "house"));

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
  rect("shop", -70 / WORLD_SCALE, -68 / WORLD_SCALE, 150, 140, "shop"),
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
