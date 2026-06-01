import { WORLD_BOUNDS, WORLD_OBSTACLES, PLAYER_RADIUS, WORLD_SCALE, ROAD_SEGMENTS } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

// 要和 ThreeRenderer.updateTarget() 里的黄框视觉半径保持一致：
// 黄框半径约 8.3 个场景单位；隐形可投递范围 = 黄框半径的 2.5 倍。
// 2026-06-01 调整：把隐形投递范围缩小一半，靠近后再显示报纸标记。
const VISIBLE_TARGET_RING_RADIUS_SCENE = 8.3;
const INVISIBLE_DELIVERY_RADIUS_MULTIPLIER = 2.5;
function sceneToWorldPoint(point) {
  return { x: point.x / WORLD_SCALE, y: point.z / WORLD_SCALE };
}

function worldToScenePoint(x, y) {
  return { x: x * WORLD_SCALE, z: y * WORLD_SCALE };
}

function key(point) {
  return `${Math.round(point.x * 100) / 100},${Math.round(point.z * 100) / 100}`;
}

function nearestPointOnSegment(point, seg) {
  if (seg.dir === "line") {
    const vx = seg.x2 - seg.x1;
    const vz = seg.z2 - seg.z1;
    const len2 = vx * vx + vz * vz;
    const t = len2 ? Math.max(0, Math.min(1, ((point.x - seg.x1) * vx + (point.z - seg.z1) * vz) / len2)) : 0;
    const x = seg.x1 + vx * t;
    const z = seg.z1 + vz * t;
    return { point: { x, z }, distance: Math.hypot(point.x - x, point.z - z), seg };
  }
  if (seg.dir === "h") {
    const x = Math.max(seg.x1, Math.min(seg.x2, point.x));
    return { point: { x, z: seg.z }, distance: Math.hypot(point.x - x, point.z - seg.z), seg };
  }
  const z = Math.max(seg.z1, Math.min(seg.z2, point.z));
  return { point: { x: seg.x, z }, distance: Math.hypot(point.x - seg.x, point.z - z), seg };
}

let cachedObstacleRef = null;
let cachedLayoutRef = null;
let cachedSceneHouses = [];
let cachedSceneBlocked = [];
let cachedBlockedObstacleRef = null;
let cachedBlockedLayoutRef = null;

function sceneHouseObstacles(state) {
  const source = state?.worldObstacles || WORLD_OBSTACLES;
  const layout = state?.worldLayout || null;
  if (cachedObstacleRef === source && cachedLayoutRef === layout) return cachedSceneHouses;
  cachedObstacleRef = source;
  cachedLayoutRef = layout;
  const collisionRects = (source || [])
    .filter((obstacle) => obstacle.kind === "house" && obstacle.type === "rect")
    .map((obstacle) => ({
      id: obstacle.id,
      minX: (obstacle.x - obstacle.halfW) * WORLD_SCALE - 0.85,
      maxX: (obstacle.x + obstacle.halfW) * WORLD_SCALE + 0.85,
      minZ: (obstacle.y - obstacle.halfH) * WORLD_SCALE - 0.85,
      maxZ: (obstacle.y + obstacle.halfH) * WORLD_SCALE + 0.85,
    }));
  const visualRects = (layout?.lots || []).map((lot) => {
    const scale = lot.scale || 1;
    // 视觉房屋/招牌比碰撞核心大，导航也必须避开可见体量。
    const halfX = Math.max(1.6, (lot.frontage || 6.4) * 0.34 * scale) + 0.55;
    const halfZ = Math.max(1.6, (lot.depth || 6.4) * 0.34 * scale) + 0.55;
    return {
      id: `${lot.id}-visual`,
      minX: lot.x - halfX,
      maxX: lot.x + halfX,
      minZ: lot.z - halfZ,
      maxZ: lot.z + halfZ,
    };
  });
  cachedSceneHouses = collisionRects.concat(visualRects);
  return cachedSceneHouses;
}

function sceneBlockedObstacles(state) {
  const source = state?.worldObstacles || WORLD_OBSTACLES;
  const layout = state?.worldLayout || null;
  if (cachedBlockedObstacleRef === source && cachedBlockedLayoutRef === layout && cachedSceneBlocked.length) return cachedSceneBlocked;
  sceneHouseObstacles(state);
  cachedBlockedObstacleRef = source;
  cachedBlockedLayoutRef = layout;
  const waterRects = (source || [])
    .filter((obstacle) => obstacle.kind === "water" && obstacle.type === "rect")
    .map((obstacle) => ({
      id: obstacle.id,
      minX: (obstacle.x - obstacle.halfW) * WORLD_SCALE - 0.45,
      maxX: (obstacle.x + obstacle.halfW) * WORLD_SCALE + 0.45,
      minZ: (obstacle.y - obstacle.halfH) * WORLD_SCALE - 0.45,
      maxZ: (obstacle.y + obstacle.halfH) * WORLD_SCALE + 0.45,
      kind: "water",
    }));
  cachedSceneBlocked = cachedSceneHouses.concat(waterRects);
  return cachedSceneBlocked;
}

