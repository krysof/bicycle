import { neighbors } from "./neighbors.js";
import { BUILDING_LOTS_OSM, ROAD_INTERSECTIONS_OSM, ROAD_SEGMENTS_OSM, RAIL_SEGMENTS_OSM, WATER_SEGMENTS_OSM } from "./kitaeguchiMap.js";

export const WORLD_SCALE = 1 / 45;
export const MAP_W = 744;
export const MAP_D = 563;
export const WORLD_BOUNDS = { minX: -MAP_W / (2 * WORLD_SCALE), maxX: MAP_W / (2 * WORLD_SCALE), minY: -MAP_D / (2 * WORLD_SCALE), maxY: MAP_D / (2 * WORLD_SCALE) };
export const PLAYER_RADIUS = { walk: 52, bike: 72 };

function roadGroupId(id = "") {
  return String(id).replace(/_\d+$/, "");
}

function roadSegmentLength(seg) {
  return Math.hypot(seg.x2 - seg.x1, seg.z2 - seg.z1);
}

function pointLineDistance(p, a, b) {
  const vx = b.x - a.x;
  const vz = b.z - a.z;
  const len2 = vx * vx + vz * vz;
  if (!len2) return Math.hypot(p.x - a.x, p.z - a.z);
  const t = clamp(((p.x - a.x) * vx + (p.z - a.z) * vz) / len2, 0, 1);
  return Math.hypot(p.x - (a.x + vx * t), p.z - (a.z + vz * t));
}

function simplifyRoadPoints(points, epsilon) {
  if (points.length <= 2) return points;
  let maxDistance = 0;
  let index = 0;
  const first = points[0];
  const last = points[points.length - 1];
  for (let i = 1; i < points.length - 1; i += 1) {
    const d = pointLineDistance(points[i], first, last);
    if (d > maxDistance) {
      maxDistance = d;
      index = i;
    }
  }
  if (maxDistance <= epsilon) return [first, last];
  const left = simplifyRoadPoints(points.slice(0, index + 1), epsilon);
  const right = simplifyRoadPoints(points.slice(index), epsilon);
  return left.slice(0, -1).concat(right);
}

