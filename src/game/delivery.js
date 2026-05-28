import { WORLD_BOUNDS, WORLD_OBSTACLES, PLAYER_RADIUS, WORLD_SCALE } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";
import { nt, t } from "../i18n.js";

// 要和 ThreeRenderer.updateTarget() 里的黄框视觉半径保持一致：
// 黄框半径约 8.3 个场景单位；隐形可投递范围 = 黄框半径的 5 倍。
// 2026-05-28 调整：可见光圈直径扩大 1 倍，隐形投递圈同比扩大。
const VISIBLE_TARGET_RING_RADIUS_SCENE = 8.3;
const INVISIBLE_DELIVERY_RADIUS_MULTIPLIER = 5;

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
  state.houseReaction = { id: deliveredId, time: 1.6 };
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

  let throttle = 0;
  if (state.touchThrottle) throttle += state.touchThrottle > 0 ? state.touchThrottle : state.touchThrottle * reverseFactor;
  if (state.keys.has("arrowup") || state.keys.has("w")) throttle = Math.max(throttle, 1);
  if (state.keys.has("arrowdown") || state.keys.has("s")) throttle = Math.min(throttle, -reverseFactor);

  let turn = state.touchSteer || 0;
  // 第三人称“生化危机式”控制：左键向画面左侧转，右键向画面右侧转。
  if (state.keys.has("arrowleft") || state.keys.has("a")) turn -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) turn += 1;
  turn = Math.max(-1, Math.min(1, turn));
  if (mode === "bike") {
    // 自行车不应像原地旋转的角色；只有按住前进 / 后退移动时才逐渐改变朝向。
    const movementGrip = Math.min(1, Math.abs(throttle));
    turn *= movementGrip;
  }
  if (turn) state.player.headingAngle += turn * turnRate * dt;

  state.player.headingX = Math.cos(state.player.headingAngle);
  state.player.headingY = Math.sin(state.player.headingAngle);
  state.player.facing = state.player.headingX >= 0 ? 1 : -1;

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