function pointInsideHouseScene(point, state, margin = 0) {
  return sceneHouseObstacles(state).some((rect) => (
    point.x >= rect.minX - margin
    && point.x <= rect.maxX + margin
    && point.z >= rect.minZ - margin
    && point.z <= rect.maxZ + margin
  ));
}

function pointInsideBlockedScene(point, state, margin = 0) {
  return sceneBlockedObstacles(state).some((rect) => (
    point.x >= rect.minX - margin
    && point.x <= rect.maxX + margin
    && point.z >= rect.minZ - margin
    && point.z <= rect.maxZ + margin
  ));
}

function firstBlockingHouseScene(a, b, state) {
  if (!state?.worldObstacles) return false;
  const houses = sceneHouseObstacles(state);
  if (!houses.length) return null;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return null;
  const steps = Math.max(2, Math.ceil(len / 1.8));
  for (let i = 1; i < steps; i += 1) {
    const u = i / steps;
    const x = a.x + dx * u;
    const z = a.z + dz * u;
    for (const rect of houses) {
      if (x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ) return rect;
    }
  }
  return null;
}

function segmentBlockedByHouseScene(a, b, state) {
  return Boolean(firstBlockingHouseScene(a, b, state));
}

function firstBlockingScene(a, b, state) {
  const obstacles = sceneBlockedObstacles(state);
  if (!obstacles.length) return null;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 0.01) return null;
  const steps = Math.max(2, Math.ceil(len / 1.4));
  for (let i = 1; i < steps; i += 1) {
    const u = i / steps;
    const x = a.x + dx * u;
    const z = a.z + dz * u;
    for (const rect of obstacles) {
      if (x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ) return rect;
    }
  }
  return null;
}

function segmentBlockedScene(a, b, state) {
  return Boolean(firstBlockingScene(a, b, state));
}

function routeAroundRect(a, b, rect, state) {
  const pad = 2.0;
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const candidates = [];
  if (Math.abs(dx) >= Math.abs(dz)) {
    for (const sideZ of [rect.minZ - pad, rect.maxZ + pad]) {
      candidates.push([{ x: a.x, z: sideZ }, { x: b.x, z: sideZ }]);
    }
  } else {
    for (const sideX of [rect.minX - pad, rect.maxX + pad]) {
      candidates.push([{ x: sideX, z: a.z }, { x: sideX, z: b.z }]);
    }
  }
  const scored = candidates.map((mid) => {
    const route = [a, ...mid, b];
    const blocked = route.some((p, i) => i > 0 && segmentBlockedByHouseScene(route[i - 1], p, state));
    const length = route.reduce((sum, p, i) => i ? sum + Math.hypot(p.x - route[i - 1].x, p.z - route[i - 1].z) : 0, 0);
    return { mid, blocked, length };
  }).sort((x, y) => Number(x.blocked) - Number(y.blocked) || x.length - y.length);
  return scored[0]?.mid || [];
}

function avoidHouseCrossingPath(points, state, passes = 2) {
  let path = points;
  for (let pass = 0; pass < passes; pass += 1) {
    if (path.length < 2) return path;
    const next = [path[0]];
    let changed = false;
    for (let i = 1; i < path.length; i += 1) {
      const a = next[next.length - 1];
      const b = path[i];
      const rect = firstBlockingHouseScene(a, b, state);
      if (rect) {
        routeAroundRect(a, b, rect, state).forEach((p) => {
          const last = next[next.length - 1];
          if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.4) next.push(p);
        });
        changed = true;
      }
      const last = next[next.length - 1];
      if (!last || Math.hypot(last.x - b.x, last.z - b.z) > 0.4) next.push(b);
    }
    path = simplifyScenePath(next);
    if (!changed) break;
  }
  return path;
}

function pathBlockedByHouse(points, state) {
  return points.some((point, i) => i > 0 && segmentBlockedByHouseScene(points[i - 1], point, state));
}

