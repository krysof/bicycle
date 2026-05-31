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

function snapRoad(v) {
  return Math.round(v * 2) / 2;
}

function addOrthogonalSegment(out, base, x1, z1, x2, z2, suffix) {
  const ax = snapRoad(x1);
  const az = snapRoad(z1);
  const bx = snapRoad(x2);
  const bz = snapRoad(z2);
  if (Math.hypot(bx - ax, bz - az) < 9) return;
  out.push({
    ...base,
    id: `${base.id}-${suffix}`,
    x1: ax,
    z1: az,
    x2: bx,
    z2: bz,
    dir: "line",
  });
}

function addManhattanRoad(out, base, a, b, index, highway) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const len = Math.hypot(dx, dz);
  if (len < 12) return;
  const adx = Math.abs(dx);
  const adz = Math.abs(dz);

  // 风格化成 90 度道路：横向就横、纵向就纵，明显斜线则拆成一个 L 形转角。
  // 这样保留北江口道路的大致位置关系，但视觉上像干净的住宅区街道。
  if (adz < 5 || adx >= adz * 2.4) {
    addOrthogonalSegment(out, base, a.x, a.z, b.x, a.z, `${index}h`);
    return;
  }
  if (adx < 5 || adz >= adx * 2.4) {
    addOrthogonalSegment(out, base, a.x, a.z, a.x, b.z, `${index}v`);
    return;
  }

  const horizontalFirst = highway === "primary" || index % 2 === 0;
  if (horizontalFirst) {
    addOrthogonalSegment(out, base, a.x, a.z, b.x, a.z, `${index}h`);
    addOrthogonalSegment(out, base, b.x, a.z, b.x, b.z, `${index}v`);
  } else {
    addOrthogonalSegment(out, base, a.x, a.z, a.x, b.z, `${index}v`);
    addOrthogonalSegment(out, base, a.x, b.z, b.x, b.z, `${index}h`);
  }
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
      addManhattanRoad(cleaned, {
        id: `${groupId}-clean-${i}`,
        main,
        highway,
        name: segments[0]?.name || "",
      }, a, b, i, highway);
    }
  });
  return cleaned;
}

function makeCleanIntersections(segments) {
  const seen = new Set();
  const points = [];
  segments.forEach((seg) => {
    [[seg.x1, seg.z1], [seg.x2, seg.z2]].forEach(([x, z]) => {
      const key = `${Math.round(x * 2) / 2},${Math.round(z * 2) / 2}`;
      if (seen.has(key)) return;
      seen.add(key);
      points.push([Math.round(x * 2) / 2, Math.round(z * 2) / 2]);
    });
  });
  return points;
}

function makeSegment(id, x1, z1, x2, z2, highway = "residential", main = false) {
  return { id, x1, z1, x2, z2, highway, main, name: "", dir: "line" };
}

function makeCuratedKitaeguchiRoads() {
  // 手工整理的“北江口参考”街区骨架：横平竖直、间距清楚、没有断头小黑块。
  // 不再把 OSM 折线逐条转换；OSM 只作为区域/建筑/水路参考，游戏道路使用干净街区版。
  const roads = [];
  [
    ["h-main-north", -244, -348, 326, "tertiary", true],
    ["h-school", -212, -338, 318, "residential", false],
    ["h-west-south", -178, -326, 228, "residential", false],
    ["h-market", -142, -286, 312, "tertiary", true],
    ["h-center-a", -104, -326, 306, "residential", false],
    ["h-center-b", -50, -334, 324, "residential", false],
    ["h-community", 18, -312, 316, "tertiary", true],
    ["h-east-park", 96, -304, 326, "residential", false],
    ["h-south-a", 204, -318, 316, "residential", false],
    ["h-south-b", 232, -302, 286, "residential", false],
    // 河边道路放在水面外侧；之前 z=256 落在可见水面内，导航箭头会看起来穿过河。
    ["h-river-side", 198, -252, 242, "residential", false],
  ].forEach(([id, z, x1, x2, highway, main]) => roads.push(makeSegment(id, x1, z, x2, z, highway, main)));

  [
    ["v-west-edge", -316, -252, 26, "residential", false],
    ["v-west-town", -252, -246, 238, "tertiary", true],
    ["v-west-mid", -210, -228, 210, "residential", false],
    ["v-old-street", -172, -214, 210, "residential", false],
    ["v-shop-street", -96, -246, 254, "tertiary", true],
    ["v-center-west", -22, -218, 210, "residential", false],
    ["v-center", 56, -244, 210, "residential", false],
    ["v-east-center", 112, -160, 216, "tertiary", true],
    ["v-east-home", 160, -208, 210, "residential", false],
    ["v-east-school", 180, -244, -92, "residential", false],
    ["v-river-approach", 224, -198, 210, "residential", false],
    ["v-east-main", 252, -246, 236, "tertiary", true],
    ["v-far-east", 312, -244, 64, "residential", false],
  ].forEach(([id, x, z1, z2, highway, main]) => roads.push(makeSegment(id, x, z1, x, z2, highway, main)));

  return roads;
}

