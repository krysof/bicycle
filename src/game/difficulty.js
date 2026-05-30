import { ROAD_SEGMENTS, WORLD_SCALE } from "../data/world.js";
import { BUILDING_LOTS_OSM } from "../data/kitaeguchiMap.js";

const MODE_PROFILES = {
  walk: { energy: "normal", hands: "ok", duration: "5", moveMode: "walk", count: 4 },
  bike: { energy: "good", hands: "ok", duration: "8", moveMode: "bike", count: 6 },
};

const START_POINTS = [
  { x: -14400, y: -10800, angle: 0 },
  { x: -10080, y: -7200, angle: 0 },
  { x: 0, y: -10800, angle: 0 },
  { x: 10080, y: -7200, angle: Math.PI },
  { x: 14400, y: 0, angle: Math.PI },
  { x: -14400, y: 0, angle: 0 },
  { x: -10080, y: 7200, angle: 0 },
  { x: 0, y: 10800, angle: Math.PI },
  { x: 10080, y: 7200, angle: Math.PI },
  { x: 14400, y: 10800, angle: Math.PI },
];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(list) {
  const result = [...list];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randInt(0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function roadStartPoints() {
  const blocked = (x, z) => BUILDING_LOTS_OSM.some((lot) => Math.abs(lot.x - x) < (lot.frontage || 6) * 0.85 && Math.abs(lot.z - z) < (lot.depth || 6) * 0.85);
  return ROAD_SEGMENTS
    .filter((seg) => Math.hypot((seg.x2 ?? seg.x) - (seg.x1 ?? seg.x), (seg.z2 ?? seg.z) - (seg.z1 ?? seg.z)) > 46)
    .filter((seg) => seg.main)
    .map((seg, i) => ({ seg, i }))
    .filter(({ i }) => i % 3 === 0)
    .map(({ seg }) => {
      const t = 0.45;
      const x = seg.x1 + (seg.x2 - seg.x1) * t;
      const z = seg.z1 + (seg.z2 - seg.z1) * t;
      const angle = Math.atan2(seg.z2 - seg.z1, seg.x2 - seg.x1);
      return { x: x / WORLD_SCALE, y: z / WORLD_SCALE, angle };
    })
    .filter((p) => !blocked(p.x * WORLD_SCALE, p.y * WORLD_SCALE))
    .slice(0, 16);
}

export function answersFromMode(mode = "walk") {
  return { ...(MODE_PROFILES[mode] || MODE_PROFILES.walk) };
}

export function answersFromProfile(profile = "normal") {
  if (profile === "active") return answersFromMode("bike");
  return answersFromMode("walk");
}

export function buildConfig(answers) {
  const moveMode = answers.moveMode || "walk";
  const baseCount = answers.count || (moveMode === "bike" ? 6 : 4);
  const status = answers.todayStatus || answers.energy || "normal";
  let count;
  if (status === "tired") {
    count = moveMode === "bike"
      ? Math.max(4, Math.min(5, baseCount + randInt(-1, 0)))
      : 3;
  } else if (status === "good") {
    count = moveMode === "bike"
      ? Math.max(7, Math.min(8, baseCount + randInt(-1, 0)))
      : 5;
  } else {
    count = moveMode === "bike"
      ? Math.max(6, Math.min(7, baseCount + randInt(0, 1)))
      : Math.max(4, Math.min(5, baseCount + randInt(0, 1)));
  }
  const routeNameKey = moveMode === "bike" ? "routeBike" : "routeWalk";
  const routeName = moveMode === "bike" ? "单车远行路线" : "步行安心路线";
  // 投递判定缩小到“刚好包住路边目标点”的范围：光圈只比房屋 / 院落略大，
  // 玩家需要沿路骑一小段再投递，而不是在相邻路口就完成。
  const assistRadius = moveMode === "bike" ? 220 : 190;
  const speed = (moveMode === "bike" ? 430 : 145) * (answers.speedScale || 1);
  const memoryCount = 0;
  return { count, moveMode, routeName, routeNameKey, assistRadius, speed, memoryCount };
}

export function pickStartPoint() {
  const points = roadStartPoints();
  const point = (points.length ? points : START_POINTS)[randInt(0, (points.length ? points : START_POINTS).length - 1)];
  const angle = point.angle + (Math.random() - 0.5) * 0.22;
  return {
    x: point.x,
    y: point.y,
    facing: Math.cos(angle) >= 0 ? 1 : -1,
    headingX: Math.cos(angle),
    headingY: Math.sin(angle),
    headingAngle: angle,
  };
}

export function pickRoute(neighbors, config, start = { x: -4320, y: -3240 }) {
  const count = Math.min(config.count, neighbors.length);
  const minFirstDistance = config.moveMode === "bike" ? 1700 : 1050;
  const shuffled = shuffle(neighbors);
  const farEnough = shuffled.filter((n) => Math.hypot((n.deliveryX ?? n.x) - start.x, (n.deliveryY ?? n.y) - start.y) >= minFirstDistance);
  const first = (farEnough.length ? farEnough : shuffled)[randInt(0, Math.max(0, (farEnough.length ? farEnough : shuffled).length - 1))];
  const rest = shuffle(shuffled.filter((n) => n.id !== first.id));
  return [first, ...rest].slice(0, count);
}