function gridPathAroundHouses(start, goal, state) {
  const step = 7.0;
  const minX = WORLD_BOUNDS.minX * WORLD_SCALE;
  const maxX = WORLD_BOUNDS.maxX * WORLD_SCALE;
  const minZ = WORLD_BOUNDS.minY * WORLD_SCALE;
  const maxZ = WORLD_BOUNDS.maxY * WORLD_SCALE;
  const cols = Math.floor((maxX - minX) / step) + 1;
  const rows = Math.floor((maxZ - minZ) / step) + 1;
  const toIndex = (p) => ({
    ix: Math.max(0, Math.min(cols - 1, Math.round((p.x - minX) / step))),
    iz: Math.max(0, Math.min(rows - 1, Math.round((p.z - minZ) / step))),
  });
  const toPoint = ({ ix, iz }) => ({ x: minX + ix * step, z: minZ + iz * step });
  const idxKey = (ix, iz) => `${ix},${iz}`;
  const blocked = (ix, iz) => pointInsideBlockedScene(toPoint({ ix, iz }), state, 0.65);
  const freeNear = (idx) => {
    if (!blocked(idx.ix, idx.iz)) return idx;
    for (let r = 1; r <= 8; r += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        for (let dz = -r; dz <= r; dz += 1) {
          if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
          const ix = idx.ix + dx;
          const iz = idx.iz + dz;
          if (ix >= 0 && iz >= 0 && ix < cols && iz < rows && !blocked(ix, iz)) return { ix, iz };
        }
      }
    }
    return idx;
  };
  const startIdx = freeNear(toIndex(start));
  const goalIdx = freeNear(toIndex(goal));
  const goalKey = idxKey(goalIdx.ix, goalIdx.iz);
  const open = [startIdx];
  const openKeys = new Set([idxKey(startIdx.ix, startIdx.iz)]);
  const came = new Map();
  const g = new Map([[idxKey(startIdx.ix, startIdx.iz), 0]]);
  const h = (ix, iz) => Math.hypot(ix - goalIdx.ix, iz - goalIdx.iz);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  let iterations = 0;
  while (open.length && iterations < 9000) {
    iterations += 1;
    let bestIndex = 0;
    let bestScore = Infinity;
    for (let i = 0; i < open.length; i += 1) {
      const item = open[i];
      const k = idxKey(item.ix, item.iz);
      const score = (g.get(k) ?? Infinity) + h(item.ix, item.iz);
      if (score < bestScore) { bestScore = score; bestIndex = i; }
    }
    const current = open.splice(bestIndex, 1)[0];
    const currentKey = idxKey(current.ix, current.iz);
    openKeys.delete(currentKey);
    if (currentKey === goalKey) {
      const result = [goal];
      let k = currentKey;
      while (k) {
        const [ix, iz] = k.split(",").map(Number);
        result.push(toPoint({ ix, iz }));
        k = came.get(k);
      }
      result.push(start);
      return simplifyScenePath(result.reverse());
    }
    for (const [dx, dz] of dirs) {
      const ix = current.ix + dx;
      const iz = current.iz + dz;
      if (ix < 0 || iz < 0 || ix >= cols || iz >= rows || blocked(ix, iz)) continue;
      if (dx && dz && (blocked(current.ix + dx, current.iz) || blocked(current.ix, current.iz + dz))) continue;
      const nk = idxKey(ix, iz);
      const stepCost = dx && dz ? 1.42 : 1;
      const ng = (g.get(currentKey) ?? Infinity) + stepCost;
      if (ng >= (g.get(nk) ?? Infinity)) continue;
      came.set(nk, currentKey);
      g.set(nk, ng);
      if (!openKeys.has(nk)) {
        open.push({ ix, iz });
        openKeys.add(nk);
      }
    }
  }
  return [];
}

function nearestSegmentPoint(point, state = null) {
  const candidates = ROAD_SEGMENTS
    .map((seg) => nearestPointOnSegment(point, seg))
    .sort((a, b) => a.distance - b.distance);
  if (!state) return candidates[0];
  return candidates.find((item) => !pointInsideBlockedScene(item.point, state, 0.2)) || candidates[0];
}

function addGraphNode(nodes, point) {
  const k = key(point);
  if (!nodes.has(k)) nodes.set(k, { ...point, key: k, links: new Map() });
  return nodes.get(k);
}

function addGraphEdge(nodes, a, b, state = null) {
  if (state && segmentBlockedScene(a, b, state)) return;
  const na = addGraphNode(nodes, a);
  const nb = addGraphNode(nodes, b);
  const dist = Math.hypot(na.x - nb.x, na.z - nb.z);
  if (dist < 0.01) return;
  na.links.set(nb.key, dist);
  nb.links.set(na.key, dist);
}

