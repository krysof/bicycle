import { writeFileSync } from "node:fs";

const bbox = {
  // 北江口バス停を中心に、神崎川・井高野・南別府町まで入る範囲。
  south: 34.7543,
  west: 135.5338,
  north: 34.7683,
  east: 135.5548,
};

const center = {
  lat: (bbox.south + bbox.north) / 2,
  lon: (bbox.west + bbox.east) / 2,
};

const MAP_W = 744;
const MAP_D = 563;
const METERS_PER_DEG_LAT = 111_320;
const METERS_PER_DEG_LON = 111_320 * Math.cos(center.lat * Math.PI / 180);
const widthM = (bbox.east - bbox.west) * METERS_PER_DEG_LON;
const depthM = (bbox.north - bbox.south) * METERS_PER_DEG_LAT;
const sceneScale = Math.min((MAP_W - 34) / widthM, (MAP_D - 34) / depthM);

const highwayAllow = /^(primary|secondary|tertiary|unclassified|residential|living_street)$/;
const highwayBlock = /^(footway|path|steps|cycleway|pedestrian|track|corridor|elevator|platform)$/;
const mainHighways = new Set(["primary", "secondary", "tertiary", "unclassified"]);

function toScene(lon, lat) {
  return {
    x: Number(((lon - center.lon) * METERS_PER_DEG_LON * sceneScale).toFixed(2)),
    z: Number((-(lat - center.lat) * METERS_PER_DEG_LAT * sceneScale).toFixed(2)),
  };
}

function round(n, d = 2) {
  return Number(n.toFixed(d));
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function wayPoints(way, nodes) {
  return (way.nodes || []).map((id) => nodes.get(id)).filter(Boolean).map((n) => toScene(n.lon, n.lat));
}

function centroid(points) {
  if (!points.length) return { x: 0, z: 0 };
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    z: points.reduce((sum, p) => sum + p.z, 0) / points.length,
  };
}

function bounds(points) {
  const xs = points.map((p) => p.x);
  const zs = points.map((p) => p.z);
  return {
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minZ: Math.min(...zs), maxZ: Math.max(...zs),
  };
}

function longestEdgeAngle(points) {
  let best = 0;
  let bestLen = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len > bestLen) {
      bestLen = len;
      best = Math.atan2(b.x - a.x, b.z - a.z);
    }
  }
  return round(best, 4);
}

function buildingVariant(tags = {}) {
  const shop = tags.shop;
  const amenity = tags.amenity;
  const leisure = tags.leisure;
  const building = tags.building;
  if (shop === "convenience") return "convenience";
  if (shop === "supermarket" || shop === "mall") return "supermarket";
  if (shop === "bakery") return "bakery";
  if (shop === "florist") return "flower";
  if (shop === "hairdresser") return "barber";
  if (shop === "books") return "bookstore";
  if (shop === "seafood" || shop === "fishmonger") return "fish-shop";
  if (amenity === "hospital") return "hospital";
  if (amenity === "clinic" || amenity === "doctors" || amenity === "dentist") return "clinic";
  if (amenity === "pharmacy") return "pharmacy";
  if (amenity === "post_office") return "post-office";
  if (amenity === "police") return "police";
  if (amenity === "bank" || amenity === "atm") return "bank";
  if (amenity === "school" || amenity === "kindergarten" || amenity === "college") return "school";
  if (amenity === "library") return "library";
  if (amenity === "cafe") return "cafe";
  if (amenity === "restaurant" || amenity === "fast_food") return "restaurant";
  if (amenity === "public_bath") return "bathhouse";
  if (leisure === "park" || leisure === "sports_centre" || leisure === "pitch") return "community";
  if (building === "apartments" || building === "residential" && tags["building:levels"] >= 3) return "apartment";
  if (building === "commercial" || building === "office" || building === "retail") return "office";
  if (building === "school") return "school";
  if (building === "hospital") return "hospital";
  return tags.start_date && String(tags.start_date).startsWith("19") ? "old-wood" : "house-brown";
}

