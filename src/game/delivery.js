import { WORLD_BOUNDS, WORLD_OBSTACLES, PLAYER_RADIUS, WORLD_SCALE, ROAD_SEGMENTS } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

// 要和 ThreeRenderer.updateTarget() 里的黄框视觉半径保持一致：
// 黄框半径约 8.3 个场景单位；隐形可投递范围 = 黄框半径的 5 倍。
// 2026-05-28 调整：可见光圈直径扩大 1 倍，隐形投递圈同比扩大。
const VISIBLE_TARGET_RING_RADIUS_SCENE = 8.3;
const INVISIBLE_DELIVERY_RADIUS_MULTIPLIER = 5;
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

function pointInsideHouseScene(point, state, margin = 0) {
  return sceneHouseObstacles(state).some((rect) => (
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
  const blocked = (ix, iz) => pointInsideHouseScene(toPoint({ ix, iz }), state, 0.65);
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
  return candidates.find((item) => !pointInsideHouseScene(item.point, state, 0.2)) || candidates[0];
}

function addGraphNode(nodes, point) {
  const k = key(point);
  if (!nodes.has(k)) nodes.set(k, { ...point, key: k, links: new Map() });
  return nodes.get(k);
}

function addGraphEdge(nodes, a, b, state = null) {
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
  return { completed: !currentTarget(state), delivered: true };
}

export function updatePlayer(state, dt) {
  if (!state.isPlaying || state.isPaused) return;

  const mode = state.config?.moveMode || "walk";
  const turnRate = mode === "bike" ? 1.08 : 2.0;
  const speed = state.config.speed;
  const reverseFactor = mode === "bike" ? 0.36 : 0.55;
  const target = currentTarget(state);
  const autoNav = Boolean(state.autoForward && target && !state.delivery?.active);
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
  const shouldYield = autoNav
    && nearInfo
    && nearInfo.distance < (nearInfo.kind === "cyclist" ? 8.5 : 6.7)
    && nearInfo.ahead !== false
    && (state.autoAvoidCooldown || 0) <= 0;

  if (autoNav && shouldYield) {
    throttle = 0;
    state.autoAvoiding = true;
    state.autoNavMoving = false;
    state.autoAvoidTimer = (state.autoAvoidTimer || 0) + dt;
    if (state.autoAvoidTimer > 0.9) {
      state.autoAvoidCooldown = 1.8;
      state.autoAvoidTimer = 0;
    }
  } else if (autoNav && throttle >= 0 && !canDeliverNow(state, target)) {
    state.autoAvoidTimer = 0;
    const waypoint = nextAutoWaypoint(state, target);
    if (waypoint) {
      const desiredAngle = Math.atan2(waypoint.y - state.player.y, waypoint.x - state.player.x);
      const diff = normalizeAngle(desiredAngle - state.player.headingAngle);
      const absDiff = Math.abs(diff);
      const maxTurn = (mode === "bike" ? 2.15 : 3.6) * dt;
      state.player.headingAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
      const turnSlowdown = absDiff > 1.05 ? 0.18 : absDiff > 0.55 ? 0.38 : 1;
      throttle = Math.max(throttle, (state.easyMode ? 0.34 : 0.56) * turnSlowdown);
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

  // 兜底：真实 OSM 路网若遇到断路/桥梁连通问题，也不要让“自动导航”原地不动。
  if (autoNav && !state.autoNavMoving && !state.autoAvoiding && !canDeliverNow(state, target)) {
    const waypoint = nextAutoWaypoint(state, target) || { x: target.deliveryX ?? target.x, y: target.deliveryY ?? target.y };
    const desiredAngle = Math.atan2(waypoint.y - state.player.y, waypoint.x - state.player.x);
    const diff = normalizeAngle(desiredAngle - state.player.headingAngle);
    const maxTurn = (mode === "bike" ? 1.9 : 3.1) * dt;
    state.player.headingAngle += Math.max(-maxTurn, Math.min(maxTurn, diff));
    throttle = Math.max(throttle, mode === "bike" ? 0.22 : 0.38);
    state.autoNavMoving = true;
    state.autoNavWaypoint = waypoint;
  }
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
    moveWithCollision(state, nextX, nextY);
    if (autoNav && Math.hypot(state.player.x - beforeX, state.player.y - beforeY) < Math.max(1, Math.abs(step) * 0.12)) {
      state.autoStuckTime = (state.autoStuckTime || 0) + dt;
      if (state.autoStuckTime > 0.55) {
        state.autoNavPath = null;
        state.autoNavTargetId = null;
        state.autoNavIndex = 0;
        state.autoStuckTime = 0;
      }
    } else if (autoNav) {
      state.autoStuckTime = 0;
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
}

function clampPoint(point, radius) {
  return {
    x: Math.max(WORLD_BOUNDS.minX + radius, Math.min(WORLD_BOUNDS.maxX - radius, point.x)),
    y: Math.max(WORLD_BOUNDS.minY + radius, Math.min(WORLD_BOUNDS.maxY - radius, point.y)),
  };
}

function allObstacles(state) {
  const staticObstacles = state.worldObstacles || WORLD_OBSTACLES;
  const traffic = Array.isArray(state.trafficObstacles) ? state.trafficObstacles : [];
  return staticObstacles.concat(traffic);
}

function collisionAt(state, x, y, radius) {
  const onRoad = isOnRoadCorridorWorld(x, y);
  for (const obstacle of allObstacles(state)) {
    // 不能再忽略 house：上一版为了消除空气墙跳过了压路建筑碰撞，
    // 结果玩家会从可见房子中穿过去。现在只允许路面上的小树/小物件让路，
    // 房屋仍然必须挡住玩家。
    if (onRoad && (obstacle.kind === "tree" || obstacle.kind === "object")) continue;
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