function connectNearbyRoadNodes(nodes, radius = 3.2, state = null) {
  // OSM 上有些小路口 / 桥下道路端点不是完全同一个 node。
  // 这里用很小半径把“几乎相接”的道路端点连起来，避免寻路失败后退化成穿房直线。
  const cell = radius;
  const buckets = new Map();
  const bucketKey = (x, z) => `${Math.floor(x / cell)},${Math.floor(z / cell)}`;
  nodes.forEach((node) => {
    const k = bucketKey(node.x, node.z);
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(node);
  });
  const offsets = [-1, 0, 1];
  nodes.forEach((node) => {
    const bx = Math.floor(node.x / cell);
    const bz = Math.floor(node.z / cell);
    offsets.forEach((ox) => offsets.forEach((oz) => {
      const list = buckets.get(`${bx + ox},${bz + oz}`) || [];
      list.forEach((other) => {
        if (other.key === node.key) return;
        const d = Math.hypot(node.x - other.x, node.z - other.z);
        if (d > 0.01 && d <= radius) {
          node.links.set(other.key, d);
          other.links.set(node.key, d);
        }
      });
    }));
  });
}

function buildRoadGraph(extraPoints = [], state = null) {
  const nodes = new Map();
  const pointsBySegment = new Map();
  const collect = (seg, point) => {
    const id = JSON.stringify(seg);
    if (!pointsBySegment.has(id)) pointsBySegment.set(id, { seg, points: [] });
    pointsBySegment.get(id).points.push(point);
    addGraphNode(nodes, point);
  };

  ROAD_SEGMENTS.forEach((seg) => {
    if (seg.dir === "line") {
      collect(seg, { x: seg.x1, z: seg.z1 });
      collect(seg, { x: seg.x2, z: seg.z2 });
    } else if (seg.dir === "h") {
      collect(seg, { x: seg.x1, z: seg.z });
      collect(seg, { x: seg.x2, z: seg.z });
    } else {
      collect(seg, { x: seg.x, z: seg.z1 });
      collect(seg, { x: seg.x, z: seg.z2 });
    }
  });

  if (ROAD_SEGMENTS.some((seg) => seg.dir !== "line")) {
    for (const h of ROAD_SEGMENTS.filter((seg) => seg.dir === "h")) {
      for (const v of ROAD_SEGMENTS.filter((seg) => seg.dir === "v")) {
        if (v.x >= h.x1 && v.x <= h.x2 && h.z >= v.z1 && h.z <= v.z2) {
          const p = { x: v.x, z: h.z };
          collect(h, p);
          collect(v, p);
        }
      }
    }
  }

  extraPoints.forEach(({ seg, point }) => collect(seg, point));

  pointsBySegment.forEach(({ seg, points }) => {
    const sorted = [...points].sort((a, b) => {
      if (seg.dir === "line") {
        const ax = a.x - seg.x1;
        const az = a.z - seg.z1;
        const bx = b.x - seg.x1;
        const bz = b.z - seg.z1;
        const vx = seg.x2 - seg.x1;
        const vz = seg.z2 - seg.z1;
        return (ax * vx + az * vz) - (bx * vx + bz * vz);
      }
      return seg.dir === "h" ? a.x - b.x : a.z - b.z;
    });
    for (let i = 0; i < sorted.length - 1; i += 1) addGraphEdge(nodes, sorted[i], sorted[i + 1], state);
  });
  connectNearbyRoadNodes(nodes, 3.2, state);
  return nodes;
}

function shortestPath(nodes, startKey, targetKey) {
  const dist = new Map();
  const prev = new Map();
  const open = new Set(nodes.keys());
  nodes.forEach((_, k) => dist.set(k, Infinity));
  dist.set(startKey, 0);
  while (open.size) {
    let current = null;
    let best = Infinity;
    open.forEach((k) => {
      const d = dist.get(k) ?? Infinity;
      if (d < best) { best = d; current = k; }
    });
    if (!current || current === targetKey) break;
    open.delete(current);
    const node = nodes.get(current);
    node.links.forEach((cost, nextKey) => {
      if (!open.has(nextKey)) return;
      const nd = best + cost;
      if (nd < (dist.get(nextKey) ?? Infinity)) {
        dist.set(nextKey, nd);
        prev.set(nextKey, current);
      }
    });
  }
  if (!prev.has(targetKey) && startKey !== targetKey) return [];
  const path = [];
  let cur = targetKey;
  while (cur) {
    const node = nodes.get(cur);
    path.push({ x: node.x, z: node.z });
    if (cur === startKey) break;
    cur = prev.get(cur);
  }
  return path.reverse();
}