export const RAW_ROAD_SEGMENTS = ROAD_SEGMENTS_OSM.map((seg) => ({ ...seg, dir: "line" }));
// 北江口周边真实路网的“干净游戏版”：手工整理成 90 度道路骨架，避免奇怪的大块路口。
export const ROAD_SEGMENTS = makeCuratedKitaeguchiRoads();
export const RAIL_SEGMENTS = RAIL_SEGMENTS_OSM;
export const WATER_SEGMENTS = WATER_SEGMENTS_OSM;
export const ROAD_INTERSECTIONS = makeCleanIntersections(ROAD_SEGMENTS);

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
  return {
    ...lot,
    // 当前道路已经整理成 90 度街区，建筑也必须吸附 90 度，不能再斜摆。
    id: `${lot.id}-${index}`,
    angle: Math.round((lot.angle || 0) / (Math.PI / 2)) * (Math.PI / 2),
    scale: lot.scale * (0.96 + rand() * 0.08),
  };
}

function generateInfillLots(rand, existingLots) {
  const variants = ["old-wood", "house-brown", "house-red", "modern-home", "house-blue", "flower", "bookstore", "bakery"];
  const roofs = [0x5b4638, 0x6f5338, 0x4f5f6f, 0x7a5542, 0x8a6f48, 0x5c6f59];
  const walls = [0xe9dcc8, 0xf2e5cf, 0xd8c3a5, 0xeee7d8, 0xe4d5bd, 0xf1eadc];
  const lots = [];
  const occupied = (x, z, margin = 5.8) => existingLots.concat(lots).some((lot) => Math.abs(lot.x - x) < ((lot.frontage || 6) + margin) * 0.50 && Math.abs(lot.z - z) < ((lot.depth || 6) + margin) * 0.50);
  ROAD_SEGMENTS.forEach((seg, si) => {
    const dx = seg.x2 - seg.x1;
    const dz = seg.z2 - seg.z1;
    const len = Math.hypot(dx, dz);
    if (len < 70) return;
    const horizontal = Math.abs(dx) >= Math.abs(dz);
    const nx = horizontal ? 0 : 1;
    const nz = horizontal ? 1 : 0;
    const step = 28;
    const start = 18 + ((si % 3) * 4);
    for (let d = start; d < len - 18; d += step) {
      [-1, 1].forEach((side) => {
        if (rand() < 0.18) return;
        const t = d / len;
        const x = seg.x1 + dx * t + nx * side * (15.8 + rand() * 4.8);
        const z = seg.z1 + dz * t + nz * side * (15.8 + rand() * 4.8);
        if (Math.abs(x) > MAP_W / 2 - 28 || Math.abs(z) > MAP_D / 2 - 34) return;
        if (Math.abs(z - 238) < 58) return; // 淀川河道和河堤区域留空
        if (isReservedSceneSpot(x, z, 11, 9) || nearAnyRoad(x, z, 6.3) || occupied(x, z)) return;
        const i = lots.length + si;
        lots.push({
          id: `infill-${si}-${Math.round(d)}-${side}`,
          x,
          z,
          angle: horizontal ? 0 : Math.PI / 2,
          variant: variants[i % variants.length],
          scale: 1.12 + rand() * 0.18,
          roof: roofs[i % roofs.length],
          wall: walls[i % walls.length],
          frontage: 8.0 + rand() * 2.6,
          depth: 7.0 + rand() * 2.2,
          fixedService: false,
        });
      });
      if (lots.length >= 300) return;
    }
  });
  // 道路之间仍然可能留下较大的空地；再补一批“街区内侧建筑”，但仍然避开道路、河堤和目标住户。
  let attempts = 0;
  while (lots.length < 330 && attempts < 1800) {
    attempts += 1;
    const x = -MAP_W / 2 + 34 + rand() * (MAP_W - 68);
    const z = -MAP_D / 2 + 36 + rand() * (MAP_D - 78);
    if (Math.abs(z - 238) < 60) continue;
    const roadDistance = ROAD_SEGMENTS.reduce((best, seg) => Math.min(best, distancePointToSegment({ x, z }, seg)), Infinity);
    if (roadDistance < 10.5 || roadDistance > 32.0) continue;
    if (isReservedSceneSpot(x, z, 12, 10) || occupied(x, z, 4.8)) continue;
    const nearSeg = ROAD_SEGMENTS.reduce((best, seg) => {
      const d = distancePointToSegment({ x, z }, seg);
      return d < best.d ? { seg, d } : best;
    }, { seg: ROAD_SEGMENTS[0], d: Infinity }).seg;
    const horizontal = Math.abs(nearSeg.x2 - nearSeg.x1) >= Math.abs(nearSeg.z2 - nearSeg.z1);
    const i = lots.length + attempts;
    lots.push({
      id: `block-fill-${attempts}`,
      x,
      z,
      angle: horizontal ? 0 : Math.PI / 2,
      variant: variants[i % variants.length],
      scale: 1.04 + rand() * 0.22,
      roof: roofs[i % roofs.length],
      wall: walls[i % walls.length],
      frontage: 7.4 + rand() * 2.8,
      depth: 6.8 + rand() * 2.4,
      fixedService: false,
    });
  }
  return lots.slice(0, 330);
}

