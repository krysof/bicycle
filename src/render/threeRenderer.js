import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { neighbors } from "../data/neighbors.js";
import { createWorldLayout } from "../data/world.js";
import { canDeliverNow } from "../game/delivery.js";
import { currentTarget } from "../state/gameState.js";
import { locale, nt, t } from "../i18n.js";

const WORLD_SCALE = 1 / 45;
const MAP_W = 235;
const MAP_D = 178;
const ROAD_X = [-96, -64, -32, 0, 32, 64, 96];
const ROAD_Z = [-72, -48, -24, 0, 24, 48, 72];
const NAV_ARROW_COUNT = 10;
const COLORS = {
  grass: 0xbfe6a6,
  grass2: 0xa9d88e,
  road: 0xd2c0a3,
  path: 0xc7ad84,
  water: 0x8ecae6,
  wood: 0x76543b,
  stone: 0xb8b3a5,
  white: 0xfffbef,
  asphalt: 0x2f3338,
  sidewalk: 0xbfc3c0,
  curb: 0xe8e3d6,
  lane: 0xf4efe0,
};

const BUILDING_VARIANTS = [
  "house-red", "house-blue", "house-green", "house-brown", "modern-home", "old-wood",
  "convenience", "supermarket", "hospital", "clinic", "pharmacy", "post-office",
  "apartment", "office", "bank", "police", "community", "school",
  "library", "cafe", "restaurant", "bakery", "barber", "flower",
  "bookstore", "fish-shop", "bathhouse", "parking"
];

const TARGET_VARIANTS = {
  tanaka: "house-red",
  suzuki: "flower",
  yamamoto: "modern-home",
  kobayashi: "hospital",
  sato: "old-wood",
  mori: "bookstore",
  ito: "fish-shop",
  watanabe: "apartment",
  nakamura: "bakery",
  kato: "community",
};


const SCENE_LABELS = {
  zhHans: {
    convenience: "便利店", supermarket: "超市", hospital: "医院", clinic: "诊所", pharmacy: "药局", postOffice: "邮局",
    apartment: "公寓", office: "大楼", bank: "银行", police: "交番", community: "町内会", school: "学校",
    library: "图书馆", cafe: "咖啡", restaurant: "食堂", bakery: "面包", barber: "理发", flower: "花店",
    bookstore: "书店", fishShop: "鱼店", bathhouse: "澡堂", parking: "P", park: "公园", shop: "商店",
    bus: "巴士", clinicShort: "医", neighborhood: "町内会", town: "町",
  },
  zhHant: {
    convenience: "便利店", supermarket: "超市", hospital: "醫院", clinic: "診所", pharmacy: "藥局", postOffice: "郵局",
    apartment: "公寓", office: "大樓", bank: "銀行", police: "交番", community: "町內會", school: "學校",
    library: "圖書館", cafe: "咖啡", restaurant: "食堂", bakery: "麵包", barber: "理髮", flower: "花店",
    bookstore: "書店", fishShop: "魚店", bathhouse: "澡堂", parking: "P", park: "公園", shop: "商店",
    bus: "巴士", clinicShort: "醫", neighborhood: "町內會", town: "町",
  },
  ja: {
    convenience: "コンビニ", supermarket: "スーパー", hospital: "病院", clinic: "診療所", pharmacy: "薬", postOffice: "郵便",
    apartment: "アパート", office: "ビル", bank: "銀行", police: "交番", community: "町内会", school: "学校",
    library: "図書館", cafe: "喫茶", restaurant: "食堂", bakery: "パン", barber: "理容", flower: "花屋",
    bookstore: "本屋", fishShop: "魚屋", bathhouse: "湯", parking: "P", park: "公園", shop: "商店",
    bus: "バス", clinicShort: "診", neighborhood: "町内会", town: "町",
  },
  en: {
    convenience: "Store", supermarket: "Market", hospital: "Hospital", clinic: "Clinic", pharmacy: "Pharmacy", postOffice: "Post",
    apartment: "Apt.", office: "Office", bank: "Bank", police: "Police", community: "Community", school: "School",
    library: "Library", cafe: "Cafe", restaurant: "Diner", bakery: "Bakery", barber: "Barber", flower: "Flowers",
    bookstore: "Books", fishShop: "Fish", bathhouse: "Bath", parking: "P", park: "Park", shop: "Shop",
    bus: "Bus", clinicShort: "+", neighborhood: "Community", town: "Town",
  },
};
function sceneLabel(key) { return SCENE_LABELS[locale]?.[key] ?? SCENE_LABELS.zhHans[key] ?? key; }


function wx(x) { return x * WORLD_SCALE; }
function wz(y) { return y * WORLD_SCALE; }
function mat(color, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function transparentMat(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function labelFontFamily() {
  if (locale === "ja") return "Hiragino Kaku Gothic ProN, Yu Gothic, Meiryo, sans-serif";
  if (locale === "zhHant") return "Microsoft JhengHei, Noto Sans CJK TC, PingFang TC, sans-serif";
  if (locale === "en") return "Atkinson Hyperlegible, Verdana, Segoe UI, sans-serif";
  return "Microsoft YaHei, Noto Sans CJK SC, SimHei, sans-serif";
}
function makeCanvasLabel(text, color = "#2f5f49") {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,251,236,.94)"; ctx.strokeStyle = "rgba(94,70,39,.18)"; ctx.lineWidth = 10;
  roundRect(ctx, 18, 34, 476, 92, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.font = `700 48px ${labelFontFamily()}`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 80);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3.8, 1.18, 1);
  return sprite;
}
function colorFromIndex(i, list) { return list[Math.abs(i) % list.length]; }
function makeSkyTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0, "#8fd4ff");
  grad.addColorStop(0.52, "#cfeeff");
  grad.addColorStop(1, "#fff0c9");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function makeCloudTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 180;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  ctx.shadowColor = "rgba(120,160,190,0.22)";
  ctx.shadowBlur = 18;
  [[126,104,72],[202,78,92],[292,100,82],[372,112,58]].forEach(([x,y,r]) => { ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill(); });
  ctx.fillRect(110, 102, 280, 52);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function makeSunTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 126);
  grad.addColorStop(0, "rgba(255,255,230,1)");
  grad.addColorStop(0.34, "rgba(255,216,122,.92)");
  grad.addColorStop(1, "rgba(255,216,122,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
function isReservedSceneSpot(x, z, marginX = 10.5, marginZ = 8.5) {
  return neighbors.some((n) => {
    const hx = wx(n.x);
    const hz = wz(n.y);
    const dx = wx(n.deliveryX ?? n.x);
    const dz = wz(n.deliveryY ?? n.y);
    return (Math.abs(x - hx) < marginX && Math.abs(z - hz) < marginZ) || Math.hypot(x - dx, z - dz) < 7.2;
  });
}

function nearestRoad(value, roads) {
  return roads.reduce((best, item) => Math.abs(item - value) < Math.abs(best - value) ? item : best, roads[0]);
}

function appendSegment(points, from, to) {
  const last = points[points.length - 1];
  if (!last || Math.hypot(last.x - from.x, last.z - from.z) > 0.08) points.push(from);
  if (Math.hypot(from.x - to.x, from.z - to.z) > 0.08) points.push(to);
}

function buildRoadPath(px, pz, tx, tz) {
  const startZ = nearestRoad(pz, ROAD_Z);
  const targetZ = nearestRoad(tz, ROAD_Z);
  const jointX = nearestRoad(tx, ROAD_X);
  const points = [];
  appendSegment(points, { x: px, z: startZ }, { x: jointX, z: startZ });
  appendSegment(points, { x: jointX, z: startZ }, { x: jointX, z: targetZ });
  appendSegment(points, { x: jointX, z: targetZ }, { x: tx, z: targetZ });
  appendSegment(points, { x: tx, z: targetZ }, { x: tx, z: tz });
  return points.filter((p, i, arr) => i === 0 || Math.hypot(p.x - arr[i - 1].x, p.z - arr[i - 1].z) > 0.08);
}

function samplePath(points, distance) {
  if (points.length < 2) return null;
  let remain = distance;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.001) continue;
    if (remain <= len) {
      const t = Math.max(0, Math.min(1, remain / len));
      return { x: a.x + dx * t, z: a.z + dz * t, angle: -Math.atan2(dz, dx), remainingSegment: len - remain };
    }
    remain -= len;
  }
  const a = points[points.length - 2];
  const b = points[points.length - 1];
  return { x: b.x, z: b.z, angle: -Math.atan2(b.z - a.z, b.x - a.x), remainingSegment: 0 };
}

function orthogonalAngleToward(fromX, fromZ, toX, toZ) {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  if (Math.abs(dx) >= Math.abs(dz)) return dx >= 0 ? 0 : Math.PI;
  return dz >= 0 ? -Math.PI / 2 : Math.PI / 2;
}