function simplifyScenePath(points) {
  const result = [];
  points.forEach((point) => {
    const last = result[result.length - 1];
    if (!last || Math.hypot(last.x - point.x, last.z - point.z) > 1.6) result.push(point);
  });
  return result;
}

function appendWaypoint(points, point) {
  const last = points[points.length - 1];
  if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 70) points.push(point);
}

function normalizeAngle(angle) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function sceneDistanceToRoad(x, z) {
  let best = Infinity;
  ROAD_SEGMENTS.forEach((seg) => {
    const vx = seg.x2 - seg.x1;
    const vz = seg.z2 - seg.z1;
    const len2 = vx * vx + vz * vz;
    const u = len2 ? Math.max(0, Math.min(1, ((x - seg.x1) * vx + (z - seg.z1) * vz) / len2)) : 0;
    const sx = seg.x1 + vx * u;
    const sz = seg.z1 + vz * u;
    best = Math.min(best, Math.hypot(x - sx, z - sz));
  });
  return best;
}

function isOnRoadCorridorWorld(x, y) {
  return sceneDistanceToRoad(x * WORLD_SCALE, y * WORLD_SCALE) <= 5.4;
}

export function buildAutoNavPath(state, target) {
  const startScene = worldToScenePoint(state.player.x, state.player.y);
  const targetScene = worldToScenePoint(target.deliveryX ?? target.x, target.deliveryY ?? target.y);
  const startSnap = nearestSegmentPoint(startScene, state);
  const targetSnap = nearestSegmentPoint(targetScene, state);
  const nodes = buildRoadGraph([startSnap, targetSnap], state);
  let scenePath = simplifyScenePath(shortestPath(nodes, key(startSnap.point), key(targetSnap.point)));
  if (scenePath.length < 2) scenePath = [startSnap.point, targetSnap.point];
  scenePath = avoidHouseCrossingPath(scenePath, state, 2);
  if (pathBlockedByHouse(scenePath, state)) {
    const gridPath = gridPathAroundHouses(startSnap.point, targetSnap.point, state);
    if (gridPath.length >= 2) scenePath = avoidHouseCrossingPath(gridPath, state, 1);
  }
  const points = [];
  scenePath.forEach((point) => appendWaypoint(points, sceneToWorldPoint(point)));
  // 终点停在目标旁边的道路中心线。投递范围很大，自动导航不应该再从道路拐进房屋/院子里。
  return points;
}

function nextAutoWaypoint(state, target) {
  const px = state.player.x;
  const py = state.player.y;
  const needNewPath = !state.autoNavPath || state.autoNavTargetId !== target.id || !Number.isInteger(state.autoNavIndex);
  if (needNewPath) {
    state.autoNavPath = buildAutoNavPath(state, target);
    state.autoNavTargetId = target.id;
    state.autoNavIndex = 0;
  }
  const path = state.autoNavPath || [];
  const threshold = state.config?.moveMode === "bike" ? 125 : 82;
  while (state.autoNavIndex < path.length - 1) {
    const point = path[state.autoNavIndex];
    if (Math.hypot(point.x - px, point.y - py) > threshold) break;
    state.autoNavIndex += 1;
  }
  return path[state.autoNavIndex] || null;
}

export function deliveryDistance(state, target = currentTarget(state)) {
  if (!target) return Infinity;
  // 判定中心改为“黄框 / 房屋中心”，不是路边投递点。
  // 这样进入黄框外一圈的隐形范围时，头顶就会出现报纸图标。
  return Math.hypot(state.player.x - target.x, state.player.y - target.y);
}

export function deliveryTriggerRadius() {
  return (VISIBLE_TARGET_RING_RADIUS_SCENE / WORLD_SCALE) * INVISIBLE_DELIVERY_RADIUS_MULTIPLIER;
}

export function canDeliverNow(state, target = currentTarget(state)) {
  if (!target || !state.isPlaying || state.isPaused || state.delivery?.active) return false;
  return deliveryDistance(state, target) <= deliveryTriggerRadius(state);
}

