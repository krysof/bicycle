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

  state.message = "阿铃：再靠近一点点就可以了。我会在目标旁边画一个发光圈。";
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
    state.player.facing = nx >= 0 ? 1 : -1;
    state.player.x = Math.max(-455, Math.min(455, state.player.x));
    state.player.y = Math.max(-300, Math.min(320, state.player.y));
  }
}
