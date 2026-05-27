import { WORLD_BOUNDS, WORLD_OBSTACLES, PLAYER_RADIUS } from "../data/world.js";
import { currentTarget } from "../state/gameState.js";

export function tryDeliver(state) {
  const target = currentTarget(state);
  if (!target) return { completed: true, delivered: false };

  const distance = Math.hypot(state.player.x - target.x, state.player.y - target.y);
  if (distance <= state.config.assistRadius) {
    state.delivered.push(target.id);
    state.message = `阿铃：送到了！${target.thanks}`;
    return { completed: !currentTarget(state), delivered: true };
  }

  state.message = "阿铃：再靠近一点点就可以了。前方发光的房子就是目标。";
  return { completed: false, delivered: false };
}

export function updatePlayer(state, dt) {
  if (!state.isPlaying || state.isPaused) return;

  const mode = state.config?.moveMode || "walk";
  const turnRate = mode === "bike" ? 1.65 : 2.15;
  const speed = state.config.speed;
  const reverseFactor = mode === "bike" ? 0.36 : 0.55;

  let turn = 0;
  if (state.keys.has("arrowleft") || state.keys.has("a")) turn += 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) turn -= 1;
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
  if (!collides(tryX.x, tryX.y, radius)) current.x = tryX.x;

  const tryY = clampPoint({ x: current.x, y: nextY }, radius);
  if (!collides(tryY.x, tryY.y, radius)) current.y = tryY.y;

  state.player.x = current.x;
  state.player.y = current.y;
}

function clampPoint(point, radius) {
  return {
    x: Math.max(WORLD_BOUNDS.minX + radius, Math.min(WORLD_BOUNDS.maxX - radius, point.x)),
    y: Math.max(WORLD_BOUNDS.minY + radius, Math.min(WORLD_BOUNDS.maxY - radius, point.y)),
  };
}

function collides(x, y, radius) {
  return WORLD_OBSTACLES.some((obstacle) => {
    if (obstacle.type === "circle") {
      return Math.hypot(x - obstacle.x, y - obstacle.y) < radius + obstacle.r;
    }
    const closestX = Math.max(obstacle.x - obstacle.halfW, Math.min(x, obstacle.x + obstacle.halfW));
    const closestY = Math.max(obstacle.y - obstacle.halfH, Math.min(y, obstacle.y + obstacle.halfH));
    return Math.hypot(x - closestX, y - closestY) < radius;
  });
}
