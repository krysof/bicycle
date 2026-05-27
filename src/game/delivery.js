import { WORLD_BOUNDS, WORLD_OBSTACLES, PLAYER_RADIUS } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

export function deliveryDistance(state, target = currentTarget(state)) {
  if (!target) return Infinity;
  const deliveryX = target.deliveryX ?? target.x;
  const deliveryY = target.deliveryY ?? target.y;
  return Math.hypot(state.player.x - deliveryX, state.player.y - deliveryY);
}

export function deliveryTriggerRadius(state) {
  return (state.config?.assistRadius || 220) * 2;
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
  state.delivered.push(deliveredId);
  state.houseReaction = { id: deliveredId, time: 1.3 };
  state.comic = { text: t("comicSuccess"), tone: "success", time: 1.4 };
  state.message = t("delivered", thanks);
  state.delivery = null;
  return { completed: !currentTarget(state), delivered: true };
}

export function updatePlayer(state, dt) {
  if (!state.isPlaying || state.isPaused) return;

  const mode = state.config?.moveMode || "walk";
  const turnRate = mode === "bike" ? 1.65 : 2.15;
  const speed = state.config.speed;
  const reverseFactor = mode === "bike" ? 0.36 : 0.55;

  let turn = 0;
  // 第三人称“生化危机式”控制：左键向画面左侧转，右键向画面右侧转。
  if (state.keys.has("arrowleft") || state.keys.has("a")) turn -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) turn += 1;
  if (turn) state.player.headingAngle += turn * turnRate * dt;

  state.player.headingX = Math.cos(state.player.headingAngle);
  state.player.headingY = Math.sin(state.player.headingAngle);
  state.player.facing = state.player.headingX >= 0 ? 1 : -1;

  let throttle = 0;
  if (state.keys.has("arrowup") || state.keys.has("w")) throttle += 1;
  if (state.keys.has("arrowdown") || state.keys.has("s")) throttle -= reverseFactor;

  if (throttle) {
    const step = speed * throttle * dt;
    const nextX = state.player.x + state.player.headingX * step;
    const nextY = state.player.y + state.player.headingY * step;
    moveWithCollision(state, nextX, nextY);
  }
}

function moveWithCollision(state, nextX, nextY) {
  const mode = state.config?.moveMode || "walk";
  const radius = PLAYER_RADIUS[mode] || PLAYER_RADIUS.walk;
  const current = { x: state.player.x, y: state.player.y };
  const tryX = clampPoint({ x: nextX, y: current.y }, radius);
  if (!collides(state, tryX.x, tryX.y, radius)) current.x = tryX.x;

  const tryY = clampPoint({ x: current.x, y: nextY }, radius);
  if (!collides(state, tryY.x, tryY.y, radius)) current.y = tryY.y;

  state.player.x = current.x;
  state.player.y = current.y;
}

function clampPoint(point, radius) {
  return {
    x: Math.max(WORLD_BOUNDS.minX + radius, Math.min(WORLD_BOUNDS.maxX - radius, point.x)),
    y: Math.max(WORLD_BOUNDS.minY + radius, Math.min(WORLD_BOUNDS.maxY - radius, point.y)),
  };
}

function collides(state, x, y, radius) {
  const obstacles = state.worldObstacles || WORLD_OBSTACLES;
  return obstacles.some((obstacle) => {
    if (obstacle.type === "circle") {
      return Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.r;
    }
    const closestX = Math.max(obstacle.x - obstacle.halfW, Math.min(x, obstacle.x + obstacle.halfW));
    const closestY = Math.max(obstacle.y - obstacle.halfH, Math.min(y, obstacle.y + obstacle.halfH));
    return Math.hypot(x - closestX, y - closestY) < radius;
  });
}