export function requestDelivery(state) {
  const target = currentTarget(state);
  if (!target) return { completed: true, delivered: false };

  // 判定仍以路边可到达点为准；视觉命中点落在房屋中心。
  const targetX = target.x;
  const targetY = target.y;
  if (state.delivery?.active) return { completed: false, delivered: false, flying: true };

  if (canDeliverNow(state, target)) {
    const dx = targetX - state.player.x;
    const dy = targetY - state.player.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const faceAngle = Math.atan2(dy, dx);
    state.player.headingAngle = faceAngle;
    state.player.headingX = Math.cos(faceAngle);
    state.player.headingY = Math.sin(faceAngle);
    state.player.facing = state.player.headingX >= 0 ? 1 : -1;
    state.delivery = {
      active: true,
      t: 0,
      duration: 0.75,
      targetId: target.id,
      targetName: nt(target, "name"),
      thanks: nt(target, "thanks"),
      recipient: {
        id: target.id,
        name: nt(target, "name"),
        gender: target.recipient?.gender || "male",
        avatar: target.recipient?.avatar || target.id,
      },
      start: { x: state.player.x + (dx / len) * 45, y: state.player.y + (dy / len) * 45 },
      end: { x: targetX, y: targetY },
    };
    state.comic = { text: t("comicThrow"), tone: "throw", time: 0.7 };
    state.message = t("flying");
    return { completed: false, delivered: false, flying: true };
  }

  state.comic = { text: t("comicHint"), tone: "hint", time: 1.1 };
  state.message = t("closer");
  return { completed: false, delivered: false };
}

export function updateDelivery(state, dt) {
  if (state.comic) {
    state.comic.time -= dt;
    if (state.comic.time <= 0) state.comic = null;
  }
  if (state.houseReaction) {
    state.houseReaction.time -= dt;
    if (state.houseReaction.time <= 0) state.houseReaction = null;
  }
  if (!state.delivery?.active) return { completed: false };
  state.delivery.t += dt / state.delivery.duration;
  if (state.delivery.t < 1) return { completed: false };

  const deliveredId = state.delivery.targetId;
  const thanks = state.delivery.thanks;
  const recipient = state.delivery.recipient || { id: deliveredId, name: state.delivery.targetName };
  state.delivered.push(deliveredId);
  const reactionTypes = ["door", "window", "resident", "cat"];
  const reactionType = reactionTypes[(state.delivered.length + deliveredId.length) % reactionTypes.length];
  state.houseReaction = { id: deliveredId, time: 1.9, type: reactionType, recipient };
  state.comic = {
    text: thanks,
    tone: "success neighbor-thanks",
    time: 2.8,
    speaker: "neighbor",
    speakerName: recipient.name,
    neighborId: recipient.id,
    recipient,
  };
  state.message = thanks;
  state.delivery = null;
  const completed = !currentTarget(state);
  if (state.autoForward && !completed) {
    // 自动驾驶时，送达后不要立刻掉头离开；先等收件人的漫画气泡说完，
    // 再重新规划下一户路线并转向出发，节奏更像“礼貌地等对方回应”。
    state.autoNavWaitUntil = (state.floatTime || 0) + Math.max(2.35, state.comic.time || 2.8);
    state.autoNavPath = null;
    state.autoNavTargetId = null;
    state.autoNavIndex = 0;
    state.autoNavWaypoint = null;
  }
  return { completed, delivered: true };
}

