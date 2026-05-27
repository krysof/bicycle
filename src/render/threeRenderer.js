import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { neighbors } from "../data/neighbors.js";
import { currentTarget } from "../state/gameState.js";

const WORLD_SCALE = 1 / 45;
const MAP_W = 235;
const MAP_D = 178;
const COLORS = {
  grass: 0xbfe6a6,
  grass2: 0xa9d88e,
  road: 0xd2c0a3,
  path: 0xc7ad84,
  water: 0x8ecae6,
  wood: 0x76543b,
  stone: 0xb8b3a5,
  white: 0xfffbef,
};

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
function makeCanvasLabel(text, color = "#2f5f49") {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 160;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,251,236,.94)"; ctx.strokeStyle = "rgba(94,70,39,.18)"; ctx.lineWidth = 10;
  roundRect(ctx, 18, 34, 476, 92, 30); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.font = "700 48px Yu Gothic, Microsoft YaHei, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, 256, 80);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(3.8, 1.18, 1);
  return sprite;
}
function colorFromIndex(i, list) { return list[Math.abs(i) % list.length]; }

export class ThreeRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xbfe5ff);
    this.scene.fog = new THREE.Fog(0xdff2ff, 68, 190);

    this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 260);
    this.camera.position.set(-100, 38, -65);
    this.camera.lookAt(-95, 1, -60);

    this.clockObjects = [];
    this.houseMap = new Map();
    this.targetRing = null;
    this.targetBeam = null;
    this.player = null;
    this.walkParts = {};
    this.bike = null;
    this.lastTargetScale = 1;

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
    this.updateCamera(state);
    this.updateAnimatedObjects(state.floatTime, state);
    this.renderer.render(this.scene, this.camera);
  }

  createWorld() {
    this.addLights();
    this.addGround();
    this.addRoadNetwork();
    this.addTargetHouses();
    this.addProceduralTown();
    this.addLandmarks();
    this.addPlayer();
    this.addTargetMarker();
  }

  addLights() {
    this.scene.add(new THREE.HemisphereLight(0xfffff5, 0x8fc486, 2.4));
    const sun = new THREE.DirectionalLight(0xffefc0, 2.7);
    sun.position.set(-35, 55, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -120; sun.shadow.camera.right = 120; sun.shadow.camera.top = 100; sun.shadow.camera.bottom = -100;
    this.scene.add(sun);
  }

  addGround() {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(MAP_W, 0.28, MAP_D), mat(COLORS.grass));
    ground.position.y = -0.16; ground.receiveShadow = true; this.scene.add(ground);
    const border = new THREE.Mesh(new THREE.BoxGeometry(MAP_W + 2, 0.16, MAP_D + 2), mat(COLORS.grass2));
    border.position.y = -0.3; this.scene.add(border);

    // 远处山影
    for (let i = 0; i < 9; i += 1) {
      const hill = new THREE.Mesh(new THREE.ConeGeometry(10 + (i % 3) * 4, 10 + (i % 4) * 4, 5), mat(i % 2 ? 0x8fbf8a : 0x93c79a));
      hill.position.set(-100 + i * 25, 4.5, -88);
      hill.rotation.y = i * 0.31;
      this.scene.add(hill);
    }
    const mountainFence = new THREE.Mesh(new THREE.BoxGeometry(MAP_W - 8, 0.55, 0.8), mat(0x7da16f));
    mountainFence.position.set(0, 0.28, -82.5);
    mountainFence.castShadow = true;
    this.scene.add(mountainFence);
  }

  addRoadNetwork() {
    for (const z of [-72, -48, -24, 0, 24, 48, 72]) this.addPlane(0, 0.02, z, MAP_W - 12, 2.2, COLORS.road, 0);
    for (const x of [-96, -64, -32, 0, 32, 64, 96]) this.addPlane(x, 0.025, 0, 2.2, MAP_D - 10, COLORS.road, 0);
    this.addPlane(-52, 0.03, 36, 48, 1.1, COLORS.path, -0.2);
    this.addPlane(54, 0.03, -36, 42, 1.1, COLORS.path, 0.18);

    for (let i = -55; i <= 55; i += 8) {
      this.addPlane(i, 0.05, -72, 2.3, 0.08, 0xfff3d0, 0);
      this.addPlane(i, 0.05, 72, 2.3, 0.08, 0xfff3d0, 0);
    }
  }

  addTargetHouses() {
    neighbors.forEach((n) => this.addHouse(n));
  }

  addProceduralTown() {
    const roofColors = [0xc85f4d, 0xd59a34, 0x4f91d5, 0x5aaa77, 0xb86695, 0x9c7556];
    const wallColors = [0xffe3c2, 0xe8f3ff, 0xe7f4d6, 0xffe8ef, 0xfff0c8, 0xe7f6f4];
    let idx = 0;
    for (let gx = -96; gx <= 96; gx += 16) {
      for (let gz = -72; gz <= 72; gz += 16) {
        if (Math.abs(gx) < 8 || Math.abs(gz) < 8) continue;
        if ((idx + Math.floor(gx)) % 3 === 0) { idx += 1; continue; }
        const x = gx + ((idx * 7) % 7) - 3;
        const z = gz + ((idx * 5) % 6) - 3;
        this.addDecorHouse(x, z, colorFromIndex(idx, roofColors), colorFromIndex(idx + 2, wallColors), 0.78 + (idx % 3) * 0.08);
        idx += 1;
      }
    }

    // 大量树木，让地图更像完整社区
    for (let i = 0; i < 90; i += 1) {
      const x = -108 + ((i * 37) % 216);
      const z = -80 + ((i * 53) % 160);
      if (Math.abs(x % 32) < 4 || Math.abs(z % 24) < 4) continue;
      this.addTree(x, z, i % 5 === 0, 0.8 + (i % 4) * 0.08);
    }
  }

  addHouse(n) {
    const group = new THREE.Group();
    group.position.set(wx(n.x), 0, wz(n.y));
    this.addHouseParts(group, Number.parseInt(n.roof.slice(1), 16), Number.parseInt(n.wall.slice(1), 16), Number.parseInt(n.trim.slice(1), 16), 1.15);
    const label = makeCanvasLabel(n.name, "#2e6650"); label.position.set(0, 2.6, 0.22); group.add(label);
    this.addLandmark(group, n.landmark);
    this.scene.add(group); this.houseMap.set(n.id, group);
  }

  addDecorHouse(x, z, roof, wall, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = ((x + z) % 7) * 0.035; group.scale.setScalar(scale);
    this.addHouseParts(group, roof, wall, 0x76583f, 0.9); this.scene.add(group);
  }

  addHouseParts(group, roofColor, wallColor, trimColor, scale) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.75 * scale, 1.12 * scale, 1.38 * scale), mat(wallColor));
    body.position.y = 0.62 * scale; body.castShadow = true; body.receiveShadow = true; group.add(body);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.38 * scale, 0.75 * scale, 4), mat(roofColor));
    roof.position.y = 1.5 * scale; roof.rotation.y = Math.PI / 4; roof.castShadow = true; group.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.32 * scale, 0.6 * scale, 0.04), mat(trimColor)); door.position.set(0.42 * scale, 0.32 * scale, 0.72 * scale); group.add(door);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.3 * scale, 0.035), mat(0xfff4b8, 0.45)); win.position.set(-0.38 * scale, 0.72 * scale, 0.73 * scale); group.add(win);
    const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.24 * scale, 0.22 * scale, 0.19 * scale), mat(0xdc604c)); mailbox.position.set(1.15 * scale, 0.36 * scale, 0.65 * scale); mailbox.castShadow = true; group.add(mailbox);
  }

  addLandmark(group, landmark) {
    const addBall = (color, x, z, r = 0.13) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat(color)); m.position.set(x, r + 0.03, z); group.add(m); };
    if (landmark === "flowers" || landmark === "garden") for (let i = 0; i < 8; i += 1) addBall(i % 2 ? 0xe85f79 : 0xffaac2, -0.86 + i * 0.13, 0.9 + (i % 2) * 0.08, 0.055);
    if (landmark === "basketball") addBall(0xd97935, -0.98, 0.88, 0.15);
    if (landmark === "fence") for (let i = 0; i < 6; i += 1) { const f = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.38, 0.05), mat(0xfffbef)); f.position.set(-0.8 + i * 0.18, 0.2, 0.94); group.add(f); }
    if (landmark === "clinic") { const sign = this.makeSign("診", 0.52, 0.42); sign.position.set(-1.05, 0.1, 0.88); group.add(sign); }
    if (landmark === "bench") { const seat = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.09, 0.2), mat(COLORS.wood)); seat.position.set(-0.96, 0.25, 0.9); group.add(seat); }
    if (landmark === "fish") addBall(0x6cb7d9, -0.94, 0.9, 0.09);
    if (landmark === "bag") { const bag = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 0.18), mat(0x7b5c47)); bag.position.set(-0.98, 0.18, 0.9); group.add(bag); }
    if (landmark === "bus" || landmark === "sign") { const s = this.makeSign(landmark === "bus" ? "バス" : "町", 0.55, 0.42); s.position.set(-1.02, 0.05, 0.9); group.add(s); }
  }

  addLandmarks() {
    // 河流、桥、公园、商店街、神社、田地，分布在大地图不同区域
    this.addPlane(-102, 0.035, 0, 4.2, MAP_D - 8, COLORS.water, 0.03);
    // 河岸护栏让“不能下河”在视觉上也成立，桥的位置保留开口。
    for (const bankX of [-104.6, -99.4]) {
      for (const [z, len] of [[-72, 28], [-24, 26], [24, 26], [72, 28]]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.42, len), mat(COLORS.wood));
        rail.position.set(bankX, 0.27, z);
        rail.castShadow = true;
        this.scene.add(rail);
      }
    }
    for (const z of [-48, 0, 48]) { const b = new THREE.Mesh(new THREE.BoxGeometry(5.6, 0.2, 2.2), mat(0xb8875b)); b.position.set(-102, 0.18, z); b.castShadow = true; this.scene.add(b); }
    this.addPlane(-78, 0.05, 58, 18, 12, 0x71bb70, -0.03); this.addSign(-78, 50, "公園"); this.addBench(-82, 58); this.addBench(-74, 61); this.addTree(-86, 52, true, 1.3); this.addTree(-70, 55, false, 1.2);
    this.addShop(-70, -68); this.addVending(-78, -63); this.addVending(-64, -63); this.addBusStop(44, -70);
    this.addTorii(88, 58); this.addStoneLantern(82, 54); this.addStoneLantern(94, 54);
    this.addField(86, -64); this.addField(100, -62); this.addSign(-18, 72, "町内会");
    for (const [x, z] of [[-46,-24],[-16,-24],[16,-24],[48,-24],[-46,24],[-16,24],[16,24],[48,24],[-96,12],[96,-12]]) this.addUtilityPole(x, z);
  }

  addPlayer() {
    const group = new THREE.Group();
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.56, 6, 16), mat(0x2f7d5c));
    this.body.position.y = 0.92;
    this.body.castShadow = true;
    group.add(this.body);

    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 12), mat(0xf0c08d));
    this.head.position.y = 1.42;
    this.head.castShadow = true;
    group.add(this.head);

    this.hat = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x716a63));
    this.hat.position.y = 1.55;
    group.add(this.hat);

    this.bag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.28, 0.18), mat(0x7a5a3b));
    this.bag.position.set(0.32, 0.9, 0.03);
    group.add(this.bag);

    this.walkParts.leftLeg = this.limb(0x3f5f73, -0.12, 0.38, 0);
    this.walkParts.rightLeg = this.limb(0x3f5f73, 0.12, 0.38, 0);
    this.walkParts.leftArm = this.limb(0x2f7d5c, -0.32, 0.95, 0, 0.08);
    this.walkParts.rightArm = this.limb(0x2f7d5c, 0.32, 0.95, 0, 0.08);
    group.add(this.walkParts.leftLeg, this.walkParts.rightLeg, this.walkParts.leftArm, this.walkParts.rightArm);

    this.bike = this.createBike();
    this.bike.visible = false;
    group.add(this.bike);
    this.player = group;
    this.scene.add(group);
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

    const pedal = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.045, 0.08), mat(0x333333));
    pedal.position.set(-0.04, 0.48, 0.02);
    group.add(pedal);

    return group;
  }

  addTargetMarker() {
    this.targetRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.045, 12, 96), transparentMat(0xffb84d, 0.95)); this.targetRing.rotation.x = Math.PI / 2; this.scene.add(this.targetRing);
    this.targetBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.9, 4.2, 32, 1, true), transparentMat(0xffd37a, 0.18)); this.targetBeam.position.y = 2.1; this.scene.add(this.targetBeam);
  }

  updatePlayer(state) {
    if (!this.player) return;
    this.player.position.set(wx(state.player.x), 0, wz(state.player.y));
    const dx = state.player.headingX || 0.65; const dz = state.player.headingY || 0.76;
    this.player.rotation.y = Math.atan2(-dz, dx);
    const bikeMode = state.config?.moveMode === "bike"; this.bike.visible = bikeMode;
    const moving = state.keys.size > 0; const t = state.floatTime * (bikeMode ? 10 : 6);
    const step = moving ? Math.sin(t) * 0.35 : 0;
    this.walkParts.leftLeg.visible = !bikeMode;
    this.walkParts.rightLeg.visible = !bikeMode;
    this.walkParts.leftArm.visible = !bikeMode;
    this.walkParts.rightArm.visible = !bikeMode;
    this.walkParts.leftLeg.rotation.x = step;
    this.walkParts.rightLeg.rotation.x = -step;
    this.walkParts.leftArm.rotation.x = -step * 0.7;
    this.walkParts.rightArm.rotation.x = step * 0.7;

    if (bikeMode) {
      this.body.position.y = 1.02;
      this.body.rotation.z = -0.16;
      this.head.position.set(0.07, 1.48, 0);
      this.hat.position.set(0.07, 1.61, 0);
      this.bag.position.set(-0.48, 0.88, 0.24);
      this.bike.rotation.z = moving ? Math.sin(t) * 0.025 : 0;
    } else {
      this.body.position.y = 0.92;
      this.body.rotation.z = 0;
      this.head.position.set(0, 1.42, 0);
      this.hat.position.set(0, 1.55, 0);
      this.bag.position.set(0.32, 0.9, 0.03);
    }
  }

  updateTarget(state) {
    const target = currentTarget(state); const visible = Boolean(target && state.isPlaying); this.targetRing.visible = visible; this.targetBeam.visible = visible; if (!visible) return;
    const x = wx(target.x); const z = wz(target.y); const radius = (state.config?.assistRadius || 180) * WORLD_SCALE;
    this.targetRing.position.set(x, 0.1, z); this.targetRing.scale.setScalar(radius); this.targetBeam.position.set(x, 2.1, z);
  }

  updateCamera(state) {
    const px = wx(state.player.x); const pz = wz(state.player.y);
    const dx = state.player.headingX || 0.78; const dz = state.player.headingY || 0.62;
    const distance = state.config?.moveMode === "bike" ? 8.6 : 7.2;
    const height = state.config?.moveMode === "bike" ? 4.2 : 3.7;
    if (!state.isPlaying) {
      const desiredHome = new THREE.Vector3(px - dx * 8.0, 4.2, pz - dz * 8.0);
      this.camera.position.lerp(desiredHome, 0.04);
      this.camera.lookAt(px + dx * 3.5, 1.0, pz + dz * 3.5);
      return;
    }
    const desired = new THREE.Vector3(px - dx * distance, height, pz - dz * distance);
    this.camera.position.lerp(desired, 0.075);
    this.camera.lookAt(px + dx * 2.5, 1.0, pz + dz * 2.5);
  }

  updateAnimatedObjects(t) {
    if (this.targetRing?.visible) { const pulse = 1 + Math.sin(t * 3) * 0.08; this.targetRing.scale.multiplyScalar(pulse / this.lastTargetScale); this.lastTargetScale = pulse; this.targetBeam.material.opacity = 0.13 + Math.sin(t * 2.4) * 0.04; } else this.lastTargetScale = 1;
    this.clockObjects.forEach((obj, i) => { obj.rotation.y = Math.sin(t * 0.35 + i) * 0.045; });
  }

  addPlane(x, y, z, w, d, color, rot = 0) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat(color)); mesh.position.set(x, y, z); mesh.rotation.y = rot; mesh.receiveShadow = true; this.scene.add(mesh); return mesh; }
  addTree(x, z, sakura = false, scale = 1) { const group = new THREE.Group(); group.position.set(x, 0, z); group.scale.setScalar(scale); const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.13,0.88,10), mat(COLORS.wood)); trunk.position.y=0.44; trunk.castShadow=true; group.add(trunk); const crownColor=sakura?0xffbdd0:0x6fb96e; for(let i=0;i<5;i++){ const c=new THREE.Mesh(new THREE.SphereGeometry(0.43,16,12), mat(crownColor)); c.position.set(Math.cos(i*1.3)*0.23,1.04+(i%2)*0.13,Math.sin(i*1.7)*0.23); c.castShadow=true; group.add(c); this.clockObjects.push(c);} this.scene.add(group); }
  addBench(x,z){ const g=new THREE.Group(); g.position.set(x,0,z); const s=new THREE.Mesh(new THREE.BoxGeometry(1,0.12,0.24),mat(COLORS.wood)); s.position.y=0.35; const b=new THREE.Mesh(new THREE.BoxGeometry(1,0.12,0.2),mat(COLORS.wood)); b.position.set(0,0.58,-0.16); g.add(s,b); this.scene.add(g); }
  addVending(x,z){ const body=new THREE.Mesh(new THREE.BoxGeometry(0.65,1.3,0.42),mat(0xd94a4a)); body.position.set(x,0.67,z); body.castShadow=true; this.scene.add(body); const panel=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.4,0.025),mat(0xfff4e4)); panel.position.set(x,0.95,z+0.225); this.scene.add(panel); }
  addShop(x,z){ const g=new THREE.Group(); g.position.set(x,0,z); this.addHouseParts(g,0x516c9c,0xffefcf,0x6a523d,1.35); const curtain=new THREE.Mesh(new THREE.BoxGeometry(1.35,0.24,0.05),mat(0x3d79b7)); curtain.position.set(0,1.15,0.88); g.add(curtain); const label=makeCanvasLabel("商店", "#345f86"); label.position.set(0,3.0,0.2); g.add(label); this.scene.add(g); }
  addBusStop(x,z){ this.addSign(x,z,"バス"); const roof=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.09,0.55),mat(0x4e8fd6)); roof.position.set(x+0.62,0.95,z); this.scene.add(roof); }
  addField(x,z){ this.addPlane(x,0.055,z,12,8,0xb6d981,0.04); for(let i=0;i<8;i++) this.addPlane(x-5+i*1.4,0.08,z,0.12,7,0x8fbc66,0.04); }
  addTorii(x,z){ const red=mat(0xd9543f); const g=new THREE.Group(); g.position.set(x,0,z); const p1=new THREE.Mesh(new THREE.CylinderGeometry(0.11,0.11,2.2,12),red); const p2=p1.clone(); p1.position.set(-0.75,1.1,0); p2.position.set(0.75,1.1,0); const top=new THREE.Mesh(new THREE.BoxGeometry(2.3,0.2,0.25),red); top.position.set(0,2.15,0); const mid=new THREE.Mesh(new THREE.BoxGeometry(1.7,0.14,0.2),red); mid.position.set(0,1.7,0); g.add(p1,p2,top,mid); this.scene.add(g); }
  addStoneLantern(x,z){ const g=new THREE.Group(); g.position.set(x,0,z); const stone=mat(COLORS.stone); const base=new THREE.Mesh(new THREE.BoxGeometry(0.36,0.18,0.36),stone); base.position.y=0.09; const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.08,0.65,8),stone); pole.position.y=0.48; const top=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.25,0.4),stone); top.position.y=0.86; g.add(base,pole,top); this.scene.add(g); }
  addUtilityPole(x,z){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.09,2.8,12),mat(COLORS.wood)); pole.position.set(x,1.4,z); pole.castShadow=true; this.scene.add(pole); const arm=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.07,0.07),mat(COLORS.wood)); arm.position.set(x,2.55,z); this.scene.add(arm); }
  addSign(x,z,text){ const sign=this.makeSign(text,0.95,0.58); sign.position.set(x,0,z); this.scene.add(sign); }
  makeSign(text,w,h){ const g=new THREE.Group(); const board=new THREE.Mesh(new THREE.BoxGeometry(w,h,0.08),mat(0x5d7b57)); board.position.y=0.95; g.add(board); const post=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.82,8),mat(COLORS.wood)); post.position.y=0.42; g.add(post); const label=makeCanvasLabel(text,"#fff7db"); label.position.set(0,0.98,0.08); label.scale.set(w*1.2,h*0.5,1); g.add(label); return g; }
}