export class ThreeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = makeSkyTexture();
    this.scene.fog = new THREE.Fog(0xdff2ff, 68, 190);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);
    this.camera.position.set(-100, 38, -65);
    this.camera.lookAt(-95, 1, -60);

    this.clockObjects = [];
    this.clouds = [];
    this.birds = [];
    this.floatingBits = [];
    this.animals = [];
    this.insects = [];
    this.passers = [];
    this.lastAmbientInfo = null;
    this.houseMap = new Map();
    this.occluderMeshes = [];
    this.fadedOccluders = new Set();
    this.raycaster = new THREE.Raycaster();
    this.targetRing = null;
    this.targetBeam = null;
    this.navigationArrows = [];
    this.paperReadyIcon = null;
    this.newspaper = null;
    this.reactionSprite = null;
    this.player = null;
    this.walkParts = {};
    this.bike = null;
    this.bikeRoll = 0;
    this.walkCycle = 0;
    this.lastBikeAnimTime = 0;
    this.lastTargetScale = 1;
    this.lastTargetId = null;
    this.eraDetailCount = 0;
    this.worldLayout = createWorldLayout(1);

    this.createWorld();
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  render(state) {
    this.updatePlayer(state);
    this.updateTarget(state);
    this.updateNavigationArrows(state);
    this.updateProjectile(state);
    this.updateHouseReaction(state);
    this.updateCamera(state);
    this.updateOccluders(state);
    this.updateAnimatedObjects(state.floatTime, state);
    this.renderer.render(this.scene, this.camera);
    return this.lastAmbientInfo;
  }

  resetWorldCollections() {
    this.clockObjects = [];
    this.clouds = [];
    this.birds = [];
    this.floatingBits = [];
    this.animals = [];
    this.insects = [];
    this.passers = [];
    this.lastAmbientInfo = null;
    this.houseMap = new Map();
    this.occluderMeshes = [];
    this.fadedOccluders = new Set();
    this.targetRing = null;
    this.targetBeam = null;
    this.navigationArrows = [];
    this.paperReadyIcon = null;
    this.newspaper = null;
    this.reactionSprite = null;
    this.player = null;
    this.walkParts = {};
    this.bike = null;
    this.bikeRoll = 0;
    this.walkCycle = 0;
    this.currentPlayerStyle = null;
    this.lastTargetScale = 1;
    this.lastTargetId = null;
    this.eraDetailCount = 0;
  }

  markEraDetail(...items) {
    items.forEach((item) => {
      if (!item) return;
      item.userData.eraDetail = true;
      this.eraDetailCount += 1;
    });
    return items;
  }

  setWorldLayout(layout) {
    this.worldLayout = layout || createWorldLayout(Date.now());
    this.rebuildWorld();
  }

  rebuildWorld() {
    this.fadedOccluders.forEach((mesh) => this.setOccluderOpacity(mesh, 1));
    this.scene.clear();
    this.resetWorldCollections();
    this.createWorld();
  }

  createWorld() {
    this.addLights();
    this.addSkyDetails();
    this.addGround();
    this.addRoadNetwork();
    this.addTargetHouses();
    this.addProceduralTown();
    this.addLandmarks();
    this.addAmbientLife();
    this.addPlayer();
    this.addTargetMarker();
    this.addNavigationArrows();
    this.addNewspaperProjectile();
    this.addReactionSprite();
  }

  addLights() {
    const atmosphere = this.worldLayout?.atmosphere || {};
    const dusk = atmosphere.timeOfDay === "dusk";
    this.scene.fog.color.setHex(dusk ? 0xf1d7c7 : 0xdff2ff);
    this.scene.add(new THREE.HemisphereLight(dusk ? 0xffe6d2 : 0xfffff5, 0x8fc486, dusk ? 2.05 : 2.4));
    const sun = new THREE.DirectionalLight(dusk ? 0xffb37a : 0xffefc0, dusk ? 2.35 : 2.7);
    sun.position.set(dusk ? -58 : -35, dusk ? 34 : 55, dusk ? 44 : 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120; sun.shadow.camera.right = 120; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
    this.scene.add(sun);
  }

  addSkyDetails() {
    const atmosphere = this.worldLayout?.atmosphere || {};
    const dusk = atmosphere.timeOfDay === "dusk";
    const sun = new THREE.Sprite(new THREE.SpriteMaterial({ map: makeSunTexture(), transparent: true, depthWrite: false, fog: false }));
    sun.position.set(dusk ? -92 : -72, dusk ? 30 : 48, -96);
    sun.scale.set(dusk ? 24 : 19, dusk ? 24 : 19, 1);
    this.scene.add(sun);

    if (dusk) {
      const glow = new THREE.Mesh(new THREE.PlaneGeometry(260, 52), mat(0xffb28a, 0.22));
      glow.position.set(0, 14, -119);
      glow.rotation.x = -0.08;
      this.scene.add(glow);
    }


    const cloudSpriteMat = new THREE.SpriteMaterial({ map: makeCloudTexture(), transparent: true, opacity: 0.92, depthWrite: false, fog: false });
    [
      [-62, 27, -48, 24, 8.5, 0.10],
      [12, 31, -56, 30, 10, 0.08],
      [72, 26, -42, 22, 7.5, 0.11],
    ].forEach(([x, y, z, sx, sy, speed], idx) => {
      const sprite = new THREE.Sprite(cloudSpriteMat.clone());
      sprite.position.set(x, y, z);
      sprite.scale.set(sx, sy, 1);
      this.scene.add(sprite);
      this.clouds.push({ group: sprite, baseX: x, phase: idx * 1.2 + 4, speed, amplitude: 3.5 + idx });
    });

    const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86, depthWrite: false, fog: false });
    const cloudSeeds = [
      [-82, 39, -68, 1.15, 0.09],
      [-28, 46, -92, 0.92, 0.12],
      [32, 42, -82, 1.05, 0.08],
      [86, 37, -64, 0.82, 0.11],
      [-104, 34, 12, 0.74, 0.07],
      [72, 48, 18, 0.88, 0.10],
    ];
    cloudSeeds.forEach(([x, y, z, scale, speed], idx) => {
      const group = new THREE.Group();
      group.position.set(x, y, z);
      const parts = [
        [-1.35, 0, 0, 1.25, 0.54, 0.44],
        [-0.45, 0.18, 0.02, 1.35, 0.68, 0.52],
        [0.58, 0.05, 0, 1.55, 0.58, 0.48],
        [1.55, -0.03, 0.02, 1.05, 0.46, 0.40],
      ];
      parts.forEach(([px, py, pz, sx, sy, sz]) => {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 10), cloudMat);
        puff.position.set(px * scale, py * scale, pz * scale);
        puff.scale.set(sx * scale, sy * scale, sz * scale);
        group.add(puff);
      });
      this.scene.add(group);
      this.clouds.push({ group, baseX: x, phase: idx * 1.7, speed, amplitude: 5 + idx });
    });

    const birdMat = new THREE.LineBasicMaterial({ color: 0x49626f, transparent: true, opacity: 0.55, fog: false });
    for (let i = 0; i < 14; i += 1) {
      const geometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.65, 0, 0),
        new THREE.Vector3(0, 0.28, 0),
        new THREE.Vector3(0.65, 0, 0),
      ]);
      const bird = new THREE.Line(geometry, birdMat);
      bird.position.set(-100 + i * 15, 29 + (i % 4) * 4, -78 - (i % 3) * 12);
      bird.scale.setScalar(0.72 + (i % 3) * 0.18);
      this.scene.add(bird);
      this.birds.push({ bird, baseX: bird.position.x, phase: i * 0.8, speed: 0.16 + i * 0.015 });
    }
  }

  addGround() {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(MAP_W, 0.28, MAP_D), mat(COLORS.grass));
    ground.position.y = -0.16; ground.receiveShadow = true; this.scene.add(ground);
    const border = new THREE.Mesh(new THREE.BoxGeometry(MAP_W + 2, 0.16, MAP_D + 2), mat(COLORS.grass2));
    border.position.y = -0.3; this.scene.add(border);

    (this.worldLayout?.landmarks?.grassPatches || []).forEach((patch) => {
      this.addPlane(patch.x, 0.018, patch.z, patch.w, patch.d, patch.color, patch.rot);
    });

    // 远处山影
    (this.worldLayout?.landmarks?.hills || []).forEach((cfg) => {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(cfg.r, cfg.h, 5), mat(cfg.color));
      hill.position.set(cfg.x, cfg.h * 0.45, cfg.z);
      hill.rotation.y = cfg.rot;
      this.scene.add(hill);
    });
    const mountainFence = new THREE.Mesh(new THREE.BoxGeometry(MAP_W - 8, 0.55, 0.8), mat(0x7da16f));
    mountainFence.position.set(0, 0.28, -82.5);
    mountainFence.castShadow = true;
    this.scene.add(mountainFence);
  }

  addRoadNetwork() {
    // Paperboy 参考比例：宽黑色车道 + 灰色人行道 + 白色路缘/标线。
    for (const z of ROAD_Z) this.addStreet("h", z);
    for (const x of ROAD_X) this.addStreet("v", x);
    // 移除窄小斜路，只保留整齐、宽阔的道路网。
    this.addStreetFurniture();
  }

  addStreet(direction, pos) {
    const roadLen = direction === "h" ? MAP_W - 10 : 10.8;
    const roadWid = direction === "h" ? 10.8 : MAP_D - 8;
    const sideLen = direction === "h" ? MAP_W - 10 : 2.15;
    const sideWid = direction === "h" ? 2.15 : MAP_D - 8;
    const curbLen = direction === "h" ? MAP_W - 10 : 0.22;
    const curbWid = direction === "h" ? 0.22 : MAP_D - 8;

    if (direction === "h") {
      this.addPlane(0, 0.032, pos, roadLen, roadWid, COLORS.asphalt, 0);
      this.addPlane(0, 0.04, pos - 6.45, sideLen, sideWid, COLORS.sidewalk, 0);
      this.addPlane(0, 0.04, pos + 6.45, sideLen, sideWid, COLORS.sidewalk, 0);
      this.addPlane(0, 0.055, pos - 5.45, curbLen, curbWid, COLORS.curb, 0);
      this.addPlane(0, 0.055, pos + 5.45, curbLen, curbWid, COLORS.curb, 0);
      for (let i = -52; i <= 52; i += 8) this.addPlane(i, 0.068, pos, 2.4, 0.09, COLORS.lane, 0);
    } else {
      this.addPlane(pos, 0.033, 0, roadLen, roadWid, COLORS.asphalt, 0);
      this.addPlane(pos - 6.45, 0.041, 0, sideLen, sideWid, COLORS.sidewalk, 0);
      this.addPlane(pos + 6.45, 0.041, 0, sideLen, sideWid, COLORS.sidewalk, 0);
      this.addPlane(pos - 5.45, 0.056, 0, curbLen, curbWid, COLORS.curb, 0);
      this.addPlane(pos + 5.45, 0.056, 0, curbLen, curbWid, COLORS.curb, 0);
      for (let i = -68; i <= 68; i += 8) this.addPlane(pos, 0.069, i, 0.09, 2.4, COLORS.lane, 0);
    }
  }

  addTargetHouses() {
    neighbors.forEach((n) => this.addHouse(n));
  }

  addProceduralTown() {
    // 每局从共享 layout 生成不同住宅、商店、树木；碰撞体也使用同一份 layout，避免空气墙。
    (this.worldLayout?.lots || []).forEach((lot) => {
      const group = this.addResidentialLot(lot.x, lot.z, lot.roof, lot.wall, lot.scale, lot.variant);
      group.rotation.y = lot.yaw + (lot.orientation === "v" ? Math.PI / 2 : 0);
    });

    (this.worldLayout?.trees || []).forEach((tree) => {
      this.addTree(tree.x, tree.z, tree.sakura, tree.scale);
    });
  }

  addResidentialLot(x, z, roof, wall, scale = 1, variant = "house-red") {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = ((x + z) % 5) * 0.018;

    const yard = new THREE.Mesh(new THREE.BoxGeometry(7.3, 0.035, 5.6), mat(0xd6e9bf));
    yard.position.set(0, 0.07, 0);
    yard.receiveShadow = true;
    group.add(yard);

    const wallMat = mat(0xf6f0df);
    for (const [px, pz, w, d] of [[0, -2.75, 7.2, 0.12], [0, 2.75, 7.2, 0.12], [-3.6, 0, 0.12, 5.5], [3.6, 0, 0.12, 5.5]]) {
      const fence = new THREE.Mesh(new THREE.BoxGeometry(w, 0.28, d), wallMat);
      fence.position.set(px, 0.22, pz);
      fence.castShadow = true;
      group.add(fence);
    }

    this.addBuildingVariant(group, variant, roof, wall, 2.05 * scale);
    this.registerOccluder(group);
    this.scene.add(group);
    return group;
  }

  addHouse(n) {
    const group = new THREE.Group();
    group.position.set(wx(n.x), 0, wz(n.y));
    const frontZ = wz(n.deliveryY ?? n.y) - wz(n.y);
    if (frontZ < 0) group.rotation.y = Math.PI;
    this.addTargetLot(group, Number.parseInt(n.roof.slice(1), 16), Number.parseInt(n.wall.slice(1), 16), Number.parseInt(n.trim.slice(1), 16), 2.65, TARGET_VARIANTS[n.id] || "house-red");
    const label = makeCanvasLabel(nt(n, "name"), "#2e6650"); label.position.set(0, 5.6, 0.48); group.add(label);
    this.addLandmark(group, n.landmark);
    this.addDeliveryReactionObjects(group, n);
    this.registerOccluder(group);
    this.scene.add(group); this.houseMap.set(n.id, group);
  }

  addStreetFurniture() {
    for (const x of ROAD_X) {
      for (const z of ROAD_Z) {
        if ((x + z) % 64 === 0) this.addCrosswalk(x, z, "h");
        if ((x - z) % 64 === 0) this.addCrosswalk(x, z, "v");
      }
    }
    [[-64, -56], [-32, 32], [32, -32], [64, 56], [96, 8], [-96, 8]].forEach(([x, z], i) => {
      this.addRoadMirror(x + (i % 2 ? -6.2 : 6.2), z + 5.8);
      this.addStopMark(x, z + (i % 2 ? -4.8 : 4.8));
    });
    [[-82, 12], [-44, -36], [18, 60], [74, -12]].forEach(([x, z]) => this.addNoticeBoard(x, z));
    [[-58, 30], [48, -58], [88, 30]].forEach(([x, z]) => this.addGarbageStation(x, z));
    [[-18, -62], [88, 66]].forEach(([x, z]) => this.addPhoneBooth(x, z));
    if (this.worldLayout?.atmosphere?.weather === "afterRain") {
      [[-42, -24], [12, 0], [58, 48], [-86, 72], [80, -48], [-12, 24]].forEach(([x, z], i) => this.addPuddle(x, z, i));
    }
  }

  addPuddle(x, z, i = 0) {
    const puddle = new THREE.Mesh(new THREE.CircleGeometry(0.75 + (i % 3) * 0.24, 18), mat(0x9fd3e8, 0.34));
    puddle.position.set(x, 0.091, z);
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.z = 0.42 + (i % 2) * 0.16;
    this.scene.add(puddle);
  }

  addCrosswalk(x, z, direction = "h") {
    for (let i = -3; i <= 3; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(direction === "h" ? 0.55 : 5.2, 0.018, direction === "h" ? 5.2 : 0.55), mat(0xf4f1e6));
      stripe.position.set(x + (direction === "h" ? i * 0.82 : 0), 0.085, z + (direction === "h" ? 0 : i * 0.82));
      stripe.receiveShadow = true;
      this.scene.add(stripe);
    }
  }

  addRoadMirror(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.8, 8), mat(0x7d8588));
    pole.position.set(x, 0.9, z);
    const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 12), mat(0xff8f3a, 0.9));
    mirror.scale.set(1, 0.84, 0.18);
    mirror.position.set(x, 1.82, z);
    this.scene.add(pole, mirror);
  }

  addStopMark(x, z) {
    const mark = makeCanvasLabel("止", "#ffffff");
    mark.position.set(x, 0.092, z);
    mark.rotation.x = -Math.PI / 2;
    mark.scale.set(1.0, 0.62, 1);
    this.scene.add(mark);
  }

  addNoticeBoard(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.82, 0.08), mat(0x7b5a3d));
    board.position.y = 0.88;
    const paperA = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.42, 0.02), mat(0xfff7d7));
    paperA.position.set(-0.32, 0.9, 0.055);
    const paperB = paperA.clone(); paperB.position.x = 0.26; paperB.material = mat(0xe8f1ff);
    const legs = [-0.48, 0.48].map((px) => { const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.78, 0.08), mat(COLORS.wood)); leg.position.set(px, 0.38, 0); return leg; });
    g.add(board, paperA, paperB, ...legs);
    this.scene.add(g);
  }

  addGarbageStation(x, z) {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.16, 0.72), mat(0x879082));
    base.position.set(x, 0.12, z);
    const net = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.04, 0.68), mat(0x2f9b6d, 0.42));
    net.position.set(x, 0.26, z);
    const bins = [-0.35, 0.2].map((dx, i) => { const b = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.28), mat(i ? 0x4f91d5 : 0xd59a34)); b.position.set(x + dx, 0.25, z); return b; });
    this.scene.add(base, net, ...bins);
  }

  addPhoneBooth(x, z) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.78, 1.65, 0.78), mat(0x91d7c6, 0.45));
    body.position.y = 0.9;
    const roof = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.14, 0.92), mat(0x4f7d6d));
    roof.position.y = 1.77;
    const phone = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.34, 0.08), mat(0x2f3338));
    phone.position.set(0, 0.9, 0.41);
    g.add(body, roof, phone);
    this.scene.add(g);
  }

  addDeliveryReactionObjects(group, n) {
    const recipient = n.recipient || { gender: "male" };
    const color = Number.parseInt(n.roof.slice(1), 16);
    const doorPanel = new THREE.Mesh(new THREE.BoxGeometry(0.66, 1.18, 0.035), mat(0x6b4d33));
    doorPanel.position.set(1.55, 0.92, 2.70);
    doorPanel.visible = false;
    const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.58, 0.04), mat(0xfff09a, 0.62));
    windowGlow.position.set(-1.45, 2.10, 2.72);
    windowGlow.visible = false;

    const resident = new THREE.Group();
    resident.position.set(0.15, 0, 3.42);
    resident.visible = false;
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.58, 5, 12), mat(color));
    body.position.y = 0.76;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 14, 10), mat(0xf0c08d));
    head.position.y = 1.25;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 8), mat(recipient.gender === "female" ? 0x4a3a32 : 0x5b4638));
    hair.scale.set(1.05, recipient.gender === "female" ? 0.75 : 0.42, 1);
    hair.position.y = 1.34;
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.36, 4, 8), mat(0xf0c08d));
    arm.position.set(0.23, 1.0, 0.04);
    arm.rotation.z = -0.85;
    resident.add(body, head, hair, arm);

    const cat = new THREE.Group();
    cat.position.set(-1.25, 0.12, 3.36);
    cat.visible = false;
    const catBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), mat(0xd59a55));
    catBody.scale.set(1.25, 0.7, 0.8);
    const catHead = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), mat(0xd59a55));
    catHead.position.set(0.22, 0.08, 0);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.38, 8), mat(0xd59a55));
    tail.position.set(-0.24, 0.16, 0);
    tail.rotation.z = 0.8;
    cat.add(catBody, catHead, tail);

    group.add(doorPanel, windowGlow, resident, cat);
    group.userData.reactionParts = { doorPanel, windowGlow, resident, cat };
  }

  addDecorHouse(x, z, roof, wall, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = ((x + z) % 7) * 0.035; group.scale.setScalar(scale);
    this.addHouseParts(group, roof, wall, 0x76583f, 2.05, "decor"); this.registerOccluder(group); this.scene.add(group);
  }

  addTargetLot(group, roofColor, wallColor, trimColor, scale, variant = "house-red") {
    const yard = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.04, 6.8), mat(0xd7ecc2));
    yard.position.set(0, 0.06, 0.25);
    yard.receiveShadow = true;
    group.add(yard);
    const fenceMat = mat(0xf3ead8);
    for (const [px, pz, w, d] of [[0, -3.2, 8.4, 0.13], [-4.2, 0.1, 0.13, 6.2], [4.2, 0.1, 0.13, 6.2]]) {
      const fence = new THREE.Mesh(new THREE.BoxGeometry(w, 0.3, d), fenceMat);
      fence.position.set(px, 0.22, pz);
      fence.castShadow = true;
      group.add(fence);
    }
    const pathMat = mat(0xd0c0a8);
    for (let i = 0; i < 5; i += 1) {
      const stone = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.36), pathMat);
      stone.position.set(0.55 + Math.sin(i) * 0.12, 0.105, 2.65 - i * 0.62);
      stone.rotation.y = (i % 2 ? -0.08 : 0.08);
      stone.receiveShadow = true;
      group.add(stone);
    }
    const gateLeft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), fenceMat);
    gateLeft.position.set(-0.52, 0.32, 3.15);
    const gateRight = gateLeft.clone(); gateRight.position.x = 1.45;
    const gateTop = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.10, 0.12), fenceMat);
    gateTop.position.set(0.46, 0.58, 3.15);
    group.add(gateLeft, gateRight, gateTop);
    for (let i = 0; i < 6; i += 1) {
      const shrub = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 8), mat(i % 2 ? 0x74b86f : 0x5da45f));
      shrub.position.set(-3.35 + i * 0.42, 0.22, 2.78 + (i % 2) * 0.08);
      group.add(shrub);
    }
    this.addBuildingVariant(group, variant, roofColor, wallColor, scale);
  }

  addBuildingVariant(group, variant, roofColor, wallColor, scale) {
    const commercial = {
      convenience: [sceneLabel("convenience"), 0x3d79a8, 0xfffbef, 1.05, 1.15],
      supermarket: [sceneLabel("supermarket"), 0xc9823d, 0xf4e4c8, 1.55, 1.25],
      hospital: [sceneLabel("hospital"), 0xf8f8ff, 0xe6f4ff, 1.45, 1.55],
      clinic: [sceneLabel("clinic"), 0x5aaa77, 0xe8f8e8, 1.2, 1.25],
      pharmacy: [sceneLabel("pharmacy"), 0x3dbb70, 0xf0fff2, 1.05, 1.15],
      "post-office": [sceneLabel("postOffice"), 0xb84a42, 0xfff0e8, 1.15, 1.2],
      apartment: [sceneLabel("apartment"), 0x7890a8, 0xe8edf2, 1.25, 1.9],
      office: [sceneLabel("office"), 0x7f8fa6, 0xe9eef5, 1.15, 2.25],
      bank: [sceneLabel("bank"), 0x6678a8, 0xf0f3ff, 1.25, 1.35],
      police: [sceneLabel("police"), 0x4f91d5, 0xffffff, 0.95, 1.15],
      community: [sceneLabel("community"), 0x9c7556, 0xffefcf, 1.35, 1.15],
      school: [sceneLabel("school"), 0xc78d4d, 0xfff0d4, 1.6, 1.45],
      library: [sceneLabel("library"), 0x8a6fb0, 0xf1eaff, 1.35, 1.3],
      cafe: [sceneLabel("cafe"), 0x7b5438, 0xffead7, 1.0, 1.1],
      restaurant: [sceneLabel("restaurant"), 0xb75f4c, 0xffefe4, 1.2, 1.1],
      bakery: [sceneLabel("bakery"), 0xb98136, 0xfff0c8, 1.05, 1.1],
      barber: [sceneLabel("barber"), 0x4f91d5, 0xf5fbff, 0.95, 1.05],
      flower: [sceneLabel("flower"), 0xb86695, 0xffe6ef, 1.05, 1.05],
      bookstore: [sceneLabel("bookstore"), 0x5c7aa0, 0xe8f1ff, 1.05, 1.12],
      "fish-shop": [sceneLabel("fishShop"), 0x5c9ab5, 0xe0f6fb, 1.05, 1.08],
      bathhouse: [sceneLabel("bathhouse"), 0x4f91d5, 0xe8f8ff, 1.15, 1.2],
      parking: [sceneLabel("parking"), 0x555555, 0xd8d8d8, 1.0, 0.55],
    };

    if (commercial[variant]) {
      const [label, roof, wall, widthScale, heightScale] = commercial[variant];
      this.addBoxBuilding(group, roof, wall, scale * widthScale, scale * heightScale, label, variant);
      return;
    }

    const oldStyle = variant === "old-wood";
    const modern = variant === "modern-home";
    const chosenRoof = variant === "house-blue" ? 0x4d6684 : variant === "house-green" ? 0x61785a : variant === "house-brown" ? 0x7b5a3d : roofColor;
    this.addHouseParts(group, chosenRoof, oldStyle ? 0xd8c3a5 : modern ? 0xf4f7f9 : wallColor, oldStyle ? 0x6b4d33 : 0x76583f, scale * (modern ? 1.08 : 1), variant);
    if (modern) {
      const balcony = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.12 * scale, 0.32 * scale), mat(0xd9dde2));
      balcony.position.set(-0.2 * scale, 1.15 * scale, 1.03 * scale);
      group.add(balcony);
    }
  }

  addBoxBuilding(group, roofColor, wallColor, scale, heightScale, label, variant) {
    const w = 2.65 * scale;
    const d = 1.95 * scale;
    const h = 1.25 * scale * heightScale;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(wallColor));
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.BoxGeometry(w * 1.06, 0.22 * scale, d * 1.06), mat(roofColor));
    roof.position.y = h + 0.12 * scale;
    roof.castShadow = true;
    group.add(roof);

    const sign = makeCanvasLabel(label, variant === "hospital" ? "#d94a4a" : "#24506d");
    sign.position.set(0, h * 0.72, d / 2 + 0.08 * scale);
    sign.scale.set(Math.min(4.2, w * 0.78), 1.0, 1);
    group.add(sign);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.62 * scale, 0.04), mat(0x5d4a3a));
    door.position.set(w * 0.22, 0.34 * scale, d / 2 + 0.03);
    group.add(door);

    const winMat = mat(0xfff4b8, 0.45);
    const floors = Math.max(1, Math.floor(heightScale * 2));
    for (let f = 0; f < floors; f += 1) {
      for (let i = -1; i <= 1; i += 1) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.24 * scale, 0.035), winMat);
        win.position.set(i * 0.62 * scale, 0.75 * scale + f * 0.58 * scale, d / 2 + 0.04);
        group.add(win);
      }
    }

    this.addCommercialDetails(group, scale, w, d, h, variant);

    if (variant === "parking") {
      const pMark = makeCanvasLabel("P", "#ffffff");
      pMark.position.set(0, 0.12, 0.2);
      pMark.rotation.x = -Math.PI / 2;
      pMark.scale.set(2.2, 1.0, 1);
      group.add(pMark);
    }
  }

  addHouseParts(group, roofColor, wallColor, trimColor, scale, variant = "house") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.35 * scale, 1.18 * scale, 1.85 * scale), mat(wallColor));
    body.position.y = 0.66 * scale; body.castShadow = true; body.receiveShadow = true; group.add(body);
    const foundation = new THREE.Mesh(new THREE.BoxGeometry(2.55 * scale, 0.18 * scale, 2.02 * scale), mat(0xc9c1b1));
    foundation.position.set(0, 0.12 * scale, 0);
    foundation.receiveShadow = true;
    group.add(foundation);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.75 * scale, 0.82 * scale, 4), mat(roofColor));
    roof.position.y = 1.58 * scale; roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    const eaveFront = new THREE.Mesh(new THREE.BoxGeometry(2.62 * scale, 0.10 * scale, 0.16 * scale), mat(roofColor));
    eaveFront.position.set(0, 1.30 * scale, 1.03 * scale);
    const eaveBack = eaveFront.clone(); eaveBack.position.z = -1.03 * scale;
    const eaveLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.10 * scale, 2.20 * scale), mat(roofColor));
    eaveLeft.position.set(-1.31 * scale, 1.30 * scale, 0);
    const eaveRight = eaveLeft.clone(); eaveRight.position.x = 1.31 * scale;
    group.add(eaveFront, eaveBack, eaveLeft, eaveRight);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.6 * scale, 0.04), mat(trimColor)); door.position.set(0.58 * scale, 0.34 * scale, 0.95 * scale); group.add(door);
    const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.70 * scale, 0.035), mat(0xf7efd8));
    doorFrame.position.set(0.58 * scale, 0.38 * scale, 0.93 * scale);
    group.add(doorFrame);
    door.position.z = 0.975 * scale;
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.035 * scale, 10, 8), mat(0xf3c35a));
    knob.position.set(0.68 * scale, 0.36 * scale, 1.01 * scale);
    group.add(knob);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.3 * scale, 0.035), mat(0xfff4b8, 0.45)); win.position.set(-0.55 * scale, 0.78 * scale, 0.96 * scale); group.add(win);
    const upperWin = win.clone(); upperWin.scale.set(0.82, 0.78, 1); upperWin.position.set(0.18 * scale, 1.03 * scale, 0.97 * scale); group.add(upperWin);
    this.addWindowFrame(group, -0.55 * scale, 0.78 * scale, 0.995 * scale, 0.48 * scale, 0.34 * scale, scale, "front");
    this.addWindowFrame(group, 0.18 * scale, 1.03 * scale, 1.005 * scale, 0.38 * scale, 0.27 * scale, scale, "front");
    const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.22 * scale, 0.19 * scale), mat(0xdc604c)); mailbox.position.set(1.55 * scale, 0.36 * scale, 1.08 * scale); mailbox.castShadow = true; group.add(mailbox);
    this.addHomeDetails(group, scale, variant, roofColor, trimColor);
  }

  addWindowFrame(group, x, y, z, w, h, scale, side = "front") {
    const frameMat = mat(0x5f6f73);
    const glassMat = mat(0xe9f7ff, 0.35);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(w * 0.92, h * 0.86, 0.026 * scale), glassMat);
    glass.position.set(x, y, z + (side === "front" ? 0.004 * scale : 0));
    if (side === "left") glass.rotation.y = Math.PI / 2;
    group.add(glass);
    const bars = [
      [w, 0.035 * scale, 0.03 * scale, 0, h / 2, 0],
      [w, 0.035 * scale, 0.03 * scale, 0, -h / 2, 0],
      [0.035 * scale, h, 0.03 * scale, -w / 2, 0, 0],
      [0.035 * scale, h, 0.03 * scale, w / 2, 0, 0],
      [0.025 * scale, h * 0.86, 0.032 * scale, 0, 0, 0],
      [w * 0.86, 0.022 * scale, 0.032 * scale, 0, 0, 0],
    ];
    bars.forEach(([bw, bh, bd, ox, oy, oz]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), frameMat);
      b.position.set(x + ox, y + oy, z + oz);
      if (side === "left") b.rotation.y = Math.PI / 2;
      group.add(b);
    });
  }

  addHomeDetails(group, scale, variant = "house", roofColor = 0x9c7556, trimColor = 0x76583f) {
    const roofRidge = new THREE.Mesh(new THREE.BoxGeometry(2.2 * scale, 0.08 * scale, 0.08 * scale), mat(0x6d4b3a));
    roofRidge.position.set(0, 1.98 * scale, 0);
    roofRidge.rotation.y = Math.PI / 4;
    group.add(roofRidge);

    for (let i = -2; i <= 2; i += 1) {
      const tile = new THREE.Mesh(new THREE.BoxGeometry(1.85 * scale, 0.026 * scale, 0.035 * scale), mat(0x5f463c));
      tile.position.set(i * 0.22 * scale, 1.71 * scale - Math.abs(i) * 0.035 * scale, 0.56 * scale + i * 0.02 * scale);
      tile.rotation.y = Math.PI / 4;
      group.add(tile);
    }

    const gutter = new THREE.Mesh(new THREE.BoxGeometry(2.42 * scale, 0.045 * scale, 0.055 * scale), mat(0x6f7f82));
    gutter.position.set(0, 1.24 * scale, 1.11 * scale);
    const downPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, 0.92 * scale, 8), mat(0x6f7f82));
    downPipe.position.set(-1.18 * scale, 0.78 * scale, 1.12 * scale);
    group.add(gutter, downPipe);

    const sideWin = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.26 * scale, 0.035), mat(0xe9f7ff, 0.4));
    sideWin.position.set(-1.18 * scale, 0.82 * scale, 0.18 * scale);
    sideWin.rotation.y = Math.PI / 2;
    group.add(sideWin);
    this.addWindowFrame(group, -1.205 * scale, 0.82 * scale, 0.18 * scale, 0.36 * scale, 0.28 * scale, scale, "left");

    const ac = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.2 * scale, 0.16 * scale), mat(0xd8dde0));
    ac.position.set(-1.25 * scale, 0.58 * scale, -0.45 * scale);
    ac.castShadow = true;
    group.add(ac);
    for (let i = 0; i < 3; i += 1) {
      const vent = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.012 * scale, 0.01 * scale), mat(0x8f9aa0));
      vent.position.set(-1.34 * scale, (0.54 + i * 0.045) * scale, -0.36 * scale);
      vent.rotation.y = Math.PI / 2;
      group.add(vent);
    }

    for (const x of [-1.2, 1.05]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.1 * scale, 0.14 * scale, 8), mat(0x9c5c3c));
      pot.position.set(x * scale, 0.13 * scale, 1.12 * scale);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.13 * scale, 10, 8), mat(0x5aaa77));
      leaf.position.set(x * scale, 0.28 * scale, 1.12 * scale);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.045 * scale, 8, 6), mat(x < 0 ? 0xff8eaa : 0xf5d34e));
      flower.position.set(x * scale, 0.40 * scale, 1.13 * scale);
      group.add(pot, leaf, flower);
    }

    const namePlate = new THREE.Mesh(new THREE.BoxGeometry(0.26 * scale, 0.12 * scale, 0.03), mat(0xfff6d7));
    namePlate.position.set(0.98 * scale, 0.72 * scale, 0.98 * scale);
    group.add(namePlate);

    const porch = new THREE.Mesh(new THREE.BoxGeometry(0.75 * scale, 0.12 * scale, 0.45 * scale), mat(0xc8b9a2));
    porch.position.set(0.58 * scale, 0.12 * scale, 1.22 * scale);
    const porchMat = new THREE.Mesh(new THREE.BoxGeometry(0.62 * scale, 0.025 * scale, 0.36 * scale), mat(0x8b6a4f));
    porchMat.position.set(0.58 * scale, 0.195 * scale, 1.24 * scale);
    group.add(porch, porchMat);

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 12, 8), mat(0xffe6a6));
    lamp.position.set(0.34 * scale, 0.82 * scale, 1.04 * scale);
    const lampCap = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.035 * scale, 0.06 * scale), mat(trimColor));
    lampCap.position.set(0.34 * scale, 0.90 * scale, 1.04 * scale);
    group.add(lamp, lampCap);

    const meter = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.28 * scale, 0.04 * scale), mat(0xe8edf0));
    meter.position.set(-0.98 * scale, 0.48 * scale, 0.98 * scale);
    group.add(meter);

    if (variant === "old-wood" || variant === "decor") {
      for (let i = -4; i <= 4; i += 1) {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, 0.92 * scale, 0.025 * scale), mat(0x8a6545));
        slat.position.set(i * 0.23 * scale, 0.72 * scale, 1.005 * scale);
        group.add(slat);
      }
    }

    if (variant === "modern-home") {
      const railMat = mat(0xbfc8d0);
      for (let i = -3; i <= 3; i += 1) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, 0.28 * scale, 0.035 * scale), railMat);
        rail.position.set((-0.58 + i * 0.18) * scale, 1.28 * scale, 1.20 * scale);
        group.add(rail);
      }
      const topRail = new THREE.Mesh(new THREE.BoxGeometry(1.28 * scale, 0.04 * scale, 0.04 * scale), railMat);
      topRail.position.set(-0.05 * scale, 1.43 * scale, 1.20 * scale);
      group.add(topRail);
    }

    if (variant === "house-green") {
      const vineMat = mat(0x4f9a59);
      for (let i = 0; i < 4; i += 1) {
        const vine = new THREE.Mesh(new THREE.BoxGeometry(0.035 * scale, (0.34 + i * 0.08) * scale, 0.03 * scale), vineMat);
        vine.position.set((-1.02 + i * 0.12) * scale, (0.58 + i * 0.08) * scale, 1.02 * scale);
        vine.rotation.z = -0.4 + i * 0.2;
        group.add(vine);
      }
    }

    this.addShowaHeiseiHomeDetails(group, scale, variant, roofColor, trimColor);
  }

  addShowaHeiseiHomeDetails(group, scale, variant = "house", roofColor = 0x8f5f4a, trimColor = 0x76583f) {
    const metalMat = mat(0x7f898b);
    const darkMetal = mat(0x445056);
    const woodMat = mat(variant === "old-wood" ? 0x5d432e : 0x7a6044);
    const shutterMat = mat(variant === "old-wood" ? 0x8c795f : 0xa9a08d);
    const clothColors = [0xe7d6b7, 0x6b88a8, 0xc75f55, 0xf2e8d2];

    // 昭和末期住宅常见的瓦片排线：密一点、颜色更沉稳，避免现代玩具感。
    for (let i = -4; i <= 4; i += 1) {
      const tileFront = new THREE.Mesh(new THREE.BoxGeometry(2.35 * scale, 0.024 * scale, 0.032 * scale), mat(i % 2 ? 0x4e4039 : 0x685044));
      tileFront.position.set(0, (1.64 - Math.abs(i) * 0.027) * scale, (0.38 + i * 0.105) * scale);
      tileFront.rotation.y = Math.PI / 4;
      const tileBack = tileFront.clone();
      tileBack.position.z *= -1;
      group.add(tileFront, tileBack);
      this.markEraDetail(tileFront, tileBack);
    }

    const sideGutterL = new THREE.Mesh(new THREE.BoxGeometry(0.055 * scale, 0.05 * scale, 2.15 * scale), metalMat);
    sideGutterL.position.set(-1.31 * scale, 1.245 * scale, 0);
    const sideGutterR = sideGutterL.clone();
    sideGutterR.position.x = 1.31 * scale;
    const rearGutter = new THREE.Mesh(new THREE.BoxGeometry(2.42 * scale, 0.045 * scale, 0.055 * scale), metalMat);
    rearGutter.position.set(0, 1.24 * scale, -1.11 * scale);
    const downPipeR = new THREE.Mesh(new THREE.CylinderGeometry(0.021 * scale, 0.021 * scale, 0.98 * scale, 8), darkMetal);
    downPipeR.position.set(1.18 * scale, 0.76 * scale, 1.12 * scale);
    group.add(sideGutterL, sideGutterR, rearGutter, downPipeR);
    this.markEraDetail(sideGutterL, sideGutterR, rearGutter, downPipeR);

    // アルミサッシ + 雨戸。60+ 日本玩家会更容易联想到旧住宅区。
    for (const [x, y, w, h] of [[-0.55, 0.78, 0.18, 0.33], [0.18, 1.03, 0.14, 0.27]]) {
      const left = new THREE.Mesh(new THREE.BoxGeometry(w * scale, h * scale, 0.032 * scale), shutterMat);
      left.position.set((x - 0.34) * scale, y * scale, 1.015 * scale);
      const right = left.clone();
      right.position.x = (x + 0.34) * scale;
      const sill = new THREE.Mesh(new THREE.BoxGeometry((w * 2.2) * scale, 0.035 * scale, 0.04 * scale), metalMat);
      sill.position.set(x * scale, (y - h * 0.62) * scale, 1.03 * scale);
      group.add(left, right, sill);
      this.markEraDetail(left, right, sill);
    }

    const woodBand = new THREE.Mesh(new THREE.BoxGeometry(2.38 * scale, 0.13 * scale, 0.034 * scale), woodMat);
    woodBand.position.set(0, 0.52 * scale, 1.025 * scale);
    const baseBand = new THREE.Mesh(new THREE.BoxGeometry(2.44 * scale, 0.08 * scale, 0.035 * scale), mat(0x6f6558));
    baseBand.position.set(0, 0.28 * scale, 1.03 * scale);
    group.add(woodBand, baseBand);
    this.markEraDetail(woodBand, baseBand);

    const serviceBox = new THREE.Mesh(new THREE.BoxGeometry(0.16 * scale, 0.24 * scale, 0.045 * scale), mat(0xd4d7d2));
    serviceBox.position.set(-0.78 * scale, 0.46 * scale, 1.04 * scale);
    const wireToRoof = new THREE.Mesh(new THREE.BoxGeometry(0.025 * scale, 0.54 * scale, 0.025 * scale), darkMetal);
    wireToRoof.position.set(-0.78 * scale, 0.82 * scale, 1.05 * scale);
    const oldDoorStep = new THREE.Mesh(new THREE.BoxGeometry(0.56 * scale, 0.06 * scale, 0.18 * scale), mat(0x8b7a62));
    oldDoorStep.position.set(0.58 * scale, 0.235 * scale, 1.50 * scale);
    group.add(serviceBox, wireToRoof, oldDoorStep);
    this.markEraDetail(serviceBox, wireToRoof, oldDoorStep);

    if (variant === "modern-home" || variant === "decor") {
      const pole = new THREE.Mesh(new THREE.BoxGeometry(1.08 * scale, 0.035 * scale, 0.035 * scale), metalMat);
      pole.position.set(-0.05 * scale, 1.48 * scale, 1.28 * scale);
      group.add(pole);
      this.markEraDetail(pole);
      for (let i = 0; i < 3; i += 1) {
        const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.28 * scale, 0.028 * scale), mat(clothColors[(i + (variant === "decor" ? 1 : 0)) % clothColors.length]));
        cloth.position.set((-0.38 + i * 0.24) * scale, 1.31 * scale, 1.31 * scale);
        cloth.rotation.z = (i - 1) * 0.04;
        group.add(cloth);
        this.markEraDetail(cloth);
      }
    }

    // 门牌与旧式邮筒增强“有人住”的感觉。
    const houseNumber = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.09 * scale, 0.024 * scale), mat(0xf6edd1));
    houseNumber.position.set(1.06 * scale, 0.62 * scale, 1.045 * scale);
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.022 * scale, 0.014 * scale), mat(0x7b4d3d));
    slot.position.set(1.55 * scale, 0.43 * scale, 1.18 * scale);
    group.add(houseNumber, slot);
    this.markEraDetail(houseNumber, slot);
  }

  addCommercialDetails(group, scale, w, d, h, variant) {
    const awningColor = variant === "convenience" ? 0x2f9bdf : variant === "hospital" ? 0xd94a4a : 0xf0b44d;
    const awning = new THREE.Mesh(new THREE.BoxGeometry(w * 0.75, 0.16 * scale, 0.28 * scale), mat(awningColor));
    awning.position.set(0, h * 0.48, d / 2 + 0.14 * scale);
    awning.castShadow = true;
    group.add(awning);

    for (let i = -3; i <= 3; i += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry((w * 0.75) / 8, 0.17 * scale, 0.295 * scale), mat(i % 2 ? 0xffffff : awningColor));
      stripe.position.set(i * (w * 0.75 / 7), h * 0.485, d / 2 + 0.155 * scale);
      group.add(stripe);
    }

    if (variant === "hospital") {
      const crossA = new THREE.Mesh(new THREE.BoxGeometry(0.52 * scale, 0.12 * scale, 0.04), mat(0xd94a4a));
      const crossB = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.52 * scale, 0.04), mat(0xd94a4a));
      crossA.position.set(-w * 0.32, h + 0.28 * scale, d / 2 + 0.05);
      crossB.position.copy(crossA.position);
      group.add(crossA, crossB);
    }

    const roofUnit = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.22 * scale, 0.42 * scale), mat(0xcfd5d8));
    roofUnit.position.set(w * 0.28, h + 0.32 * scale, -d * 0.12);
    roofUnit.castShadow = true;
    group.add(roofUnit);
    const roofFan = new THREE.Mesh(new THREE.CylinderGeometry(0.13 * scale, 0.13 * scale, 0.08 * scale, 16), mat(0x9aa5aa));
    roofFan.position.set(w * 0.28, h + 0.50 * scale, -d * 0.12);
    roofFan.rotation.x = Math.PI / 2;
    group.add(roofFan);

    const glassDoor = new THREE.Mesh(new THREE.BoxGeometry(0.48 * scale, 0.68 * scale, 0.035), mat(0xbfe8ff, 0.25));
    glassDoor.position.set(-w * 0.16, 0.38 * scale, d / 2 + 0.055);
    group.add(glassDoor);
    const doorBar = new THREE.Mesh(new THREE.BoxGeometry(0.04 * scale, 0.62 * scale, 0.04), mat(0x607078));
    doorBar.position.set(-w * 0.16, 0.38 * scale, d / 2 + 0.08);
    group.add(doorBar);

    for (const x of [-0.42, 0, 0.42]) {
      const poster = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.32 * scale, 0.035), mat(x === 0 ? 0xfff04a : 0x87d37c));
      poster.position.set(x * w * 0.5, 0.54 * scale, d / 2 + 0.05);
      group.add(poster);
    }

    const sideSign = new THREE.Mesh(new THREE.BoxGeometry(0.18 * scale, 0.86 * scale, 0.08 * scale), mat(variant === "post-office" ? 0xd94a4a : 0x446b8f));
    sideSign.position.set(-w / 2 - 0.08 * scale, h * 0.56, d / 2 + 0.06);
    group.add(sideSign);

    for (let f = 0; f < Math.max(1, Math.floor(h / (0.85 * scale))); f += 1) {
      const sideWindow = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.23 * scale, 0.42 * scale), mat(0xe9f7ff, 0.36));
      sideWindow.position.set(w / 2 + 0.025, 0.78 * scale + f * 0.58 * scale, -d * 0.15);
      group.add(sideWindow);
    }

    if (["convenience", "supermarket", "pharmacy"].includes(variant)) {
      const rackMat = mat(0x78848a);
      for (let i = 0; i < 3; i += 1) {
        const rack = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.045 * scale, 0.18 * scale), rackMat);
        rack.position.set((0.42 + i * 0.24) * scale, 0.28 * scale, d / 2 + 0.18 * scale);
        group.add(rack);
      }
    }

    if (variant === "parking") {
      for (let i = -1; i <= 1; i += 1) {
        const line = new THREE.Mesh(new THREE.BoxGeometry(0.045 * scale, 0.018 * scale, 1.05 * scale), mat(0xffffff));
        line.position.set(i * 0.52 * scale, 0.08 * scale, d / 2 + 0.22 * scale);
        group.add(line);
      }
    }

    this.addShowaHeiseiCommercialDetails(group, scale, w, d, h, variant);
  }

  addShowaHeiseiCommercialDetails(group, scale, w, d, h, variant) {
    if (variant === "parking") return;
    const shutterMat = mat(0xb8b0a2);
    const shutterDark = mat(0x7a756c);
    const woodMat = mat(0x735338);
    const clothColor = variant === "fish-shop" ? 0x315f86 : variant === "bathhouse" ? 0x2d7aa0 : variant === "bakery" ? 0xb86655 : 0x3d79b7;

    // 商店街常见的卷帘门 / 横向铁皮纹。
    const shutter = new THREE.Mesh(new THREE.BoxGeometry(w * 0.34, h * 0.34, 0.035 * scale), shutterMat);
    shutter.position.set(-w * 0.31, h * 0.22, d / 2 + 0.075 * scale);
    group.add(shutter);
    this.markEraDetail(shutter);
    for (let i = 0; i < 6; i += 1) {
      const slat = new THREE.Mesh(new THREE.BoxGeometry(w * 0.33, 0.018 * scale, 0.038 * scale), shutterDark);
      slat.position.set(-w * 0.31, (h * 0.09 + i * h * 0.045), d / 2 + 0.095 * scale);
      group.add(slat);
      this.markEraDetail(slat);
    }

    // 暖簾 / 小布帘，比现代招牌更有昭和～平成初期的生活感。
    for (let i = -1; i <= 1; i += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(w * 0.15, 0.30 * scale, 0.032 * scale), mat(clothColor));
      panel.position.set((i * w * 0.14) + w * 0.12, h * 0.37, d / 2 + 0.19 * scale);
      panel.rotation.z = i * 0.035;
      group.add(panel);
      this.markEraDetail(panel);
    }

    const oldSign = new THREE.Mesh(new THREE.BoxGeometry(0.23 * scale, 0.92 * scale, 0.055 * scale), woodMat);
    oldSign.position.set(w / 2 + 0.10 * scale, h * 0.50, d / 2 + 0.11 * scale);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.10 * scale, 12, 8), mat(0xffe6b0));
    lamp.position.set(w * 0.38, h * 0.58, d / 2 + 0.16 * scale);
    group.add(oldSign, lamp);
    this.markEraDetail(oldSign, lamp);

    const crateColor = ["fish-shop", "supermarket", "flower"].includes(variant) ? 0x6b8b5c : 0x9a6b42;
    for (let i = 0; i < 3; i += 1) {
      const crate = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.16 * scale, 0.22 * scale), mat(crateColor));
      crate.position.set((w * 0.29 + i * 0.24 * scale), 0.13 * scale, d / 2 + 0.25 * scale);
      crate.castShadow = true;
      group.add(crate);
      this.markEraDetail(crate);
    }

    if (["apartment", "office", "bank", "school", "hospital"].includes(variant)) {
      const entranceCanopy = new THREE.Mesh(new THREE.BoxGeometry(w * 0.42, 0.10 * scale, 0.34 * scale), mat(0x77828a));
      entranceCanopy.position.set(0, h * 0.34, d / 2 + 0.20 * scale);
      group.add(entranceCanopy);
      this.markEraDetail(entranceCanopy);
    }
  }

  addLandmark(group, landmark) {
    const addBall = (color, x, z, r = 0.13) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(color)); m.position.set(x, r + 0.03, z); group.add(m); };
    if (landmark === "flowers" || landmark === "garden") for (let i = 0; i < 8; i += 1) addBall(i % 2 ? 0xe85f79 : 0xffaac2, -0.86 + i * 0.13, 0.9 + (i % 2) * 0.08, 0.055);
    if (landmark === "basketball") addBall(0xd97935, -0.98, 0.88, 0.15);
    if (landmark === "fence") for (let i = 0; i < 6; i += 1) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.38, 0.05), mat(0xfffbef)); f.position.set(-0.8 + i * 0.18, 0.2, 0.94); group.add(f); }
    if (landmark === "clinic") { const sign = this.makeSign(sceneLabel("clinicShort"), 0.52, 0.42); sign.position.set(-1.05, 0.1, 0.88); group.add(sign); }
    if (landmark === "bench") { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.09, 0.2), mat(COLORS.wood)); seat.position.set(-0.96, 0.25, 0.9); group.add(seat); }
    if (landmark === "fish") addBall(0x6cb7d9, -0.94, 0.9, 0.09);
    if (landmark === "bag") { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.18), mat(0x7b5c47)); bag.position.set(-0.98, 0.18, 0.9); group.add(bag); }
    if (landmark === "bus" || landmark === "sign") { const s = this.makeSign(landmark === "bus" ? sceneLabel("bus") : sceneLabel("town"), 0.55, 0.42); s.position.set(-1.02, 0.05, 0.9); group.add(s); }
  }

  addLandmarks() {
    // 河流、桥、公园、商店街、神社、田地每局位置会轻微变化。
    const landmarks = this.worldLayout?.landmarks || {};
    const riverX = landmarks.riverX ?? -102;
    const [parkX, parkZ] = landmarks.park || [-78, 58];
    const [shopX, shopZ] = landmarks.shop || [-70, -68];
    const [busX, busZ] = landmarks.bus || [44, -70];
    const [shrineX, shrineZ] = landmarks.shrine || [88, 58];
    const fields = landmarks.fields || [[86, -64], [100, -62]];
    const [signX, signZ] = landmarks.sign || [-18, 72];

    this.addPlane(riverX, 0.035, 0, 4.2, MAP_D - 8, COLORS.water, 0.03);
    // 河岸护栏让“不能下河”在视觉上也成立，桥的位置保留开口。
    for (const bankX of [riverX - 2.6, riverX + 2.6]) {
      for (const [z, len] of [[-72, 28], [-24, 26], [24, 26], [72, 28]]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, len), mat(COLORS.wood));
        rail.position.set(bankX, 0.27, z);
        rail.castShadow = true;
        this.scene.add(rail);
      }
    }
    for (const z of [-48, 0, 48]) { const b = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 2.2), mat(0xb8875b)); b.position.set(riverX, 0.18, z); b.castShadow = true; this.scene.add(b); }
    this.addPlane(parkX, 0.05, parkZ, 18, 12, 0x71bb70, -0.03); this.addSign(parkX, parkZ - 8, sceneLabel("park")); this.addBench(parkX - 4, parkZ); this.addBench(parkX + 4, parkZ + 3); this.addTree(parkX - 8, parkZ - 6, true, 1.3); this.addTree(parkX + 8, parkZ - 3, false, 1.2);
    this.addShop(shopX, shopZ); this.addVending(shopX - 8, shopZ + 5); this.addVending(shopX + 6, shopZ + 5); this.addBusStop(busX, busZ);
    this.addTorii(shrineX, shrineZ); this.addStoneLantern(shrineX - 6, shrineZ - 4); this.addStoneLantern(shrineX + 6, shrineZ - 4);
    fields.forEach(([x, z]) => this.addField(x, z)); this.addSign(signX, signZ, sceneLabel("neighborhood"));
    (landmarks.poles || []).forEach(({ x, z }) => this.addUtilityPole(x, z));
  }

  addAmbientLife() {
    const leafMat = new THREE.MeshBasicMaterial({ color: 0xe8b65c, transparent: true, opacity: 0.72, side: THREE.DoubleSide, depthWrite: false });
    const petalMat = new THREE.MeshBasicMaterial({ color: 0xffb7cc, transparent: true, opacity: 0.78, side: THREE.DoubleSide, depthWrite: false });
    const leafGeo = new THREE.PlaneGeometry(0.22, 0.09);
    for (let i = 0; i < 58; i += 1) {
      const matItem = i % 3 === 0 ? petalMat : leafMat;
      const bit = new THREE.Mesh(leafGeo, matItem.clone());
      const x = -110 + ((i * 29) % 220);
      const z = -80 + ((i * 47) % 160);
      bit.position.set(x, 1.15 + (i % 9) * 0.18, z);
      bit.rotation.set((i % 5) * 0.6, (i % 7) * 0.4, (i % 11) * 0.2);
      this.scene.add(bit);
      this.floatingBits.push({ bit, baseX: x, baseY: bit.position.y, baseZ: z, phase: i * 0.73, speed: 0.42 + (i % 5) * 0.05, drift: 0.8 + (i % 4) * 0.25 });
    }

    [
      { kind: "cat", color: 0xd59a55, x: -84, z: 55, range: 8, speed: 0.18, phase: 0 },
      { kind: "dog", color: 0x8a6248, x: -72, z: 62, range: 10, speed: 0.14, phase: 1.9 },
      { kind: "cat", color: 0x555555, x: 46, z: -70, range: 7, speed: 0.16, phase: 3.1 },
      { kind: "sparrow", color: 0x8b6b48, x: -42, z: -53, range: 5, speed: 0.26, phase: 2.2 },
      { kind: "sparrow", color: 0x6f5c46, x: 18, z: 30, range: 4, speed: 0.22, phase: 0.7 },
      { kind: "rabbit", color: 0xf2f0e8, x: 82, z: 44, range: 6, speed: 0.20, phase: 1.1 },
      { kind: "dog", color: 0xcaa06a, x: 67, z: -50, range: 7, speed: 0.15, phase: 4.4 },
      { kind: "duck", color: 0xf0d56f, x: -101, z: 10, range: 3, speed: 0.18, phase: 2.8 },
      { kind: "duck", color: 0xf2e2a0, x: -103, z: -38, range: 2.5, speed: 0.16, phase: 3.8 },
      { kind: "cat", color: 0xf2efe6, x: -8, z: 72, range: 5, speed: 0.13, phase: 5.1 },
    ].forEach((cfg) => {
      const animal = this.createAnimal(cfg.kind, cfg.color);
      animal.position.set(cfg.x, 0, cfg.z);
      this.scene.add(animal);
      this.animals.push({ group: animal, ...cfg });
    });

    const insectColors = [0xffcc66, 0x8bd3ff, 0xff9ecb, 0xc3ee7f, 0xb79cff];
    for (let i = 0; i < 18; i += 1) {
      const insect = this.createInsect(i % 3 === 0 ? "dragonfly" : "butterfly", insectColors[i % insectColors.length]);
      const baseX = -96 + ((i * 23) % 192);
      const baseZ = -70 + ((i * 31) % 140);
      insect.position.set(baseX, 1.05 + (i % 5) * 0.22, baseZ);
      this.scene.add(insect);
      this.insects.push({ group: insect, baseX, baseZ, baseY: insect.position.y, phase: i * 0.59, speed: 0.75 + (i % 4) * 0.12, radius: 1.2 + (i % 4) * 0.35 });
    }

    const passerConfigs = [
      { kind: "cyclist", dir: "h", lane: -72, start: -112, end: 112, offset: 2.0, speed: 4.6, phase: 0.03, color: 0x4f91d5 },
      { kind: "pedestrian", dir: "h", lane: -72, start: -108, end: 108, offset: -6.4, speed: 2.0, phase: 0.12, color: 0x7b87c8 },
      { kind: "pedestrian", dir: "h", lane: -48, start: -108, end: 108, offset: -6.2, speed: 3.0, phase: 0, color: 0x7b87c8 },
      { kind: "pedestrian", dir: "h", lane: 24, start: 108, end: -108, offset: 6.2, speed: 2.4, phase: 0.32, color: 0xb86695 },
      { kind: "pedestrian", dir: "v", lane: -32, start: -80, end: 80, offset: -6.0, speed: 2.6, phase: 0.18, color: 0xd59a34 },
      { kind: "cyclist", dir: "h", lane: 0, start: -112, end: 112, offset: -2.2, speed: 5.4, phase: 0.55, color: 0x4f91d5 },
      { kind: "cyclist", dir: "v", lane: 64, start: 82, end: -82, offset: 2.0, speed: 4.8, phase: 0.75, color: 0x5aaa77 },
      { kind: "pedestrian", dir: "h", lane: 72, start: -108, end: 108, offset: -6.3, speed: 2.2, phase: 0.82, color: 0x9c7556 },
    ];
    const horizontalLanes = ROAD_Z;
    const verticalLanes = ROAD_X;
    const personColors = [0x7b87c8, 0xb86695, 0xd59a34, 0x5aaa77, 0x8a6fb0, 0x9c7556, 0x4f91d5, 0xd66b53];
    for (let i = 0; i < 22; i += 1) {
      const horizontal = i % 2 === 0;
      const lane = horizontal ? horizontalLanes[i % horizontalLanes.length] : verticalLanes[i % verticalLanes.length];
      const reverse = i % 5 === 0;
      passerConfigs.push({
        kind: "pedestrian",
        dir: horizontal ? "h" : "v",
        lane,
        start: reverse ? 108 : -108,
        end: reverse ? -108 : 108,
        offset: (i % 4 < 2 ? -6.4 : 6.4) + ((i % 3) - 1) * 0.35,
        speed: 1.45 + (i % 5) * 0.28,
        phase: (i * 0.137) % 1,
        color: personColors[i % personColors.length],
        style: i,
      });
    }
    for (let i = 0; i < 7; i += 1) {
      const horizontal = i % 2 === 1;
      passerConfigs.push({
        kind: "cyclist",
        dir: horizontal ? "h" : "v",
        lane: horizontal ? horizontalLanes[(i * 2 + 1) % horizontalLanes.length] : verticalLanes[(i * 2 + 1) % verticalLanes.length],
        start: i % 3 === 0 ? 112 : -112,
        end: i % 3 === 0 ? -112 : 112,
        offset: i % 2 === 0 ? 2.4 : -2.4,
        speed: 4.0 + (i % 4) * 0.45,
        phase: (0.21 + i * 0.113) % 1,
        color: personColors[(i + 3) % personColors.length],
        style: i + 30,
      });
    }
    passerConfigs.forEach((cfg) => {
      const group = cfg.kind === "cyclist" ? this.createAmbientCyclist(cfg.color, cfg.style || 0) : this.createAmbientPedestrian(cfg.color, cfg.style || 0);
      this.scene.add(group);
      this.passers.push({ group, ...cfg });
    });
  }

  createAmbientPedestrian(color, style = 0) {
    const group = new THREE.Group();
    const skinColors = [0xf0c08d, 0xe6b07d, 0xf2cfaa, 0xd9a06f];
    const pantsColors = [0x2f4f64, 0x5d6380, 0x594f6f, 0x6f5a43];
    const hairColors = [0x3f332a, 0x6b5a4c, 0x202020, 0x8c7c68];
    const skin = skinColors[style % skinColors.length];
    const pants = pantsColors[(style + 1) % pantsColors.length];
    const hair = hairColors[(style + 2) % hairColors.length];
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.17, 0.48, 5, 12), mat(color));
    body.position.y = 0.82;
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.055, 0.20), mat(style % 2 ? 0xffe08a : 0xe85f79));
    scarf.position.set(0.02, 1.04, 0.02);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.145, 14, 10), mat(skin));
    head.position.y = 1.24;
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.151, 14, 8), mat(hair));
    hairCap.scale.set(1.05, 0.52, 1.0);
    hairCap.position.set(0, 1.31, -0.012);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.075, 16), mat(style % 3 === 0 ? 0xd6b56d : 0x5d7b57));
    hat.position.set(0, 1.38, 0);
    hat.visible = style % 4 === 0;
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.018, 16), mat(style % 3 === 0 ? 0xd6b56d : 0x5d7b57));
    brim.position.set(0, 1.34, 0);
    brim.visible = hat.visible;
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), mat(skin));
    nose.position.set(0.13, 1.24, 0);
    const eyeMat = mat(0x2c2724);
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), eyeMat);
    const rightEye = leftEye.clone();
    leftEye.position.set(0.132, 1.275, -0.047);
    rightEye.position.set(0.132, 1.275, 0.047);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.009, 0.075), mat(0xa35d55));
    mouth.position.set(0.142, 1.198, 0);
    const glasses = new THREE.Group();
    if (style % 3 === 1) {
      const lensGeo = new THREE.TorusGeometry(0.040, 0.004, 5, 12);
      const g1 = new THREE.Mesh(lensGeo, eyeMat);
      const g2 = g1.clone();
      g1.position.set(0.145, 1.275, -0.048);
      g2.position.set(0.145, 1.275, 0.048);
      g1.rotation.y = Math.PI / 2;
      g2.rotation.y = Math.PI / 2;
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.036), eyeMat);
      bridge.position.set(0.147, 1.275, 0);
      glasses.add(g1, g2, bridge);
    }
    const bag = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.22, 0.09), mat(style % 2 ? 0x7b5c47 : 0x345f86));
    bag.position.set(0.20, 0.76, 0.08);
    const leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 8), mat(skin));
    const rightArm = leftArm.clone();
    leftArm.position.set(0.02, 0.88, -0.21);
    rightArm.position.set(0.02, 0.88, 0.21);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 6), mat(skin));
    const rightHand = leftHand.clone();
    leftHand.position.set(0.02, 0.68, -0.24);
    rightHand.position.set(0.02, 0.68, 0.24);
    const leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.38, 4, 8), mat(pants));
    const rightLeg = leftLeg.clone();
    leftLeg.position.set(-0.02, 0.40, -0.075);
    rightLeg.position.set(-0.02, 0.40, 0.075);
    const leftShoe = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.055, 0.07), mat(0x2f2b28));
    const rightShoe = leftShoe.clone();
    leftShoe.position.set(0.035, 0.12, -0.08);
    rightShoe.position.set(0.035, 0.12, 0.08);
    const accessory = new THREE.Group();
    if (style % 5 === 0) {
      const cane = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.62, 8), mat(0x7b5c47));
      cane.position.set(0.24, 0.38, 0.24);
      cane.rotation.z = -0.18;
      accessory.add(cane);
    } else if (style % 5 === 1) {
      const shopping = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.20, 0.10), mat(0xfff0c8));
      shopping.position.set(0.22, 0.52, -0.27);
      accessory.add(shopping);
    } else if (style % 5 === 2) {
      const umbrella = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.56, 8), mat(0x4f6175));
      umbrella.position.set(0.24, 0.68, -0.25);
      umbrella.rotation.z = 0.32;
      const top = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 6), mat(0x8a6fb0));
      top.scale.set(1, 0.32, 1);
      top.position.set(0.33, 1.00, -0.25);
      accessory.add(umbrella, top);
    }
    group.add(body, scarf, head, hairCap, hat, brim, nose, leftEye, rightEye, mouth, glasses, bag, leftArm, rightArm, leftHand, rightHand, leftLeg, rightLeg, leftShoe, rightShoe, accessory);
    group.userData.parts = { body, head, leftArm, rightArm, leftHand, rightHand, leftLeg, rightLeg, leftShoe, rightShoe, bag, accessory };
    return group;
  }

  createAmbientCyclist(color, style = 0) {
    const group = this.createAmbientPedestrian(color, style);
    group.scale.setScalar(0.92);
    const wheelMat = mat(0x1f2938);
    const rear = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 8, 24), wheelMat);
    const front = rear.clone();
    rear.position.set(-0.42, 0.24, 0);
    front.position.set(0.48, 0.24, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.035, 0.04), mat(style % 2 ? 0xdddddd : 0xd9543f));
    frame.position.set(0.03, 0.52, 0);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.04, 0.36), mat(0x444444));
    handle.position.set(0.60, 0.72, 0);
    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.14, 0.24), mat(0xcaa66a));
    basket.position.set(0.68, 0.52, 0);
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.045, 0.22), mat(0x666666));
    rack.position.set(-0.48, 0.52, 0);
    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.48, 8), mat(0x555555));
    fork.position.set(0.47, 0.44, 0);
    fork.rotation.z = -0.22;
    const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.10, 8), mat(0x444444));
    crank.position.set(0.02, 0.40, 0);
    crank.rotation.x = Math.PI / 2;
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.025, 0.035), mat(0x333333));
    pedal.position.set(0.02, 0.40, 0);
    const handleStem = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.34, 8), mat(0x444444));
    handleStem.position.set(0.56, 0.62, 0);
    handleStem.rotation.z = -0.22;
    group.add(rear, front, frame, handle, basket, rack, fork, crank, pedal, handleStem);
    group.userData.wheels = [rear, front];
    group.userData.handle = handle;
    group.userData.basket = basket;
    group.userData.crank = crank;
    group.userData.pedal = pedal;
    group.userData.fork = fork;
    return group;
  }

  createAnimal(kind, color) {
    const group = new THREE.Group();
    const animalMat = mat(color);
    const dark = mat(0x2f2b28);
    const beakMat = mat(0xe7a93b);
    const isBird = kind === "sparrow" || kind === "duck";
    const isRabbit = kind === "rabbit";
    const body = new THREE.Mesh(new THREE.SphereGeometry(kind === "dog" ? 0.24 : isBird ? 0.14 : 0.19, 14, 9), animalMat);
    body.scale.set(kind === "dog" ? 1.35 : isBird ? 1.16 : 1.18, isBird ? 0.82 : 0.72, 0.72);
    body.position.y = isBird ? 0.25 : 0.28;
    const head = new THREE.Mesh(new THREE.SphereGeometry(kind === "dog" ? 0.14 : isBird ? 0.095 : 0.12, 12, 8), animalMat);
    head.position.set(isBird ? 0.20 : 0.24, isBird ? 0.36 : 0.37, 0);
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, kind === "dog" ? 0.28 : 0.20, 7), animalMat);
    tail.position.set(isBird ? -0.18 : -0.28, isBird ? 0.31 : 0.36, 0);
    tail.rotation.z = isBird ? Math.PI / 2.7 : Math.PI / 3;
    const eye1 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), dark);
    const eye2 = eye1.clone();
    eye1.position.set(head.position.x + 0.075, head.position.y + 0.025, -0.04);
    eye2.position.set(head.position.x + 0.075, head.position.y + 0.025, 0.04);
    const legs = [];
    for (let i = 0; i < 4; i += 1) {
      if (isBird && i > 1) break;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.18, 6), mat(isBird ? 0xd69a39 : color));
      leg.position.set(i < 2 ? 0.10 : -0.12, 0.12, i % 2 ? 0.09 : -0.09);
      legs.push(leg);
    }
    group.add(body, head, tail, eye1, eye2, ...legs);
    if (kind === "cat" || isRabbit) {
      const earGeo = new THREE.ConeGeometry(0.05, isRabbit ? 0.30 : 0.14, 8);
      const ear1 = new THREE.Mesh(earGeo, animalMat);
      const ear2 = ear1.clone();
      ear1.position.set(0.22, isRabbit ? 0.58 : 0.50, -0.055);
      ear2.position.set(0.22, isRabbit ? 0.58 : 0.50, 0.055);
      ear1.rotation.z = -0.18; ear2.rotation.z = -0.18;
      group.add(ear1, ear2);
    }
    if (kind === "dog") {
      const ear1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.055), mat(0x6a4d38));
      const ear2 = ear1.clone();
      ear1.position.set(0.20, 0.39, -0.12);
      ear2.position.set(0.20, 0.39, 0.12);
      group.add(ear1, ear2);
    }
    if (isBird) {
      const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.018, 0.055), mat(kind === "duck" ? 0xf5f1d0 : 0x6e573b));
      const wing2 = wing1.clone();
      wing1.position.set(-0.02, 0.29, -0.105);
      wing2.position.set(-0.02, 0.29, 0.105);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.10, 8), beakMat);
      beak.rotation.z = -Math.PI / 2;
      beak.position.set(0.305, head.position.y, 0);
      group.add(wing1, wing2, beak);
      group.userData.wings = [wing1, wing2];
    }
    group.userData.legs = legs;
    return group;
  }

  createInsect(kind, color) {
    const group = new THREE.Group();
    const bodyMat = mat(kind === "dragonfly" ? 0x3b5f75 : 0x3d3a34);
    const wingMat = transparentMat(color, kind === "dragonfly" ? 0.34 : 0.62);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, kind === "dragonfly" ? 0.34 : 0.16, 8), bodyMat);
    body.rotation.z = Math.PI / 2;
    const wingGeo = new THREE.PlaneGeometry(kind === "dragonfly" ? 0.24 : 0.18, kind === "dragonfly" ? 0.055 : 0.13);
    const w1 = new THREE.Mesh(wingGeo, wingMat);
    const w2 = w1.clone();
    const w3 = new THREE.Mesh(wingGeo, wingMat);
    const w4 = w3.clone();
    w1.position.set(0.02, 0.04, -0.06); w2.position.set(0.02, 0.04, 0.06);
    w3.position.set(-0.06, 0.04, -0.05); w4.position.set(-0.06, 0.04, 0.05);
    w1.rotation.y = 0.45; w2.rotation.y = -0.45; w3.rotation.y = -0.35; w4.rotation.y = 0.35;
    group.add(body, w1, w2, w3, w4);
    group.userData.wings = [w1, w2, w3, w4];
    return group;
  }

  updateAmbientLife(t, state) {
    this.floatingBits.forEach((item, i) => {
      item.bit.position.x = item.baseX + Math.sin(t * item.speed + item.phase) * item.drift;
      item.bit.position.z = item.baseZ + Math.cos(t * (item.speed * 0.8) + item.phase) * item.drift * 0.42;
      item.bit.position.y = item.baseY + Math.sin(t * 1.3 + item.phase) * 0.28;
      item.bit.rotation.y += 0.018 + (i % 4) * 0.003;
      item.bit.rotation.z += 0.012;
    });

    this.insects.forEach((item, i) => {
      const p = t * item.speed + item.phase;
      item.group.position.x = item.baseX + Math.sin(p) * item.radius;
      item.group.position.z = item.baseZ + Math.cos(p * 0.78) * item.radius * 0.72;
      item.group.position.y = item.baseY + Math.sin(p * 1.6) * 0.28;
      item.group.rotation.y = Math.atan2(Math.cos(p), Math.sin(p)) + Math.PI / 2;
      const wings = item.group.userData.wings || [];
      wings.forEach((wing, wi) => {
        wing.rotation.z = Math.sin(t * 18 + i + wi) * 0.32;
      });
    });

    const px = state?.player ? wx(state.player.x) : 9999;
    const pz = state?.player ? wz(state.player.y) : 9999;
    let near = null;
    let best = Infinity;

    this.animals.forEach((item, i) => {
      item.group.position.x = item.x + Math.sin(t * item.speed + item.phase) * item.range;
      item.group.position.z = item.z + Math.cos(t * item.speed * 0.7 + item.phase) * 1.8;
      item.group.rotation.y = Math.sin(t * item.speed + item.phase) > 0 ? 0 : Math.PI;
      item.group.position.y = Math.abs(Math.sin(t * 5 + i)) * 0.025;
      const parts = item.group.userData || {};
      (parts.legs || []).forEach((leg, li) => {
        leg.rotation.z = Math.sin(t * 5.5 + i + li) * 0.20;
      });
      (parts.wings || []).forEach((wing, wi) => {
        wing.rotation.x = Math.sin(t * 6 + i + wi) * 0.18;
      });
      const d = Math.hypot(item.group.position.x - px, item.group.position.z - pz);
      if (d < best && d < 5.8) { best = d; near = "animal"; }
    });

    this.passers.forEach((item, i) => {
      const length = Math.abs(item.end - item.start);
      const sign = item.end >= item.start ? 1 : -1;
      const phase = ((t * item.speed + item.phase * length) % length + length) % length;
      const along = item.start + sign * phase;
      if (item.dir === "h") {
        item.group.position.set(along, 0, item.lane + item.offset);
        item.group.rotation.y = sign > 0 ? 0 : Math.PI;
      } else {
        item.group.position.set(item.lane + item.offset, 0, along);
        item.group.rotation.y = sign > 0 ? -Math.PI / 2 : Math.PI / 2;
      }
      const parts = item.group.userData.parts || {};
      const stride = Math.max(2.4, item.speed * (item.kind === "cyclist" ? 3.1 : 1.75));
      const walkPhase = t * stride + i;
      const sin = Math.sin(walkPhase);
      const cos = Math.cos(walkPhase);
      if (item.kind === "cyclist") {
        item.group.position.y = 0;
        const cyclePhase = t * Math.max(5.8, item.speed * 2.25) + i;
        const cSin = Math.sin(cyclePhase);
        if (parts.body) { parts.body.rotation.x = 0.10; parts.body.rotation.z = Math.sin(t * 1.2 + i) * 0.018; }
        if (parts.leftLeg) { parts.leftLeg.rotation.z = 0.42 + cSin * 0.28; parts.leftLeg.position.set(-0.02, 0.40, -0.105); }
        if (parts.rightLeg) { parts.rightLeg.rotation.z = 0.42 - cSin * 0.28; parts.rightLeg.position.set(-0.02, 0.40, 0.105); }
        if (parts.leftArm) parts.leftArm.rotation.z = -0.78;
        if (parts.rightArm) parts.rightArm.rotation.z = -0.78;
        if (parts.leftHand) parts.leftHand.position.set(0.26, 0.72, -0.25);
        if (parts.rightHand) parts.rightHand.position.set(0.26, 0.72, 0.25);
        if (parts.leftShoe) parts.leftShoe.position.set(0.06, 0.18 + cSin * 0.055, -0.12);
        if (parts.rightShoe) parts.rightShoe.position.set(0.06, 0.18 - cSin * 0.055, 0.12);
        if (parts.bag) parts.bag.rotation.z = Math.sin(cyclePhase * 0.45) * 0.05;
        if (item.group.userData.wheels) item.group.userData.wheels.forEach((w) => (w.rotation.z = -cyclePhase));
        if (item.group.userData.crank) item.group.userData.crank.rotation.z = -cyclePhase;
        if (item.group.userData.pedal) item.group.userData.pedal.rotation.z = -cyclePhase;
        const steerWiggle = Math.sin(t * 1.35 + i) * 0.08;
        if (item.group.userData.handle) item.group.userData.handle.rotation.y = steerWiggle;
        if (item.group.userData.fork) item.group.userData.fork.rotation.y = steerWiggle * 0.7;
        if (item.group.userData.basket) item.group.userData.basket.rotation.y = steerWiggle * 0.45;
      } else {
        item.group.position.y = Math.abs(sin) * 0.030;
        if (parts.body) parts.body.rotation.z = sin * 0.025;
        if (parts.leftLeg) parts.leftLeg.rotation.z = sin * 0.34;
        if (parts.rightLeg) parts.rightLeg.rotation.z = -sin * 0.34;
        if (parts.leftArm) parts.leftArm.rotation.z = -sin * 0.26;
        if (parts.rightArm) parts.rightArm.rotation.z = sin * 0.26;
        if (parts.leftHand) parts.leftHand.position.x = 0.02 - sin * 0.055;
        if (parts.rightHand) parts.rightHand.position.x = 0.02 + sin * 0.055;
        if (parts.leftShoe) { parts.leftShoe.position.x = 0.035 + sin * 0.045; parts.leftShoe.position.y = 0.12 + Math.max(0, cos) * 0.025; }
        if (parts.rightShoe) { parts.rightShoe.position.x = 0.035 - sin * 0.045; parts.rightShoe.position.y = 0.12 + Math.max(0, -cos) * 0.025; }
        if (parts.bag) parts.bag.rotation.z = Math.sin(walkPhase * 0.7) * 0.08;
        if (parts.accessory) parts.accessory.rotation.z = Math.sin(walkPhase * 0.55) * 0.05;
      }
      const d = Math.hypot(item.group.position.x - px, item.group.position.z - pz);
      if (d < best && d < (item.kind === "cyclist" ? 8.0 : 6.8)) { best = d; near = item.kind; }
    });
    const hx = state?.player?.headingX ?? 1;
    const hz = state?.player?.headingY ?? 0;
    let nearestTraffic = null;
    let trafficBest = Infinity;
    this.passers.forEach((item) => {
      const vx = item.group.position.x - px;
      const vz = item.group.position.z - pz;
      const distance = Math.hypot(vx, vz);
      const ahead = distance > 0 ? ((vx / distance) * hx + (vz / distance) * hz) > 0.26 : false;
      const limit = item.kind === "cyclist" ? 11.2 : 8.6;
      if (ahead && distance < limit && distance < trafficBest) {
        trafficBest = distance;
        nearestTraffic = { kind: item.kind, distance, ahead };
      }
    });

    const trafficObstacles = this.passers.map((item, i) => ({
      id: `traffic-${i}`,
      type: "circle",
      x: item.group.position.x / WORLD_SCALE,
      y: item.group.position.z / WORLD_SCALE,
      r: item.kind === "cyclist" ? 118 : 82,
      kind: item.kind,
    }));

    this.lastAmbientInfo = {
      nearPasserby: near,
      distance: near ? best : Infinity,
      nearestTraffic,
      trafficObstacles,
      area: this.currentArea(px, pz),
      passerCount: this.passers.length,
      pedestrianCount: this.passers.filter((item) => item.kind === "pedestrian").length,
      cyclistCount: this.passers.filter((item) => item.kind === "cyclist").length,
      animalCount: this.animals.length,
      insectCount: this.insects.length,
    };
  }

  currentArea(px, pz) {
    const landmarks = this.worldLayout?.landmarks || {};
    const riverX = landmarks.riverX ?? -102;
    if (Math.abs(px - riverX) < 11) return "river";
    const [parkX, parkZ] = landmarks.park || [-78, 58];
    if (Math.hypot(px - parkX, pz - parkZ) < 18) return "park";
    const [shopX, shopZ] = landmarks.shop || [-70, -68];
    if (Math.hypot(px - shopX, pz - shopZ) < 18) return "shop";
    const [shrineX, shrineZ] = landmarks.shrine || [88, 58];
    if (Math.hypot(px - shrineX, pz - shrineZ) < 18) return "shrine";
    return "street";
  }

  addPlayer() {
    const group = new THREE.Group();
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.56, 6, 16), mat(0x2f7d5c));
    this.body.position.y = 0.92;
    this.body.castShadow = true;
    group.add(this.body);

    this.skirt = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.36, 14), mat(0xb86695));
    this.skirt.position.y = 0.68;
    this.skirt.castShadow = true;
    this.skirt.visible = false;
    group.add(this.skirt);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), mat(0xf0c08d));
    this.head.position.y = 1.42;
    this.head.castShadow = true;
    group.add(this.head);

    this.nose = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), mat(0xd89a73));
    this.nose.position.set(0.18, 1.42, 0);
    group.add(this.nose);

    const eyeMat = mat(0x2c2724);
    this.leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat);
    this.rightEye = this.leftEye.clone();
    this.leftEye.position.set(0.175, 0.045, -0.065);
    this.rightEye.position.set(0.175, 0.045, 0.065);
    this.leftBrow = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.010, 0.014), mat(0x5a5148));
    this.rightBrow = this.leftBrow.clone();
    this.leftBrow.position.set(0.172, 0.078, -0.066);
    this.rightBrow.position.set(0.172, 0.078, 0.066);
    this.leftBrow.rotation.x = -0.10;
    this.rightBrow.rotation.x = 0.10;
    this.leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 7), mat(0xe0a77b));
    this.rightEar = this.leftEar.clone();
    this.leftEar.position.set(-0.02, 0.005, -0.195);
    this.rightEar.position.set(-0.02, 0.005, 0.195);
    this.glasses = new THREE.Group();
    const glassMat = mat(0x6d6256);
    const gl1 = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.006, 6, 18), glassMat);
    const gl2 = gl1.clone();
    gl1.position.set(0.184, 0.040, -0.066);
    gl2.position.set(0.184, 0.040, 0.066);
    gl1.rotation.y = Math.PI / 2;
    gl2.rotation.y = Math.PI / 2;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.010, 0.060), glassMat);
    bridge.position.set(0.188, 0.040, 0);
    this.glasses.add(gl1, gl2, bridge);
    this.head.add(this.leftEye, this.rightEye, this.leftBrow, this.rightBrow, this.leftEar, this.rightEar, this.glasses);

    this.hair = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 10), mat(0x4a3a32));
    this.hair.position.set(-0.05, 1.43, 0);
    this.hair.scale.set(0.75, 0.95, 1.05);
    this.hair.visible = false;
    group.add(this.hair);

    this.mustache = new THREE.Group();
    const mustacheMat = mat(0x5a5148);
    const mustacheLeft = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.025, 0.035), mustacheMat);
    const mustacheRight = mustacheLeft.clone();
    mustacheLeft.position.set(0.202, 1.35, -0.045);
    mustacheRight.position.set(0.202, 1.35, 0.045);
    mustacheLeft.rotation.y = -0.18;
    mustacheRight.rotation.y = 0.18;
    this.mustache.add(mustacheLeft, mustacheRight);
    group.add(this.mustache);

    this.hat = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x716a63));
    this.hat.position.y = 1.55;
    group.add(this.hat);

    this.bag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.18), mat(0x7a5a3b));
    this.bag.position.set(-0.18, 0.9, 0.26);
    group.add(this.bag);

    this.collar = new THREE.Group();
    const collarLeft = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.09), mat(0xfffbef));
    const collarRight = collarLeft.clone();
    collarLeft.position.set(0.08, 1.17, -0.07);
    collarRight.position.set(0.08, 1.17, 0.07);
    collarLeft.rotation.z = -0.18;
    collarRight.rotation.z = 0.18;
    this.collar.add(collarLeft, collarRight);
    group.add(this.collar);

    this.walkParts.leftLeg = this.limb(0x3f5f73, 0, 0.38, -0.11);
    this.walkParts.rightLeg = this.limb(0x3f5f73, 0, 0.38, 0.11);
    this.walkParts.leftArm = this.limb(0x2f7d5c, 0, 0.95, -0.25, 0.08);
    this.walkParts.rightArm = this.limb(0x2f7d5c, 0, 0.95, 0.25, 0.08);
    this.walkParts.leftFoot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.055, 0.09), mat(0x2f2b28));
    this.walkParts.rightFoot = this.walkParts.leftFoot.clone();
    this.walkParts.leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(0xf0c08d));
    this.walkParts.rightHand = this.walkParts.leftHand.clone();
    this.walkParts.leftFoot.position.set(0.04, 0.12, -0.11);
    this.walkParts.rightFoot.position.set(0.04, 0.12, 0.11);
    this.walkParts.leftHand.position.set(0.05, 0.80, -0.31);
    this.walkParts.rightHand.position.set(0.05, 0.80, 0.31);
    group.add(
      this.walkParts.leftLeg,
      this.walkParts.rightLeg,
      this.walkParts.leftArm,
      this.walkParts.rightArm,
      this.walkParts.leftFoot,
      this.walkParts.rightFoot,
      this.walkParts.leftHand,
      this.walkParts.rightHand
    );

    this.heldPaper = this.createHeldPaper();
    group.add(this.heldPaper);

    this.bike = this.createBike();
    this.bike.visible = false;
    group.add(this.bike);
    this.paperReadyIcon = this.createPaperReadyIcon();
    this.paperReadyIcon.visible = false;
    group.add(this.paperReadyIcon);
    this.player = group;
    this.scene.add(group);
  }

  applyPlayerStyle(style = "male") {
    if (this.currentPlayerStyle === style) return;
    this.currentPlayerStyle = style;
    const female = style === "female";
    this.body.material.color.setHex(female ? 0xb86695 : 0x2f7d5c);
    this.hat.material.color.setHex(female ? 0x8a6fb0 : 0x716a63);
    this.bag.material.color.setHex(female ? 0x8b5e3c : 0x7a5a3b);
    this.skirt.visible = female;
    this.hair.visible = female;
    this.mustache.visible = !female;
    this.walkParts.leftLeg.material.color.setHex(female ? 0x5d6380 : 0x3f5f73);
    this.walkParts.rightLeg.material.color.setHex(female ? 0x5d6380 : 0x3f5f73);
    this.walkParts.leftArm.material.color.setHex(female ? 0xb86695 : 0x2f7d5c);
    this.walkParts.rightArm.material.color.setHex(female ? 0xb86695 : 0x2f7d5c);
    this.walkParts.leftHand.material.color.setHex(female ? 0xf2c7a2 : 0xf0c08d);
    this.walkParts.rightHand.material.color.setHex(female ? 0xf2c7a2 : 0xf0c08d);
    this.leftEar.material.color.setHex(female ? 0xf2c7a2 : 0xe0a77b);
    this.rightEar.material.color.setHex(female ? 0xf2c7a2 : 0xe0a77b);
    this.leftBrow.visible = !female;
    this.rightBrow.visible = !female;
    this.glasses.visible = !female || style === "female";
  }

  createHeldPaper() {
    const group = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.035, 0.32), mat(0xfffbef));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.04, 0.05), mat(0x2f6fb0));
    band.position.z = 0.012;
    const corner = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.038, 0.08), mat(0xe8e1ca));
    corner.position.set(0.17, 0.004, -0.10);
    group.add(paper, band, corner);
    group.rotation.set(0.25, 0.1, -0.18);
    return group;
  }

  createPaperReadyIcon() {
    const group = new THREE.Group();
    group.position.set(0, 2.2, 0);
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.055, 0.36), mat(0xfffbef));
    paper.rotation.z = -0.08;
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 0.055), mat(0x2f6fb0));
    band.position.z = 0.015;
    band.rotation.z = -0.08;
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.025, 8, 40), transparentMat(0xffd447, 0.86));
    halo.rotation.x = Math.PI / 2;
    const label = makeCanvasLabel(t("paperReadyLabel"), "#2f6fb0");
    label.position.set(0, 0.42, 0);
    label.scale.set(1.45, 0.45, 1);
    group.add(halo, paper, band, label);
    return group;
  }

  limb(color, x, y, z, radius = 0.06) { const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, 0.38, 4, 8), mat(color)); m.position.set(x, y, z); m.castShadow = true; return m; }

  cylinderBetween(a, b, radius, material) {
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const dir = new THREE.Vector3().subVectors(b, a);
    const length = dir.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 10), material);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.castShadow = true;
    return mesh;
  }

  createBike() {
    const group = new THREE.Group();
    group.position.set(0.08, 0.04, 0);
    const wheelMat = mat(0x1f2938, 0.58);
    const rimMat = mat(0xe8edf0, 0.45, 0.08);
    const frameMat = mat(0x2f6fb0, 0.55, 0.05);
    const metalMat = mat(0xd9e2e7, 0.4, 0.12);

    // 车轮沿前后方向排列；轮子平面是 X-Y，明显是二轮自行车而不是左右并排。
    const tireGeo = new THREE.TorusGeometry(0.36, 0.035, 12, 36);
    const rearWheel = new THREE.Mesh(tireGeo, wheelMat);
    const frontWheel = new THREE.Mesh(tireGeo, wheelMat);
    rearWheel.position.set(-0.72, 0.36, 0);
    frontWheel.position.set(0.82, 0.36, 0);
    rearWheel.castShadow = true;
    frontWheel.castShadow = true;
    this.addWheelDetails(rearWheel);
    this.addWheelDetails(frontWheel);
    group.add(rearWheel, frontWheel);

    const rimGeo = new THREE.TorusGeometry(0.25, 0.012, 8, 28);
    const rearRim = new THREE.Mesh(rimGeo, rimMat);
    const frontRim = new THREE.Mesh(rimGeo, rimMat);
    rearRim.position.copy(rearWheel.position);
    frontRim.position.copy(frontWheel.position);
    group.add(rearRim, frontRim);

    const rearHub = new THREE.Vector3(-0.72, 0.36, 0);
    const frontHub = new THREE.Vector3(0.82, 0.36, 0);
    const seatTube = new THREE.Vector3(-0.18, 0.86, 0);
    const handleTube = new THREE.Vector3(0.58, 0.92, 0);
    const bottomBracket = new THREE.Vector3(-0.04, 0.48, 0);
    [
      [rearHub, seatTube], [seatTube, handleTube], [handleTube, frontHub],
      [rearHub, bottomBracket], [bottomBracket, frontHub], [bottomBracket, seatTube]
    ].forEach(([a, b]) => group.add(this.cylinderBetween(a, b, 0.026, frameMat)));

    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.22), mat(0x3b2f2f));
    saddle.position.set(-0.2, 1.02, 0);
    saddle.castShadow = true;
    group.add(saddle);

    const seatPost = this.cylinderBetween(new THREE.Vector3(-0.18, 0.86, 0), new THREE.Vector3(-0.2, 1.02, 0), 0.022, metalMat);
    group.add(seatPost);

    const handlePost = this.cylinderBetween(new THREE.Vector3(0.58, 0.92, 0), new THREE.Vector3(0.78, 1.18, 0), 0.024, metalMat);
    const handleBar = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.62), metalMat);
    handleBar.position.set(0.82, 1.2, 0);
    group.add(handlePost, handleBar);

    const basket = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.42), mat(0xc49a6c));
    basket.position.set(1.02, 0.86, 0);
    basket.castShadow = true;
    group.add(basket);

    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.34), metalMat);
    rack.position.set(-0.78, 0.78, 0);
    group.add(rack);

    const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 14), mat(0x444444));
    crank.position.set(-0.04, 0.48, 0.02);
    crank.rotation.x = Math.PI / 2;
    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.045, 0.08), mat(0x333333));
    pedal.position.set(-0.04, 0.48, 0.08);
    group.add(crank, pedal);

    group.userData = { rearWheel, frontWheel, rearRim, frontRim, pedal, crank, handleBar, basket };
    return group;
  }

  addWheelDetails(wheel) {
    const spokeMat = mat(0xe8edf0, 0.42, 0.15);
    const spokeA = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.012), spokeMat);
    const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.015, 0.012), spokeMat);
    spokeB.rotation.z = Math.PI / 2;
    const valve = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 0.022), mat(0xfff4b8));
    valve.position.y = 0.30;
    wheel.add(spokeA, spokeB, valve);
  }

  addTargetMarker() {
    this.targetRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.085, 12, 128), transparentMat(0xffa500, 1.0)); this.targetRing.rotation.x = Math.PI / 2; this.scene.add(this.targetRing);
    this.targetBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.35, 8.0, 40, 1, true), transparentMat(0xffc247, 0.34)); this.targetBeam.position.y = 4.0; this.scene.add(this.targetBeam);
  }

  addNavigationArrows() {
    const shape = new THREE.Shape();
    shape.moveTo(2.2, 0);
    shape.lineTo(0.7, -1.0);
    shape.lineTo(0.7, -0.42);
    shape.lineTo(-2.2, -0.42);
    shape.lineTo(-2.2, 0.42);
    shape.lineTo(0.7, 0.42);
    shape.lineTo(0.7, 1.0);
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    for (let i = 0; i < NAV_ARROW_COUNT; i += 1) {
      const color = i % 3 === 1 ? 0xfff04a : 0x00d7ff;
      const opacity = Math.max(0.42, 0.94 - i * 0.045);
      const arrow = new THREE.Mesh(geometry, transparentMat(color, opacity));
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.y = 0.13 + i * 0.01;
      arrow.scale.setScalar(Math.max(0.46, 1.0 - i * 0.045));
      arrow.visible = false;
      this.scene.add(arrow);
      this.navigationArrows.push(arrow);
    }
  }

  updateNavigationArrows(state) {
    const target = currentTarget(state);
    const visible = Boolean(target && state.isPlaying);
    this.navigationArrows.forEach((arrow) => (arrow.visible = visible));
    if (!visible) return;

    const px = wx(state.player.x);
    const pz = wz(state.player.y);
    const deliveryX = wx(target.deliveryX ?? target.x);
    const deliveryZ = wz(target.deliveryY ?? target.y);
    const ringX = this.targetRing?.position.x ?? wx(target.x);
    const ringZ = this.targetRing?.position.z ?? wz(target.y);
    const distToRing = Math.hypot(ringX - px, ringZ - pz);
    const nearTarget = distToRing < 13.5 || canDeliverNow(state);
    const path = buildRoadPath(px, pz, deliveryX, deliveryZ);
    const total = path.reduce((sum, p, i) => {
      if (i === 0) return 0;
      return sum + Math.hypot(p.x - path[i - 1].x, p.z - path[i - 1].z);
    }, 0);

    // 箭头沿道路中心线排布，再最后进入路边投递点；不再直线穿过房屋。
    this.navigationArrows.forEach((arrow, i) => {
      let sample = samplePath(path, Math.min(total, 4.2 + i * 7.2));
      if (nearTarget) {
        const dist = 2.0 + i * 3.9;
        const angle = orthogonalAngleToward(px, pz, ringX, ringZ);
        const dx = Math.cos(-angle);
        const dz = Math.sin(-angle);
        sample = { x: px + dx * Math.min(dist, distToRing), z: pz + dz * Math.min(dist, distToRing), angle };
      }
      if (!sample) { arrow.visible = false; return; }
      arrow.visible = true;
      arrow.position.x = sample.x;
      arrow.position.z = sample.z;
      arrow.rotation.z = sample.angle;
      const distToTarget = nearTarget ? distToRing : Math.hypot(deliveryX - px, deliveryZ - pz);
      const proximity = Math.max(0, Math.min(1, 1 - distToTarget / 38));
      const pulse = 1 + Math.sin((state.floatTime || 0) * 4 + i) * 0.08;
      const base = Math.max(0.48, 0.9 + proximity * 0.26 - i * 0.035);
      arrow.scale.setScalar(base * pulse);
    });
  }

  addNewspaperProjectile() {
    const group = new THREE.Group();
    const paper = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.035, 0.28), mat(0xf7f2df));
    const band = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.038, 0.045), mat(0x334b6d));
    band.position.z = 0.01;
    group.add(paper, band);
    group.visible = false;
    this.newspaper = group;
    this.scene.add(group);
  }

  addReactionSprite() {
    this.reactionSprite = makeCanvasLabel(t("thanksLabel"), "#d94a4a");
    this.reactionSprite.visible = false;
    this.reactionSprite.scale.set(4.2, 1.25, 1);
    this.scene.add(this.reactionSprite);
  }

  updateProjectile(state) {
    if (!this.newspaper) return;
    const delivery = state.delivery;
    if (!delivery?.active) {
      this.newspaper.visible = false;
      return;
    }
    const t = Math.min(1, delivery.t || 0);
    const sx = wx(delivery.start.x);
    const sz = wz(delivery.start.y);
    const ex = wx(delivery.end.x);
    const ez = wz(delivery.end.y);
    this.newspaper.visible = true;
    this.newspaper.position.set(
      sx + (ex - sx) * t,
      0.85 + Math.sin(t * Math.PI) * 3.2,
      sz + (ez - sz) * t
    );
    this.newspaper.rotation.y += 0.32;
    this.newspaper.rotation.x += 0.18;
  }

  updateHouseReaction(state) {
    if (this.reactionSprite) this.reactionSprite.visible = false;
    this.houseMap.forEach((group) => {
      group.scale.lerp(new THREE.Vector3(1, 1, 1), 0.18);
      const parts = group.userData.reactionParts || {};
      Object.values(parts).forEach((part) => { if (part) part.visible = false; });
    });
    const reaction = state.houseReaction;
    if (!reaction) return;
    const group = this.houseMap.get(reaction.id);
    if (!group) return;
    const pulse = 1 + Math.sin((state.floatTime || 0) * 18) * 0.045;
    group.scale.setScalar(pulse);
    const parts = group.userData.reactionParts || {};
    const bob = Math.sin((state.floatTime || 0) * 10) * 0.08;
    if (reaction.type === "window" && parts.windowGlow) {
      parts.windowGlow.visible = true;
      parts.windowGlow.material.opacity = 0.52 + Math.sin((state.floatTime || 0) * 8) * 0.14;
    }
    if ((reaction.type === "door" || reaction.type === "resident") && parts.doorPanel) {
      parts.doorPanel.visible = true;
      parts.doorPanel.rotation.y = -0.7;
    }
    if ((reaction.type === "door" || reaction.type === "resident") && parts.resident) {
      parts.resident.visible = true;
      parts.resident.position.y = Math.max(0, bob);
      const arm = parts.resident.children?.[3];
      if (arm) arm.rotation.z = -0.8 + Math.sin((state.floatTime || 0) * 12) * 0.36;
    }
    if (reaction.type === "cat" && parts.cat) {
      parts.cat.visible = true;
      parts.cat.position.y = 0.12 + Math.abs(Math.sin((state.floatTime || 0) * 7)) * 0.08;
      parts.cat.rotation.y = Math.sin((state.floatTime || 0) * 5) * 0.18;
    }
    if (this.reactionSprite) {
      this.reactionSprite.visible = true;
      this.reactionSprite.position.set(group.position.x, 6.8 + Math.sin((state.floatTime || 0) * 8) * 0.25, group.position.z);
    }
  }

  updatePlayer(state) {
    if (!this.player) return;
    this.applyPlayerStyle(state.playerStyle || "male");
    this.player.position.set(wx(state.player.x), 0, wz(state.player.y));
    const dx = state.player.headingX || 0.65; const dz = state.player.headingY || 0.76;
    this.player.rotation.y = Math.atan2(-dz, dx);
    const bikeMode = state.config?.moveMode === "bike"; this.bike.visible = bikeMode;
    const touchThrottle = state.touchThrottle || 0;
    const touchSteer = state.touchSteer || 0;
    const autoMoving = Boolean(state.autoNavMoving && !state.autoAvoiding);
    const forward = state.keys.has("arrowup") || state.keys.has("w") || touchThrottle > 0.05 || autoMoving;
    const backward = state.keys.has("arrowdown") || state.keys.has("s") || touchThrottle < -0.05;
    const keyTurn = (state.keys.has("arrowright") || state.keys.has("d") ? 1 : 0) - (state.keys.has("arrowleft") || state.keys.has("a") ? 1 : 0);
    const turnInput = THREE.MathUtils.clamp(keyTurn + touchSteer, -1, 1);
    const pedaling = bikeMode && (forward || backward);
    const throttle = state.keys.has("arrowup") || state.keys.has("w")
      ? 1
      : state.keys.has("arrowdown") || state.keys.has("s")
        ? -0.42
        : autoMoving
          ? (state.easyMode ? 0.48 : 0.72)
        : touchThrottle > 0
          ? touchThrottle
          : touchThrottle * 0.42;
    const animDt = Math.min(0.05, Math.max(0, (state.floatTime || 0) - this.lastBikeAnimTime));
    this.lastBikeAnimTime = state.floatTime || 0;
    if (pedaling) this.bikeRoll += throttle * animDt * ((state.config?.speed || 430) * WORLD_SCALE / 0.36);

    const moving = forward || backward;
    if (!bikeMode && moving) {
      const walkSpeed = Math.max(60, state.config?.speed || 145);
      const direction = backward ? 0.55 : 1;
      this.walkCycle += animDt * walkSpeed * WORLD_SCALE * 1.95 * direction;
    }
    const t = bikeMode ? this.bikeRoll : this.walkCycle;
    const step = moving ? Math.sin(t) * 0.35 : 0;

    this.walkParts.leftLeg.visible = true;
    this.walkParts.rightLeg.visible = true;
    this.walkParts.leftArm.visible = true;
    this.walkParts.rightArm.visible = true;
    this.walkParts.leftFoot.visible = true;
    this.walkParts.rightFoot.visible = true;
    this.walkParts.leftHand.visible = true;
    this.walkParts.rightHand.visible = true;

    if (bikeMode) {
      const pedalCycle = this.bikeRoll;
      const parts = this.bike.userData || {};
      if (parts.rearWheel) parts.rearWheel.rotation.z = -this.bikeRoll;
      if (parts.frontWheel) parts.frontWheel.rotation.z = -this.bikeRoll;
      if (parts.rearRim) parts.rearRim.rotation.z = -this.bikeRoll;
      if (parts.frontRim) parts.frontRim.rotation.z = -this.bikeRoll;
      if (parts.pedal) {
        parts.pedal.rotation.z = -pedalCycle * 1.65;
        parts.pedal.position.y = 0.48 + Math.sin(pedalCycle * 1.65) * 0.085;
      }
      if (parts.crank) parts.crank.rotation.z = -pedalCycle * 1.65;
      // 操作层面的左 / 右已经正确，这里只修正车把和前轮的视觉转向方向。
      const steer = THREE.MathUtils.lerp(parts.steerAngle || 0, -turnInput * 0.62, 0.28);
      parts.steerAngle = steer;
      if (Math.abs(turnInput) > 0.08) parts.stopFootSide = turnInput > 0 ? "right" : "left";
      if (!parts.stopFootSide) parts.stopFootSide = "left";
      if (parts.frontWheel) parts.frontWheel.rotation.y = steer;
      if (parts.frontRim) parts.frontRim.rotation.y = steer;
      if (parts.handleBar) parts.handleBar.rotation.y = steer * 1.15;
      if (parts.basket) parts.basket.rotation.y = steer * 0.65;

      const legSwing = pedaling ? Math.sin(pedalCycle * 1.65) : 0;
      const armSettle = pedaling ? Math.sin(pedalCycle * 0.82) * 0.025 : 0;
      const sideLean = pedaling ? THREE.MathUtils.clamp(-steer * 0.20, -0.14, 0.14) : (parts.stopFootSide === "right" ? 0.045 : -0.045);
      this.body.position.y = pedaling ? 1.00 + Math.abs(legSwing) * 0.018 : 0.97;
      this.body.rotation.z = pedaling ? -0.18 + sideLean * 0.62 : -0.10 + sideLean * 0.45;
      this.body.rotation.x = pedaling ? 0.10 : 0.04;
      this.head.position.set(0.08, 1.47 + Math.abs(legSwing) * 0.012, 0);
      this.nose.position.set(0.26, 1.47 + Math.abs(legSwing) * 0.012, 0);
      this.hair.position.set(-0.08, 1.47 + Math.abs(legSwing) * 0.012, 0);
      this.hat.position.set(0.08, 1.60 + Math.abs(legSwing) * 0.012, 0);
      this.bag.position.set(-0.50, 0.88, 0.24);
      this.bag.rotation.z = 0.08 + armSettle;

      if (pedaling) {
        this.walkParts.leftLeg.position.set(-0.04, 0.55, -0.12);
        this.walkParts.rightLeg.position.set(0.10, 0.55, 0.12);
        this.walkParts.leftLeg.rotation.set(0.10, 0, 0.46 + legSwing * 0.35);
        this.walkParts.rightLeg.rotation.set(0.10, 0, 0.46 - legSwing * 0.35);
        this.walkParts.leftFoot.position.set(0.07, 0.32 + Math.sin(pedalCycle * 1.65) * 0.08, -0.20);
        this.walkParts.rightFoot.position.set(0.14, 0.32 - Math.sin(pedalCycle * 1.65) * 0.08, 0.20);
        this.walkParts.leftFoot.rotation.set(0, 0, 0.22 + legSwing * 0.12);
        this.walkParts.rightFoot.rotation.set(0, 0, 0.22 - legSwing * 0.12);
      } else {
        // 停车时按最后一次偏向放下对应侧脚，另一只脚仍留在脚踏附近。
        if (parts.stopFootSide === "right") {
          this.walkParts.leftLeg.position.set(-0.04, 0.55, -0.12);
          this.walkParts.rightLeg.position.set(0.16, 0.34, 0.32);
          this.walkParts.leftLeg.rotation.set(0.10, 0, 0.42);
          this.walkParts.rightLeg.rotation.set(0.02, -0.06, 0.08);
          this.walkParts.leftFoot.position.set(0.07, 0.32, -0.20);
          this.walkParts.rightFoot.position.set(0.18, 0.075, 0.38);
          this.walkParts.leftFoot.rotation.set(0, 0, 0.18);
          this.walkParts.rightFoot.rotation.set(0, 0, 0.03);
        } else {
          this.walkParts.leftLeg.position.set(-0.12, 0.34, -0.32);
          this.walkParts.rightLeg.position.set(0.11, 0.55, 0.12);
          this.walkParts.leftLeg.rotation.set(0.02, 0.06, 0.08);
          this.walkParts.rightLeg.rotation.set(0.10, 0, 0.42);
          this.walkParts.leftFoot.position.set(-0.08, 0.075, -0.38);
          this.walkParts.rightFoot.position.set(0.16, 0.32, 0.20);
          this.walkParts.leftFoot.rotation.set(0, 0, 0.03);
          this.walkParts.rightFoot.rotation.set(0, 0, 0.18);
        }
      }
      this.walkParts.leftArm.position.set(0.34, 1.02, -0.20);
      this.walkParts.rightArm.position.set(0.34, 1.02, 0.20);
      this.walkParts.leftArm.rotation.set(0.12 + armSettle, 0, -0.85);
      this.walkParts.rightArm.rotation.set(0.12 - armSettle, 0, -0.85);
      this.walkParts.leftHand.position.set(0.59, 0.88 + armSettle, -0.24);
      this.walkParts.rightHand.position.set(0.59, 0.88 - armSettle, 0.24);
      this.heldPaper.position.set(0.62, 1.02 + Math.abs(legSwing) * 0.012, -0.28);
      this.heldPaper.rotation.set(0.22, 0.15, -0.30);
      this.skirt.position.set(-0.02, 0.73, 0);
      this.skirt.rotation.set(0.10, 0, -0.08);
      this.bike.rotation.z = pedaling ? Math.sin(pedalCycle * 0.5) * 0.018 + sideLean : sideLean;
    } else {
      this.body.position.y = 0.92;
      this.body.rotation.z = 0;
      this.body.rotation.x = 0;
      this.head.position.set(0, 1.42, 0);
      this.nose.position.set(0.18, 1.42, 0);
      this.hair.position.set(-0.05, 1.43, 0);
      this.hat.position.set(0, 1.55, 0);
      this.bag.position.set(-0.18, 0.9, 0.26);
      this.bag.rotation.z = 0;
      this.walkParts.leftLeg.position.set(0, 0.38, -0.11);
      this.walkParts.rightLeg.position.set(0, 0.38, 0.11);
      this.walkParts.leftArm.position.set(0.02, 0.95, -0.25);
      this.walkParts.rightArm.position.set(0.02, 0.95, 0.25);
      this.walkParts.leftFoot.position.set(0.04 + step * 0.06, 0.12, -0.11);
      this.walkParts.rightFoot.position.set(0.04 - step * 0.06, 0.12, 0.11);
      this.walkParts.leftHand.position.set(0.05 - step * 0.08, 0.76, -0.31);
      this.walkParts.rightHand.position.set(0.05 + step * 0.08, 0.76, 0.31);
      this.walkParts.leftLeg.rotation.set(0, 0, step);
      this.walkParts.rightLeg.rotation.set(0, 0, -step);
      this.walkParts.leftArm.rotation.set(0, 0, -step * 0.7);
      this.walkParts.rightArm.rotation.set(0, 0, step * 0.7);
      this.walkParts.leftFoot.rotation.set(0, 0, step * 0.18);
      this.walkParts.rightFoot.rotation.set(0, 0, -step * 0.18);
      this.heldPaper.position.set(0.34, 0.93 + Math.abs(step) * 0.025, -0.29);
      this.heldPaper.rotation.set(0.22, 0.2, -0.26);
      this.skirt.position.set(0, 0.68, 0);
      this.skirt.rotation.set(0, 0, 0);
    }
    if (this.paperReadyIcon) {
      const ready = canDeliverNow(state);
      this.paperReadyIcon.visible = ready;
      if (ready) {
        this.paperReadyIcon.position.y = 2.18 + Math.sin((state.floatTime || 0) * 5) * 0.08;
        this.paperReadyIcon.rotation.y = -this.player.rotation.y;
        this.paperReadyIcon.scale.setScalar(1 + Math.sin((state.floatTime || 0) * 6) * 0.055);
      }
    }
  }

  updateTarget(state) {
    const target = currentTarget(state); const visible = Boolean(target && state.isPlaying); this.targetRing.visible = visible; this.targetBeam.visible = visible; if (!visible) return;
    // 视觉光圈严格以目标房屋组的中心为准；实际投递判定仍在可到达的路边点。
    const house = this.houseMap.get(target.id);
    const x = house?.position.x ?? wx(target.x);
    const z = house?.position.z ?? wz(target.y);
    const radius = 8.3;
    if (this.lastTargetId !== target.id) {
      this.lastTargetId = target.id;
      this.lastTargetScale = 1;
    }
    const ringColor = Number.parseInt((target.roof || "#ffa500").slice(1), 16);
    this.targetRing.material.color.setHex(ringColor);
    this.targetBeam.material.color.setHex(ringColor);
    this.targetRing.position.set(x, 0.12, z); this.targetRing.scale.setScalar(radius); this.targetBeam.position.set(x, 4.0, z);
  }

  registerOccluder(group) {
    group.traverse((child) => {
      if (!child.isMesh) return;
      if (child.material) child.material = Array.isArray(child.material) ? child.material.map((m) => m.clone()) : child.material.clone();
      child.userData.occluder = true;
      this.occluderMeshes.push(child);
    });
  }

  setOccluderOpacity(mesh, opacity) {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      if (!material) return;
      if (material.userData.baseOpacity === undefined) {
        material.userData.baseOpacity = material.opacity ?? 1;
        material.userData.baseDepthWrite = material.depthWrite;
      }
      material.transparent = opacity < 0.99;
      material.opacity = material.userData.baseOpacity * opacity;
      material.depthWrite = opacity < 0.99 ? false : material.userData.baseDepthWrite;
      material.needsUpdate = true;
    });
  }

  updateOccluders() {
    this.fadedOccluders.forEach((mesh) => this.setOccluderOpacity(mesh, 1));
    this.fadedOccluders.clear();
    if (!this.player || !this.occluderMeshes.length) return;

    const target = this.player.position.clone();
    target.y += 0.95;
    const from = this.camera.position.clone();
    const direction = target.clone().sub(from);
    const distance = direction.length();
    if (distance <= 0.1) return;
    direction.normalize();
    this.raycaster.set(from, direction);
    this.raycaster.near = 0.1;
    this.raycaster.far = Math.max(0.1, distance - 0.35);

    const hits = this.raycaster.intersectObjects(this.occluderMeshes, false);
    hits.forEach((hit) => {
      this.fadedOccluders.add(hit.object);
      this.setOccluderOpacity(hit.object, 0.34);
    });
  }

  updateCamera(state) {
    const px = wx(state.player.x); const pz = wz(state.player.y);
    const dx = state.player.headingX || 0.78; const dz = state.player.headingY || 0.62;
    const distance = state.config?.moveMode === "bike" ? 7.2 : 6.4;
    const height = state.config?.moveMode === "bike" ? 2.65 : 2.45;
    if (state.screen === "title") {
      const t = state.floatTime || 0;
      const desiredTitle = new THREE.Vector3(
        Math.sin(t * 0.08) * 34,
        42,
        78 + Math.cos(t * 0.07) * 10
      );
      this.camera.position.lerp(desiredTitle, 0.045);
      this.camera.lookAt(0, 0.5, 0);
      return;
    }
    if (!state.isPlaying) {
      const desiredHome = new THREE.Vector3(px - dx * 8.0, 4.2, pz - dz * 8.0);
      this.camera.position.lerp(desiredHome, 0.04);
      this.camera.lookAt(px + dx * 3.5, 0.55, pz + dz * 3.5);
      return;
    }
    const desired = new THREE.Vector3(px - dx * distance, height, pz - dz * distance);
    this.camera.position.lerp(desired, 0.075);
    this.camera.lookAt(px + dx * 2.8, 0.55, pz + dz * 2.8);
  }

  updateAnimatedObjects(t, state) {
    this.updateAmbientLife(t, state);
    if (this.targetRing?.visible) { const pulse = 1 + Math.sin(t * 3) * 0.045; this.targetRing.scale.multiplyScalar(pulse / this.lastTargetScale); this.lastTargetScale = pulse; this.targetBeam.material.opacity = 0.24 + Math.sin(t * 2.4) * 0.06; } else this.lastTargetScale = 1;
    this.clockObjects.forEach((obj, i) => { obj.rotation.y = Math.sin(t * 0.35 + i) * 0.045; });
    this.clouds.forEach((item) => { item.group.position.x = item.baseX + Math.sin(t * item.speed + item.phase) * item.amplitude; });
    this.birds.forEach((item) => { item.bird.position.x = item.baseX + Math.sin(t * item.speed + item.phase) * 5.5; item.bird.position.y += Math.sin(t * 0.8 + item.phase) * 0.002; });
  }

  addPlane(x, y, z, w, d, color, rot = 0) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat(color)); mesh.position.set(x, y, z); mesh.rotation.y = rot; mesh.receiveShadow = true; this.scene.add(mesh); return mesh; }
  addTree(x, z, sakura = false, scale = 1) { const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.13,0.88,10), mat(COLORS.wood)); trunk.position.y=0.44; trunk.castShadow=true; group.add(trunk); const crownColor=sakura?0xffbdd0:0x6fb96e; for(let i=0;i<5;i++){ const c=new THREE.Mesh(new THREE.SphereGeometry(0.43,16,12), mat(crownColor)); c.position.set(Math.cos(i*1.3)*0.23,1.04+(i%2)*0.13,Math.sin(i*1.7)*0.23); c.castShadow=true; group.add(c); this.clockObjects.push(c);} this.scene.add(group); }
  addBench(x,z){ const g=new THREE.Group(); g.position.set(x,0,z); const s=new THREE.Mesh(new THREE.BoxGeometry(1,0.12,0.24),mat(COLORS.wood)); s.position.y=0.35; const b=new THREE.Mesh(new THREE.BoxGeometry(1,0.12,0.2),mat(COLORS.wood)); b.position.set(0,0.58,-0.16); g.add(s,b); this.scene.add(g); }
  addVending(x,z){ const body=new THREE.Mesh(new THREE.BoxGeometry(0.65,1.3,0.42),mat(0xd94a4a)); body.position.set(x,0.67,z); body.castShadow=true; this.scene.add(body); const panel=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.025),mat(0xfff4e4)); panel.position.set(x,0.95,z+0.225); this.scene.add(panel); }
  addShop(x,z){ const g=new THREE.Group(); g.position.set(x,0,z); this.addHouseParts(g,0x516c9c,0xffefcf,0x6a523d,3.0); const curtain=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.24,0.05),mat(0x3d79b7)); curtain.position.set(0,1.15,0.88); g.add(curtain); const label=makeCanvasLabel(sceneLabel("shop"), "#345f86"); label.position.set(0,6.4,0.4); g.add(label); this.registerOccluder(g); this.scene.add(g); }
  addBusStop(x,z){ this.addSign(x,z,sceneLabel("bus")); const roof=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.09,0.55),mat(0x4e8fd6)); roof.position.set(x+0.62,0.95,z); this.scene.add(roof); }
  addField(x,z){ this.addPlane(x,0.055,z,12,8,0xb6d981,0.04); for(let i=0;i<8;i++) this.addPlane(x-5+i*1.4,0.08,z,0.12,7,0x8fbc66,0.04); }
  addTorii(x,z){
    const red=mat(0xd9543f);
    const black=mat(0x2f2b28);
    const stone=mat(COLORS.stone);
    const wood=mat(0x6f3f2e);
    const g=new THREE.Group();
    g.position.set(x,0,z);
    const base=new THREE.Mesh(new THREE.BoxGeometry(5.8,0.22,1.1),stone);
    base.position.set(0,0.11,0.12);
    const p1=new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.26,4.6,16),red);
    const p2=p1.clone();
    p1.position.set(-1.65,2.42,0);
    p2.position.set(1.65,2.42,0);
    const top=new THREE.Mesh(new THREE.BoxGeometry(5.2,0.34,0.46),red);
    top.position.set(0,4.72,0);
    const cap=new THREE.Mesh(new THREE.BoxGeometry(5.85,0.18,0.62),black);
    cap.position.set(0,4.98,0);
    const mid=new THREE.Mesh(new THREE.BoxGeometry(3.9,0.24,0.38),red);
    mid.position.set(0,3.82,0);
    const plaque=new THREE.Mesh(new THREE.BoxGeometry(0.70,0.52,0.08),wood);
    plaque.position.set(0,4.20,0.25);
    const shrineBody=new THREE.Mesh(new THREE.BoxGeometry(3.8,2.2,2.7),mat(0xf2e2c7));
    shrineBody.position.set(0,1.25,4.1);
    const shrineRoof=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.42,3.3),mat(0x5b4a3d));
    shrineRoof.position.set(0,2.58,4.1);
    const steps=new THREE.Mesh(new THREE.BoxGeometry(3.2,0.18,1.6),stone);
    steps.position.set(0,0.16,2.1);
    g.add(base,p1,p2,top,cap,mid,plaque,shrineBody,shrineRoof,steps);
    this.registerOccluder(g);
    this.scene.add(g);
  }
  addStoneLantern(x,z){ const g=new THREE.Group(); g.position.set(x,0,z); const stone=mat(COLORS.stone); const base=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.18,0.36),stone); base.position.y=0.09; const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.08,0.65,8),stone); pole.position.y=0.48; const top=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.25,0.4),stone); top.position.y=0.86; g.add(base,pole,top); this.scene.add(g); }
  addUtilityPole(x,z){
    const wood = mat(COLORS.wood);
    const wireMat = mat(0x2f3338);
    const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,2.8,12),wood);
    pole.position.set(x,1.4,z);
    pole.castShadow=true;
    this.scene.add(pole);
    const arm=new THREE.Mesh(new THREE.BoxGeometry(1.36,0.07,0.07),wood);
    arm.position.set(x,2.55,z);
    const arm2=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.06,1.08),wood);
    arm2.position.set(x,2.37,z);
    const transformer=new THREE.Mesh(new THREE.CylinderGeometry(0.17,0.17,0.30,12),mat(0x7d8588));
    transformer.position.set(x+0.36,2.28,z);
    transformer.rotation.z=Math.PI/2;
    this.scene.add(arm,arm2,transformer);
    this.markEraDetail(pole, arm, arm2, transformer);

    for (const [dy, dz, len] of [[0.18, -0.23, 4.4], [0.06, 0, 4.0], [-0.06, 0.23, 4.4]]) {
      const wire = new THREE.Mesh(new THREE.BoxGeometry(len,0.018,0.018),wireMat);
      wire.position.set(x,2.55+dy,z+dz);
      this.scene.add(wire);
      this.markEraDetail(wire);
    }
    for (const [dx, dy, len] of [[-0.34, 0.02, 1.7], [0.34, -0.04, 1.55]]) {
      const sideWire = new THREE.Mesh(new THREE.BoxGeometry(0.018,0.018,len),wireMat);
      sideWire.position.set(x+dx,2.36+dy,z);
      this.scene.add(sideWire);
      this.markEraDetail(sideWire);
    }
  }
  addSign(x,z,text){ const sign=this.makeSign(text,0.95,0.58); sign.position.set(x,0,z); this.scene.add(sign); }
  makeSign(text,w,h){ const g=new THREE.Group(); const board=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.08),mat(0x5d7b57)); board.position.y=0.95; g.add(board); const post=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.82,8),mat(COLORS.wood)); post.position.y=0.42; g.add(post); const label=makeCanvasLabel(text,"#fff7db"); label.position.set(0,0.98,0.08); label.scale.set(w*1.2,h*0.5,1); g.add(label); return g; }
}