function makeCleanRoadSegments(rawSegments) {
  const groups = new Map();
  rawSegments.forEach((seg) => {
    const id = roadGroupId(seg.id);
    if (!groups.has(id)) groups.set(id, []);
    groups.get(id).push(seg);
  });
  const cleaned = [];
  groups.forEach((segments, groupId) => {
    segments.sort((a, b) => {
      const ai = Number.parseInt(String(a.id).split("_").pop(), 10) || 0;
      const bi = Number.parseInt(String(b.id).split("_").pop(), 10) || 0;
      return ai - bi;
    });
    const highway = segments[0]?.highway || "residential";
    const main = Boolean(segments[0]?.main);
    const totalLength = segments.reduce((sum, seg) => sum + roadSegmentLength(seg), 0);
    // 原始 OSM 里有大量住宅细碎支路，直接渲染会像“乱线”。保留北江口路网的走势，
    // 但只显示足够长、对送报体验有意义的街道骨架。
    const keep = main
      ? totalLength >= 30
      : (highway === "residential" ? totalLength >= 72 : totalLength >= 52);
    if (!keep) return;
    const points = [{ x: segments[0].x1, z: segments[0].z1 }];
    segments.forEach((seg) => points.push({ x: seg.x2, z: seg.z2 }));
    const epsilon = highway === "primary" ? 2.8 : highway === "tertiary" ? 3.6 : 4.8;
    const simplified = simplifyRoadPoints(points, epsilon);
    for (let i = 1; i < simplified.length; i += 1) {
      const a = simplified[i - 1];
      const b = simplified[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      if (len < 12) continue;
      cleaned.push({
        id: `${groupId}-clean-${i}`,
        x1: a.x,
        z1: a.z,
        x2: b.x,
        z2: b.z,
        main,
        highway,
        name: segments[0]?.name || "",
        dir: "line",
      });
    }
  });
  return cleaned;
}

export const RAW_ROAD_SEGMENTS = ROAD_SEGMENTS_OSM.map((seg) => ({ ...seg, dir: "line" }));
// 北江口周边真实路网的“干净游戏版”：保留道路走向，合并细碎折线，去掉太短小路。
export const ROAD_SEGMENTS = makeCleanRoadSegments(ROAD_SEGMENTS_OSM);
export const RAIL_SEGMENTS = RAIL_SEGMENTS_OSM;
export const WATER_SEGMENTS = WATER_SEGMENTS_OSM;
export const ROAD_INTERSECTIONS = ROAD_INTERSECTIONS_OSM;

// 旧コード互換用。道路生成は ROAD_SEGMENTS を使うが、環境物や人流の初期値として使う。
export const ROAD_X = [...new Set(ROAD_INTERSECTIONS.map((p) => Math.round(p[0] / 12) * 12))].slice(0, 16);
export const ROAD_Z = [...new Set(ROAD_INTERSECTIONS.map((p) => Math.round(p[1] / 12) * 12))].slice(0, 14);

function rect(id, x, y, w, h, kind = "solid") {
  return { id, type: "rect", x, y, halfW: w / 2, halfH: h / 2, kind };
}

function circle(id, x, y, r, kind = "solid") {
  return { id, type: "circle", x, y, r, kind };
}

function sceneToWorld(x, z) {
  return { x: x / WORLD_SCALE, y: z / WORLD_SCALE };
}

function worldToSceneX(x) { return x * WORLD_SCALE; }
function worldToSceneZ(y) { return y * WORLD_SCALE; }

function mulberry32(seed) {
  let t = seed >>> 0;
  return function random() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function int(rand, min, max) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

function pick(rand, list) {
  return list[int(rand, 0, list.length - 1)];
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function distancePointToSegment(point, seg) {
  const x1 = seg.x1 ?? seg.x;
  const z1 = seg.z1 ?? seg.z;
  const x2 = seg.x2 ?? (seg.dir === "h" ? seg.x2 : seg.x);
  const z2 = seg.z2 ?? (seg.dir === "v" ? seg.z2 : seg.z);
  const vx = x2 - x1;
  const vz = z2 - z1;
  const len2 = vx * vx + vz * vz;
  const t = len2 ? clamp(((point.x - x1) * vx + (point.z - z1) * vz) / len2, 0, 1) : 0;
  const sx = x1 + vx * t;
  const sz = z1 + vz * t;
  return Math.hypot(point.x - sx, point.z - sz);
}

function nearAnyRoad(x, z, margin) {
  return ROAD_SEGMENTS.some((seg) => distancePointToSegment({ x, z }, seg) < margin);
}

function isReservedSceneSpot(x, z, marginX = 10.5, marginZ = 8.5) {
  const nearNeighbor = neighbors.some((n) => {
    const hx = worldToSceneX(n.x);
    const hz = worldToSceneZ(n.y);
    const dx = worldToSceneX(n.deliveryX ?? n.x);
    const dz = worldToSceneZ(n.deliveryY ?? n.y);
    return (Math.abs(x - hx) < marginX && Math.abs(z - hz) < marginZ) || Math.hypot(x - dx, z - dz) < 8.6;
  });
  if (nearNeighbor) return true;
  return false;
}

function varyLot(rand, lot, index) {
  const yawJitter = (rand() - 0.5) * 0.025;
  return {
    ...lot,
    // 建筑物位置来自真实 OSM；只随机颜色细节和轻微偏转，不改变街区格局。
    id: `${lot.id}-${index}`,
    angle: (lot.angle || 0) + yawJitter,
    scale: lot.scale * (0.96 + rand() * 0.08),
  };
}

function generateLots(rand) {
  const reserved = BUILDING_LOTS_OSM.filter((lot) => {
    if (isReservedSceneSpot(lot.x, lot.z, 9.0, 8.0)) return false;
    // OSM 建筑轮廓偶尔会贴到道路中心线；这种建筑会造成“房子压路”。
    // 真实街道优先，过近的普通建筑不生成；重要设施保留但碰撞会缩小。
    if (!lot.fixedService && nearAnyRoad(lot.x, lot.z, 6.8)) return false;
    return true;
  });
  // 维持建筑数量，但让普通建筑细节按 LOD 显示；固定设施全部保留。
  const service = reserved.filter((lot) => lot.fixedService);
  const homes = reserved.filter((lot) => !lot.fixedService);
  const rotated = homes.map((lot, i) => ({ lot, score: ((i * 37) % 101) + (rand() * 0.2) })).sort((a, b) => a.score - b.score).map((x) => x.lot);
  return service.concat(rotated).slice(0, 690).map((lot, i) => varyLot(rand, lot, i));
}

function generateTrees(rand, lots) {
  const trees = [];
  let attempts = 0;
  while (trees.length < 96 && attempts < 1200) {
    attempts += 1;
    const x = -MAP_W / 2 + 20 + rand() * (MAP_W - 40);
    const z = -MAP_D / 2 + 20 + rand() * (MAP_D - 40);
    if (nearAnyRoad(x, z, 7.4) || isReservedSceneSpot(x, z, 9, 8)) continue;
    if (lots.some((lot) => Math.abs(lot.x - x) < (lot.frontage || 6) * 0.72 && Math.abs(lot.z - z) < (lot.depth || 6) * 0.72)) continue;
    trees.push({ id: `tree-${trees.length}`, x, z, sakura: rand() < 0.24, scale: 0.62 + rand() * 0.42 });
  }
  return trees;
}

function generateLandmarks(rand) {
  const serviceLots = BUILDING_LOTS_OSM.filter((lot) => lot.fixedService);
  const convenience = serviceLots.find((lot) => lot.variant === "convenience") || serviceLots[0] || { x: -120, z: 40 };
  const school = serviceLots.find((lot) => lot.variant === "school") || { x: -60, z: -190 };
  const park = serviceLots.find((lot) => lot.variant === "community") || { x: -230, z: 180 };
  const bus = ROAD_INTERSECTIONS[0] || [0, 0];
  return {
    riverX: null,
    park: [park.x, park.z],
    shop: [convenience.x, convenience.z],
    bus,
    shrine: [262, -70],
    school: [school.x, school.z],
    fields: [[-305, -210], [305, 210]],
    sign: [convenience.x + 8, convenience.z + 4],
    poles: ROAD_SEGMENTS.filter((_, i) => i % 37 === 0).slice(0, 28).map((seg, i) => {
      const t = (i % 3) / 3 + 0.2;
      return {
        x: seg.x1 + (seg.x2 - seg.x1) * t + (rand() < 0.5 ? -4.8 : 4.8),
        z: seg.z1 + (seg.z2 - seg.z1) * t + (rand() < 0.5 ? -4.8 : 4.8),
      };
    }),
    hills: [],
    grassPatches: Array.from({ length: 18 }, (_, i) => ({
      x: -330 + (i % 6) * 128 + (rand() - 0.5) * 18,
      z: -230 + Math.floor(i / 6) * 175 + (rand() - 0.5) * 20,
      w: 10 + rand() * 10,
      d: 7 + rand() * 8,
      color: rand() < 0.5 ? 0xa9d88e : 0xd7e9ad,
      rot: (rand() - 0.5) * 0.25,
    })),
  };
}

export function createWorldLayout(seed = Date.now()) {
  const numericSeed = Number.isFinite(seed) ? seed : Date.now();
  const rand = mulberry32(numericSeed);
  const lots = generateLots(rand);
  return {
    seed: numericSeed,
    lots,
    trees: generateTrees(rand, lots),
    landmarks: generateLandmarks(rand),
    roads: ROAD_SEGMENTS,
    rails: RAIL_SEGMENTS,
    waters: WATER_SEGMENTS,
    atmosphere: {
      timeOfDay: pick(rand, ["morning", "morning", "dusk"]),
      weather: pick(rand, ["clear", "clear", "breeze", "afterRain"]),
    },
  };
}

export function createWorldObstacles(layout = createWorldLayout(1)) {
  const obstacles = [];

  neighbors.forEach((n) => obstacles.push(rect(`target-house-${n.id}`, n.x, n.y, 150, 135, "house")));

  layout.lots.forEach((lot) => {
    const p = sceneToWorld(lot.x, lot.z);
    const tooCloseToRoad = nearAnyRoad(lot.x, lot.z, 7.4);
    const shrink = tooCloseToRoad ? 0.30 : (lot.fixedService ? 0.50 : 0.40);
    const w = Math.max(58, (lot.frontage || 6.4) * 18.5 * shrink) * (lot.scale || 1);
    const h = Math.max(58, (lot.depth || 6.4) * 18.5 * shrink) * (lot.scale || 1);
    obstacles.push(rect(lot.id, p.x, p.y, w, h, "house"));
  });

  layout.trees.forEach((tree) => {
    const p = sceneToWorld(tree.x, tree.z);
    obstacles.push(circle(tree.id, p.x, p.y, 16 + tree.scale * 7, "tree"));
  });

  return obstacles;
}

export const DEFAULT_WORLD_LAYOUT = createWorldLayout(1);
export const WORLD_OBSTACLES = createWorldObstacles(DEFAULT_WORLD_LAYOUT);
