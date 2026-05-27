export function buildConfig(answers) {
  let count = 4;
  if (answers.energy === "tired" || answers.duration === "3") count = 3;
  if (answers.energy === "good" && answers.duration === "10") count = 5;

  const moveMode = answers.moveMode === "auto" ? (answers.energy === "good" ? "bike" : "walk") : answers.moveMode;
  const routeName = count <= 3 ? "轻松路线" : count === 4 ? "标准路线" : "活力路线";
  const assistRadius = answers.hands === "hard" ? 140 : answers.hands === "ok" ? 115 : 95;
  const speedBase = moveMode === "bike" ? 142 : 86;
  const speed = answers.energy === "tired" ? speedBase * 0.78 : speedBase;
  const memoryCount = count <= 3 || answers.hands === "hard" ? 1 : 2;

  return { count, moveMode, routeName, assistRadius, speed, memoryCount };
}

export function pickRoute(neighbors, config) {
  return [...neighbors]
    .sort((a, b) => Math.hypot(a.x + 350, a.y - 18) - Math.hypot(b.x + 350, b.y - 18))
    .slice(0, config.count);
}