function roofWallForVariant(variant, i) {
  const roofs = [0x5b4638, 0x6f5338, 0x4f5f6f, 0x7a5542, 0x8a6f48, 0x5c6f59, 0x7b5a3d, 0x4d6684];
  const walls = [0xe9dcc8, 0xf2e5cf, 0xd8c3a5, 0xeee7d8, 0xe4d5bd, 0xf1eadc, 0xddcfba, 0xe8dfcf];
  const special = {
    convenience: [0x3d79a8, 0xfffbef],
    supermarket: [0xc9823d, 0xf4e4c8],
    hospital: [0xf8f8ff, 0xe6f4ff],
    clinic: [0xf8f8ff, 0xe6f4ff],
    pharmacy: [0x3dbb70, 0xf0fff2],
    "post-office": [0xb84a42, 0xfff0e8],
    police: [0x4f91d5, 0xffffff],
    school: [0xc78d4d, 0xfff0d4],
    apartment: [0x7890a8, 0xe8edf2],
    office: [0x6d8193, 0xe9eef2],
  };
  const [roof, wall] = special[variant] || [roofs[i % roofs.length], walls[(i * 3) % walls.length]];
  return { roof, wall };
}

function distanceToAnyRoad(point, roads) {
  let best = Infinity;
  let snap = null;
  for (const seg of roads) {
    const vx = seg.x2 - seg.x1;
    const vz = seg.z2 - seg.z1;
    const len2 = vx * vx + vz * vz;
    const t = len2 ? clamp(((point.x - seg.x1) * vx + (point.z - seg.z1) * vz) / len2, 0, 1) : 0;
    const x = seg.x1 + vx * t;
    const z = seg.z1 + vz * t;
    const d = Math.hypot(point.x - x, point.z - z);
    if (d < best) {
      best = d;
      snap = { x, z, seg, d };
    }
  }
  return snap;
}

function makeDeliverySlots(buildings, roads) {
  const candidates = buildings
    .filter((b) => !b.fixedService && b.frontage >= 4.0 && b.depth >= 4.2)
    .map((b) => {
      const snap = distanceToAnyRoad({ x: b.x, z: b.z }, roads);
      return { b, snap };
    })
    .filter(({ snap }) => snap && snap.d > 6 && snap.d < 22)
    .sort((a, b) => a.b.x - b.b.x || a.b.z - b.b.z);
  const picked = [];
  for (let pass = 0; pass < 4 && picked.length < 32; pass += 1) {
    const offset = pass * 7;
    for (let i = offset; i < candidates.length && picked.length < 32; i += 11) {
      const { b, snap } = candidates[i];
      if (picked.some((p) => Math.hypot(p[0] - b.x, p[1] - b.z) < 24)) continue;
      picked.push([
        round(b.x, 1),
        round(b.z, 1),
        round(snap.x, 1),
        round(snap.z, 1),
        round(Math.atan2(snap.x - b.x, snap.z - b.z), 4),
      ]);
    }
  }
  return picked.slice(0, 32);
}

const query = `[out:json][timeout:90];
(
  way["highway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["railway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["waterway"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["natural"="water"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["building"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["amenity"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["shop"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
  way["leisure"](${bbox.south},${bbox.west},${bbox.north},${bbox.east});
);
out body;
>;
out skel qt;`;

const endpoints = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.openstreetmap.ru/api/interpreter",
];
let response = null;
let lastError = null;
for (const endpoint of endpoints) {
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "newspaper-companion-game/0.1 https://github.com/krysof/bicycle",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (response.ok) break;
    lastError = new Error(`Overpass ${endpoint} ${response.status} ${response.statusText}`);
  } catch (error) {
    lastError = error;
  }
}
if (!response?.ok) throw lastError || new Error("Overpass request failed");
const osm = await response.json();
const nodes = new Map(osm.elements.filter((e) => e.type === "node").map((n) => [n.id, n]));
const ways = osm.elements.filter((e) => e.type === "way");

const roads = [];
for (const way of ways) {
  const highway = way.tags?.highway;
  if (!highway || highwayBlock.test(highway) || !highwayAllow.test(highway)) continue;
  const pts = wayPoints(way, nodes);
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 3.0) continue;
    roads.push({
      id: `r${way.id}_${i}`,
      x1: a.x, z1: a.z, x2: b.x, z2: b.z,
      main: mainHighways.has(highway),
      highway,
      name: way.tags?.name || "",
    });
  }
}

const railways = [];
const waterways = [];
for (const way of ways) {
  if (!way.tags?.railway && !way.tags?.waterway && way.tags?.natural !== "water") continue;
  const pts = wayPoints(way, nodes);
  const target = way.tags?.railway ? railways : waterways;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const a = pts[i];
    const b = pts[i + 1];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 4.0) continue;
    target.push({ id: `${way.tags?.railway ? "rail" : "water"}${way.id}_${i}`, x1: a.x, z1: a.z, x2: b.x, z2: b.z, kind: way.tags?.railway || way.tags?.waterway || "water" });
  }
}

