import { currentTarget } from "../state/gameState.js";

const BOUNDS = { minX: -5200, maxX: 5200, minY: -3900, maxY: 3900 };

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

  let dx = 0;
  let dy = 0;
  if (state.keys.has("arrowup") || state.keys.has("w")) dy -= 1;
  if (state.keys.has("arrowdown") || state.keys.has("s")) dy += 1;
  if (state.keys.has("arrowleft") || state.keys.has("a")) dx -= 1;
  if (state.keys.has("arrowright") || state.keys.has("d")) dx += 1;

  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    const nx = dx / len;
    const ny = dy / len;
    state.player.x += nx * state.config.speed * dt;
    state.player.y += ny * state.config.speed * dt;
    state.player.headingX = nx;
    state.player.headingY = ny;
    state.player.headingAngle = Math.atan2(ny, nx);
    state.player.facing = nx >= 0 ? 1 : -1;
    state.player.x = Math.max(BOUNDS.minX, Math.min(BOUNDS.maxX, state.player.x));
    state.player.y = Math.max(BOUNDS.minY, Math.min(BOUNDS.maxY, state.player.y));
  }
}