export function updatePlayer(state, dt) {
  if (!state.isPlaying || state.isPaused) return;

  const mode = state.config?.moveMode || "walk";
  const turnRate = mode === "bike" ? 1.08 : 2.0;
  const speed = state.config.speed;
  const reverseFactor = mode === "bike" ? 0.36 : 0.55;
  const target = currentTarget(state);
  const autoWaiting = Boolean(state.autoForward && target && (state.floatTime || 0) < (state.autoNavWaitUntil || 0));
  const obstacleWaiting = Boolean(state.autoForward && target && (state.floatTime || 0) < (state.autoNavBlockedUntil || 0));
  const autoNav = Boolean(state.autoForward && target && !state.delivery?.active && !autoWaiting && !obstacleWaiting);
  const deliverReady = Boolean(target && canDeliverNow(state, target));
  state.autoNavMoving = false;
  state.autoAvoiding = false;
  state.autoAvoidCooldown = Math.max(0, (state.autoAvoidCooldown || 0) - dt);

  let throttle = 0;
  if (state.touchThrottle) throttle += state.touchThrottle > 0 ? state.touchThrottle : state.touchThrottle * reverseFactor;
  if (state.keys.has("arrowup") || state.keys.has("w")) throttle = Math.max(throttle, 1);
  if (state.keys.has("arrowdown") || state.keys.has("s")) throttle = Math.min(throttle, -reverseFactor);

  let turn = state.touchSteer || 0;
  // 第三人称“生化危机式”控制：左键向画面左侧转，右键向画面右侧转。
  if (state.keys.has("arrowleft") || state.keys.has("a")) turn -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) turn += 1;
  turn = Math.max(-1, Math.min(1, turn));

  const nearInfo = state.nearTraffic;
  let trafficSlowFactor = 1;
  state.autoTrafficSlowing = false;
  if (autoNav && nearInfo && nearInfo.ahead !== false) {
    const far = nearInfo.kind === "cyclist" ? 8.5 : 6.7;
    const close = nearInfo.kind === "cyclist" ? 2.9 : 2.25;
    if (nearInfo.distance < far) {
      const u = Math.max(0, Math.min(1, (nearInfo.distance - close) / Math.max(0.01, far - close)));
      trafficSlowFactor = 0.34 + u * 0.66;
      state.autoTrafficSlowing = true;
    }
  }

  if (autoWaiting || obstacleWaiting) {
    throttle = 0;
    state.autoNavMoving = false;
    state.autoNavWaypoint = null;
    state.autoStuckTime = 0;
  } else if (deliverReady) {
    // 进入可投递范围后自动面向被投递的房子；老人只要按投递即可，不必再微调朝向。
    const faceAngle = Math.atan2(target.y - state.player.y, target.x - state.player.x);
    const diff = normalizeAngle(faceAngle - state.player.headingAngle);
    const maxTurn = (mode === "bike" ? 3.4 : 4.8) * dt;
    state.player.headingAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
    throttle = 0;
  } else if (autoNav && throttle >= 0 && !canDeliverNow(state, target)) {
    state.autoAvoidTimer = 0;
    const waypoint = nextAutoWaypoint(state, target);
    if (waypoint) {
      const desiredAngle = Math.atan2(waypoint.y - state.player.y, waypoint.x - state.player.x);
      const diff = normalizeAngle(desiredAngle - state.player.headingAngle);
      const absDiff = Math.abs(diff);
      const maxTurn = (mode === "bike" ? 2.15 : 3.6) * dt;
      state.player.headingAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
      const turnSlowdown = absDiff > 1.05 ? 0.26 : absDiff > 0.55 ? 0.48 : 1;
      throttle = Math.max(throttle, (state.easyMode ? 0.44 : 0.70) * turnSlowdown * trafficSlowFactor);
      state.autoNavMoving = throttle > 0.05;
      state.autoNavWaypoint = waypoint;
    }
  } else if (autoNav && canDeliverNow(state, target)) {
    state.autoNavWaypoint = null;
    state.autoNavPath = null;
    state.autoNavTargetId = null;
    state.autoNavIndex = 0;
    throttle = 0;
  } else if (mode === "bike") {
    // 自行车不应像原地旋转的角色；只有按住前进 / 后退移动时才逐渐改变朝向。
    const movementGrip = Math.min(1, Math.abs(throttle));
    turn *= movementGrip;
  }

  // 自动导航遇到障碍只停车等待，避免反复转向造成紧张感。
  if (!autoNav && turn) state.player.headingAngle += turn * turnRate * dt;

  state.player.headingX = Math.cos(state.player.headingAngle);
  state.player.headingY = Math.sin(state.player.headingAngle);
  state.player.facing = state.player.headingX >= 0 ? 1 : -1;

  if (throttle) {
    const step = speed * throttle * dt;
    const nextX = state.player.x + state.player.headingX * step;
    const nextY = state.player.y + state.player.headingY * step;
    const beforeX = state.player.x;
    const beforeY = state.player.y;
    const collision = moveWithCollision(state, nextX, nextY);
    const moved = Math.hypot(state.player.x - beforeX, state.player.y - beforeY);
    if (autoNav && (collision.hit || moved < Math.max(1, Math.abs(step) * 0.12))) {
      state.autoStuckTime = (state.autoStuckTime || 0) + dt;
      state.autoNavMoving = false;
      if (state.autoStuckTime > 0.22 || collision.hit) {
        state.autoNavBlockedUntil = (state.floatTime || 0) + 0.95;
        state.autoStuckTime = 0;
        state.autoAvoiding = true;
        if ((state.floatTime || 0) - (state.lastAutoObstacleHintAt ?? -99) > 2.4) {
          const line = t("autoObstacleStop");
          state.lastAutoObstacleHintAt = state.floatTime || 0;
          state.message = line;
          state.comic = { text: line, tone: "hint safety", time: 2.0, speaker: "companion" };
        }
      }
    } else if (autoNav) {
      state.autoStuckTime = 0;
      state.autoNavBlockedUntil = 0;
    }
  }
}

