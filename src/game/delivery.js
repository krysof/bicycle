import { WORLD_BOUNDS, WORLD_OBSTACLES, PLAYER_RADIUS, WORLD_SCALE, ROAD_X, ROAD_Z } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

// 要和 ThreeRenderer.updateTarget() 里的黄框视觉半径保持一致：
// 黄框半径约 8.3 个场景单位；隐形可投递范围 = 黄框半径的 5 倍。
// 2026-05-28 调整：可见光圈直径扩大 1 倍，隐形投递圈同比扩大。
const VISIBLE_TARGET_RING_RADIUS_SCENE = 8.3;
const INVISIBLE_DELIVERY_RADIUS_MULTIPLIER = 5;
const ROAD_X_WORLD = ROAD_X.map((x) => x / WORLD_SCALE);
const ROAD_Y_WORLD = ROAD_Z.map((z) => z / WORLD_SCALE);

function nearestRoad(value, roads) {
  return roads.reduce((best, item) => Math.abs(item - value) < Math.abs(best - value) ? item : best, roads[0]);
}

function normalizeAngle(angle) {
  let result = angle;
  while (result > Math.PI) result -= Math.PI * 2;
  while (result < -Math.PI) result += Math.PI * 2;
  return result;
}

function appendWaypoint(points, point) {
  const last = points[points.length - 1];
  if (!last || Math.hypot(last.x - point.x, last.y - point.y) > 70) points.push(point);
}

function buildAutoNavPath(state, target) {
  const px = state.player.x;
  const py = state.player.y;
  const tx = target.deliveryX ?? target.x;
  const ty = target.deliveryY ?? target.y;
  const startRoadX = nearestRoad(px, ROAD_X_WORLD);
  const startRoadY = nearestRoad(py, ROAD_Y_WORLD);
  const targetRoadX = nearestRoad(tx, ROAD_X_WORLD);
  const targetRoadY = nearestRoad(ty, ROAD_Y_WORLD);
  const dxToVertical = Math.abs(px - startRoadX);
  const dyToHorizontal = Math.abs(py - startRoadY);
  const startOnVertical = dxToVertical < dyToHorizontal;
  const jointX = targetRoadX;
  const points = [];

  if (startOnVertical) {
    appendWaypoint(points, { x: startRoadX, y: py });
    appendWaypoint(points, { x: startRoadX, y: targetRoadY });
    appendWaypoint(points, { x: jointX, y: targetRoadY });
  } else {
    appendWaypoint(points, { x: px, y: startRoadY });
    appendWaypoint(points, { x: jointX, y: startRoadY });
    appendWaypoint(points, { x: jointX, y: targetRoadY });
  }
  appendWaypoint(points, { x: tx, y: targetRoadY });
  appendWaypoint(points, { x: tx, y: ty });
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
      state.autoNavPath = null;
      state.autoNavTargetId = null;
      state.autoNavIndex = 0;
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
  for (const obstacle of allObstacles(state)) {
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