function generateLots(rand) {
  const reserved = BUILDING_LOTS_OSM.filter((lot) => {
    if (isReservedSceneSpot(lot.x, lot.z, 9.0, 8.0)) return false;
    // 主河道和河堤必须清出来，否则水面会被普通住宅盖住，玩家看不到“淀川”。
    if (!lot.fixedService && Math.abs(lot.z - 238) < 58) return false;
    // OSM 建筑轮廓偶尔会贴到道路中心线；这种建筑会造成“房子压路”。
    // 真实街道优先，过近的普通建筑不生成；重要设施保留但碰撞会缩小。
    if (!lot.fixedService && nearAnyRoad(lot.x, lot.z, 6.8)) return false;
    return true;
  });
  // 维持建筑数量，但让普通建筑细节按 LOD 显示；固定设施全部保留。
  const service = reserved.filter((lot) => lot.fixedService);
  const homes = reserved.filter((lot) => !lot.fixedService);
  const rotated = homes.map((lot, i) => ({ lot, score: ((i * 37) % 101) + (rand() * 0.2) })).sort((a, b) => a.score - b.score).map((x) => x.lot);
  const base = service.concat(rotated).slice(0, 520);
  const infill = generateInfillLots(rand, base);
  return base.concat(infill).slice(0, 860).map((lot, i) => varyLot(rand, lot, i));
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

  // 可见的淀川水面本身也阻挡玩家；桥的位置留出通道，避免再出现“看不见的空气墙”。
  const riverZ = 238;
  const waterW = 46;
  const bridgeCenters = [-252, -96, 112, 252];
  const gaps = bridgeCenters.map((x) => [x - 8.8, x + 8.8]);
  let cursor = -MAP_W / 2;
  gaps.concat([[MAP_W / 2, MAP_W / 2]]).forEach(([gapMin, gapMax], i) => {
    const segMin = cursor;
    const segMax = Math.min(gapMin, MAP_W / 2);
    if (segMax - segMin > 4) {
      const center = (segMin + segMax) / 2;
      const p = sceneToWorld(center, riverZ);
      obstacles.push(rect(`yodogawa-water-${i}`, p.x, p.y, (segMax - segMin) / WORLD_SCALE, waterW / WORLD_SCALE, "water"));
    }
    cursor = Math.max(cursor, gapMax);
  });

  return obstacles;
}

export const DEFAULT_WORLD_LAYOUT = createWorldLayout(1);
export const WORLD_OBSTACLES = createWorldObstacles(DEFAULT_WORLD_LAYOUT);
