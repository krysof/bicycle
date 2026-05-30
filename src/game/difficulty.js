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

const PLAYABLE_INNER_X = 320;
const PLAYABLE_INNER_Z = 230;

function scenePointOf(target) {
  return {
    x: (target.deliveryX ?? target.x) * WORLD_SCALE,
    z: (target.deliveryY ?? target.y) * WORLD_SCALE,
  };
}

function insidePlayableDelivery(target, marginX = PLAYABLE_INNER_X, marginZ = PLAYABLE_INNER_Z) {
  const point = scenePointOf(target);
  return Math.abs(point.x) < marginX && Math.abs(point.z) < marginZ;
}

function distanceToTarget(point, target) {
  return Math.hypot((target.deliveryX ?? target.x) - point.x, (target.deliveryY ?? target.y) - point.y);
}

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
    .filter((seg) => Math.hypot((seg.x2 ?? seg.x) - (seg.x1 ?? seg.x), (seg.z2 ?? seg.z) - (seg.z1 ?? seg.z)) > 24)
    .map((seg, i) => ({ seg, i }))
    .flatMap(({ seg, i }) => {
      const samples = i % 2 ? [0.34, 0.66] : [0.5];
      return samples.map((t) => {
        const x = seg.x1 + (seg.x2 - seg.x1) * t;
        const z = seg.z1 + (seg.z2 - seg.z1) * t;
        const angle = Math.atan2(seg.z2 - seg.z1, seg.x2 - seg.x1);
        return { x: x / WORLD_SCALE, y: z / WORLD_SCALE, angle };
      });
    })
    .filter((p) => Math.abs(p.x * WORLD_SCALE) < PLAYABLE_INNER_X && Math.abs(p.y * WORLD_SCALE) < PLAYABLE_INNER_Z)
    .filter((p) => !blocked(p.x * WORLD_SCALE, p.y * WORLD_SCALE));
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

export function pickStartNearTarget(target, mode = "bike") {
  const points = roadStartPoints();
  if (!target || !points.length) return pickStartPoint();
  const min = mode === "bike" ? 380 : 160;
  const max = mode === "bike" ? 3200 : 1650;
  const targetPoint = { x: target.deliveryX ?? target.x, y: target.deliveryY ?? target.y };
  const candidates = points
    .map((point) => ({ point, d: distanceToTarget(point, targetPoint) }))
    .filter((item) => item.d >= min && item.d <= max)
    .sort((a, b) => a.d - b.d);
  const selected = (candidates.length ? candidates : points.map((point) => ({ point, d: distanceToTarget(point, targetPoint) })).sort((a, b) => a.d - b.d))
    [randInt(0, Math.min(4, Math.max(0, (candidates.length ? candidates : points).length - 1)))].point;
  const angle = Math.atan2(targetPoint.y - selected.y, targetPoint.x - selected.x) + (Math.random() - 0.5) * 0.18;
  return {
    x: selected.x,
    y: selected.y,
    facing: Math.cos(angle) >= 0 ? 1 : -1,
    headingX: Math.cos(angle),
    headingY: Math.sin(angle),
    headingAngle: angle,
  };
}

export function pickRoute(neighbors, config, start = { x: -4320, y: -3240 }, preferredFirst = null) {
  // 送报点不能出现在城市边缘。边界碰撞仍然存在，但玩家视觉上应看到城市还在延伸，
  // 所以任务目标只从内部街区挑选，避免导航把老人带到“地图边界”。
  const inner = neighbors.filter((n) => insidePlayableDelivery(n));
  const relaxed = neighbors.filter((n) => insidePlayableDelivery(n, PLAYABLE_INNER_X + 24, PLAYABLE_INNER_Z + 18));
  const pool = inner.length >= 8 ? inner : (relaxed.length ? relaxed : neighbors);
  const count = Math.min(config.count, pool.length);
  const shuffled = shuffle(pool);
  const firstMin = config.moveMode === "bike" ? 360 : 180;
  const firstMax = config.moveMode === "bike" ? 3400 : 1800;
  const nearby = shuffled
    .map((n) => ({ n, d: Math.hypot((n.deliveryX ?? n.x) - start.x, (n.deliveryY ?? n.y) - start.y) }))
    .filter((item) => item.d >= firstMin && item.d <= firstMax)
    .sort((a, b) => a.d - b.d);
  const firstPool = nearby.length ? nearby : shuffled.map((n) => ({ n, d: Math.hypot((n.deliveryX ?? n.x) - start.x, (n.deliveryY ?? n.y) - start.y) })).sort((a, b) => a.d - b.d);
  const idealStep = config.moveMode === "bike" ? 3000 : 1850;
  const maxStep = config.moveMode === "bike" ? 7000 : 4500;

  const buildFrom = (first) => {
    const route = [first];
    const remaining = shuffled.filter((n) => n.id !== first.id);
    while (route.length < count && remaining.length) {
      const current = route[route.length - 1];
      const cx = current.deliveryX ?? current.x;
      const cy = current.deliveryY ?? current.y;
      const routeCenterX = route.reduce((sum, n) => sum + (n.deliveryX ?? n.x), 0) / route.length;
      const routeCenterY = route.reduce((sum, n) => sum + (n.deliveryY ?? n.y), 0) / route.length;
      const sorted = remaining
        .map((n) => ({ n, d: Math.hypot((n.deliveryX ?? n.x) - cx, (n.deliveryY ?? n.y) - cy) }))
        .filter((item) => item.d <= maxStep)
        .sort((a, b) => {
          const ac = Math.hypot((a.n.deliveryX ?? a.n.x) - routeCenterX, (a.n.deliveryY ?? a.n.y) - routeCenterY);
          const bc = Math.hypot((b.n.deliveryX ?? b.n.x) - routeCenterX, (b.n.deliveryY ?? b.n.y) - routeCenterY);
          return Math.abs(a.d - idealStep) - Math.abs(b.d - idealStep) || ac - bc;
        });
      // 不硬跨城：如果附近没有下一个目标，就结束这一局路线，避免箭头跨越边界或穿过大半个城市。
      if (!sorted.length) break;
      const next = sorted[0].n;
      route.push(next);
      remaining.splice(remaining.findIndex((n) => n.id === next.id), 1);
    }
    return route;
  };

  let bestRoute = [];
  const attempts = [];
  if (preferredFirst && pool.some((n) => n.id === preferredFirst.id)) attempts.push(preferredFirst);
  firstPool.slice(0, Math.min(firstPool.length, 14)).forEach((item) => {
    if (!attempts.some((n) => n.id === item.n.id)) attempts.push(item.n);
  });
  for (const first of attempts) {
    const candidate = buildFrom(first);
    if (preferredFirst && first.id === preferredFirst.id) return candidate;
    if (candidate.length > bestRoute.length) bestRoute = candidate;
    if (candidate.length >= count) {
      bestRoute = candidate;
      break;
    }
  }
  return bestRoute;
}