function moveWithCollision(state, nextX, nextY) {
  const mode = state.config?.moveMode || "walk";
  const radius = PLAYER_RADIUS[mode] || PLAYER_RADIUS.walk;
  const current = { x: state.player.x, y: state.player.y };
  const tryX = clampPoint({ x: nextX, y: current.y }, radius);
  const hitX = collisionAt(state, tryX.x, tryX.y, radius);
  if (!hitX) current.x = tryX.x;
  else noteTrafficCollision(state, hitX);

  const tryY = clampPoint({ x: current.x, y: nextY }, radius);
  const hitY = collisionAt(state, tryY.x, tryY.y, radius);
  if (!hitY) current.y = tryY.y;
  else noteTrafficCollision(state, hitY);

  state.player.x = current.x;
  state.player.y = current.y;
  return { hit: hitX || hitY || null };
}

function clampPoint(point, radius) {
  return {
    x: Math.max(WORLD_BOUNDS.minX + radius, Math.min(WORLD_BOUNDS.maxX - radius, point.x)),
    y: Math.max(WORLD_BOUNDS.minY + radius, Math.min(WORLD_BOUNDS.maxY - radius, point.y)),
  };
}

function allObstacles(state) {
  const staticObstacles = nearbyStaticObstacles(state);
  const traffic = Array.isArray(state.trafficObstacles) ? state.trafficObstacles : [];
  return staticObstacles.concat(traffic);
}

function nearbyStaticObstacles(state) {
  const source = state.worldObstacles || WORLD_OBSTACLES;
  const px = state.player?.x ?? 0;
  const py = state.player?.y ?? 0;
  const cell = 620;
  const key = `${source.length}:${Math.floor(px / cell)}:${Math.floor(py / cell)}`;
  if (state.__nearObstacleKey === key && Array.isArray(state.__nearObstacles)) return state.__nearObstacles;
  const range = 980;
  const filtered = source.filter((obstacle) => {
    if (obstacle.type === "circle") return Math.abs(obstacle.x - px) <= range && Math.abs(obstacle.y - py) <= range;
    const ox = Math.max(obstacle.x - obstacle.halfW, Math.min(px, obstacle.x + obstacle.halfW));
    const oy = Math.max(obstacle.y - obstacle.halfH, Math.min(py, obstacle.y + obstacle.halfH));
    return Math.abs(ox - px) <= range && Math.abs(oy - py) <= range;
  });
  state.__nearObstacleKey = key;
  state.__nearObstacles = filtered;
  return filtered;
}

function collisionAt(state, x, y, radius) {
  const onRoad = isOnRoadCorridorWorld(x, y);
  for (const obstacle of allObstacles(state)) {
    // 不能再忽略 house：上一版为了消除空气墙跳过了压路建筑碰撞，
    // 结果玩家会从可见房子中穿过去。现在只允许路面上的小树/小物件让路，
    // 房屋仍然必须挡住玩家。
    if (onRoad && (obstacle.kind === "tree" || obstacle.kind === "object")) continue;
    // 自动导航优先保证老人不会被绿化/小物件卡住。树木和路边小物件只作为手动模式的实体碰撞，
    // 自动驾驶会把它们当作“可轻轻绕过的软障碍”，避免反复停在同一棵树前。
    if (state.autoForward && (obstacle.kind === "tree" || obstacle.kind === "object")) continue;
    // 自动导航时，行人和骑车路人会主动侧向避让；这里不再把他们当硬墙，
    // 避免自动驾驶在同一个位置反复停走。
    if (state.autoForward && (obstacle.kind === "pedestrian" || obstacle.kind === "cyclist")) continue;
    if (obstacle.type === "circle") {
      if (Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.r) return obstacle;
      continue;
    }
    const closestX = Math.max(obstacle.x - obstacle.halfW, Math.min(x, obstacle.x + obstacle.halfW));
    const closestY = Math.max(obstacle.y - obstacle.halfH, Math.min(y, obstacle.y + obstacle.halfH));
    if (Math.hypot(x - closestX, y - closestY) < radius) return obstacle;
  }
  return null;
}

function noteTrafficCollision(state, obstacle) {
  if (!obstacle || (obstacle.kind !== "pedestrian" && obstacle.kind !== "cyclist")) return;
  const now = state.floatTime || 0;
  if (now - (state.lastTrafficBumpAt ?? -99) < 1.55) return;
  const key = obstacle.kind === "cyclist" ? "trafficBumpCyclist" : "trafficBumpPedestrian";
  const line = t(key);
  state.lastTrafficBumpAt = now;
  state.trafficBump = { kind: obstacle.kind, id: obstacle.id || obstacle.kind, time: 0.8 };
  state.message = line;
  state.comic = { text: line, tone: "hint safety", time: 2.2, speaker: "companion" };
}
