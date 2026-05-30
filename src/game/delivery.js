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

function nearestSegmentPoint(point) {
  return ROAD_SEGMENTS
    .map((seg) => nearestPointOnSegment(point, seg))
    .sort((a, b) => a.distance - b.distance)[0];
}

function addGraphNode(nodes, point) {
  const k = key(point);
  if (!nodes.has(k)) nodes.set(k, { ...point, key: k, links: new Map() });
  return nodes.get(k);
}

function addGraphEdge(nodes, a, b) {
  const na = addGraphNode(nodes, a);
  const nb = addGraphNode(nodes, b);
  const dist = Math.hypot(na.x - nb.x, na.z - nb.z);
  if (dist < 0.01) return;
  na.links.set(nb.key, dist);
  nb.links.set(na.key, dist);
}

function connectNearbyRoadNodes(nodes, radius = 3.2) {
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

function buildRoadGraph(extraPoints = []) {
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
    for (let i = 0; i < sorted.length - 1; i += 1) addGraphEdge(nodes, sorted[i], sorted[i + 1]);
  });
  connectNearbyRoadNodes(nodes);
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
  const startSnap = nearestSegmentPoint(startScene);
  const targetSnap = nearestSegmentPoint(targetScene);
  const nodes = buildRoadGraph([startSnap, targetSnap]);
  let scenePath = simplifyScenePath(shortestPath(nodes, key(startSnap.point), key(targetSnap.point)));
  // 如果仍然没有连通路径，不再直接画一条穿房子的直线；只引导到当前最近道路点，
  // 下一帧会重新选择附近道路，至少保证箭头留在路面上。
  if (scenePath.length < 2) scenePath = [startSnap.point];
  const points = [];
  scenePath.forEach((point) => appendWaypoint(points, sceneToWorldPoint(point)));
  appendWaypoint(points, sceneToWorldPoint(targetScene));
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
