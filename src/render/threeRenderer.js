import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.164.1/build/three.module.js";
import { neighbors } from "../data/neighbors.js";
import { currentTarget } from "../state/gameState.js";

const WORLD_SCALE = 1 / 45;
const COLORS = {
  grass: 0xbfe6a6,
  road: 0xd4c2a4,
  path: 0xcdb78f,
  water: 0x8ecae6,
  wood: 0x7b563a,
  white: 0xfffbef,
  asphalt: 0x9aa1a2,
};

function wx(x) {
  return x * WORLD_SCALE;
}

function wz(y) {
  return y * WORLD_SCALE;
}

function mat(color, roughness = 0.82, metalness = 0.02) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function transparentMat(color, opacity) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}

function makeCanvasLabel(text, color = "#2f5f49") {
  const canvas = document.createElement("canvas");
  canvas.width = 384;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "rgba(255,251,236,.92)";
  ctx.strokeStyle = "rgba(94,70,39,.18)";
  ctx.lineWidth = 8;
  roundRect(ctx, 14, 28, 356, 74, 26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = "700 42px Yu Gothic, Microsoft YaHei, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 192, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true }));
  sprite.scale.set(2.5, 0.85, 1);
  return sprite;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
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
    this.scene.background = new THREE.Color(0xbfe5ff);
    this.scene.fog = new THREE.Fog(0xdff2ff, 28, 58);

    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, 0.1, 120);
    this.camera.position.set(15, 18, 18);
    this.camera.lookAt(0, 0, 0);

    this.clockObjects = [];
    this.houseMap = new Map();
    this.targetRing = null;
    this.targetBeam = null;
    this.player = null;
    this.playerBag = null;
    this.bike = null;

    this.createWorld();
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h;
    const frustum = aspect < 1 ? 19 : 16;
    this.camera.left = (-frustum * aspect) / 2;
    this.camera.right = (frustum * aspect) / 2;
    this.camera.top = frustum / 2;
    this.camera.bottom = -frustum / 2;
    this.camera.updateProjectionMatrix();
  }

  render(state) {
    this.updatePlayer(state);
    this.updateTarget(state);
    this.updateCamera(state);
    this.updateAnimatedObjects(state.floatTime);
    this.renderer.render(this.scene, this.camera);
  }

  createWorld() {
    this.addLights();
    this.addGround();
    this.addRoads();
    this.addNeighborhood();
    this.addLargeScenery();
    this.addPlayer();
    this.addTargetMarker();
  }

  addLights() {
    const hemi = new THREE.HemisphereLight(0xfffff5, 0x8fc486, 2.2);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff0c2, 2.5);
    sun.position.set(-8, 18, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -20;
    sun.shadow.camera.right = 20;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    this.scene.add(sun);
  }

  addGround() {
    const ground = new THREE.Mesh(new THREE.BoxGeometry(26, 0.28, 20), mat(COLORS.grass));
    ground.position.y = -0.16;
    ground.receiveShadow = true;
    this.scene.add(ground);

    const border = new THREE.Mesh(new THREE.BoxGeometry(27, 0.16, 21), mat(0xa4d48e));
    border.position.y = -0.28;
    this.scene.add(border);

    this.addPlane(-9.2, 0.012, -6.2, 5.4, 1.45, 0xd4ebbd, 0.25);
    this.addPlane(8.3, 0.014, 6.2, 4.6, 1.2, 0xd7edc8, -0.3);
  }

  addRoads() {
    this.addPlane(0, 0.02, 0, 24, 1.7, COLORS.road, 0);
    this.addPlane(0, 0.025, 0, 1.7, 18, COLORS.road, 0);
    this.addPlane(-4.2, 0.026, 3.2, 8.5, 0.82, COLORS.path, -0.08);
    this.addPlane(5.5, 0.027, -2.8, 7.2, 0.74, COLORS.path, 0.28);

    for (let i = -5; i <= 5; i += 1) {
      this.addPlane(i * 2, 0.04, 0, 0.8, 0.08, 0xfff3d0, 0);
    }
    for (let i = -4; i <= 4; i += 1) {
      this.addPlane(0, 0.041, i * 2, 0.08, 0.8, 0xfff3d0, 0);
    }
  }

  addNeighborhood() {
    neighbors.forEach((n) => this.addHouse(n));

    const extra = [
      [-9.5, -3.5, 0xd8a35a, 0xffedcf],
      [-7.6, 4.8, 0x6ea5c8, 0xdff2ff],
      [8.4, -4.6, 0x9c7556, 0xffe4c6],
      [7.6, 3.9, 0x7aa86a, 0xe5f5dc],
      [3.5, 6.6, 0x596e95, 0xe4eaff],
    ];
    extra.forEach(([x, z, roof, wall], i) => this.addDecorHouse(x, z, roof, wall, i % 2 ? 0.85 : 1));
  }

  addHouse(n) {
    const group = new THREE.Group();
    group.position.set(wx(n.x), 0, wz(n.y));
    this.addHouseParts(group, n.roof, n.wall, n.trim, 1);

    const label = makeCanvasLabel(n.name, "#2e6650");
    label.position.set(0, 2.25, 0.18);
    group.add(label);

    this.addLandmark(group, n.landmark);
    this.scene.add(group);
    this.houseMap.set(n.id, group);
  }

  addDecorHouse(x, z, roof, wall, scale = 1) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    group.rotation.y = Math.random() * 0.25 - 0.12;
    group.scale.setScalar(scale);
    this.addHouseParts(group, roof, wall, 0x76583f, 0.86);
    this.scene.add(group);
  }

  addHouseParts(group, roofColor, wallColor, trimColor, scale) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.55 * scale, 1.05 * scale, 1.25 * scale), mat(wallColor));
    body.position.y = 0.58 * scale;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const roof = new THREE.Mesh(new THREE.ConeGeometry(1.2 * scale, 0.72 * scale, 4), mat(roofColor));
    roof.position.y = 1.45 * scale;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(0.28 * scale, 0.55 * scale, 0.04), mat(trimColor));
    door.position.set(0.36 * scale, 0.3 * scale, 0.65 * scale);
    group.add(door);

    const winMat = mat(0xfff4b8, 0.45);
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.34 * scale, 0.28 * scale, 0.035), winMat);
    win.position.set(-0.34 * scale, 0.67 * scale, 0.655 * scale);
    group.add(win);

    const mailbox = new THREE.Mesh(new THREE.BoxGeometry(0.22 * scale, 0.2 * scale, 0.18 * scale), mat(0xdc604c));
    mailbox.position.set(1.02 * scale, 0.34 * scale, 0.58 * scale);
    mailbox.castShadow = true;
    group.add(mailbox);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.025 * scale, 0.025 * scale, 0.48 * scale, 8), mat(COLORS.wood));
    post.position.set(1.02 * scale, 0.12 * scale, 0.58 * scale);
    group.add(post);
  }

  addLandmark(group, landmark) {
    if (landmark === "flowers") {
      for (let i = 0; i < 7; i += 1) {
        const flower = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), mat(i % 2 ? 0xe85f79 : 0xffaac2));
        flower.position.set(-0.76 + i * 0.12, 0.12, 0.8 + (i % 2) * 0.08);
        group.add(flower);
      }
    }
    if (landmark === "basketball") {
      const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), mat(0xd97935));
      ball.position.set(-0.86, 0.15, 0.8);
      group.add(ball);
    }
    if (landmark === "fence") {
      for (let i = 0; i < 5; i += 1) {
        const fence = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.36, 0.05), mat(0xfffbef));
        fence.position.set(-0.7 + i * 0.2, 0.18, 0.86);
        group.add(fence);
      }
    }
    if (landmark === "clinic") {
      const sign = this.makeSign("診", 0.52, 0.42);
      sign.position.set(-0.92, 0.1, 0.78);
      group.add(sign);
    }
    if (landmark === "bench") {
      const seat = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.18), mat(COLORS.wood));
      seat.position.set(-0.82, 0.24, 0.78);
      group.add(seat);
    }
  }

  addLargeScenery() {
    // 河流与小桥
    this.addPlane(-9.6, 0.035, 0.3, 1.55, 18, COLORS.water, 0.1);
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.18, 1.25), mat(0xb8875b));
    bridge.position.set(-9.6, 0.16, 0.05);
    bridge.castShadow = true;
    this.scene.add(bridge);

    // 小公园
    this.addPlane(-6.8, 0.05, 5.8, 4.2, 2.4, 0x71bb70, -0.08);
    this.addBench(-7.9, 5.8);
    this.addBench(-6.2, 6.15);
    this.addTree(-8.4, 4.9, true);
    this.addTree(-5.5, 5.3, false);
    this.addSign(-6.85, 4.45, "公園");

    // 神社鸟居与石灯笼
    this.addTorii(8.8, 5.2);
    this.addStoneLantern(7.7, 4.55);
    this.addStoneLantern(9.9, 4.55);

    // 商店街元素
    this.addVending(-8.6, -2.1);
    this.addShop(-6.4, -5.8);
    this.addBusStop(4.8, -6.0);

    // 田地与远景树
    this.addField(9.2, -6.4);
    for (const [x, z, sakura] of [
      [-11, -6, true], [-10.8, 6.8, false], [-3.2, -7.2, true], [1.5, 7.2, false], [11.2, 2.1, true], [10.5, -2.9, false]
    ]) this.addTree(x, z, sakura);

    // 电线杆和路灯
    for (const [x, z] of [[-5.2, -1.4], [3.4, -1.3], [-1.5, 2.0], [6.3, 1.6], [-10.4, 2.8]]) this.addUtilityPole(x, z);
  }

  addPlayer() {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.52, 6, 14), mat(0x2f7d5c));
    body.position.y = 0.72;
    body.castShadow = true;
    group.add(body);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 18, 12), mat(0xf0c08d));
    head.position.y = 1.2;
    head.castShadow = true;
    group.add(head);

    const hat = new THREE.Mesh(new THREE.SphereGeometry(0.205, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x716a63));
    hat.position.y = 1.32;
    group.add(hat);

    this.playerBag = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.16), mat(0x7a5a3b));
    this.playerBag.position.set(0.28, 0.68, 0.03);
    group.add(this.playerBag);

    this.bike = this.createBike();
    this.bike.visible = false;
    group.add(this.bike);

    this.player = group;
    this.scene.add(group);
  }

  createBike() {
    const group = new THREE.Group();
    const wheelMat = mat(0x263044, 0.65);
    const tireGeo = new THREE.TorusGeometry(0.25, 0.025, 8, 24);
    const w1 = new THREE.Mesh(tireGeo, wheelMat);
    const w2 = new THREE.Mesh(tireGeo, wheelMat);
    w1.rotation.y = Math.PI / 2;
    w2.rotation.y = Math.PI / 2;
    w1.position.set(-0.36, 0.22, 0);
    w2.position.set(0.36, 0.22, 0);
    group.add(w1, w2);
    const barMat = mat(0x364968);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.035, 0.035), barMat);
    frame.position.y = 0.42;
    group.add(frame);
    return group;
  }

  addTargetMarker() {
    this.targetRing = new THREE.Mesh(
      new THREE.TorusGeometry(1, 0.035, 12, 96),
      transparentMat(0xffb84d, 0.95)
    );
    this.targetRing.rotation.x = Math.PI / 2;
    this.scene.add(this.targetRing);

    this.targetBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.8, 3.4, 32, 1, true),
      transparentMat(0xffd37a, 0.18)
    );
    this.targetBeam.position.y = 1.7;
    this.scene.add(this.targetBeam);
  }

  updatePlayer(state) {
    if (!this.player) return;
    this.player.position.set(wx(state.player.x), 0, wz(state.player.y));
    this.player.rotation.y = state.player.facing >= 0 ? -0.35 : 2.75;
    this.bike.visible = state.config?.moveMode === "bike";
  }

  updateTarget(state) {
    const target = currentTarget(state);
    const visible = Boolean(target && state.isPlaying);
    this.targetRing.visible = visible;
    this.targetBeam.visible = visible;
    if (!visible) return;
    const x = wx(target.x);
    const z = wz(target.y);
    const radius = (state.config?.assistRadius || 125) * WORLD_SCALE;
    this.targetRing.position.set(x, 0.08, z);
    this.targetRing.scale.setScalar(radius);
    this.targetBeam.position.set(x, 1.55, z);
  }

  updateCamera(state) {
    if (!state.isPlaying) {
      this.camera.position.lerp(new THREE.Vector3(13, 17, 17), 0.04);
      this.camera.lookAt(0, 0, 0);
      return;
    }
    const px = wx(state.player.x);
    const pz = wz(state.player.y);
    const desired = new THREE.Vector3(px + 12, 15.5, pz + 13);
    this.camera.position.lerp(desired, 0.045);
    this.camera.lookAt(px, 0, pz);
  }

  updateAnimatedObjects(t) {
    if (this.targetRing?.visible) {
      const s = 1 + Math.sin(t * 3) * 0.08;
      this.targetRing.scale.multiplyScalar(s / (this.targetRing.userData.lastPulse || 1));
      this.targetRing.userData.lastPulse = s;
      this.targetBeam.material.opacity = 0.13 + Math.sin(t * 2.4) * 0.04;
    } else if (this.targetRing) {
      this.targetRing.userData.lastPulse = 1;
    }

    this.clockObjects.forEach((obj, i) => {
      obj.rotation.y = Math.sin(t * 0.35 + i) * 0.04;
    });
  }

  addPlane(x, y, z, w, d, color, rot = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, 0.04, d), mat(color));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rot;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  addTree(x, z, sakura = false) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.82, 10), mat(COLORS.wood));
    trunk.position.y = 0.42;
    trunk.castShadow = true;
    group.add(trunk);
    const crownColor = sakura ? 0xffbdd0 : 0x6fb96e;
    for (let i = 0; i < 5; i += 1) {
      const crown = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 12), mat(crownColor));
      crown.position.set(Math.cos(i * 1.3) * 0.22, 1.02 + (i % 2) * 0.13, Math.sin(i * 1.7) * 0.22);
      crown.castShadow = true;
      group.add(crown);
      this.clockObjects.push(crown);
    }
    this.scene.add(group);
  }

  addBench(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.24), mat(COLORS.wood));
    seat.position.y = 0.35;
    group.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.2), mat(COLORS.wood));
    back.position.set(0, 0.58, -0.16);
    group.add(back);
    this.scene.add(group);
  }

  addVending(x, z) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.2, 0.38), mat(0xd94a4a));
    body.position.set(x, 0.62, z);
    body.castShadow = true;
    this.scene.add(body);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.025), mat(0xfff4e4));
    panel.position.set(x, 0.88, z + 0.205);
    this.scene.add(panel);
  }

  addShop(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    this.addHouseParts(group, 0x516c9c, 0xffefcf, 0x6a523d, 1.1);
    const curtain = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.22, 0.05), mat(0x3d79b7));
    curtain.position.set(0, 0.95, 0.72);
    group.add(curtain);
    const label = makeCanvasLabel("商店", "#345f86");
    label.position.set(0, 2.35, 0.18);
    group.add(label);
    this.scene.add(group);
  }

  addBusStop(x, z) {
    this.addSign(x, z, "バス");
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.42), mat(0x4e8fd6));
    roof.position.set(x + 0.45, 0.85, z);
    this.scene.add(roof);
  }

  addField(x, z) {
    this.addPlane(x, 0.055, z, 3.1, 2.0, 0xb6d981, 0.08);
    for (let i = 0; i < 5; i += 1) this.addPlane(x - 1.2 + i * 0.6, 0.08, z, 0.08, 1.75, 0x8fbc66, 0.08);
  }

  addTorii(x, z) {
    const red = mat(0xd9543f);
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.45, 12), red);
    const p2 = p1.clone();
    p1.position.set(-0.48, 0.72, 0);
    p2.position.set(0.48, 0.72, 0);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 0.18), red);
    top.position.set(0, 1.42, 0);
    const mid = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.15), red);
    mid.position.set(0, 1.12, 0);
    group.add(p1, p2, top, mid);
    this.scene.add(group);
  }

  addStoneLantern(x, z) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    const stone = mat(0xb7b2a5);
    const base = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.16, 0.32), stone);
    base.position.y = 0.08;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.55, 8), stone);
    pole.position.y = 0.42;
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.34), stone);
    top.position.y = 0.78;
    group.add(base, pole, top);
    this.scene.add(group);
  }

  addUtilityPole(x, z) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 2.4, 12), mat(0x76543b));
    pole.position.set(x, 1.2, z);
    pole.castShadow = true;
    this.scene.add(pole);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.06, 0.06), mat(0x76543b));
    arm.position.set(x, 2.2, z);
    this.scene.add(arm);
  }

  addSign(x, z, text) {
    const sign = this.makeSign(text, 0.78, 0.5);
    sign.position.set(x, 0, z);
    this.scene.add(sign);
  }

  makeSign(text, w, h) {
    const group = new THREE.Group();
    const board = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.08), mat(0x5d7b57));
    board.position.y = 0.85;
    group.add(board);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), mat(COLORS.wood));
    post.position.y = 0.38;
    group.add(post);
    const label = makeCanvasLabel(text, "#fff7db");
    label.position.set(0, 0.88, 0.08);
    label.scale.set(w * 1.15, h * 0.46, 1);
    group.add(label);
    return group;
  }
}
