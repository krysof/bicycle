const MODE_PROFILES = {
  walk: { energy: "normal", hands: "ok", duration: "5", moveMode: "walk", count: 4 },
  bike: { energy: "good", hands: "ok", duration: "8", moveMode: "bike", count: 6 },
};

export function answersFromMode(mode = "walk") {
  return { ...(MODE_PROFILES[mode] || MODE_PROFILES.walk) };
}

export function answersFromProfile(profile = "normal") {
  if (profile === "active") return answersFromMode("bike");
  return answersFromMode("walk");
}

export function buildConfig(answers) {
  const moveMode = answers.moveMode || "walk";
  const count = answers.count || (moveMode === "bike" ? 6 : 4);
  const routeName = moveMode === "bike" ? "单车远行路线" : "步行安心路线";
  const assistRadius = moveMode === "bike" ? 210 : 180;
  const speed = moveMode === "bike" ? 390 : 145;
  const memoryCount = 0;
  return { count, moveMode, routeName, assistRadius, speed, memoryCount };
}

export function pickRoute(neighbors, config) {
  const start = { x: -4300, y: -2850 };
  const sorted = [...neighbors].sort((a, b) => Math.hypot(a.x - start.x, a.y - start.y) - Math.hypot(b.x - start.x, b.y - start.y));
  return sorted.slice(0, config.count);
}