const rawBuildings = [];
for (const way of ways) {
  if (!way.tags?.building && !way.tags?.shop && !way.tags?.amenity) continue;
  const pts = wayPoints(way, nodes);
  if (pts.length < 3) continue;
  const c = centroid(pts);
  if (Math.abs(c.x) > MAP_W / 2 - 12 || Math.abs(c.z) > MAP_D / 2 - 12) continue;
  const box = bounds(pts);
  const sw = box.maxX - box.minX;
  const sd = box.maxZ - box.minZ;
  if (sw < 1 || sd < 1) continue;
  const variant = buildingVariant(way.tags);
  const important = Boolean(way.tags?.shop || way.tags?.amenity || ["school", "hospital", "apartments", "commercial", "retail"].includes(way.tags?.building));
  rawBuildings.push({
    osmId: way.id,
    x: c.x, z: c.z,
    angle: longestEdgeAngle(pts),
    frontage: clamp(sw * 1.16, important ? 6.0 : 3.8, important ? 15.5 : 8.8),
    depth: clamp(sd * 1.16, important ? 5.5 : 4.8, important ? 15.5 : 11.5),
    area: sw * sd,
    variant,
    important,
    tags: way.tags,
  });
}

const services = rawBuildings
  .filter((b) => b.important)
  .sort((a, b) => b.area - a.area)
  .slice(0, 80);
const homes = rawBuildings
  .filter((b) => !b.important)
  .sort((a, b) => b.area - a.area)
  .slice(0, 470);
const buildings = services.concat(homes).map((b, i) => {
  const colors = roofWallForVariant(b.variant, i);
  return {
    id: `osm-${b.osmId}`,
    x: round(b.x, 1),
    z: round(b.z, 1),
    angle: b.angle,
    variant: b.variant,
    scale: round(clamp(Math.sqrt(b.area) / 5.2, 0.78, b.important ? 1.55 : 1.12), 2),
    roof: colors.roof,
    wall: colors.wall,
    frontage: round(b.frontage, 1),
    depth: round(b.depth, 1),
    fixedService: b.important,
    name: b.tags.name || b.tags["name:ja"] || "",
  };
});

const deliverySlots = makeDeliverySlots(buildings, roads);

const intersections = [];
for (let i = 0; i < roads.length; i += 1) {
  for (let j = i + 1; j < roads.length; j += 17) {
    const a = roads[i];
    const b = roads[j];
    for (const p of [[a.x1, a.z1], [a.x2, a.z2]]) {
      if (Math.hypot(p[0] - b.x1, p[1] - b.z1) < 0.9 || Math.hypot(p[0] - b.x2, p[1] - b.z2) < 0.9) {
        if (!intersections.some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < 8)) intersections.push([round(p[0], 1), round(p[1], 1)]);
      }
    }
    if (intersections.length > 45) break;
  }
  if (intersections.length > 45) break;
}

const out = `// Auto-generated by tools/generate-kitaeguchi-osm.mjs
// Source: OpenStreetMap / Overpass API, © OpenStreetMap contributors (ODbL 1.0)
// Area bbox: ${JSON.stringify(bbox)}
export const OSM_ATTRIBUTION = "© OpenStreetMap contributors";
export const OSM_BBOX = ${JSON.stringify(bbox)};
export const OSM_CENTER = ${JSON.stringify(center)};
export const ROAD_SEGMENTS_OSM = ${JSON.stringify(roads, null, 2)};
export const RAIL_SEGMENTS_OSM = ${JSON.stringify(railways, null, 2)};
export const WATER_SEGMENTS_OSM = ${JSON.stringify(waterways, null, 2)};
export const BUILDING_LOTS_OSM = ${JSON.stringify(buildings, null, 2)};
export const DELIVERY_SLOTS = ${JSON.stringify(deliverySlots, null, 2)};
export const ROAD_INTERSECTIONS_OSM = ${JSON.stringify(intersections, null, 2)};
`;

writeFileSync("src/data/kitaeguchiMap.js", out, "utf8");
console.log(`Generated ${roads.length} road segments, ${buildings.length} buildings, ${railways.length} rail, ${waterways.length} water, ${deliverySlots.length} delivery slots.`);
