const MODE_PROFILES = {
  walk: { energy: "normal", hands: "ok", duration: "5", moveMode: "walk", count: 4 },
  bike: { energy: "good", hands: "ok", duration: "8", moveMode: "bike", count: 6 },
};

const START_POINTS = [
  { x: -4320, y: -3240, angle: 0 },
  { x: -2880, y: -2160, angle: 0 },
  { x: 0, y: -3240, angle: 0 },
  { x: 2880, y: -2160, angle: Math.PI },
  { x: 4320, y: 0, angle: Math.PI },
  { x: -4320, y: 0, angle: 0 },
  { x: -2880, y: 2160, angle: 0 },
  { x: 0, y: 3240, angle: Math.PI },
  { x: 2880, y: 2160, angle: Math.PI },
  { x: 4320, y: 3240, angle: Math.PI },
];

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
  const point = START_POINTS[randInt(0, START_POINTS.length - 1)];
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

export function pickRoute(neighbors, config, start = { x: -4320, y: -3240 }) {
  const count = Math.min(config.count, neighbors.length);
  const minFirstDistance = config.moveMode === "bike" ? 1700 : 1050;
  const shuffled = shuffle(neighbors);
  const farEnough = shuffled.filter((n) => Math.hypot((n.deliveryX ?? n.x) - start.x, (n.deliveryY ?? n.y) - start.y) >= minFirstDistance);
  const first = (farEnough.length ? farEnough : shuffled)[randInt(0, Math.max(0, (farEnough.length ? farEnough : shuffled).length - 1))];
  const rest = shuffle(shuffled.filter((n) => n.id !== first.id));
  return [first, ...rest].slice(0, count);
}
